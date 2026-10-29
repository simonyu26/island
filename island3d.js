/**
 * 會考小島 3D 視圖（原型）
 * 依賴 three.min.js 與 OrbitControls.js（同資料夾），由 index.html 在需要時才載入。
 * Island3D.mount(container, ctx)：把 3D 小島放進 container；ctx 由主程式提供資料與回呼。
 */
(function () {
  // 紫色的烏龜：🐢 先畫在另一張畫布，把綠色轉成紫色再貼上（和 CSS 的 hue-rotate(185deg) saturate(1.4) 一樣）
  function drawEmoji(g, e, x, y) {
    if (!e || e.indexOf('🐢') < 0) return g.fillText(e, x, y);
    const c = document.createElement('canvas'); c.width = g.canvas.width; c.height = g.canvas.height;
    const t = c.getContext('2d'); t.font = g.font; t.textAlign = g.textAlign; t.textBaseline = g.textBaseline; t.fillText(e, x, y);
    const d = t.getImageData(0, 0, c.width, c.height), p = d.data, a = 185 * Math.PI / 180, co = Math.cos(a), si = Math.sin(a), s = 1.4;
    const H = [0.213 + co * 0.787 - si * 0.213, 0.715 - co * 0.715 - si * 0.715, 0.072 - co * 0.072 + si * 0.928,
      0.213 - co * 0.213 + si * 0.143, 0.715 + co * 0.285 + si * 0.140, 0.072 - co * 0.072 - si * 0.283,
      0.213 - co * 0.213 - si * 0.787, 0.715 - co * 0.715 + si * 0.715, 0.072 + co * 0.928 + si * 0.072];
    const S = [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];
    const M = [0, 1, 2].map(i => [0, 1, 2].map(j => S[i * 3] * H[j] + S[i * 3 + 1] * H[3 + j] + S[i * 3 + 2] * H[6 + j]));
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const r = p[i], gg = p[i + 1], b = p[i + 2];
      p[i] = M[0][0] * r + M[0][1] * gg + M[0][2] * b; p[i + 1] = M[1][0] * r + M[1][1] * gg + M[1][2] * b; p[i + 2] = M[2][0] * r + M[2][1] * gg + M[2][2] * b;
    }
    t.putImageData(d, 0, 0); g.drawImage(c, 0, 0);
  }

  const SUBJECTS = ['國', '英', '數', '自', '社'];
  const LANES = { 自: ['理化', '生物', '地科'], 社: ['歷史', '地理', '公民'] };
  const PLAZA = { 自: '自然', 社: '社會' };
  const PLATE = { 國: 0xe98fb3, 英: 0x8dbde6, 數: 0xf0c66a, 自: 0x8fd197, 社: 0xb9a0e6 };
  const ROOF = { 國: 0xb8436f, 英: 0x3f7fb8, 數: 0xd08a1e, 自: 0x3f9a55, 社: 0x7a55b8 };
  const TIERS = [['castle', 80], ['tower', 20], ['community', 5], ['house', 1]];

  let renderer, scene, camera, controls, clock, ctx, container;
  let root, buildLayer, linkLayer, plates = {}, anchors = {}, popping = [];
  let running = false, signature = '', weekIdx = null;
  // 家人島（做法 B）：ctx.layout 決定靜態版面；沒傳就是她的島，和以前完全一樣
  const LY = () => (ctx && ctx.layout) || {};
  const BG = () => LY().bg === 'space' || LY().bg === 'sky' ? LY().bg : 'sea';   // 家人島的背景
  const laneOf = s => LY().lanes === false ? null : LANES[s];
  const isOff = s => (LY().off || []).indexOf(s) >= 0;
  // 天色與天氣
  let homeLayer, homeSig = '', walkLayer, walkSig = '';
  // 燈塔（學習中心）：岬角上的燈塔、海灘的漂流瓶、海上的紙燈籠
  let lightLayer, lightSig = null, lamp = null, beam = null, floats = [];
  // 節氣：草地、樹葉的顏色與飄落的花瓣／楓葉／螢火蟲
  let grassMat, leafMats = [], seasonFx, seasonNow = null;
  // v2.30 省電：系統開「減少動態效果」時，海浪、雲、船這些裝飾動畫停住（還是可以轉動、點選）；App 切到背景時不畫
  const CALM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // 植樹（v2.10）：她用綠點種在街道之間空地格上的植物，和碼頭旁的植木屋
  let gardenLayer, gardenSig = null;
  // 獨立書店（v2.17）：碼頭左前方的巷口小書店
  let bookLayer, bookSig = null;
  // 智慧島的渡船碼頭（v2.24）：島左前方的海邊
  let ferryLayer, ferrySig = null, ferryBoat = null;
  let yataiLayer, yataiSig = null;
  // 核心主島（家人島第二階段 2a）：遠海上的小剪影，只畫一次
  let mainIsle = null;
  // 音樂廳：碼頭廣場正前方的清水模現代音樂廳
  let hallLayer, hallSig = null;
  let hemi, sun, moon, water, wallMat, stars, rain, clouds, flash = 0, envNow = { phase: 'day', weather: 'clear' };
  // v2.22 畫質：高畫質開陰影、海浪細一點（舊手機可以在「更多」關掉）；色調映射和圓角方塊都開
  const HQ = (() => { try { const v = localStorage.getItem('island3dHQ'); if (v) return v === '1'; } catch (e) {} return !(navigator.deviceMemory && navigator.deviceMemory < 4); })();
  let guard = null, shadowOn = true, shadowDirty = true, lastShadow = 0, foam = null, capeFoam = null, waterY = -0.6, tideAt = 0;

  // ---------- 小工具 ----------
  // 顏色都用 sRGB 的 16 進位寫，轉成線性空間再算光（輸出是 sRGB＋ACES 色調映射）
  // ACES 會讓顏色變淡，轉線性時順便把飽和度拉高一點，維持原本玩具般的鮮豔
  const CM = true, hsl = {};
  const lin = c => { if (!CM || !c || !c.convertSRGBToLinear) return c; c.getHSL(hsl); if (hsl.s > 0.05) c.setHSL(hsl.h, Math.min(1, hsl.s * 1.3), hsl.l); return c.convertSRGBToLinear(); };
  const std = (color, extra) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.85, metalness: 0 }, extra)); lin(m.color); lin(m.emissive); return m; };
  // 圓角方塊（v2.22）：邊角會反光，像模型玩具；太薄的板子維持直角。做法同 three.js 的 RoundedBoxGeometry，同尺寸共用
  const bxCache = {};
  function bx(w, h, d) {
    const m = Math.min(w, h, d);
    if (m < 0.15) return new THREE.BoxGeometry(w, h, d);
    const key = w + ',' + h + ',' + d; if (bxCache[key]) return bxCache[key];
    const seg = 5, r = m * 0.16, g = new THREE.BoxGeometry(1, 1, 1, seg, seg, seg).toNonIndexed();
    const pos = g.attributes.position.array, half = 0.5 / seg, n = new THREE.Vector3(), bxh = new THREE.Vector3(w / 2 - r, h / 2 - r, d / 2 - r);
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      n.set(x - Math.sign(x) * half, y - Math.sign(y) * half, z - Math.sign(z) * half).normalize();
      pos[i] = bxh.x * Math.sign(x) + n.x * r; pos[i + 1] = bxh.y * Math.sign(y) + n.y * r; pos[i + 2] = bxh.z * Math.sign(z) + n.z * r;
    }
    g.computeVertexNormals(); g.userData.keep = 1; return (bxCache[key] = g);
  }
  // 拿掉的物件把 geometry、材質、貼圖還給 GPU（互訪：島和島之間往返不累積）；共用的圓角方塊、Sprite 共用的板子不丟
  function drop(o) {
    if (o) o.traverse(x => {
      if (x.geometry && !x.isSprite && !x.geometry.userData.keep) x.geometry.dispose();
      [].concat(x.material || []).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
    });
  }
  function clearLayer(L) { while (L.children.length) { const c = L.children[0]; L.remove(c); drop(c); } }
  // 潮汐：用月齡推算月亮過中天的時間，一天漲退兩次（約 12 小時 25 分一輪），大潮小潮跟著月相；不是精確的潮汐表
  function tideNow() {
    const now = Date.now(), syn = 29.530589;
    const age = ((((now - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) % syn) + syn) % syn;
    const h = ((now / 3600000 + 8) % 24 + 24) % 24, transit = 12 + age * 24 / syn;
    return Math.cos((h - transit) / 12.42 * Math.PI * 2) * (0.75 + 0.25 * Math.cos(age / syn * Math.PI * 4));
  }
  function shadowize() {
    if (!HQ || !scene) return;
    scene.traverse(o => { if (!o.isMesh) return; const m = o.material || {}; o.receiveShadow = true; o.castShadow = o !== water && !m.transparent && o !== foam && o !== capeFoam; });
  }
  function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function labelSprite(text, sub, opts) {
    opts = opts || {};
    const cv = document.createElement('canvas'), g = cv.getContext('2d');
    const font = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
    g.font = `700 44px ${font}`;
    const w1 = g.measureText(text).width;
    g.font = `500 32px ${font}`;
    const w2 = sub ? g.measureText(sub).width : 0;
    const W = Math.ceil(Math.max(w1, w2) + 48), H = sub ? 120 : 76;
    cv.width = W; cv.height = H;
    g.fillStyle = opts.bg || 'rgba(255,255,255,0.92)'; roundRect(g, 2, 2, W - 4, H - 4, 22); g.fill();
    g.fillStyle = opts.color || '#741b47'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 44px ${font}`; g.fillText(text, W / 2, sub ? 40 : H / 2);
    if (sub) { g.font = `500 32px ${font}`; g.fillStyle = '#8a6a7a'; g.fillText(sub, W / 2, 88); }
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4; if (CM) tex.encoding = THREE.sRGBEncoding;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, toneMapped: false }));
    const k = (opts.scale || 1) * 0.012;
    sp.scale.set(W * k, H * k, 1); sp.renderOrder = 10;
    return sp;
  }
  function avatarSprite(emoji, imgSrc) {
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); if (CM) tex.encoding = THREE.sRGBEncoding;
    const drawBase = () => { g.clearRect(0, 0, N, N); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(N / 2, N / 2, N / 2 - 6, 0, Math.PI * 2); g.fill();
      g.lineWidth = 10; g.strokeStyle = '#741b47'; g.stroke(); };
    drawBase();
    g.font = `${N * 0.6}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; drawEmoji(g, emoji, N / 2, N / 2 + 10);
    if (imgSrc) {
      const im = new Image();
      im.onload = () => { drawBase(); g.save(); g.beginPath(); g.arc(N / 2, N / 2, N / 2 - 12, 0, Math.PI * 2); g.clip();
        g.drawImage(im, 12, 12, N - 24, N - 24); g.restore(); tex.needsUpdate = true; };
      im.src = imgSrc;
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false }));
    sp.scale.set(1.7, 1.7, 1);
    return sp;
  }

  // ---------- 建築 ----------
  function makeBuilding(kind, subj) {
    const grp = new THREE.Group();
    const wall = wallMat, roof = std(ROOF[subj]);
    const house = (x, z, s) => {
      const b = new THREE.Mesh(bx(0.42 * s, 0.34 * s, 0.42 * s), wall);
      b.position.set(x, 0.17 * s, z);
      const r = new THREE.Mesh(new THREE.ConeGeometry(0.36 * s, 0.3 * s, 4), roof);
      r.position.set(x, 0.34 * s + 0.15 * s, z); r.rotation.y = Math.PI / 4;
      grp.add(b, r);
    };
    if (kind === 'house') house(0, 0, 1);
    else if (kind === 'community') { house(-0.22, -0.15, 0.85); house(0.24, -0.12, 0.85); house(0, 0.24, 0.85); }
    else if (kind === 'tower') {
      const t = new THREE.Mesh(bx(0.5, 1.5, 0.5), std(0xf4ede4));
      t.position.y = 0.75;
      const cap = new THREE.Mesh(bx(0.56, 0.12, 0.56), roof); cap.position.y = 1.56;
      for (let i = 0; i < 4; i++) {
        const w = new THREE.Mesh(bx(0.52, 0.06, 0.52), std(0x9fc6dd)); w.position.y = 0.35 + i * 0.3; grp.add(w);
      }
      grp.add(t, cap);
    } else if (kind === 'castle') {
      const stone = std(0xe9e1d3);
      const base = new THREE.Mesh(bx(0.9, 0.6, 0.9), stone); base.position.y = 0.3; grp.add(base);
      [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]].forEach(([x, z]) => {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.95, 8), stone); c.position.set(x, 0.47, z);
        const cn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.35, 8), roof); cn.position.set(x, 1.12, z);
        grp.add(c, cn);
      });
      const keep = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.2, 8), stone); keep.position.y = 0.6;
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 8), roof); top.position.y = 1.45;
      grp.add(keep, top);
    }
    return grp;
  }
  function buildingsFor(points) {
    let n = Math.floor(points / 2); const list = [];
    TIERS.forEach(([kind, size]) => { const c = Math.floor(n / size); n %= size; for (let i = 0; i < c; i++) list.push(kind); });
    return list;
  }

  // ---------- 場景 ----------
  function districtPos(i) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
    return new THREE.Vector3(Math.cos(a) * 7.2, 0, Math.sin(a) * 7.2);
  }
  // 在一個扇形（或整圈）裡產生建築位置，由內而外
  function slots(center, a0, a1, count) {
    const out = [];
    for (let ring = 0; out.length < count && ring < 6; ring++) {
      const r = 1.35 + ring * 0.75;
      const span = a1 - a0, cap = Math.max(1, Math.floor(span * r / 0.85));
      for (let k = 0; k < cap && out.length < count; k++) {
        const a = a0 + span * (k + 0.5) / cap;
        out.push(new THREE.Vector3(center.x + Math.cos(a) * r, 0.3, center.z + Math.sin(a) * r));
      }
    }
    return out;
  }

  function buildStatic() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcfe8f3);
    scene.fog = new THREE.Fog(0xcfe8f3, 45, 90);
    hemi = new THREE.HemisphereLight(0xffffff, 0x8fae80, 0.55); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff4e0, 0.6); sun.position.set(10, 20, 8); scene.add(sun);
    if (HQ) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = sc.bottom = -19; sc.right = sc.top = 19; sc.near = 1; sc.far = 70; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; }
    moon = new THREE.DirectionalLight(0x9fb4ff, 0); moon.position.set(-12, 18, -6); scene.add(moon);
    wallMat = std(0xfdf6ec);

    root = new THREE.Group(); scene.add(root);
    // 海（v2.22）：細格子的海面，在 animateSea 裡起伏；岸邊一圈浪花；海面高度跟著潮汐
    const WS = HQ ? 120 : 64;
    water = new THREE.Mesh(new THREE.PlaneGeometry(170, 170, WS, WS), std(0x6fb4d8, { roughness: 0.32, metalness: 0.05 }));
    water.rotation.x = -Math.PI / 2; water.position.y = -0.6; root.add(water);
    { const p = water.geometry.attributes.position, amp = new Float32Array(p.count);
      for (let i = 0; i < p.count; i++) { const d = Math.hypot(p.getX(i), p.getY(i)); amp[i] = d < 14 ? 0 : 0.3 + 0.7 * Math.min(1, (d - 15) / 10); }
      water.userData.amp = amp; }
    foam = new THREE.Mesh(new THREE.RingGeometry(1, 1.04, 128, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
    lin(foam.material.color); foam.rotation.x = -Math.PI / 2; root.add(foam);
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(14.2, 15, 0.8, 40), std(0xe6c98e)); sand.position.y = -0.4; root.add(sand);
    grassMat = std(0x8cc56c);
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(13, 13.4, 0.5, 40), grassMat); grass.position.y = -0.05; root.add(grass);
    floatBg = null;

    plates = {}; anchors = {};
    SUBJECTS.forEach((s, i) => {
      const c = districtPos(i);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.75, 0.3, 6), std(isOff(s) ? 0xd8d2c0 : PLATE[s]));
      plate.position.set(c.x, 0.2, c.z); if (!isOff(s)) plate.userData.subject = s; root.add(plate); plates[s] = plate;
      if (isOff(s)) return;   // 家人島還沒用到的區：只有一塊空地
      if (laneOf(s)) {           // 三條小巷的分隔線
        for (let k = 0; k < 3; k++) {
          const a = -Math.PI / 2 + k * (Math.PI * 2 / 3) + Math.PI / 3;
          const line = new THREE.Mesh(bx(2.5, 0.04, 0.08), std(0xffffff));
          line.position.set(c.x + Math.cos(a) * 2.25, 0.37, c.z + Math.sin(a) * 2.25); line.rotation.y = -a; root.add(line);
        }
      }
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.5, 12), std(0xfdf6ec));
      ped.position.set(c.x, 0.6, c.z); ped.userData.subject = s; root.add(ped);
      anchors[s] = new THREE.Vector3(c.x, 2.0, c.z);
    });

    // 樹（固定亂數，每次都長在同樣的位置）
    const rand = rng(20270515);
    leafMats = [std(0x6fb36a), std(0x86c47a), std(0x6fb36a)];
    let ti = 0;
    for (let i = 0; i < 46; i++) {
      const a = rand() * Math.PI * 2, r = 4 + rand() * 8.6;
      const p = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
      if (SUBJECTS.some((s, j) => p.distanceTo(districtPos(j)) < 4.1)) continue;
      if (GARDEN_SLOTS.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 0.9) || Math.hypot(HUT.x - p.x, HUT.z - p.z) < 1.2 || Math.hypot(BOOK.x - p.x, BOOK.z - p.z) < 1.3 || Math.hypot(FERRY.x - p.x, FERRY.z - p.z) < 1.4 || Math.hypot(Math.cos(HALL.a) * HALL.r - p.x, Math.sin(HALL.a) * HALL.r - p.z) < 1.5) continue;
      if (SUBJECTS.some((s, j) => MARK_SLOTS.some(([mr, da]) => { const a = -Math.PI / 2 + j * (Math.PI * 2 / 5) + da; return Math.hypot(Math.cos(a) * mr - p.x, Math.sin(a) * mr - p.z) < 0.9; }))) continue;
      const h = 0.7 + rand() * 0.6;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 5), std(0x9a6b4a)); trunk.position.set(p.x, 0.4, p.z);
      rand(); const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.42, h, 6), leafMats[ti++ % 3]); leaf.position.set(p.x, 0.6 + h / 2, p.z);
      root.add(trunk, leaf);
    }
    // 中央碼頭廣場
    const dock = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.25, 24), std(0xead1dc)); dock.position.y = 0.15; root.add(dock);

    buildSky();
    homeLayer = new THREE.Group(); root.add(homeLayer);
    walkLayer = new THREE.Group(); root.add(walkLayer);
    lightLayer = new THREE.Group(); root.add(lightLayer);
    buildLayer = new THREE.Group(); root.add(buildLayer);
    linkLayer = new THREE.Group(); root.add(linkLayer);
    gardenLayer = new THREE.Group(); root.add(gardenLayer);
    bookLayer = new THREE.Group(); root.add(bookLayer);
    ferryLayer = new THREE.Group(); root.add(ferryLayer);
    yataiLayer = new THREE.Group(); root.add(yataiLayer);
    hallLayer = new THREE.Group(); root.add(hallLayer);
    isletLayer = new THREE.Group(); root.add(isletLayer);
    markLayer = new THREE.Group(); root.add(markLayer);
  }

  // ---------- 天色與天氣：跟著台北的時間和天氣 ----------
  function buildSky() {
    // 星星
    const sg = new THREE.BufferGeometry(), sp = [], r = rng(7);
    for (let i = 0; i < 400; i++) {
      const a = r() * Math.PI * 2, e = 0.15 + r() * 1.3, d = 85;
      sp.push(Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d, Math.sin(a) * Math.cos(e) * d);
    }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: true, fog: false, transparent: true })); lin(stars.material.color);
    stars.visible = false; scene.add(stars);
    // 雨
    const rg = new THREE.BufferGeometry(), rp = [];
    for (let i = 0; i < 900; i++) {
      const x = (r() - 0.5) * 36, y = r() * 22, z = (r() - 0.5) * 36;
      rp.push(x, y, z, x - 0.05, y - 0.6, z);
    }
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xcfe0f0, transparent: true, opacity: 0.55 })); lin(rain.material.color);
    rain.visible = false; scene.add(rain);
    // 雲
    clouds = new THREE.Group();
    const cm = std(0xffffff, { transparent: true, opacity: 0.92 });
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Group(), n = 3 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + r() * 0.8, 0), cm);
        b.position.set(k * 1.1 - n * 0.5, r() * 0.5, (r() - 0.5) * 0.8); c.add(b);
      }
      // 雲永遠在島的另一邊（跟著鏡頭轉），飄在遠處的天空，不會擋住街道
      c.userData.a = -Math.PI / 2 - 1.2 + (i / 7) * 2.4; c.userData.d = 30 + r() * 8;
      c.position.y = 5 + r() * 3; c.scale.setScalar(1.8);
      c.userData.speed = 0.15 + r() * 0.2; clouds.add(c);
    }
    clouds.userData.mat = cm; clouds.visible = false; scene.add(clouds);
    // 季節飄落物：花瓣、楓葉（白天）或螢火蟲（夏天晚上）；v2.30 從 140 片減到 60 片，停住的時候不顯示（散在草地上看起來很亂）
    const fg = new THREE.BufferGeometry(), fp = [];
    for (let i = 0; i < 60; i++) fp.push((r() - 0.5) * 26, 2 + r() * 8, (r() - 0.5) * 26);
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
    seasonFx = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xf4b6c8, size: 0.22, transparent: true, opacity: 0.9 })); lin(seasonFx.material.color);
    seasonFx.visible = false; scene.add(seasonFx);
  }
  // 二十四節氣的景色：grass 草地、leaves 三種樹葉、fx 飄落物（petal 花瓣、maple 楓葉、firefly 螢火蟲）
  const SEASONS = {
    立春: { grass: 0x95c873, leaves: [0x6fb36a, 0xf6c4d4, 0x86c47a] }, 雨水: { grass: 0x97cc75, leaves: [0x6fb36a, 0xf4b6c8, 0x86c47a], fx: 'petal' },
    驚蟄: { grass: 0x9bd27a, leaves: [0xf4b6c8, 0xf9d3df, 0x86c47a], fx: 'petal' }, 春分: { grass: 0x9bd27a, leaves: [0xf4b6c8, 0xf9d3df, 0xf0a9bf], fx: 'petal' },
    清明: { grass: 0x92cf70, leaves: [0xf4b6c8, 0x86c47a, 0xf9d3df], fx: 'petal' }, 穀雨: { grass: 0x88c866, leaves: [0x7cc070, 0x9ad48a, 0xf4b6c8] },
    立夏: { grass: 0x7fc35e, leaves: [0x5fae5a, 0x7cc070, 0x5fae5a] }, 小滿: { grass: 0x78c058, leaves: [0x55a650, 0x74bb66, 0x55a650] },
    芒種: { grass: 0x72bd55, leaves: [0x4fa34a, 0x6fb36a, 0x4fa34a], fx: 'firefly' }, 夏至: { grass: 0x6fbf5a, leaves: [0x4fa34a, 0x6fb36a, 0x4fa34a], fx: 'firefly' },
    小暑: { grass: 0x6fbf5a, leaves: [0x4a9e46, 0x66b062, 0x4a9e46], fx: 'firefly' }, 大暑: { grass: 0x74bb54, leaves: [0x4a9e46, 0x66b062, 0x4a9e46] },
    立秋: { grass: 0x80bb5c, leaves: [0x5fa858, 0x7cb866, 0x5fa858] }, 處暑: { grass: 0x88b85e, leaves: [0x6aa85a, 0x8ab866, 0xc9b24a] },
    白露: { grass: 0x92b862, leaves: [0x6aa85a, 0xd9b24a, 0x8ab866] }, 秋分: { grass: 0x9cb664, leaves: [0xd99a3d, 0x7cb866, 0xe0b54a] },
    寒露: { grass: 0xa4b468, leaves: [0xd9653b, 0xe8a33d, 0x8aae62], fx: 'maple' }, 霜降: { grass: 0xa9b06a, leaves: [0xd9553b, 0xe8933d, 0xc94a3a], fx: 'maple' },
    立冬: { grass: 0xa2ac70, leaves: [0xc9653b, 0x8aa070, 0xd98a3d], fx: 'maple' }, 小雪: { grass: 0x9ea878, leaves: [0x5d8f62, 0x7a9e7e, 0xb8653b] },
    大雪: { grass: 0x99a47c, leaves: [0x5d8f62, 0x7a9e7e, 0x5d8f62] }, 冬至: { grass: 0x97a27e, leaves: [0x5d8f62, 0x7a9e7e, 0xd94a5a] },
    小寒: { grass: 0x97a27e, leaves: [0x5d8f62, 0x7a9e7e, 0xe85a7a] }, 大寒: { grass: 0x95a37c, leaves: [0x5d8f62, 0x7a9e7e, 0xf4b6c8] }
  };
  function setSeason(term) {
    const t = SEASONS[term]; seasonNow = term;
    if (!t || !grassMat) return;
    lin(grassMat.color.setHex(t.grass));
    leafMats.forEach((m, i) => lin(m.color.setHex(t.leaves[i])));
    seasonFx.userData.kind = t.fx || null;
    lin(seasonFx.material.color.setHex(t.fx === 'maple' ? 0xe0603a : t.fx === 'firefly' ? 0xf6f08a : 0xf7bfd0));
    seasonFx.material.size = t.fx === 'firefly' ? 0.16 : 0.22;
    showSeasonFx();
    if (gardenLayer && ctx) buildGarden();
  }
  function showSeasonFx() {
    if (!seasonFx) return;
    const k = seasonFx.userData.kind, night = envNow.phase === 'night', wet = envNow.weather === 'rain' || envNow.weather === 'storm';
    seasonFx.visible = !!k && !wet && !CALM && (k === 'firefly' ? night : !night);   // v2.30.2：她想保留楓葉，但葉子不落地（見 animateSky）
  }
  const SKY = { dawn: 0xf6c9a8, day: 0xcfe8f3, dusk: 0xf2a07b, night: 0x1b2440 };
  const GREY = { dawn: 0xb9aaa4, day: 0xaab6c0, dusk: 0x9c8f92, night: 0x151b28 };
  function setEnvironment(e) {
    envNow = Object.assign({ phase: 'day', weather: 'clear' }, e || {});
    if (!scene) return;
    const ph = envNow.phase, w = envNow.weather, wet = w === 'rain' || w === 'storm';
    const sky = new THREE.Color(SKY[ph]);
    if (w === 'cloudy') sky.lerp(new THREE.Color(GREY[ph]), 0.35);
    if (wet || w === 'fog') sky.lerp(new THREE.Color(GREY[ph]), w === 'storm' ? 0.85 : 0.65);
    scene.background = sky;
    lin(scene.fog.color.copy(sky));
    scene.fog.near = w === 'fog' ? 18 : wet ? 30 : 45; scene.fog.far = w === 'fog' ? 50 : wet ? 75 : 90;
    const night = ph === 'night', dim = wet ? 0.7 : w === 'cloudy' ? 0.88 : 1;
    hemi.intensity = { dawn: 0.45, day: 0.55, dusk: 0.42, night: 0.3 }[ph] * dim * 0.7;   // v2.22：線性光照下天光調弱、太陽加強，影子和層次才出得來
    lin(hemi.color.setHex(night ? 0x8090c0 : 0xffffff));
    sun.intensity = { dawn: 0.45, day: 0.6, dusk: 0.45, night: 0 }[ph] * (wet ? 0.4 : dim) * 1.7;
    lin(sun.color.setHex(ph === 'dawn' ? 0xffc89a : ph === 'dusk' ? 0xff9f6a : 0xfff4e0));
    sun.position.set(ph === 'dawn' ? 18 : ph === 'dusk' ? -18 : 10, ph === 'day' ? 20 : 7, 8);
    moon.intensity = night ? 0.45 : 0;
    lin(water.material.color.setHex(night ? 0x24456a : wet ? 0x5d8aa6 : 0x6fb4d8));
    // 晚上和陰暗時房子亮燈
    lin(wallMat.emissive.setHex(night ? 0xffb347 : wet && ph !== 'day' ? 0xffb347 : 0x000000));
    wallMat.emissiveIntensity = night ? 0.8 : 0.35;
    homeLayer && homeLayer.children.forEach(c => { if (c.userData.glass) c.userData.glass.emissiveIntensity = night || (wet && ph !== 'day') ? 0.9 : 0; });
    bookLayer && bookLayer.children.forEach(c => { if (c.userData.glass) c.userData.glass.emissiveIntensity = night || (wet && ph !== 'day') ? 0.9 : 0.15; });
    ferryLayer && ferryLayer.children.forEach(c => { if (c.userData.glass) c.userData.glass.emissiveIntensity = night || (wet && ph !== 'day') ? 0.9 : 0.15; });
    yataiLayer && yataiLayer.children.forEach(c => { if (c.userData.glass) c.userData.glass.emissiveIntensity = night || ph === 'dusk' || wet ? 1.2 : 0.35; });
    // 音樂廳：這週有藝文紀錄才亮大玻璃，亮度比燈塔（1.4）弱；門燈晚上一定亮
    hallLayer && hallLayer.children.forEach(c => { if (c.userData.glass) c.userData.glass.emissiveIntensity = c.userData.lit && (night || (wet && ph !== 'day')) ? 0.6 : c.userData.lit && ph === 'dusk' ? 0.35 : 0.04;
      if (c.userData.door) c.userData.door.emissiveIntensity = night || (wet && ph !== 'day') ? 0.7 : 0; });
    if (lamp) lamp.emissiveIntensity = night ? 1.4 : ph === 'dusk' || wet ? 0.9 : 0.4;
    if (beam) beam.visible = night || ph === 'dusk' || w === 'fog';
    stars.visible = night && !wet && w !== 'fog';
    stars.material.opacity = w === 'cloudy' ? 0.4 : 1;
    rain.visible = wet;
    clouds.visible = w !== 'clear' || ph === 'day';
    lin(clouds.userData.mat.color.setHex(wet ? 0x7d8794 : night ? 0x4a5370 : 0xffffff));
    if (container) container.style.background = '#' + sky.getHexString();
    foam.userData.base = night ? 0.28 : wet ? 0.75 : 0.55;
    if (renderer) renderer.toneMappingExposure = (CM ? { dawn: 0.62, day: 0.58, dusk: 0.62, night: 0.75 } : { dawn: 0.75, day: 0.7, dusk: 0.75, night: 0.85 })[ph] * (wet ? 1.15 : 1);   // 白天光最強，曝光調低才不會一片淡
    shadowDirty = true;
    showSeasonFx();
    if (BG() !== 'sea') floatEnv(ph, w);
  }
  // 浮島（家人島）：島底下倒過來的岩塊＋幾顆小石頭；宇宙加行星和星星，天空加雲海
  let floatLayer = null, floatBg = null;
  function applyBg() {   // 換背景不用重新整理：拿掉舊的浮島，重新對鏡頭
    if (floatBg === BG()) return;
    if (floatBg) framed = false;
    floatBg = BG();
    if (floatLayer) { root.remove(floatLayer); drop(floatLayer); floatLayer = null; }
    if (!stars.userData.seaGeo) stars.userData.seaGeo = stars.geometry;
    stars.geometry = stars.userData.seaGeo; stars.material.size = 0.7;
    water.visible = foam.visible = floatBg === 'sea';
    if (controls) controls.maxDistance = 50;
    if (floatBg !== 'sea') buildFloat();
  }
  function buildFloat() {
    floatLayer = new THREE.Group(); root.add(floatLayer);
    const rock = std(0xa08a6e), dark = std(0x857260), r = rng(31);
    const under = new THREE.Mesh(new THREE.ConeGeometry(15, 14, 14, 3), rock); under.rotation.x = Math.PI; under.position.y = -7.8; floatLayer.add(under);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(5, 6, 8), dark); tip.rotation.x = Math.PI; tip.position.y = -16.5; floatLayer.add(tip);
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2, d = 17 + r() * 9, sz = 0.5 + r() * 1.1;
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(sz, 0), i % 2 ? rock : dark);
      b.position.set(Math.cos(a) * d, -2 - r() * 6, Math.sin(a) * d); floatLayer.add(b);
      if (sz > 1) { const g = new THREE.Mesh(new THREE.CylinderGeometry(sz * 0.9, sz * 0.9, 0.2, 7), grassMat); g.position.set(b.position.x, b.position.y + sz * 0.75, b.position.z); floatLayer.add(g); }
    }
    if (BG() === 'space') {
      const planet = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), std(0xd9a066, { roughness: 1 }));
      planet.position.set(-12, 20, -75); floatLayer.add(planet);
      const ring = new THREE.Mesh(new THREE.RingGeometry(12, 17, 48, 1), new THREE.MeshBasicMaterial({ color: 0xe8cfa0, side: THREE.DoubleSide, transparent: true, opacity: 0.55, fog: false })); lin(ring.material.color);
      ring.position.copy(planet.position); ring.rotation.set(-1.2, 0.3, 0); floatLayer.add(ring);
      const moonB = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), std(0xbfc6d6)); moonB.position.set(24, 14, -70); floatLayer.add(moonB);
      // 宇宙：上下四周都有星星；沿用原本那一個星星 Points，只換形狀（1,100 顆，工程顧問上限 1,500）
      const sg = new THREE.BufferGeometry(), sp = Array.from(stars.userData.seaGeo.attributes.position.array);
      for (let i = 0; i < 700; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2, d = 90 + r() * 15, c = Math.sqrt(1 - u * u); sp.push(Math.cos(a) * c * d, u * d, Math.sin(a) * c * d); }
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
      stars.geometry = sg; stars.material.size = 1.0;
    } else {
      const cm = std(0xffffff, { transparent: true, opacity: 0.95 });
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + r() * 0.2, d = i % 3 ? 19 + r() * 22 : 32 + r() * 12;   // 和島一樣高的雲放遠一點，不擋住島
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(3 + r() * 3, 0), cm);
        c.scale.set(1.6, 0.5, 1.2); c.position.set(Math.cos(a) * d, (i % 3 ? -6 - r() * 3 : -1 + r() * 3), Math.sin(a) * d); floatLayer.add(c);
      }
      floatLayer.userData.cloudMat = cm;
    }
    floatLayer.traverse(o => { o.raycast = () => {}; });   // 岩塊、雲海、行星都點不到，不會擋住剪影和小島
  }
  let fixLayer = null;
  function floatFix() {   // 在 mount／setWeek 之後跑一次（不在每一幀）
    if (fixLayer) { root.remove(fixLayer); drop(fixLayer); fixLayer = null; }
    if (floatBg === 'sea' || !floatBg) { if (capeFoam) capeFoam.visible = true; floats.forEach(f => { f.visible = true; }); return; }
    fixLayer = new THREE.Group(); root.add(fixLayer);
    if (capeFoam) capeFoam.visible = false;
    floats.forEach(f => { f.visible = false; });
    const rock = std(0xa08a6e), under = (a, r, rad, h) => { const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 9), rock); m.rotation.x = Math.PI; m.position.set(Math.cos(a) * r, -0.85 - h / 2, Math.sin(a) * r); fixLayer.add(m); };
    if (LY().light !== false) under(CAPE, 14.6, 2.6, 3.5);
    (ctx.islets || []).forEach(it => { const a = ISLET_A[it.slot]; if (a != null) under(a, ISLET_R, 3.8, 4.5); });
    if (ctx.ferry && ctx.ferry.far !== false) under(FERRY.a, 34, 5, 5.5);
    fixLayer.traverse(o => { o.raycast = () => {}; });   // 岩塊點不到，點擊穿過去給上面的島
  }
  const SPACE = { dawn: 0x1a1640, day: 0x141a3a, dusk: 0x1d1538, night: 0x0b0e22 };
  function floatEnv(ph, w) {
    if (BG() === 'space') {   // 宇宙沒有天氣：不下雨、沒有雲，星星一直都在
      const sky = new THREE.Color(SPACE[ph]);
      scene.background = sky; lin(scene.fog.color.copy(sky)); scene.fog.near = 90; scene.fog.far = 190;
      if (container) container.style.background = '#' + sky.getHexString();
      stars.visible = true; stars.material.opacity = 1; rain.visible = false; clouds.visible = false;
      if (seasonFx) seasonFx.visible = false;
      return;
    }
    // 天空：比海上的天色藍一點，雲海要看得到
    if (ph === 'day' && w === 'clear') { const sky = new THREE.Color(0x9fd3f0); scene.background = sky; lin(scene.fog.color.copy(sky)); if (container) container.style.background = '#9fd3f0'; }
    scene.fog.near = Math.max(scene.fog.near, 50); scene.fog.far = Math.max(scene.fog.far, 110);
    const cm = floatLayer && floatLayer.userData.cloudMat;
    if (cm) lin(cm.color.setHex(ph === 'night' ? 0x4a5370 : ph === 'dusk' ? 0xf4c2a8 : ph === 'dawn' ? 0xf8d8c4 : 0xffffff));
  }
  // 海浪與潮汐（v2.22）：海面用三組正弦波起伏，離岸越遠浪越大，下雨、颱風浪更大；岸邊的浪花一波一波湧上沙灘
  function animateSea(t) {
    if (!water || !water.visible) return;
    if (t - tideAt > 10 || !tideAt) { tideAt = t; water.userData.tide = tideNow(); }
    const w = envNow.weather, big = w === 'storm' ? 3 : w === 'rain' ? 1.8 : 1;
    const swell = Math.sin(t * 1.6);
    waterY = -0.6 + 0.17 * (water.userData.tide || 0);
    water.position.y = waterY;
    const p = water.geometry.attributes.position, amp = water.userData.amp, A = 0.11 * big;
    for (let i = 0; i < p.count; i++) {
      const a = amp[i]; if (!a) continue;
      const x = p.getX(i), y = p.getY(i);
      p.setZ(i, A * a * (Math.sin(x * 0.42 + t * 1.3) + 0.6 * Math.sin(y * 0.37 - t * 1.05) + 0.35 * Math.sin((x + y) * 0.8 + t * 2.1)));
    }
    p.needsUpdate = true;
    // 沙灘斜面：頂端半徑 14.2（y=0），每往下 0.8 半徑多 0.8；浪花貼在水線外側，跟著浪湧進退出
    const wy = waterY + 0.04 * swell;
    foam.position.y = wy + 0.02; foam.scale.setScalar(14.2 - wy + 0.12 * Math.sin(t * 1.6 + 1.2));
    foam.material.opacity = (foam.userData.base || 0.55) * (0.65 + 0.35 * (0.5 + 0.5 * swell));
    if (capeFoam && capeFoam.parent) { capeFoam.position.y = wy + 0.02; capeFoam.scale.setScalar(2.3 + (-0.02 - wy) / 0.78 * 0.3 + 0.06 * Math.sin(t * 1.6 + 1.2)); }
  }
  function animateSky(dt) {
    if (seasonFx && seasonFx.visible) {
      const p = seasonFx.geometry.attributes.position, fly = seasonFx.userData.kind === 'firefly', t = performance.now() / 1000;
      for (let i = 0; i < p.count; i++) {
        if (fly) { p.setY(i, 0.6 + 1.2 * (0.5 + 0.5 * Math.sin(t * 0.8 + i))); p.setX(i, p.getX(i) + Math.sin(t + i * 1.7) * dt * 0.4); continue; }
        let y = p.getY(i) - dt * 0.7;
        if (y < 2) y += 8;   // v2.30.2：飄到半空就回到上面，不會落在草地上看起來像垃圾
        p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * 1.3 + i) * dt * 0.5);
      }
      p.needsUpdate = true;
      if (fly) seasonFx.material.opacity = 0.6 + 0.4 * Math.sin(t * 3);
    }
    if (rain && rain.visible) {
      const p = rain.geometry.attributes.position, speed = (envNow.weather === 'storm' ? 26 : 18) * dt;
      for (let i = 0; i < p.count; i += 2) {
        let y = p.getY(i) - speed;
        if (y < 0) y += 22;
        p.setY(i, y); p.setY(i + 1, y - 0.6);
      }
      p.needsUpdate = true;
    }
    if (clouds && clouds.visible) {
      clouds.rotation.y = Math.atan2(camera.position.x, camera.position.z);
      clouds.children.forEach(c => {
        c.userData.a += c.userData.speed * dt * 0.04;
        if (c.userData.a > -Math.PI / 2 + 1.2) c.userData.a -= 2.4;
        c.position.x = Math.cos(c.userData.a) * c.userData.d; c.position.z = Math.sin(c.userData.a) * c.userData.d;
      });
    }
    if (beam && beam.visible) beam.rotation.y += dt * 0.7;
    if (floats.length) { const t = CALM ? 0 : performance.now() / 1000; floats.forEach(f => { f.position.y = waterY + 0.05 + Math.sin(t * 1.2 + f.userData.phase) * 0.06; f.rotation.y = Math.sin(t * 0.4 + f.userData.phase) * 0.3; }); }
    // 雷雨偶爾閃電
    if (envNow.weather === 'storm') {
      if (flash <= 0 && Math.random() < dt * 0.15) flash = 0.35;
      if (flash > 0) { flash -= dt; hemi.intensity = flash > 0.2 || (flash > 0.05 && flash < 0.12) ? 1.6 : 0.35; if (flash <= 0) setEnvironment(envNow); }
    }
  }

  // 依週數計算每個分科的累積點數；week = null 代表全部
  function pointsUntil(week) {
    if (ctx.pointsUntil) return ctx.pointsUntil(week);
    const S = ctx.S, pts = {};
    const last = week == null ? S.weeks.length - 1 : week;
    S.items.forEach(it => {
      const g = S.grid[it.row] || [];
      for (let i = 0; i <= last && i < g.length; i++) {
        if (S.weeks[i].start > S.today) break;
        if (g[i] === 2) pts[it.subject] = (pts[it.subject] || 0) + 1;
        else if (g[i] === 1) pts[it.subject] = (pts[it.subject] || 0) + 0.5;
      }
    });
    return pts;
  }

  function buildDynamic(animateNew) {
    const old = new Map();
    buildLayer.children.forEach(m => old.set(m.userData.key, m));
    const keep = new Set();
    const pts = pointsUntil(weekIdx);
    const place = (subj, key, points, a0, a1, labelText) => {
      const kinds = buildingsFor(points);
      const pos = slots(districtPos(SUBJECTS.indexOf(subj)), a0, a1, kinds.length);
      kinds.forEach((kind, i) => {
        const k = `${key}:${i}:${kind}`; keep.add(k);
        if (old.has(k)) return;
        const b = makeBuilding(kind, subj);
        b.position.copy(pos[i]); b.userData.key = k; b.userData.subject = subj;
        b.rotation.y = (i * 1.3) % (Math.PI * 2);
        buildLayer.add(b);
        if (animateNew) { b.scale.setScalar(0.01); popping.push({ m: b, t: 0 }); }
      });
      if (labelText) {
        const lk = `label:${key}`; keep.add(lk);
        if (!old.has(lk)) {
          const mid = (a0 + a1) / 2, c = districtPos(SUBJECTS.indexOf(subj));
          const sp = labelSprite(labelText, null, { scale: 0.85 });
          sp.position.set(c.x + Math.cos(mid) * 3.2, 0.9, c.z + Math.sin(mid) * 3.2);
          sp.userData.key = lk; sp.userData.subject = subj; buildLayer.add(sp);
        }
      }
    };
    SUBJECTS.forEach(s => {
      if (isOff(s)) return;
      if (laneOf(s)) {
        laneOf(s).forEach((sub, k) => {
          const a0 = -Math.PI / 2 + k * (Math.PI * 2 / 3) - Math.PI / 3, a1 = a0 + Math.PI * 2 / 3;
          const mate = ctx.roommate ? ctx.roommate(sub) : null;
          place(s, sub, pts[sub] || 0, a0 + 0.12, a1 - 0.12, (mate && mate.name) ? `${mate.name}（${sub}）` : sub);
        });
        // 綜合廣場（模卷、歷屆）放在島民旁邊的內圈
        const plaza = buildingsFor(pts[PLAZA[s]] || 0);
        const c = districtPos(SUBJECTS.indexOf(s));
        plaza.forEach((kind, i) => {
          const k = `${s}:plaza:${i}:${kind}`; keep.add(k);
          if (old.has(k)) return;
          const b = makeBuilding(kind, s), a = Math.PI / 2 + i * 0.9;
          b.position.set(c.x + Math.cos(a) * 0.95, 0.3, c.z + Math.sin(a) * 0.95); b.scale.setScalar(0.8);
          b.userData.key = k; b.userData.subject = s; buildLayer.add(b);
        });
      } else {
        place(s, s, pts[s] || 0, 0, Math.PI * 2, null);
      }
    });
    // 島民頭像與名牌
    SUBJECTS.forEach(s => {
      if (isOff(s)) return;
      const r = ctx.resident(s), gr = ctx.grade(s);
      const k = `who:${s}:${r.name}:${gr || ''}:${r.emoji}:${ctx.imgOf(s) ? ctx.imgOf(s).length : 0}`; keep.add(k);
      if (old.has(k)) return;
      const av = avatarSprite(r.emoji, ctx.imgOf(s));
      av.position.copy(anchors[s]); av.userData.key = k; av.userData.subject = s; av.userData.avatar = true;
      const lb = labelSprite(r.name, `${ctx.subjIc && ctx.subjIc[s] ? ctx.subjIc[s] + ' ' : ''}${ctx.subjectName[s]}街${gr ? '・' + gr : ''}`, { scale: 1.15 });
      lb.position.set(anchors[s].x, anchors[s].y + 1.8, anchors[s].z);
      const grp = new THREE.Group(); grp.add(av, lb); grp.userData.key = k; grp.userData.subject = s;
      buildLayer.add(grp);
    });
    buildLayer.children.slice().forEach(m => { if (!keep.has(m.userData.key)) { buildLayer.remove(m); drop(m); } });
    buildLinks();
    buildHome();
    buildWalk();
    buildLight();
    buildGarden();
    buildBook();
    buildFerry();
    buildYatai();
    buildHall();
    buildIslets();
    buildMarks();
  }

  // ---------- 植樹 ----------
  // 空地格：和 index.html 的 gardenSlot() 用同一個公式，改一邊就要改另一邊
  // 0–24 街與街之間的中線（由內往外）、25–34 外圈街道間兩側（Lv.5 開放）、35–39 外圈街道正前方（Lv.8 開放）
  function gardenSlot(i) {
    const gap = j => -Math.PI / 2 + (j + 0.5) * (Math.PI * 2 / 5), dis = j => -Math.PI / 2 + j * (Math.PI * 2 / 5);
    let r, a;
    if (i < 25) { r = [4.8, 6.3, 7.8, 9.3, 10.8][Math.floor(i / 5)]; a = gap(i % 5); }
    else if (i < 35) { r = 12.1; a = gap((i - 25) % 5) + (i < 30 ? -0.16 : 0.16); }
    else { r = 12.2; a = dis(i - 35); }
    return { x: Math.cos(a) * r, z: Math.sin(a) * r };
  }
  const GARDEN_SLOTS = Array.from({ length: 40 }, (_, i) => gardenSlot(i));
  const HUT = { x: Math.cos(Math.PI / 10) * 3.2, z: Math.sin(Math.PI / 10) * 3.2 };   // 植木屋：碼頭右前方
  const BOOK = { x: Math.cos(Math.PI * 9 / 10) * 3.2, z: Math.sin(Math.PI * 9 / 10) * 3.2 };   // 獨立書店：碼頭左前方（和植木屋對稱）
  const YATAI = { a: Math.PI * 0.5 + 0.22, r: 12.2 };   // 島の屋台（v2.30.3）：島正前方的海邊（數學街和自然街之間），一打開就看得到
  const HALL = { a: Math.PI * 0.5, r: 3.3 };   // 音樂廳：碼頭廣場正前方（和植木屋、書店圍著廣場），直式手機一打開就看得到；海邊各街地標和步道都沒有空位
  const FERRY = { a: Math.PI * 0.9, x: Math.cos(Math.PI * 0.9) * 13.2, z: Math.sin(Math.PI * 0.9) * 13.2 };   // 智慧島渡船碼頭：島左前方的海邊（v2.24）
  const TERM_ORDER = ['立春', '雨水', '驚蟄', '春分', '清明', '穀雨', '立夏', '小滿', '芒種', '夏至', '小暑', '大暑',
    '立秋', '處暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'];

  // 一株植物：k 品種、ti 節氣（0＝立春…23＝大寒）、stage 0 小苗／1 小樹／2 長成
  function plantMesh(k, ti, stage) {
    const g = new THREE.Group();
    const S = (a, b) => a <= b ? ti >= a && ti <= b : ti >= a || ti <= b;   // 節氣區間，可以跨年（例如 19–1）
    const add = (geo, color, x, y, z, extra) => { const m = new THREE.Mesh(geo, std(color, extra)); m.position.set(x, y, z); g.add(m); return m; };
    const trunk = (h, r, c) => add(new THREE.CylinderGeometry(r * 0.7, r, h, 6), c || 0x8a5f42, 0, h / 2, 0);
    const ball = (r, c, x, y, z) => add(new THREE.IcosahedronGeometry(r, 0), c, x, y, z);
    const dots = (n, r, c, R, y0, y1, seed) => { for (let i = 0; i < n; i++) { const a = i * 2.39 + (seed || 0), rr = R * (0.45 + 0.55 * ((i * 0.37) % 1));
      ball(r, c, Math.cos(a) * rr, y0 + (y1 - y0) * ((i * 0.61) % 1), Math.sin(a) * rr); } };
    const twigs = (h, c) => [[0.5, 0.3], [-0.6, -0.2], [0.1, 0.6]].forEach(([rz, rx]) => {
      const t = add(new THREE.CylinderGeometry(0.02, 0.035, 0.5, 4), c || 0x7a5a48, 0, h + 0.15, 0); t.rotation.set(rx, 0, rz); });
    const canopy = (c, y, sx, sy) => { const m = ball(0.55, c, 0, y, 0); m.scale.set(sx || 1, sy || 1, sx || 1);
      ball(0.38, c, 0.38 * (sx || 1), y - 0.08, 0.12); ball(0.38, c, -0.34 * (sx || 1), y - 0.05, -0.16); return m; };
    switch (k) {
      case 'hydrangea':   // 繡球花：芒種～小暑開藍紫色的花球
        if (S(19, 1)) { ball(0.22, 0x8a8a5a, 0, 0.18, 0); break; }
        ball(0.36, 0x5f9e55, 0, 0.3, 0); ball(0.26, 0x6fae5f, 0.25, 0.22, 0.1);
        if (S(8, 10)) [0x7d8fe0, 0xa98ae0, 0x8fb8f0, 0xc79ae6, 0x7d8fe0].forEach((c, i) => { const a = i * 1.26; ball(0.15, c, Math.cos(a) * 0.3, 0.42 + (i % 2) * 0.1, Math.sin(a) * 0.3); });
        break;
      case 'cosmos':      // 波斯菊：白露～霜降一片粉白花田
        for (let i = 0; i < 9; i++) { const a = i * 2.39, rr = 0.12 + (i % 3) * 0.14, h = S(14, 17) ? 0.4 + (i % 3) * 0.08 : 0.18;
          const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
          add(new THREE.CylinderGeometry(0.012, 0.012, h, 3), 0x6fae4a, x, h / 2, z);
          if (S(14, 17)) ball(0.07, [0xf4a6c6, 0xffffff, 0xd9549a][i % 3], x, h, z); else ball(0.06, 0x7cc070, x, h, z); }
        break;
      case 'sunflower':   // 向日葵：小滿～大暑
        for (let i = 0; i < 3; i++) { const x = (i - 1) * 0.22, z = (i % 2) * 0.12, h = S(18, 4) ? 0.25 : 0.75 + i * 0.12;
          add(new THREE.CylinderGeometry(0.025, 0.03, h, 5), S(18, 4) ? 0x9a8a5a : 0x5f9e45, x, h / 2, z);
          if (S(7, 11)) { const f = add(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 10), 0xf5c518, x, h, z + 0.04); f.rotation.x = 1.2;
            const c = add(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8), 0x6b4423, x, h + 0.01, z + 0.06); c.rotation.x = 1.2; }
          else if (!S(18, 4)) ball(0.08, 0x6fae4a, x, h, z); }
        break;
      case 'camellia':    // 山茶花（椿）：常綠，小雪～大寒開紅花
        ball(0.4, 0x3f7a45, 0, 0.42, 0).scale.set(1, 1.2, 1); ball(0.28, 0x3f7a45, 0.2, 0.75, 0.05);
        if (S(19, 23)) dots(7, 0.07, 0xd6334a, 0.38, 0.3, 0.9, 1);
        break;
      case 'bamboo':      // 竹子：全年常綠
        for (let i = 0; i < 5; i++) { const a = i * 1.3, x = Math.cos(a) * 0.18, z = Math.sin(a) * 0.18, h = 1.4 + (i % 3) * 0.25;
          add(new THREE.CylinderGeometry(0.035, 0.04, h, 5), 0x7cb342, x, h / 2, z);
          ball(0.16, 0x5f9e45, x * 1.6, h, z * 1.6); }
        break;
      case 'kumquat':     // 金橘：常綠，冬至～立春結橘色果實（過年吉祥）
        trunk(0.3, 0.06); canopy(0x3f7a45, 0.6, 0.8, 0.9);
        if (S(21, 0)) dots(9, 0.06, 0xf59a1a, 0.42, 0.45, 0.85, 0.5);
        break;
      case 'sakura':      // 櫻花：驚蟄～清明滿樹粉紅
        trunk(0.8, 0.09, 0x6b4a3a);
        if (S(19, 1)) { twigs(0.8); break; }
        canopy(S(2, 4) ? 0xf6bcd0 : S(15, 18) ? 0xe0904a : 0x6fb36a, 1.05);
        if (S(2, 4)) dots(6, 0.09, 0xffffff, 0.5, 0.85, 1.35);
        break;
      case 'maple':       // 楓樹：寒露～立冬紅葉
        trunk(0.75, 0.08, 0x6b4a3a);
        if (S(19, 1)) { twigs(0.75); break; }
        { const c = S(16, 18) ? 0xd9453b : S(2, 4) ? 0x9ad48a : 0x5fa858; canopy(c, 1.0);
          if (S(16, 18)) dots(5, 0.14, 0xe8933d, 0.45, 0.85, 1.25); }
        break;
      case 'tung':        // 油桐花：立夏～小滿白花（五月雪）
        trunk(0.85, 0.08);
        if (S(18, 1)) { twigs(0.85); break; }
        canopy(0x6fae5a, 1.1, 1.25, 0.7);
        if (S(6, 7)) dots(12, 0.08, 0xffffff, 0.62, 1.0, 1.35, 2);
        break;
      case 'ginkgo':      // 銀杏：霜降～小雪金黃
        trunk(0.6, 0.08);
        if (S(20, 2)) { twigs(0.6); break; }
        add(new THREE.ConeGeometry(0.5, 1.3, 7), S(17, 19) ? 0xf0c43a : 0x7cb866, 0, 1.15, 0);
        break;
      case 'pine':        // 黑松：常綠，冬天掛雪吊り
        { const t = add(new THREE.CylinderGeometry(0.06, 0.1, 1.1, 6), 0x6b4a3a, 0.05, 0.55, 0); t.rotation.z = -0.18;
          [[0.25, 0.55, 0.42], [-0.15, 0.85, 0.34], [0.12, 1.15, 0.28]].forEach(([x, y, r]) => { const m = ball(r, 0x2f5f3a, x, y, 0); m.scale.set(1.3, 0.55, 1.1); });
          if (S(19, 1)) { add(new THREE.CylinderGeometry(0.015, 0.015, 1.9, 4), 0xc8b27a, 0, 0.95, 0);
            add(new THREE.ConeGeometry(0.75, 1.5, 10, 1, true), 0xd9c79a, 0, 1.15, 0, { wireframe: true }); } }
        break;
      case 'flame':       // 鳳凰木：芒種～小暑滿樹紅花（鳳凰花開，畢業季）
        trunk(0.9, 0.1);
        if (S(18, 2)) { canopy(0xa8b86a, 1.05, 1.1, 0.4).scale.multiplyScalar(0.8); break; }
        canopy(S(8, 10) ? 0xe8442e : 0x6fae4a, 1.1, 1.5, 0.45);
        if (S(8, 10)) dots(8, 0.12, 0x6fae4a, 0.7, 1.0, 1.2, 1); else if (S(11, 12)) dots(6, 0.1, 0xe8442e, 0.7, 1.05, 1.25, 1);
        break;
    }
    g.scale.setScalar([0.4, 0.7, 1][stage] || 1);
    return g;
  }
  function buildGarden() {
    const G = ctx.garden || null, ti = Math.max(0, TERM_ORDER.indexOf(seasonNow || ctx.season));
    const sig = JSON.stringify([G, ti]);
    if (sig === gardenSig) return;
    gardenSig = sig;
    clearLayer(gardenLayer);
    if (!G) return;
    if (G.hut) {   // 植木屋：木造小棚、陶盆、綠色暖簾
      const hut = new THREE.Group(); hut.userData.garden = true;
      const box = (w, h, d, x, y, z, c) => { const b = new THREE.Mesh(bx(w, h, d), std(c)); b.position.set(x, y, z); hut.add(b); return b; };
      box(0.9, 0.55, 0.6, 0, 0.42, 0, 0xc9a77c);
      const roof = box(1.1, 0.06, 0.8, 0, 0.78, 0.05, 0x5a6b4a); roof.rotation.x = -0.18;
      box(0.4, 0.16, 0.02, 0, 0.6, 0.31, 0x3f7a45);   // 暖簾
      box(0.9, 0.05, 0.25, 0, 0.3, 0.45, 0x8a5f42);    // 店門口的花台
      [-0.3, 0, 0.3].forEach((x, i) => { box(0.12, 0.1, 0.12, x, 0.38, 0.45, 0xb5653a);
        const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), std([0x6fae4a, 0xe98fb3, 0x7cb866][i])); l.position.set(x, 0.5, 0.45); hut.add(l); });
      hut.position.set(HUT.x, 0.05, HUT.z);
      hut.lookAt(new THREE.Vector3(HUT.x * 2, 0.05, HUT.z * 2 + 2));
      gardenLayer.add(hut);
      const lb = labelSprite('🌱 ' + (G.name || '植木屋'), null, { scale: 0.75, color: '#3a2a33' });
      lb.position.set(HUT.x, 1.55, HUT.z); lb.userData.garden = true; gardenLayer.add(lb);
    }
    (G.list || []).forEach(p => {
      const q = GARDEN_SLOTS[p.slot]; if (!q) return;
      const m = plantMesh(p.k, ti, p.stage);
      m.position.set(q.x, 0.2, q.z); m.rotation.y = (p.slot * 1.7) % (Math.PI * 2);
      m.userData.plant = p.id || String(p.slot);
      gardenLayer.add(m);
    });
  }

  // 獨立書店：台灣巷弄的兩層小街屋，藍白條紋遮雨棚、落地玻璃窗（晚上亮燈）、門口的書箱和招牌
  function buildBook() {
    const B = ctx.book || null, sig = JSON.stringify(B);
    if (sig === bookSig) return;
    bookSig = sig;
    clearLayer(bookLayer);
    if (!B) return;
    const shop = new THREE.Group(); shop.userData.book = true;
    const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(bx(w, h, d), m.isMaterial ? m : std(m)); b.position.set(x, y, z); shop.add(b); return b; };
    box(1.0, 1.1, 0.7, 0, 0.6, 0, 0xf1e6d2);                    // 洗石子色的牆
    box(1.06, 0.06, 0.76, 0, 1.18, 0, 0x7a5a48);                // 二樓的簷
    box(0.3, 0.22, 0.02, -0.22, 0.92, 0.36, 0x6b7f8f);          // 二樓小窗
    box(0.3, 0.22, 0.02, 0.22, 0.92, 0.36, 0x6b7f8f);
    const glass = std(0xfff1c2, { emissive: 0xffc46b, emissiveIntensity: 0.15 });
    box(0.56, 0.4, 0.02, -0.14, 0.37, 0.36, glass);             // 落地玻璃窗（晚上亮）
    box(0.56, 0.06, 0.06, -0.14, 0.15, 0.37, 0x6b4a2b);
    box(0.2, 0.42, 0.03, 0.33, 0.36, 0.36, 0x6b4a2b);           // 木門
    const awn = new THREE.Group();                              // 藍白條紋遮雨棚
    for (let i = 0; i < 6; i++) { const st = new THREE.Mesh(bx(0.18, 0.03, 0.34), std(i % 2 ? 0xfdfaf2 : 0x2f6fae)); st.position.set(-0.45 + i * 0.18, 0, 0); awn.add(st); }
    awn.position.set(0, 0.68, 0.5); awn.rotation.x = 0.35; shop.add(awn);
    box(0.36, 0.14, 0.03, 0, 1.38, 0.2, 0xfffaf0);              // 屋頂招牌
    box(0.3, 0.12, 0.22, -0.2, 0.12, 0.56, 0xb98a55);           // 門口的書箱
    [0xc0392b, 0xf1c40f, 0x27ae60, 0x2980b9].forEach((c, i) => box(0.05, 0.1, 0.16, -0.31 + i * 0.07, 0.22, 0.56, c));
    shop.position.set(BOOK.x, 0.05, BOOK.z);
    shop.lookAt(new THREE.Vector3(BOOK.x * 2, 0.05, BOOK.z * 2 + 2));
    shop.scale.setScalar(1.25); shop.userData.glass = glass;
    bookLayer.add(shop);
    const lb = labelSprite('📚 ' + (B.name || '獨立書店'), B.sub || null, { scale: 0.75, color: '#3a2a33' });
    lb.position.set(BOOK.x, 1.95, BOOK.z); lb.userData.book = true; bookLayer.add(lb);
  }

  // ---------- 智慧島的渡船碼頭（v2.24） ----------
  // ctx.ferry = { open }：碼頭在島左前方的海邊（理化…和社會街之間的空隙，植樹空地格的外側），木棧橋伸進海裡、停一艘小渡船；
  // 遠方海上的霧裡看得到智慧島。點碼頭、渡船或木牌就呼叫 ctx.onFerry
  // 家人島的港口（10/27）：ctx.ferry 可再帶 label、sub（木牌的字）、far: false（不畫遠方的智慧島）；沒帶就照原本
  function buildFerry() {
    const F = ctx.ferry || null, sig = JSON.stringify(F);
    if (sig === ferrySig) return;
    ferrySig = sig;
    clearLayer(ferryLayer);
    ferryBoat = null;
    if (!F) return;
    const pier = new THREE.Group(); pier.userData.ferry = true;
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m.isMaterial ? m : std(m)); o.position.set(x, y, z); pier.add(o); return o; };
    const plank = std(0xb08356), post = std(0x7a5236);
    for (let i = 0; i < 9; i++) add(bx(1.1, 0.07, 0.5), plank, 0, 0.18, -i * 0.52);   // 往海裡（-z）鋪
    for (let i = 0; i < 5; i++) [-0.52, 0.52].forEach(x => add(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 6), post, x, -0.2, -i * 1.05 - 0.3));
    // 岸邊的鳥居和木牌
    const red = std(0xc0392b);
    [-0.62, 0.62].forEach(x => add(new THREE.CylinderGeometry(0.05, 0.06, 1.1, 8), red, x, 0.7, 0.5));
    add(bx(1.6, 0.09, 0.12), red, 0, 1.28, 0.5); add(bx(1.4, 0.07, 0.1), red, 0, 1.1, 0.5);
    add(bx(0.06, 0.6, 0.06), post, 0.95, 0.45, 0.3); add(bx(0.5, 0.3, 0.04), 0xfbf4e4, 0.95, 0.7, 0.32);
    // 小渡船：白船身、紅腰帶、藍色船艙頂
    const boat = new THREE.Group(); boat.userData.ferry = true;
    const hull = new THREE.Mesh(bx(0.9, 0.3, 1.9), std(0xfdfaf2)); hull.position.y = 0.05; boat.add(hull);
    const belt = new THREE.Mesh(bx(0.92, 0.07, 1.92), red); belt.position.y = 0.12; boat.add(belt);
    const cab = new THREE.Mesh(bx(0.6, 0.35, 0.7), std(0xf1e6d2)); cab.position.set(0, 0.38, -0.15); boat.add(cab);
    const glass = std(0xfff1c2, { emissive: 0xffc46b, emissiveIntensity: 0.15 });
    const win = new THREE.Mesh(bx(0.62, 0.12, 0.5), glass); win.position.set(0, 0.42, -0.15); boat.add(win);
    const top = new THREE.Mesh(bx(0.7, 0.06, 0.8), std(0x2f6fae)); top.position.set(0, 0.59, -0.15); boat.add(top);
    boat.position.set(1.05, -0.45, -3.4); pier.add(boat); ferryBoat = boat;
    pier.position.set(FERRY.x, 0, FERRY.z);
    pier.rotation.y = -FERRY.a - Math.PI / 2;   // -z 朝外海
    pier.userData.glass = glass;
    ferryLayer.add(pier);
    const lb = labelSprite(F.label || '⛴️ 智慧島渡船', F.sub != null ? F.sub : F.open ? '今日開航' : '今天的課上完了', { scale: 0.75, color: '#3a2a33' });
    lb.position.set(FERRY.x, 2.2, FERRY.z); lb.userData.ferry = true; ferryLayer.add(lb);
    // 遠方霧裡的智慧島：小山丘、松樹、四間小屋的屋頂
    const far = new THREE.Group(); far.userData.ferry = true;
    const fa = (geo, c, x, y, z) => { const o = new THREE.Mesh(geo, std(c)); o.position.set(x, y, z); far.add(o); return o; };
    fa(new THREE.CylinderGeometry(4.2, 5, 1.2, 18), 0xe6c98e, 0, -0.3, 0); fa(new THREE.CylinderGeometry(3.6, 4.1, 0.8, 18), 0x8cc56c, 0, 0.4, 0);
    fa(new THREE.ConeGeometry(2.4, 1.6, 10), 0x9fd27e, 0, 1.4, 0);
    [[-2, 1.3, 0xb38a4f], [1.9, 1.1, 0x4a4f5a], [-1.2, -2, 0xc0392b], [1.4, -1.8, 0xdfe6ee]].forEach(([x, z, c]) => { fa(bx(0.9, 0.6, 0.8), 0xf3ead6, x, 1.1, z); fa(new THREE.ConeGeometry(0.75, 0.5, 4), c, x, 1.65, z).rotation.y = Math.PI / 4; });
    [[0, 2.6], [-0.8, 2.1], [0.9, 2.3]].forEach(([x, y]) => fa(new THREE.ConeGeometry(0.45, 1.3, 6), 0x3f7a45, x, y, -0.3));
    far.position.set(Math.cos(FERRY.a) * 34, 0, Math.sin(FERRY.a) * 34); if (F.far !== false) ferryLayer.add(far);
    setEnvironment(envNow);
  }

  // ---------- 島の屋台（v2.30.3）----------
  // ctx.yatai = { name }：碼頭邊的小攤子（日本屋台＋台灣夜市攤）：木頭攤車、紅白條紋暖簾、兩盞紅燈籠（晚上亮）、兩張小板凳；點它呼叫 ctx.onYatai
  function buildYatai() {
    const Y = ctx.yatai || null, sig = JSON.stringify(Y);
    if (sig === yataiSig) return;
    yataiSig = sig;
    clearLayer(yataiLayer);
    if (!Y) return;
    const cart = new THREE.Group(); cart.userData.yatai = true;
    const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(bx(w, h, d), m.isMaterial ? m : std(m)); b.position.set(x, y, z); cart.add(b); return b; };
    const wood = std(0xa0703f), dark = std(0x6b4a2b);
    box(1.1, 0.5, 0.55, 0, 0.35, 0, wood);                  // 攤車
    box(1.2, 0.06, 0.7, 0, 0.63, 0.06, 0xd9b98a);           // 檯面
    [-0.5, 0.5].forEach(x => box(0.06, 0.75, 0.06, x, 1.0, -0.2, dark));   // 柱子
    const roof = box(1.35, 0.06, 0.85, 0, 1.4, 0.02, 0x8a3b2e); roof.rotation.x = -0.15;
    for (let i = 0; i < 6; i++) box(0.17, 0.2, 0.02, -0.43 + i * 0.172, 1.25, 0.38, i % 2 ? 0xfdfaf2 : 0xc0392b);   // 紅白暖簾
    const glow = std(0xff8a65, { emissive: 0xff5a36, emissiveIntensity: 0.35 });
    [-0.62, 0.62].forEach(x => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), glow); l.scale.y = 1.3; l.position.set(x, 1.15, 0.36); cart.add(l); });
    [[-0.32, 0.78], [0.32, 0.78]].forEach(([x, z]) => { box(0.22, 0.04, 0.22, x, 0.3, z, 0xc9a77c); box(0.05, 0.28, 0.05, x, 0.14, z, dark); });   // 小板凳
    [[0.25, 0.04, 0xfdfaf2], [-0.2, 0.05, 0xe8442e]].forEach(([x, r, c]) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.08, 10), std(c)); b.position.set(x, 0.7, 0.1); cart.add(b); });   // 檯面上的碗
    const p = new THREE.Vector3(Math.cos(YATAI.a) * YATAI.r, 0.05, Math.sin(YATAI.a) * YATAI.r);
    cart.position.copy(p); cart.lookAt(new THREE.Vector3(p.x * 2, 0.05, p.z * 2));   // 正面朝海、朝鏡頭 cart.scale.setScalar(1.1);
    cart.userData.glass = glow;
    yataiLayer.add(cart);
    const lb = labelSprite('🏮 ' + (Y.name || '島の屋台'), Y.sub || null, { scale: 0.75, color: '#3a2a33' });
    lb.position.set(p.x, 2.35, p.z); lb.userData.yatai = true; yataiLayer.add(lb);
    setEnvironment(envNow);
  }

  // ---------- 音樂廳----------
  // ctx.hall = { name, sub, lit }：東京文化會館風的清水模現代音樂廳：邊緣往上翹的大屋頂、整片玻璃、四根柱子、門前小廣場；
  // lit＝這週有藝文紀錄（晚上大玻璃亮）。點它呼叫 ctx.onHall。三角形數少：只有方塊和 4 根圓柱，同材質合併後只有 4 個網格
  function buildHall() {
    const H = ctx.hall || null, sig = JSON.stringify(H);
    if (sig === hallSig) return;
    hallSig = sig;
    clearLayer(hallLayer);
    if (!H) return;
    const g = new THREE.Group(); g.userData.hall = true;
    const con = std(0xbfbab0), dk = std(0x4a4f5a);
    const glass = std(0xcfe3ea, { emissive: 0xffc46b, emissiveIntensity: 0.04 }), door = std(0xfff1c2, { emissive: 0xffb347, emissiveIntensity: 0 });
    const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(bx(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
    box(1.8, 0.7, 1.1, 0, 0.4, 0, glass);                       // 一樓整片玻璃
    for (let k = -4; k <= 4; k++) box(0.03, 0.7, 0.03, k * 0.2, 0.4, 0.56, dk);   // 玻璃的直框
    box(0.3, 0.42, 0.03, 0, 0.26, 0.57, door);                  // 大門（晚上亮）
    box(1.1, 0.5, 0.7, 0.1, 1.0, -0.1, con);                    // 屋頂上的廳（大廳的量體）
    box(1.0, 0.12, 0.02, 0.1, 1.1, 0.26, glass);                 // 大廳正面的一條高窗（從上面看得到，晚上跟著亮）
    box(2.5, 0.1, 1.8, 0, 0.78, 0, con);                        // 大屋頂
    [0.9, -0.9].forEach(z => { const e = box(2.5, 0.22, 0.12, 0, 0.86, z, con); e.rotation.x = z > 0 ? -0.5 : 0.5; });   // 往上翹的屋簷
    [1.25, -1.25].forEach(x => { const e = box(0.12, 0.22, 1.8, x, 0.86, 0, con); e.rotation.z = x > 0 ? 0.5 : -0.5; });
    [-1.0, -0.35, 0.35, 1.0].forEach(x => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.75, 8), con); c.position.set(x, 0.38, 0.75); g.add(c); });
    box(2.2, 0.04, 0.6, 0, 0.02, 1.05, con);         // 門前的小廣場
    // 同材質的方塊合併成一個網格，一種材質只畫一次（工程顧問 10/27：draw call 增加不超過 6 個）
    const byMat = new Map();
    g.children.slice().forEach(m => { m.updateMatrix(); const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
      if (!byMat.has(m.material)) byMat.set(m.material, []); byMat.get(m.material).push(geo); g.remove(m); });
    byMat.forEach((list, mat) => {
      const n = list.reduce((a, x) => a + x.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
      list.forEach(x => { pos.set(x.attributes.position.array, o * 3); nor.set(x.attributes.normal.array, o * 3); o += x.attributes.position.count; x.dispose(); });
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.add(new THREE.Mesh(geo, mat));
    });
    const p = new THREE.Vector3(Math.cos(HALL.a) * HALL.r, 0.05, Math.sin(HALL.a) * HALL.r);
    g.position.copy(p); g.lookAt(new THREE.Vector3(p.x * 2, 0.05, p.z * 2));   // 正面朝海
    g.scale.setScalar(0.8);
    g.userData.glass = glass; g.userData.door = door; g.userData.lit = !!H.lit;
    hallLayer.add(g);
    const lb = labelSprite('🎼 ' + (H.name || '音樂廳'), H.sub || null, { scale: 0.75, color: '#3a2a33' });
    lb.position.set(p.x, 2.0, p.z); lb.userData.hall = true; hallLayer.add(lb);
    setEnvironment(envNow);
  }

  // ---------- 衛星小島（v2.26）----------
  // ctx.islets = [{ key, slot, style, name, ic, keeper }]：本島外的海上排好六個位置（避開燈塔岬 -0.62π、渡船 0.9π 和遠方的智慧島），
  // 每座小島用紅色太鼓橋接回本島；點小島或橋就呼叫 ctx.onIslet(key)
  const ISLET_A = [0.3, 0.06, -0.18, -0.4, 0.62, 1.15].map(k => k * Math.PI), ISLET_R = 21.5;
  let isletLayer, isletSig = null;
  function isletMesh(style) {
    const g = new THREE.Group();
    const add = (geo, c, x, y, z) => { const o = new THREE.Mesh(geo, c.isMaterial ? c : std(c)); o.position.set(x, y, z); g.add(o); return o; };
    add(new THREE.CylinderGeometry(3.3, 3.8, 0.9, 28), 0xe6c98e, 0, -0.4, 0);   // 沙灘
    const red = std(0xc0392b), wood = std(0x9a6b4a);
    const pine = (x, z, s) => { add(new THREE.CylinderGeometry(0.06 * s, 0.1 * s, 0.9 * s, 6), wood, x, 0.45 * s + 0.1, z);
      [0.75, 1.05, 1.3].forEach((y, i) => add(new THREE.CylinderGeometry(0.15 * s, (0.62 - i * 0.16) * s, 0.22 * s, 8), 0x3f7a45, x + (i - 1) * 0.08 * s, y * s + 0.1, z)); };
    const lantern = (x, z) => { add(bx(0.22, 0.5, 0.22), 0xb9b4a8, x, 0.35, z); add(new THREE.ConeGeometry(0.24, 0.18, 4), 0x9c978c, x, 0.68, z).rotation.y = Math.PI / 4; };
    if (style === 'sand') {
      add(new THREE.CylinderGeometry(2.9, 3.3, 0.12, 28), 0xf3e2b8, 0, 0.1, 0);
      add(new THREE.CylinderGeometry(1.4, 1.6, 0.14, 18), 0x9fd27e, -0.6, 0.18, -0.5);
      [[-1.1, -0.8], [-0.2, -1.1]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(0.06, 0.08, 1.3, 6), wood, x, 0.8, z);
        for (let k = 0; k < 5; k++) { const l = add(bx(0.7, 0.04, 0.18), 0x5fae5a, x + Math.cos(k * 1.26) * 0.3, 1.45, z + Math.sin(k * 1.26) * 0.3); l.rotation.y = -k * 1.26; l.rotation.z = 0.35; } });
      add(bx(0.5, 0.4, 0.45), 0xf3ead6, 0.9, 0.35, -0.4); add(new THREE.ConeGeometry(0.45, 0.32, 4), red, 0.9, 0.72, -0.4).rotation.y = Math.PI / 4;   // 小祠
      [[1.6, 1.2, 0xf6c7c0], [0.4, 1.9, 0xfdf6ec], [-1.5, 1.4, 0xf3c98a]].forEach(([x, z, c]) => add(new THREE.SphereGeometry(0.12, 8, 6), c, x, 0.18, z));
    } else if (style === 'pine') {
      const rock = std(0x9a9a92);
      [[0, 0, 1.9, 1.3], [-1.2, 0.6, 1.1, 0.8], [1.1, -0.7, 1.2, 0.9]].forEach(([x, z, r, h]) => { const m = add(new THREE.DodecahedronGeometry(r, 0), rock, x, h * 0.35, z); m.scale.y = h / r; });
      add(new THREE.CylinderGeometry(1.2, 1.5, 0.2, 12), 0x86b86a, 0, 1.05, 0);
      pine(0.2, 0.1, 1.2); pine(-1.1, 0.7, 0.8); pine(1.2, -0.6, 0.9);
      lantern(1.8, 1.2);
    } else if (style === 'port') {
      add(new THREE.CylinderGeometry(2.6, 2.9, 0.3, 24), 0x8cc56c, -0.3, 0.05, -0.3);
      add(bx(1.0, 0.6, 0.8), 0xf3ead6, -0.6, 0.5, -0.6); add(new THREE.ConeGeometry(0.85, 0.45, 4), red, -0.6, 1.02, -0.6).rotation.y = Math.PI / 4;   // 漁寮
      for (let i = 0; i < 6; i++) add(bx(0.5, 0.06, 0.45), 0xb08356, 1.6 + i * 0.4, 0.12, 1.1);   // 小碼頭
      const boat = new THREE.Group(); boat.position.set(2.6, -0.45, 1.75); g.add(boat);
      [[bx(0.5, 0.25, 1.3), 0x2f6fae, 0.05], [bx(0.52, 0.06, 1.32), 0xfdfaf2, 0.18]].forEach(([geo, c, y]) => { const o = new THREE.Mesh(geo, std(c)); o.position.y = y; boat.add(o); });
      boat.rotation.y = Math.PI / 2; g.userData.boat = boat;
      [[0.6, 0.4], [1.3, -0.2]].forEach(([x, z]) => add(new THREE.CylinderGeometry(0.03, 0.04, 1.0, 5), wood, x, 0.6, z));
      [0.75, 0.95, 1.15].forEach((t, i) => add(new THREE.SphereGeometry(0.08, 8, 6), std(0xfff1d6, { emissive: 0xffb347, emissiveIntensity: 0.6 }), 0.6 + i * 0.35, 1.0 - i * 0.04, 0.4 - i * 0.3));
    } else {   // tea：茶園梯田＋涼亭
      [[2.7, 0.3, 0.1], [2.1, 0.3, 0.4], [1.5, 0.3, 0.7]].forEach(([r, h, y]) => {
        add(new THREE.CylinderGeometry(r, r + 0.1, h, 24), 0x8cc56c, 0, y, 0);
        add(new THREE.TorusGeometry(r - 0.2, 0.12, 6, 28), 0x4f8f4a, 0, y + h / 2 + 0.04, 0).rotation.x = Math.PI / 2;
      });
      [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]].forEach(([x, z]) => add(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 5), red, x, 1.2, z));
      add(new THREE.ConeGeometry(0.85, 0.4, 4), 0x4a4f5a, 0, 1.75, 0).rotation.y = Math.PI / 4;
    }
    return g;
  }
  // 紅色太鼓橋：從本島的沙灘拱到小島
  function drumBridge(a) {
    const g = new THREE.Group(), red = std(0xc0392b), plank = std(0xb08356), r0 = 14.4, r1 = ISLET_R - 3.4, N = 14, H = 1.15;
    const P = t => new THREE.Vector3(0, 0.15 + Math.sin(t * Math.PI) * H, 0).add(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(r0 + (r1 - r0) * t));
    for (let i = 0; i < N; i++) {
      const p0 = P(i / N), p1 = P((i + 1) / N), mid = p0.clone().add(p1).multiplyScalar(0.5), len = p0.distanceTo(p1);
      const b = new THREE.Mesh(bx(0.9, 0.08, len + 0.02), plank); b.position.copy(mid);
      b.lookAt(p1); g.add(b);
      [-0.45, 0.45].forEach(s => {
        const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(s);
        const rail = new THREE.Mesh(bx(0.06, 0.06, len + 0.02), red); rail.position.copy(mid).add(side); rail.position.y += 0.42; rail.lookAt(p1.clone().add(side).setY(p1.y + 0.42)); g.add(rail);
        if (i % 2 === 0) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6), red); post.position.copy(p0).add(side); post.position.y += 0.2; g.add(post); }
      });
    }
    [0, 1].forEach(t => { const p = P(t); [-0.45, 0.45].forEach(s => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 6), red); leg.position.copy(p).add(new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(s)); leg.position.y = -0.3; g.add(leg); }); });
    return g;
  }
  function buildIslets() {
    const L = ctx.islets || [], sig = JSON.stringify(L);
    if (sig === isletSig) return;
    isletSig = sig;
    clearLayer(isletLayer);
    L.forEach(it => {
      const a = ISLET_A[it.slot]; if (a == null) return;
      const g = isletMesh(it.style); g.userData.islet = it.key;
      g.position.set(Math.cos(a) * ISLET_R, 0, Math.sin(a) * ISLET_R); g.rotation.y = -a + Math.PI / 2;
      isletLayer.add(g);
      const br = drumBridge(a); br.userData.islet = it.key; isletLayer.add(br);
      const lb = labelSprite(it.ic + ' ' + it.name, it.keeper || '還沒有管理員', { scale: 0.75, color: '#3a2a33' });
      lb.position.set(Math.cos(a) * ISLET_R, 3.0, Math.sin(a) * ISLET_R); lb.userData.islet = it.key; isletLayer.add(lb);
    });
    if (controls) controls.maxDistance = L.length ? 66 : 50;
    shadowDirty = true;
  }

  // ---------- 讀完書長出的地標（v2.19） ----------
  // ctx.marks = [{ id, model, s, at }]：id 是書（書單 id 或智慧島的 key），model 是 3D 樣子（AI 補的書借用既有的樣子），s 是哪一區（國英數自社），at 是讀完的日期
  // 每區最多 18 個位置，在街區外圈靠海的草地上（避開植樹的空地格和燈塔岬角）；照讀完的先後排，超過 18 個的只列在街道資訊裡
  const MARK_SLOTS = [[11.5, 0.1], [11.5, -0.1], [11.5, 0.22], [11.5, -0.22], [11.5, 0.34], [11.5, -0.34], [12.35, 0.16], [12.35, -0.16], [12.35, 0.28], [12.35, -0.28],
    [13.0, 0.1], [13.0, -0.1], [13.0, 0.22], [13.0, -0.22], [13.0, 0.34], [13.0, -0.34], [13.0, 0.44], [13.0, -0.44]];
  let markLayer, markSig = null, spinners = [];
  function markMesh(id) {
    const g = new THREE.Group();
    const add = (geo, c, x, y, z, extra) => { const m = new THREE.Mesh(geo, c && c.isMaterial ? c : std(c, extra)); m.position.set(x, y, z); g.add(m); return m; };
    const box = (w, h, d, c, x, y, z, extra) => add(bx(w, h, d), c, x, y, z, extra);
    const cyl = (rt, rb, h, c, x, y, z, seg, extra) => add(new THREE.CylinderGeometry(rt, rb, h, seg || 8), c, x, y, z, extra);
    const cone = (r, h, c, x, y, z, seg) => add(new THREE.ConeGeometry(r, h, seg || 6), c, x, y, z);
    const ball = (r, c, x, y, z, extra) => add(new THREE.IcosahedronGeometry(r, 1), c, x, y, z, extra);
    const tree = (x, z, h, c) => { cyl(0.04, 0.06, h * 0.4, 0x8a5f42, x, h * 0.2, z, 5); cone(0.18 + h * 0.1, h * 0.8, c || 0x4f8a4a, x, h * 0.75, z); };
    const glow = c => std(c, { emissive: c, emissiveIntensity: 0.7 });
    const R = 0xc0392b, WOOD = 0x9a6b4a, DARK = 0x5b3a1e, WHITE = 0xfdfaf2, STONE = 0xa9a39a;
    switch (id) {
      // 自然區
      case 'ginga': {   // 銀河鐵道之夜：觀星丘，天上有一列小火車沿著星星的軌道跑
        cyl(0.45, 0.8, 0.35, 0x7fb062, 0, 0.17, 0, 10);
        cyl(0.025, 0.025, 0.4, DARK, 0.1, 0.5, 0, 5); const t = cyl(0.05, 0.07, 0.4, 0x2e3a59, 0.1, 0.78, 0, 8); t.rotation.z = -0.9;
        const train = new THREE.Group();
        [[0xe8442e, 0.22], [0x2f6fae, 0], [0xf1c40f, -0.22]].forEach(([c, x]) => { const b = new THREE.Mesh(bx(0.2, 0.12, 0.12), glow(c)); b.position.x = x; train.add(b); });
        train.position.set(0, 1.55, 0); train.rotation.z = 0.25; g.add(train);
        for (let i = 0; i < 9; i++) { const a = -1.1 + i * 0.28; ball(0.035, 0xfff3b0, Math.sin(a) * 0.95, 1.05 + Math.cos(a) * 0.55, -0.1, { emissive: 0xffe08a, emissiveIntensity: 0.9 }); }
        break;
      }
      case 'kaze': {    // 風又三郎：山坡上的風車和芒草，葉片會轉
        cyl(0.1, 0.18, 1.3, WHITE, 0, 0.65, 0, 6); cone(0.17, 0.25, 0x8a5a3c, 0, 1.42, 0, 6);
        const hub = new THREE.Group(); hub.position.set(0, 1.25, 0.16);
        for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(bx(0.1, 0.62, 0.02), std(0xf6efe0)); b.position.y = 0.3; const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; arm.add(b); hub.add(arm); }
        g.add(hub); spinners.push({ m: hub, axis: 'z', v: 1.4 });
        for (let i = 0; i < 7; i++) { const a = i * 0.9; const s = cone(0.05, 0.45, 0xd9c79a, Math.cos(a) * 0.45, 0.22, Math.sin(a) * 0.38 + 0.15, 4); s.rotation.z = 0.25 * Math.sin(i); }
        break;
      }
      case 'chumon': {  // 要求很多的餐廳：森林裡的「山貓軒」
        box(0.6, 0.4, 0.45, 0xf1e6d2, 0, 0.2, 0); const r = cone(0.48, 0.32, 0x7a2e2a, 0, 0.56, 0, 4); r.rotation.y = Math.PI / 4;
        box(0.14, 0.24, 0.02, DARK, 0, 0.12, 0.23); box(0.26, 0.08, 0.02, 0xfff6d6, 0, 0.32, 0.235);
        tree(-0.48, -0.2, 0.9, 0x3f7a45); tree(0.5, -0.25, 1.1, 0x356b3c); tree(0.42, 0.3, 0.7, 0x4f8a4a);
        break;
      }
      case 'natsu': {   // 夏之庭：老爺爺的院子，開滿波斯菊
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; box(0.04, 0.16, 0.04, WOOD, Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55); }
        for (let i = 0; i < 16; i++) { const a = i * 2.4, r = 0.12 + (i % 4) * 0.1; cyl(0.008, 0.008, 0.22, 0x5f9a4a, Math.cos(a) * r, 0.11, Math.sin(a) * r, 4); ball(0.045, [0xf4a6c4, WHITE, 0xe86a9a, 0xf9d3e0][i % 4], Math.cos(a) * r, 0.24, Math.sin(a) * r); }
        box(0.3, 0.26, 0.24, 0xd9c3a0, 0.62, 0.13, -0.42); box(0.34, 0.03, 0.28, 0x6b4a2b, 0.62, 0.28, -0.42);
        break;
      }
      case 'einstein': {   // 愛因斯坦的科學筆記：白色圓頂的小天文台
        cyl(0.36, 0.38, 0.5, WHITE, 0, 0.25, 0, 12);
        const dome = add(new THREE.SphereGeometry(0.37, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xdfe6ee, 0, 0.5, 0);
        box(0.1, 0.36, 0.02, 0x2e3a59, 0, 0.66, 0.3).rotation.x = -0.6;
        const t = cyl(0.04, 0.05, 0.34, 0x2e3a59, 0, 0.8, 0.22, 8); t.rotation.x = 0.9; box(0.12, 0.2, 0.02, DARK, 0, 0.1, 0.38);
        break;
      }
      case 'einstein2': {  // 下冊：氣象站（百葉箱和會轉的風杯）
        [-0.12, 0.12].forEach(x => [-0.1, 0.1].forEach(z => box(0.03, 0.45, 0.03, WHITE, x, 0.22, z)));
        box(0.34, 0.3, 0.3, WHITE, 0, 0.58, 0); for (let i = 0; i < 4; i++) box(0.35, 0.015, 0.31, 0xe2e2dc, 0, 0.47 + i * 0.07, 0);
        cyl(0.015, 0.015, 0.9, 0x8a8a8a, 0.42, 0.45, 0, 5);
        const cups = new THREE.Group(); cups.position.set(0.42, 0.92, 0);
        for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3, arm = new THREE.Mesh(bx(0.2, 0.01, 0.01), std(0x8a8a8a)); arm.position.set(Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1); arm.rotation.y = -a; cups.add(arm);
          const c = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), std(R)); c.position.set(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2); cups.add(c); }
        g.add(cups); spinners.push({ m: cups, axis: 'y', v: 3 });
        break;
      }
      case 'xiaomiao': {   // 湯屋的放鬆筆記：冒著熱氣的露天溫泉
        add(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 16), std(0x8fd3e0, { emissive: 0x5fb3c8, emissiveIntensity: 0.25 }), 0, 0.06, 0);
        for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7; ball(0.1 + (i % 3) * 0.02, STONE, Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55); }
        for (let i = 0; i < 4; i++) ball(0.09 + i * 0.02, WHITE, -0.1 + i * 0.07, 0.3 + i * 0.18, 0.05 * (i % 2), { transparent: true, opacity: 0.45 });
        box(0.5, 0.04, 0.04, 0x2f5f8a, 0.15, 0.62, -0.55); box(0.03, 0.62, 0.03, WOOD, -0.1, 0.31, -0.55); box(0.03, 0.62, 0.03, WOOD, 0.4, 0.31, -0.55);
        box(0.18, 0.2, 0.01, 0x2f5f8a, 0.15, 0.5, -0.55);
        break;
      }
      case 'xiaomiao2': {  // 下冊：竹筒添水（ししおどし）和小石盆
        box(0.9, 0.5, 0.04, 0xc9b27a, 0, 0.25, -0.3); for (let i = 0; i < 9; i++) box(0.02, 0.5, 0.05, 0xa8904f, -0.4 + i * 0.1, 0.25, -0.29);
        cyl(0.2, 0.24, 0.16, STONE, 0.2, 0.08, 0.1, 10); add(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 10), 0x8fd3e0, 0.2, 0.16, 0.1);
        box(0.03, 0.26, 0.03, 0x7fa86a, -0.15, 0.13, 0.1); box(0.03, 0.26, 0.03, 0x7fa86a, -0.15, 0.13, 0.2);
        const bam = cyl(0.035, 0.035, 0.5, 0x8fbf6a, -0.08, 0.3, 0.15, 6); bam.rotation.z = 1.2;
        ball(0.06, 0x6b8f5a, 0.45, 0.06, 0.3); ball(0.08, 0x7a7a72, -0.45, 0.07, 0.25);
        break;
      }
      // 國文區
      case 'rashomon': {   // 羅生門：朱紅的古城門
        [-0.35, 0.35].forEach(x => cyl(0.06, 0.06, 0.9, R, x, 0.45, 0, 8));
        box(0.95, 0.08, 0.2, R, 0, 0.82, 0); box(1.15, 0.1, 0.45, 0x4a4a4a, 0, 0.95, 0);
        box(0.6, 0.2, 0.3, R, 0, 1.1, 0); box(0.85, 0.08, 0.42, 0x4a4a4a, 0, 1.24, 0);
        cyl(0.02, 0.02, 0.4, 0xb9a07a, 0.55, 0.2, 0.25, 4);   // 蜘蛛之絲：門邊垂下來的一條細絲
        break;
      }
      case 'izu': {    // 伊豆的舞孃：山路的茶屋，紅毯長凳和紅傘
        box(0.55, 0.4, 0.4, 0xe9dcc4, -0.15, 0.2, -0.15); const r = cone(0.45, 0.25, 0x5a6b4a, -0.15, 0.52, -0.15, 4); r.rotation.y = Math.PI / 4;
        box(0.5, 0.06, 0.18, R, 0.2, 0.18, 0.32); [-0.02, 0.42].forEach(x => box(0.04, 0.15, 0.14, WOOD, x, 0.08, 0.32));
        cyl(0.012, 0.012, 0.7, WOOD, 0.45, 0.35, 0.15, 4); cone(0.32, 0.14, R, 0.45, 0.72, 0.15, 12);
        tree(-0.6, 0.3, 0.8, 0x3f7a45);
        break;
      }
      case 'botchan': {   // 少爺：木造的老校舍和小鐘樓
        box(1.0, 0.38, 0.36, 0xd9b98a, 0, 0.19, 0); for (let i = 0; i < 5; i++) box(0.12, 0.12, 0.02, 0x6b7f8f, -0.4 + i * 0.2, 0.22, 0.185);
        const r = box(1.08, 0.04, 0.44, 0x4a5d73, 0, 0.42, 0);
        box(0.18, 0.25, 0.18, 0xd9b98a, 0, 0.56, 0); cone(0.16, 0.18, 0x4a5d73, 0, 0.77, 0, 4).rotation.y = Math.PI / 4; ball(0.04, 0xe3a21a, 0, 0.6, 0.1);
        break;
      }
      case 'taiyo': {    // 小太陽：曬滿陽光的小院，竹椅、晾衣繩和向日葵
        box(0.24, 0.04, 0.24, 0xc9b27a, -0.2, 0.2, 0.1); box(0.24, 0.24, 0.03, 0xc9b27a, -0.2, 0.32, -0.02); [-0.3, -0.1].forEach(x => [0, 0.2].forEach(z => box(0.02, 0.2, 0.02, 0xa8904f, x, 0.1, z)));
        [-0.5, 0.5].forEach(x => cyl(0.015, 0.015, 0.6, WOOD, x, 0.3, -0.35, 4)); box(1.0, 0.01, 0.01, 0xeeeeee, 0, 0.58, -0.35);
        [0xe8b84a, 0x8dbde6, WHITE, 0xf4a6c4].forEach((c, i) => box(0.14, 0.18, 0.01, c, -0.3 + i * 0.2, 0.48, -0.35));
        [[0.35, 0.2], [0.5, 0.05]].forEach(([x, z]) => { cyl(0.012, 0.012, 0.5, 0x5f9a4a, x, 0.25, z, 4); cyl(0.09, 0.09, 0.03, 0xf1c40f, x, 0.52, z + 0.02, 10).rotation.x = 1.2; });
        break;
      }
      case 'magician': {   // 天橋上的魔術師：中華商場前的小天橋（橋上有一頂魔術帽）
        [-0.45, 0.45].forEach(x => { box(0.2, 0.7, 0.3, 0xb5b0a5, x, 0.35, 0); });
        box(1.1, 0.06, 0.3, 0x9a958a, 0, 0.72, 0); [-0.14, 0.14].forEach(z => box(1.1, 0.12, 0.02, 0x2f7f6a, 0, 0.82, z));
        cyl(0.07, 0.07, 0.12, 0x222222, 0.1, 0.81, 0, 10); cyl(0.11, 0.11, 0.015, 0x222222, 0.1, 0.755, 0, 10); box(0.14, 0.02, 0.02, R, 0.1, 0.78, 0.06);
        break;
      }
      case 'colorful': {   // 多彩的黑：畫架上的畫，用很多顏色畫成
        [[-0.15, -0.1], [0.15, -0.1], [0, 0.15]].forEach(([x, z]) => { const l = box(0.03, 0.9, 0.03, WOOD, x, 0.42, z); l.rotation.x = z > 0 ? -0.2 : 0.1; });
        box(0.5, 0.4, 0.03, WHITE, 0, 0.62, -0.12);
        [0x2a2a2a, 0x8dbde6, 0xe98fb3, 0xf1c40f, 0x6b9a52].forEach((c, i) => box(0.08, 0.3, 0.01, c, -0.18 + i * 0.09, 0.62, -0.1));
        cyl(0.14, 0.14, 0.02, 0xd9b98a, 0.4, 0.05, 0.25, 10);
        break;
      }
      case 'doukyusei': {  // 同級生：櫻花樹下的長椅和一把吉他
        cyl(0.06, 0.09, 0.6, 0x7a5236, -0.3, 0.3, -0.2, 6); ball(0.32, 0xf6c6d6, -0.3, 0.75, -0.2); ball(0.22, 0xf9d8e3, -0.1, 0.7, -0.05); ball(0.2, 0xf3b6ca, -0.5, 0.68, -0.05);
        box(0.6, 0.04, 0.18, WOOD, 0.2, 0.18, 0.15); box(0.6, 0.16, 0.03, WOOD, 0.2, 0.3, 0.07); [-0.05, 0.45].forEach(x => box(0.03, 0.16, 0.16, 0x4a4a4a, x, 0.08, 0.15));
        const gb = ball(0.08, 0xc98a4a, 0.36, 0.3, 0.2); gb.scale.set(1, 1.3, 0.4); const nk = box(0.03, 0.25, 0.02, DARK, 0.36, 0.5, 0.2); nk.rotation.z = 0.1;
        break;
      }
      case 'totto': {    // 窗邊的小荳荳：巴學園的電車教室
        box(0.9, 0.36, 0.32, 0xf3ead2, 0, 0.3, 0); box(0.9, 0.1, 0.33, 0x3f7a55, 0, 0.17, 0);
        for (let i = 0; i < 5; i++) box(0.12, 0.12, 0.33, 0x8fbcd8, -0.32 + i * 0.16, 0.36, 0);
        add(new THREE.CylinderGeometry(0.17, 0.17, 0.9, 10, 1, false, 0, Math.PI), 0x6b7f8f, 0, 0.48, 0).rotation.z = Math.PI / 2;
        [-0.12, 0.12].forEach(z => box(1.1, 0.03, 0.03, 0x7a7a7a, 0, 0.03, z));
        tree(0.65, -0.3, 0.8, 0x6fb36a);
        break;
      }
      // 英文區
      case 'prince': {   // 小王子：小小的星球，玻璃罩裡一朵玫瑰，還有兩座小火山
        cyl(0.03, 0.05, 0.45, WOOD, 0, 0.22, 0, 6); ball(0.42, 0xf0d58a, 0, 0.82, 0);
        cyl(0.01, 0.01, 0.16, 0x3f7a45, 0, 1.3, 0, 4); ball(0.05, R, 0, 1.39, 0);
        add(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(0xffffff, { transparent: true, opacity: 0.3 }), 0, 1.24, 0).scale.y = 1.6;
        const v1 = cone(0.08, 0.12, 0x8a5a3c, 0.3, 1.1, 0.15, 6); v1.lookAt(0.6, 1.4, 0.3); const v2 = cone(0.07, 0.1, 0x8a5a3c, -0.3, 1.08, 0.18, 6); v2.lookAt(-0.6, 1.36, 0.36);
        break;
      }
      case 'wonder': {   // 奇蹟男孩：發射台上的小火箭（奧吉最喜歡太空）
        box(0.6, 0.06, 0.6, 0x9a958a, 0, 0.03, 0);
        cyl(0.13, 0.13, 0.7, WHITE, 0, 0.45, 0, 10); cone(0.13, 0.28, R, 0, 0.94, 0, 10); ball(0.05, 0x8dbde6, 0, 0.6, 0.12);
        for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3, f = box(0.02, 0.2, 0.14, R, Math.cos(a) * 0.15, 0.2, Math.sin(a) * 0.15); f.rotation.y = -a; }
        box(0.04, 0.9, 0.04, 0x7a7a7a, -0.3, 0.45, 0);
        break;
      }
      case 'henshaw': {   // 親愛的漢修先生：一綠一紅的郵筒，信寄出去也會有人回
        [[-0.16, 0x2f8a4a], [0.16, R]].forEach(([x, c]) => { box(0.24, 0.5, 0.2, c, x, 0.25, 0); cyl(0.12, 0.12, 0.2, c, x, 0.5, 0, 12).rotation.x = Math.PI / 2; box(0.14, 0.02, 0.01, 0x222222, x, 0.38, 0.105); });
        box(0.16, 0.1, 0.01, WHITE, 0.4, 0.12, 0.15).rotation.y = -0.4;
        break;
      }
      case 'kiki': {    // 魔女宅急便：海邊小鎮的鐘樓
        box(0.36, 1.1, 0.36, 0xf1e6d2, 0, 0.55, 0); box(0.4, 0.06, 0.4, 0xb98a55, 0, 1.12, 0);
        cyl(0.11, 0.11, 0.02, WHITE, 0, 0.88, 0.19, 12).rotation.x = Math.PI / 2; box(0.01, 0.08, 0.01, 0x222222, 0, 0.9, 0.2);
        cone(0.3, 0.45, 0x3f8a7a, 0, 1.38, 0, 4).rotation.y = Math.PI / 4;
        const broom = cyl(0.012, 0.012, 0.4, WOOD, 0.35, 1.3, 0.2, 4); broom.rotation.z = 1.3; cone(0.05, 0.12, 0xd9c79a, 0.15, 1.25, 0.2, 6).rotation.z = 1.3;
        break;
      }
      case 'subway': {   // 地下鐵：地鐵站的入口，有亮燈的招牌
        box(0.7, 0.04, 0.5, 0x8a8a8a, 0, 0.02, 0); box(0.5, 0.04, 0.4, 0x4a4a4a, 0, 0.03, 0.02);
        [-0.3, 0.3].forEach(x => { box(0.04, 0.6, 0.04, 0x7a7a7a, x, 0.3, -0.2); box(0.03, 0.03, 0.45, 0x9a9a9a, x, 0.25, 0.02); });
        box(0.68, 0.18, 0.06, std(0x16a085, { emissive: 0x16a085, emissiveIntensity: 0.4 }), 0, 0.68, -0.2); box(0.68, 0.04, 0.3, 0x7a7a7a, 0, 0.6, -0.1);
        ball(0.06, 0xfff1c2, 0.42, 0.62, -0.2, { emissive: 0xffc46b, emissiveIntensity: 0.6 });
        break;
      }
      // 數學區
      case 'hakase': {   // 博士熱愛的算式：小小的棒球場
        const field = add(new THREE.CircleGeometry(0.75, 16, Math.PI * 0.25, Math.PI * 0.5), 0x7fb062, 0, 0.03, 0.35); field.rotation.x = -Math.PI / 2;
        const inf = box(0.42, 0.02, 0.42, 0xc9935a, 0, 0.04, -0.05); inf.rotation.y = Math.PI / 4;
        [[0, 0.25], [0.3, -0.05], [0, -0.35], [-0.3, -0.05]].forEach(([x, z]) => box(0.06, 0.03, 0.06, WHITE, x, 0.06, z));
        box(0.6, 0.35, 0.02, std(0x7a7a7a, { transparent: true, opacity: 0.6 }), 0, 0.18, 0.42);
        cyl(0.02, 0.02, 0.8, 0x7a7a7a, 0.55, 0.4, -0.45, 4); box(0.25, 0.12, 0.02, 0xf1c40f, 0.55, 0.78, -0.45);   // 阪神虎的黃色旗
        break;
      }
      case 'namiya': {   // 解憂雜貨店：拉下鐵捲門的老雜貨店，門口有收信的牛奶箱
        box(0.7, 0.5, 0.45, 0xb5a48a, 0, 0.25, 0); box(0.78, 0.06, 0.52, 0x5b4636, 0, 0.53, 0);
        for (let i = 0; i < 6; i++) box(0.5, 0.035, 0.02, 0x9a9a92, 0, 0.06 + i * 0.05, 0.23);
        box(0.5, 0.09, 0.02, 0xfff6d6, 0, 0.44, 0.235); box(0.1, 0.12, 0.08, 0xe9dcc4, 0.3, 0.28, 0.27);
        ball(0.05, 0xfff1c2, -0.36, 0.45, 0.26, { emissive: 0xffc46b, emissiveIntensity: 0.5 });
        break;
      }
      case 'yoru': {    // 夜間遠足：走了一整夜的路，路邊的里程路標和燈籠
        cyl(0.03, 0.03, 0.9, WOOD, 0, 0.45, 0, 5);
        [[0.25, 0.75, 0.2], [-0.2, 0.6, -0.3], [0.2, 0.45, 0.5]].forEach(([x, y, r]) => { const s = box(0.5, 0.1, 0.02, 0xe9dcc4, x * 0.6, y, 0); s.rotation.z = r * 0.1; });
        for (let i = 0; i < 5; i++) box(0.16, 0.03, 0.12, STONE, -0.5 + i * 0.22, 0.02, 0.3 + (i % 2) * 0.08);
        cyl(0.07, 0.07, 0.14, std(0xfff1d6, { emissive: 0xffa94d, emissiveIntensity: 0.8 }), 0.35, 0.3, 0.2, 8); cyl(0.01, 0.01, 0.25, WOOD, 0.35, 0.12, 0.2, 4);
        break;
      }
      case 'kongming': {  // 孫子兵法：石頭排成的八陣圖，中間插一面令旗
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cyl(0.06, 0.08, 0.3 + (i % 2) * 0.1, STONE, Math.cos(a) * 0.5, 0.15, Math.sin(a) * 0.5, 6); }
        cyl(0.18, 0.2, 0.1, STONE, 0, 0.05, 0, 8); cyl(0.015, 0.015, 0.9, WOOD, 0, 0.5, 0, 4); box(0.28, 0.18, 0.01, R, 0.14, 0.85, 0);
        break;
      }
      case 'kinou': {    // 昨日的美食：兩個人的餐桌，今天也好好吃飯
        box(0.6, 0.04, 0.4, WOOD, 0, 0.3, 0); [[-0.26, -0.16], [0.26, -0.16], [-0.26, 0.16], [0.26, 0.16]].forEach(([x, z]) => box(0.03, 0.28, 0.03, WOOD, x, 0.14, z));
        [-0.42, 0.42].forEach(x => { box(0.18, 0.03, 0.18, 0xb98a55, x, 0.18, 0); box(0.03, 0.2, 0.18, 0xb98a55, x + (x > 0 ? 0.08 : -0.08), 0.28, 0); });
        [-0.13, 0.13].forEach(x => { cyl(0.07, 0.07, 0.01, WHITE, x, 0.33, 0, 10); ball(0.04, 0xf3ead2, x, 0.36, 0); });
        cyl(0.05, 0.04, 0.08, 0x8c2f2b, 0, 0.36, -0.1, 8);
        break;
      }
      // 社會區
      case 'tetsudo': {   // 11 元的鐵道旅行：鄉間的小車站和月台
        box(1.1, 0.12, 0.3, 0xc9c2b2, 0, 0.06, 0.15); box(0.45, 0.35, 0.3, 0xf1e6d2, -0.2, 0.3, -0.2); box(0.55, 0.05, 0.4, 0x2f5f8a, -0.2, 0.5, -0.2);
        box(0.3, 0.08, 0.02, WHITE, -0.2, 0.42, -0.04);
        [0.4, 0.55].forEach(z => box(1.3, 0.03, 0.03, 0x7a7a7a, 0, 0.02, z)); for (let i = 0; i < 6; i++) box(0.05, 0.02, 0.22, WOOD, -0.55 + i * 0.22, 0.01, 0.475);
        cyl(0.015, 0.015, 0.5, 0x7a7a7a, 0.4, 0.3, 0.05, 4); box(0.2, 0.12, 0.02, 0x2f7fd1, 0.4, 0.55, 0.05);
        break;
      }
      case 'koto': {    // 古都：朱紅的鳥居和北山杉
        [-0.25, 0.25].forEach(x => cyl(0.04, 0.045, 0.75, R, x, 0.37, 0.15, 8));
        box(0.75, 0.06, 0.08, R, 0, 0.76, 0.15); box(0.62, 0.04, 0.06, R, 0, 0.62, 0.15); box(0.8, 0.03, 0.1, 0x2a2a2a, 0, 0.8, 0.15);
        [-0.35, 0, 0.35].forEach((x, i) => { cyl(0.03, 0.04, 0.9, 0x8a5f42, x, 0.45, -0.3, 5); cone(0.14, 0.7, 0x2f5a3a, x, 1.1 + (i % 2) * 0.1, -0.3, 6); });
        break;
      }
      case 'saigon': {   // 西貢小子：小吃攤推車、紅燈籠和塑膠小板凳
        box(0.55, 0.3, 0.3, 0xb5c9a8, 0, 0.25, 0); [-0.2, 0.2].forEach(x => cyl(0.07, 0.07, 0.03, 0x333333, x, 0.07, 0.16, 10).rotation.x = Math.PI / 2);
        [-0.25, 0.25].forEach(x => box(0.02, 0.4, 0.02, 0x7a7a7a, x, 0.6, -0.12));
        for (let i = 0; i < 5; i++) box(0.12, 0.02, 0.4, i % 2 ? WHITE : 0xd35400, -0.24 + i * 0.12, 0.8, 0.02);
        [-0.18, 0.18].forEach(x => { ball(0.06, R, x, 0.68, 0.2, { emissive: R, emissiveIntensity: 0.4 }); });
        [[0.45, 0.25, 0xe74c3c], [0.5, -0.1, 0x2980b9]].forEach(([x, z, c]) => box(0.12, 0.12, 0.12, c, x, 0.06, z));
        break;
      }
      case 'saga': {    // 佐賀的超級阿嬤：河邊會轉的水車（阿嬤在這裡撿漂下來的菜）
        box(0.3, 0.04, 1.0, 0x6fb4d8, -0.2, 0.03, 0, { emissive: 0x3f84a8, emissiveIntensity: 0.2 });
        const wheel = new THREE.Group(); wheel.position.set(0.05, 0.38, 0);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 6, 16), std(WOOD)); rim.rotation.y = Math.PI / 2; wheel.add(rim);
        for (let i = 0; i < 8; i++) { const p = new THREE.Mesh(bx(0.1, 0.64, 0.03), std(0x7a5236)); p.rotation.x = i * Math.PI / 8; wheel.add(p); }
        g.add(wheel); spinners.push({ m: wheel, axis: 'x', v: 0.8 });
        box(0.3, 0.5, 0.4, 0x8a6a4a, 0.35, 0.25, 0); cone(0.32, 0.22, 0x4a4a3a, 0.35, 0.6, 0, 4).rotation.y = Math.PI / 4;
        ball(0.05, 0xe74c3c, -0.2, 0.08, 0.3); ball(0.05, 0x6b9a52, -0.22, 0.08, -0.2);
        break;
      }
      case 'seirei': {   // 精靈守護者：山谷上的吊橋
        [-0.5, 0.5].forEach(x => [-0.12, 0.12].forEach(z => cyl(0.03, 0.03, 0.6, WOOD, x, 0.3, z, 5)));
        for (let i = 0; i < 9; i++) { const x = -0.4 + i * 0.1, y = 0.42 - 0.12 * Math.sin((i + 0.5) / 9 * Math.PI); box(0.08, 0.02, 0.22, 0xa8804f, x, y, 0); }
        [-0.12, 0.12].forEach(z => { for (let i = 0; i < 10; i++) { const x = -0.45 + i * 0.1, y = 0.58 - 0.12 * Math.sin(i / 9 * Math.PI); box(0.1, 0.01, 0.01, 0xd9c79a, x, y, z); } });
        cone(0.3, 0.5, 0x8a8a7a, -0.65, 0.2, 0, 5); cone(0.3, 0.5, 0x8a8a7a, 0.65, 0.2, 0, 5);
        break;
      }
      case 'alu': {    // 巷口小報：街角的報亭
        box(0.5, 0.45, 0.4, 0x2f5d62, 0, 0.23, 0); box(0.6, 0.05, 0.5, 0xd9b86a, 0, 0.48, 0);
        box(0.4, 0.2, 0.02, 0xfff6d6, 0, 0.32, 0.21); for (let i = 0; i < 4; i++) box(0.08, 0.1, 0.01, [0xf3ead2, 0xe9dcc4, 0xfdfaf2, 0xe0d2b6][i], -0.15 + i * 0.1, 0.12, 0.215);
        box(0.18, 0.08, 0.02, R, 0, 0.56, 0);
        break;
      }
      case 'alu2': {    // 下冊：社區的公布欄和長椅
        [-0.3, 0.3].forEach(x => box(0.04, 0.7, 0.04, WOOD, x, 0.35, 0)); box(0.66, 0.4, 0.04, 0x8a5a2c, 0, 0.5, 0); box(0.72, 0.04, 0.12, 0x5b3a1e, 0, 0.73, 0);
        [[-0.18, 0.55, 0xfff6d6], [0.05, 0.6, 0xf9d3e0], [0.2, 0.45, 0xd7eaf5], [-0.08, 0.42, 0xfff1c2]].forEach(([x, y, c]) => box(0.14, 0.16, 0.01, c, x, y, 0.025));
        box(0.5, 0.04, 0.15, WOOD, 0, 0.16, 0.35); [-0.2, 0.2].forEach(x => box(0.03, 0.14, 0.13, 0x4a4a4a, x, 0.07, 0.35));
        break;
      }
      // ---- 第二批書單（v2.20）----
      // 國文街
      case 'chengnan': {   // 城南舊事：胡同口的駱駝隊
        box(0.9, 0.4, 0.08, 0x9a958a, 0, 0.2, -0.35); box(0.3, 0.42, 0.1, 0x7a2e2a, 0, 0.21, -0.34); box(0.96, 0.05, 0.14, 0x4a4a4a, 0, 0.42, -0.35);
        [[-0.25, 0.1], [0.3, 0.2]].forEach(([x, z]) => {
          const b = ball(0.16, 0xc9a26a, x, 0.4, z); b.scale.set(1.5, 0.8, 0.8);
          ball(0.07, 0xb58e58, x - 0.05, 0.53, z); ball(0.07, 0xb58e58, x + 0.08, 0.53, z);
          const nk = cyl(0.035, 0.045, 0.25, 0xc9a26a, x + 0.25, 0.52, z, 5); nk.rotation.z = -0.5; ball(0.06, 0xc9a26a, x + 0.33, 0.62, z);
          [-0.12, 0.12].forEach(dx => [-0.06, 0.06].forEach(dz => box(0.04, 0.3, 0.04, 0xb58e58, x + dx, 0.15, z + dz)));
        });
        ball(0.03, 0xe3a21a, 0.63, 0.5, 0.2);
        break;
      }
      case 'shediao': {    // 射鵰英雄傳：比武擂台，兩旁插著旗子
        box(0.9, 0.2, 0.7, 0x9a6b4a, 0, 0.1, 0); box(0.95, 0.03, 0.75, R, 0, 0.215, 0);
        [[-0.45, -0.35], [0.45, -0.35], [-0.45, 0.35], [0.45, 0.35]].forEach(([x, z], i) => { cyl(0.015, 0.015, 0.7, WOOD, x, 0.55, z, 4); box(0.2, 0.14, 0.01, i % 2 ? 0xf1c40f : R, x + 0.1, 0.82, z); });
        const bird = new THREE.Group(); [-1, 1].forEach(s => { const w = new THREE.Mesh(bx(0.3, 0.02, 0.08), std(0x3a3a3a)); w.position.x = s * 0.15; w.rotation.z = s * 0.25; bird.add(w); });
        bird.position.set(0, 1.25, 0); g.add(bird);
        break;
      }
      case 'xiyouji': {    // 西遊記：花果山的水簾洞
        cone(0.55, 1.1, 0x8a8a7a, -0.1, 0.55, -0.15, 6); cone(0.35, 0.7, 0x9a9a8a, 0.4, 0.35, -0.2, 5); ball(0.18, 0x6fb36a, -0.15, 0.95, -0.1);
        box(0.3, 0.6, 0.03, std(0x8fd3e0, { transparent: true, opacity: 0.7, emissive: 0x5fb3c8, emissiveIntensity: 0.2 }), 0.05, 0.3, 0.3);
        cyl(0.3, 0.3, 0.03, 0x6fb4d8, 0.05, 0.02, 0.5, 12); ball(0.07, 0xb5653a, 0.45, 0.08, 0.4); ball(0.05, 0xe8b88a, 0.45, 0.17, 0.43);
        ball(0.05, 0xf4a6c4, -0.4, 0.35, 0.2); ball(0.05, 0xf4a6c4, -0.3, 0.5, 0.15);   // 仙桃
        break;
      }
      case 'women': {      // 我們仨：三張書桌、三盞燈，一家人各讀各的書
        box(1.0, 0.04, 0.35, WOOD, 0, 0.3, 0); [[-0.45, -0.13], [0.45, -0.13], [-0.45, 0.13], [0.45, 0.13]].forEach(([x, z]) => box(0.03, 0.3, 0.03, WOOD, x, 0.15, z));
        [-0.32, 0, 0.32].forEach((x, i) => { cyl(0.01, 0.01, 0.2, 0x4a4a4a, x - 0.08, 0.42, -0.1, 4); cone(0.06, 0.06, 0x2f6f5a, x - 0.08, 0.53, -0.1, 8); ball(0.025, 0xfff1c2, x - 0.08, 0.5, -0.1, { emissive: 0xffc46b, emissiveIntensity: 0.8 });
          box(0.14, 0.02, 0.1, [0xfdfaf2, 0xe9dcc4, 0xfff6d6][i], x + 0.04, 0.33, 0.04); box(0.18, 0.18, 0.18, 0x9a6b4a, x, 0.09, 0.32); });
        break;
      }
      case 'lupine': {     // 魯冰花：茶園的茶樹行，和開在田埂的黃色魯冰花
        for (let r = 0; r < 3; r++) { const row = box(1.0, 0.18, 0.16, 0x4f8a4a, 0, 0.09, -0.35 + r * 0.3); row.scale.y = 1; for (let k = 0; k < 5; k++) ball(0.09, 0x5f9a4a, -0.4 + k * 0.2, 0.2, -0.35 + r * 0.3); }
        for (let i = 0; i < 6; i++) { const x = -0.45 + i * 0.18; cyl(0.01, 0.01, 0.25, 0x5f9a4a, x, 0.12, 0.5, 4); cone(0.04, 0.14, 0xf1c40f, x, 0.3, 0.5, 6); }
        box(0.16, 0.2, 0.01, WHITE, 0.55, 0.35, 0.1); [[0xe74c3c, -0.03], [0x2980b9, 0.03]].forEach(([c, x]) => box(0.03, 0.08, 0.01, c, 0.55 + x, 0.37, 0.11));   // 阿明的畫
        break;
      }
      case 'sakinu': {     // 山豬・飛鼠・撒可努：排灣族的石板屋，屋簷下的山豬
        box(0.8, 0.35, 0.5, 0x7a7a72, 0, 0.17, 0); for (let i = 0; i < 4; i++) box(0.82, 0.02, 0.52, 0x5a5a52, 0, 0.06 + i * 0.09, 0);
        const r = box(0.9, 0.05, 0.62, 0x5a5a52, 0, 0.42, 0); r.rotation.x = 0.12; box(0.16, 0.24, 0.02, DARK, -0.15, 0.12, 0.26);
        box(0.1, 0.4, 0.04, 0x9a6b4a, 0.25, 0.2, 0.28); ball(0.04, R, 0.25, 0.36, 0.31); ball(0.03, 0xf1c40f, 0.25, 0.28, 0.31);
        const boar = ball(0.12, 0x4a3a2a, 0.55, 0.12, 0.35); boar.scale.set(1.5, 0.9, 0.9); ball(0.06, 0x4a3a2a, 0.72, 0.13, 0.35);
        break;
      }
      // 英文街
      case 'anne': {       // 安妮日記：密室入口的旋轉書櫃，窗外的七葉樹
        box(0.5, 0.75, 0.15, 0x8a5a2c, 0, 0.37, 0); for (let i = 0; i < 3; i++) { box(0.46, 0.02, 0.13, DARK, 0, 0.15 + i * 0.22, 0.01); for (let k = 0; k < 5; k++) box(0.06, 0.14, 0.1, [0xc0392b, 0x2f6fae, 0xe8b84a, 0x27ae60, 0xe9dcc4][(k + i) % 5], -0.17 + k * 0.08, 0.23 + i * 0.22, 0.02); }
        box(0.3, 0.3, 0.02, 0x8fbcd8, 0.45, 0.6, -0.1); box(0.32, 0.02, 0.04, WHITE, 0.45, 0.6, -0.09);
        tree(-0.55, -0.2, 1.1, 0x5f9a4a);
        box(0.14, 0.04, 0.1, 0xe98fb3, 0.4, 0.04, 0.3);   // 紅白格子封面的日記本
        break;
      }
      case 'oldman': {     // 老人與海：海邊的小漁船，船邊是那條大魚的骨架
        const hull = box(0.7, 0.14, 0.26, 0xe9dcc4, -0.15, 0.08, 0); hull.scale.set(1, 1, 1); cone(0.13, 0.18, 0xe9dcc4, 0.29, 0.08, 0, 4).rotation.z = -Math.PI / 2;
        cyl(0.012, 0.012, 0.7, WOOD, -0.15, 0.45, 0, 4); box(0.02, 0.5, 0.3, 0xd9c79a, -0.15, 0.5, 0.15).rotation.x = 0.2;
        box(0.8, 0.02, 0.02, WHITE, -0.05, 0.05, 0.4); for (let i = 0; i < 8; i++) box(0.015, 0.12 - Math.abs(i - 3.5) * 0.012, 0.015, WHITE, -0.38 + i * 0.09, 0.08, 0.4);
        cone(0.06, 0.15, WHITE, 0.42, 0.05, 0.4, 4).rotation.z = -Math.PI / 2; box(0.06, 0.15, 0.02, WHITE, -0.48, 0.06, 0.4);
        break;
      }
      case 'charlotte': {  // 夏綠蒂的網：紅色穀倉，門口的蜘蛛網上織著字
        box(0.7, 0.5, 0.5, 0xa8402e, 0, 0.25, -0.1); const rf = cone(0.55, 0.3, 0x5a3a2a, 0, 0.65, -0.1, 4); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, 0.8);
        box(0.24, 0.32, 0.02, WHITE, 0, 0.16, 0.16); box(0.02, 0.32, 0.03, WHITE, 0, 0.16, 0.17);
        const web = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.006, 4, 12), std(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.4 })); web.position.set(0.32, 0.42, 0.16); g.add(web);
        const web2 = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.006, 4, 10), web.material); web2.position.copy(web.position); g.add(web2);
        ball(0.025, 0x3a2a2a, 0.32, 0.42, 0.17); const pig = ball(0.11, 0xf6b6c4, 0.4, 0.1, 0.4); pig.scale.set(1.4, 1, 1);
        break;
      }
      case 'hatchet': {    // 手斧男孩：湖邊的營火和小樹枝搭的棚子
        cyl(0.5, 0.5, 0.02, 0x6fb4d8, -0.25, 0.01, -0.3, 14);
        for (let i = 0; i < 5; i++) { const s = cyl(0.015, 0.015, 0.55, WOOD, 0.3 + (i - 2) * 0.08, 0.2, -0.1, 4); s.rotation.x = 0.6; }
        for (let i = 0; i < 4; i++) { const l = cyl(0.025, 0.025, 0.22, 0x7a5236, 0, 0.05, 0.3, 5); l.rotation.set(Math.PI / 2, 0, i * Math.PI / 4); l.position.set(0, 0.04, 0.3); }
        cone(0.08, 0.2, std(0xff8a3d, { emissive: 0xff6a1d, emissiveIntensity: 0.9 }), 0, 0.15, 0.3, 6);
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ball(0.04, STONE, Math.cos(a) * 0.14, 0.03, 0.3 + Math.sin(a) * 0.14); }
        box(0.03, 0.18, 0.03, WOOD, 0.35, 0.1, 0.35).rotation.z = 0.5; box(0.08, 0.05, 0.02, 0x9a9a9a, 0.4, 0.18, 0.35);
        break;
      }
      case 'giver': {      // 記憶傳承人：雪丘上的紅色雪橇（第一個回到喬納思腦中的顏色）
        const hill = ball(0.6, WHITE, 0, -0.15, 0); hill.scale.set(1, 0.6, 0.9);
        const sled = new THREE.Group(); const top = new THREE.Mesh(bx(0.36, 0.03, 0.16), std(R)); top.position.y = 0.06; sled.add(top);
        [-0.06, 0.06].forEach(z => { const run = new THREE.Mesh(bx(0.42, 0.015, 0.015), std(0x4a4a4a)); run.position.z = z; sled.add(run); });
        sled.position.set(0.1, 0.24, 0.15); sled.rotation.z = -0.3; g.add(sled);
        tree(-0.45, -0.2, 0.7, 0x9aa8a0); tree(0.5, -0.3, 0.6, 0x9aa8a0);
        break;
      }
      case 'alchemist': {  // 牧羊少年奇幻之旅：沙漠裡的金字塔，旁邊有一隻羊
        cyl(0.7, 0.75, 0.05, 0xe6c98e, 0, 0.02, 0, 14);
        const py = cone(0.5, 0.65, 0xd9b86a, -0.1, 0.37, -0.15, 4); py.rotation.y = Math.PI / 4; const p2 = cone(0.25, 0.32, 0xd9b86a, 0.4, 0.2, -0.3, 4); p2.rotation.y = Math.PI / 4;
        const sheep = ball(0.1, WHITE, 0.35, 0.15, 0.35); sheep.scale.set(1.3, 1, 1); ball(0.05, 0x3a3a3a, 0.49, 0.17, 0.35);
        [[0.3, 0.3], [0.42, 0.3], [0.3, 0.4], [0.42, 0.4]].forEach(([x, z]) => box(0.02, 0.1, 0.02, 0x3a3a3a, x, 0.05, z));
        ball(0.05, 0xfff3b0, -0.5, 1.0, -0.2, { emissive: 0xffe08a, emissiveIntensity: 0.9 });   // 指路的星星
        break;
      }
      // 數學街
      case 'sugakugirl': { // 數學女孩：放學後的黑板，寫著算式
        [-0.4, 0.4].forEach(x => box(0.04, 0.8, 0.04, WOOD, x, 0.4, 0)); box(0.8, 0.45, 0.03, 0x2f4f3a, 0, 0.55, 0); box(0.84, 0.03, 0.06, WOOD, 0, 0.32, 0.02);
        [[-0.25, 0.65, 0.2], [0.05, 0.65, 0.25], [-0.2, 0.52, 0.3], [0.12, 0.45, 0.18]].forEach(([x, y, w]) => box(w, 0.015, 0.005, WHITE, x, y, 0.017));
        cyl(0.04, 0.04, 0.02, 0xe9dcc4, 0.5, 0.04, 0.3, 8); box(0.14, 0.03, 0.1, 0xc2416b, -0.4, 0.02, 0.3);
        break;
      }
      case 'curious': {    // 深夜小狗神秘習題：花園裡的狗屋，旁邊的紅色玩具火車
        box(0.4, 0.3, 0.4, 0x8fbcd8, 0, 0.15, -0.1); const rf = cone(0.34, 0.2, R, 0, 0.4, -0.1, 4); rf.rotation.y = Math.PI / 4;
        const hole = add(new THREE.CircleGeometry(0.08, 10), 0x2a2a2a, 0, 0.12, 0.105);
        const dog = ball(0.08, 0xe8dcc4, 0.3, 0.1, 0.25); dog.scale.set(1.4, 1, 1); ball(0.05, 0xe8dcc4, 0.42, 0.15, 0.25);
        [[-0.35, 0.3, R], [-0.2, 0.3, 0x2f6fae], [-0.05, 0.3, 0xf1c40f]].forEach(([x, z, c]) => box(0.12, 0.08, 0.08, c, x, 0.05, z));
        for (let i = 0; i < 3; i++) ball(0.02, 0xfff3b0, -0.3 + i * 0.25, 0.9 + (i % 2) * 0.1, -0.3, { emissive: 0xffe08a, emissiveIntensity: 0.9 });
        break;
      }
      case 'fermat': {     // 費馬最後定理：刻著方程式的石碑
        box(0.5, 0.75, 0.12, 0xb5b0a5, 0, 0.38, 0); box(0.6, 0.06, 0.2, 0x9a958a, 0, 0.03, 0);
        cyl(0.25, 0.25, 0.12, 0xb5b0a5, 0, 0.75, 0, 12, {}).rotation.x = Math.PI / 2;
        [[0.55, 0.3], [0.45, 0.24], [0.35, 0.28], [0.25, 0.18]].forEach(([y, w]) => box(w, 0.025, 0.01, 0x4a4a4a, 0, y, 0.065));
        box(0.2, 0.02, 0.15, 0xfff6d6, 0.4, 0.02, 0.3).rotation.y = 0.3;
        break;
      }
      case 'holmes': {     // 福爾摩斯冒險史：貝克街 221B 的黑門和煤氣路燈
        box(0.7, 0.8, 0.3, 0x8a4a3a, 0, 0.4, -0.15); box(0.22, 0.4, 0.02, 0x1f1f1f, 0, 0.2, 0.01); ball(0.02, 0xe3a21a, 0.07, 0.2, 0.025);
        box(0.18, 0.06, 0.01, WHITE, 0, 0.47, 0.01); [-0.22, 0.22].forEach(x => box(0.14, 0.18, 0.02, 0x6b7f8f, x, 0.6, 0.01));
        cyl(0.015, 0.02, 0.8, 0x1f1f1f, 0.5, 0.4, 0.2, 6); box(0.1, 0.12, 0.1, std(0xfff1c2, { emissive: 0xffc46b, emissiveIntensity: 0.6 }), 0.5, 0.86, 0.2);
        break;
      }
      case 'orient': {     // 東方快車謀殺案：困在雪裡的藍色臥鋪列車
        cyl(0.6, 0.65, 0.05, WHITE, 0, 0.02, 0, 14);
        [[-0.3, 0x1f3a6b], [0.2, 0x1f3a6b]].forEach(([x, c]) => { box(0.45, 0.26, 0.24, c, x, 0.2, 0); box(0.47, 0.04, 0.26, WHITE, x, 0.35, 0); for (let i = 0; i < 3; i++) box(0.08, 0.07, 0.25, std(0xfff1c2, { emissive: 0xffc46b, emissiveIntensity: 0.4 }), x - 0.13 + i * 0.13, 0.24, 0); });
        box(0.25, 0.22, 0.22, 0x2a2a2a, 0.58, 0.17, 0); cyl(0.04, 0.05, 0.14, 0x2a2a2a, 0.62, 0.35, 0, 8);
        ball(0.15, WHITE, 0.45, 0.08, 0.2); ball(0.12, WHITE, -0.55, 0.06, 0.18);
        break;
      }
      case 'eighty': {     // 環遊世界八十天：地球儀和懷錶（一天的時差就是結局的關鍵）
        cyl(0.12, 0.15, 0.06, WOOD, -0.2, 0.03, 0, 10); cyl(0.015, 0.015, 0.25, 0xe3a21a, -0.2, 0.16, 0, 4);
        ball(0.24, 0x5fa3d8, -0.2, 0.5, 0); [[-0.25, 0.58, 0.12], [-0.08, 0.45, 0.1], [-0.3, 0.4, 0.09]].forEach(([x, y, r]) => ball(r, 0x7fb062, x, y, 0.08));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.012, 4, 20), std(0xe3a21a)); ring.position.set(-0.2, 0.5, 0); ring.rotation.y = 0.5; g.add(ring);
        const watch = cyl(0.12, 0.12, 0.03, 0xe3a21a, 0.3, 0.13, 0.2, 14); watch.rotation.x = -1.2; add(new THREE.CircleGeometry(0.1, 14), WHITE, 0.3, 0.14, 0.215).rotation.x = -1.2 + Math.PI / 2 - Math.PI / 2;
        break;
      }
      // 自然街
      case 'whale': {      // 鯨生鯨世：從草地邊躍出的鯨魚尾巴
        cyl(0.45, 0.5, 0.04, 0x6fb4d8, 0, 0.02, 0, 14);
        const tail = cyl(0.08, 0.14, 0.5, 0x3a5a7a, 0, 0.27, 0, 8); tail.rotation.x = 0.2;
        [-1, 1].forEach(s => { const f = box(0.3, 0.03, 0.14, 0x3a5a7a, s * 0.16, 0.55, 0.06); f.rotation.z = s * 0.35; });
        for (let i = 0; i < 4; i++) ball(0.04, WHITE, -0.3 + i * 0.2, 0.06, 0.3, { transparent: true, opacity: 0.7 });
        break;
      }
      case 'feynman': {    // 別鬧了，費曼先生：一對邦哥鼓和寫滿圖的黑板
        [[-0.12, 0.13], [0.12, 0.1]].forEach(([x, r]) => { cyl(r, r * 0.8, 0.3, 0xb5653a, x, 0.15, 0.2, 10); cyl(r, r, 0.01, 0xf3ead2, x, 0.305, 0.2, 10); });
        [-0.32, 0.32].forEach(x => box(0.03, 0.7, 0.03, WOOD, x, 0.35, -0.25)); box(0.62, 0.4, 0.02, 0x2f4f3a, 0, 0.55, -0.25);
        [[-0.1, 0.6, 0.6], [0.1, 0.5, -0.6], [0, 0.55, 0]].forEach(([x, y, r]) => { const l = box(0.18, 0.012, 0.005, WHITE, x, y, -0.238); l.rotation.z = r; });
        break;
      }
      case 'fabre': {      // 昆蟲記：荒石園，石頭邊有一隻推糞球的糞金龜
        for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 0.2 + (i % 3) * 0.17; ball(0.07 + (i % 3) * 0.03, STONE, Math.cos(a) * r, 0.05, Math.sin(a) * r); }
        cone(0.04, 0.3, 0x8fbf6a, -0.35, 0.15, 0.3, 4); cone(0.04, 0.25, 0x7fb062, -0.3, 0.13, 0.35, 4);
        const beetle = ball(0.08, 0x1f2a3a, 0.3, 0.07, 0.3, { metalness: 0.4, roughness: 0.4 }); beetle.scale.set(1.2, 0.7, 1); ball(0.07, 0x7a5236, 0.45, 0.07, 0.3);
        const bug = ball(0.05, 0x5f9a4a, -0.1, 0.4, -0.1); bug.scale.set(0.6, 1.5, 0.6); cyl(0.008, 0.008, 0.4, 0x7fb062, -0.1, 0.2, -0.1, 4);   // 螳螂和草莖
        break;
      }
      case 'lorenz': {     // 所羅門王的指環：一排跟在後面走的小灰雁
        const mom = ball(0.14, 0x9a9a92, -0.3, 0.16, 0); mom.scale.set(1.4, 1, 1); cyl(0.035, 0.04, 0.2, 0x9a9a92, -0.15, 0.3, 0, 6); ball(0.06, 0x7a7a72, -0.13, 0.42, 0); cone(0.025, 0.07, 0xe3a21a, -0.07, 0.42, 0, 4).rotation.z = -Math.PI / 2;
        for (let i = 0; i < 4; i++) { const x = 0.05 + i * 0.15, k = ball(0.06, 0xe8d58a, x, 0.07, 0.05 * (i % 2)); k.scale.set(1.2, 1, 1); ball(0.035, 0xe8d58a, x + 0.06, 0.13, 0.05 * (i % 2)); }
        box(0.12, 0.25, 0.04, 0x5a6b7a, -0.55, 0.2, -0.2); ball(0.06, 0xe8c4a0, -0.55, 0.38, -0.2);   // 走在最前面的勞倫茲
        break;
      }
      case 'silent': {     // 寂靜的春天：樹上的鳥屋，春天又有鳥在唱歌
        cyl(0.06, 0.08, 0.6, 0x7a5236, 0, 0.3, 0, 6); ball(0.3, 0x86c47a, 0, 0.8, 0); ball(0.22, 0x6fb36a, 0.2, 0.7, 0.1);
        box(0.16, 0.18, 0.14, 0xe9dcc4, 0.05, 0.45, 0.12); cone(0.14, 0.1, R, 0.05, 0.59, 0.12, 4).rotation.y = Math.PI / 4; add(new THREE.CircleGeometry(0.03, 8), 0x2a2a2a, 0.05, 0.47, 0.195);
        [[0.3, 0.55, 0.25, 0x2f6fae], [-0.25, 0.65, 0.2, 0xe8442e], [0.2, 1.0, 0, 0xf1c40f]].forEach(([x, y, z, c]) => { const b = ball(0.045, c, x, y, z); b.scale.set(1.3, 1, 1); });
        break;
      }
      case 'sandcounty': { // 沙郡年記：老橡樹和農場的小木屋
        cyl(0.09, 0.13, 0.55, 0x6a4a32, -0.3, 0.27, -0.1, 7); ball(0.38, 0x5f8a4a, -0.3, 0.8, -0.1); ball(0.25, 0x6f9a52, -0.05, 0.7, -0.05);
        box(0.4, 0.28, 0.3, 0x9a7a5a, 0.35, 0.14, 0.15); const rf = cone(0.3, 0.2, 0x5a4a3a, 0.35, 0.38, 0.15, 4); rf.rotation.y = Math.PI / 4;
        cyl(0.04, 0.04, 0.12, 0x7a7a72, 0.45, 0.47, 0.1, 6);
        break;
      }
      case 'treeman': {    // 種樹的男人：一排一排的小橡樹林
        for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const h = 0.45 + ((r + k) % 3) * 0.15; tree(-0.45 + k * 0.3, -0.3 + r * 0.3, h, [0x4f8a4a, 0x5f9a4a, 0x6fb36a][(r + k) % 3]); }
        cyl(0.012, 0.012, 0.5, WOOD, 0.6, 0.25, 0.4, 4); box(0.12, 0.08, 0.08, 0x8a6a4a, 0.6, 0.08, 0.45);   // 他的鐵棍和裝橡實的袋子
        break;
      }
      // 社會街
      case 'kavalan': {    // 少年噶瑪蘭：水邊的高腳屋和獨木舟
        [[-0.25, -0.15], [0.25, -0.15], [-0.25, 0.15], [0.25, 0.15]].forEach(([x, z]) => cyl(0.025, 0.025, 0.3, WOOD, x, 0.15, z, 5));
        box(0.6, 0.04, 0.4, 0x9a7a5a, 0, 0.31, 0); box(0.5, 0.25, 0.32, 0xc9b27a, 0, 0.45, 0); const rf = cone(0.42, 0.3, 0xa8904f, 0, 0.72, 0, 4); rf.rotation.y = Math.PI / 4;
        cyl(0.4, 0.4, 0.02, 0x6fb4d8, 0.1, 0.01, 0.45, 12); const boat = box(0.5, 0.06, 0.1, 0x7a5236, 0.15, 0.04, 0.5); boat.rotation.y = 0.2;
        break;
      }
      case 'wangyang': {   // 汪洋中的一條船：澎湖的雙心石滬
        const stone = std(0x8a8270);
        [[-0.18, 0], [0.18, 0]].forEach(([cx]) => { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const b = new THREE.Mesh(bx(0.08, 0.06, 0.08), stone); b.position.set(cx + Math.cos(a) * 0.22, 0.03, Math.sin(a) * 0.22); g.add(b); } });
        cyl(0.55, 0.55, 0.015, 0x6fb4d8, 0, 0.005, 0, 16);
        box(0.3, 0.07, 0.1, 0xe9dcc4, 0.45, 0.06, 0.45); cyl(0.008, 0.008, 0.25, WOOD, 0.45, 0.2, 0.45, 4);
        break;
      }
      case 'bookthief': {  // 偷書賊：地下室的牆上寫滿字，旁邊一架手風琴
        box(0.7, 0.5, 0.06, 0xd9c7a8, 0, 0.25, -0.2); for (let i = 0; i < 5; i++) box(0.4 + (i % 2) * 0.15, 0.015, 0.005, 0x3a3a3a, -0.05, 0.42 - i * 0.07, -0.165);
        [[0.3, 0.05], [0.32, 0.11], [0.29, 0.17]].forEach(([x, y], i) => box(0.18, 0.05, 0.13, [0x3a3a4a, 0x8c2f2b, 0xe9dcc4][i], x, y, 0.15));
        box(0.1, 0.18, 0.2, 0x8c2f2b, -0.25, 0.1, 0.2); for (let i = 0; i < 5; i++) box(0.012, 0.18, 0.21, 0x3a3a3a, -0.31 + i * 0.03, 0.1, 0.2); box(0.08, 0.18, 0.2, 0x8c2f2b, -0.4, 0.1, 0.2);
        break;
      }
      case 'animalfarm': { // 動物農莊：穀倉牆上寫著七誡，門口一隻豬
        box(0.8, 0.45, 0.35, 0xe9dcc4, 0, 0.22, -0.15); const rf = cone(0.6, 0.25, 0x6b4a2b, 0, 0.57, -0.15, 4); rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, 0.6);
        box(0.4, 0.3, 0.01, 0x2a2a2a, -0.1, 0.25, 0.03); for (let i = 0; i < 7; i++) box(0.3, 0.012, 0.005, WHITE, -0.1, 0.36 - i * 0.035, 0.037);
        const pig = ball(0.12, 0xf6b6c4, 0.35, 0.12, 0.3); pig.scale.set(1.4, 1, 1); ball(0.07, 0xf6b6c4, 0.5, 0.15, 0.3); cyl(0.02, 0.02, 0.03, 0xe98fb3, 0.57, 0.15, 0.3, 6).rotation.z = Math.PI / 2;
        break;
      }
      case 'nijushi': {    // 二十四隻瞳：海岬上的分校和老師的腳踏車
        box(0.7, 0.32, 0.3, 0xe9dcc4, 0, 0.16, -0.15); const rf = box(0.76, 0.04, 0.38, 0x4a5d73, 0, 0.34, -0.15); for (let i = 0; i < 4; i++) box(0.1, 0.12, 0.01, 0x6b7f8f, -0.24 + i * 0.16, 0.18, 0.005);
        [-0.12, 0.12].forEach(x => { const w = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 4, 12), std(0x3a3a3a)); w.position.set(0.3 + x, 0.08, 0.3); g.add(w); });
        box(0.24, 0.015, 0.015, 0xd9d9d9, 0.3, 0.14, 0.3); box(0.015, 0.1, 0.015, 0xd9d9d9, 0.4, 0.17, 0.3);
        cyl(0.45, 0.45, 0.015, 0x6fb4d8, -0.3, 0.005, 0.45, 12);
        break;
      }
      default: { cyl(0.04, 0.05, 0.6, WOOD, 0, 0.3, 0, 5); box(0.4, 0.25, 0.03, 0xe9dcc4, 0, 0.6, 0); }   // 沒有專屬模型的書：小木牌
    }
    g.traverse(o => { if (o.isMesh) o.userData.markPart = true; });
    return g;
  }
  function buildMarks() {
    const end = weekIdx != null && ctx.S.weeks[weekIdx] ? ctx.S.weeks[weekIdx].end : null;
    const list = (ctx.marks || []).filter(m => !end || !m.at || m.at <= end), sig = JSON.stringify(list);
    if (sig === markSig) return;
    const had = markSig === null ? null : new Set(markLayer.children.map(c => c.userData.mark));
    markSig = sig;
    clearLayer(markLayer);
    spinners = [];
    const used = {};
    list.forEach(m => {
      const j = SUBJECTS.indexOf(m.s); if (j < 0) return;
      const n = used[m.s] = (used[m.s] || 0) + 1; if (n > MARK_SLOTS.length) return;
      const [r, da] = MARK_SLOTS[n - 1], a = -Math.PI / 2 + j * (Math.PI * 2 / 5) + da;
      const mk = markMesh(m.model || m.id);
      mk.position.set(Math.cos(a) * r, 0.18, Math.sin(a) * r);
      mk.lookAt(Math.cos(a) * (r + 5), 0.18, Math.sin(a) * (r + 5));   // 正面朝海
      mk.userData.mark = m.id;
      markLayer.add(mk);
      // 這次打開 App 之後才讀完的：冒出來
      if (had && !had.has(m.id)) { mk.scale.setScalar(0.01); popping.push({ m: mk, t: 0 }); }
    });
  }

  // 她的家：蓋在中央碼頭，跟著島嶼等級擴建
  function buildHome() {
    const h = ctx.home, sig = JSON.stringify(h || null);
    if (sig === homeSig) return;
    homeSig = sig;
    clearLayer(homeLayer);
    if (!h) return;
    const g = new THREE.Group(); g.userData.home = true;
    const wall = std(new THREE.Color(h.wall).getHex(), { emissive: 0x000000 }), roof = std(new THREE.Color(h.roof).getHex());
    const box = (w, hh, d, x, y, z, m) => { const b = new THREE.Mesh(bx(w, hh, d), m); b.position.set(x, y, z); g.add(b); return b; };
    const pyramid = (r, hh, x, y, z) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, hh, 4), roof); c.position.set(x, y, z); c.rotation.y = Math.PI / 4; g.add(c); };
    const door = std(0x8a5a3c), glass = std(0x9fc6dd, { emissive: 0xffb347, emissiveIntensity: 0 });
    if (h.tier === 'tent') {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.0, 4), roof); t.position.y = 0.78; t.rotation.y = Math.PI / 4; g.add(t);
      box(0.28, 0.4, 0.05, 0, 0.48, 0.52, door);
    } else if (h.tier === 'cabin') {
      box(1.1, 0.7, 0.9, 0, 0.62, 0, wall); pyramid(0.95, 0.6, 0, 1.27, 0);
      box(0.24, 0.42, 0.05, 0, 0.48, 0.46, door); box(0.22, 0.2, 0.05, 0.34, 0.7, 0.46, glass);
    } else {
      const big = h.tier === 'manor';
      box(1.2, 1.2, 1.0, 0, 0.87, 0, wall); pyramid(1.05, 0.7, 0, 1.82, 0);
      box(0.26, 0.45, 0.05, 0, 0.5, 0.51, door);
      [[-0.35, 0.72], [0.35, 0.72], [-0.35, 1.15], [0.35, 1.15]].forEach(([x, y]) => box(0.22, 0.2, 0.05, x, y, 0.51, glass));
      box(0.14, 0.4, 0.14, 0.38, 1.95, -0.2, std(0x9a6b4a));   // 煙囪
      if (big) {
        box(0.8, 0.8, 0.8, -1.0, 0.67, -0.1, wall); pyramid(0.7, 0.5, -1.0, 1.32, -0.1);
        box(0.2, 0.18, 0.05, -1.0, 0.75, 0.31, glass);
      }
    }
    if (h.flowers) [[-0.7, 0.6], [0.7, 0.6], [-0.5, 0.85], [0.5, 0.85]].forEach(([x, z], i) => {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), std([0xe98fb3, 0xf0c66a, 0xffffff, 0xb9a0e6][i])); f.position.set(x, 0.38, z); g.add(f);
    });
    // 信箱
    box(0.05, 0.4, 0.05, 0.85, 0.47, 0.9, std(0x9a6b4a)); box(0.2, 0.14, 0.14, 0.85, 0.72, 0.9, std(0xc0504d));
    g.position.y = 0.05; g.scale.setScalar(1.35);
    g.userData.glass = glass;
    homeLayer.add(g);
    const lb = labelSprite('🏠 ' + (h.name || '我的家'), null, { scale: 1.0, color: '#3a2a33' });
    lb.position.set(0, h.tier === 'tent' ? 2.1 : h.tier === 'cabin' ? 2.6 : 3.4, 0); lb.userData.home = true; homeLayer.add(lb);
    setEnvironment(envNow);
  }

  // 海邊步道：每蓋一個運動章鋪一段木棧道，每三章多一盞燈籠
  function buildWalk() {
    const n = Math.min(ctx.walk || 0, 120), sig = String(n);
    if (sig === walkSig) return;
    walkSig = sig;
    clearLayer(walkLayer);
    if (!n) return;
    const plank = std(0xb08356), post = std(0x7a5236), paper = std(0xfff1d6, { emissive: 0xffb347, emissiveIntensity: 0.6 });
    const R = 13.75, step = 0.075, a0 = Math.PI * 0.42;   // 從島的前方海邊開始往右鋪
    for (let i = 0; i < n; i++) {
      const a = a0 - i * step;
      const b = new THREE.Mesh(bx(1.0, 0.06, 0.9), plank);
      b.position.set(Math.cos(a) * R, 0.05, Math.sin(a) * R); b.rotation.y = -a; walkLayer.add(b);
      if (i % 3 === 2) {
        const la = a, lr = R + 0.62;
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 5), post); p.position.set(Math.cos(la) * lr, 0.3, Math.sin(la) * lr);
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.2, 8), paper); l.position.set(Math.cos(la) * lr, 0.68, Math.sin(la) * lr);
        walkLayer.add(p, l);
      }
    }
  }

  // 燈塔：蓋在島左後方的岬角（社會街和國文街中間的空隙，直式手機也看得到），白塔紅帶、晚上燈會轉；瓶子數＝海灘上的錯題，燈籠＝變成燈籠的錯題
  const CAPE = -Math.PI * 0.62;
  function buildLight() {
    const L = ctx.light || null, sig = JSON.stringify(L);
    if (sig === lightSig) return;
    lightSig = sig;
    clearLayer(lightLayer);
    floats = []; lamp = null; beam = null;
    if (LY().light === false) return;   // 家人島沒有燈塔
    const at = (r, da) => new THREE.Vector3(Math.cos(CAPE + (da || 0)) * r, 0, Math.sin(CAPE + (da || 0)) * r);
    const c = at(14.6);
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 0.78, 24), std(0xe6c98e)); sand.position.set(c.x, -0.41, c.z); lightLayer.add(sand);
    capeFoam = new THREE.Mesh(new THREE.RingGeometry(1, 1.12, 48, 1), foam.material); capeFoam.rotation.x = -Math.PI / 2; capeFoam.position.set(c.x, 0, c.z); lightLayer.add(capeFoam);
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.5, 20), grassMat); const g0 = at(14.0); grass.position.set(g0.x, -0.06, g0.z); lightLayer.add(grass);
    const tower = new THREE.Group(); tower.userData.light = true;
    const white = std(0xfdfaf2), red = std(0xc0392b);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.58, 2.6, 16), white); body.position.y = 1.5; tower.add(body);
    [0.8, 1.7].forEach(y => { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.53 - y * 0.06, 0.55 - y * 0.06, 0.32, 16), red); band.position.y = y; tower.add(band); });
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 16), std(0x3a2a33)); deck.position.y = 2.84; tower.add(deck);
    lamp = std(0xfff1c2, { emissive: 0xffd36b, emissiveIntensity: 0.5 });
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.45, 12), lamp); glass.position.y = 3.1; tower.add(glass);
    // v2.31：頂樓的燈室，點燈的地方就進燈室（學習分析）；窗框讓燈室看起來像一間房間
    glass.userData.lampRoom = true;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, f = new THREE.Mesh(bx(0.04, 0.45, 0.04), std(0x3a2a33)); f.position.set(Math.cos(a) * 0.35, 3.1, Math.sin(a) * 0.35); f.userData.lampRoom = true; tower.add(f); }
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.45, 12), red); cap.position.y = 3.55; tower.add(cap);
    const door = new THREE.Mesh(bx(0.26, 0.42, 0.05), std(0x8a5a3c)); door.position.set(0, 0.42, 0.53); tower.add(door);
    // 守燈人的小屋（暖簾的日式小屋）
    const hut = new THREE.Group(); hut.userData.light = true;
    const hw = new THREE.Mesh(bx(0.8, 0.5, 0.6), std(0xf3e6cf)); hw.position.y = 0.5; hut.add(hw);
    const hr = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.35, 4), std(0x4a5d73)); hr.position.y = 0.92; hr.rotation.y = Math.PI / 4; hut.add(hr);
    const noren = new THREE.Mesh(bx(0.34, 0.16, 0.02), std(0x2f5f8a)); noren.position.set(0, 0.62, 0.31); hut.add(noren);
    // 晚上的光束
    beam = new THREE.Mesh(new THREE.ConeGeometry(0.9, 7, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })); lin(beam.material.color);
    beam.geometry.translate(0, -3.5, 0); beam.rotation.z = Math.PI / 2;
    const pivot = new THREE.Group(); pivot.position.y = 3.1; pivot.add(beam); tower.add(pivot); beam = pivot; beam.visible = false;
    const tp = at(14.9), hp = at(13.7, -0.1);
    tower.position.set(tp.x, 0.05, tp.z); tower.rotation.y = -CAPE + Math.PI / 2; tower.scale.setScalar(1.1);
    hut.position.set(hp.x, 0.05, hp.z); hut.rotation.y = -CAPE - Math.PI / 2;
    lightLayer.add(tower, hut);
    if (L) {
      const lb = labelSprite('🗼 ' + (L.name || '燈塔'), L.due ? '🍶 今天漂回 ' + L.due + ' 個' + (L.friends ? '・🏮 老朋友 ' + L.friends : '') : null, { scale: 1.0, color: '#3a2a33' });
      lb.position.set(tp.x, 4.9, tp.z); lb.userData.light = true; lightLayer.add(lb);
      // 漂流瓶不畫在 3D 島上了（v2.30.1：她說瓶子看起來像垃圾）；今天漂回幾個看燈塔標籤，瓶子都在燈塔頁
      // v2.31：今天當「老朋友」漂回來的燈籠（最多 2 盞）：浮在岬角前面的水上、比較亮，不放在沙灘上（她說沙灘上的瓶子像垃圾）
      const fr = Math.min(L.friends || 0, 2), fpaper = std(0xfff1d6, { emissive: 0xffa94d, emissiveIntensity: 1.2 }), fbase = std(0x7a5236);
      for (let i = 0; i < fr; i++) {
        const p = at(17.3, (i ? 0.12 : -0.12)), lt = new THREE.Group(); lt.userData.light = true;
        const box = new THREE.Mesh(bx(0.3, 0.28, 0.3), fpaper); box.position.y = 0.22; lt.add(box);
        const raft = new THREE.Mesh(bx(0.38, 0.05, 0.38), fbase); lt.add(raft);
        lt.position.set(p.x, -0.55, p.z); lt.userData.phase = i * 2.3; lightLayer.add(lt); floats.push(lt);
      }
      // 海上的紙燈籠（最多 40 盞），慢慢上下漂
      const k = Math.min(L.lanterns || 0, 40), paper = std(0xfff1d6, { emissive: 0xffa94d, emissiveIntensity: 0.8 }), base = std(0x7a5236);
      for (let i = 0; i < k; i++) {
        const r = 17.6 + (i % 5) * 1.3 + Math.floor(i / 10) * 0.6, da = ((i * 0.618) % 1 - 0.5) * 1.1, p = at(r, da);
        const lt = new THREE.Group();
        const box = new THREE.Mesh(bx(0.26, 0.24, 0.26), paper); box.position.y = 0.2; lt.add(box);
        const raft = new THREE.Mesh(bx(0.34, 0.05, 0.34), base); lt.add(raft);
        lt.position.set(p.x, -0.55, p.z); lt.userData.phase = i * 1.7;
        lightLayer.add(lt); floats.push(lt);
      }
    }
    setEnvironment(envNow);
  }

  function buildLinks() {
    clearLayer(linkLayer);
    const bond = ctx.bond || {};
    Object.keys(bond).forEach(k => {
      const a = anchors[k[0]], b = anchors[k[1]]; if (!a || !b) return;
      const mid = a.clone().add(b).multiplyScalar(0.5); mid.y = 3.2 + a.distanceTo(b) * 0.18;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.06 + Math.min(bond[k], 6) * 0.03, 6, false),
        std(0xe05a9a, { emissive: 0x7a1f48, emissiveIntensity: 0.35, transparent: true, opacity: 0.85 }));
      tube.userData.pair = k; linkLayer.add(tube);
    });
    linkVis();
  }
  // v2.48.1 拱橋不礙眼（ARCS_PICK_v1）：成長回放畫全部；平常只畫選到的島民的橋，沒選就都不畫
  function linkVis() { if (linkLayer) linkLayer.children.forEach(t => { t.visible = weekIdx != null || (!!selected && String(t.userData.pair || '').indexOf(selected) >= 0); }); }

  // ---------- 互動 ----------
  let downAt = null;
  function onDown(e) { downAt = { x: e.clientX, y: e.clientY }; if (controls) controls.autoRotate = false; }
  function onUp(e) {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(v, camera);
    const hits = ray.intersectObjects(root.children, true);
    if (hits.length && ctx.onMainIsle) { let o = hits[0].object; while (o && !o.userData.mainIsle) o = o.parent; if (o) { ctx.onMainIsle(); return; } }
    const homeHit = hits.find(h => { let o = h.object; while (o && !o.userData.home && !o.userData.subject) o = o.parent; return o && o.userData.home; });
    const hit = hits.find(h => {
      let o = h.object; while (o && !o.userData.subject) o = o.parent; return !!o;
    });
    if (homeHit && (!hit || homeHit.distance <= hit.distance)) { if (ctx.onHome) ctx.onHome(); return; }
    const lampHit = hits.find(h => h.object.userData.lampRoom);
    if (lampHit && ctx.onLamp && (!hit || lampHit.distance <= hit.distance)) { ctx.onLamp(); return; }
    const lightHit = hits.find(h => { let o = h.object; while (o && !o.userData.light && !o.userData.subject) o = o.parent; return o && o.userData.light; });
    if (lightHit && ctx.onLight && (!hit || lightHit.distance <= hit.distance)) { ctx.onLight(); return; }
    const mHit = hits.find(h => { let o = h.object; while (o && o.userData.mark == null && !o.userData.subject) o = o.parent; return o && o.userData.mark != null; });
    if (mHit && ctx.onMark && (!hit || mHit.distance <= hit.distance)) { let o = mHit.object; while (o.userData.mark == null) o = o.parent; ctx.onMark(o.userData.mark); return; }
    const bHit = hits.find(h => { let o = h.object; while (o && !o.userData.book && !o.userData.subject) o = o.parent; return o && o.userData.book; });
    if (bHit && ctx.onBook && (!hit || bHit.distance <= hit.distance)) { ctx.onBook(); return; }
    const fHit = hits.find(h => { let o = h.object; while (o && !o.userData.ferry && !o.userData.subject) o = o.parent; return o && o.userData.ferry; });
    if (fHit && ctx.onFerry && (!hit || fHit.distance <= hit.distance)) { ctx.onFerry(); return; }
    const yHit = hits.find(h => { let o = h.object; while (o && !o.userData.yatai && !o.userData.subject) o = o.parent; return o && o.userData.yatai; });
    if (yHit && ctx.onYatai && (!hit || yHit.distance <= hit.distance)) { ctx.onYatai(); return; }
    const hHit = hits.find(h => { let o = h.object; while (o && !o.userData.hall && !o.userData.subject) o = o.parent; return o && o.userData.hall; });
    if (hHit && ctx.onHall && (!hit || hHit.distance <= hit.distance)) { ctx.onHall(); return; }
    const iHit = hits.find(h => { let o = h.object; while (o && !o.userData.islet && !o.userData.subject) o = o.parent; return o && o.userData.islet; });
    if (iHit && ctx.onIslet && (!hit || iHit.distance <= hit.distance)) { let o = iHit.object; while (!o.userData.islet) o = o.parent; ctx.onIslet(o.userData.islet); return; }
    const gHit = hits.find(h => { let o = h.object; while (o && !o.userData.garden && !o.userData.plant && !o.userData.subject) o = o.parent; return o && (o.userData.garden || o.userData.plant); });
    if (gHit && (!hit || gHit.distance <= hit.distance)) {
      let o = gHit.object; while (!o.userData.garden && !o.userData.plant) o = o.parent;
      if (o.userData.plant && ctx.onPlant) { ctx.onPlant(o.userData.plant); return; }
      if (o.userData.garden && ctx.onGarden) { ctx.onGarden(); return; }
    }
    if (!hit) {   // 點空白處：收起拱橋和選取
      if (selected) { selected = null; Object.keys(plates).forEach(k => plates[k].material.emissive = lin(new THREE.Color(0x000000))); linkVis(); }
      return;
    }
    let o = hit.object; while (!o.userData.subject) o = o.parent;
    select(o.userData.subject);
  }
  let selected = null;
  function select(s) {
    selected = s;
    Object.keys(plates).forEach(k => plates[k].material.emissive = lin(new THREE.Color(k === s ? 0x9a6f22 : 0x000000)));   // 選到的街：暖黃（美術 10/29）
    popping.push({ m: plates[s], t: 0, bounce: true });
    linkVis();
    if (ctx.onSelect) ctx.onSelect(s);
  }

  // 主島剪影：簡化的台灣外形（12 點）＋三座小山，浮在遠海上空、底下一塊岩塊，名牌小而淡
  function buildMainIsle() {
    const P = [[0.4, -2.6], [0.95, -2.2], [1.0, -1.2], [0.85, 0.2], [0.55, 1.4], [0.2, 2.6], [-0.05, 2.5], [-0.5, 1.2], [-0.95, 0.2], [-0.85, -0.9], [-0.55, -1.8], [-0.1, -2.5]];
    const sh = new THREE.Shape(); P.forEach((p, i) => i ? sh.lineTo(p[0], -p[1]) : sh.moveTo(p[0], -p[1]));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2);
    mainIsle = new THREE.Group(); mainIsle.userData.mainIsle = true;
    const UP = 0.6;   // 浮起來的高度（剪影自己的單位，整組會再放大 1.6 倍）
    const land = new THREE.Mesh(g, std(0x9cb89a)); land.position.y = -0.55 + UP; mainIsle.add(land);
    const under = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.4, 5, 1), std(0x8a7a6a)); under.rotation.x = Math.PI; under.scale.set(1, 1, 2.6); under.position.y = -0.9 + UP; mainIsle.add(under);
    [[0.1, -1.0, 0.9], [0.0, 0.0, 1.3], [-0.15, 1.0, 0.8]].forEach(m => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.55, m[2], 5, 1), std(0x7f9f80)); c.position.set(m[0], m[2] / 2 - 0.2 + UP, m[1]); mainIsle.add(c); });
    const sp = labelSprite('⛰️ 主島', null, { scale: 0.6, bg: 'rgba(255,255,255,0.6)', color: '#5a6a7a' }); sp.position.y = 1.5 + UP; mainIsle.add(sp);
    const a = Math.PI * (ctx.mainIsle.a != null ? ctx.mainIsle.a : -0.5), R = 28;   // 主島在遠海的哪個方位：預設是島的正後方，打開就看得到（工程顧問 2a 完工審查）
    mainIsle.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); mainIsle.scale.setScalar(1.6);
    root.add(mainIsle);
  }

  // ---------- 主迴圈 ----------
  let framed = false;
  function resize() {
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!framed && w && h) {      // 直式手機畫面要拉遠一點，整座島才放得下
      framed = true;
      const d = Math.min(62, 31 * Math.pow(Math.max(1, h / w), 0.9) * (ctx.islets && ctx.islets.length ? 1.32 : 1));   // 有衛星小島時再拉遠一點
      camera.position.copy(new THREE.Vector3(0, 21, 23).normalize().multiplyScalar(d));
      if (BG() !== 'sea') { camera.position.copy(new THREE.Vector3(0, 9, 26).normalize().multiplyScalar(Math.min(60, d * 1.2))); controls.maxDistance = 64; }   // 浮島：鏡頭低一點、遠一點，看得到島底下
    }
  }
  function loop() {
    if (!renderer.domElement.isConnected) { running = false; return; }
    if (document.hidden) { setTimeout(() => requestAnimationFrame(loop), 1000); return; }
    const realDt = Math.min(clock.getDelta(), 0.1), dt = CALM ? 0 : realDt, now = CALM ? 0 : performance.now() / 1000;
    animateSky(dt);
    animateSea(now);
    if (HQ && shadowOn && (shadowDirty || popping.length || now - lastShadow > 1)) { if (shadowDirty) shadowize(); renderer.shadowMap.needsUpdate = true; lastShadow = now; shadowDirty = false; }
    spinners.forEach(sp => { sp.m.rotation[sp.axis] += sp.v * dt; });
    if (ferryBoat) { ferryBoat.position.y = -0.45 + Math.sin(now * 1.3) * 0.05; ferryBoat.rotation.z = Math.sin(now * 0.9) * 0.03; }
    popping = popping.filter(p => {
      p.t += realDt / 0.45;
      const t = Math.min(p.t, 1);
      if (p.bounce) { p.m.position.y = 0.2 + Math.sin(t * Math.PI) * 0.25; }
      else { const e = 1 - Math.pow(1 - t, 3); p.m.scale.setScalar(Math.max(0.01, e * (p.to || 1) * (1 + 0.15 * Math.sin(t * Math.PI)))); }
      return t < 1;
    });
    controls.update();
    renderer.render(scene, camera);
    if (guard) guard.frame();
    requestAnimationFrame(loop);
  }

  function mount(el, context) {
    container = el; ctx = context;
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));   // v2.30 省電：上限 1.5
      if (CM) renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.82;
      if (HQ) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; }
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
      renderer.domElement.style.touchAction = 'none';
      camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
      camera.position.set(0, 21, 23);
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.enablePan = false;
      controls.minDistance = 12; controls.maxDistance = 50; controls.maxPolarAngle = 1.25;
      controls.autoRotate = true; controls.autoRotateSpeed = 0.5;
      renderer.domElement.addEventListener('pointerdown', onDown);
      renderer.domElement.addEventListener('pointerup', onUp);
      window.addEventListener('resize', resize);
      clock = new THREE.Clock();
      buildStatic();
      if (window.FpsGuard) guard = FpsGuard.create({ renderer, hasShadow: HQ, shadows: on => { shadowOn = on; sun.castShadow = HQ && on; shadowDirty = true; } });
    }
    setEnvironment(envNow);
    if (ctx.season && ctx.season !== seasonNow) setSeason(ctx.season);
    if (ctx.mainIsle && !mainIsle) buildMainIsle();
    applyBg(); setEnvironment(envNow);
    el.appendChild(renderer.domElement);
    resize();
    const sig = JSON.stringify([ctx.walk || 0, ctx.sig || ctx.S.grid, ctx.S.assessments.length, ctx.bond, ctx.S.save && ctx.S.save.config, ctx.home, ctx.light, ctx.garden, ctx.marks, ctx.islets, ctx.hall]) + weekIdx;
    if (sig !== signature) { signature = sig; buildDynamic(false); }
    floatFix();
    shadowDirty = true;
    if (selected && ctx.onSelect) ctx.onSelect(selected);
    if (!running) { running = true; clock.getDelta(); loop(); }
  }

  // 成長回放：顯示到第 i 週為止的島（null = 現在）
  function setWeek(i, animate) {
    weekIdx = i;
    signature = '';
    buildDynamic(animate !== false); floatFix(); shadowDirty = true;
  }

  // 主島剪影在畫面上的位置（看不到時是 null），端到端測試點剪影用
  function mainIsleAt() {
    if (!mainIsle || !camera) return null;
    const p = new THREE.Vector3(0, 1.0, 0).applyMatrix4(mainIsle.matrixWorld).project(camera), r = renderer.domElement.getBoundingClientRect();
    return Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95 && p.z < 1 ? { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height } : null;
  }
  // 端到端測試用：某一類可以點的東西（light、islet、ferry、mainIsle）在畫面上的位置，看不到時是 null
  function pointAt(kind) {
    if (!camera) return null;
    const r = renderer.domElement.getBoundingClientRect(), out = [];
    root.traverse(o => { if (o.userData && o.userData[kind] && o.visible && (o.isMesh || o.isSprite)) out.push(o); });
    for (const o of out) {
      const p = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).project(camera);
      if (Math.abs(p.x) < 0.9 && Math.abs(p.y) < 0.9 && p.z < 1) return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
    }
    return null;
  }
  window.Island3D = { HQ, mount, mainIsleAt, pointAt, setWeek, setEnvironment, setSeason, pointsUntil: w => pointsUntil(w), select, plantMesh: (k, ti, st) => plantMesh(k, ti, st), get selected() { return selected; } };
})();

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
  // 天色與天氣
  let homeLayer, homeSig = '', walkLayer, walkSig = '';
  // 燈塔（學習中心）：岬角上的燈塔、海灘的漂流瓶、海上的紙燈籠
  let lightLayer, lightSig = null, lamp = null, beam = null, floats = [];
  // 節氣：草地、樹葉的顏色與飄落的花瓣／楓葉／螢火蟲
  let grassMat, leafMats = [], seasonFx, seasonNow = null;
  // 植樹（v2.10）：她用綠點種在街道之間空地格上的植物，和碼頭旁的植木屋
  let gardenLayer, gardenSig = null;
  let hemi, sun, moon, water, wallMat, stars, rain, clouds, flash = 0, envNow = { phase: 'day', weather: 'clear' };

  // ---------- 小工具 ----------
  const std = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.85, metalness: 0 }, extra));
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
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    const k = (opts.scale || 1) * 0.012;
    sp.scale.set(W * k, H * k, 1); sp.renderOrder = 10;
    return sp;
  }
  function avatarSprite(emoji, imgSrc) {
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
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
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(1.7, 1.7, 1);
    return sp;
  }

  // ---------- 建築 ----------
  function makeBuilding(kind, subj) {
    const grp = new THREE.Group();
    const wall = wallMat, roof = std(ROOF[subj]);
    const house = (x, z, s) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.34 * s, 0.42 * s), wall);
      b.position.set(x, 0.17 * s, z);
      const r = new THREE.Mesh(new THREE.ConeGeometry(0.36 * s, 0.3 * s, 4), roof);
      r.position.set(x, 0.34 * s + 0.15 * s, z); r.rotation.y = Math.PI / 4;
      grp.add(b, r);
    };
    if (kind === 'house') house(0, 0, 1);
    else if (kind === 'community') { house(-0.22, -0.15, 0.85); house(0.24, -0.12, 0.85); house(0, 0.24, 0.85); }
    else if (kind === 'tower') {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), std(0xf4ede4));
      t.position.y = 0.75;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.56), roof); cap.position.y = 1.56;
      for (let i = 0; i < 4; i++) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.52), std(0x9fc6dd)); w.position.y = 0.35 + i * 0.3; grp.add(w);
      }
      grp.add(t, cap);
    } else if (kind === 'castle') {
      const stone = std(0xe9e1d3);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.9), stone); base.position.y = 0.3; grp.add(base);
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
    moon = new THREE.DirectionalLight(0x9fb4ff, 0); moon.position.set(-12, 18, -6); scene.add(moon);
    wallMat = std(0xfdf6ec);

    root = new THREE.Group(); scene.add(root);
    water = new THREE.Mesh(new THREE.CircleGeometry(80, 48), std(0x6fb4d8, { roughness: 0.4 }));
    water.rotation.x = -Math.PI / 2; water.position.y = -0.6; root.add(water);
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(14.2, 15, 0.8, 40), std(0xe6c98e)); sand.position.y = -0.4; root.add(sand);
    grassMat = std(0x8cc56c);
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(13, 13.4, 0.5, 40), grassMat); grass.position.y = -0.05; root.add(grass);

    plates = {}; anchors = {};
    SUBJECTS.forEach((s, i) => {
      const c = districtPos(i);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.75, 0.3, 6), std(PLATE[s]));
      plate.position.set(c.x, 0.2, c.z); plate.userData.subject = s; root.add(plate); plates[s] = plate;
      if (LANES[s]) {           // 三條小巷的分隔線
        for (let k = 0; k < 3; k++) {
          const a = -Math.PI / 2 + k * (Math.PI * 2 / 3) + Math.PI / 3;
          const line = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.04, 0.08), std(0xffffff));
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
      if (GARDEN_SLOTS.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 0.9) || Math.hypot(HUT.x - p.x, HUT.z - p.z) < 1.2) continue;
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
    stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: true, fog: false, transparent: true }));
    stars.visible = false; scene.add(stars);
    // 雨
    const rg = new THREE.BufferGeometry(), rp = [];
    for (let i = 0; i < 900; i++) {
      const x = (r() - 0.5) * 36, y = r() * 22, z = (r() - 0.5) * 36;
      rp.push(x, y, z, x - 0.05, y - 0.6, z);
    }
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xcfe0f0, transparent: true, opacity: 0.55 }));
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
    // 季節飄落物：花瓣、楓葉（白天）或螢火蟲（夏天晚上）
    const fg = new THREE.BufferGeometry(), fp = [];
    for (let i = 0; i < 140; i++) fp.push((r() - 0.5) * 26, r() * 9, (r() - 0.5) * 26);
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
    seasonFx = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xf4b6c8, size: 0.22, transparent: true, opacity: 0.9 }));
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
    grassMat.color.setHex(t.grass);
    leafMats.forEach((m, i) => m.color.setHex(t.leaves[i]));
    seasonFx.userData.kind = t.fx || null;
    seasonFx.material.color.setHex(t.fx === 'maple' ? 0xe0603a : t.fx === 'firefly' ? 0xf6f08a : 0xf7bfd0);
    seasonFx.material.size = t.fx === 'firefly' ? 0.16 : 0.22;
    showSeasonFx();
    if (gardenLayer && ctx) buildGarden();
  }
  function showSeasonFx() {
    if (!seasonFx) return;
    const k = seasonFx.userData.kind, night = envNow.phase === 'night', wet = envNow.weather === 'rain' || envNow.weather === 'storm';
    seasonFx.visible = !!k && !wet && (k === 'firefly' ? night : !night);
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
    scene.fog.color.copy(sky);
    scene.fog.near = w === 'fog' ? 18 : wet ? 30 : 45; scene.fog.far = w === 'fog' ? 50 : wet ? 75 : 90;
    const night = ph === 'night', dim = wet ? 0.7 : w === 'cloudy' ? 0.88 : 1;
    hemi.intensity = { dawn: 0.45, day: 0.55, dusk: 0.42, night: 0.3 }[ph] * dim;
    hemi.color.setHex(night ? 0x8090c0 : 0xffffff);
    sun.intensity = { dawn: 0.45, day: 0.6, dusk: 0.45, night: 0 }[ph] * (wet ? 0.4 : dim);
    sun.color.setHex(ph === 'dawn' ? 0xffc89a : ph === 'dusk' ? 0xff9f6a : 0xfff4e0);
    sun.position.set(ph === 'dawn' ? 18 : ph === 'dusk' ? -18 : 10, ph === 'day' ? 20 : 7, 8);
    moon.intensity = night ? 0.45 : 0;
    water.material.color.setHex(night ? 0x24456a : wet ? 0x5d8aa6 : 0x6fb4d8);
    // 晚上和陰暗時房子亮燈
    wallMat.emissive.setHex(night ? 0xffb347 : wet && ph !== 'day' ? 0xffb347 : 0x000000);
    wallMat.emissiveIntensity = night ? 0.8 : 0.35;
    homeLayer && homeLayer.children.forEach(c => { if (c.userData.glass) c.userData.glass.emissiveIntensity = night || (wet && ph !== 'day') ? 0.9 : 0; });
    if (lamp) lamp.emissiveIntensity = night ? 1.4 : ph === 'dusk' || wet ? 0.9 : 0.4;
    if (beam) beam.visible = night || ph === 'dusk' || w === 'fog';
    stars.visible = night && !wet && w !== 'fog';
    stars.material.opacity = w === 'cloudy' ? 0.4 : 1;
    rain.visible = wet;
    clouds.visible = w !== 'clear' || ph === 'day';
    clouds.userData.mat.color.setHex(wet ? 0x7d8794 : night ? 0x4a5370 : 0xffffff);
    if (container) container.style.background = '#' + sky.getHexString();
    showSeasonFx();
  }
  function animateSky(dt) {
    if (seasonFx && seasonFx.visible) {
      const p = seasonFx.geometry.attributes.position, fly = seasonFx.userData.kind === 'firefly', t = performance.now() / 1000;
      for (let i = 0; i < p.count; i++) {
        if (fly) { p.setY(i, 0.6 + 1.2 * (0.5 + 0.5 * Math.sin(t * 0.8 + i))); p.setX(i, p.getX(i) + Math.sin(t + i * 1.7) * dt * 0.4); continue; }
        let y = p.getY(i) - dt * 0.7;
        if (y < 0.2) y += 9;
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
    if (floats.length) { const t = performance.now() / 1000; floats.forEach(f => { f.position.y = -0.55 + Math.sin(t * 1.2 + f.userData.phase) * 0.06; f.rotation.y = Math.sin(t * 0.4 + f.userData.phase) * 0.3; }); }
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
      if (LANES[s]) {
        LANES[s].forEach((sub, k) => {
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
      const r = ctx.resident(s), gr = ctx.grade(s);
      const k = `who:${s}:${r.name}:${gr || ''}:${r.emoji}:${ctx.imgOf(s) ? ctx.imgOf(s).length : 0}`; keep.add(k);
      if (old.has(k)) return;
      const av = avatarSprite(r.emoji, ctx.imgOf(s));
      av.position.copy(anchors[s]); av.userData.key = k; av.userData.subject = s; av.userData.avatar = true;
      const lb = labelSprite(r.name, `${ctx.subjectName[s]}街${gr ? '・' + gr : ''}`, { scale: 1.15 });
      lb.position.set(anchors[s].x, anchors[s].y + 1.8, anchors[s].z);
      const grp = new THREE.Group(); grp.add(av, lb); grp.userData.key = k; grp.userData.subject = s;
      buildLayer.add(grp);
    });
    buildLayer.children.slice().forEach(m => { if (!keep.has(m.userData.key)) buildLayer.remove(m); });
    buildLinks();
    buildHome();
    buildWalk();
    buildLight();
    buildGarden();
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
    while (gardenLayer.children.length) gardenLayer.remove(gardenLayer.children[0]);
    if (!G) return;
    if (G.hut) {   // 植木屋：木造小棚、陶盆、綠色暖簾
      const hut = new THREE.Group(); hut.userData.garden = true;
      const box = (w, h, d, x, y, z, c) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(c)); b.position.set(x, y, z); hut.add(b); return b; };
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

  // 她的家：蓋在中央碼頭，跟著島嶼等級擴建
  function buildHome() {
    const h = ctx.home, sig = JSON.stringify(h || null);
    if (sig === homeSig) return;
    homeSig = sig;
    while (homeLayer.children.length) homeLayer.remove(homeLayer.children[0]);
    if (!h) return;
    const g = new THREE.Group(); g.userData.home = true;
    const wall = std(new THREE.Color(h.wall).getHex(), { emissive: 0x000000 }), roof = std(new THREE.Color(h.roof).getHex());
    const box = (w, hh, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), m); b.position.set(x, y, z); g.add(b); return b; };
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
    while (walkLayer.children.length) walkLayer.remove(walkLayer.children[0]);
    if (!n) return;
    const plank = std(0xb08356), post = std(0x7a5236), paper = std(0xfff1d6, { emissive: 0xffb347, emissiveIntensity: 0.6 });
    const R = 13.75, step = 0.075, a0 = Math.PI * 0.42;   // 從島的前方海邊開始往右鋪
    for (let i = 0; i < n; i++) {
      const a = a0 - i * step;
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.9), plank);
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
    while (lightLayer.children.length) lightLayer.remove(lightLayer.children[0]);
    floats = []; lamp = null; beam = null;
    const at = (r, da) => new THREE.Vector3(Math.cos(CAPE + (da || 0)) * r, 0, Math.sin(CAPE + (da || 0)) * r);
    const c = at(14.6);
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 0.78, 24), std(0xe6c98e)); sand.position.set(c.x, -0.41, c.z); lightLayer.add(sand);
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.5, 20), grassMat); const g0 = at(14.0); grass.position.set(g0.x, -0.06, g0.z); lightLayer.add(grass);
    const tower = new THREE.Group(); tower.userData.light = true;
    const white = std(0xfdfaf2), red = std(0xc0392b);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.58, 2.6, 16), white); body.position.y = 1.5; tower.add(body);
    [0.8, 1.7].forEach(y => { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.53 - y * 0.06, 0.55 - y * 0.06, 0.32, 16), red); band.position.y = y; tower.add(band); });
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 16), std(0x3a2a33)); deck.position.y = 2.84; tower.add(deck);
    lamp = std(0xfff1c2, { emissive: 0xffd36b, emissiveIntensity: 0.5 });
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.45, 12), lamp); glass.position.y = 3.1; tower.add(glass);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.45, 12), red); cap.position.y = 3.55; tower.add(cap);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.05), std(0x8a5a3c)); door.position.set(0, 0.42, 0.53); tower.add(door);
    // 守燈人的小屋（暖簾的日式小屋）
    const hut = new THREE.Group(); hut.userData.light = true;
    const hw = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), std(0xf3e6cf)); hw.position.y = 0.5; hut.add(hw);
    const hr = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.35, 4), std(0x4a5d73)); hr.position.y = 0.92; hr.rotation.y = Math.PI / 4; hut.add(hr);
    const noren = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.02), std(0x2f5f8a)); noren.position.set(0, 0.62, 0.31); hut.add(noren);
    // 晚上的光束
    beam = new THREE.Mesh(new THREE.ConeGeometry(0.9, 7, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
    beam.geometry.translate(0, -3.5, 0); beam.rotation.z = Math.PI / 2;
    const pivot = new THREE.Group(); pivot.position.y = 3.1; pivot.add(beam); tower.add(pivot); beam = pivot; beam.visible = false;
    const tp = at(14.9), hp = at(13.7, -0.1);
    tower.position.set(tp.x, 0.05, tp.z); tower.rotation.y = -CAPE + Math.PI / 2; tower.scale.setScalar(1.1);
    hut.position.set(hp.x, 0.05, hp.z); hut.rotation.y = -CAPE - Math.PI / 2;
    lightLayer.add(tower, hut);
    if (L) {
      const lb = labelSprite('🗼 ' + (L.name || '燈塔'), L.due ? '🍶 今天漂回 ' + L.due + ' 個' : null, { scale: 1.0, color: '#3a2a33' });
      lb.position.set(tp.x, 4.9, tp.z); lb.userData.light = true; lightLayer.add(lb);
      // 海灘上的瓶子（最多 14 個），今天漂回來的會發亮
      const n = Math.min(L.sea || 0, 14), glow = std(0x7fd3c3, { emissive: 0x7fd3c3, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 }), dull = std(0x8fbfa8, { transparent: true, opacity: 0.85 });
      for (let i = 0; i < n; i++) {
        const p = at(15.9 + (i % 2) * 0.5, -0.3 + i * 0.045), b = new THREE.Group(); b.userData.light = true;
        const m = i < (L.due || 0) ? glow : dull;
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.3, 8), m); bottle.position.y = 0.15; b.add(bottle);
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 6), m); neck.position.y = 0.36; b.add(neck);
        b.position.set(p.x, 0.02, p.z); b.rotation.z = 1.2 + (i % 3) * 0.2; b.rotation.y = i;
        lightLayer.add(b);
      }
      // 海上的紙燈籠（最多 40 盞），慢慢上下漂
      const k = Math.min(L.lanterns || 0, 40), paper = std(0xfff1d6, { emissive: 0xffa94d, emissiveIntensity: 0.8 }), base = std(0x7a5236);
      for (let i = 0; i < k; i++) {
        const r = 17.6 + (i % 5) * 1.3 + Math.floor(i / 10) * 0.6, da = ((i * 0.618) % 1 - 0.5) * 1.1, p = at(r, da);
        const lt = new THREE.Group();
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.26), paper); box.position.y = 0.2; lt.add(box);
        const raft = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.34), base); lt.add(raft);
        lt.position.set(p.x, -0.55, p.z); lt.userData.phase = i * 1.7;
        lightLayer.add(lt); floats.push(lt);
      }
    }
    setEnvironment(envNow);
  }

  function buildLinks() {
    while (linkLayer.children.length) linkLayer.remove(linkLayer.children[0]);
    const bond = ctx.bond || {};
    Object.keys(bond).forEach(k => {
      const a = anchors[k[0]], b = anchors[k[1]]; if (!a || !b) return;
      const mid = a.clone().add(b).multiplyScalar(0.5); mid.y = 3.2 + a.distanceTo(b) * 0.18;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.06 + Math.min(bond[k], 6) * 0.03, 6, false),
        std(0xe05a9a, { emissive: 0x7a1f48, emissiveIntensity: 0.35, transparent: true, opacity: 0.85 }));
      linkLayer.add(tube);
    });
  }

  // ---------- 互動 ----------
  let downAt = null;
  function onDown(e) { downAt = { x: e.clientX, y: e.clientY }; if (controls) controls.autoRotate = false; }
  function onUp(e) {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(v, camera);
    const hits = ray.intersectObjects(root.children, true);
    const homeHit = hits.find(h => { let o = h.object; while (o && !o.userData.home && !o.userData.subject) o = o.parent; return o && o.userData.home; });
    const hit = hits.find(h => {
      let o = h.object; while (o && !o.userData.subject) o = o.parent; return !!o;
    });
    if (homeHit && (!hit || homeHit.distance <= hit.distance)) { if (ctx.onHome) ctx.onHome(); return; }
    const lightHit = hits.find(h => { let o = h.object; while (o && !o.userData.light && !o.userData.subject) o = o.parent; return o && o.userData.light; });
    if (lightHit && ctx.onLight && (!hit || lightHit.distance <= hit.distance)) { ctx.onLight(); return; }
    const gHit = hits.find(h => { let o = h.object; while (o && !o.userData.garden && !o.userData.plant && !o.userData.subject) o = o.parent; return o && (o.userData.garden || o.userData.plant); });
    if (gHit && (!hit || gHit.distance <= hit.distance)) {
      let o = gHit.object; while (!o.userData.garden && !o.userData.plant) o = o.parent;
      if (o.userData.plant && ctx.onPlant) { ctx.onPlant(o.userData.plant); return; }
      if (o.userData.garden && ctx.onGarden) { ctx.onGarden(); return; }
    }
    if (!hit) return;
    let o = hit.object; while (!o.userData.subject) o = o.parent;
    select(o.userData.subject);
  }
  let selected = null;
  function select(s) {
    selected = s;
    Object.keys(plates).forEach(k => plates[k].material.emissive = new THREE.Color(k === s ? 0x553344 : 0x000000));
    popping.push({ m: plates[s], t: 0, bounce: true });
    if (ctx.onSelect) ctx.onSelect(s);
  }

  // ---------- 主迴圈 ----------
  let framed = false;
  function resize() {
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!framed && w && h) {      // 直式手機畫面要拉遠一點，整座島才放得下
      framed = true;
      const d = Math.min(48, 31 * Math.pow(Math.max(1, h / w), 0.9));
      camera.position.copy(new THREE.Vector3(0, 21, 23).normalize().multiplyScalar(d));
    }
  }
  function loop() {
    if (!renderer.domElement.isConnected) { running = false; return; }
    const dt = Math.min(clock.getDelta(), 0.1);
    animateSky(dt);
    popping = popping.filter(p => {
      p.t += dt / 0.45;
      const t = Math.min(p.t, 1);
      if (p.bounce) { p.m.position.y = 0.2 + Math.sin(t * Math.PI) * 0.25; }
      else { const e = 1 - Math.pow(1 - t, 3); p.m.scale.setScalar(Math.max(0.01, e * (1 + 0.15 * Math.sin(t * Math.PI)))); }
      return t < 1;
    });
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function mount(el, context) {
    container = el; ctx = context;
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
    }
    setEnvironment(envNow);
    if (ctx.season && ctx.season !== seasonNow) setSeason(ctx.season);
    el.appendChild(renderer.domElement);
    resize();
    const sig = JSON.stringify([ctx.walk || 0, ctx.sig || ctx.S.grid, ctx.S.assessments.length, ctx.bond, ctx.S.save && ctx.S.save.config, ctx.home, ctx.light, ctx.garden]) + weekIdx;
    if (sig !== signature) { signature = sig; buildDynamic(false); }
    if (selected && ctx.onSelect) ctx.onSelect(selected);
    if (!running) { running = true; clock.getDelta(); loop(); }
  }

  // 成長回放：顯示到第 i 週為止的島（null = 現在）
  function setWeek(i, animate) {
    weekIdx = i;
    signature = '';
    buildDynamic(animate !== false);
  }

  window.Island3D = { mount, setWeek, setEnvironment, setSeason, pointsUntil: w => pointsUntil(w), select, plantMesh: (k, ti, st) => plantMesh(k, ti, st), get selected() { return selected; } };
})();

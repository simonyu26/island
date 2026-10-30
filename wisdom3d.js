/**
 * 會考小島 3D 智慧島（v2.25）：坐渡船上岸後看到的小島，四位導師的小屋
 * 依賴 three.min.js 與 OrbitControls.js（同資料夾），由 index.html 在需要時才載入。寫法和 island3d.js 一樣：
 * 顏色用 sRGB 16 進位寫、std() 轉線性再算光，輸出 sRGB＋ACES；標籤 toneMapped:false 才不會變淡。
 * Wisdom3D.mount(container, opts)
 *   opts = { phase: dawn|day|dusk|night, weather: clear|cloudy|fog|rain|storm,
 *            huts: [{ key, name, place, ic, color, st, can }], onHut(key) }
 *   can：今天可以上這位老師的課（小屋前的地上亮一圈、老師會跳）
 *   closed：還沒開門（逐步開島），老師不在、門口掛「準備中」
 */
(function () {
  const HQ = (() => { try { const v = localStorage.getItem('island3dHQ'); if (v) return v === '1'; } catch (e) {} return !(navigator.deviceMemory && navigator.deviceMemory < 4); })();
  const CM = true, hsl = {};
  const lin = c => { if (!CM || !c || !c.convertSRGBToLinear) return c; c.getHSL(hsl); if (hsl.s > 0.05) c.setHSL(hsl.h, Math.min(1, hsl.s * 1.3), hsl.l); return c.convertSRGBToLinear(); };
  const std = (color, extra) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.85, metalness: 0 }, extra)); lin(m.color); lin(m.emissive); return m; };
  const FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function mesh(geo, mat, x, y, z, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (HQ) { m.castShadow = true; m.receiveShadow = true; } if (parent) parent.add(m); return m; }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function canvasTex(cv) { const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; if (CM) t.encoding = THREE.sRGBEncoding; return t; }
  function labelSprite(text, sub, color, hot) {
    const cv = document.createElement('canvas'), g = cv.getContext('2d');
    g.font = `700 44px ${FONT}`; const w1 = g.measureText(text).width;
    g.font = `600 32px ${FONT}`; const w2 = sub ? g.measureText(sub).width : 0;
    const W = Math.ceil(Math.max(w1, w2) + 52), H = sub ? 124 : 78;
    cv.width = W; cv.height = H;
    g.fillStyle = 'rgba(255,250,240,0.94)'; roundRect(g, 2, 2, W - 4, H - 4, 24); g.fill();
    g.fillStyle = color; g.fillRect(16, 10, 8, H - 20);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 44px ${FONT}`; g.fillText(text, W / 2 + 6, sub ? 40 : H / 2);
    if (sub) { g.font = `600 32px ${FONT}`; g.fillStyle = hot ? '#b5651d' : '#8a6a7a'; g.fillText(sub, W / 2 + 6, 90); }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(cv), depthTest: false, transparent: true, toneMapped: false }));
    const k = 0.0078; sp.scale.set(W * k, H * k, 1); sp.renderOrder = 10; return sp;
  }
  function avatarSprite(e, color, size) {
    const N = 192, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d');
    g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(N / 2, N / 2, N / 2 - 8, 0, Math.PI * 2); g.fill(); g.lineWidth = 12; g.strokeStyle = color; g.stroke();
    g.font = `${N * 0.56}px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, N / 2, N / 2 + 8);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(cv), transparent: true, toneMapped: false }));
    sp.scale.set(size, size, 1); return sp;
  }
  /** 平面上的字（招牌、暖簾） */
  function textPlane(text, w, h, bg, fg, px) {
    const cv = document.createElement('canvas'); cv.width = Math.round(w * 128); cv.height = Math.round(h * 128); const g = cv.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = fg; g.font = `800 ${px}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cv.width / 2, cv.height / 2 + 4);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: canvasTex(cv), toneMapped: false, side: THREE.DoubleSide }));
  }
  const softTex = (() => { let t; return () => { if (t) return t; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (t = new THREE.CanvasTexture(cv)); }; })();

  let renderer, guard = null, scene, camera, controls, clock, container, opts = {}, running = false, t = 0, framed = false;
  let hemi, sun, sky, sea, seaBase, foam, stars, moon, sunBall, rain, mist = [], steam = [], glass = [], lanterns = [], spin = [];
  let labelLayer, teachers = [], rings = [], boat, signature = '', envSig = '';
  const WY = -0.35;   // 海面高度

  // ---------- 島：沙灘、草地、小丘、步道 ----------
  // 小屋位置：門朝向中間的廣場；碼頭在正前方（+z）
  const HUTS = { kongming: [-2.7, -3.4], xiaomiao: [2.9, -3.5], alu: [-4.3, 1.2], einstein: [4.2, 1.0], yirong: [-4.3, -10.0], mi: [0, -11.2], guo: [4.3, -10.0] };
  const PLAZA = [0, 0.9], FACE = [0, 9];   // 門朝碼頭
  // 後來的三間（v2.48.2）住在主島正後方的岬角（11/5 擴島），和原本四間一樣 1.0 倍；中間的暗房往後退，名牌才不會黏在一起（美術顧問 10/29）。
  // 步道從廣場經過草廬和湯屋中間、小丘右邊，一路接到岬角再分到三間（PATH_VIA 是門口之前要經過的點，第一個是起點）。
  // 不加點光源，靜態網格全部合併（見 bakeNewHuts）。SMALL 是「後來的三間」的名單和大小
  const CAPE = { x: 0, z: -10.6, rx: 5.9, rz: 3.0 };   // 岬角草地的橢圓（沙灘再大 0.6）；和主島後半圈取外輪廓（凸包）連成一片，沒有腰
  const LABEL_AT = { mi: [0, 1.25, 0], guo: [0.6, 0, 0] }, FAR = { yirong: 1, mi: 1, guo: 1 };   // FAR：名牌不跟著距離變小（和鏡頭焦點附近的名牌一樣大）
  const SMALL = { yirong: 1, mi: 1, guo: 1 }, TRUNK = [1.05, -8.2], PATH_VIA = { yirong: [PLAZA, [1.0, -1.6], [1.25, -4.7], TRUNK], mi: [TRUNK], guo: [TRUNK] };
  const doorOf = k => { const h = HUTS[k], ry = Math.atan2(FACE[0] - h[0], FACE[1] - h[1]), d = 1.25 * (SMALL[k] || 1); return [h[0] + Math.sin(ry) * d, h[1] + Math.cos(ry) * d]; };
  function buildIsland(root) {
    const sand = std(0xe8cf98), grass = std(0x8cc56c), grass2 = std(0x9fd27e), rock = std(0x9a958c);
    const base = mesh(new THREE.CylinderGeometry(7.4, 8, 0.9, 40), sand, 0, -0.5, 0, root);
    base.userData.ground = true;
    const top = mesh(new THREE.CylinderGeometry(6.5, 6.9, 0.35, 40), grass, 0, -0.1, 0, root);
    top.userData.grass = true;
    buildCape(root, sand, grass, rock);
    // 後方的小丘
    const hill = mesh(new THREE.SphereGeometry(3.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), grass2, -1.9, -0.05, -5.6, root); hill.scale.set(0.68, 0.45, 0.55);   // 11/5 擴島：往左、變窄，步道從右邊上岬角 hill.userData.grass = true;
    // 海邊的石頭
    const r = rng(7);
    for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2; if (Math.abs(Math.sin(a) - 1) < 0.25) continue;
      const s = 0.25 + r() * 0.35, m = mesh(new THREE.DodecahedronGeometry(s, 0), rock, Math.cos(a) * (7.3 + r() * 0.5), -0.25, Math.sin(a) * (7.3 + r() * 0.5), root); m.rotation.set(r() * 3, r() * 3, 0); if (inCape(m.position.x, m.position.z)) { root.remove(m); m.geometry.dispose(); } }   // 岬角蓋住的石頭拿掉
    // 踏石步道：碼頭 → 廣場 → 四間小屋
    const stone = std(0xd8d2c4);
    const path = (a, b, gap) => { const dx = b[0] - a[0], dz = b[1] - a[1], n = Math.max(2, Math.round(Math.hypot(dx, dz) / (gap || 0.62)));
      for (let i = 1; i < n; i++) { const p = mesh(new THREE.CylinderGeometry(0.2 + (i % 2) * 0.04, 0.22, 0.06, 7), stone, a[0] + dx * i / n, 0.08, a[1] + dz * i / n, root); p.rotation.y = i; p.receiveShadow = true; p.castShadow = false; } };
    path([0, 6.4], PLAZA);
    Object.keys(HUTS).filter(k => !SMALL[k]).map(k => HUTS[k]).forEach(h => { const ry = Math.atan2(FACE[0] - h[0], FACE[1] - h[1]); path(PLAZA, [h[0] + Math.sin(ry) * 1.25, h[1] + Math.cos(ry) * 1.25]); });
    // 廣場：石燈籠、指路木牌
    const lan = new THREE.Group(); lan.position.set(PLAZA[0] - 0.9, 0, PLAZA[1] - 0.2); root.add(lan);
    const ls = std(0xbdb6aa);
    mesh(box(0.34, 0.12, 0.34), ls, 0, 0.12, 0, lan); mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6), ls, 0, 0.42, 0, lan);
    mesh(box(0.42, 0.08, 0.42), ls, 0, 0.7, 0, lan);
    const lg = std(0xfff1c9, { emissive: 0xffc861, emissiveIntensity: 0.2 }); glass.push(lg); mesh(box(0.26, 0.24, 0.26), lg, 0, 0.86, 0, lan);
    const cap = mesh(new THREE.ConeGeometry(0.36, 0.26, 4), ls, 0, 1.1, 0, lan); cap.rotation.y = Math.PI / 4;
    const sign = new THREE.Group(); sign.position.set(PLAZA[0] + 0.85, 0, PLAZA[1] - 0.1); root.add(sign);
    const wood = std(0x8a5a32);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 6), wood, 0, 0.65, 0, sign);
    [['草廬', -0.5, 1.15, 0.5], ['湯屋', 0.5, 1.0, -0.5], ['柑仔店', -0.5, 0.82, -0.3], ['NASA', 0.5, 0.66, 0.35]].forEach(([s, x, y, ry]) => {
      const p = textPlane(s, 0.62, 0.17, '#f4e7cc', '#5b3a1e', 15); p.position.set(x * 0.55, y, 0.07); p.rotation.y = ry; sign.add(p); });
  }
  const inCape = (x, z) => { const P = capeOutline(6.9, 0); let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };   // 在岬角的草地裡
  function capeOutline(r0, pad, full) {   // 主島後半圈（full：整圈）半徑 r0，和岬角橢圓的凸包，逆時針；點是 [x, z]
    const pts = [];
    if (full) for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; pts.push([Math.cos(a) * r0, Math.sin(a) * r0]); }
    else for (let i = 0; i <= 24; i++) { const a = Math.PI + i / 24 * Math.PI; pts.push([Math.cos(a) * r0, Math.sin(a) * r0]); }
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; pts.push([CAPE.x + Math.cos(a) * (CAPE.rx + pad), CAPE.z + Math.sin(a) * (CAPE.rz + pad)]); }
    pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
    pts.forEach(p => { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
    pts.slice().reverse().forEach(p => { while (hi.length > 1 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); });
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  function buildCape(root, sand, grass, rock) {
    // 沙、草各一塊：外輪廓往下擠出，頂面比主島低 2 公分（重疊的地方不會閃）。形狀的 y 是 -z，轉平以後剛好朝後
    [[sand, 7.4, 0.6, 0.9, -0.07], [grass, 6.5, 0, 0.35, 0.055]].forEach(([m, r0, pad, h, top]) => {
      const sh = new THREE.Shape(capeOutline(r0, pad).map(([x, z]) => new THREE.Vector2(x, -z)));
      const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 1 }); geo.rotateX(-Math.PI / 2);
      const k = mesh(geo, m, 0, top - h, 0, root); k.castShadow = false; k.userData[m === sand ? 'ground' : 'grass'] = true; });
    // 接合處兩側的沙洲，和沿岸幾顆石頭（同一個石頭材質、同一種幾何）
    [[-7.15, -7.4, -0.25], [7.15, -7.6, 0.25]].forEach(([x, z, ry]) => { const b = mesh(new THREE.CylinderGeometry(1, 1.15, 0.2, 16), sand, x, WY + 0.02, z, root); b.scale.set(0.6, 1, 1.5); b.rotation.y = ry; b.castShadow = false; });
    const r = rng(11);
    [[-7.1, -6.3, 0.42], [-6.9, -9.1, 0.3], [7.15, -6.6, 0.45], [6.85, -9.7, 0.28], [-6.5, -11.7, 0.36]].forEach(([x, z, sz]) => {
      const m = mesh(new THREE.DodecahedronGeometry(sz, 0), rock, x, -0.25, z, root); m.rotation.set(r() * 3, r() * 3, 0); m.castShadow = false; });
  }
  function foamGeo() {   // 從島中心往外打 96 條線，交到內、外兩條輪廓，連成一圈；平面在 xy 上（和 RingGeometry 一樣，外面再轉平）
    const hit = (P, a) => { const dx = Math.cos(a), dz = Math.sin(a); let best = 0;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [x1, z1] = P[j], [x2, z2] = P[i], ex = x2 - x1, ez = z2 - z1, den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) continue;
        const t = (x1 * ez - z1 * ex) / den, u = (x1 * dz - z1 * dx) / den; if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t); }
      return best; };
    const IN = capeOutline(7.9, 1.1, true), OUT = capeOutline(8.6, 1.8, true), N = 96, pos = [], idx = [];
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, ri = hit(IN, a), ro = hit(OUT, a); pos.push(Math.cos(a) * ri, -Math.sin(a) * ri, 0, Math.cos(a) * ro, -Math.sin(a) * ro, 0);
      const k = i * 2, n = ((i + 1) % N) * 2; idx.push(k, n, k + 1, n, n + 1, k + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  // ---------- 樹：松樹、竹子、楓樹 ----------
  function pine(x, z, s, root) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); root.add(g);
    mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 6), std(0x6b4a2b), 0, 0.3, 0, g);
    const leaf = std(0x3f7a45);
    [[0.7, 0.75, 0.8], [0.55, 0.65, 1.25], [0.38, 0.55, 1.65]].forEach(([r, h, y]) => mesh(new THREE.ConeGeometry(r, h, 7), leaf, 0, y, 0, g));
    return g;
  }
  function maple(x, z, s, root) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); root.add(g);
    mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.7, 6), std(0x6b4a2b), 0, 0.35, 0, g);
    const c = std(0xd9603b); mesh(new THREE.IcosahedronGeometry(0.55, 0), c, 0, 1.0, 0, g); mesh(new THREE.IcosahedronGeometry(0.38, 0), c, 0.3, 1.3, 0.1, g);
    return g;
  }
  function bamboo(x, z, root) {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    const stem = std(0x7fb062), leaf = std(0x5f9a4a), r = rng(Math.round(x * 100 + z * 7));
    for (let i = 0; i < 5; i++) { const h = 1.6 + r() * 0.8, px = (r() - 0.5) * 0.6, pz = (r() - 0.5) * 0.6;
      const s = mesh(new THREE.CylinderGeometry(0.04, 0.05, h, 5), stem, px, h / 2, pz, g); s.rotation.z = (r() - 0.5) * 0.12;
      for (let k = 0; k < 3; k++) { const l = mesh(new THREE.ConeGeometry(0.12, 0.45, 4), leaf, px + (k - 1) * 0.12, h * (0.6 + k * 0.15), pz, g); l.rotation.z = (k - 1) * 0.9; } }
    return g;
  }
  function buildTrees(root) {
    [[0.1, -5.5, 1.15], [-0.9, -5.9, 0.85], [-5.6, -1.8, 0.9], [5.7, -1.9, 0.95], [-2.4, 4.8, 0.75], [5.0, 4.1, 0.8], [-5.3, 3.7, 0.7]].forEach(p => pine(p[0], p[1], p[2], root));
    [[-0.2, -2.6, 0.75], [1.9, 4.2, 0.7], [-1.9, 3.0, 0.6]].forEach(p => maple(p[0], p[1], p[2], root));
  }

  // ---------- 四間小屋：門朝 +z 蓋好，再轉向廣場 ----------
  function winMat() { const m = std(0xfff1c9, { emissive: 0xffc861, emissiveIntensity: 0.2 }); glass.push(m); return m; }
  function hutKongming(g) {   // 茅草屋頂的草廬、竹林、門口的石桌和茶杯
    const wall = std(0xe9dcc0), wood = std(0x7a5236), straw = std(0xc9a25e);
    mesh(box(2.0, 0.14, 1.6), std(0x8f6a45), 0, 0.07, 0, g);
    mesh(box(1.8, 1.0, 1.4), wall, 0, 0.64, 0, g);
    [-0.9, 0.9].forEach(x => [-0.7, 0.7].forEach(z => mesh(box(0.1, 1.05, 0.1), wood, x, 0.64, z, g)));
    const roof = mesh(new THREE.ConeGeometry(1.75, 1.15, 4), straw, 0, 1.68, 0, g); roof.rotation.y = Math.PI / 4; roof.scale.set(1.05, 1, 0.9);
    mesh(new THREE.ConeGeometry(0.3, 0.3, 4), std(0xa8823f), 0, 2.32, 0, g).rotation.y = Math.PI / 4;
    mesh(box(0.5, 0.75, 0.04), std(0x6b4a2b), 0, 0.52, 0.72, g);
    const w = winMat(); [-0.55, 0.55].forEach(x => { const c = mesh(new THREE.CircleGeometry(0.17, 12), w, x, 0.78, 0.71, g); c.castShadow = false; });
    mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.36, 8), std(0xa9a39a), 0.6, 0.18, 1.35, g);
    [[0.52, 1.3], [0.7, 1.42]].forEach(([x, z]) => mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.07, 8), std(0xf6f1e6), x, 0.4, z, g));
    bamboo(-1.35, -0.5, g); bamboo(1.3, -0.7, g);
  }
  function hutXiaomiao(g) {   // 和風湯屋：深色瓦屋頂、木緣側、靛藍暖簾，旁邊有冒熱氣的露天溫泉
    const wall = std(0xf3ead6), wood = std(0x7a5a48), tile = std(0x4a4f5a);
    mesh(box(2.4, 0.18, 1.8), wood, 0, 0.09, 0.1, g);
    mesh(box(2.1, 1.0, 1.4), wall, 0, 0.66, 0, g);
    mesh(box(2.12, 0.1, 1.42), wood, 0, 1.12, 0, g);
    [-1.05, 1.05].forEach(x => [-0.7, 0.7].forEach(z => mesh(box(0.1, 1.05, 0.1), wood, x, 0.64, z, g)));
    const roof = mesh(new THREE.ConeGeometry(1.95, 0.75, 4), tile, 0, 1.52, 0, g); roof.rotation.y = Math.PI / 4; roof.scale.set(1.2, 1, 0.92);
    mesh(box(1.4, 0.08, 0.08), tile, 0, 1.9, 0, g);
    const noren = textPlane('♨', 0.62, 0.5, '#2f4f7a', '#ffffff', 44); noren.position.set(0, 0.86, 0.72); g.add(noren);
    mesh(box(0.66, 0.06, 0.06), wood, 0, 1.12, 0.73, g);
    const w = winMat(); [-0.68, 0.68].forEach(x => { const p = mesh(box(0.42, 0.34, 0.02), w, x, 0.78, 0.71, g); p.castShadow = false; });
    // 露天溫泉
    const pool = new THREE.Group(); pool.position.set(1.75, 0, 1.0); g.add(pool);
    const r = rng(3), rock = std(0x8f8a82);
    for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2; mesh(new THREE.DodecahedronGeometry(0.17 + r() * 0.07, 0), rock, Math.cos(a) * 0.62, 0.12, Math.sin(a) * 0.5, pool).rotation.set(r() * 3, r() * 3, 0); }
    const water = mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.08, 20), std(0x8fd3d6, { emissive: 0x4fb3b8, emissiveIntensity: 0.15, roughness: 0.2 }), 0, 0.14, 0, pool); water.scale.z = 0.82;
    for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), transparent: true, depthWrite: false, opacity: 0 }));
      s.userData = { x: pool.position.x + (r() - 0.5) * 0.6, z: pool.position.z + (r() - 0.5) * 0.4, ph: i / 6, host: g }; steam.push(s); g.add(s); }
  }
  function hutAlu(g) {   // 台灣的柑仔店：水泥牆、紅白遮雨棚、招牌、報紙架、糖果罐
    const wall = std(0xefe2c8), red = std(0xc0392b), white = std(0xfdfaf2), wood = std(0x6b4a2b);
    mesh(box(2.0, 0.12, 1.6), std(0xb9b3a8), 0, 0.06, 0.05, g);
    mesh(box(1.8, 1.35, 1.3), wall, 0, 0.8, -0.05, g);
    mesh(box(1.9, 0.1, 1.4), std(0x9c9488), 0, 1.52, -0.05, g);
    const sg = textPlane('柑仔店', 1.4, 0.36, '#c0392b', '#fff4c9', 34); sg.position.set(0, 1.3, 0.62); g.add(sg);
    for (let i = 0; i < 6; i++) { const s = mesh(box(0.3, 0.04, 0.55), i % 2 ? white : red, -0.75 + i * 0.3, 1.02, 0.86, g); s.rotation.x = 0.35; }
    const w = winMat(); const sh = mesh(box(1.3, 0.62, 0.02), w, 0, 0.6, 0.61, g); sh.castShadow = false;
    ['#2f9e8f', '#e98fb3', '#f1c40f', '#7fb3e6'].forEach((c, i) => { mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 10), std(new THREE.Color(c).getHex(), { roughness: 0.3 }), -0.45 + i * 0.3, 0.42, 0.74, g); });
    mesh(box(1.3, 0.06, 0.24), wood, 0, 0.3, 0.74, g);
    const rack = new THREE.Group(); rack.position.set(1.15, 0, 0.75); g.add(rack);
    mesh(box(0.42, 0.8, 0.12), wood, 0, 0.4, 0, rack);
    [0.6, 0.32].forEach(y => mesh(box(0.34, 0.2, 0.02), white, 0, y, 0.07, rack));
    mesh(box(0.5, 0.3, 0.35), std(0x2f6fae), -1.15, 0.15, 0.75, g);   // 冰箱（彈珠汽水）
    mesh(box(0.7, 0.08, 0.25), wood, -0.6, 0.28, 1.25, g);   // 長板凳
    [-0.88, -0.32].forEach(x => mesh(box(0.06, 0.26, 0.2), wood, x, 0.13, 1.25, g));
  }
  function hutEinstein(g) {   // NASA 分站：白色圓頂（會慢慢轉）、望遠鏡、碟形天線、黑板
    const white = std(0xf4f6f8), navy = std(0x2e3a59), grey = std(0xb8c0ca);
    mesh(new THREE.CylinderGeometry(1.05, 1.1, 1.0, 20), white, 0, 0.5, 0, g);
    const dome = new THREE.Group(); dome.position.y = 1.0; g.add(dome);
    mesh(new THREE.SphereGeometry(1.02, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0xdfe6ee), 0, 0, 0, dome);
    mesh(box(0.34, 1.0, 0.1), navy, 0, 0.55, 0.88, dome).rotation.x = -0.55;
    const scope = mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.0, 10), navy, 0, 0.9, 0.55, dome); scope.rotation.x = 0.75;
    spin.push({ m: dome, v: 0.12 });
    mesh(box(0.5, 0.72, 0.06), navy, 0, 0.36, 1.05, g);
    const sg = textPlane('NASA 分站', 0.9, 0.22, '#2e3a59', '#ffffff', 22); sg.position.set(0, 0.85, 1.08); sg.rotation.x = -0.08; g.add(sg);
    const w = winMat(); [-0.62, 0.62].forEach(x => { const p = mesh(new THREE.CircleGeometry(0.15, 14), w, x, 0.52, 0.98, g); p.rotation.y = x > 0 ? 0.55 : -0.55; p.castShadow = false; });
    const ant = new THREE.Group(); ant.position.set(1.5, 0, -0.5); g.add(ant);
    mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.3, 6), grey, 0, 0.65, 0, ant);
    const dish = new THREE.Group(); dish.position.y = 1.35; ant.add(dish);
    const d = mesh(new THREE.SphereGeometry(0.4, 14, 6, 0, Math.PI * 2, 0, 0.9), std(0xe4e8ee, { side: THREE.DoubleSide }), 0, 0, 0, dish); d.rotation.x = -1.1;
    spin.push({ m: dish, v: -0.35 });
    const bd = new THREE.Group(); bd.position.set(-1.35, 0, 0.75); bd.rotation.y = 0.5; g.add(bd);
    mesh(box(0.05, 0.9, 0.05), std(0x6b4a2b), -0.32, 0.45, 0, bd); mesh(box(0.05, 0.9, 0.05), std(0x6b4a2b), 0.32, 0.45, 0, bd);
    const chalk = textPlane('E=mc²', 0.7, 0.42, '#2f4a3a', '#f4f1e6', 22); chalk.position.set(0, 0.7, 0.03); bd.add(chalk);
  }
  // ---------- 三間新小屋：先用小零件蓋好，再由 bakeNewHuts 合併成幾個網格（draw call 只多幾個） ----------
  // P() 的零件只記顏色，合併時寫進頂點顏色；會發光的窗戶用 W() 和 glass 裡的材質（照原本的規則晚上變亮）
  let bakeMat = null, newWin = null, newSafe = null;
  const P = (geo, c, x, y, z, parent) => { const m = new THREE.Mesh(geo, bakeMat || (bakeMat = std(0xffffff, { vertexColors: true }))); m.userData.c = c; m.position.set(x || 0, y || 0, z || 0); parent.add(m); return m; };
  const W = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); parent.add(m); return m; };
  const winNew = () => newWin || (newWin = winMat());
  function hutYirong(g) {   // 老教室：長長的紅磚平房、灰黑瓦的人字屋頂、前面一排白柱子的走廊、木窗框、門上的班級牌（三年甲班）、門口的小黑板、走廊盡頭一口鐘
    const brick = 0xa9573f, wood = 0x7a5236, tile = 0x6b7075, white = 0xefe8da;
    P(box(2.7, 0.12, 1.75), 0xb9b3a8, 0, 0.06, 0, g);
    P(box(2.4, 0.95, 0.95), brick, 0, 0.6, -0.3, g);
    [-1, 1].forEach(sd => { P(box(2.7, 0.07, 0.8), tile, 0, 1.3, -0.3 + sd * 0.31, g).rotation.x = sd * 0.62; });   // 人字屋頂
    [-1.2, 1.2].forEach(x => { const gb = P(new THREE.ConeGeometry(0.52, 0.34, 3), brick, x, 1.24, -0.3, g); gb.rotation.set(0, 0, 0); gb.scale.set(0.12, 1, 1.05); });   // 山牆
    P(box(2.55, 0.08, 0.62), white, 0, 1.06, 0.45, g);   // 走廊的屋簷
    [-1.15, -0.4, 0.4, 1.15].forEach(x => P(box(0.11, 0.95, 0.11), white, x, 0.58, 0.68, g));   // 白柱子
    P(box(0.4, 0.75, 0.04), 0x5b3a1e, 0.78, 0.5, 0.19, g);   // 門
    const w = winNew(); [-0.85, -0.2].forEach(x => { W(box(0.42, 0.38, 0.02), w, x, 0.68, 0.19, g);
      P(box(0.48, 0.05, 0.05), wood, x, 0.89, 0.2, g); P(box(0.48, 0.05, 0.05), wood, x, 0.47, 0.2, g); P(box(0.04, 0.42, 0.05), wood, x, 0.68, 0.21, g); });
    const plate = textPlane('三年甲班', 0.46, 0.13, '#fbf8f0', '#2b2420', 14); plate.position.set(0.78, 0.94, 0.74); g.add(plate);   // 走廊屋簷下掛著班級牌
    const bd = new THREE.Group(); bd.position.set(0.62, 0, 1.05); bd.rotation.y = -0.3; g.add(bd);   // 門口的小黑板
    [-0.27, 0.27].forEach(x => { P(box(0.05, 0.8, 0.05), wood, x, 0.4, 0, bd).rotation.x = -0.1; });
    P(box(0.62, 0.44, 0.04), 0x2f4a3a, 0, 0.56, 0.03, bd);
    P(box(0.34, 0.025, 0.01), white, -0.05, 0.64, 0.055, bd); P(box(0.24, 0.025, 0.01), white, -0.1, 0.54, 0.055, bd);
    const bell = new THREE.Group(); bell.position.set(-1.5, 0, 0.62); g.add(bell);   // 走廊盡頭的鐘
    P(box(0.07, 1.25, 0.07), wood, 0, 0.62, 0, bell); P(box(0.36, 0.06, 0.06), wood, 0.15, 1.22, 0, bell);
    P(new THREE.CylinderGeometry(0.07, 0.13, 0.2, 8), 0xc9a24a, 0.27, 1.06, 0, bell);
  }
  function hutMi(g) {   // 暗房小屋：白牆平頂、小窗透著紅色安全燈、門口一張大木桌（攤開的詩集、一杯茶），旁邊晾著照片
    const wood = 0x7a5236;
    P(box(1.9, 0.12, 1.6), 0xb9b3a8, 0, 0.06, 0.05, g);
    P(box(1.6, 1.15, 1.25), 0xf4f2ee, 0, 0.7, -0.1, g);
    P(box(1.82, 0.1, 1.48), 0x6d6a66, 0, 1.32, -0.1, g).rotation.x = -0.06;
    P(box(0.48, 0.85, 0.04), 0x2f2a28, -0.4, 0.55, 0.53, g);
    if (!newSafe) { newSafe = std(0x7a1410, { emissive: 0xa8140c, emissiveIntensity: 0.6 }); glass.push(newSafe); }   // 紅色安全燈的窗（夜裡更亮）
    W(box(0.34, 0.3, 0.02), newSafe, 0.42, 0.86, 0.53, g);
    P(box(0.42, 0.05, 0.05), wood, 0.42, 0.69, 0.55, g);
    const tb = new THREE.Group(); tb.position.set(0.62, 0, 1.1); g.add(tb);   // 大木桌（在門口右邊，不擋步道）
    P(box(1.05, 0.07, 0.62), 0x8a5a32, 0, 0.5, 0, tb);
    [[-0.45, -0.24], [0.45, -0.24], [-0.45, 0.24], [0.45, 0.24]].forEach(([x, z]) => P(box(0.06, 0.48, 0.06), wood, x, 0.24, z, tb));
    [-0.13, 0.13].forEach((x, i) => { P(box(0.25, 0.02, 0.32), 0xfbf6e9, x, 0.55, 0, tb).rotation.z = i ? -0.08 : 0.08; });   // 攤開的詩集
    P(new THREE.CylinderGeometry(0.05, 0.04, 0.08, 6), 0x9fc3a0, 0.36, 0.58, 0.08, tb);   // 一杯茶
    P(box(0.86, 0.015, 0.015), 0x3a3330, 0.33, 1.2, 0.56, g);   // 正面窗戶上方晾著三張照片
    [[0.08, 0x5b5650], [0.33, 0xc9b48f], [0.58, 0x5b5650]].forEach(([x, c]) => P(box(0.15, 0.15, 0.012), c, x, 1.11, 0.565, g));   // 黑白和泛黃的相片，白牆上才看得到
  }
  function hutGuo(g) {   // 海邊物理治療所：木屋、藍綠色屋頂、門口曬毛巾、牆邊靠著一支滾筒
    const wood = 0x7a5236, teal = 0x4f8584;
    P(box(2.1, 0.14, 1.7), 0x9c7a52, 0, 0.07, 0.1, g);
    P(box(1.8, 1.0, 1.3), 0xc8995f, 0, 0.64, -0.05, g);
    [-0.25, 0.05, 0.35].forEach(y => P(box(1.82, 0.03, 1.32), 0xa97f4d, 0, 0.5 + y, -0.05, g));   // 木板接縫
    const roof = P(new THREE.ConeGeometry(1.65, 0.7, 4), teal, 0, 1.48, -0.05, g); roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.85);
    P(box(0.5, 0.78, 0.04), 0x5a3f2a, -0.35, 0.53, 0.61, g);
    W(box(0.46, 0.36, 0.02), winNew(), 0.45, 0.72, 0.61, g);
    const rk = new THREE.Group(); rk.position.set(0.25, 0, 1.15); g.add(rk);   // 曬毛巾的竿子
    [-0.55, 0.55].forEach(x => P(box(0.05, 0.85, 0.05), wood, x, 0.42, 0, rk));
    P(new THREE.CylinderGeometry(0.02, 0.02, 1.15, 6), wood, 0, 0.83, 0, rk).rotation.z = Math.PI / 2;
    [[-0.32, 0xf6f1e6], [0, 0xf2c94c], [0.32, 0x7fc4c6]].forEach(([x, c]) => P(box(0.26, 0.42, 0.02), c, x, 0.62, 0, rk));
    P(new THREE.CylinderGeometry(0.1, 0.1, 0.62, 8), teal, -0.98, 0.33, 0.45, g).rotation.z = 0.25;   // 牆邊的滾筒
  }
  /** 拿掉朝正下方的面（鏡頭最低只到水平線上方，永遠看不到），三角形少一成多 */
  function noBottom(geo) {
    const p = geo.attributes.position.array, n = geo.attributes.normal.array, keep = [];
    for (let t = 0; t < p.length / 9; t++) if (!(n[t * 9 + 1] < -0.99 && n[t * 9 + 4] < -0.99 && n[t * 9 + 7] < -0.99)) keep.push(t);
    if (keep.length * 9 === p.length) return geo;
    const out = new THREE.BufferGeometry(), P2 = new Float32Array(keep.length * 9), N2 = new Float32Array(keep.length * 9);
    keep.forEach((t, i) => { P2.set(p.subarray(t * 9, t * 9 + 9), i * 9); N2.set(n.subarray(t * 9, t * 9 + 9), i * 9); });
    out.setAttribute('position', new THREE.BufferAttribute(P2, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N2, 3)); geo.dispose(); return out;
  }
  /** 合併三間新小屋和它們的步道：身體一個網格（頂點顏色）、每種發光窗一個、踏石一個；小屋群組裡只留看不見的點擊範圍和有字的班級牌 */
  function bakeNewHuts(root) {
    const parts = {}, add = (key, mat, geo, color) => { const b = parts[key] || (parts[key] = { mat, geos: [] }); b.geos.push({ geo, color }); };
    // 每間小屋的身體各一個網格、放在小屋的位置：由近到遠排序時先畫，後面的草地被擋住就不用算（合成一個放在原點，幀率會多掉幾 %）
    root.updateMatrixWorld(true);
    Object.keys(SMALL).forEach(k => {
      const g = hutGroups[k], keep = [], inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
      g.traverse(m => { if (!m.isMesh) return;
        if (m.material.map) { keep.push([m, new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)]); return; }   // 有字的牌子留著
        const geo = noBottom((m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrixWorld)); m.geometry.dispose();
        if (m.material === bakeMat) add('body:' + k, bakeMat, geo, m.userData.c); else add(m.material.uuid, m.material, geo); });
      while (g.children.length) g.remove(g.children[0]);
      keep.forEach(([m, mx]) => { mx.decompose(m.position, m.quaternion, m.scale); g.add(m); });
      const hit = new THREE.Mesh(box(2.6, 2.0, 2.2), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(0, 1.0, 0.1); g.add(hit);   // 點得到小屋，但不畫
      const way = [...(PATH_VIA[k] || [PLAZA]), doorOf(k)];   // 踏石步道
      for (let w = 1; w < way.length; w++) { const a = way[w - 1], b = way[w], dx = b[0] - a[0], dz = b[1] - a[1], n = Math.max(2, Math.round(Math.hypot(dx, dz) / 0.62));
        for (let i = 1; i < n; i++) { const geo = new THREE.CylinderGeometry(0.2 + (i % 2) * 0.04, 0.22, 0.06, 7).toNonIndexed();
          geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(a[0] + dx * i / n, 0.08, a[1] + dz * i / n), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i), new THREE.Vector3(1, 1, 1)));
          add('stone', null, noBottom(geo), 0xd8d2c4); } }
    });
    Object.keys(parts).forEach(key => {
      const b = parts[key], N = b.geos.reduce((t, x) => t + x.geo.attributes.position.count, 0), pos = new Float32Array(N * 3), nor = new Float32Array(N * 3), col = b.geos[0].color != null ? new Float32Array(N * 3) : null;
      let o = 0; const c = new THREE.Color();
      b.geos.forEach(x => { const n = x.geo.attributes.position.count; pos.set(x.geo.attributes.position.array, o * 3); nor.set(x.geo.attributes.normal.array, o * 3);
        if (col) { c.setHex(x.color); lin(c); for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], (o + i) * 3); }
        o += n; x.geo.dispose(); });
      const ctr = new THREE.Vector3(); for (let i = 0; i < N; i++) { ctr.x += pos[i * 3]; ctr.z += pos[i * 3 + 2]; } ctr.multiplyScalar(1 / N);
      for (let i = 0; i < N; i++) { pos[i * 3] -= ctr.x; pos[i * 3 + 2] -= ctr.z; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.Mesh(geo, key === 'stone' ? std(0xffffff, { vertexColors: true }) : b.mat); m.position.copy(ctr); root.add(m);
      m.receiveShadow = HQ; m.castShadow = HQ && key.startsWith('body');   // 踏石、窗戶不投影（和原本一樣）
    });
  }
  const BUILD = { kongming: hutKongming, xiaomiao: hutXiaomiao, alu: hutAlu, einstein: hutEinstein, yirong: hutYirong, mi: hutMi, guo: hutGuo };
  const hutGroups = {};
  function buildHuts(root) {
    Object.keys(HUTS).forEach(k => {
      const [x, z] = HUTS[k], g = new THREE.Group(); g.position.set(x, 0, z);
      g.rotation.y = Math.atan2(FACE[0] - x, FACE[1] - z);
      g.userData.hut = k; BUILD[k](g); root.add(g); hutGroups[k] = g;
      if (SMALL[k]) { P(box(0.07, 0.62, 0.07), 0x5b3a1e, -0.95, 0.31, 1.3, g); P(box(0.24, 0.05, 0.24), 0x5b3a1e, -0.95, 0.66, 1.3, g); W(box(0.18, 0.2, 0.18), winNew(), -0.95, 0.79, 1.3, g); P(box(0.24, 0.05, 0.24), 0x5b3a1e, -0.95, 0.92, 1.3, g);   // 門口左邊的小燈籠（右邊站老師）
      g.scale.setScalar(SMALL[k]); return; }   // 新的三間只有窗戶自發光，不加點光源（點光源一多，整座島的光照都會變）
      const pl = new THREE.PointLight(0xffc27a, 0, 4.2, 1.6); pl.position.set(0, 1.0, 1.3); g.add(pl); lanterns.push(pl);
    });
    bakeNewHuts(root);
  }

  // ---------- 碼頭、渡船、遠方的本島 ----------
  function buildPier(root) {
    const plank = std(0xb08356), post = std(0x7a5236);
    for (let i = 0; i < 9; i++) mesh(box(1.2, 0.08, 0.42), i % 2 ? plank : std(0xa47a50), 0, 0.02, 6.5 + i * 0.45, root);
    for (let i = 0; i < 4; i++) [-0.62, 0.62].forEach(x => mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), post, x, -0.2, 6.6 + i * 1.15, root));
    // 鳥居
    const torii = new THREE.Group(); torii.position.set(0, 0, 6.0); root.add(torii);
    const red = std(0xc0392b);
    [-0.75, 0.75].forEach(x => mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.6, 8), red, x, 0.8, 0, torii));
    mesh(box(1.9, 0.12, 0.16), std(0x2b2b2b), 0, 1.66, 0, torii); mesh(box(1.7, 0.1, 0.12), red, 0, 1.38, 0, torii);
    const sg = textPlane('智慧島', 0.5, 0.2, '#fbf4e4', '#5b3a1e', 20); sg.position.set(0, 1.52, 0.08); torii.add(sg);
    // 渡船
    boat = new THREE.Group(); boat.position.set(1.35, WY, 9.0); boat.rotation.y = 0.1; root.add(boat);
    mesh(box(0.9, 0.3, 2.0), std(0xfdfaf2), 0, 0.12, 0, boat);
    mesh(box(0.92, 0.06, 2.02), std(0xc0392b), 0, 0.2, 0, boat);
    mesh(box(0.66, 0.4, 0.8), std(0xf1e6d2), 0, 0.47, -0.1, boat);
    mesh(box(0.72, 0.06, 0.9), std(0x2f6fae), 0, 0.7, -0.1, boat);
    const w = winMat(); [-0.34, 0.34].forEach(x => { const p = mesh(box(0.02, 0.16, 0.5), w, x, 0.5, -0.1, boat); p.castShadow = false; });
    // 遠方的本島（燈塔）
    const far = new THREE.Group(); far.position.set(-16, WY, -24); root.add(far);
    const farM = std(0x6f8a7a);
    mesh(new THREE.SphereGeometry(5, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), farM, 0, 0, 0, far).scale.y = 0.35;
    mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.6, 8), std(0xf4f1ea), 2.2, 1.9, 0, far);
    const beam = std(0xfff1c9, { emissive: 0xffd27a, emissiveIntensity: 0.4 }); glass.push(beam);
    mesh(box(0.3, 0.25, 0.3), beam, 2.2, 2.8, 0, far);
    far.traverse(o => { o.castShadow = false; });
  }

  // ---------- 天空、海、霧、雨 ----------
  function buildSky() {
    sky = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, toneMapped: false,
      uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() } },
      vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float h; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.05, 0.5, h)), 1.0); }' }));
    scene.add(sky);
    const geo = new THREE.PlaneGeometry(120, 120, 48, 48); geo.rotateX(-Math.PI / 2);
    seaBase = Float32Array.from(geo.attributes.position.array);
    sea = new THREE.Mesh(geo, std(0x5fa8cf, { roughness: 0.35, transparent: true, opacity: 0.95 })); sea.position.y = WY; sea.receiveShadow = HQ; scene.add(sea);
    foam = new THREE.Mesh(foamGeo(), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, toneMapped: false }));
    foam.rotation.x = -Math.PI / 2; foam.position.y = WY + 0.04; scene.add(foam);
    const sg = new THREE.BufferGeometry(), sp = [], r = rng(11);
    for (let i = 0; i < 260; i++) { const a = r() * Math.PI * 2, e = 0.12 + r() * 1.3, R = 80; sp.push(Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R); }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.9, toneMapped: false })); scene.add(stars);
    moon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfdf3c8, toneMapped: false })); moon.position.set(30, 34, -55); scene.add(moon);
    sunBall = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1b0, toneMapped: false })); sunBall.position.set(-34, 30, -55); scene.add(sunBall);
    // 霧：島邊慢慢飄的白霧（智慧島「霧散開」的樣子）
    for (let i = 0; i < 12; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), transparent: true, depthWrite: false, opacity: 0.35, toneMapped: false }));
      m.userData = { a: i / 12 * Math.PI * 2, r: 10 + (i % 3) * 2.5, y: 0.6 + (i % 2) * 0.8, v: 0.02 + (i % 4) * 0.008 }; m.scale.set(9, 3.2, 1); mist.push(m); scene.add(m); }
    const rg = new THREE.BufferGeometry(), rp = []; for (let i = 0; i < 500; i++) rp.push((r() - 0.5) * 30, r() * 16, (r() - 0.5) * 30);
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    rain = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xcfe3f2, size: 0.09, transparent: true, opacity: 0.7 })); rain.visible = false; scene.add(rain);
  }
  const SKY = { dawn: [0xf6c9a8, 0xfbe0c2], day: [0x8fcbea, 0xe3f3fa], dusk: [0xe9875a, 0xf5c48f], night: [0x141c36, 0x2a3560] };
  const SEA = { dawn: 0x7fa9c4, day: 0x5fa8cf, dusk: 0x6a7fa8, night: 0x22325a };
  function setEnvironment() {
    const ph = SKY[opts.phase] ? opts.phase : 'day', w = opts.weather || 'clear', wet = w === 'rain' || w === 'storm', night = ph === 'night';
    const k = ph + w; if (k === envSig) return; envSig = k;
    let [top, bot] = SKY[ph].map(c => lin(new THREE.Color(c)));
    if (wet || w === 'cloudy' || w === 'fog') { const g = lin(new THREE.Color(night ? 0x1c2333 : 0xa3adb8)); top.lerp(g, 0.65); bot.lerp(g, 0.55); }
    sky.material.uniforms.top.value.copy(top); sky.material.uniforms.bot.value.copy(bot);
    sea.material.color.copy(lin(new THREE.Color(wet ? 0x6f8797 : SEA[ph])));
    scene.fog = (w === 'fog' || wet) ? new THREE.Fog(bot.getHex(), 18, w === 'fog' ? 42 : 60) : new THREE.Fog(bot.getHex(), 40, 95);
    hemi.color.copy(lin(new THREE.Color(night ? 0x8090c8 : 0xffffff))); hemi.groundColor.copy(lin(new THREE.Color(0xc9a98a)));
    hemi.intensity = night ? 0.45 : wet ? 0.75 : 0.85;
    sun.color.copy(lin(new THREE.Color(ph === 'dusk' ? 0xffb07a : ph === 'dawn' ? 0xffd2a8 : night ? 0x9fb3ff : 0xfff2dd)));
    sun.intensity = night ? 0.35 : wet ? 0.5 : 1.25;
    renderer.toneMappingExposure = { dawn: 0.72, day: 0.68, dusk: 0.72, night: 0.95 }[ph] * (wet ? 1.12 : 1);
    stars.visible = night && !wet; moon.visible = night && !wet; sunBall.visible = !night && !wet && w !== 'fog';
    const lit = night ? 2.4 : ph === 'dusk' || wet ? 0.9 : 0.12;
    glass.forEach(m => { m.emissiveIntensity = lit; });
    lanterns.forEach(l => { l.intensity = night ? 1.3 : ph === 'dusk' || wet ? 0.5 : 0; });
    mist.forEach(m => { m.material.opacity = w === 'fog' ? 0.6 : night ? 0.16 : 0.32; m.material.color.set(night ? 0x8a94b8 : 0xffffff); });
    rain.visible = wet;
  }

  // ---------- 標籤、老師、可以上課的光圈（狀態一變就重畫） ----------
  function buildLabels() {
    if (labelLayer) scene.remove(labelLayer);
    labelLayer = new THREE.Group(); scene.add(labelLayer); teachers = []; rings = []; farLabels = [];
    (opts.huts || []).forEach(h => {
      const g = hutGroups[h.key]; if (!g) return;
      const lb = labelSprite(h.place + '・' + h.name, h.st, h.color, h.can); lb.position.set(g.position.x, g.position.z < 0 ? 3.35 : 2.3, g.position.z); if (LABEL_AT[h.key]) lb.position.add(new THREE.Vector3(...LABEL_AT[h.key])); lb.userData.hut = h.key; lb.userData.label = 1; labelLayer.add(lb); if (FAR[h.key]) { lb.userData.base = lb.scale.clone(); farLabels.push(lb); }   // 後排的標籤高一點，才不會被前排擋住
      // 老師站在門口（小苗站左邊，右邊是露天溫泉）
      const ry = g.rotation.y, side = h.key === 'xiaomiao' ? -0.55 : 0.35;
      const tx = g.position.x + Math.sin(ry) * 1.55 + Math.cos(ry) * side, tz = g.position.z + Math.cos(ry) * 1.55 - Math.sin(ry) * side;
      if (h.closed) {   // 還沒開門：門口立一塊「準備中」的木牌
        const sg = new THREE.Group(); sg.position.set(tx, 0, tz); sg.rotation.y = ry; sg.userData.hut = h.key; labelLayer.add(sg);
        const wood = std(0x7a5236);
        [-0.28, 0.28].forEach(x => mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 6), wood, x, 0.37, 0, sg));
        const pl = textPlane('準備中', 0.78, 0.32, '#f4e7cc', '#8a3a2a', 30); pl.position.set(0, 0.62, 0.04); sg.add(pl);
        return;
      }
      const sp = avatarSprite(h.ic, h.color, 0.95); sp.position.set(tx, 0.75, tz); sp.userData = { hut: h.key, can: h.can, y: 0.75, ph: teachers.length }; labelLayer.add(sp); teachers.push(sp);
      if (h.can) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 28), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(tx, 0.13, tz); labelLayer.add(ring); rings.push(ring);
      }
    });
  }

  // ---------- 點擊：拖曳轉動不算點 ----------
  let downAt = null; const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function onDown(e) { downAt = { x: e.clientX, y: e.clientY }; controls.autoRotate = false; }
  function onUp(e) {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) { downAt = null; return; }
    downAt = null;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera); ray.camera = camera;
    const hits = ray.intersectObjects([labelLayer, ...Object.values(hutGroups)], true);
    for (const h of hits) { let o = h.object; while (o && !o.userData.hut) o = o.parent; if (o) { if (opts.onHut) opts.onHut(o.userData.hut); return; } }
  }

  function resize() {
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!framed) { framed = true; camera.position.set(0, 11, 15.5).normalize().multiplyScalar(Math.min(32, 23 * Math.pow(Math.max(1, h / w), 0.75))); }
  }
  // v2.30 省電：系統開「減少動態效果」時，海浪、雲、船這些裝飾動畫停住（還是可以轉動、點選）；App 切到背景時不畫
  const CALM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // 岬角的名牌：照「離鏡頭的距離 ÷ 鏡頭到焦點的距離」放大，螢幕上和焦點附近的名牌一樣大（最多 2.5 倍、不縮小）；
  // 和其他名牌在螢幕上疊到（含 8px 間距）時淡到 0.4，點擊判定照舊
  let farLabels = []; const _v = new THREE.Vector3(), _boxes = [];
  function screenBox(lb) { _v.copy(lb.position).project(camera); const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    const d = camera.position.distanceTo(lb.position), f = h / (2 * Math.tan(camera.fov * Math.PI / 360)) / d;
    const x = (_v.x + 1) / 2 * w, y = (1 - _v.y) / 2 * h, hw = lb.scale.x * f / 2, hh = lb.scale.y * f / 2; return [x - hw - 4, y - hh - 4, x + hw + 4, y + hh + 4, _v.z]; }
  function fitFarLabels() {
    const ref = camera.position.distanceTo(controls.target);
    farLabels.forEach(lb => { const k = Math.min(2.5, Math.max(1, camera.position.distanceTo(lb.position) / ref)); lb.scale.copy(lb.userData.base).multiplyScalar(k); });
    _boxes.length = 0; labelLayer.children.forEach(o => { if (o.userData.label) _boxes.push([o, screenBox(o)]); });
    farLabels.forEach(lb => { const a = _boxes.find(x => x[0] === lb)[1], hit = _boxes.some(([o, b]) => o !== lb && b[4] < a[4] && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]);
      lb.material.opacity = hit ? 0.4 : 1; });
  }
  function loop() {
    if (!renderer.domElement.isConnected) { running = false; return; }
    if (document.hidden) { setTimeout(() => requestAnimationFrame(loop), 1000); return; }
    const dt = CALM ? 0 : Math.min(clock.getDelta(), 0.1); t += dt;
    const p = sea.geometry.attributes.position, a = p.array;
    for (let i = 0; i < a.length; i += 3) { const x = seaBase[i], z = seaBase[i + 2]; a[i + 1] = Math.sin(x * 0.35 + t * 1.1) * 0.08 + Math.cos(z * 0.3 + t * 0.8) * 0.08; }
    p.needsUpdate = true; sea.geometry.computeVertexNormals();
    foam.scale.setScalar(1 + Math.sin(t * 0.9) * 0.025); foam.material.opacity = 0.35 + Math.sin(t * 0.9) * 0.15;
    if (boat) { boat.position.y = WY + Math.sin(t * 1.3) * 0.05; boat.rotation.z = Math.sin(t * 0.9) * 0.04; }
    spin.forEach(s => { s.m.rotation.y += s.v * dt; });
    steam.forEach(s => { const u = (t * 0.25 + s.userData.ph) % 1; s.position.set(s.userData.x + Math.sin(u * 6 + s.userData.ph * 9) * 0.1, 0.3 + u * 1.3, s.userData.z); s.scale.setScalar(0.35 + u * 0.6); s.material.opacity = Math.sin(u * Math.PI) * 0.55; });
    mist.forEach(m => { const u = m.userData; u.a += u.v * dt; m.position.set(Math.cos(u.a) * u.r, u.y, Math.sin(u.a) * u.r); });
    teachers.forEach(s => { s.position.y = s.userData.y + (s.userData.can ? Math.abs(Math.sin(t * 2.4 + s.userData.ph)) * 0.22 : Math.sin(t * 1.2 + s.userData.ph) * 0.03); });
    if (farLabels.length) fitFarLabels();
    rings.forEach(r => { const k = 1 + (Math.sin(t * 2.4) + 1) * 0.12; r.scale.set(k, k, 1); r.material.opacity = 0.55 + Math.sin(t * 2.4) * 0.3; });
    if (rain.visible) { const ra = rain.geometry.attributes.position.array; for (let i = 1; i < ra.length; i += 3) { ra[i] -= dt * 14; if (ra[i] < WY) ra[i] += 16; } rain.geometry.attributes.position.needsUpdate = true; }
    controls.update(); renderer.render(scene, camera);
    if (guard) guard.frame();
    requestAnimationFrame(loop);
  }
  function mount(el, o) {
    container = el; opts = o || {};
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));   // v2.30 省電：上限 1.5
      if (CM) renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.7;
      if (HQ) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
      Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none' });
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
      camera.position.set(0, 11, 15.5);
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0.9, 0.8);
      controls.enableDamping = true; controls.enablePan = false;
      controls.minDistance = 9; controls.maxDistance = 32; controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.32;
      controls.autoRotate = true; controls.autoRotateSpeed = 0.35;
      hemi = new THREE.HemisphereLight(0xffffff, 0xc9a98a, 0.85); scene.add(hemi);
      sun = new THREE.DirectionalLight(0xfff2dd, 1.2); sun.position.set(-8, 14, 9);
      if (HQ) { sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -11.8, right: 8.2, top: 10, bottom: -10, near: 1, far: 40 }); sun.shadow.bias = -0.0008; }
      scene.add(sun);
      const root = new THREE.Group(); scene.add(root);
      buildSky(); buildIsland(root); buildTrees(root); buildHuts(root); buildPier(root);
      renderer.domElement.addEventListener('pointerdown', onDown);
      renderer.domElement.addEventListener('pointerup', onUp);
      window.addEventListener('resize', resize);
      clock = new THREE.Clock();
      if (window.FpsGuard) guard = FpsGuard.create({ renderer, hasShadow: HQ, shadows: on => { sun.castShadow = HQ && on; } });
    }
    el.appendChild(renderer.domElement);
    resize(); setEnvironment();
    const sig = JSON.stringify(opts.huts || []);
    if (sig !== signature) { signature = sig; buildLabels(); }
    if (!running) { running = true; clock.getDelta(); loop(); }
  }
  window.Wisdom3D = { mount };
})();

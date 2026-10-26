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

  let renderer, scene, camera, controls, clock, container, opts = {}, running = false, t = 0, framed = false;
  let hemi, sun, sky, sea, seaBase, foam, stars, moon, sunBall, rain, mist = [], steam = [], glass = [], lanterns = [], spin = [];
  let labelLayer, teachers = [], rings = [], boat, signature = '', envSig = '';
  const WY = -0.35;   // 海面高度

  // ---------- 島：沙灘、草地、小丘、步道 ----------
  // 小屋位置：門朝向中間的廣場；碼頭在正前方（+z）
  const HUTS = { kongming: [-2.7, -3.4], xiaomiao: [2.9, -3.5], alu: [-4.3, 1.2], einstein: [4.2, 1.0] };
  const PLAZA = [0, 0.9], FACE = [0, 9];   // 門朝碼頭
  function buildIsland(root) {
    const sand = std(0xe8cf98), grass = std(0x8cc56c), grass2 = std(0x9fd27e), rock = std(0x9a958c);
    const base = mesh(new THREE.CylinderGeometry(7.4, 8, 0.9, 40), sand, 0, -0.5, 0, root);
    base.userData.ground = true;
    const top = mesh(new THREE.CylinderGeometry(6.5, 6.9, 0.35, 40), grass, 0, -0.1, 0, root);
    top.userData.grass = true;
    // 後方的小丘
    const hill = mesh(new THREE.SphereGeometry(3.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), grass2, 0, -0.05, -5.3, root); hill.scale.set(1.0, 0.45, 0.55); hill.userData.grass = true;
    // 海邊的石頭
    const r = rng(7);
    for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2; if (Math.abs(Math.sin(a) - 1) < 0.25) continue;
      const s = 0.25 + r() * 0.35, m = mesh(new THREE.DodecahedronGeometry(s, 0), rock, Math.cos(a) * (7.3 + r() * 0.5), -0.25, Math.sin(a) * (7.3 + r() * 0.5), root); m.rotation.set(r() * 3, r() * 3, 0); }
    // 踏石步道：碼頭 → 廣場 → 四間小屋
    const stone = std(0xd8d2c4);
    const path = (a, b, gap) => { const dx = b[0] - a[0], dz = b[1] - a[1], n = Math.max(2, Math.round(Math.hypot(dx, dz) / (gap || 0.62)));
      for (let i = 1; i < n; i++) { const p = mesh(new THREE.CylinderGeometry(0.2 + (i % 2) * 0.04, 0.22, 0.06, 7), stone, a[0] + dx * i / n, 0.08, a[1] + dz * i / n, root); p.rotation.y = i; p.receiveShadow = true; p.castShadow = false; } };
    path([0, 6.4], PLAZA);
    Object.values(HUTS).forEach(h => { const ry = Math.atan2(FACE[0] - h[0], FACE[1] - h[1]); path(PLAZA, [h[0] + Math.sin(ry) * 1.25, h[1] + Math.cos(ry) * 1.25]); });
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
  const BUILD = { kongming: hutKongming, xiaomiao: hutXiaomiao, alu: hutAlu, einstein: hutEinstein };
  const hutGroups = {};
  function buildHuts(root) {
    Object.keys(HUTS).forEach(k => {
      const [x, z] = HUTS[k], g = new THREE.Group(); g.position.set(x, 0, z);
      g.rotation.y = Math.atan2(FACE[0] - x, FACE[1] - z);
      g.userData.hut = k; BUILD[k](g); root.add(g); hutGroups[k] = g;
      const pl = new THREE.PointLight(0xffc27a, 0, 4.2, 1.6); pl.position.set(0, 1.0, 1.3); g.add(pl); lanterns.push(pl);
    });
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
    foam = new THREE.Mesh(new THREE.RingGeometry(7.9, 8.6, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, toneMapped: false }));
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
    labelLayer = new THREE.Group(); scene.add(labelLayer); teachers = []; rings = [];
    (opts.huts || []).forEach(h => {
      const g = hutGroups[h.key]; if (!g) return;
      const lb = labelSprite(h.place + '・' + h.name, h.st, h.color, h.can); lb.position.set(g.position.x, g.position.z < 0 ? 3.35 : 2.3, g.position.z); lb.userData.hut = h.key; labelLayer.add(lb);   // 後排的標籤高一點，才不會被前排擋住
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
    rings.forEach(r => { const k = 1 + (Math.sin(t * 2.4) + 1) * 0.12; r.scale.set(k, k, 1); r.material.opacity = 0.55 + Math.sin(t * 2.4) * 0.3; });
    if (rain.visible) { const ra = rain.geometry.attributes.position.array; for (let i = 1; i < ra.length; i += 3) { ra[i] -= dt * 14; if (ra[i] < WY) ra[i] += 16; } rain.geometry.attributes.position.needsUpdate = true; }
    controls.update(); renderer.render(scene, camera);
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
      if (HQ) { sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 }); sun.shadow.bias = -0.0008; }
      scene.add(sun);
      const root = new THREE.Group(); scene.add(root);
      buildSky(); buildIsland(root); buildTrees(root); buildHuts(root); buildPier(root);
      renderer.domElement.addEventListener('pointerdown', onDown);
      renderer.domElement.addEventListener('pointerup', onUp);
      window.addEventListener('resize', resize);
      clock = new THREE.Clock();
    }
    el.appendChild(renderer.domElement);
    resize(); setEnvironment();
    const sig = JSON.stringify(opts.huts || []);
    if (sig !== signature) { signature = sig; buildLabels(); }
    if (!running) { running = true; clock.getDelta(); loop(); }
  }
  window.Wisdom3D = { mount };
})();

/* 會考小島：核心主島 3D（家人島第二階段 2a，爸爸 草圖 2026-10-26）
 * 台灣形狀的主島，五棟建物照台灣的地理放：北端交易所、西北教會、西岸媽祖廟、西南港口、中央玉山聚會所。
 * 主島外面的海上是列島：她的島、每位家人的島、智慧島，從港口有渡船航線連過去。
 * 只有點了「主島」才下載這個檔（工程顧問條件：她的 index.html 不變大、打開 App 不多載入）；全島 3,000 個三角形以內。
 * MainIsle3D.mount(el, ctx)：ctx = {
 *   env: { phase, weather }, places: { port|hall|temple|church|exchange: { name, sub, closed } },
 *   isles: [{ key, name, sub, slot, a（方位，角度÷π）, mine, open }], onPlace(key), onIsle(key) }
 * 去主島、廟、教會都沒有獎勵；這裡不畫紅點、不閃。
 */
(function () {
  // 台灣外形：經緯度關鍵點（順時針，從北端富貴角開始），Catmull-Rom 平滑成 120 點
  const TW = [[121.56, 25.30], [121.75, 25.15], [121.93, 25.02], [121.85, 24.85], [121.83, 24.60], [121.86, 24.50], [121.70, 24.20], [121.62, 23.98],
    [121.55, 23.60], [121.45, 23.30], [121.37, 23.05], [121.18, 22.80], [120.95, 22.50], [120.88, 22.25], [120.85, 21.90], [120.70, 21.95],
    [120.63, 22.30], [120.45, 22.50], [120.27, 22.62], [120.17, 22.95], [120.10, 23.10], [120.15, 23.40], [120.20, 23.70], [120.35, 24.00],
    [120.50, 24.25], [120.70, 24.60], [120.90, 24.85], [121.05, 25.05], [121.30, 25.15], [121.40, 25.25]];
  const LON0 = 121.0, LAT0 = 23.6, K = 7.6, COS = Math.cos(LAT0 * Math.PI / 180);
  const xz = (lon, lat) => ({ x: (lon - LON0) * COS * K, z: -(lat - LAT0) * K });   // 北邊在 -z（鏡頭從南方看過去）
  // 五棟建物：爸爸 草圖的位置
  const PLACE = {
    exchange: Object.assign(xz(121.55, 25.03), { ic: '🧮' }),   // 北端（台北）
    church: Object.assign(xz(121.02, 22.72), { ic: '' }),     // 台東（爸爸 10/27 從新竹一帶搬過來，和預留空位對調）
    temple: Object.assign(xz(120.45, 24.05), { ic: '' }),   // 媽祖廟、教會的名牌不放圖示，兩邊對等（美術 10/30）     // 西岸中部（鹿港）
    port: Object.assign(xz(120.22, 23.00), { ic: '🎈' }),       // 西南（安平）：飛船碼頭（10/27 主島浮空）
    hall: Object.assign(xz(120.96, 23.47), { ic: '🏔️', top: 2.6 })   // 玉山山頂（爸爸 10/27：聚會所在山上，不是山旁邊）
  };
  // 預留 5 個建物空位（10/27 決定）：先不畫，只讓樹避開；以後新增建物就放進其中一格
  const SPARE = [xz(121.75, 24.70), xz(121.25, 23.25), xz(120.98, 24.72), xz(120.74, 22.02), xz(120.80, 24.30)];
  const TREES = [];
  const LIFT = 3.5;   // 主島完全浮在空中、脫離海面（爸爸 10/27）：整座島和名牌抬高這麼多；底下照舊是整片海
  const PEAK = xz(120.96, 23.47);   // 玉山
  const RIDGE = [[121.55, 24.85, 1.6], [121.40, 24.55, 2.0], [121.28, 24.25, 2.4], [121.15, 23.95, 2.6], [120.82, 23.20, 2.6], [120.80, 22.90, 2.2], [120.78, 22.55, 1.6], [120.80, 22.25, 1.1]];
  // 列島：以主島為中心，各島方位固定（爸爸 2026-10-26：她東、爸爸西、媽媽南、姐姐北、姑姑西南；s.a 是角度÷π，0 東、0.5 南、1 西、-0.5 北）
  const RX = 13.5, RZ = 19;   // 列島排成橢圓（主島南北長），直式手機也放得下

  let renderer, scene, camera, controls, clock, container, ctx, root, isleLayer, labelLayer, water, hemi, sun, glassMat;
  let guard = null;   // 自動調畫質（v2.39 共用的 fpsguard.js）；主島沒有影子，只調解析度
  let running = false, boat = null, downAt = null, sigIsles = '', mist = null, rain = null, flash = 0;
  const CALM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const hsl = {};
  const lin = c => { if (!c || !c.convertSRGBToLinear) return c; c.getHSL(hsl); if (hsl.s > 0.05) c.setHSL(hsl.h, Math.min(1, hsl.s * 1.3), hsl.l); return c.convertSRGBToLinear(); };
  const std = (color, extra) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.85, metalness: 0 }, extra)); lin(m.color); lin(m.emissive); return m; };
  const M = {};
  const mat = (k, c, x) => M[k] || (M[k] = std(c, x));
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x || 0, (y || 0) + h / 2, z || 0); return b; };
  function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

  function outline() {
    const n = TW.length, P = TW.map(p => xz(p[0], p[1])), out = [];
    const cr = (a, b, c, d, t, k) => 0.5 * (2 * b[k] + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t * t * t);
    for (let i = 0; i < n; i++) for (let s = 0; s < 4; s++) {
      const a = P[(i + n - 1) % n], b = P[i], c = P[(i + 1) % n], d = P[(i + 2) % n], t = s / 4;
      out.push({ x: cr(a, b, c, d, t, 'x'), z: cr(a, b, c, d, t, 'z') });
    }
    return out;
  }
  function slab(pts, scale, depth, y, m) {
    const sh = new THREE.Shape();
    pts.forEach((p, i) => { const x = p.x * scale, yy = -p.z * scale; if (i) sh.lineTo(x, yy); else sh.moveTo(x, yy); });
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(g, m); mesh.position.y = y; return mesh;
  }

  // 浮空群島（FLOAT_v1）：幾個小網格合成一個（雲海、岩底、瀑布各 1 個 draw call），頂點顏色依高度上亮下暗
  function merged(parts) {
    const P = [], N = [], C = [], c = new THREE.Color();
    parts.forEach(p => {
      p.geo.applyMatrix4(p.m); const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
      g.computeBoundingBox(); const y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y, a = g.attributes.position.array, n = g.attributes.normal.array;
      for (let i = 0; i < a.length; i += 3) { P.push(a[i], a[i + 1], a[i + 2]); N.push(n[i], n[i + 1], n[i + 2]); c.copy(p.bot).lerp(p.top, y1 > y0 ? (a[i + 1] - y0) / (y1 - y0) : 1); C.push(c.r, c.g, c.b); }
      if (g !== p.geo) g.dispose(); p.geo.dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    return out;
  }
  const at = (x, y, z, sx, sy, sz, ry) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry || 0), new THREE.Vector3(sx, sy, sz));
  const linC = h => new THREE.Color(h).convertSRGBToLinear();
  // 雲海：下層一大片暗底＋12 片扁平的雲（每片 16 個三角形），三種大小、兩層高度、相鄰重疊三成以上（美術 10/29）；雲不動
  // 顏色自己算在頂點上（不受光、不套色調映射、平滑）：上亮下暗只差一點；越往外越接近天色，外緣就是天色，看不到雲海的邊（不透明，工程顧問 10/29）
  // 雲色：總覽的雲只吃三成天色、其餘是紙米白；晚上比天空亮一階；雨天灰（美術 10/29）
  const FLOAT = { pebble: 0, puffs: 1, seaN: 9 };   // 三角形超過時照這個順序減：浮石、雲海片數、小島的浮雲留 1 朵（工程顧問 10/29）
  const PAPER = 0xfffdf8, CLOUD_NIGHT = 0x56659c, CLOUD_WET = 0xa7b0b8;
  let cloudSea = null, cloudBase = null, puffs = null, puffBase = null, lastCloud = null, lastSky = null, lodTrees = [], lodFar = false, mistOn = false;
  function buildCloudSea() {
    const r = rng(97), parts = [], one = new THREE.Color(1, 1, 1), dim = new THREE.Color(0.9, 0.9, 0.9);
    parts.push({ geo: new THREE.CircleGeometry(95, 12).rotateX(-Math.PI / 2), m: at(0, -8.6, 0, 1, 1, 1), top: dim, bot: dim });   // 縫隙底下的暗底
    const ring = [[0, 0, 22, -6.8]].concat(
      [0, 1, 2, 3, 4, 5].map(i => { const a = i / 6 * Math.PI * 2 + 0.3; return [Math.cos(a) * 24, Math.sin(a) * 30, 19 + r() * 4, -7.4]; }),
      [0, 1, 2, 3, 4].map(i => { const a = i / 5 * Math.PI * 2 + 0.9; return [Math.cos(a) * 50, Math.sin(a) * 54, 30 + r() * 5, -8.1]; })).slice(0, FLOAT.seaN);   // 雲海放低，島的岩底整個露出來、浮在雲上
    ring.forEach(([x, z, R, y]) => parts.push({ geo: new THREE.SphereGeometry(1, 8, 2), m: at(x, y, z, R * (1.15 + r() * 0.2), 1.6 + R * 0.04, R, r() * 3), top: one, bot: dim }));
    const geo = merged(parts); cloudBase = shadeOf(geo, true);   // 離中心 45 以內是雲色，75 以外就是天色（地平線柔和）
    cloudSea = new THREE.Mesh(geo, M.cloudSea = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false }));   // 遠近已經算在頂點色裡，不再疊場景的霧
    scene.add(cloudSea);
  }
  function shadeOf(geo, far) {   // 每個頂點：明暗（0.9～1）、換成天色的比例
    const a = geo.attributes.position.array, n = geo.attributes.normal.array, c = geo.attributes.color.array, cnt = a.length / 3, b = new Float32Array(cnt * 2);
    for (let i = 0; i < cnt; i++) b[i * 2] = c[i * 3] * (0.94 + 0.06 * Math.max(0, n[i * 3 + 1])), b[i * 2 + 1] = far ? Math.max(0, Math.min(1, (Math.hypot(a[i * 3], a[i * 3 + 2]) - 45) / 30)) : 0;
    return b;
  }
  function paint(mesh, base, cloud, sky) {
    const col = mesh.geometry.attributes.color, c = col.array, t = new THREE.Color();
    for (let i = 0; i < base.length / 2; i++) { t.copy(cloud).multiplyScalar(base[i * 2]).lerp(sky, base[i * 2 + 1]); c[i * 3] = t.r; c[i * 3 + 1] = t.g; c[i * 3 + 2] = t.b; }
    col.needsUpdate = true;
  }
  function paintClouds(cloud, sky) {   // 天色一變就重算頂點色（雲海約 300 個頂點、島邊的浮雲約 300 個）
    lastCloud = cloud; lastSky = sky;
    if (cloudSea) paint(cloudSea, cloudBase, cloud, sky);
    if (puffs) paint(puffs, puffBase, cloud, sky);
  }
  // 拿掉一層物件並釋放 GPU 資源：名牌的貼圖和材質、各島自己的 geometry；共用的材質（mat() 快取、星星）和 Sprite 的 geometry 不丟
  function clearLayer(L) {
    while (L.children.length) {
      const c = L.children[0]; L.remove(c);
      c.traverse(o => {
        if (o.isSprite) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
        else if (o.geometry) o.geometry.dispose();
      });
    }
  }
  function labelSprite(text, sub, opts) {
    opts = opts || {};
    const cv = document.createElement('canvas'), g = cv.getContext('2d');
    const font = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
    g.font = `700 44px ${font}`; const w1 = g.measureText(text).width;
    g.font = `500 32px ${font}`; const w2 = sub ? g.measureText(sub).width : 0;
    const W = Math.ceil(Math.max(w1, w2) + 48), H = sub ? 120 : 76;
    cv.width = W; cv.height = H;
    g.fillStyle = opts.bg || 'rgba(255,255,255,0.92)';
    g.beginPath(); const r = 22; g.moveTo(2 + r, 2); g.arcTo(W - 2, 2, W - 2, H - 2, r); g.arcTo(W - 2, H - 2, 2, H - 2, r); g.arcTo(2, H - 2, 2, 2, r); g.arcTo(2, 2, W - 2, 2, r); g.fill();
    g.fillStyle = opts.color || '#741b47'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 44px ${font}`; g.fillText(text, W / 2, sub ? 40 : H / 2);
    if (sub) { g.font = `500 32px ${font}`; g.fillStyle = '#8a6a7a'; g.fillText(sub, W / 2, 88); }
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, toneMapped: false }));
    const k = (opts.scale || 1) * 0.012; sp.scale.set(W * k, H * k, 1); sp.renderOrder = 10;
    return sp;
  }

  // ---------- 五棟建物（每棟一個 group，userData.place 是點了要開的地方） ----------
  let glowK = 0.8;
  const lampMat = () => M.lamp || (M.lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf2bf55).multiplyScalar(glowK), toneMapped: false }));   // BUILD_v1：三棟共用的夜光
  function windows(g, n, w, y, z, h) { for (let i = 0; i < n; i++) g.add(box(0.16, h || 0.22, 0.04, glassMat, (i - (n - 1) / 2) * w, y, z)); }
  function exchange() {   // 交易所：白色石造、正面四根柱子、三角山牆（爸爸 草圖：三排窗）
    const g = new THREE.Group(), stone = mat('stone', 0xeee6d6), dark = mat('roofGrey', 0x7d7f86);
    g.add(box(1.8, 1.2, 1.2, stone));
    for (let i = 0; i < 4; i++) g.add(box(0.14, 0.9, 0.14, mat('col', 0xffffff), -0.6 + i * 0.4, 0.1, 0.66));
    const ped = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.45, 4, 1), dark); ped.rotation.y = Math.PI / 4; ped.scale.set(1.1, 1, 0.75); ped.position.y = 1.42; g.add(ped);
    windows(g, 3, 0.45, 0.62, 0.61); windows(g, 3, 0.45, 0.25, 0.61);
    return g;
  }
  function church() {   // 教會（公東教堂風，遠版 ≤84）：清水混凝土方塊、頂樓斜屋頂小堂、白十字、彩色格窗帶、戶外斜梯
    const g = new THREE.Group(), conc = mat('concrete', 0xc9c6bf), white = mat('crossWhite', 0xf6f6f2);
    g.add(box(1.3, 1.45, 1.0, conc));
    const chap = box(0.75, 0.42, 0.65, conc, 0.15, 1.45, -0.1); g.add(chap);
    const roof = box(0.85, 0.08, 0.78, mat('roofDark', 0x4a3b36), 0.15, 1.9, -0.1); roof.rotation.z = 0.22; g.add(roof);
    g.add(box(0.06, 0.42, 0.06, white, 0.35, 1.98, -0.1)); g.add(box(0.24, 0.06, 0.06, white, 0.35, 2.28, -0.1));   // 十字架（和廟的剪黏一樣大）
    g.add(box(0.9, 0.5, 0.05, lampMat(), -0.05, 0.55, 0.51));   // 正面的彩色格窗帶（近版才分成 3×4 格）
    const st = box(0.22, 0.06, 1.2, conc, -0.76, 0.65, 0); st.rotation.x = -0.9; g.add(st);   // 戶外斜梯
    return g;
  }
  function temple() {   // 媽祖廟（鹿港天后宮風，遠版 ≤156）：紅牆三開間、屋頂中高兩低、燕尾更翹、兩盞燈籠
    const g = new THREE.Group(), red = mat('templeRed', 0xc8372d), tile = mat('tile', 0xe0782f), gold = mat('gold', 0xf2c14e);
    g.add(box(1.8, 0.2, 1.2, mat('step', 0xd9cbb4)));
    g.add(box(1.5, 0.72, 0.9, red, 0, 0.2, 0));
    const ridge = (w, h, y, x) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(h, h, w, 3, 1), tile); r.rotation.z = Math.PI / 2; r.scale.set(1, 1, 0.85); r.position.set(x, y, 0); g.add(r); };
    ridge(0.9, 0.55, 1.35, 0); ridge(0.62, 0.42, 1.12, -0.72); ridge(0.62, 0.42, 1.12, 0.72);   // 三川脊：中間高、兩側低
    const ridgeC = mat('tileDeep', 0xc0601f);   // 屋脊和燕尾用瓦橘深一階，金色只留門楣和簷下橫帶（美術 10/30）
    g.add(box(1.5, 0.06, 0.05, gold, 0, 0.86, 0.47));   // 簷下金色橫帶
    [-1, 1].forEach(s => { const tail = box(0.08, 0.25, 0.07, ridgeC, s * 0.5, 1.6, 0); tail.rotation.z = -s * 0.85; g.add(tail);   // 燕尾：短四成、角度照舊（美術 10/30：不要像牛角）
      const lan = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 3), lampMat()); lan.position.set(s * 0.45, 0.82, 0.55); g.add(lan); });
    g.add(box(0.5, 0.48, 0.05, mat('door', 0x7a2a1f), 0, 0.2, 0.46));
    return g;
  }
  function port() {   // 飛船碼頭（主島浮在空中，10/27）：伸出島邊的木棧橋、碼頭小屋、一艘小飛船
    const g = new THREE.Group(), wood = mat('wood', 0x9a6b43);
    g.add(box(0.9, 0.7, 0.8, mat('hut', 0xf4ead8), 0, 0, 0));
    const r = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.45, 4, 1), mat('roofBlue', 0x3f6fa8)); r.rotation.y = Math.PI / 4; r.position.y = 0.92; g.add(r);
    windows(g, 2, 0.35, 0.3, 0.41);
    const pier = box(0.45, 0.1, 2.6, wood, -1.0, -0.25, 1.0); pier.rotation.y = 0.6; g.add(pier);
    boat = new THREE.Group();
    boat.add(box(0.42, 0.2, 0.7, mat('hull', 0xffffff)));   // 吊艙
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.08), glassMat); win.position.set(0, 0.1 + 0.02, 0.355 + 0.01); win.castShadow = false; boat.add(win);   // 小窗 [0.2, 0.08, 0.02, 0.02, 0.355]：和智慧島 AIRSHIP.win 同一組（相對吊艙中心，吊艙中心 y = 0.1）；做成一片平面貼在盒子正面的位置（+2 三角形，工程顧問 10/30），從後面看本來就被吊艙擋住；用窗戶的 glassMat，跟著天色亮
    const bal = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 4), mat('balloon', 0xe0782f)); bal.scale.set(0.9, 0.75, 1.6); bal.position.y = 0.75; boat.add(bal);   // 氣囊
    boat.add(box(0.03, 0.4, 0.03, mat('wood', 0x9a6b43), -0.15, 0.25, 0)); boat.add(box(0.03, 0.4, 0.03, mat('wood', 0x9a6b43), 0.15, 0.25, 0));
    boat.position.set(-1.9, -0.25, 2.0); boat.rotation.y = 0.6; g.add(boat);
    return g;
  }
  function hall() {   // 玉山聚會所：木造大屋頂（草圖的三角形屋頂），門口一塊公告板
    const g = new THREE.Group(), wood = mat('hallWood', 0xb07a4a);
    g.add(box(1.5, 0.6, 1.2, wood));
    const r = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.2, 4, 1), mat('hallRoof', 0x5b4636)); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.85); r.position.y = 1.2; g.add(r);
    g.add(box(0.5, 0.45, 0.05, mat('board', 0x6a8f5a), 0.95, 0.15, 0.7));
    g.add(box(0.05, 0.45, 0.05, wood, 0.95, -0.15, 0.7));
    windows(g, 2, 0.6, 0.25, 0.61);
    return g;
  }
  const BUILD = { exchange, church, temple, port, hall };
  // 近版（BUILD_v1）：每棟一個細節網格＋一個發光網格；第一次需要時才建（工程顧問 10/29）
  const PAL = { templeRed: 0xc8372d, pillar: 0x9e2a22, plinth: 0xd9cbb4, gold: 0xf2c14e, door: 0x7a2a1f, jade: 0x2f8a6a, ai: 0x2f5f8a, concrete: 0xc9c6bf, line: 0xb9b5ad, dark: 0x3d3a36,
    wash: 0xd8cfbf, washLine: 0xc4baa8, frame: 0x2f5d62, medal: 0xb8ad98,
    shu: 0xc8452d, yamabuki: 0xd9a03a, matcha: 0x4f7a3e, glassAi: 0x2f5f8a, lamp: 0xffd98a, lampWarm: 0xf2bf55 };   // 新顏色（美術 10/29；色票表 C.*）
  const NEAR_IN = 16, NEAR_OUT = 19;
  const near = {};   // k → { body, glow, on }
  const bx = (w, h, d, c, x, y, z, rz, ry, glow) => ({ geo: new THREE.BoxGeometry(w, h, d), m: new THREE.Matrix4().compose(new THREE.Vector3(x || 0, (y || 0) + h / 2, z || 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry || 0, rz || 0)), new THREE.Vector3(1, 1, 1)), top: linC(c), bot: linC(c), glow });
  const disc = (r, n, half, c, x, y, z, glow) => ({ geo: new THREE.CircleGeometry(r, n, 0, half ? Math.PI : Math.PI * 2), m: new THREE.Matrix4().makeTranslation(x, y, z), top: linC(c), bot: linC(c), glow });
  const quad = (w, h, c, x, y, z) => ({ geo: new THREE.PlaneGeometry(w, h), m: new THREE.Matrix4().makeTranslation(x, y, z), top: linC(c), bot: linC(c), glow: 1 });
  const NEAR = {
    temple: () => [   // 三川殿正面 4 根紅柱和石柱礎、兩側小門、屋脊剪黏、門楣
      ...[-0.68, -0.35, 0.35, 0.68].map(x => bx(0.09, 0.64, 0.09, PAL.pillar, x, 0.28, 0.52)), bx(1.5, 0.08, 0.14, PAL.plinth, 0, 0.2, 0.52),   // 深一階的紅柱＋石柱礎（石階色）
      bx(0.26, 0.38, 0.04, PAL.door, -0.53, 0.2, 0.465), bx(0.26, 0.38, 0.04, PAL.door, 0.53, 0.2, 0.465),
      bx(0.15, 0.15, 0.06, PAL.jade, -0.11, 1.6, 0, Math.PI / 4), bx(0.15, 0.15, 0.06, PAL.ai, 0.11, 1.6, 0, Math.PI / 4),
      bx(0.5, 0.06, 0.03, PAL.gold, 0, 0.6, 0.49)],   // 門楣（金）
    church: () => {   // 正面 3×4 彩色玻璃格窗（固定的不規則排列）、入口深色門、戶外斜梯的踏階、側面兩道細長窗、樓層線
      const C = [PAL.shu, PAL.yamabuki, PAL.matcha, PAL.glassAi], O = [0, 2, 1, 3, 3, 0, 2, 1, 1, 3, 0, 2], out = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) out.push(quad(0.17, 0.12, C[O[r * 4 + c]], -0.05 + (c - 1.5) * 0.21, 0.66 + r * 0.15, 0.54));
      out.push(bx(0.3, 0.44, 0.04, PAL.dark, 0.42, 0, 0.51));
      [0, 1, 2].forEach(i => out.push(bx(0.24, 0.05, 0.2, PAL.concrete, -0.78, 0.18 + i * 0.25, 0.32 - i * 0.24)));
      out.push(bx(0.04, 0.5, 0.12, PAL.lamp, 0.66, 0.45, 0.22, 0, 0, 1), bx(0.04, 0.5, 0.12, PAL.lamp, 0.66, 0.45, -0.22, 0, 0, 1));
      out.push(bx(1.34, 0.05, 1.04, PAL.line, 0, 1.18, 0));
      return out;
    }
  };
  function bakeFar(g) {   // 遠版：同一個不受光以外的物件都合成一個頂點色網格；夜光（lampMat）的合成另一個
    const body = [], lit = [];
    g.children.slice().forEach(c => { if (!c.isMesh) return; c.updateMatrix(); const lamp = c.material === M.lamp, col = lamp ? new THREE.Color(1, 1, 1) : c.material.color.clone();
      (lamp ? lit : body).push({ geo: c.geometry, m: c.matrix.clone(), top: col, bot: col }); g.remove(c); });
    if (body.length) g.add(new THREE.Mesh(merged(body), M.nearBody || (M.nearBody = std(0xffffff, { vertexColors: true }))));
    if (lit.length) { const lm = lampMat().clone(); lm.vertexColors = true; g.add(new THREE.Mesh(merged(lit), M.lampV || (M.lampV = Object.assign(lm, {})))); }
    return g;
  }
  function nearBuild(k) {
    const g = root.children.find(o => o.userData.place === k); if (!g) return null;
    const parts = NEAR[k](), body = parts.filter(p => !p.glow), lit = parts.filter(p => p.glow), n = { on: false };
    n.body = new THREE.Mesh(merged(body), M.nearBody || (M.nearBody = std(0xffffff, { vertexColors: true })));
    g.add(n.body);
    if (lit.length) { if (!M.glowV) { M.glowV = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false }); M.glowV.color.setScalar(glowK); } n.glow = new THREE.Mesh(merged(lit), M.glowV); g.add(n.glow); }
    [n.body, n.glow].forEach(o => { if (o) { o.visible = false; o.userData.near = 1; } });
    return (near[k] = n);
  }
  function nearAll(drop) {   // 離開主島畫面時釋放（工程顧問 10/29）
    Object.keys(near).forEach(k => { const n = near[k]; [n.body, n.glow].forEach(o => { if (o) { o.parent && o.parent.remove(o); o.geometry.dispose(); } }); delete near[k]; });
  }
  function nearStep() {   // 每一幀只算 3 個距離
    const P = ctx.places || {}, w = new THREE.Vector3();
    ['temple', 'church'].forEach(k => {
      const open = P[k] && !P[k].closed; let n = near[k];
      if (!open) { if (n && n.on) { n.on = false; n.body.visible = false; if (n.glow) n.glow.visible = false; } return; }   // 準備中一律遠版
      w.set(PLACE[k].x, LIFT + (PLACE[k].top || 0), PLACE[k].z);
      const d = camera.position.distanceTo(w), want = n && n.on ? d <= NEAR_OUT : d <= NEAR_IN;
      if (want && !n) n = nearBuild(k);
      if (n && n.on !== want) { n.on = want; n.body.visible = want; if (n.glow) n.glow.visible = want; }
    });
  }

  // ---------- 靜態：海、主島、山脈、樹 ----------
  function buildStatic() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xcfe8f3, 55, 110);
    hemi = new THREE.HemisphereLight(0xffffff, 0x6b8a5a, 0.55); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff4e0, 1.0); sun.position.set(10, 20, 8); scene.add(sun);
    glassMat = std(0xfff3c4, { emissive: 0xffc35a, emissiveIntensity: 0.15 });
    root = new THREE.Group(); root.position.y = LIFT; scene.add(root);
    const wg = new THREE.CircleGeometry(90, 24); wg.rotateX(-Math.PI / 2);
    water = new THREE.Mesh(wg, std(0x6fb4d8, { roughness: 0.4 })); water.position.y = -0.55;   // 浮空群島：海面不畫（物件留著，setEnvironment 照舊改顏色）
    buildCloudSea();   // 底下保留整片海（爸爸 10/27）
    // 天氣的霧和雨（台北的天氣）：霧是幾團貼著島的淡白霧氣，雨是一個 Points（都不算三角形預算以外的大物件）
    mist = new THREE.Group(); const mm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false }), mr = rng(41);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + mr() * 0.5, d = 6 + mr() * 8, c = new THREE.Mesh(new THREE.SphereGeometry(2.6 + mr() * 1.2, 6, 2), mm); c.scale.set(1.8, 0.35, 1.2); c.position.set(Math.cos(a) * d, LIFT - 0.6 + mr() * 1.2, Math.sin(a) * d); mist.add(c); }
    mist.visible = false; scene.add(mist);
    const rp = new Float32Array(700 * 3), rr = rng(43);
    for (let i = 0; i < 700; i++) { rp[i * 3] = (rr() - 0.5) * 50; rp[i * 3 + 1] = rr() * 16; rp[i * 3 + 2] = (rr() - 0.5) * 50; }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    rain = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xcfe3f2, size: 0.12, transparent: true, opacity: 0.7 })); rain.visible = false; scene.add(rain);
    const pts = outline();
    root.add(slab(pts.filter((q, i) => i % 2 === 0), 1.06, 0.45, -0.75, mat('sand', 0xf1dfb0)));   // 沙灘只露一圈邊，用一半的點就夠（省下的三角形給浮空的岩塊和雲）
    // 島底下：一層層往內收的石台（爸爸 10/27 給的造型概念），最下面垂著幾根岩根
    // 用原始外形每隔一點取一點（15 點），每層約 56 個三角形
    const HIDE = new THREE.MeshBasicMaterial({ visible: false });
    const P15 = TW.filter((q, i) => i % 2 === 0).map(q => xz(q[0], q[1]));
    [[0.97, 0.8, -1.55, 0xa08a6e], [0.84, 0.75, -2.3, 0x958169], [0.68, 0.7, -3.0, 0x857260]].forEach(([k, d, y, c], i) => {
      const t = slab(P15, k, d, y, [HIDE, mat('tier' + i, c)]); t.position.z = -0.25 * i; root.add(t);   // 上下兩面被上一層蓋住、鏡頭也看不到底面，只畫側面
    });
    const rootMat = mat('rockRoot', 0x857260);
    [[121.0, 24.2, 2.6, 0.9], [120.75, 23.4, 3.4, 1.1], [120.95, 22.8, 2.4, 0.8], [121.25, 23.9, 2.0, 0.7], [120.55, 23.9, 1.8, 0.6]].forEach(([lon, lat, h, r]) => {
      const p = xz(lon, lat), m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5, 1), rootMat); m.rotation.x = Math.PI; m.position.set(p.x * 0.6, -3.0 - h / 2, p.z * 0.6 - 0.6); root.add(m);
    });
    // 島腳的雲（4 朵）
    const cloud = mat('footCloud', 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.55, flatShading: false });
    if (0) [[121.8, 24.4, 1.5], [120.3, 23.6, 1.7], [121.2, 22.9, 1.4], [120.9, 24.9, 1.3]].forEach(([lon, lat, r]) => {   // 浮空群島：托雲改由雲海取代
      const p = xz(lon, lat), c = new THREE.Mesh(new THREE.SphereGeometry(r, 5, 3), cloud); c.scale.y = 0.45; c.position.set(p.x * 1.08, -1.6, p.z * 1.05); root.add(c);
    });
    root.add(slab(pts, 1.0, 0.5, -0.5, [HIDE, mat('grass', 0x8cc56f)]));   // 浮空群島：草地只畫側面＋上面一片（底面永遠看不到，省約 118 個三角形）
    { const sh = new THREE.Shape(); pts.forEach((p, i) => { if (i) sh.lineTo(p.x, -p.z); else sh.moveTo(p.x, -p.z); }); const tg = new THREE.ShapeGeometry(sh, 1); tg.rotateX(-Math.PI / 2); root.add(new THREE.Mesh(tg, M.grass)); }
    // 中央山脈：沿脊線排幾座低多邊形山，玉山最高、山頂一點白
    const rock = mat('mountain', 0x6f9a5b), snow = mat('snow', 0xf6f6f2);
    RIDGE.forEach(([lon, lat, h], i) => {
      const p = xz(lon, lat), m = new THREE.Mesh(new THREE.ConeGeometry(0.9 + h * 0.18, h, 6, 1), rock);
      m.position.set(p.x, h / 2, p.z); m.rotation.y = i; root.add(m);
    });
    // 玉山：山頂削平一塊，玉山聚會所蓋在上面；山腰一圈白（冬天的雪、平常的雲）
    const yu = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.9, 2.6, 7, 1), rock); yu.position.set(PEAK.x, 1.3, PEAK.z); root.add(yu);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.25, 0.35, 7, 1), snow); cap.position.set(PEAK.x, 2.2, PEAK.z); root.add(cap);
    // 平地上的樹：固定種子，每次一樣
    TREES.length = 0;
    const r = rng(23), tree = mat('tree', 0x4f9a55), trunk = mat('trunk', 0x8a6a4a);
    for (let i = 0, n = 0; i < 400 && n < 26; i++) {
      const lon = 120.2 + r() * 1.6, lat = 22.1 + r() * 3.1, p = xz(lon, lat);
      if (!inside(pts, p.x, p.z) || nearAny(p, 2.2) || Math.abs(lon - ridgeLon(lat)) < 0.28) continue;
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 5, 1), tree); t.position.set(p.x, 0.55, p.z); root.add(t); TREES.push(p);
      t.userData.inland = Math.min(...pts.map(q => Math.hypot(q.x - p.x, q.z - p.z))) * (Math.abs(lon - ridgeLon(lat)) > 0.45 ? 1 : 0);   // 離海岸多遠；靠山脊的算 0
      n++;
    }
    lodTrees = root.children.filter(o => o.userData.inland > 0).sort((a, b) => b.userData.inland - a.userData.inland).slice(0, 14);   // 遠看藏起來的 14 棵（騰出島邊浮雲的預算）
    Object.keys(BUILD).forEach(k => {
      const g = NEAR[k] ? bakeFar(BUILD[k]()) : BUILD[k](), p = PLACE[k];   // 三棟的遠版合成一個網格（夜光的另一個），draw call 每棟 2 個
      g.position.set(p.x, p.top || 0, p.z); g.userData.place = k;
      if (k === 'port') g.rotation.y = 0.5;
      if (k === 'exchange') g.rotation.y = Math.PI;   // 交易所在北端海邊，正面朝外海，主島轉到北邊時整面看得到（爸爸 10/30）
      root.add(g);
    });
    isleLayer = new THREE.Group(); scene.add(isleLayer);
    labelLayer = new THREE.Group(); labelLayer.position.y = LIFT; scene.add(labelLayer);
  }
  function ridgeLon(lat) { for (let i = 0; i < RIDGE.length - 1; i++) { const a = RIDGE[i], b = RIDGE[i + 1]; if (lat <= a[1] && lat >= b[1]) return a[0] + (b[0] - a[0]) * (a[1] - lat) / (a[1] - b[1]); } return 0; }
  function nearAny(p, d) { return Object.values(PLACE).concat([PEAK, xz(121.28, 23.68)], SPARE).some(q => Math.hypot(q.x - p.x, q.z - p.z) < d); }
  function inside(pts, x, z) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) c = !c; } return c; }

  // ---------- 會變的：建物的名牌、列島的小島與航線 ----------
  function buildDynamic() {
    clearLayer(labelLayer);
    const P = ctx.places || {};
    Object.keys(PLACE).forEach(k => {
      const p = P[k]; if (!p) return;
      const sp = labelSprite((PLACE[k].ic ? PLACE[k].ic + ' ' : '') + p.name, p.sub || null, { scale: 1.5, color: p.closed ? '#6a6a6a' : '#741b47' });
      sp.position.set(PLACE[k].x, (k === 'church' ? 3.0 : 2.6) + (PLACE[k].top || 0), PLACE[k].z); sp.userData.place = k; labelLayer.add(sp);
    });
    const sig = JSON.stringify(ctx.isles || []);
    if (sig === sigIsles) return;
    sigIsles = sig;
    clearLayer(isleLayer);
    const sand = mat('sand', 0xf1dfb0), grass = mat('grass', 0x8cc56f), off = mat('offIsle', 0xd8d2c0);
    const rocks = [], falls = [], puffParts = [], one = new THREE.Color(1, 1, 1), dim = new THREE.Color(0.9, 0.9, 0.9);
    (ctx.isles || []).forEach(s => {
      const a = (s.a || 0) * Math.PI, x = Math.cos(a) * RX, z = Math.sin(a) * RZ;
      const up = 1.3;   // 浮空群島：每座島一樣高（美術 10/29：高低會被讀成排名）
      const g = new THREE.Group(); g.position.set(x, up, z); g.userData.isle = s.key;
      const big = (s.mine ? 1.0 : 0.8) * 1.2;   // 浮空群島：總覽裡小島放大 1.2 倍，岩底和浮雲才看得清楚（美術 10/29；鏡頭不拉近，四角的島都要看得到）
      const b = new THREE.Mesh(new THREE.CylinderGeometry(2.4 * big, 2.7 * big, 0.5, 7), sand); b.position.y = -0.4; g.add(b);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(2.0 * big, 2.2 * big, 0.3, 7), s.open === false ? off : grass); t.position.y = -0.1; g.add(t);
      if (s.open !== false) {
        g.add(box(0.7, 0.5, 0.6, mat('isleHouse', 0xfdf6ec), 0, 0.05, 0));
        const r = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.4, 4, 1), mat(s.slot === 'wisdom' ? 'roofWis' : 'roofRed', s.slot === 'wisdom' ? 0x2e3a59 : 0xc0504d)); r.rotation.y = Math.PI / 4; r.position.y = 0.75; g.add(r);
      }
      // 浮空群島：岩底（倒圓錐 6 面、不封口，12 個三角形）和海島的小瀑布（朝預設鏡頭那側）都先收起來，最後各合成一個網格
      // 島下方照家人島 3D 的浮島造型（爸爸 10/29）：深的倒圓錐岩塊（8 面）＋深色尖端＋一顆小浮石，上亮下暗；一座 34 個三角形
      // 島下方和 island3d.js 的浮島同一套造型（爸爸 10/29；美術：總覽和進到島上要長得一樣）：倒圓錐 7 面 3 段（地層感）＋深色尖端（7 面、同一個轉角，上緣剛好貼在倒錐面上，接縫密合），
      // 顏色上端 #a08a6e、下端 #857260；一座 56 個三角形。位置都用同一套規則（不隨機），對所有人一樣
      const rb = 2.75 * big, ry = up - 0.65, L = (dx, dz, k) => [x + dx * rb * k, z + dz * rb * k];
      rocks.push({ geo: new THREE.ConeGeometry(rb, rb * 1.3, 7, 3, true).rotateX(Math.PI), m: at(x, ry - rb * 0.65, z, 1, 1, 1, 0.2), top: linC(0xa08a6e), bot: linC(0x8f7b66) });
      rocks.push({ geo: new THREE.ConeGeometry(rb * 0.36, rb * 0.818, 7, 1, true).rotateX(Math.PI), m: at(x, ry - rb * 1.241, z, 1, 1, 1, 0.2), top: linC(0x857260), bot: linC(0x857260) });
      if (FLOAT.pebble) { const [px, pz] = L(0.75, -0.65, 1.05); rocks.push({ geo: new THREE.OctahedronGeometry(0.3 * big, 0), m: at(px, ry - 1.7, pz, 1, 0.8, 1), top: linC(0xa08a6e), bot: linC(0x857260) }); }   // 浮石：右後下方，不在島和鏡頭之間
      // 島緣的浮雲是主角（爸爸 10/29）：buildFloat 那種扁二十面體，左前一朵、右後一朵（FLOAT.puffs 決定幾朵），半截藏在岩塊後，不蓋名牌和房子
      [[-0.78, 0.62, 1.0], [0.8, -0.6, 0.85]].slice(0, FLOAT.puffs).forEach(([dx, dz, k]) => { const [px, pz] = L(dx, dz, 0.92); puffParts.push({ geo: new THREE.IcosahedronGeometry(rb * 0.42 * k, 0), m: at(px, ry - 0.5, pz, 1.6, 0.5, 1.2), top: one, bot: dim }); });
      if (s.bg === 'sea') falls.push({ geo: (() => { const g = new THREE.PlaneGeometry(0.55, 2.1), q = g.attributes.position; for (let v = 0; v < q.count; v++) if (q.getY(v) > 0) q.setX(v, q.getX(v) * 1.35); return g; })(), m: at(x + 0.6 * big, up - 1.75, z + 2.62 * big, 1, 1, 1), top: linC(0xbfe6f5), bot: linC(0xf3f1ec) });   // 由上往下漸變成雲色，像散進雲裡（美術 10/29）
      if (s.bg === 'space') g.add(starRing(2.9 * big));   // 宇宙的島：一圈小星星照舊
      isleLayer.add(g);
      const sp = labelSprite(s.name, s.sub || null, { scale: s.mine ? 1.6 : 1.4, color: s.open === false ? '#6a6a6a' : '#2f4a7a' });
      sp.position.set(x, 1.8 + up, z); sp.userData.isle = s.key; isleLayer.add(sp);
    });
    [[120.25, 22.75, 1.0], [121.85, 24.95, 0.8]].forEach(([lon, lat, k]) => { const p = xz(lon, lat); puffParts.push({ geo: new THREE.IcosahedronGeometry(2.3 * k, 0), m: at(p.x * 1.02, LIFT - 1.3, p.z * 1.02, 1.6, 0.5, 1.2), top: one, bot: dim }); });   // 主島邊也兩朵（美術 10/29）
    if (puffParts.length) { const pg = merged(puffParts); puffBase = shadeOf(pg, false); puffs = new THREE.Mesh(pg, M.cloudSea); isleLayer.add(puffs); if (lastCloud) paint(puffs, puffBase, lastCloud, lastSky); } else puffs = null;
    if (rocks.length) isleLayer.add(new THREE.Mesh(merged(rocks), mat('isleRockV', 0xffffff, { vertexColors: true, emissive: 0x6a5646 })));   // 背光面也看得出土色（美術：暗是對的，但不要黑）
    if (falls.length) isleLayer.add(new THREE.Mesh(merged(falls), M.fall || (M.fall = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false }))));
  }

  // 宇宙的島：一圈小星星（固定種子，每次一樣；Points 不算三角形）
  function starRing(r) {
    const n = 40, pos = new Float32Array(n * 3), rr = rng(71);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rr() * 0.2, d = r + rr() * 0.9; pos[i * 3] = Math.cos(a) * d; pos[i * 3 + 1] = -0.6 + (rr() - 0.5) * 1.4; pos[i * 3 + 2] = Math.sin(a) * d; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, starMat || (starMat = new THREE.PointsMaterial({ color: 0xfff3c4, size: 0.4 })));
  }
  let starMat = null;

  const SKY = { dawn: 0xf6c9a8, day: 0xcfe8f3, dusk: 0xf2a07b, night: 0x1b2440 };
  // 節氣：草地和樹的顏色跟著她島上的節氣走（顏色取自 island3d.js 的 SEASONS，只取草地和第一種葉子）
  const SEASON_GRASS = { 立春: [0x95c873, 0x6fb36a], 雨水: [0x97cc75, 0x6fb36a], 驚蟄: [0x9bd27a, 0x86c47a], 春分: [0x9bd27a, 0x86c47a], 清明: [0x92cf70, 0x86c47a], 穀雨: [0x88c866, 0x7cc070],
    立夏: [0x7fc25e, 0x5fae58], 小滿: [0x7fc25e, 0x5fae58], 芒種: [0x79bd58, 0x55a650], 夏至: [0x79bd58, 0x55a650], 小暑: [0x76b955, 0x4f9a55], 大暑: [0x76b955, 0x4f9a55],
    立秋: [0x8cc56f, 0x4f9a55], 處暑: [0x95c26c, 0x6a9a4a], 白露: [0x9cc06c, 0x8a9a42], 秋分: [0xa3bd68, 0xb08a3a], 寒露: [0xa9b866, 0xc0783a], 霜降: [0xadb264, 0xc8643a],
    立冬: [0xa6b06a, 0x8a9a52], 小雪: [0x9fab6c, 0x6f9a5b], 大雪: [0x98a870, 0x5f8f5a], 冬至: [0x94a672, 0x5f8f5a], 小寒: [0x92a574, 0x5f8f5a], 大寒: [0x93a875, 0x6f9a5b] };
  function setSeason(term) {
    const c = SEASON_GRASS[term]; if (!c || !M.grass) return;
    lin(M.grass.color.setHex(c[0])); if (M.tree) lin(M.tree.color.setHex(c[1]));
    if (M.snow) lin(M.snow.color.setHex(/小雪|大雪|冬至|小寒|大寒/.test(term) ? 0xffffff : 0xeef3f6));
  }
  function setEnvironment(e) {
    const env = Object.assign({ phase: 'day', weather: 'clear' }, e || {}), ph = env.phase, wet = env.weather === 'rain' || env.weather === 'storm', night = ph === 'night';
    const fog = env.weather === 'fog', cloudy = env.weather === 'cloudy';
    const sky = new THREE.Color(SKY[ph]); if (ph === 'dusk') { sky.getHSL(hsl); sky.setHSL(hsl.h, hsl.s * 0.8, hsl.l); }   // 浮空群島：黃昏的天空飽和度降兩成（美術 10/29） if (wet) sky.lerp(new THREE.Color(0xaab6c0), 0.5); else if (fog) sky.lerp(new THREE.Color(0xdfe5ea), 0.6); else if (cloudy) sky.lerp(new THREE.Color(0xc4ced6), 0.35);
    scene.background = sky; lin(scene.fog.color.copy(sky));
    hemi.intensity = (night ? 0.3 : 0.5) * (wet ? 0.75 : 1);
    sun.intensity = (night ? 0.05 : ph === 'day' ? 1.0 : 0.75) * (wet ? 0.5 : 1);
    lin(sun.color.setHex(ph === 'dawn' ? 0xffc89a : ph === 'dusk' ? 0xff9f6a : 0xfff4e0));
    lin(water.material.color.setHex(night ? 0x24456a : wet ? 0x5d8aa6 : fog ? 0x9fbccc : 0x6fb4d8));
    scene.fog.near = fog ? 34 : wet ? 40 : 55; scene.fog.far = fog ? 88 : wet ? 100 : 110;   // 起霧時遠處的島看不太清楚
    mistOn = fog || wet || cloudy;   // 霧依相機距離漸淡（loop 裡算）
    { const sk = sky.clone().convertSRGBToLinear();   // 和背景完全同色，雲海外緣才會變成柔和的地平線（美術 10/29）
      paintClouds(wet ? linC(CLOUD_WET) : night ? linC(CLOUD_NIGHT) : linC(PAPER).lerp(sk, 0.3).multiplyScalar(fog || cloudy ? 0.94 : 1), sk); }
    scene.fog.near = fog ? 45 : wet ? 55 : 70; scene.fog.far = fog ? 110 : wet ? 125 : 140;   // 總覽：島都在 90 以內，不要被霧洗白（美術 10/29）
    if (rain) rain.visible = wet && !CALM;
    flash = env.weather === 'storm' && !CALM ? 1 : 0;
    glassMat.emissiveIntensity = night || ph === 'dusk' || wet ? 1.0 : 0.15;
    glowK = night || ph === 'dusk' || wet ? 1.0 : 0.8; if (M.glowV) M.glowV.color.setScalar(glowK); if (M.lamp) M.lamp.color.setHex(0xf2bf55).multiplyScalar(glowK); if (M.lampV) M.lampV.color.setHex(0xf2bf55).multiplyScalar(glowK);   // 三棟同一個夜光強度（燈籠、彩色玻璃、交易所窗）
    if (container) container.style.background = '#' + sky.getHexString();
    if (renderer) renderer.toneMappingExposure = night ? 0.8 : 0.62;
  }

  function onDown(e) { downAt = { x: e.clientX, y: e.clientY }; turn = null; if (controls) controls.autoRotate = false; }
  function onUp(e) {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(v, camera);
    const hits = ray.intersectObjects([root, labelLayer, isleLayer], true);
    for (const h of hits) {
      let o = h.object; while (o && !o.userData.place && !o.userData.isle) o = o.parent;
      if (!o) continue;
      if (o.userData.place && ctx.onPlace) return ctx.onPlace(o.userData.place);
      if (o.userData.isle && ctx.onIsle) return ctx.onIsle(o.userData.isle);
    }
  }
  function resize() {
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const d = Math.min(80, 52 * Math.pow(Math.max(1, h / w), 0.8));   // 斜角看下來，南邊的島比較靠近鏡頭，拉遠一點才放得下   // 直式手機拉遠一點，列島才放得下
    camera.position.copy(new THREE.Vector3(0, Math.tan(35 * Math.PI / 180), 1).normalize().multiplyScalar(d));   // 35° 斜角鳥瞰，看得到每座島的岩底浮在雲海上（浮空群島，美術 10/29）
  }
  // 鏡頭轉到某座島那一側，島在前景（工程顧問 10/27）；減少動態效果時直接跳過去
  let turn = null;
  function focus(key) {
    const s = (ctx && ctx.isles || []).find(x => x.key === key); if (!s || !camera) return;
    const a = (s.a || 0) * Math.PI, want = Math.atan2(Math.sin(a) * RZ, Math.cos(a) * RX);
    controls.autoRotate = false;
    const off = camera.position.clone().sub(controls.target), sp = new THREE.Spherical().setFromVector3(off);
    const goal = Math.PI / 2 - want;   // Spherical 的 theta 從 +z 軸量起
    let d = goal - sp.theta; d = Math.atan2(Math.sin(d), Math.cos(d));
    if (CALM) { sp.theta += d; camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sp)); return; }
    turn = { from: sp.theta, d, t0: performance.now() };
  }
  function turnStep() {
    if (!turn) return;
    const k = Math.min(1, (performance.now() - turn.t0) / 700), e = k * k * (3 - 2 * k);
    const sp = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)); sp.theta = turn.from + turn.d * e;
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sp));
    if (k >= 1) turn = null;
  }
  function loop() {
    if (!renderer.domElement.isConnected) { running = false; nearAll(); return; }
    if (document.hidden) { setTimeout(() => requestAnimationFrame(loop), 1000); return; }
    const t = CALM ? 0 : performance.now() / 1000;
    if (rain && rain.visible) { const ra = rain.geometry.attributes.position.array; for (let i = 1; i < ra.length; i += 3) { ra[i] -= 0.25; if (ra[i] < -0.5) ra[i] += 16; } rain.geometry.attributes.position.needsUpdate = true; }
    if (flash) { const f = Math.sin(t * 0.7) > 0.995; hemi.intensity = f ? 1.6 : 0.37; }   // 雷雨：偶爾閃一下
    if (boat) { boat.position.y = -0.25 + Math.sin(t * 1.3) * 0.06; boat.rotation.z = Math.sin(t * 0.9) * 0.03; }
    turnStep(); controls.update(); farNear(); nearStep(); renderer.render(scene, camera);
    if (guard) guard.frame();
    requestAnimationFrame(loop);
  }
  // 遠近：主島的 14 棵內陸樹 28 以內才畫、31 以外才藏（中間不換，不會來回閃）；霧 20 以內最濃、28 以外不畫；降到最低畫質就不畫霧
  function farNear() {
    const d = camera.position.distanceTo(controls.target);
    const far = lodFar ? d > 28 : d > 31;
    if (far !== lodFar) { lodFar = far; lodTrees.forEach(t => { t.visible = !far; }); }
    const k = mistOn && !(window.FpsGuard && FpsGuard.level() >= 2) ? Math.max(0, Math.min(1, (28 - d) / 8)) : 0;
    if (mist) { mist.visible = k > 0; if (k > 0) mist.children[0].material.opacity = 0.25 * k; }
  }
  function mount(el, context) {
    container = el; ctx = context || {};
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
      if (window.FpsGuard) guard = FpsGuard.create({ renderer });
      camera = new THREE.PerspectiveCamera(40, 1, 0.1, 260);
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 16; controls.maxDistance = 90; controls.minPolarAngle = Math.PI / 2 - 50 * Math.PI / 180; controls.maxPolarAngle = Math.PI / 2 - 25 * Math.PI / 180; controls.target.set(0, 1.2, 0);   // 主島浮起來，視線中心跟著抬一點
      controls.autoRotate = !CALM; controls.autoRotateSpeed = 0.3;
      renderer.domElement.addEventListener('pointerdown', onDown);
      renderer.domElement.addEventListener('pointerup', onUp);
      window.addEventListener('resize', resize);
      clock = new THREE.Clock();
      buildStatic();
    }
    setEnvironment(ctx.env);
    if (ctx.season) setSeason(ctx.season);
    buildDynamic();
    el.appendChild(renderer.domElement);
    resize();
    if (!running) { running = true; loop(); }
  }
  window.MainIsle3D = { mount, focus, setEnvironment: e => scene && setEnvironment(e), triangles: () => renderer ? renderer.info.render.triangles : 0, layout: () => ({ spare: SPARE, trees: TREES.slice(), ridge: RIDGE.map(([lon, lat, h]) => Object.assign(xz(lon, lat), { r: 0.9 + h * 0.18 })), place: PLACE }) };
})();

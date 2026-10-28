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
    exchange: Object.assign(xz(121.55, 25.03), { ic: '🏛️' }),   // 北端（台北）
    church: Object.assign(xz(121.02, 22.72), { ic: '⛪' }),     // 台東（爸爸 10/27 從新竹一帶搬過來，和預留空位對調）
    temple: Object.assign(xz(120.45, 24.05), { ic: '🏮' }),     // 西岸中部（鹿港）
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
  function windows(g, n, w, y, z, h) { for (let i = 0; i < n; i++) g.add(box(0.16, h || 0.22, 0.04, glassMat, (i - (n - 1) / 2) * w, y, z)); }
  function exchange() {   // 交易所：白色石造、正面四根柱子、三角山牆（爸爸 草圖：三排窗）
    const g = new THREE.Group(), stone = mat('stone', 0xeee6d6), dark = mat('roofGrey', 0x7d7f86);
    g.add(box(1.8, 1.2, 1.2, stone));
    for (let i = 0; i < 4; i++) g.add(box(0.14, 0.9, 0.14, mat('col', 0xffffff), -0.6 + i * 0.4, 0.1, 0.66));
    const ped = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.45, 4, 1), dark); ped.rotation.y = Math.PI / 4; ped.scale.set(1.1, 1, 0.75); ped.position.y = 1.42; g.add(ped);
    windows(g, 3, 0.45, 0.62, 0.61); windows(g, 3, 0.45, 0.25, 0.61);
    return g;
  }
  function church() {   // 教會：紅磚、尖塔（像淡水的禮拜堂）
    const g = new THREE.Group(), brick = mat('brick', 0xb5543c), roof = mat('roofDark', 0x4a3b36);
    g.add(box(1.0, 0.8, 1.5, brick));
    const r = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.6, 4, 1), roof); r.rotation.y = Math.PI / 4; r.scale.set(0.85, 1, 1.25); r.position.y = 1.1; g.add(r);
    g.add(box(0.5, 1.5, 0.5, brick, 0, 0, 0.6));
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.7, 4, 1), roof); sp.rotation.y = Math.PI / 4; sp.position.set(0, 1.85, 0.6); g.add(sp);
    g.add(box(0.05, 0.36, 0.05, mat('gold', 0xf2c14e), 0, 2.2, 0.6)); g.add(box(0.22, 0.05, 0.05, mat('gold', 0xf2c14e), 0, 2.4, 0.6));
    windows(g, 1, 0, 0.9, 0.86, 0.3);
    return g;
  }
  function temple() {   // 媽祖廟：紅柱、橘瓦、燕尾翹脊、兩盞燈籠
    const g = new THREE.Group(), red = mat('templeRed', 0xc8372d), tile = mat('tile', 0xe0782f), gold = mat('gold', 0xf2c14e);
    g.add(box(1.7, 0.2, 1.2, mat('step', 0xd9cbb4)));
    g.add(box(1.4, 0.75, 0.9, red, 0, 0.2, 0));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.0, 3, 1), tile); roof.rotation.z = Math.PI / 2; roof.scale.set(1, 1, 0.85); roof.position.y = 1.25; g.add(roof);
    g.add(box(1.9, 0.08, 0.08, gold, 0, 1.52, 0));
    [-1, 1].forEach(s => { const tail = box(0.1, 0.35, 0.08, gold, s * 1.0, 1.5, 0); tail.rotation.z = -s * 0.5; g.add(tail);   // 燕尾
      const lan = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), glassMat); lan.position.set(s * 0.45, 0.85, 0.55); g.add(lan); });
    g.add(box(0.5, 0.5, 0.05, mat('door', 0x7a2a1f), 0, 0.2, 0.46));
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

  // ---------- 靜態：海、主島、山脈、樹 ----------
  function buildStatic() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xcfe8f3, 55, 110);
    hemi = new THREE.HemisphereLight(0xffffff, 0x6b8a5a, 0.55); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff4e0, 1.0); sun.position.set(10, 20, 8); scene.add(sun);
    glassMat = std(0xfff3c4, { emissive: 0xffc35a, emissiveIntensity: 0.15 });
    root = new THREE.Group(); root.position.y = LIFT; scene.add(root);
    const wg = new THREE.CircleGeometry(90, 24); wg.rotateX(-Math.PI / 2);
    water = new THREE.Mesh(wg, std(0x6fb4d8, { roughness: 0.4 })); water.position.y = -0.55; scene.add(water);   // 底下保留整片海（爸爸 10/27）
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
    [[0.97, 0.8, -1.55, 0xa08a74], [0.84, 0.75, -2.3, 0x8f7a66], [0.68, 0.7, -3.0, 0x7d6a58]].forEach(([k, d, y, c], i) => {
      const t = slab(P15, k, d, y, [HIDE, mat('tier' + i, c)]); t.position.z = -0.25 * i; root.add(t);   // 上下兩面被上一層蓋住、鏡頭也看不到底面，只畫側面
    });
    const rootMat = mat('rockRoot', 0x6a5a4b);
    [[121.0, 24.2, 2.6, 0.9], [120.75, 23.4, 3.4, 1.1], [120.95, 22.8, 2.4, 0.8], [121.25, 23.9, 2.0, 0.7], [120.55, 23.9, 1.8, 0.6]].forEach(([lon, lat, h, r]) => {
      const p = xz(lon, lat), m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5, 1), rootMat); m.rotation.x = Math.PI; m.position.set(p.x * 0.6, -3.0 - h / 2, p.z * 0.6 - 0.6); root.add(m);
    });
    // 島腳的雲（4 朵）
    const cloud = mat('footCloud', 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.55, flatShading: false });
    [[121.8, 24.4, 1.5], [120.3, 23.6, 1.7], [121.2, 22.9, 1.4], [120.9, 24.9, 1.3]].forEach(([lon, lat, r]) => {
      const p = xz(lon, lat), c = new THREE.Mesh(new THREE.SphereGeometry(r, 5, 3), cloud); c.scale.y = 0.45; c.position.set(p.x * 1.08, -1.6, p.z * 1.05); root.add(c);
    });
    root.add(slab(pts, 1.0, 0.5, -0.5, mat('grass', 0x8cc56f)));
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
      n++;
    }
    Object.keys(BUILD).forEach(k => {
      const g = BUILD[k](), p = PLACE[k];
      g.position.set(p.x, p.top || 0, p.z); g.userData.place = k;
      if (k === 'port') g.rotation.y = 0.5;
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
      const sp = labelSprite(PLACE[k].ic + ' ' + p.name, p.sub || null, { scale: 1.5, color: p.closed ? '#6a6a6a' : '#741b47' });
      sp.position.set(PLACE[k].x, (k === 'church' ? 3.0 : 2.6) + (PLACE[k].top || 0), PLACE[k].z); sp.userData.place = k; labelLayer.add(sp);
    });
    const sig = JSON.stringify(ctx.isles || []);
    if (sig === sigIsles) return;
    sigIsles = sig;
    clearLayer(isleLayer);
    const sand = mat('sand', 0xf1dfb0), grass = mat('grass', 0x8cc56f), off = mat('offIsle', 0xd8d2c0);
    const cloudMat = mat('isleCloud', 0xffffff), rockMat = mat('isleRock', 0x7a6f66);
    (ctx.isles || []).forEach(s => {
      const a = (s.a || 0) * Math.PI, x = Math.cos(a) * RX, z = Math.sin(a) * RZ;
      const up = s.bg === 'sky' || s.bg === 'space' ? 1.3 : 0;   // 2b-2：各人選的背景，天空、宇宙的島浮起來
      const g = new THREE.Group(); g.position.set(x, up, z); g.userData.isle = s.key;
      const big = s.mine ? 1.0 : 0.8;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(2.4 * big, 2.7 * big, 0.5, 9), sand); b.position.y = -0.4; g.add(b);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(2.0 * big, 2.2 * big, 0.3, 9), s.open === false ? off : grass); t.position.y = -0.1; g.add(t);
      if (s.open !== false) {
        g.add(box(0.7, 0.5, 0.6, mat('isleHouse', 0xfdf6ec), 0, 0.05, 0));
        const r = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.4, 4, 1), mat(s.slot === 'wisdom' ? 'roofWis' : 'roofRed', s.slot === 'wisdom' ? 0x2e3a59 : 0xc0504d)); r.rotation.y = Math.PI / 4; r.position.y = 0.75; g.add(r);
      }
      if (s.bg === 'sky') {   // 底下一朵雲（1 個網格）
        const c = new THREE.Mesh(new THREE.SphereGeometry(2.4 * big, 6, 3), cloudMat); c.scale.set(1.45, 0.38, 1.3); c.position.y = -0.75; g.add(c);
      } else if (s.bg === 'space') {   // 底下一塊岩塊（1 個網格）＋一圈小星星（1 個 Points，40 顆）
        const k = new THREE.Mesh(new THREE.ConeGeometry(3.1 * big, 2.4, 6, 1), rockMat); k.rotation.x = Math.PI; k.position.y = -1.75; g.add(k);
        g.add(starRing(2.9 * big));
      }
      isleLayer.add(g);
      const sp = labelSprite(s.name, s.sub || null, { scale: s.mine ? 1.6 : 1.4, color: s.open === false ? '#6a6a6a' : '#2f4a7a' });
      sp.position.set(x, 1.8 + up, z); sp.userData.isle = s.key; isleLayer.add(sp);
    });
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
    const sky = new THREE.Color(SKY[ph]); if (wet) sky.lerp(new THREE.Color(0xaab6c0), 0.5); else if (fog) sky.lerp(new THREE.Color(0xdfe5ea), 0.6); else if (cloudy) sky.lerp(new THREE.Color(0xc4ced6), 0.35);
    scene.background = sky; lin(scene.fog.color.copy(sky));
    hemi.intensity = (night ? 0.3 : 0.5) * (wet ? 0.75 : 1);
    sun.intensity = (night ? 0.05 : ph === 'day' ? 1.0 : 0.75) * (wet ? 0.5 : 1);
    lin(sun.color.setHex(ph === 'dawn' ? 0xffc89a : ph === 'dusk' ? 0xff9f6a : 0xfff4e0));
    lin(water.material.color.setHex(night ? 0x24456a : wet ? 0x5d8aa6 : fog ? 0x9fbccc : 0x6fb4d8));
    scene.fog.near = fog ? 34 : wet ? 40 : 55; scene.fog.far = fog ? 88 : wet ? 100 : 110;   // 起霧時遠處的島看不太清楚
    if (mist) mist.visible = fog || wet || cloudy;
    if (rain) rain.visible = wet && !CALM;
    flash = env.weather === 'storm' && !CALM ? 1 : 0;
    glassMat.emissiveIntensity = night || ph === 'dusk' || wet ? 1.0 : 0.15;
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
    const d = Math.min(80, 46 * Math.pow(Math.max(1, h / w), 0.85));   // 直式手機拉遠一點，列島才放得下
    camera.position.copy(new THREE.Vector3(0, 8, 34).normalize().multiplyScalar(d));   // 低一點的視角，看得到主島浮在空中（爸爸 10/27）
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
    if (!renderer.domElement.isConnected) { running = false; return; }
    if (document.hidden) { setTimeout(() => requestAnimationFrame(loop), 1000); return; }
    const t = CALM ? 0 : performance.now() / 1000;
    if (rain && rain.visible) { const ra = rain.geometry.attributes.position.array; for (let i = 1; i < ra.length; i += 3) { ra[i] -= 0.25; if (ra[i] < -0.5) ra[i] += 16; } rain.geometry.attributes.position.needsUpdate = true; }
    if (flash) { const f = Math.sin(t * 0.7) > 0.995; hemi.intensity = f ? 1.6 : 0.37; }   // 雷雨：偶爾閃一下
    if (boat) { boat.position.y = -0.25 + Math.sin(t * 1.3) * 0.06; boat.rotation.z = Math.sin(t * 0.9) * 0.03; }
    turnStep(); controls.update(); renderer.render(scene, camera);
    if (guard) guard.frame();
    requestAnimationFrame(loop);
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
      controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 16; controls.maxDistance = 90; controls.maxPolarAngle = 1.38; controls.target.set(0, 1.2, 0);   // 主島浮起來，視線中心跟著抬一點
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

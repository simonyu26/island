/**
 * 會考小島 3D 房間：我的家、島民的家的室內
 * 依賴 three.min.js 與 OrbitControls.js（同資料夾），由 index.html 在需要時才載入。
 * Room3D.mount(container, opts)
 *   opts = { wall: '#rrggbb', accent: '#rrggbb', items: [{ ic, z: 'wall'|'floor'|'out', cell?, flip? }], visitor: { emoji, img }, visitorCell?, night }
 *   cell：地上 5×5 格（0 在左後角，往右、往前數）；沒有 cell 的照舊依序擺
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

  let renderer, scene, camera, controls, clock, container, content, visitorSp;
  let running = false, signature = '', t = 0;
  const std = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.9, metalness: 0 }, extra));
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  function emojiTexture(emoji, flip) {
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d');
    if (flip) { g.translate(N, 0); g.scale(-1, 1); }
    g.font = `${N * 0.78}px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    drawEmoji(g, emoji, N / 2, N / 2 + 12);
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    return tex;
  }
  // 地上的家具：像紙偶一樣永遠面向你，底下有一圈影子
  function floorItem(emoji, x, z, size, flip) {
    const g = new THREE.Group();
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji, flip), transparent: true }));
    sp.scale.set(size, size, 1); sp.position.y = size * 0.46;
    const sh = new THREE.Mesh(new THREE.CircleGeometry(size * 0.36, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02;
    g.add(sp, sh); g.position.set(x, 0, z);
    return g;
  }
  // 牆上的東西：貼在牆面上
  function wallItem(emoji, onLeft, u, y, size) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: emojiTexture(emoji), transparent: true }));
    if (onLeft) { m.rotation.y = Math.PI / 2; m.position.set(-3.94, y, u); } else m.position.set(u, y, -3.94);
    return m;
  }
  function avatarSprite(emoji, imgSrc) {
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv);
    const base = () => { g.clearRect(0, 0, N, N); g.fillStyle = '#fff'; g.beginPath(); g.arc(N / 2, N / 2, N / 2 - 6, 0, Math.PI * 2); g.fill();
      g.lineWidth = 10; g.strokeStyle = '#741b47'; g.stroke(); };
    base();
    g.font = `${N * 0.6}px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; drawEmoji(g, emoji || '🙂', N / 2, N / 2 + 10);
    if (imgSrc) {
      const im = new Image();
      im.onload = () => { base(); g.save(); g.beginPath(); g.arc(N / 2, N / 2, N / 2 - 12, 0, Math.PI * 2); g.clip();
        g.drawImage(im, 12, 12, N - 24, N - 24); g.restore(); tex.needsUpdate = true; };
      im.src = imgSrc;
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(1.3, 1.3, 1);
    return sp;
  }

  // 地上擺放的位置：先靠牆，再往房間中間
  const FLOOR_SPOTS = [[-2.6, -2.8], [0, -3], [2.6, -2.8], [-3, -0.4], [-3, 2.2], [1.3, -1.4], [-1.3, -1.2], [3, -0.6],
    [-1.6, 1], [1.6, 1.2], [0, 2.6], [3, 2.4], [-1.2, 3.1], [2.2, -0.2], [-0.2, -0.2], [0.8, 3.2], [-2.2, -2], [2.2, 2.2], [-3.2, 0.9], [3.2, 1]];
  // 牆上的位置：[在左牆？, 沿牆位置, 高度]
  const WALL_SPOTS = [[false, -2.2, 2.9], [false, 2.6, 2.9], [true, -1.4, 2.9], [true, 1.8, 2.9], [false, 0.2, 3.7], [true, 0.2, 3.7], [false, -3, 1.9], [true, 3, 1.9]];

  const cellPos = c => [-3 + 1.5 * (c % 5), -3 + 1.5 * Math.floor(c / 5)];
  function build(o) {
    if (content) scene.remove(content);
    content = new THREE.Group(); scene.add(content);
    const wallC = new THREE.Color(o.wall || '#fdf6ec'), accent = new THREE.Color(o.accent || '#741b47');
    // 地板（木頭條紋）、兩面牆、踢腳板
    const floor = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 8), std(i % 2 ? 0xd9b88f : 0xcfa979));
      b.position.set(-3.5 + i, -0.06, 0); floor.add(b);
    }
    content.add(floor);
    const wm = std(wallC, { side: THREE.DoubleSide });
    const back = new THREE.Mesh(new THREE.BoxGeometry(8.2, 4.6, 0.12), wm); back.position.set(0, 2.3, -4.02);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.6, 8.2), wm); left.position.set(-4.02, 2.3, 0);
    const trim = std(0xffffff);
    const tb = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 0.08), trim); tb.position.set(0, 0.15, -3.93);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 8), trim); tl.position.set(-3.93, 0.15, 0);
    content.add(back, left, tb, tl);
    // 窗戶：白天看得到天空，晚上是夜空
    const win = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.5), new THREE.MeshBasicMaterial({ color: o.night ? 0x223060 : 0xaee3ff }));
    const fr = std(0xffffff);
    [[0, 0.8, 2.2, 0.12], [0, -0.8, 2.2, 0.12], [-1.05, 0, 0.12, 1.7], [1.05, 0, 0.12, 1.7], [0, 0, 0.06, 1.6], [0, 0, 2, 0.06]].forEach(f => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(f[2], f[3], 0.1), fr); b.position.set(f[0], f[1], 0.04); win.add(b);
    });
    win.add(glass); win.rotation.y = Math.PI / 2; win.position.set(-3.95, 2.4, -0.4);
    if (o.night) { const moon = new THREE.Mesh(new THREE.CircleGeometry(0.22, 20), new THREE.MeshBasicMaterial({ color: 0xfff3c4 })); moon.position.set(0.5, 0.35, 0.02); win.add(moon); }
    content.add(win);
    // 小地毯
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.9, 40), std(accent.clone().lerp(new THREE.Color(0xffffff), 0.65)));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0.4, 0.015, 0.6); content.add(rug);

    const items = o.items || [];
    let fi = 0, wi = 0;
    items.forEach(it => {
      if (it.z === 'wall' && wi < WALL_SPOTS.length) { const w = WALL_SPOTS[wi++]; content.add(wallItem(it.ic, w[0], w[1], w[2], 1.1)); }
      else if (it.z === 'out') { const f = floorItem(it.ic, 0, 0, 0.7); f.rotation.y = Math.PI / 2; f.position.set(-3.6, 1.62, -0.4); content.add(f); }   // 窗台上
      else if (it.cell != null) { const p = cellPos(it.cell); content.add(floorItem(it.ic, p[0], p[1], 1.35, it.flip)); }
      else if (fi < FLOOR_SPOTS.length) { const p = FLOOR_SPOTS[fi++]; content.add(floorItem(it.ic, p[0], p[1], 1.45)); }
    });
    visitorSp = null;
    if (o.visitor) {
      const vp = o.visitorCell != null ? cellPos(o.visitorCell) : [1.4, 1.9];
      visitorSp = avatarSprite(o.visitor.emoji, o.visitor.img);
      visitorSp.position.set(vp[0], 0.95, vp[1]); content.add(visitorSp);
      const sh = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14 }));
      sh.rotation.x = -Math.PI / 2; sh.position.set(vp[0], 0.02, vp[1]); content.add(sh);
    }
    scene.background = new THREE.Color(o.night ? 0x2a2440 : 0xf6efe6);
    lamp.intensity = o.night ? 0.9 : 0.35;
    hemi.intensity = o.night ? 0.55 : 0.72;
  }

  let hemi, lamp;
  function resize() {
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!framed && w && h) {   // 直式畫面要拉遠一點，整個房間才放得下
      framed = true;
      camera.position.set(7.5, 6.2, 8.5).normalize().multiplyScalar(Math.min(16, 12.5 * Math.pow(Math.max(1, h / w), 0.7)));
    }
  }
  let framed = false;
  // v2.30 省電：系統開「減少動態效果」時，海浪、雲、船這些裝飾動畫停住（還是可以轉動、點選）；App 切到背景時不畫
  const CALM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function loop() {
    if (!renderer.domElement.isConnected) { running = false; return; }
    if (document.hidden) { setTimeout(() => requestAnimationFrame(loop), 1000); return; }
    const dt = CALM ? 0 : Math.min(clock.getDelta(), 0.1); t += dt;
    if (visitorSp) visitorSp.position.y = 0.95 + Math.abs(Math.sin(t * 2.2)) * 0.18;
    controls.update(); renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  function mount(el, opts) {
    container = el;
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));   // v2.30 省電：上限 1.5
      Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none' });
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(7.5, 6.2, 8.5);
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 1.3, 0);
      controls.enableDamping = true; controls.enablePan = false;
      controls.minDistance = 6; controls.maxDistance = 18;
      controls.minPolarAngle = 0.45; controls.maxPolarAngle = 1.4;
      controls.minAzimuthAngle = 0.05; controls.maxAzimuthAngle = 1.5;   // 只能從開放的那兩邊看進房間
      hemi = new THREE.HemisphereLight(0xffffff, 0xc9a98a, 0.9); scene.add(hemi);
      const sun = new THREE.DirectionalLight(0xfff2dd, 0.4); sun.position.set(6, 9, 5); scene.add(sun);
      lamp = new THREE.PointLight(0xffd59a, 0.35, 14); lamp.position.set(0, 4, 0); scene.add(lamp);
      window.addEventListener('resize', resize);
      clock = new THREE.Clock();
    }
    el.appendChild(renderer.domElement);
    resize();
    const sig = JSON.stringify(opts);
    if (sig !== signature) { signature = sig; build(opts); }
    if (!running) { running = true; clock.getDelta(); loop(); }
  }
  window.Room3D = { mount };
})();

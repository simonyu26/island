/**
 * 會考小島：訪客參觀頁（visit.html?c=邀請碼）
 * 訪客只拿得到島主確認過的快照，沒有配對碼，也不能改任何東西。
 * 參觀進度（暱稱、集到的章）只存在訪客自己的瀏覽器。
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
  const SUBJECT_NAME = { 國: '國文', 英: '英文', 數: '數學', 自: '自然', 社: '社會' };
  const SUBS = { 自: ['理化', '生物', '地科'], 社: ['歷史', '地理', '公民'] };
  const TIERS = [['🏰', 80], ['🏢', 20], ['🏘️', 5], ['🏠', 1]];
  const STAMPS = SUBJECTS.map(s => ({ key: s, name: SUBJECT_NAME[s] + '街' })).concat([{ key: 'home', name: '島主的家', ic: '🏡' }]);
  const app = document.getElementById('app');
  const code = (new URLSearchParams(location.search).get('c') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let V = null;   // 後端給的 { snapshot, welcome, expires, by, stats }
  let snap = null;

  const local = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const esc = s => String(s == null ? '' : s).replace(/妳/g, '你').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // TOAST_v1 排隊：正在顯示時，下一則至少等 1.2 秒才換上來（和 App 一樣）
  function toast(msg) {
    msg = String(msg); const q = toast.q || (toast.q = []);
    if (msg === toast.cur && !q.length) { clearTimeout(toast.h); toast.h = setTimeout(toastNext, Math.min(5000, Math.max(2600, 2000 + 100 * msg.length))); return; }
    if (q[q.length - 1] !== msg) q.push(msg);
    if (q.length > 3) q.splice(0, q.length - 3);
    if (!toast.cur) return toastNext();
    clearTimeout(toast.h); toast.h = setTimeout(toastNext, Math.max(0, 1200 - (Date.now() - toast.at)));
  }
  function toastNext() {
    const t = document.getElementById('toast'), msg = (toast.q || []).shift(); clearTimeout(toast.h);
    if (msg == null) { t.style.display = 'none'; toast.cur = null; return; }
    t.textContent = msg; t.style.display = 'block'; toast.cur = msg; toast.at = Date.now();
    toast.h = setTimeout(toastNext, toast.q.length ? 1500 : Math.min(5000, Math.max(2600, 2000 + 100 * msg.length)));   // 字多的停久一點，最多 5 秒
  }
  function town(p) {
    let n = Math.floor(p / 2), out = '';
    TIERS.forEach(([ic, size]) => { out += ic.repeat(Math.floor(n / size)); n %= size; });
    return out || '🌱';
  }
  function short(s) { const p = String(s || '').split('-'); return p.length === 3 ? Number(p[1]) + '/' + Number(p[2]) : s; }
  function taipeiHour() { return Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }).format(new Date())) % 24; }
  function phaseOf(h) { return h >= 19 || h < 5 ? 'night' : h < 7 ? 'dawn' : h < 17 ? 'day' : 'dusk'; }
  function resident(s) {
    const r = (snap.residents && snap.residents[s]) || {};
    return { name: r.name || SUBJECT_NAME[s] + '島民', emoji: r.emoji || '🙂', personality: r.personality || '', intro: r.intro || '' };
  }
  function roommate(sub) { const r = (snap.roommates && snap.roommates[sub]) || {}; return { name: r.name || '', emoji: r.emoji || '' }; }
  function guide() { const g = snap.guide || {}; return { name: g.name || '嚮導', emoji: g.emoji || '🦉' }; }
  function islandName() { return snap.title || '會考小島'; }

  // 參觀紀錄：每張邀請各自一份
  const progKey = 'visit:' + code;
  function prog() { try { return JSON.parse(local.get(progKey) || '{}'); } catch (e) { return {}; } }
  function saveProg(p) { local.set(progKey, JSON.stringify(p)); }
  function stamp(key) {
    const p = prog(); p.stamps = p.stamps || [];
    if (p.stamps.includes(key)) return;
    p.stamps.push(key); saveProg(p);
    const st = STAMPS.find(x => x.key === key);
    toast('🔴 蓋章：' + (st ? st.name : key) + (p.stamps.length === STAMPS.length ? '，集滿了！' : ''));
    renderPassport();
  }

  // ---------- 後端 ----------
  async function fetchVisit() {
    let res;
    try {
      res = await fetch(window.ISLAND_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ fn: 'visit', code }) });
    } catch (e) { throw new Error('連不上小島，檢查一下網路再試一次'); }
    const j = await res.json();
    if (j.error) throw new Error(j.error);
    return j.result;
  }

  function fail(msg) {
    app.innerHTML = `<div class="card" style="margin-top:40px;text-align:center"><div style="font-size:48px">🌫️</div>
      <h2>今天渡船沒有開</h2><div class="muted">${esc(msg)}</div></div>`;
  }

  // ---------- 碼頭：乘船券與歡迎詞 ----------
  function viewDock() {
    const g = guide(), p = prog();
    app.innerHTML = `<div class="boat">⛴️</div>
      <div class="ticket">
        <div class="head"><b>${esc(islandName())}</b><small>乘船券</small></div>
        <dl><dt>航線</dt><dd>本島碼頭 → ${esc(islandName())}</dd>
          <dt>有效至</dt><dd>${esc(short(V.expires))}</dd>
          <dt>邀請人</dt><dd>${V.by === 'me' ? '島主' : esc(V.by) + '（島主已同意）'}</dd></dl>
      </div>
      <div class="card"><div class="guide"><span class="who">${esc(g.emoji)}</span>
        <div class="grow"><b>${esc(g.name)}</b><div class="speech">${esc(V.welcome || '歡迎來到我的小島！')}</div></div></div>
        <label>你的暱稱（只存在這支手機，用來寫在紀念明信片上）</label>
        <input id="nick" maxlength="12" placeholder="例如：小美" value="${esc(p.nick || '')}">
        <button style="width:100%;margin-top:12px" id="board">🪧 登島參觀</button>
        <div class="muted" style="margin-top:8px">這是島主確認過、願意分享的樣子。你可以自由逛，但不會改到任何東西。</div></div>`;
    document.getElementById('board').onclick = () => {
      const q = prog(); q.nick = document.getElementById('nick').value.trim().slice(0, 12); saveProg(q);
      viewIsland();
    };
  }

  // ---------- 島上：自由參觀 ----------
  function viewIsland() {
    const stats = snap.stats;
    app.innerHTML = `<div class="ticket" style="padding:12px 18px">
        <div class="row"><b class="grow" style="color:var(--indigo);letter-spacing:2px">${esc(islandName())}</b>
          <span class="muted">Lv.${esc(snap.level || 1)}${snap.season ? '・' + esc(snap.season) : ''}</span></div></div>
      <div id="i3d"><span class="chip">👆 點一條街、或點島主的家</span><div class="loading">🏝️ 小島浮出海面中…</div></div>
      <div class="card" id="info"><div class="muted">點小島上的街道，看看島民和他們的房子。房子越多，代表島主在那一科花的心力越多。</div></div>
      ${stats ? `<div class="card"><h3>📋 島主的努力看板</h3><div class="board">
        <div><b>${esc(stats.streakWeeks || 0)}</b><span class="muted">連續有讀書的週數</span></div>
        <div><b>${esc(stats.weekDone || 0)}</b><span class="muted">這週完成的項目</span></div></div></div>` : ''}
      <div class="card" id="passport"></div>
      <div class="card"><h3>🏘️ 去島民家作客</h3><div class="row" style="justify-content:space-around">
        <button class="ghost" style="padding:6px 8px;min-width:58px" data-room="me">🏡<br><small>島主</small></button>
        ${SUBJECTS.map(s => `<button class="ghost" style="padding:6px 8px;min-width:58px" data-room="${s}">${esc(resident(s).emoji)}<br><small>${esc(resident(s).name)}</small></button>`).join('')}
      </div></div>
      <div class="muted" style="text-align:center">快照拍攝於 ${esc(short(snap.at))}・照片與資料由島主分享</div>`;
    app.querySelectorAll('[data-room]').forEach(b => b.onclick = () => openRoom(b.dataset.room));
    renderPassport();
    mount3D();
  }

  function renderPassport() {
    const box = document.getElementById('passport'); if (!box) return;
    const got = prog().stamps || [], done = got.length === STAMPS.length;
    box.innerHTML = `<div class="row"><h3 class="grow" style="margin:0">🎫 登島集章</h3><span class="muted">${got.length} / ${STAMPS.length}</span></div>
      <div class="muted">逛過一個地方就蓋一個章，點章可以直接過去。</div>
      <div class="stamps">${STAMPS.map(st => `<div class="stamp ${got.includes(st.key) ? 'on' : ''}" data-go="${st.key}">
        <span>${esc(st.ic || resident(st.key).emoji)}</span>${esc(st.name)}</div>`).join('')}</div>
      ${done ? `<button style="width:100%;margin-top:12px" id="souvenir">🎴 下載登島紀念明信片</button>` : ''}`;
    box.querySelectorAll('[data-go]').forEach(el => el.onclick = () => {
      const k = el.dataset.go;
      if (k === 'home') openRoom('me');
      else if (window.Island3D && Island3D.select) { Island3D.select(k); document.getElementById('i3d').scrollIntoView({ behavior: 'smooth' }); }
      else showInfo(k);
    });
    const sv = document.getElementById('souvenir'); if (sv) sv.onclick = souvenir;
  }

  function showInfo(s) {
    stamp(s);
    const box = document.getElementById('info'); if (!box) return;
    const r = resident(s), pts = snap.pts || {};
    const lanes = SUBS[s] ? SUBS[s].concat(s === '自' ? ['自然'] : ['社會']) : [s];
    box.innerHTML = `<div class="resident"><span class="avatar">${esc(r.emoji)}</span>
        <div><b>${esc(r.name)}</b><div class="muted">${SUBJECT_NAME[s]}街${r.personality ? '・' + esc(r.personality) : ''}</div>${r.intro ? `<div style="font-size:13px;margin-top:4px">${esc(r.intro)}</div>` : ''}</div></div>
      <div style="margin-top:10px">${lanes.map(l => {
        const m = SUBS[s] ? roommate(l) : null;
        const name = l === '自然' || l === '社會' ? '綜合廣場' : (m && m.name ? m.name + '（' + l + '）' : (SUBS[s] ? l : SUBJECT_NAME[s] + '街'));
        return `<div class="lane"><span class="lane-name">${esc(name)}</span><span class="town">${town(pts[l] || 0)}</span></div>`; }).join('')}</div>
      <button class="ghost" style="width:100%;margin-top:10px" data-room="${s}">🏠 去${esc(r.name)}家作客</button>`;
    box.querySelector('[data-room]').onclick = () => openRoom(s);
  }

  function loadScript(src) {
    return new Promise((ok, bad) => { const el = document.createElement('script'); el.src = src; el.onload = ok; el.onerror = () => bad(new Error(src)); document.head.appendChild(el); });
  }
  async function mount3D() {
    const el = document.getElementById('i3d'); if (!el) return;
    try {
      if (!window.THREE) await loadScript('three.min.js');
      if (!THREE.OrbitControls) await loadScript('OrbitControls.js');
      if (!window.FpsGuard) await loadScript('fpsguard.js').catch(() => {});   // 載不到就照原本的畫質
      if (!window.Island3D) await loadScript('island3d.js');
      el.querySelector('.loading').remove();
      const holder = document.createElement('div'); holder.style.cssText = 'position:absolute;inset:0'; el.appendChild(holder);
      Island3D.mount(holder, {
        S: { grid: {}, assessments: [], save: {}, weeks: [] },
        bond: snap.bond || {}, resident, roommate, imgOf: () => null, subjectName: SUBJECT_NAME,
        pointsUntil: () => snap.pts || {}, sig: JSON.stringify(snap.pts || {}), season: snap.season, walk: snap.walk || 0,
        home: snap.home || null, onHome: () => openRoom('me'), grade: () => null, onSelect: showInfo,
        garden: snap.garden || null,  // v2.10：她種的植物（不含小木牌）
        book: snap.book || null,      // v2.17：獨立書店（訪客只看外觀）
        yatai: snap.yatai || null,    // v2.30.3：島の屋台（訪客只看外觀）
        marks: snap.marks || null     // v2.19：讀完書長出的地標（只有樣子，不給點）
      });
      Island3D.setEnvironment({ phase: phaseOf(taipeiHour()), weather: 'clear' });
    } catch (e) {
      el.innerHTML = `<div style="padding:16px">${SUBJECTS.map(s => `<div class="card" style="cursor:pointer" data-s="${s}">
        <div class="resident"><span class="avatar">${esc(resident(s).emoji)}</span><b>${SUBJECT_NAME[s]}街</b></div></div>`).join('')}</div>`;
      el.style.overflow = 'auto';
      el.querySelectorAll('[data-s]').forEach(c => c.onclick = () => showInfo(c.dataset.s));
    }
  }

  // ---------- 房間（唯讀） ----------
  // 島主的家：同住夥伴招呼訪客（不談她的事）、她分享的日めくり
  function homeExtras() {
    const m = snap.mate, pages = snap.diary || [];
    return (m ? `<div class="row" style="margin-top:10px;flex-wrap:nowrap"><span style="font-size:28px">${esc(m.emoji || '🐱')}</span><div class="speech grow"><b>${esc(m.name)}</b>：いらっしゃい～歡迎來我們家坐坐！</div></div>` : '')
      + (pages.length ? `<div style="margin-top:10px"><b>📆 日めくり</b>${pages.slice().reverse().map(p => `<div class="muted" style="margin-top:4px">${esc(p.date.slice(5).replace('-', '/'))}・${esc(p.text)} ${esc(p.emoji || '')}</div>`).join('')}</div>` : '');
  }
  async function openRoom(who) {
    const room = (snap.rooms || {})[who] || { wall: '#f6efe6', items: [] };
    if (who === 'me') stamp('home');
    const title = who === 'me' ? (snap.home && snap.home.name) || '島主的家' : resident(who).name + '的家';
    const sheet = document.createElement('div'); sheet.className = 'sheet';
    sheet.innerHTML = `<div class="card"><div class="row"><h3 class="grow" style="margin:0">🏠 ${esc(title)}</h3><button class="ghost" id="closeRoom">關上門</button></div>
      <div id="r3d" style="margin-top:10px"><div class="loading" style="padding-top:120px">🛋️ 開門中…</div></div>
      <div class="muted" style="margin-top:6px">👆 拖曳可以轉動房間，兩指可以拉近。</div>
      ${who === 'me' ? homeExtras() : ''}</div>`;
    document.body.appendChild(sheet);
    const close = () => sheet.remove();
    sheet.querySelector('#closeRoom').onclick = close;
    sheet.onclick = e => { if (e.target === sheet) close(); };
    const el = sheet.querySelector('#r3d');
    try {
      if (!window.THREE) await loadScript('three.min.js');
      if (!THREE.OrbitControls) await loadScript('OrbitControls.js');
      if (!window.FpsGuard) await loadScript('fpsguard.js').catch(() => {});   // 載不到就照原本的畫質
      if (!window.Room3D) await loadScript('room3d.js');
      el.innerHTML = '';
      Room3D.mount(el, { wall: room.wall, accent: room.accent || '#741b47', night: phaseOf(taipeiHour()) === 'night', items: room.items || [], visitor: null });
    } catch (e) {
      const zone = z => (room.items || []).filter(f => (f.z || 'floor') === z).map(f => esc(f.ic)).join(' ');
      el.outerHTML = `<div class="room" style="background:linear-gradient(${esc(room.wall)} 50%, #d9b88f 50%);margin-top:10px">
        <div class="zone">${zone('wall') || '<small class="muted">（牆上空空的）</small>'}</div><div class="zone">${zone('floor')}</div></div>`;
    }
  }

  // ---------- 集滿章：紀念明信片 ----------
  function souvenir() {
    const W = 1200, H = 800, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), p = prog();
    const font = (px, w) => `${w || ''} ${px}px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif`;
    const emoji = px => `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#b98a5e'; g.lineWidth = 10; g.strokeRect(24, 24, W - 48, H - 48);
    // 左半：海與小島
    g.fillStyle = '#cfe8f3'; g.fillRect(60, 60, 560, H - 120);
    g.fillStyle = '#dff0d8'; g.beginPath(); g.ellipse(340, 470, 230, 120, 0, 0, Math.PI * 2); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = emoji(64); SUBJECTS.forEach((s, i) => drawEmoji(g, resident(s).emoji, 180 + i * 80, 450 + (i % 2) * 40));
    g.font = emoji(90); g.fillText('🏡', 340, 330);
    g.font = emoji(70); g.fillText('⛴️', 520, 640);
    // 右半：文字
    g.textAlign = 'left'; g.fillStyle = '#2f4a7a'; g.font = font(54, 'bold'); g.fillText(islandName(), 660, 140);
    g.fillStyle = '#3a2a33'; g.font = font(30);
    g.fillText((p.nick || '一位旅人') + ' 到此一遊', 660, 230);
    g.fillText(new Date().toLocaleDateString('zh-TW'), 660, 285);
    g.fillStyle = '#8a7480'; g.font = font(24);
    wrap(g, '「' + (V.welcome || '歡迎來到我的小島！') + '」', 660, 360, 480, 36, 5);
    // 郵戳
    g.strokeStyle = '#c0392b'; g.lineWidth = 5; g.beginPath(); g.arc(1030, 640, 80, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#c0392b'; g.textAlign = 'center'; g.font = font(26, 'bold'); g.fillText('登島紀念', 1030, 625);
    g.font = font(20); g.fillText('集章 ' + STAMPS.length + ' / ' + STAMPS.length, 1030, 662);
    const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = islandName() + '_登島紀念.png'; a.click();
  }
  function wrap(g, text, x, y, maxW, lh, maxLines) {
    let line = '', n = 0;
    for (const ch of text) {
      if (g.measureText(line + ch).width > maxW) { g.fillText(line, x, y + n * lh); line = ch; if (++n >= maxLines) return; }
      else line += ch;
    }
    if (line) g.fillText(line, x, y + n * lh);
  }

  // ---------- 開始 ----------
  async function boot() {
    if (!window.ISLAND_API_URL || /請貼上/.test(window.ISLAND_API_URL)) return fail('小島伺服器還沒設定好。');
    if (!code) return fail('連結裡沒有邀請碼，請跟島主要一個完整的連結。');
    try {
      V = await fetchVisit(); snap = V.snapshot || {};
      document.title = islandName() + '・登島參觀';
      viewDock();
    } catch (e) { fail(e.message || String(e)); }
  }
  boot();
})();

// 紫色的烏龜：畫面上出現的 🐢 一律包成 .purple-ic（CSS 轉成紫色）
(function () {
  const SKIP = { OPTION: 1, TEXTAREA: 1, SCRIPT: 1, STYLE: 1, TITLE: 1 };
  function wrap(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (root.data.indexOf('🐢') >= 0) one(root); return; }
    if (root.nodeType !== 1 || SKIP[root.tagName]) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
    while (w.nextNode()) if (w.currentNode.data.indexOf('🐢') >= 0) list.push(w.currentNode);
    list.forEach(one);
  }
  function one(t) {
    const par = t.parentNode;
    if (!par || SKIP[par.nodeName] || (par.closest && par.closest('.purple-ic'))) return;
    const f = document.createDocumentFragment();
    t.data.split('🐢').forEach((x, i) => { if (i) { const s = document.createElement('span'); s.className = 'purple-ic'; s.textContent = '🐢'; f.appendChild(s); } if (x) f.appendChild(document.createTextNode(x)); });
    par.replaceChild(f, t);
  }
  function start() { wrap(document.body); new MutationObserver(ms => ms.forEach(m => m.type === 'characterData' ? wrap(m.target) : m.addedNodes.forEach(wrap))).observe(document.body, { childList: true, subtree: true, characterData: true }); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

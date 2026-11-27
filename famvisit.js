/* 會考小島：家人互相拜訪的畫面（家人島工作串；工程顧問 10/27 設計審查通過）
 * 點港口選單、主島飛船碼頭的「去○○的島」才下載這個檔（Index.html 的 openFamVisit）。
 * 只看島主同意時做的快照（後端 famSnap），沒有任何寫入的按鈕；不記誰來看過。
 * 日めくり：後端照島主分享的頁現讀，家人和她來看都一樣（爸爸 10/28）；沒分享的頁誰都拿不到。
 */
(function () {
  const SLOT = ['國', '英', '數', '自', '社'];
  // AVATAR_LD_v1：插畫頭像用 index 的 ldImg（認不得的代號畫名字首字）；3D 由 island3d 自己認 ld:
  const fvAv = (e, d, name) => /^ld:/.test(e || '') ? (typeof ldImg === 'function' ? ldImg(e, 'pic', name) : esc(Array.from(String(name || '').trim())[0] || d)) : esc(e || d);
  const cache = {};   // 稱呼 → { at, snapshot, diary } 或 { error }；這次打開 App 只抓一次
  let busy = null;
  function back() { return typeof ownMode === 'function' && ownMode() ? '回到我的島 🏝️' : '回到小島 🏝️'; }
  function load(name) {
    if (cache[name] || busy === name) return;
    busy = name;
    call('famSnap', name).then(r => { cache[name] = r || { error: '這座島還沒開放拜訪' }; }, e => { cache[name] = { error: String(e && e.message || e) }; })
      .then(() => { busy = null; if (tab === 'famvisit') render(); });
  }
  // FAM_VISITPICK_v1（11/23 決策）：選人列。目前這座實心梅紫＋✓，其他白底梅紫字；全部用 🏝️，靠文字分辨
  const vpStyle = '<style>.vpick{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px;margin:0 -2px 4px;scroll-snap-type:x proximity}.vpick button{flex:0 0 auto;scroll-snap-align:start;min-height:44px;max-width:70vw;padding:0 14px;border-radius:22px;background:#fff;color:var(--plum);border:1px solid #d8d4ce;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vpick button[aria-current]{background:var(--plum);color:#fff;border-color:var(--plum)}</style>';
  function pick(cur) {
    const me = (S && S.who && S.who.name) || '', list = ((S && S.famVisit) || []).filter(n => typeof n === 'string' && n && n !== me);
    if (!list.length) return '';
    return vpStyle + '<div class="muted" style="margin:0 0 4px">去哪座島看看</div><div class="vpick" id="vpick" role="group" aria-label="去哪座島看看">'
      + '<button onclick="go(\'home\')">🏝️ 我的島</button>'
      + list.map(n => n === cur ? `<button aria-current="page" onclick="">🏝️ ✓ ${esc(famIsleLabel(n))}</button>` : `<button onclick="openFamVisit(${esc(JSON.stringify(n))})">🏝️ ${esc(famIsleLabel(n))}</button>`).join('') + '</div>';
  }
  function view() {
    const name = famVisitWho, r = cache[name];
    if (!r) { load(name); return '<div class="loading">🎈 飛往' + esc(name) + '的島…</div>'; }   // AIRSHIP_WORDS_v1
    if (r.error) return pick(name) + `<div class="card" style="text-align:center"><div style="font-size:40px">🌫️</div><h3>${esc(r.error)}</h3></div>
      <div class="row"><button class="ghost grow" onclick="go('home')">${back()}</button></div>`;
    const s = r.snapshot || {}, g = s.guide || {}, dirs = s.dirs || [], res = s.residents || {}, diary = r.diary || [];
    return pick(name) + `<div class="card"><div class="row"><h2 class="grow" style="margin:0">🏝️ ${esc(famIsleLabel(name))}</h2><span class="muted">島嶼 Lv.${esc(s.level || 1)}</span></div>
        <div class="muted" style="margin-top:4px">${esc(short(r.at || s.at || ''))} 的樣子</div></div>
      <div id="fv3d" style="height:min(52vh,400px);border-radius:16px;overflow:hidden;background:${s.bg === 'space' ? '#141c36' : s.bg === 'sky' ? '#dcefff' : '#cfe8f3'}"><div class="loading" style="padding-top:150px">🏝️ 小島浮出海面中…</div></div>
      <div class="card"><div class="row" style="flex-wrap:nowrap"><span style="font-size:34px">${fvAv(g.emoji, '🐢', g.name || '島主夥伴')}</span>
        <div class="speech grow"><b>${esc(g.name || '島主夥伴')}</b>：歡迎來${esc(name)}的島！慢慢逛。</div></div></div>
      ${dirs.length ? `<div class="card"><h3 style="margin-top:0">🧭 ${esc(name)}的方向</h3>${dirs.map(d => { const p = res[SLOT[d.slot]] || {};
        return `<div class="item"><span class="avatar">${fvAv(p.emoji, '🙂', p.name || d.name)}</span><div class="name"><b>${esc(d.ic || '⭐')} ${esc(d.name)}</b>${p.name ? '・' + esc(p.name) : ''}</div></div>`; }).join('')}</div>` : ''}
      ${diary.length ? `<div class="card"><h3 style="margin-top:0">📆 ${esc(name)}分享的日めくり</h3>${diary.slice().reverse().map(p => `<div style="margin-top:6px"><span class="muted">${esc(short(p.date))}</span>・${esc(p.text)} ${esc(p.emoji || '')}</div>`).join('')}</div>` : ''}
      <div class="muted" style="text-align:center;margin:4px 0 10px">這是${esc(name)}願意分享的樣子。你可以慢慢看，不會改到任何東西。</div>
      <div class="row"><button class="ghost grow" onclick="go('home')">${back()}</button></div>`;
  }
  async function after() {
    { const v = document.getElementById('vpick'), c = v && v.querySelector('[aria-current]'); if (v && c) v.scrollLeft = Math.max(0, c.offsetLeft - (v.clientWidth - c.offsetWidth) / 2); }   // FAM_VISITPICK_v1：目前那顆捲到看得到
    const el = document.getElementById('fv3d'), r = cache[famVisitWho]; if (!el || !r || r.error) return;
    const s = r.snapshot || {}, live = (s.dirs || []).map(d => SLOT[d.slot]), res = s.residents || {}, names = {}, ics = {};
    (s.dirs || []).forEach(d => { names[SLOT[d.slot]] = d.name; ics[SLOT[d.slot]] = d.ic; });
    const who = k => { const p = res[k] || {}; return { name: p.name || (names[k] || '') + '島民', emoji: p.emoji || '🙂', pic: p.emoji || '🙂', personality: p.personality || '' }; };
    try {
      if (!window.THREE) await loadScript('three.min.js');
      if (!THREE.OrbitControls) await loadScript('OrbitControls.js');
      if (!window.FpsGuard) await loadScript('fpsguard.js').catch(() => {});   // 從主島飛過來時 Island3D 可能還沒載過，畫質一樣自動調
      if (!window.Island3D) await loadScript('island3d.js');
      if (!document.getElementById('fv3d')) return;
      el.innerHTML = '';
      Island3D.mount(el, {
        S: { grid: {}, assessments: [], save: {}, weeks: [] },   // 和乘船券的參觀頁一樣：沒有週紀錄，只畫快照
        bond: s.bond || {}, resident: who, roommate: () => ({ name: '', emoji: '' }), imgOf: () => null, subjectName: names, subjIc: ics,
        pointsUntil: () => s.pts || {}, sig: JSON.stringify(s.pts || {}), season: s.season, walk: s.walk || 0,
        home: s.home || null, onHome: () => {}, layout: { lanes: false, light: false, off: SLOT.filter(k => live.indexOf(k) < 0), bg: s.bg },
        light: null, ferry: null, yatai: null, book: null, marks: [], garden: s.garden || null, islets: s.islets || [],
        grade: () => null, mainIsle: null, onSelect: () => {}
      });
    } catch (e) { console.warn('famvisit 3D', e); el.innerHTML = '<div class="muted" style="padding:20px;text-align:center">這個裝置開不了 3D，看下面的介紹就好。</div>'; }
  }
  window.FamVisit = { view, after };
})();

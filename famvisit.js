/* 會考小島：家人互訪的參觀畫面（家人島工作串；工程顧問 10/27 設計審查通過）
 * 點港口選單、主島飛船碼頭的「去○○的島」才下載這個檔（Index.html 的 openFamVisit）。
 * 只看島主同意時做的快照（後端 famSnap），沒有任何寫入的按鈕；不記誰來看過。
 * 日めくり：後端照島主分享的頁現讀，家人和她來看都一樣（爸爸 10/28）；沒分享的頁誰都拿不到。
 */
(function () {
  const SLOT = ['國', '英', '數', '自', '社'];
  const cache = {};   // 稱呼 → { at, snapshot, diary } 或 { error }；這次打開 App 只抓一次
  let busy = null;
  function back() { return typeof ownMode === 'function' && ownMode() ? '回到我的島 🏝️' : '回到小島 🏝️'; }
  function load(name) {
    if (cache[name] || busy === name) return;
    busy = name;
    call('famSnap', name).then(r => { cache[name] = r || { error: '這座島還沒開放參觀' }; }, e => { cache[name] = { error: String(e && e.message || e) }; })
      .then(() => { busy = null; if (tab === 'famvisit') render(); });
  }
  function view() {
    const name = famVisitWho, r = cache[name];
    if (!r) { load(name); return '<div class="loading">⛴️ 開往' + esc(name) + '的島…</div>'; }
    if (r.error) return `<div class="card" style="text-align:center"><div style="font-size:40px">🌫️</div><h3>${esc(r.error)}</h3></div>
      <div class="row"><button class="ghost grow" onclick="go('home')">${back()}</button></div>`;
    const s = r.snapshot || {}, g = s.guide || {}, dirs = s.dirs || [], res = s.residents || {}, diary = r.diary || [];
    return `<div class="card"><div class="row"><h2 class="grow" style="margin:0">🏝️ ${esc(s.title || name + '的島')}</h2><span class="muted">島嶼 Lv.${esc(s.level || 1)}</span></div>
        <div class="muted" style="margin-top:4px">${esc(name)}的島・${esc(short(r.at || s.at || ''))} 的樣子</div></div>
      <div id="fv3d" style="height:min(52vh,400px);border-radius:16px;overflow:hidden;background:${s.bg === 'space' ? '#141c36' : s.bg === 'sky' ? '#dcefff' : '#cfe8f3'}"><div class="loading" style="padding-top:150px">🏝️ 小島浮出海面中…</div></div>
      <div class="card"><div class="row" style="flex-wrap:nowrap"><span style="font-size:34px">${esc(g.emoji || '🐢')}</span>
        <div class="speech grow"><b>${esc(g.name || '島主夥伴')}</b>：歡迎來${esc(name)}的島！慢慢逛。</div></div></div>
      ${dirs.length ? `<div class="card"><h3 style="margin-top:0">🧭 ${esc(name)}的方向</h3>${dirs.map(d => { const p = res[SLOT[d.slot]] || {};
        return `<div class="item"><span class="avatar">${esc(p.emoji || '🙂')}</span><div class="name"><b>${esc(d.ic || '⭐')} ${esc(d.name)}</b>${p.name ? '・' + esc(p.name) : ''}</div></div>`; }).join('')}</div>` : ''}
      ${diary.length ? `<div class="card"><h3 style="margin-top:0">📆 ${esc(name)}分享的日めくり</h3>${diary.slice().reverse().map(p => `<div style="margin-top:6px"><span class="muted">${esc(short(p.date))}</span>・${esc(p.text)} ${esc(p.emoji || '')}</div>`).join('')}</div>` : ''}
      <div class="muted" style="text-align:center;margin:4px 0 10px">這是${esc(name)}願意分享的樣子。你可以慢慢看，不會改到任何東西。</div>
      <div class="row"><button class="ghost grow" onclick="go('home')">${back()}</button></div>`;
  }
  async function after() {
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

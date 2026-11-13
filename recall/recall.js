// 快問快答 RECALL_v1 的頁面（index.html 的 viewRecall 第一次進頁才載入）。規則說明見 index.html 的 RECALL_v1 註解。
function rcNext(box, ok, date) { const b = ok ? Math.min(5, (box || 0) + 1) : 1; return [b, addD(date, RC_BOX[b - 1])]; }
function rcNewToday(g) { return Number(local.get('rcNew:' + g + ':' + S.today)) || 0; }
function rcMotion() { try { return !matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } }
function rcNoTimer() {
  const n = new Date(); if (n.getHours() * 60 + n.getMinutes() >= 21 * 60 + 30) return '21:30 以後不倒數，慢慢想。';
  const p = PORTS.find(x => !x.start && x.id !== 'mo1' && S.today >= addD(x.days[0], -7) && S.today < x.days[0]);
  return p ? p.name + '前一週不倒數，慢慢想。' : '';
}
/** 這一科今天可以練哪幾組：lock＝上一次練習日做過的；rec＝最久沒練的（同樣久照牌組順序） */
function rcCount(g) {
  const st = rcCards(g), deck = rc.decks[g]; if (!deck) return { due: 0, fresh: 0 };
  const due = deck.cards.filter(c => st[c.id] && st[c.id][1] <= S.today).length;
  return { due, fresh: due > RC_NONEW ? 0 : Math.max(0, Math.min(RC_NEW - rcNewToday(g), deck.cards.filter(c => !st[c.id]).length)) };
}
function rcRec(s) { const p = rcPlan(s); if (p.done.length) return null; return p.order.find(g => !rc.decks[g] || rcCount(g).due + rcCount(g).fresh > 0) || null; }
function rcLoad() {
  const need = (RC_LIVE[rc.s] || []).filter(g => !rc.decks[g]);
  if (!need.length || rc.loading) return;
  rc.loading = true; rc.fail = false;
  Promise.all(need.map(g => fetch('recall/' + g + '.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(j => {
    if (!j || j.group !== g || !Array.isArray(j.cards) || !j.types) throw new Error('bad deck'); rc.decks[g] = j; })))
    .catch(() => { rc.fail = true; }).then(() => { rc.loading = false; if (tab === 'recall') render(); });
}
function rcHead(text) {
  const r = resident(rc.s);
  return `<div class="card"><div class="resident"><span class="avatar">${r.pic}</span><div><b>${esc(r.name)}</b><div class="muted">${text}</div></div></div></div>`;
}
function rcView() {
  const s = rc.s, back = `<div class="row" style="margin-top:8px"><button class="x grow" onclick="go('home')">回${esc(RC_STREET(s || '國'))}</button></div>`;
  if (!s || !RC_LIVE[s]) return `<div class="card">找不到這一組快問快答。</div>` + back;
  if (isFamily() || ownMode()) return rcHead('快問快答是島主自己的練習。') + back;
  if (rc.fail) return rcHead('現在連不上題庫，等一下再試。') + `<button style="width:100%" onclick="rc.fail=false;render()">再試一次</button>` + back;
  if ((RC_LIVE[s] || []).some(g => !rc.decks[g])) { rcLoad(); return rcHead('我去拿題目，等我一下…') + back; }
  if (rc.step === 'q' && rc.cur) return rcQView();
  if (rc.step === 'end' && rc.end) return rcEndView() + back;
  return rcPickView() + back;
}
function rcPickView() {
  const s = rc.s, p = rcPlan(s), rec = rcRec(s), rk = rcRk(), first = !rk.c && !local.get('rcHi');
  if (rec && !rc.sel.includes(rec)) rc.sel = [rec].concat(rc.sel).slice(0, 2);
  rc.sel = rc.sel.filter(g => p.can(g));
  const left = 2 - p.done.length;
  const rows = p.live.map(g => {
    const n = rcCount(g), on = rc.sel.includes(g), nm = RC_GROUP[g][1] + ' ' + RC_GROUP[g][0];
    if (!p.can(g)) return `<div class="rc-grp off">${nm}<span class="n">${p.full ? '今天已經練兩組了' : '上次做過，下次再來'}</span></div>`;
    const empty = !n.due && !n.fresh;
    return `<div class="rc-grp ${on ? 'rec' : ''} ${empty ? 'off' : ''}" role="button" tabindex="0" ${empty ? '' : `onclick="rcToggle('${g}')"`}>${on ? '✓ ' : ''}${nm}${g === rec ? '<span class="pill">推薦・最久沒做</span>' : ''}<span class="n">${empty ? '今天沒有要練的卡' : '到期 ' + n.due + '・新 ' + n.fresh}</span></div>`;
  }).join('');
  const total = rc.sel.reduce((a, g) => a + Math.min(RC_ROUND, rcCount(g).due + rcCount(g).fresh), 0), names = rc.sel.map(g => RC_GROUP[g][0]).join('、');
  const say = first ? '我是' + esc(resident(s).name) + '。快問快答一輪最多 20 題，到期的卡先出，答錯的明天會再出現。一天練一到兩組，上次練過的組，下次換別組。'
    : rec ? '今天先做' + RC_GROUP[rec][0] + '？好久沒練了。' : p.done.length ? '今天練過' + p.done.map(g => RC_GROUP[g][0]).join('、') + '了，還想再練嗎？' : '今天想練哪一組？';
  const off = rcNoTimer();
  return rcHead(say) + rows + `<p class="muted">可以選 1～2 組${rec ? '，推薦的那組一定要選' : ''}。${left < 2 && !p.full ? '今天還能再選 ' + left + ' 組。' : ''}${off ? '<br>' + off : ''}</p>
    <button style="width:100%" ${total ? '' : 'disabled'} onclick="rcStart()">開始${names ? '（' + esc(names) + '）' : ''}</button>`;
}
function rcToggle(g) {
  const s = rc.s, p = rcPlan(s), rec = rcRec(s);
  if (rc.sel.includes(g)) { if (g === rec) return toast('推薦的那組一定要選'); rc.sel = rc.sel.filter(x => x !== g); }
  else { const after = p.done.concat(rc.sel.filter(x => !p.done.includes(x))); if (!p.done.includes(g) && after.length >= 2) return toast('一天最多練兩組'); if (rc.sel.length >= 2) return toast('一次最多選兩組'); rc.sel.push(g); }
  render();
}
const rcShuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function rcStart() {
  const due = [], fresh = {};
  rc.sel.forEach(g => { const st = rcCards(g), deck = rc.decks[g];
    deck.cards.forEach(c => { if (st[c.id] && st[c.id][1] <= S.today) due.push({ g, c, v: st[c.id] }); }); });
  due.sort((a, b) => a.v[1] < b.v[1] ? -1 : a.v[1] > b.v[1] ? 1 : 0);
  let list = due.slice(0, RC_ROUND);
  if (due.length <= RC_NONEW) {
    rc.sel.forEach(g => { const st = rcCards(g), n = Math.max(0, RC_NEW - rcNewToday(g)); fresh[g] = rc.decks[g].cards.filter(c => !st[c.id]).slice(0, n).map(c => ({ g, c, v: null })); });
    for (let k = 0; list.length < RC_ROUND && rc.sel.some(g => fresh[g].length); k++) rc.sel.forEach(g => { if (list.length < RC_ROUND && fresh[g].length) list.push(fresh[g].shift()); });
  }
  if (!list.length) return toast('今天沒有要練的卡');
  if (!rcRk().c) local.set('rcHi', '1');
  rcClear(); rc.q = list; rc.i = 0; rc.res = {}; rc.pauses = RC_PAUSE; rc.again = false; rc.end = null; rc.step = 'q'; rc.before = { xp: D.xp, kz: D.kizuna && D.kizuna.her[rc.s] ? D.kizuna.her[rc.s].score : 0 };
  rcAsk(); render(); window.scrollTo(0, 0);
}
/** 組一題：目標卡＋同一組同題型的 3 張干擾（zy1、zx1 用人寫的錯讀／錯字；兩兩題用相反的那一種卡） */
function rcMake(it) {
  const c = it.c, deck = rc.decks[it.g], T = deck.types[c.t] || {}, pool = deck.cards.filter(x => x.t === c.t && x.id !== c.id);
  const mark = (w, ch, txt) => { const i = w.indexOf(ch); return esc(w.slice(0, i)) + '「' + esc(txt) + '」' + esc(w.slice(i + 1)); };
  let stem = esc(T.stem || ''), opts;
  if (c.t.slice(-1) === '1' && c.x) {   // zy1：例句＋讀音
    const ds = rcShuffle(pool.filter(x => x.c !== c.c)).slice(0, 3);
    opts = [{ h: esc(c.s) + '：' + c.a, ok: true, c }].concat(ds.map(x => ({ h: esc(x.s) + '：' + x.x[Math.floor(Math.random() * 3)], ok: false, c: x })));
  } else if (c.t.slice(-1) === '1') {   // zx1：句子，干擾卡換成錯字
    const ds = rcShuffle(pool).slice(0, 3);
    opts = [{ h: esc(c.s), ok: true, c }].concat(ds.map(x => ({ h: esc(x.s.slice(0, x.at) + x.bad + x.s.slice(x.at + 1)), ok: false, c: x })));
  } else {   // zy2、zx2：兩兩比較；目標卡是「不同」時題幹換成「不同」並加底線粗體（文案審查 184）
    const ds = rcShuffle(pool.filter(x => x.same !== c.same)).slice(0, 3), zy = !!(c.p[0].a);
    const f = x => x.p.map(p => zy ? mark(p.w, p.c, p.c) : mark(p.w, p.c, x.zh)).join('／');
    if (!c.same) stem = esc(T.stemDiff || '').replace('不同', '<u><b>不同</b></u>');
    opts = [{ h: f(c), ok: true, c }].concat(ds.map(x => ({ h: f(x), ok: false, c: x })));
  }
  const untimed = !it.v && !it.re;
  return { g: it.g, c, stem, opts: rcShuffle(opts), sec: T.sec || 20, untimed, t0: Date.now(), pMs: 0, pAt: 0, auto: false, paused: false, done: false, re: !!it.re };
}
function rcAsk() { rc.cur = rcMake(rc.q[rc.i]); }
function rcElapsed(q) { const now = q.pAt || Date.now(); return Math.max(0, now - q.t0 - q.pMs); }
function rcTimed(q) { return q && !q.untimed && !rcNoTimer() && !(rcRk().cfg && rcRk().cfg.timerOn === false); }
/** 畫完之後：倒數細條用 CSS transition 一次跑完、時間到用 setTimeout（不每秒重畫）；答錯的 3 秒鎖也在這裡接回去 */
function rcAfter() {
  const q = rc.cur; if (rc.step !== 'q' || !q) return;
  if (!q.done) {
    if (!rcTimed(q)) return;
    const total = q.sec * 1000, left = Math.max(0, total - rcElapsed(q)), bar = document.getElementById('rcBar');
    if (bar) { bar.style.transition = 'none'; bar.style.transform = 'scaleX(' + (left / total) + ')';
      if (!q.pAt && rcMotion()) { void bar.offsetWidth; bar.style.transition = 'transform ' + left + 'ms linear'; bar.style.transform = 'scaleX(0)'; } }
    if (q.pAt) rcT('q', null); else rcT('q', rcTimeout, left);
  } else if (q.lockUntil) rcTick();
}
function rcTick() {
  const q = rc.cur, b = document.getElementById('rcNext'); if (!q || !b) return;
  const n = Math.ceil((q.lockUntil - Date.now()) / 1000);
  if (n > 0) { b.textContent = '下一題（' + n + '）'; b.disabled = true; b.className = 'rc-wait'; rcT('lock', rcTick, Math.min(1000, q.lockUntil - Date.now())); }
  else { b.textContent = rc.i + 1 >= rc.q.length ? '看這一輪的結果' : '下一題'; b.disabled = false; b.className = ''; }
}
function rcPause() {
  const q = rc.cur; if (!q || q.done || q.pAt || rc.pauses <= 0) return;
  rc.pauses--; q.pAt = Date.now(); q.paused = true; rcT('q', null); render();
}
function rcResume() { const q = rc.cur; if (!q || !q.pAt) return; q.pMs += Date.now() - q.pAt; q.pAt = 0; q.auto = false; render(); }
document.addEventListener('visibilitychange', () => {   // 切到背景自動暫停，不算進 2 次
  const q = rc.cur; if (tab !== 'recall' || rc.step !== 'q' || !q || q.done) return;
  if (document.visibilityState === 'hidden') { if (!q.pAt) { q.pAt = Date.now(); q.auto = true; rcT('q', null); } }
  else if (q.auto) { q.pMs += Date.now() - q.pAt; q.pAt = 0; q.auto = false; rcAfter(); }
});
function rcRecord(q, ok, timeout) {
  const id = q.c.id, v = rcCards(q.g)[id], r = rc.res[id] || (rc.res[id] = { g: q.g, box0: v ? v[0] : 0, sec0: v ? v[2] : 0, isNew: !v, timeout: false, paused: false });
  r.ok = ok; r.sec = q.sec; if (timeout) r.timeout = true; if (q.paused) r.paused = true; if (q.untimed) r.untimed = true;
}
function rcPick(i) {
  const q = rc.cur; if (!q || q.done) return;
  rcT('q', null); q.sec = rcElapsed(q) / 1000; q.done = true; q.choice = i;
  const ok = q.opts[i].ok; rcRecord(q, ok, false);
  if (ok) { render(); rcT('next', rcNextQ, 700); }
  else { q.lockUntil = Date.now() + RC_LOCK * 1000; q.fast = q.sec < 2; render(); }
}
function rcTimeout() {
  const q = rc.cur; if (!q || q.done) return;
  q.done = true; q.choice = -1; q.timeout = true; q.sec = Math.min(60, rcElapsed(q) / 1000);
  rcRecord(q, false, true);
  if (!q.re) rc.q.push({ g: q.g, c: q.c, v: rcCards(q.g)[q.c.id] || null, re: true });   // 排在這一輪最後再問一次
  q.lockUntil = Date.now() + RC_LOCK * 1000; render();
}
function rcNextQ() {
  rcClear();
  if (rc.i + 1 < rc.q.length) { rc.i++; rcAsk(); render(); return; }
  rcFinish();
}
function rcExplain(c) {
  if (c.t === 'zx1') return '<b>' + esc(c.w) + '</b>：' + esc(c.c) + '（不是' + esc(c.bad) + '）' + esc(c.n);
  if (c.x) return '<b>' + esc(c.c) + '</b> ' + esc(c.a) + '（' + esc(c.n) + '）';
  return c.p.map(p => esc(p.w) + (p.a ? ' ' + esc(p.a) : '（' + esc(p.c) + '）')).join('／') + '：' + esc(c.n);
}
function rcQView() {
  const q = rc.cur, n = rc.q.length, i = rc.i, nm = RC_GROUP[q.g][0], timed = rcTimed(q), off = rcNoTimer();
  const head = `<div class="rc-qhead"><span class="grow">${nm}・第 ${i + 1}／${n} 題${q.re ? '（再一次）' : ''}</span>${q.done ? `<span class="rc-sec">用了 ${(Math.round(q.sec * 10) / 10).toFixed(1)} 秒</span>`
    : timed ? (q.pAt && !q.auto ? `<button class="ghost" style="padding:4px 10px;font-size:13px" onclick="rcResume()">▶ 繼續</button>` : `<button class="ghost" style="padding:4px 10px;font-size:13px" ${rc.pauses ? '' : 'disabled'} onclick="rcPause()">⏸ 暫停（剩 ${rc.pauses} 次）</button>`) : ''}</div>
    <div class="rc-prog"><i style="width:${Math.round(i / n * 100)}%"></i></div>`;
  const bar = timed && !q.done ? `<div class="rc-tbar"><i id="rcBar"></i></div>` : timed ? `<div class="rc-tbar"><i style="transform:scaleX(0)"></i></div>`
    : `<p class="rc-sec" style="margin:6px 0 10px">${q.untimed ? '新的卡，這一次不計時。' : esc(off || '這一題不計時。')}</p>`;
  const opts = q.opts.map((o, k) => {
    if (!q.done) return `<button class="rc-opt" onclick="rcPick(${k})">${o.h}</button>`;
    const mine = k === q.choice, cls = o.ok ? 'ok' : mine ? 'ng' : '';
    if (!cls) return '';   // 樣稿 v2：答完只留你選的和正確答案
    return `<button class="rc-opt ${cls}" disabled style="opacity:1">${o.ok && mine ? '' : `<span class="rc-qtag">${o.ok ? '正確答案 ✓' : '你選的 ✕'}</span>`}${o.h}</button>`;
  }).join('');
  let after = '';
  if (q.done && !(q.choice >= 0 && q.opts[q.choice].ok)) {
    const links = [q.c.link, q.c.link2].filter(Boolean).map((u, k) => `<a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--plum)">查辭典${q.c.link2 ? (k ? '（後）' : '（前）') : ''}</a>`).join('　');
    after = (q.fast ? '<p class="muted" style="margin:6px 0">慢一點也沒關係。</p>' : '') +
      `<div class="rc-cmp">${q.opts.map(o => rcExplain(o.c)).join('<br>')}${q.c.src ? '<div class="rc-sec" style="margin-top:4px">' + esc(q.c.src) + '</div>' : ''}<div style="margin-top:4px;font-size:13px">${links}</div></div>
      <p class="rc-sec" style="margin-top:8px">${q.timeout ? (q.re ? '時間到了，這張明天再出現一次。' : '時間到了，這張等一下再問一次。') : '這張明天再出現一次。'}</p>
      <button id="rcNext" style="width:100%" onclick="rcNextQ()">下一題</button>`;
  } else if (q.done) after = `<p class="rc-sec" style="margin-top:8px;color:#2f6b3a">答對了 ✓</p>`;
  return `<div class="card">${head}${bar}<div style="font-weight:700;margin-bottom:6px">${q.stem}</div>${opts}${after}</div>
    ${q.pAt && !q.auto ? '<p class="muted">暫停中，題目可以慢慢看，想好了也可以直接作答。</p>' : ''}
    <div class="row"><button class="x grow" onclick="if(confirm('這一輪還沒做完，離開的話這一輪不會記下來。'))go('home')">先離開</button></div>`;
}
async function rcFinish() {
  rcClear();
  const R = rc.res, ids = Object.keys(R), today = S.today, ok = ids.filter(id => R[id].ok).length;
  const timedRes = ids.filter(id => !R[id].paused && !R[id].timeout), avg = timedRes.length ? timedRes.reduce((a, id) => a + R[id].sec, 0) / timedRes.length : null;
  const faster = timedRes.filter(id => R[id].sec0 > 0 && Math.round(R[id].sec) < R[id].sec0).length;
  rc.end = { n: ids.length, ok, faster, wrong: ids.filter(id => !R[id].ok), xp: 0, kz: 0, saved: rc.again, again: rc.again };
  rc.step = 'end';
  if (!rc.again) {
    const cards = {};
    ids.forEach(id => { const r = R[id];
      const v = r.timeout ? [r.ok ? Math.max(1, r.box0) : 1, addD(today, 1)] : rcNext(r.box0, r.ok, today);
      (cards[r.g] = cards[r.g] || {})[id] = [v[0], v[1], r.paused ? r.sec0 : Math.min(60, Math.round(r.sec))]; });
    rc.pending = { subj: rc.s, cards, avg: avg == null ? null : Math.round(avg * 10) / 10 };
    await rcSend();
  }
  render(); window.scrollTo(0, 0);
}
async function rcSend() {
  const p = rc.pending; if (!p) return;
  try {
    await flush(); S = await call('saveRecall', p); D = derive(S);
    Object.keys(p.cards).forEach(g => { const n = Object.keys(p.cards[g]).filter(id => rc.res[id] && rc.res[id].isNew).length; if (n) local.set('rcNew:' + g + ':' + S.today, String(rcNewToday(g) + n)); });
    rc.end.saved = true; rc.end.xp = D.xp - rc.before.xp; rc.end.kz = (D.kizuna && D.kizuna.her[rc.s] ? D.kizuna.her[rc.s].score : 0) - rc.before.kz; rc.pending = null;
  } catch (e) { rc.end.err = String(e.message || e); }
}
function rcEndView() {
  const E = rc.end, nm = [...new Set(Object.keys(rc.res).map(id => rc.res[id].g))].map(g => RC_GROUP[g][0]).join('、');
  const p = rcPlan(rc.s), more = p.live.filter(g => p.can(g) && !p.done.includes(g) && rcCount(g).due + rcCount(g).fresh > 0);
  const sure = Object.keys(rc.res).filter(id => rc.res[id].ok && rc.res[id].box0 >= 2).slice(0, 2).map(id => { const c = rc.q.find(x => x.c.id === id).c; return '「' + esc(c.x ? c.c : c.w || c.p[0].w) + '」'; });
  const say = E.err ? '這一輪的紀錄還沒送出去：' + esc(E.err) : E.again ? '再練一輪做完了，答錯的明天還會再出現。' : '今天的' + esc(nm) + '做完了。' + (sure.length ? sure.join('') + '你都穩了。' : '');
  return rcHead(say) + `<div class="card"><b>這一輪</b>
      <div class="row" style="margin-top:6px"><span class="pill">答對 ${E.ok}／${E.n}</span>${E.faster ? `<span class="pill">這 ${E.faster} 張比上次快</span>` : ''}</div>
      ${E.saved && !E.again && (E.kz > 0 || E.xp > 0) ? `<div class="row">${E.kz > 0 ? '<span class="pill">🤝 交情 +1</span>' : ''}${E.xp > 0 ? `<span class="pill">⭐ 經驗值 +${E.xp}</span>` : ''}</div>` : ''}
      <p class="muted">${E.again ? '這一輪不加經驗值，也不改排程。' : (E.n - E.ok ? '答錯的 ' + (E.n - E.ok) + ' 張排在明天；' : '') + '答對的往後排到 3、7、21、30 天。'}</p></div>
    ${E.err ? '<button style="width:100%;margin-bottom:8px" onclick="rcRetry()">再送一次</button>' : ''}
    <button style="width:100%" onclick="go('home')">今天先到這裡</button>
    ${more.length && !E.err ? `<button class="rc-outline" style="width:100%;margin-top:8px" onclick="rc.step='pick';rc.sel=[];render()">再選一組（${more.map(g => RC_GROUP[g][0]).join('／')}）</button>` : ''}
    ${E.wrong.length && !E.err ? `<p style="text-align:center;margin:10px 0 0"><a href="#" style="color:var(--plum);font-size:14px" onclick="rcAgain();return false">再來一輪練錯的（不加經驗值）</a></p>` : ''}`;
}
async function rcRetry() { rc.end.err = null; await rcSend(); render(); }
function rcAgain() {
  const wrong = rc.end.wrong.map(id => rc.q.find(x => x.c.id === id)).filter(Boolean).map(x => ({ g: x.g, c: x.c, v: rcCards(x.g)[x.c.id] || [1, S.today, 0] }));
  if (!wrong.length) return;
  rcClear(); rc.q = rcShuffle(wrong); rc.i = 0; rc.res = {}; rc.pauses = RC_PAUSE; rc.again = true; rc.end = null; rc.step = 'q'; rc.before = { xp: D.xp, kz: 0 };
  rcAsk(); render(); window.scrollTo(0, 0);
}


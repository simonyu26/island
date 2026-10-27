// 自動調畫質（v2.39）：每 3 秒量一次每秒畫面數，跑不順就降一級，順了再升回去
// 第 1 級關影子（高畫質才有影子），第 2 級解析度 1；不會超過「更多」裡的高畫質設定
// 級數存在這台裝置（island3dLv，只存數字）；切換高畫質時 index.html 會清掉
window.FpsGuard = (() => {
  const KEY = 'island3dLv', WIN = 3000, WARM = 3000, GAP = 6000, LOW = 24, HIGH = 50, MAXLV = 2;
  const PR = [1.5, 1.5, 1];   // 試過 0.75：島上的小名牌會糊到看不清楚，所以最低停在 1
  let lv = 0;
  try { lv = Math.max(0, Math.min(MAXLV, parseInt(localStorage.getItem(KEY), 10) || 0)); } catch (e) {}
  const scenes = [];
  function save() { try { localStorage.setItem(KEY, String(lv)); } catch (e) {} }
  function apply(s) {
    s.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PR[lv]));
    if (s.shadows) s.shadows(lv < 1);
  }
  // o = { renderer, hasShadow, shadows(on) }；每畫完一幀呼叫 frame()
  function create(o) {
    const s = Object.assign({ start: 0, last: 0, n: 0, low: 0, high: 0, changed: 0 }, o);
    scenes.push(s); apply(s);
    s.frame = () => {
      const now = performance.now();
      if (!s.last || now - s.last > 900) { s.start = now + WARM; s.n = 0; s.last = now; return; }   // 剛打開、切回來、停過（背景時一秒才一次）：先等 3 秒
      s.last = now;
      if (now < s.start) return;
      s.n++;
      const span = now - s.start;
      if (span < WIN) return;
      const fps = s.n * 1000 / span;
      s.start = now; s.n = 0;
      s.low = fps < LOW ? s.low + 1 : 0;
      s.high = fps > HIGH ? s.high + span : 0;
      if (now - s.changed < GAP) return;
      let to = lv;
      if (s.low >= 2 && lv < MAXLV) to = lv + 1;
      else if (s.high >= 10000 && lv > 0) to = lv - 1;
      if (to === 1 && !scenes.some(x => x.hasShadow)) to = to > lv ? 2 : 0;   // 沒開影子就跳過第 1 級
      if (to === lv) return;
      lv = to; s.changed = now; s.low = 0; s.high = 0; save();
      scenes.forEach(apply);   // 收起來的畫面也一起換，下次打開就是新的級數
    };
    return s;
  }
  document.addEventListener('visibilitychange', () => scenes.forEach(s => { s.last = 0; }));
  return { create, level: () => lv };
})();

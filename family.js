/* 會考小島：家人島（列島，做法 B）的前端
 * 只有家人用家人碼按「🏝️ 我的島」才載入（Index.html 的 load），她打開 App 不會下載這個檔。
 * 家人島和她的島用同一套畫面：計畫、每天記錄、每週確認、運動、我的家、商店都照舊，只換掉這幾件事：
 *   - 五條街換成家人自己訂的方向（最多 5 個），SUBJECT_NAME、SUBJ_IC、SUBJECTS 在 apply() 裡改成方向的名字和圖示；
 *   - 會考專用的東西都收起來：大考、燈塔、挑戰與故事任務、紙船、AI 的每日訊息、智慧島、書店、屋台、衛星小島；
 *   - 開島與修改方向用這裡的 ownSetup（同意「誰看得到什麼」、島名、島主夥伴、方向與項目、商店）。
 * 後端只開 Family.gs 的 OWN_API 白名單，前端叫到別的函式會被 Index.html 的 call 擋下來。
 */
(function () {
  window.lightWordLater = async function () {};   // 家人島沒有燈塔：確認這週以後不請守燈人寫話（不然會跳「你的島還沒有這個功能」）
  const SLOT = ['國', '英', '數', '自', '社'];
  const KEEP_BOARD = ['plan', 'walk'], KEEP_PLACE = ['home', 'walk', 'main', 'garden'];
  const DIR_IC = ['🔤', '📚', '💼', '🥗', '🏃', '🎨', '🎹', '🧺', '🌱', '🧘', '🍳', '💰', '🗣️', '✍️', '🧠', '⭐'];
  const SUGGEST = [
    { name: '外語', ic: '🔤', items: ['單字 15 分鐘', '聽一集 podcast'] },
    { name: '閱讀', ic: '📚', items: ['讀 20 頁'] },
    { name: '工作', ic: '💼', items: ['整理待辦', '學一個新工具'] },
    { name: '健康', ic: '🥗', items: ['十一點前睡', '喝夠水'] },
    { name: '家務', ic: '🧺', items: ['整理一個抽屜'] },
    { name: '興趣', ic: '🎨', items: ['練習 30 分鐘'] }];
  const MAX_DIRS = 5, MAX_ITEMS = 6;
  const RAW = { 國: 0, 英: 1, 數: 2, 自然: 3, 社會: 4 };   // 後端給的項目科目（方向的位置）
  const GROUP0 = Object.assign({}, GROUP);

  function isle() { return (S && S.save && S.save.isle) || null; }
  function liveDirs() { return ((isle() && isle().dirs) || []).filter(d => !d.off); }

  /** 每次畫面前呼叫：把五條街換成這座島的方向，收起會考專用的看板與地方 */
  // 家人島走得到的分頁（白名單，工程顧問 10/26）：不在這裡的分頁一律回到島上；主線新加的分頁預設不會出現在家人島，要開放再加進來，後端 OWN_API 也要有對應的函式
  const OWN_TABS = ['home', 'house', 'walk', 'moveStop', 'focus', 'plan', 'pick', 'confirm', 'shop', 'coins', 'more', 'guide', 'setup', 'keeper', 'kizuna', 'mainisle', 'garden', 'isle', 'isleNew'];   // garden、isle、isleNew：2b-1
  // 家人島畫得出來的卡片（白名單）：Index.html 用 card('key', html) 包起來的卡片，key 不在這裡就不畫；要開放新卡片時把 key 加進來，後端 OWN_API 也要有對應的函式
  //   不在這裡、家人島看不到的：diaryShare（日めくり的分享按鈕，等拜訪家人島那一版）、link（跨科連結）、lightWord（燈塔的話）、adv（學習顧問）、keeperImg（管理員上傳圖片）、hallLink（v2.44 我的家去音樂廳的按鈕，家人島沒有音樂廳）
  const OWN_CARDS = ['kairan', 'timeline', 'homeMate', 'moveArt', 'habit', 'move', 'islet', 'xpEx', 'water', 'diary'];   // water、diary：2b-1
  function apply() {
    if (!OWN_TABS.includes(tab)) { tab = 'home'; draft = {}; }
    const all = (isle() && isle().dirs) || [], live = liveDirs();
    // 項目的科目換成方向的名字（計畫、確認頁的小標題用），GROUP 也加上方向名字 → 位置，經驗值和房子照位置算
    all.forEach(d => { GROUP[d.name] = SLOT[d.slot]; });
    let touched = false;
    (S.allItems || []).concat(S.items).forEach(it => { if (RAW[it.subject] != null) { const d = all.find(x => x.slot === RAW[it.subject]); if (d) { it.subject = d.name; touched = true; } } });
    if (touched) D = derive(S);
    SLOT.forEach((s, i) => { const d = live.find(x => x.slot === i); SUBJECT_NAME[s] = d ? d.name : '空地'; SUBJ_IC[s] = d ? d.ic : '🌾'; });
    if (live.length) SUBJECTS.splice(0, SUBJECTS.length, ...SLOT.filter((s, i) => live.some(d => d.slot === i)));
    delete SUBS['自']; delete SUBS['社'];
    for (let i = BOARD.length - 1; i >= 0; i--) if (KEEP_BOARD.indexOf(BOARD[i].key) < 0) BOARD.splice(i, 1);
    for (let i = PLACE_LINKS.length - 1; i >= 0; i--) if (KEEP_PLACE.indexOf(PLACE_LINKS[i].key) < 0) PLACE_LINKS.splice(i, 1);
    // 打開 App 先到哪裡（10/26 決定）：家人自己在設定選「我的島」或「主島」，只在打開 App 的第一個畫面換一次
    if (!landed && D.cfg) { landed = true; if (D.cfg.landing === 'main' && tab === 'home' && mainOpen()) tab = 'mainisle'; }
  }
  let landed = false;

  // ---------- 收起來的東西 ----------
  window.kairanCard = () => '';
  // 衛星小島（isletCard）2b-1 起開放：商店照她的畫
  window.wisdomOn = () => false;
  window.ensureDaily = async () => {};
  window.seedDefaults = async () => {};
  window.maybeGreet = () => {};

  // ---------- 上方：島的狀態 ----------
  window.hud = function () {
    const pct = Math.round((D.xp - D.lvBase) / (D.lvNext - D.lvBase) * 100);
    return `<div class="card" id="hudCard">
      <div class="row"><h2 class="grow">${esc(D.cfg.islandName || '我的島')}</h2><span class="muted">島嶼 Lv.${D.level}</span>
        <button class="ghost" style="padding:4px 10px" onclick="openHouse('me')" aria-label="我的家">${houseTier().ic}</button>
        <button class="ghost" style="padding:4px 10px" onclick="go('guide')" aria-label="玩法說明">❓</button></div>
      <div class="hud">
        <div><b>${D.xp}</b><span class="muted">經驗值</span></div>
        <div class="tap" onclick="go('shop')" role="button" aria-label="商店與兌換"><b>${D.coins}</b><span class="muted">🪙 島幣${D.coinParts.canEx ? `<span class="pill" style="margin-left:4px">可換 ${D.coinParts.canEx}</span>` : ''}</span></div>
        <div><b>${D.streak}</b><span class="muted">🔥 連續週</span></div>
        <div><b>${D.cards}</b><span class="muted">🛌 休息卡</span></div>
      </div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="row" style="margin-top:4px"><span class="muted grow">距離 Lv.${D.level + 1} 還差 ${D.lvNext - D.xp} 經驗值</span><span class="env" id="envChip">${envText()}</span></div>
    </div>`;
  };

  // ---------- 3D：沒有燈塔和小巷，沒用到的位置是空地 ----------
  window.mount3D = async function () {
    const el = document.getElementById('i3d'); if (!el) return;
    try {
      if (!window.THREE) await loadScript('three.min.js');
      if (!THREE.OrbitControls) await loadScript('OrbitControls.js');
      if (!window.Island3D) await loadScript('island3d.js');
      if (!document.getElementById('i3d')) return;
      el.innerHTML = '';
      const live = liveDirs().map(d => SLOT[d.slot]);
      Island3D.mount(el, {
        S, bond: D.bond, resident, roommate, imgOf, subjectName: SUBJECT_NAME, subjIc: SUBJ_IC,
        pointsUntil: i => { const p = pointsUntil(i), o = {}; Object.keys(p).forEach(k => { const g = GROUP[k] || k; o[g] = (o[g] || 0) + p[k]; }); return o; },
        sig: JSON.stringify(D.weekPts), season: solarTerm(S.today), walk: D.exDays.length,
        home: homeOf() && { tier: houseTier().key, roof: homeOf().roof, wall: homeOf().wall, name: homeOf().name, flowers: shownFurniture().includes('flower') },
        onHome: () => openHouse('me'),
        layout: { lanes: false, light: false, off: SLOT.filter(s => live.indexOf(s) < 0), bg: D.cfg && D.cfg.bg },   // 島的背景：海上／宇宙／天空
        light: null, ferry: { open: true, label: '⛴️ 港口', sub: '去別的島', far: false }, onFerry: openPort, yatai: { name: '島の屋台', sub: DISHES.some(canCook) ? '今天可以做料理' : null }, onYatai: () => openYatai(), book: null, marks: [],   // 港口（10/27）；屋台（10/28，開島就有）
        garden: gardenCtx(), onGarden: openGarden, onPlant: id => openGarden(id),   // 2b-1：種樹、衛星小島
        islets: islets().map(x => { const k = keeperOf(x.key); return { key: x.key, slot: x.slot, style: x.style, name: isletName(x), ic: ISLET_STYLES[x.style].ic, keeper: k ? k.emoji + ' ' + k.name : '' }; }), onIslet: openIsle,
        grade: () => null, mainIsle: mainOpen() ? { a: -0.5 } : null, onMainIsle: () => go('mainisle'), onSelect: showInfo3D
      });
      if (replay.idx != null) Island3D.setWeek(replay.idx, false);
      updateEnv();
    } catch (e) {
      local.set('islandView', 'list'); toast('這支手機開不了 3D，先用清單模式'); render();
    }
  };
  window.showInfo3D = function (s) {
    const box = document.getElementById('i3dInfo'); if (!box) return;
    const r = resident(s), d = liveDirs().find(x => SLOT[x.slot] === s);
    if (!d) return;
    const recent = D.weekPts.slice(-4).map(w => {
      const n = Object.keys(w.pts).filter(k => (GROUP[k] || k) === s).reduce((a, k) => a + w.pts[k], 0);
      return `<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--plum)">${n}</div><div class="muted">${short(w.start)}</div></div>`;
    }).join('');
    box.innerHTML = `<div class="resident"><span class="avatar">${r.pic}</span>
        <div><b>${esc(r.name)}</b><div class="muted">${esc(d.ic)} ${esc(d.name)}${r.personality ? '・' + esc(r.personality) : ''}</div></div></div>
      <div class="muted" style="margin-top:8px">${d.items.filter(it => !it.off).map(it => esc(it.name)).join('、')}</div>
      <div class="row" style="justify-content:space-around;margin-top:8px">${recent}</div>
      <div class="muted" style="text-align:center;font-size:12px">最近四週完成的次數</div>`;
  };

  // ---------- 更多 ----------
  window.viewMore = function () {
    return `<div class="card"><h2>🧭 我的方向</h2>${liveDirs().map(d => { const r = resident(SLOT[d.slot]);
        return `<div class="item"><span class="avatar">${r.pic}</span><div class="name"><b>${esc(d.ic)} ${esc(d.name)}</b>・${esc(r.name)}
          <div class="muted">${d.items.filter(it => !it.off).map(it => esc(it.name)).join('、')}</div></div></div>`; }).join('')}
      <button class="ghost" style="width:100%;margin-top:10px" onclick="tab='setup'; draft={}; render()">✏️ 修改我的島（方向、項目、島主夥伴、商店）</button></div>
    <div class="card"><h3>📈 每週達成率</h3>${D.rates.length ? D.rates.slice(-10).reverse().map(x => { const pc = Math.round(x.got / x.total * 100);
        return `<div class="row" style="margin-top:6px"><span style="width:84px" class="muted">${short(x.start)} 週</span>
          <div class="bar grow" style="margin-top:0"><i style="width:${pc}%"></i></div><span style="width:92px;text-align:right">${pc}%（${x.got}/${x.total}）</span></div>`; }).join('')
        : '<div class="muted">排好一週的計畫、週末按「確認這週」後，這裡會開始記錄每週達成率。</div>'}</div>
    <div class="card"><h3>📊 紀錄</h3><div>有紀錄的週數：${D.recordedWeeks}　最長連續：${D.best} 週</div>
      <div class="muted" style="margin-top:6px">每累積 6 週紀錄會得到 1 張休息卡，某週沒記錄時會自動使用，連續週數不會中斷。</div></div>
    <div class="card"><div class="row"><button class="ghost" onclick="go('guide')">❓ 玩法說明</button>
      <button class="ghost" onclick="famOwnSwitch(false)">⛴️ 去看她的島</button></div>
      <div class="muted" style="margin-top:8px">版本 v${APP_VERSION}・家人島第一版</div></div>
    ${privacy()}
    ${BETA3D ? `<div class="card"><div class="row" style="flex-wrap:nowrap"><div class="grow"><b>🖥️ 3D 高畫質</b><div class="muted">開著會有影子、比較細的海浪；手機變慢或發燙就關掉。</div></div>
      <button class="ghost" onclick="toggleHQ()">${hqOn() ? '✅ 開著' : '⬜ 關著'}</button></div></div>` : ''}`;
  };
  const WHO = '你的計畫、每天的紀錄、運動和商店，只有你自己在 App 裡看得到；她和其他家人目前都看不到你的島。'
    + '紀錄存在 App 管理員的 Google 試算表裡的隱藏分頁，管理試算表的人看得到原始資料。這一版不會把任何內容送給 AI。'
    + '日めくり和喝水紀錄也一樣：在 App 裡只有你自己看得到。資料存在 App 管理員的 Google 試算表裡，所以管理員技術上打得開，但管理員答應過不會去讀。有疑問，隨時可以直接問管理員。'
    + '在聚會所貼的公告，家人和她走進聚會所都看得到；用乘船券來玩的朋友看不到，也不會推到任何人的首頁。'   // 2b-2（爸爸 10/27；文案審查 19）
    + '在主島的列島地圖上，其他家人和她看得到你的稱呼、有沒有開島和你選的島背景（海上、宇宙、天空），看不到島名和島上的任何東西。';
  function privacy() {
    return `<div class="card"><h3>🔐 誰看得到什麼</h3><div class="muted" style="line-height:1.7">${WHO}</div>
      <button class="ghost" style="width:100%;margin-top:10px" onclick="logoutPhone()">🚪 登出這支手機</button></div>`;
  }

  window.viewGuide = function () {
    const g = guide();
    return `<div class="card"><div class="big">${g.pic}</div><h2 style="text-align:center">${esc(D.cfg.islandName)} 的玩法</h2>
      <div class="speech">${esc(g.name)}：這座島跟著你訂的方向長大。慢慢來，一週一週累積就好。</div></div>
    <div class="card"><h3>📅 每週</h3><p style="line-height:1.7">到「計畫」把這週要做的項目排進每一天。每天做完在首頁的「📋 今日のおつとめ」按完成或做了一部分。週末按「確認這週」，看這週達成了多少。</p></div>
    <div class="card"><h3>⭐ 經驗值與房子</h3><p style="line-height:1.7">完成一次 +10 經驗值，做了一部分 +5；確認一週 +20，達成率越高加越多。經驗值讓島升級、房子變大；換島幣不會扣經驗值，房子也不會變小。</p></div>
    <div class="card"><h3>🏃 運動</h3><p style="line-height:1.7">運動完蓋一個章，一章 +5 經驗值；一週集滿 3 章 +3 枚島幣。</p></div>
    <div class="card"><h3>🪙 島幣</h3><p style="line-height:1.7">到「商店」用經驗值換島幣，再換你自己訂的獎勵，或幫你的家買家具。</p></div>
    <div class="row"><button class="grow" onclick="go('home')">回到島上</button></div>`;
  };

  // ---------- 開島與修改：同意、島名、島主夥伴、方向與項目、商店 ----------
  function initDraft() {
    if (draft.fam) return draft.fam;
    const cfg = D.cfg ? JSON.parse(JSON.stringify(D.cfg)) : { islandName: '', guide: { name: '', emoji: '🐢', tone: '朋友' }, residents: {}, shop: [] };
    const dirs = ((isle() && isle().dirs) || []).filter(d => !d.off).map(d => {
      const r = (cfg.residents || {})[SLOT[d.slot]] || {};
      return { slot: d.slot, name: d.name, ic: d.ic, who: { name: r.name || '', emoji: r.emoji || '🙂', personality: r.personality || '' },
        items: d.items.map(it => ({ row: it.row, name: it.name, off: it.off ? 1 : 0 })) };
    });
    draft.fam = { cfg, dirs, consent: !!(isle() && isle().consent), first: !isle() };
    if (!cfg.shop || !cfg.shop.length) cfg.shop = [{ name: '', price: 10 }];
    return draft.fam;
  }
  function freeSlot(f) { for (let i = 0; i < MAX_DIRS; i++) if (!f.dirs.some(d => d.slot === i) && !((isle() && isle().dirs) || []).some(d => d.slot === i)) return i; return -1; }
  window.viewSetup = function () {
    const f = initDraft(), c = f.cfg;
    const emo = (key, cur) => `<div class="emojis" data-key="${key}">${EMOJIS.map(e => `<button type="button" class="${e === cur ? 'on' : ''}">${e}</button>`).join('')}</div>`;
    const icSel = (i, cur) => `<select data-d="${i}.ic" style="width:72px">${DIR_IC.concat(DIR_IC.indexOf(cur) < 0 ? [cur] : []).map(e => `<option ${e === cur ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select>`;
    const left = freeSlot(f) >= 0 && f.dirs.length < MAX_DIRS;
    return `<div class="card"><div class="big">🏝️</div><h2 style="text-align:center">${f.first ? '開一座自己的島' : '修改我的島'}</h2>
      <div class="muted" style="text-align:center">玩法和她的島一樣：排計畫、每天記錄、每週確認，島會跟著長大。學習和累積的方向由你自己訂。</div></div>
    ${f.first ? `<div class="card"><h3>1. 誰看得到什麼</h3><div class="muted" style="line-height:1.7">${WHO}</div>
      <label class="row" style="margin-top:8px"><input type="checkbox" id="famConsent" ${f.consent ? 'checked' : ''} style="width:auto"> 我看過了，同意</label></div>` : ''}
    <div class="card"><h3>${f.first ? '2. ' : ''}你希望怎麼被稱呼</h3><div class="muted">島主夥伴和島民會這樣叫你，只有你自己的島上看得到。</div>
      <input data-c="callMe" value="${esc(c.callMe || '')}" maxlength="12" placeholder="例如：${esc(S.who.name)}"></div>
    <div class="card"><h3>${f.first ? '3. ' : ''}島的名字</h3><input data-c="islandName" value="${esc(c.islandName)}" maxlength="20" placeholder="例如：慢慢島">
      <label>島在哪裡</label><select data-c="bg">${[['sea', '🌊 海上'], ['space', '🪐 宇宙裡'], ['sky', '☁️ 漂浮在空中']].map(([k, v]) => `<option value="${k}" ${(c.bg || 'sea') === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <label>打開 App 先到</label><select data-c="landing">${[['home', '🏝️ 我的島']].concat(mainOpen() ? [['main', '⛰️ 主島']] : []).map(([k, v]) => `<option value="${k}" ${(c.landing || 'home') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <div class="card"><h3>${f.first ? '4. ' : ''}島主夥伴</h3><div class="muted">每天在島上陪你的角色，由你自己創造。</div>
      <label>名字</label><input data-c="guide.name" value="${esc(c.guide.name)}" maxlength="12">
      <label>長相</label>${emo('guide.emoji', c.guide.emoji)}
      <label>說話風格</label><select data-c="guide.tone">${Object.entries(TONES).map(([k, v]) => `<option value="${k}" ${c.guide.tone === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <div class="card"><h3>${f.first ? '5. ' : ''}方向（最多 ${MAX_DIRS} 個）</h3><div class="muted">每個方向是島上的一條街，住一位島民。每個方向放 1～${MAX_ITEMS} 個每週想做的項目。不用的項目可以收起來，累積的經驗值不會不見。</div>
      ${f.dirs.map((d, i) => `<div style="border-top:1px dashed var(--plum-light);margin-top:12px;padding-top:8px">
        <div class="row">${icSel(i, d.ic)}<input class="grow" data-d="${i}.name" value="${esc(d.name)}" maxlength="8" placeholder="方向的名字">
          ${d.items.some(it => it.row) ? '' : `<button type="button" class="ghost" data-deldir="${i}">✕</button>`}</div>
        <label>住在這條街的島民</label><div class="row"><select data-d="${i}.who.emoji" style="width:72px">${EMOJIS.map(e => `<option ${d.who.emoji === e ? 'selected' : ''}>${e}</option>`).join('')}</select>
          <input class="grow" data-d="${i}.who.name" value="${esc(d.who.name)}" maxlength="12" placeholder="名字"></div>
        <input data-d="${i}.who.personality" value="${esc(d.who.personality)}" maxlength="60" placeholder="個性（選填），例如：嘴硬心軟" style="margin-top:4px">
        <label>每週想做的項目</label>
        ${d.items.map((it, j) => `<div class="row" style="margin-top:4px${it.off ? ';opacity:.5' : ''}"><input class="grow" data-i="${i}.${j}" value="${esc(it.name)}" maxlength="16" placeholder="例如：讀 20 頁">
          ${it.row ? `<button type="button" class="ghost" data-off="${i}.${j}">${it.off ? '拿出來' : '收起來'}</button>` : `<button type="button" class="ghost" data-delitem="${i}.${j}">✕</button>`}</div>`).join('')}
        <button type="button" class="ghost" style="margin-top:6px" data-additem="${i}">＋ 項目</button></div>`).join('')}
      ${left ? `<div style="margin-top:12px"><div class="muted">加一個方向：</div><div class="row" style="gap:6px;margin-top:4px">
        ${SUGGEST.filter(x => !f.dirs.some(d => d.name === x.name)).map((x, k) => `<button type="button" class="ghost" data-sug="${SUGGEST.indexOf(x)}">${x.ic} ${x.name}</button>`).join('')}
        <button type="button" class="ghost" data-sug="-1">＋ 自己訂</button></div></div>` : ''}</div>
    <div class="card"><h3>${f.first ? '6. ' : ''}島嶼商店（選填）</h3><div class="muted">島幣可以換什麼？價格你自己訂。一般一週大約賺 5 到 10 枚。</div>
      ${c.shop.map((x, i) => `<div class="row" style="margin-top:6px"><input class="grow" data-c="shop.${i}.name" value="${esc(x.name)}" placeholder="例如：週末睡晚一點"><input style="width:80px" type="number" min="1" data-c="shop.${i}.price" value="${x.price}"></div>`).join('')}
      <div style="margin-top:8px"><button class="ghost" type="button" id="famShop">＋ 新增商品</button></div></div>
    <div class="row"><button id="famSave" class="grow">${f.first ? '開島！' : '儲存'}</button>${f.first ? '' : `<button class="ghost" onclick="draft={};go('more')">取消</button>`}</div>`;
  };
  window.bindSetup = function () {
    const f = draft.fam, c = f.cfg;
    const num = el => el.type === 'number' ? Number(el.value) : el.value;
    document.querySelectorAll('[data-c]').forEach(el => el.oninput = el.onchange = () => setPath(c, el.dataset.c, num(el)));
    document.querySelectorAll('[data-d]').forEach(el => el.oninput = el.onchange = () => setPath(f.dirs, el.dataset.d, el.value));
    document.querySelectorAll('[data-i]').forEach(el => el.oninput = () => { const [i, j] = el.dataset.i.split('.'); f.dirs[i].items[j].name = el.value; });
    document.querySelectorAll('.emojis').forEach(box => box.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      setPath(c, box.dataset.key, b.textContent);
      box.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    });
    const on = (sel, fn) => document.querySelectorAll(sel).forEach(el => el.onclick = () => { fn(el); render(); });
    on('[data-off]', el => { const [i, j] = el.dataset.off.split('.'); const it = f.dirs[i].items[j]; it.off = it.off ? 0 : 1; });
    on('[data-delitem]', el => { const [i, j] = el.dataset.delitem.split('.'); f.dirs[i].items.splice(j, 1); });
    on('[data-additem]', el => { const d = f.dirs[el.dataset.additem]; if (d.items.filter(it => !it.off).length >= MAX_ITEMS) return toast('每個方向最多 ' + MAX_ITEMS + ' 個項目'); d.items.push({ name: '' }); });
    on('[data-deldir]', el => f.dirs.splice(Number(el.dataset.deldir), 1));
    on('[data-sug]', el => {
      const slot = freeSlot(f); if (slot < 0) return;
      const x = SUGGEST[Number(el.dataset.sug)] || { name: '', ic: '⭐', items: [''] };
      f.dirs.push({ slot, name: x.name, ic: x.ic, who: { name: '', emoji: '🙂', personality: '' }, items: x.items.map(n => ({ name: n })) });
    });
    const consent = document.getElementById('famConsent'); if (consent) consent.onchange = () => { f.consent = consent.checked; };
    document.getElementById('famShop').onclick = () => { c.shop.push({ name: '', price: 10 }); render(); };
    document.getElementById('famSave').onclick = async () => {
      if (f.first && !f.consent) return toast('先看過「誰看得到什麼」並勾同意');
      if (!String(c.islandName || '').trim()) return toast('先幫島取個名字吧');
      if (!String(c.guide.name || '').trim()) return toast('幫島主夥伴取個名字吧');
      const dirs = f.dirs.map(d => ({ slot: d.slot, name: String(d.name || '').trim(), ic: d.ic, items: d.items.filter(it => it.row || String(it.name || '').trim()).map(it => it.row ? { row: it.row, name: it.name, off: it.off ? 1 : 0 } : { name: it.name }) }));
      if (!dirs.length) return toast('至少訂一個方向');
      if (dirs.some(d => !d.name)) return toast('每個方向都要有名字');
      if (dirs.some((d, i) => dirs.findIndex(x => x.name === d.name) !== i)) return toast('兩個方向的名字一樣了');
      if (dirs.some(d => GROUP0[d.name] && GROUP0[d.name] !== SLOT[d.slot])) return toast('「' + dirs.find(d => GROUP0[d.name] && GROUP0[d.name] !== SLOT[d.slot]).name + '」這個名字島上用過了，換一個吧');
      if (dirs.some(d => !d.items.some(it => !it.off))) return toast('每個方向至少要有一個項目');
      const cfg = JSON.parse(JSON.stringify(c));
      cfg.shop = (cfg.shop || []).filter(x => String(x.name || '').trim()).map(x => ({ name: String(x.name).trim().slice(0, 30), price: Math.max(1, Math.round(Number(x.price) || 1)) }));
      cfg.residents = {}; cfg.roommates = {};
      f.dirs.forEach(d => { const s = SLOT[d.slot]; cfg.residents[s] = { name: String(d.who.name || '').trim() || d.name + '島民', emoji: d.who.emoji || '🙂', personality: String(d.who.personality || '').trim(), relation: '', speech: '', intro: '', food: FOOD_DEFAULT[s] }; });
      const btn = document.getElementById('famSave'); btn.disabled = true;
      try {
        S = await call('saveIsle', { consent: f.consent, dirs: dirs });
        S = await call('saveConfig', cfg); D = derive(S);
      } catch (e) { btn.disabled = false; return toast('沒有存到：' + (e.message || e)); }
      toast(f.first ? '🏝️ ' + cfg.islandName + ' 開島成功！' : '存好了');
      draft = {}; go('home');
    };
  };

  // ---------- 畫面畫好以後：上方橫幅、收掉會考專用的按鈕、島主夥伴第一次打招呼 ----------
  function after(t) {
    const app = document.getElementById('app');
    app.insertAdjacentHTML('afterbegin', `<div class="card" style="background:#2f6b4f;color:#fff"><div class="row"><b class="grow">🏝️ ${esc(S.who.name)}的島</b>
      <button style="background:transparent;color:#fff;border:1px solid #fff;padding:6px 12px" onclick="famOwnSwitch(false)">⛴️ 去看她的島</button></div></div>`);
    const rm = el => el && el.remove();
    // 家人島沒有的卡片（日めくり的分享按鈕、跨科連結、燈塔的話、學習顧問、管理員上傳圖片）由 Index.html 的 card() 照 OWN_CARDS 不畫；這裡只剩管理員介紹裡講到它們的那幾行
    app.querySelectorAll('li').forEach(li => { if (/分享給家人|每天會寫一句話/.test(li.textContent)) rm(li); });   // 日めくり還不能分享；小島管理員每天的一句話要 AI（2c-2）
    if (t === 'plan') {
      const scan = document.getElementById('scanFile'); if (scan) { const card = scan.closest('.card'); rm(scan.closest('label')); if (card) card.querySelectorAll('.muted').forEach(m => { if (m.querySelector('[onclick*="abbr"]')) rm(m); }); }
      app.querySelectorAll('[onclick*="go(\'abbr\')"],[onclick*="go(\'items\')"]').forEach(rm);
    }
    if (t === 'shop') {
      app.querySelectorAll('[onclick*="xqCard"]').forEach(b => rm(b.closest('.card')));
      const m = app.querySelector('.card h2 + .muted'); if (m && /挑戰任務/.test(m.textContent)) m.innerHTML = `你有 <b>${D.coins}</b> 枚島幣。經驗值可以換島幣，島幣換你自己訂的獎勵，商品在「更多 → 修改我的島」新增。`;
    }
    if (t === 'home') app.querySelectorAll('.district .grade').forEach(g => { const box = g.closest('.district'); rm(g); if (box && box.lastElementChild && /Boss|試煉/.test(box.lastElementChild.textContent)) rm(box.lastElementChild); });
    if (t === 'home' && D.cfg && local.get('famMet:' + S.who.name) !== '1') {
      const g = guide(), hudEl = document.getElementById('hudCard');
      if (hudEl) hudEl.insertAdjacentHTML('afterend', `<div class="card" id="famHello"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="avatar">${g.pic}</span>
        <div class="speech grow">${esc(D.cfg.callMe || S.who.name)}，你好！我是${esc(g.name)}，這座島的島主夥伴。島會跟著你訂的方向一點一點長大，到「📅 計畫」排好這週，我們就開始吧。</div></div>
        <div class="row" style="margin-top:8px"><button class="grow" onclick="local.set('famMet:${esc(S.who.name)}','1');document.getElementById('famHello').remove()">好，開始吧</button></div></div>`);
    }
  }

  // ---------- 港口選單（10/27）：每個目的地 { ic, name, on, go }；on() 為 true 才列出來 ----------
  const PORT = [
    { ic: '🏝️', name: '去看她的島', on: () => true, go: () => famOwnSwitch(false) },
    { ic: '⛰️', name: '去主島', on: () => mainOpen(), go: () => go('mainisle') }];
  window.famPort = PORT;
  function closePort() { const el = document.getElementById('famPort'); if (el) el.remove(); }
  function openPort() {
    closePort();
    const list = PORT.filter(p => p.on());
    document.body.insertAdjacentHTML('beforeend', `<div id="famPort" style="position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.35);display:flex;align-items:flex-end;justify-content:center" onclick="if(event.target===this)this.remove()">
      <div class="card" style="width:100%;max-width:480px;margin:0 16px 16px"><h3 style="margin-top:0">⛴️ 要去哪裡？</h3>
      ${list.map((p, i) => `<button class="opt" style="width:100%;margin-top:6px" data-port="${i}">${p.ic} ${esc(p.name)}</button>`).join('')}
      <button class="ghost" style="width:100%;margin-top:10px" data-port="-1">留在島上</button></div></div>`);
    document.querySelectorAll('#famPort [data-port]').forEach(b => b.onclick = () => { const p = list[Number(b.dataset.port)]; closePort(); if (p) p.go(); });
  }
  window.openPort = openPort;
  // ---------- 島の屋台（爸爸 10/28：姐姐開島時就有）：她的屋台，換成家人的字；素材照她的規則，不能買、不能賣 ----------
  KEEP_PLACE.push('yatai'); OWN_TABS.push('yatai');
  if (OWN_FNS.indexOf('saveCraft') < 0) OWN_FNS.push('saveCraft');
  PLACES.yatai = Object.assign({}, PLACES.yatai, { about: ['每完成一個項目，那個方向的島民會塞一個素材給你（每個方向一天最多 3 個）', '某個方向這週排的項目全部做完，會拿到稀有素材', '料理大多要兩三個方向的素材，湊齊了按「做」就好', '拿到新的素材，我就教你一道用得到它的料理'] });
  window.matStreet = m => { const s = MATS[m].s; return s === '智' ? '智慧島的老師' : resident(s).name + '（' + SUBJECT_NAME[s] + '）'; };
  function yataiSay() {
    const ready = DISHES.filter(canCook), n = Object.values(D.mats.have).reduce((a, x) => a + x, 0);
    const lines = [ready.length ? '今天的素材可以做' + ready[daySeed() % ready.length].n + '喔，要試試看嗎？' : '素材再多一點就能開火了，我幫你把鍋子顧好。',
      n ? '你的竹籃裡有 ' + n + ' 個素材，都是你一項一項做到的。' : '完成一個項目，那個方向的島民就會塞素材給你，帶來我這裡吧！',
      '料理大多要兩三個方向的素材，湊齊了就能做。'];
    return lines[(daySeed() + n) % lines.length];
  }
  window.viewYatai = function () {
    const kp = keeperOf('yatai'), M = D.mats;
    const basket = SUBJECTS.concat(['智']).map(s => { const ms = Object.keys(MATS).filter(m => MATS[m].s === s && (M.got[m] || 0) > 0);
      return ms.length ? `<div class="row" style="gap:6px;margin-top:6px;align-items:center"><span class="muted" style="width:56px">${s === '智' ? '智慧島' : esc(SUBJECT_NAME[s])}</span>${ms.map(m => `<span class="pill" ${MATS[m].rare ? 'style="border:1px solid var(--gold)"' : ''}>${matText(m)} ×${M.have[m]}</span>`).join('')}</div>` : ''; }).join('');
    const menu = DISHES.map(d => { const know = knowDish(d), ok = canCook(d), n = M.cooked[d.id] || 0;
      if (!know) return `<div class="item" style="opacity:.55"><span class="avatar" style="filter:grayscale(1)">❔</span><div class="name"><b>？？？</b><div class="muted">拿到其中一種素材，店主就會教你</div></div></div>`;
      return `<div class="item"><span class="avatar">${d.ic}</span><div class="name"><b>${d.n}</b>${d.rare ? ' <span class="pill" style="font-size:11px">稀有</span>' : ''}${n ? `<span class="muted">・做過 ${n} 次</span>` : ''}
          <div class="muted" style="font-size:13px">${Object.keys(d.use).map(m => `<span style="${(M.have[m] || 0) >= d.use[m] ? '' : 'opacity:.45'}">${matText(m)}</span>`).join('＋')}</div></div>
        <button class="${ok ? '' : 'ghost'}" style="padding:6px 12px" ${ok ? `onclick="cookDish('${d.id}')"` : 'disabled'}>做</button></div>`; }).join('');
    const done = DISHES.filter(d => M.left[d.id]);
    return `<div class="card"><h2 style="margin:0">🏮 島の屋台</h2><div class="muted">碼頭邊的小攤子。用完成項目拿到的素材做料理。</div>
        ${placeIntro('yatai')}
        ${kp && local.get('islandMet:yatai') ? `<div class="row" style="margin-top:8px;flex-wrap:nowrap"><span style="font-size:28px">${kpPic(kp)}</span><div class="speech grow" style="font-size:14px"><b>${esc(kp.name)}</b>${kp.role ? '（' + esc(kp.role) + '）' : ''}：${esc(yataiSay())}</div></div>` : ''}</div>
      <div class="card"><h3>🧺 你的竹籃</h3>${basket || '<div class="muted">還空空的。在首頁把今天的項目勾「完成」，那個方向的島民就會塞素材給你（每個方向一天最多 3 個）。</div>'}
        <div class="muted" style="margin-top:8px;font-size:13px">某個方向這週排的項目全部做完，會拿到稀有素材。${wisdomOn() ? '智慧島每上完一講，老師會送一樣珍品。' : ''}</div></div>
      <div class="card"><h3>📜 食譜</h3>${menu}</div>
      ${done.length ? `<div class="card"><h3>🍱 做好的料理</h3><div class="row" style="gap:6px">${done.map(d => `<span class="pill">${d.ic} ${d.n} ×${M.left[d.id]}</span>`).join('')}</div></div>` : ''}
      <div class="row"><button class="ghost grow" onclick="go('home')">回到我的島 🏝️</button>${kp ? `<button class="ghost" onclick="openKeeper('yatai')">${kpPic(kp)} 店主設定</button>` : ''}</div>`;
  };
  window.FamIsle = { apply, after, cards: OWN_CARDS };
})();

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
  const KEEP_BOARD = ['plan', 'walk'], KEEP_PLACE = ['home', 'walk', 'main', 'garden', 'wisdom'];   // wisdom：2c-1
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
  const OWN_TABS = ['home', 'mail', 'house', 'walk', 'moveStop', 'focus', 'plan', 'pick', 'confirm', 'shop', 'coins', 'more', 'guide', 'setup', 'keeper', 'kizuna', 'mainisle', 'garden', 'isle', 'isleNew', 'wisdom', 'whut', 'wlesson', 'famvisit'];   // famvisit：互訪   // wisdom、whut、wlesson：2c-1   // garden、isle、isleNew：2b-1
  // 家人島畫得出來的卡片（白名單）：Index.html 用 card('key', html) 包起來的卡片，key 不在這裡就不畫；要開放新卡片時把 key 加進來，後端 OWN_API 也要有對應的函式
  //   不在這裡、家人島看不到的：diaryShare（日めくり的分享按鈕，等拜訪家人島那一版）、link（跨科連結）、lightWord（燈塔的話）、adv（學習顧問）、keeperImg（管理員上傳圖片）、hallLink（v2.44 我的家去音樂廳的按鈕，家人島沒有音樂廳）
  const OWN_CARDS = ['diaryShare', 'kairan', 'timeline', 'homeMate', 'moveArt', 'habit', 'move', 'islet', 'xpEx', 'water', 'diary', 'news', 'version'];   // water、diary：2b-1   // news、version：版本說明的兩張卡（FAM_NEWSCARDS_v1）
  function apply() {
    b1Open();   // B1
    wordsOpen();   // 單字出題
    langOpen();   // FAM_LANG_A 語言先行
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
  const kairan0 = window.kairanCard;   // FAM_COMMON2_v1：島民每天的信開著才用回去
  window.kairanCard = () => '';
  // 衛星小島（isletCard）2b-1 起開放：商店照她的畫
  // ---------- 智慧島（2c-1 最小版）：FAM_WISDOM 開了才有；成人版課文由 Index.html 的 wisdomAdult() 載入 ----------
  window.wisdomOn = () => !!(S && S.wisdomOk);
  WISDOM_RULE = '每天最多上兩講，同一位老師每週一講。上過的課可以回小屋回看。';   // 一天最多兩講（爸爸 11/2）、一週一講照她的 wisdomTodayDone、wisdomWeekDone（爸爸 10/28）
  WISDOM_SHELF = '';   // 家人島沒有書店，上過的書不擺書架
  PLACES.wisdom.lead = '去智慧島的渡船由你請一位主人來開：取名字、選樣子、寫個性。';
  PLACES.wisdom.about = ['從這裡開船去智慧島，四位老師的課照順序上，一天最多上兩講，同一位老師每週一講', '每一講最後寫一句交給老師，老師會回你一句', '上完一講，老師會送一樣珍品，可以拿去屋台做料理', '一本書蓋滿 13 個章，老師會送一件畢業禮物到你島上的家'];
  const AI_OK = '你在智慧島寫給老師的那一句，會交給 AI，讓老師回你一句。這個 AI 用的是 Google Gemini 的付費版，你寫的字不會被拿去訓練 AI。你寫的和老師的回話，在 App 裡只有你自己看得到，其他家人都看不到；資料存在 App 管理員的 Google 試算表裡，管理員答應過不會去讀。';   // 文案審查 25
  const ensureDaily0 = window.ensureDaily;   // FAM_COMMON2_v1
  window.ensureDaily = async () => {};
  window.feelCard = () => ''; window.setFeel = () => {};   // FAM_TMFEEL_v1：每月自評家人版還沒做（v2.49.4）
  window.seedDefaults = async () => {};
  window.maybeGreet = () => {};

  // ---------- 上方：島的狀態 ----------
  window.hud = function () {
    const pct = Math.round((D.xp - D.lvBase) / (D.lvNext - D.lvBase) * 100);
    return `<div class="card" id="hudCard">
      <div class="row"><h2 class="grow">${esc(D.cfg.islandName || '我的島')}</h2><span class="muted">島嶼 Lv.${D.level}</span>
        <button class="ghost" style="padding:4px 10px" onclick="openHouse('me')" aria-label="我的家">${houseTier().ic}</button>
        <button class="ghost mailbtn" onclick="go('mail')" aria-label="郵便受け">📮${famNewsN() ? `<span class="dot">${famNewsN()}</span>` : ''}</button>
        <button class="ghost" style="padding:4px 10px" onclick="go('guide')" aria-label="玩法說明">❓</button></div>
      <div class="hud">
        <div><b>${D.xp}</b><span class="muted">經驗值</span></div>
        <div class="tap" onclick="go('shop')" role="button" aria-label="商店與兌換"><b>${D.coins}</b><span class="muted">🪙 島幣${D.coinParts.canEx ? `<span class="pill" style="margin-left:4px">可換 ${D.coinParts.canEx}</span>` : ''}</span></div>
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
      if (!window.FpsGuard) await loadScript('fpsguard.js').catch(() => {});   // FAM_FPSGUARD_v1：和她的島一樣，跑不順自動降畫質；載不到就照原本的畫質
      if (!window.Island3D) await loadScript('island3d.js');
      if (!document.getElementById('i3d')) return;
      el.innerHTML = '';
      const live = liveDirs().map(d => SLOT[d.slot]);
      Island3D.mount(el, {
        S, bond: D.bond, resident, roommate, imgOf, subjectName: SUBJECT_NAME, subjIc: SUBJ_IC,
        pointsUntil: i => { const p = pointsUntil(i), o = {}; Object.keys(p).forEach(k => { const g = GROUP[k] || k; o[g] = (o[g] || 0) + p[k]; }); return o; },
        sig: JSON.stringify(D.weekPts), season: solarTerm(S.today), walk: D.exDays.length,
        home: homeOf() && Object.assign({ tier: houseTier().key, roof: homeOf().roof, wall: homeOf().wall, name: homeOf().name, flowers: shownFurniture().includes('flower') }, typeof home3Ctx === 'function' ? home3Ctx(true) : {}),
        onHome: () => openHouse('me'),
        layout: { lanes: false, light: b1On(), off: SLOT.filter(s => live.indexOf(s) < 0), bg: D.cfg && D.cfg.bg },   // 島的背景：海上／宇宙／天空
        light: b1On() ? { name: lightTitle() } : null, ferry: { open: true, label: '⛴️ 港口', sub: '去別的島', far: false }, onFerry: openPort, yatai: { name: '島の屋台', sub: DISHES.some(canCook) ? '今天可以做料理' : null }, onYatai: () => openYatai(), book: null, marks: b1On() ? landmarkList().map(m => ({ id: m.id, model: m.model, s: m.s, at: m.at })) : [],
        ...(b1On() ? { onLight: () => go('light'), onMark: famMark, hall: (w => ({ name: '音樂廳', lit: w.min > 0, sub: moveActive() && moveActive().k === 'art' ? '計時中 🎵' : null }))(hallWeek()), onHall: () => openHall() } : {}),   // B1   // 港口（10/27）；屋台（10/28，開島就有）
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
  // ---------- FAM_WORDLINK：外語街直接進單字練習（語言模組串 11/8；11/26 P3a 外語街變語言街後由語言街取代） ----------
  const FAM_LANG_DIR = /外語|日文|英文|日語|英語|語言/;
  function famWordLink(d) {
    if (!d || !wordsOn() || !(d.ic === '🔤' || FAM_LANG_DIR.test(String(d.name || '')))) return '';
    return `<button class="ghost" style="width:100%;margin-top:8px" onclick="go('words');window.scrollTo(0,0)">🔤 去練單字</button>`;
  }
  const streets0 = window.streets;
  window.streets = function (s) {
    const base = streets0(s);
    if (!ownMode() || !wordsOn()) return base;
    return base + famWordLink(liveDirs().find(x => SLOT[x.slot] === s));
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
      <div class="muted" style="text-align:center;font-size:12px">最近四週完成的次數</div>${famWordLink(d)}${b1On() ? famMarkList(s) : ''}`;
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
    <div class="card"><h3>📊 紀錄</h3><div>有紀錄的週數：${D.recordedWeeks}</div></div>
    <div class="card"><div class="row"><button class="ghost" onclick="go('guide')">❓ 玩法說明</button>
      <button class="ghost" onclick="famOwnSwitch(false)">⛴️ ${esc(herGo())}</button></div>
      <div class="muted" style="margin-top:8px">版本 v${APP_VERSION}・家人島第一版</div></div>
    ${privacy()}
    ${visitCard()}
    ${commonCard()}
    ${BETA3D ? `<div class="card"><div class="row" style="flex-wrap:nowrap"><div class="grow"><b>🖥️ 3D 高畫質</b><div class="muted">開著會有影子、比較細的海浪；手機變慢或發燙就關掉。</div></div>
      <button class="ghost" onclick="toggleHQ()">${hqOn() ? '✅ 開著' : '⬜ 關著'}</button></div></div>` : ''}`;
  };
  const WHO_VISIT = '如果你打開「讓家人來我的島看看」，家人可以來看你的島，港口選單上也會顯示你填的島名和稱呼；關掉以後，港口選單上就不會出現你的島。';   // 互訪
  const WHO_ = () => { const her = (S && S.herCall) || (typeof herCall === 'function' ? herCall() : '家人');   // FAM_PRIVACY_v1：她的名字或稱呼（女兒／妹妹／姪女），家人畫面不寫「她」
    return '你的計畫、每天的紀錄、運動和商店，在 App 裡只有你自己看得到；' + (S && S.visitOk ? '沒打開「讓家人來我的島看看」的話，' : '') + '其他家人和' + her + '都看不到你的島。'   // 文案審查 131：有互訪選項時不寫死
    + '這些資料存在 App 管理員的 Google 試算表裡，和' + her + '的紀錄放在同一份試算表、不同的隱藏分頁，每天也會備份一份；App 管理員技術上打得開，但答應過不會去讀你沒分享的內容。'
    + '除了你在智慧島同意後寫給老師的那一句，不會把任何內容送給 AI。'
    + '沒按分享的日めくり，和喝水紀錄也一樣：在 App 裡只有你自己看得到。有疑問，隨時可以直接問 App 管理員。'
    + '在聚會所貼的公告，家人走進聚會所都看得到；用乘船券來玩的朋友看不到，也不會推到任何人的首頁。'   // 2b-2（爸爸 10/27；文案審查 19）
    + '在主島的列島地圖上，其他家人看得到你的稱呼、有沒有開島和你選的島背景（海上、宇宙、天空），看不到島名和島上的任何東西。'; };
  function privacy() {
    return `<div class="card"><h3>🔐 誰看得到什麼</h3><div class="muted" style="line-height:1.7">${WHO_()}${S.visitOk ? WHO_VISIT : ''}</div>
      <button class="ghost" style="width:100%;margin-top:10px" onclick="logoutPhone()">🚪 登出這支手機</button></div>`;
  }

  // ---------- 版本更新（FAM_NEWS_v1）：和她的島同一份 CHANGELOG，只留標了家人可看（fam）的項目 ----------
  const famPick = (o, list) => o && o.fam === true ? list : Array.isArray(o && o.fam) ? list.filter((_, i) => o.fam.includes(i)) : [];
  const famNext = () => (NEXT_UP && NEXT_UP.items) ? famPick(NEXT_UP, NEXT_UP.items) : [];
  // 和她的 newsItems() 同一套「沒看過的版本」規則，只是每一版只留家人可看的項目
  function famNews() {
    const seen = local.get('islandSeenVersion'); if (seen === APP_VERSION) return [];
    const seenAt = CHANGELOG.findIndex(c => c.v === seen);
    const list = (seenAt >= 0 ? CHANGELOG.slice(0, seenAt) : CHANGELOG.slice(0, CHANGELOG.findIndex(c => !c.minor) + 1))
      .map(c => Object.assign({}, c, { items: famPick(c, c.items) })).filter(c => c.items.length);
    return list.some(c => !c.minor) ? list : [];
  }
  const famNewsN = () => famNews().length ? 1 : 0;
  const famSeen = "local.set('islandSeenVersion', APP_VERSION); local.set('islandSeenNextUp', nextUpKey());";
  const nextList = (next, head, style) => next.length ? `<div class="muted" style="${style}">${head}<ul style="margin:4px 0 0;padding-left:20px">${next.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : '';
  window.viewMail = function () {
    const g = guide(), news = famNews();
    const card = news.length ? window.card('news', `<div class="card" style="border:2px solid var(--plum)"><h3>✨ 小島更新了（v${APP_VERSION}）</h3>
      <ul style="margin:6px 0 10px;padding-left:20px">${news.filter(c => !c.minor).flatMap(c => c.items).map(i => `<li>${esc(newsText(i))}</li>`).join('')}</ul>
      ${minorFold(news.filter(c => c.minor))}
      ${nextList(famNext(), `<b>下次更新（${esc(NEXT_UP.when)}）預計會有：</b>`, 'margin:-4px 0 10px')}
      <div class="row"><button onclick="${famSeen} go('guide')">看玩法說明</button>
      <button class="ghost" onclick="${famSeen} render()">知道了</button></div></div>`) : '';   // FAM_NEWSCARDS_v1
    return `<div class="card"><div class="row"><span class="avatar">${g.pic}</span>
      <div class="speech grow"><b>${esc(g.name)}</b>：${news.length ? '小島更新了！我把這次多了什麼都寫在下面。' : '郵便受け現在空空的。小島更新的時候，右上角的 📮 會亮紅點喔。'}</div></div></div>
    ${card}
    <div class="row"><button class="grow" onclick="go('home')">回到島上</button></div>`;
  };
  function famVersionCard() {
    const cur = CHANGELOG.find(c => c.v === APP_VERSION) || CHANGELOG[0];
    return window.card('version', `<div class="card" style="border:2px solid var(--plum-light)"><div class="row"><b class="grow">🏷️ 目前版本 v${APP_VERSION}</b><span class="muted">${esc(cur ? cur.date : '')}</span></div>
      ${nextList(famNext(), `下次更新：${esc(NEXT_UP && NEXT_UP.when || '')}，預計會有：`, 'margin-top:4px;font-size:13px')}
      <button class="ghost" style="margin-top:8px;padding:4px 10px;font-size:13px" onclick="local.del('islandSeenVersion');go('mail')">看這次更新了什麼 ›</button></div>`);   // FAM_NEWSCARDS_v1
  }
  window.viewGuide = function () {
    const g = guide();
    return `${famVersionCard()}<div class="card"><div class="big">${g.pic}</div><h2 style="text-align:center">${esc(D.cfg.islandName)} 的玩法</h2>
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
      <div class="muted" style="text-align:center">玩法和${esc(herIsle())}一樣：排計畫、每天記錄、每週確認，島會跟著長大。學習和累積的方向由你自己訂。</div></div>
    ${f.first ? `<div class="card"><h3>1. 誰看得到什麼</h3><div class="muted" style="line-height:1.7">${WHO_()}${S.visitOk ? WHO_VISIT : ''}</div>
      <label class="row" style="margin-top:8px"><input type="checkbox" id="famConsent" ${f.consent ? 'checked' : ''} style="width:auto"> 我看過了，同意</label></div>` : ''}
    <div class="card"><h3>${f.first ? '2. ' : ''}你希望怎麼被稱呼</h3><div class="muted">${S.visitOk ? '島主夥伴和島民會這樣叫你。打開「讓家人來我的島看看」以後，家人在港口選單上也看得到。' : '島主夥伴和島民會這樣叫你，只有你自己的島上看得到。'}</div>
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

  // 「她的島」對家人說成她的島名（HER_LABEL_v1，爸爸 10/29）；拿不到島名就照稱呼說關係
  const HER_REL = { 爸爸: '女兒', 媽媽: '女兒', 姐姐: '妹妹', 姑姑: '姪女' };
  const herRel = () => (HER_REL[S && S.who && S.who.name] || '她') + '的島';
  window.herIsle = () => S && S.herName ? S.herName : herRel();
  window.herGo = () => S && S.herName ? '去' + S.herName + (S.herCall ? '（' + S.herCall + '）' : '') : '去' + herRel();
  // ---------- 畫面畫好以後：上方橫幅、收掉會考專用的按鈕、島主夥伴第一次打招呼 ----------
  function after(t) {
    const app = document.getElementById('app');
    app.insertAdjacentHTML('afterbegin', `<div class="card" style="background:#2f6b4f;color:#fff"><div class="row"><b class="grow">🏝️ ${esc(S.who.name)}的島</b>
      <button style="background:transparent;color:#fff;border:1px solid #fff;padding:6px 12px" onclick="famOwnSwitch(false)">⛴️ ${esc(herGo())}</button></div></div>`);
    const rm = el => el && el.remove();
    // 家人島沒有的卡片（日めくり的分享按鈕、跨科連結、燈塔的話、學習顧問、管理員上傳圖片）由 Index.html 的 card() 照 OWN_CARDS 不畫；這裡只剩管理員介紹裡講到它們的那幾行
    app.querySelectorAll('li').forEach(li => { if (/分享給家人|每天會寫一句話/.test(li.textContent)) rm(li); });   // 日めくり還不能分享；小島管理員每天的一句話要 AI（2c-2）
    if (t === 'plan') {
      const scan = document.getElementById('scanFile'); if (scan && !scanOn()) { const card = scan.closest('.card'); rm(scan.closest('label')); if (card) card.querySelectorAll('.muted').forEach(m => { if (m.querySelector('[onclick*="abbr"]')) rm(m); }); }
      app.querySelectorAll(scanOn() ? '[onclick*="go(\'items\')"]' : '[onclick*="go(\'abbr\')"],[onclick*="go(\'items\')"]').forEach(rm);   // FAM_COMMON2_v1
    }
    if (t === 'shop') {
      app.querySelectorAll('[onclick*="xqCard"]').forEach(b => rm(b.closest('.card')));
      const m = app.querySelector('.card h2 + .muted'); if (m && /挑戰任務/.test(m.textContent)) m.innerHTML = `你有 <b>${D.coins}</b> 枚島幣。經驗值可以換島幣，島幣換你自己訂的獎勵，商品在「更多 → 修改我的島」新增。`;
    }
    if (t === 'home') app.querySelectorAll('.district .grade').forEach(g => { const box = g.closest('.district'); rm(g); if (box && box.lastElementChild && /Boss|試煉/.test(box.lastElementChild.textContent)) rm(box.lastElementChild); });
    // 2c-1：還沒同意交給 AI，寫一句的地方上面先放說明和同意按鈕；不同意也可以交，老師用內建句子回
    if (t === 'wlesson' && !S.save.aiOk && !(draft.wl && draft.wl.book === 'zw')) {   // ESSAY_A_v1：作文助教不叫 AI
      const go = document.getElementById('wGo');
      if (go) go.insertAdjacentHTML('beforebegin', `<div class="card" id="famAiOk" style="margin:8px 0;background:#f6f1e6"><div class="muted" style="line-height:1.7">${AI_OK}</div>
        <button class="ghost" style="width:100%;margin-top:8px" onclick="famAgreeAi()">我看過了，同意</button>
        <div class="muted" style="font-size:12px;margin-top:6px">先不同意也可以寫，老師會用事先寫好的一句話回你。</div></div>`);
    }
    if (b1On()) { const w = document.createTreeWalker(app, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) [['讀書計時', '專心計時'], ['讀書計畫', '我的計畫']].forEach(([x, y]) => { if (n.nodeValue.indexOf(x) >= 0) n.nodeValue = n.nodeValue.split(x).join(y); }); }   // B1（文案審查 10/28）：家人島的計時叫專心計時，首頁、音樂廳同一包一起改
    if (t === 'home') visitRefresh();
    commonAfter();   // FAM_COMMON_v1
    common2After(t);   // FAM_COMMON2_v1
    app.querySelectorAll('[onclick^="shareDiaryPage"],[onchange^="shareDiaryPage"]').forEach(b => {   // 互訪：分享按鈕的字和說明；FAM_VISIT 沒開就不給分享（沒有人看得到）
      const box = b.tagName === 'INPUT' ? b.closest('label') : (b.tagName === 'BUTTON' ? b : null);   // FAM_SEECHK_v1：分享重整起是勾選框（她那邊的字是乘船券），家人島換成互訪的字
      if (!box) return rm(b);   // 認不出來的寫法（沒有 label 的勾選框、不是按鈕的東西）就拿掉，不留她那邊的字
      if (!S.visitOk) return rm(box);
      if (box !== b) { [...box.childNodes].forEach(n => { if (n.nodeType === 3) n.remove(); }); box.insertAdjacentText('beforeend', ' 分享給來看的家人'); }
      else b.textContent = /已分享/.test(b.textContent) ? '👀 已分享（按一下收回）' : '分享給來看的家人';
      if (!box.parentNode.querySelector('.famShareNote')) box.insertAdjacentHTML('afterend', `<div class="muted famShareNote" style="font-size:12px;width:100%;text-align:right">${SHARE_NOTE}</div>`);
    });
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
    { ic: '⛰️', name: '去主島', on: () => mainOpen(), go: () => go('mainisle') },
    { ic: '📜', name: '去智慧島', on: () => wisdomOn(), go: () => go('wisdom') }];   // 2c-1：港口選單加智慧島
  window.famPort = PORT;
  function closePort() { const el = document.getElementById('famPort'); if (el) el.remove(); }
  function openPort() {
    closePort();
    // 爸爸 10/28：每座島的港口都列「自己的島、主島、智慧島、其他家人的島」，她是家人之一（她的島排在其他家人的島第一個）；自己的島標「你在這裡」、按不下去
    const list = [{ ic: '🏝️', name: '我的島（你在這裡）', here: 1 }].concat(PORT.filter(p => p.on() && p.name !== '去看她的島'), PORT.filter(p => p.name === '去看她的島').map(p => Object.assign({}, p, { name: herGo() })),
      ((S && S.famVisit) || []).filter(n => n !== S.who.name).map(n => ({ ic: '🏝️', name: '去' + famIsleLabel(n), go: () => openFamVisit(n) })));   // 互訪；島名和稱呼都是本人自己填的（爸爸 10/28），她的島是她的島名（她自己填了稱呼才加括號）
    document.body.insertAdjacentHTML('beforeend', `<div id="famPort" style="position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.35);display:flex;align-items:flex-end;justify-content:center" onclick="if(event.target===this)this.remove()">
      <div class="card" style="width:100%;max-width:480px;margin:0 16px 16px"><h3 style="margin-top:0">⛴️ 要去哪裡？</h3>
      ${list.map((p, i) => `<button class="opt" style="width:100%;margin-top:6px${p.here ? ';background:#eee;color:#888;border-color:#ddd' : ''}" data-port="${i}"${p.here ? ' disabled' : ''}>${p.ic} ${esc(p.name)}</button>`).join('')}
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
  window.famAgreeAi = async function () {
    const note = (document.getElementById('wNote') || {}).value;
    try { S = await call('agreeAi'); D = derive(S); } catch (e) { return toast('沒有存到：' + (e.message || e)); }
    if (draft.wl && note != null) draft.wl.note = note;
    toast('好，之後老師會照你寫的內容回你'); render();
  };
  // ---------- 互訪：讓家人來我的島看看（快照照乘船券的做法，只放下面列的東西） ----------
  const VISIT_YES = ['港口選單上的島名和你填的稱呼', '島名和等級、島的樣子和背景', '方向的名字和圖示、島民和島主夥伴的名字', '你的家的外觀、種的樹、衛星小島', '你按了分享的日めくり（家人都看得到）'];
  const VISIT_NO = ['計畫、每天的紀錄、達成率', '喝水、智慧島寫給老師的句子', '誰來看過（不記錄）'];
  function famSnapOf() {
    const live = liveDirs(), g = guide(), h = homeOf(), res = {}, pts = {}, p = pointsUntil(null);
    live.forEach(d => { const k = SLOT[d.slot], r = resident(k); res[k] = { name: r.name, emoji: r.emoji, personality: r.personality || '' }; });
    Object.keys(p).forEach(k => { const g2 = GROUP[k] || k; pts[g2] = (pts[g2] || 0) + p[k]; });
    return { v: 1, at: S.today, title: D.cfg.islandName || '我的島', level: D.level, season: solarTerm(S.today), bg: D.cfg.bg || 'sea', walk: D.exDays.length,
      guide: { name: g.name, emoji: g.emoji }, dirs: live.map(d => ({ slot: d.slot, name: d.name, ic: d.ic })), residents: res, pts, bond: D.bond,
      home: h ? Object.assign({ tier: houseTier().key, roof: h.roof, wall: h.wall, name: h.name, flowers: shownFurniture().includes('flower') }, typeof home3Ctx === 'function' ? home3Ctx(false) : {}) : null,
      garden: gardenCtx(), islets: islets().map(x => ({ key: x.key, slot: x.slot, style: x.style, name: isletName(x), ic: ISLET_STYLES[x.style].ic, keeper: '' })) };
  }
  function visitOn() { return !!(S.save.visit && S.save.visit.on); }
  function visitCard() {
    if (!S.visitOk) return '';
    const on = visitOn();
    return `<div class="card" id="famVisitCard"><h3>🏝️ 讓家人來我的島看看</h3>
      <div class="muted" style="line-height:1.7">${on ? '開著：家人可以從港口或主島來看你的島，看到的是 ' + esc(short(S.save.visit.at)) + ' 的樣子（每天第一次打開島時會更新）。' : '打開以後，家人可以從港口或主島來看你的島，只能看，不會改到任何東西。'}</div>
      <div class="row" style="align-items:flex-start;margin-top:8px"><div class="grow" style="min-width:150px"><b style="color:#2e7d32">✅ 看得到</b>
        <ul style="margin:4px 0;padding-left:18px">${VISIT_YES.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="grow" style="min-width:150px"><b style="color:var(--plum)">🙈 看不到</b><ul style="margin:4px 0;padding-left:18px">${VISIT_NO.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
      <button class="${on ? 'ghost' : ''}" style="width:100%;margin-top:8px" onclick="famVisitSet(${on ? 'false' : 'true'})">${on ? '關掉，不讓人來看' : '打開，讓家人來看看'}</button></div>`;
  }
  window.famVisitSet = async function (on) {
    try { S = await call('saveVisit', on, on ? famSnapOf() : null); D = derive(S); } catch (e) { return toast('沒有存到：' + (e.message || e)); }
    toast(on ? '打開了，家人可以來看你的島' : '關掉了，現在誰都看不到'); render();
  };
  let visitFresh = false;
  function visitRefresh() {   // 每天第一次打開島時，用今天的樣子更新快照（不重畫畫面）
    if (visitFresh || !S.visitOk || !visitOn() || S.save.visit.at === S.today) return;
    visitFresh = true;
    call('saveVisit', true, famSnapOf()).then(st => { S = st; D = derive(S); }).catch(() => {});
  }
  // 日めくり分享：家人島的字（爸爸 10/28：分享以後所有家人都看得到，包括她）
  const SHARE_NOTE = '分享後，所有家人都看得到；已經被看過的收不回';
  window.shareDiaryPage = function (date) {
    const d = Object.assign({}, S.save['diary:' + date]); if (!d.text) return;
    d.shared = !d.shared; S.save['diary:' + date] = d;
    queueSave('diary:' + date, 'saveDiary', date, d.text, d.shared, d.emoji || '');
    toast(d.shared ? '這一頁分享出去了，家人都看得到' : '收回了；已經被看過的收不回'); render();
  };
  // ---------- B1（爸爸 10/28 選、工程顧問 10/28 排進 11/5）：FAM_B1 開了才有；關著時上面的白名單一個字都不加 ----------
  const b1On = () => !!(S && S.b1Ok);
  let b1Ready = false;
  function b1Open() {
    if (b1Ready || !b1On()) return; b1Ready = true;
    KEEP_PLACE.push('hall'); OWN_TABS.push('hall');   // 音樂廳：計時寫家人自己的 move:日期（saveMove），綠點照她的規則從那裡算
    OWN_TABS.push('hand');   // HANDLOG_FAM_v1：計時補登頁（HANDLOG_v1），存進家人自己的 move:／focus:，後端 handCheck_ 一樣擋
    OWN_CARDS.push('matShelf', 'buyBack');   // 商店的素材櫃與收購
    ['buyMat', 'sellDish'].forEach(f => { if (OWN_FNS.indexOf(f) < 0) OWN_FNS.push(f); });
    PLACES.hall = Object.assign({}, PLACES.hall, { about: PLACES.hall.about.map(a => a.replace('讀書計時', '專心計時')) });
    PLACES.yatai.about = PLACES.yatai.about.concat(['素材不夠的話，商店的素材櫃可以用島幣買常見素材；做好的料理也可以賣給商店']);
    b1bOpen();   // B1b
  }
  // 素材櫃、收購：照她的卡片（價錢、每天的上限都一樣），只換掉講讀書的字
  const matShelf0 = matShelfCard, buyBack0 = buyBackCard;
  window.matShelfCard = () => matShelf0().replace('稀有素材和智慧島的珍品不賣，要讀書才拿得到。', wisdomOn() ? '稀有素材和智慧島的珍品不賣，要完成項目、上智慧島的課才拿得到。' : '稀有素材不賣，要完成項目才拿得到。');
  window.buyBackCard = () => buyBack0().replace('也不超過當天讀書拿到的素材數', '也不超過當天拿到的素材數');
  // 讀完書的地標（內容規則 10/28 顧問通過）：只算智慧島的書，一本 13 講都上完才長；照同一個位置找家人的方向，那裡空著就長在排第一的方向
  const landmarkOf0 = landmarkOf, landmarkList0 = landmarkList, WISDOM_KEYS = WISDOM_BOOKS.map(b => b.key);
  window.landmarkOf = function (id) {
    if (!b1On()) return landmarkOf0(id);
    const l = LANDMARKS[id], live = liveDirs(); if (!l || WISDOM_KEYS.indexOf(id) < 0) return null;
    const d = live.find(x => x.slot === SLOT.indexOf(l[0])) || live[0]; if (!d) return null;
    return { s: SLOT[d.slot], name: l[1], street: d.name + '街', model: id };
  };
  window.landmarkList = function () {
    if (!b1On()) return landmarkList0();
    return myBooks().map(b => { const ns = Object.keys(b.done), l = landmarkOf(b.key); if (ns.length < 13 || !l) return null;
      return Object.assign({ id: b.key, key: 'w:' + b.key, at: ns.map(n => String(b.done[n].at || '').slice(0, 10)).sort().pop(), title: b.title }, l); })
      .filter(Boolean).sort((a, b) => (a.at || '').localeCompare(b.at || ''));
  };
  function famMark(id) {   // 家人島沒有書店：點地標回那位老師的小屋（上過的課可以回看）
    const m = landmarkList().find(x => x.id === id); if (!m) return;
    if (!wisdomOn()) return toast('「' + m.name + '」：上完《' + m.title + '》13 講長出來的');
    wisdomHut = id.replace(/2$/, ''); draft = {}; tab = 'whut'; render(); window.scrollTo(0, 0);
  }
  window.famMark = famMark;
  function famMarkList(s) {
    const lm = landmarkList().filter(m => m.s === s);
    return lm.length ? `<div class="muted" style="margin-top:10px">上完一本書長出的地標</div>${lm.map(m => `<div class="item" style="cursor:pointer" onclick="famMark('${m.id}')"><span>🏞️</span><div class="name grow">${esc(m.name)}<div class="muted" style="font-size:12px">${esc(m.title)}・${esc(short(m.at))} 上完</div></div><span>›</span></div>`).join('')}` : '';
  }
  // 小屋：上過的課下面加地標的那一行（她的版本在書店的書頁）
  const viewWisdomHut0 = viewWisdomHut;
  window.viewWisdomHut = function () {
    const html = viewWisdomHut0(); if (!b1On()) return html;
    const k = wisdomHut, lines = [k, k + '2'].filter(b => Object.keys(wisdomDone(b)).length).map(b => landLine(b, Object.keys(wisdomDone(b)).length >= 13, '上完 13 講')).join('');
    if (!lines) return html;
    const i = html.lastIndexOf('<div class="row">');
    return html.slice(0, i) + `<div class="card" id="famLand">${lines}</div>` + html.slice(i);
  };
  // ---------- 通案化第一批（FAM_COMMON_v1，爸爸 10/30）：她的島有、家人也用得到的，照她的畫面開給家人島 ----------
  OWN_TABS.push('log', 'wish'); OWN_CARDS.push('moveRead');
  ['saveMed', 'saveMedCfg', 'addWish'].forEach(f => { if (OWN_FNS.indexOf(f) < 0) OWN_FNS.push(f); });
  // 吃藥：おつとめ板的那一行只在自己打開提醒以後才出現（她的一直都在）
  KEEP_BOARD.push('med');
  const medRow = BOARD.find(b => b.key === 'med'); if (medRow) medRow.on = () => !!(S && S.save && S.save.med);
  function medOn() { return !!(S.save && S.save.med); }
  window.famMedSet = async function (on) {
    try { await flush(); S = await call('saveMedCfg', on ? { am: [7, 10], pm: [19, 22] } : null); D = derive(S); } catch (e) { return toast('沒有存到：' + (e.message || e)); }
    toast(on ? '💊 打開了，首頁的おつとめ板會提醒你' : '關掉了，之前的紀錄還留著，一樣只有你看得到'); render();
  };
  // 共讀：家人島也開（後端 getState 帶 features: ['read']）；計時卡放在書店的書架下面（書店是書架小巷 FAM_SHOP 的，沒套或沒開就沒有這張）
  window.readOn = () => (S.features || []).includes('read');
  const viewBookstore1 = window.viewBookstore;
  window.viewBookstore = function () {
    const h = viewBookstore1(), at = '<div class="card"><h3>➕ 自己加一本</h3>';
    return typeof shopOn === 'function' && shopOn() && readOn() && h.indexOf(at) >= 0 ? h.replace(at, card('moveRead', readHtml()) + at) : h;
  };
  // 航海日誌：只留「照計畫做」和換週；會考的段落（這週一句話、瓶子、紙船、跨科連結）和燈塔的樓層列收起來
  const viewLog0 = window.viewLog;
  window.viewLog = function () {
    const box = document.createElement('div'); box.innerHTML = viewLog0();
    box.querySelectorAll('.card').forEach(c => { const h = c.querySelector('h3'); if (h && /^(✍️|🍶|⛵|🔗)/.test(h.textContent.trim())) c.remove(); });
    const top = box.querySelector('h2'); if (top) { const card0 = top.closest('.card'); while (card0 && card0.previousElementSibling) card0.previousElementSibling.remove(); }
    const intro = top && top.parentNode.querySelector('.muted'); if (intro) intro.textContent = '一週一頁：照計畫做了多少。這裡只是紀錄，不加分也不扣分。';
    box.querySelectorAll('button').forEach(b => { if (/去海灘/.test(b.textContent)) b.remove(); });
    box.querySelectorAll('h3').forEach(h => { if (h.textContent.trim() === '📅 照計畫讀') h.textContent = '📅 照計畫做'; });
    box.querySelectorAll('.muted').forEach(m => { if (m.innerHTML.indexOf('🏮 變成燈籠的瓶子') >= 0) m.innerHTML = m.innerHTML.split('🏮 變成燈籠的瓶子・⛵ 紙船・🚢 親子船・🔗 跨科連結・').join(''); });   // 月末繪卷的圖例：只留家人有的
    box.querySelectorAll('.card div').forEach(d => { if (!d.children.length && /^(🍶 新漂來|⛵ 放了|Boss 項目達成|故事任務：)/.test(d.textContent.trim())) d.remove(); });   // 月末繪卷：合計和一路走來只留家人有的（瓶子、紙船、Boss、故事任務是她的）
    box.querySelectorAll('.card div').forEach(d => { const t = d.textContent.trim(); if (d.children.length) return;
      if (/^每累積 \d+ 週紀錄/.test(t)) d.remove(); else if (/^有紀錄的週數：/.test(t)) d.textContent = t.split(/\s*最長連續/)[0]; });   // 不用連續週數當指標（文案審查 65 補）
    box.querySelectorAll('button[disabled]').forEach(b => { if (/上一週|下一週/.test(b.textContent)) b.classList.add('floff'); });   // FAM_LIGHT2F_v1：不能按的用 .floff，不用透明度（美術 11/1）
    const wb = box.querySelector('b.grow'); if (wb && wb.firstChild && wb.firstChild.nodeType === 3) { const sp = document.createElement('span'); sp.style.whiteSpace = 'nowrap'; sp.textContent = wb.firstChild.textContent; wb.replaceChild(sp, wb.firstChild); }   // 週次不斷行
    return (draft.logMode === 'month' ? '' : famFloors('log')) + box.innerHTML;   // FAM_LIGHT2F_v1：2F 頁首放樓層列（和她的燈塔一樣；月末繪卷頁不放）
  };
  // 讓島順起來：同一個分頁，轉交的人是管理員；只看得到自己寫的（後端只給自己的列）
  const viewWish0 = window.viewWish;
  window.viewWish = () => viewWish0().split('我會轉交給爸爸').join('我會轉交給 App 管理員').split('送出給爸爸 📮').join('送出給App 管理員 📮')
    .split('<b>爸爸</b>：').join('<b>App 管理員</b>：').split('例如：希望挑戰任務可以選年份、3D 房間想要能自己移動家具……').join('例如：希望可以多一種玩法、3D 房間想要能自己移動家具……');
  window.sendWish = async function () {
    const w = draft.wish; w.text = document.getElementById('wishText').value;
    if (!w.text.trim()) return toast('先寫下你的想法吧');
    document.getElementById('wishGo').disabled = true;
    try { await flush(); S = await call('addWish', w.kind, w.text, w.shot); D = derive(S); }
    catch (e) { document.getElementById('wishGo').disabled = false; return toast('送出失敗：' + (e.message || e)); }
    draft = {}; toast('📮 收到了！App 管理員會看到你的想法'); render(); window.scrollTo(0, 0);
  };
  function commonCard() {
    return `<div class="card" id="famCommonCard"><h3>🧰 其他</h3>
      <div class="row" style="gap:6px"><button class="ghost grow" onclick="draft={}; go('log')">📖 航海日誌</button><button class="ghost grow" onclick="draft={}; go('wish')">💡 讓島順起來</button></div>
      <div class="row" style="flex-wrap:nowrap;margin-top:10px"><div class="grow"><b>💊 吃藥提醒</b><div class="muted">打開以後，首頁的おつとめ板會在你設的時段問一聲；紀錄在 App 裡只有你自己看得到，其他家人都看不到。</div></div>
        <button class="ghost" onclick="famMedSet(${medOn() ? 'false' : 'true'})">${medOn() ? '✅ 開著' : '⬜ 關著'}</button></div>${dailyRow()}${langCanOn() ? famLangRow() : ''}</div>`;
  }
  function commonAfter() {   // 吃藥卡片：家人島沒有「讓爸爸也看得到」；共讀／閱讀計時卡片的字換成家人版
    const app = document.getElementById('app');
    app.querySelectorAll('[onchange^="medSetShare"]').forEach(i => { const l = i.closest('label'); if (!l) return; const n = l.nextElementSibling; if (n && n.classList.contains('muted')) n.remove(); l.remove(); });
    // 11/1 READ_NAME_v1 改名「閱讀計時」後：家人島不寫「讀書」「課外書」（文案審查 104）；改名前的「親子共讀」照舊換成「共讀」
    const RW = [['讀書計時（課本）、運動、藝文和閱讀（課外書），一次只能開一個。', '運動、藝文和閱讀，一次只能開一個。'], ['讀課外書的時候', '看想讀的書的時候'], ['課外書', '想讀的書'], ['親子共讀', '共讀']];
    const w = document.createTreeWalker(app, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) RW.forEach(([x, y]) => { if (n.nodeValue.indexOf(x) >= 0) n.nodeValue = n.nodeValue.split(x).join(y); });
  }
  // ---------- 通案化第二批（FAM_COMMON2_v1，工程顧問 10/30）：拍手寫計畫、島民每天的信；都會叫 AI，和智慧島共用每人每天的次數 ----------
  function scanOn() { return !!(S && S.scanOk); }
  function dailyOn() { return !!(S && S.dailyOk && S.save && S.save.aiDaily && S.save.aiDaily.on); }
  OWN_TABS.push('scan', 'abbr');   // 後端沒開 FAM_SCAN 時計畫頁沒有拍照按鈕，進不來這兩頁；就算進來，scanPlan 也會被後端擋
  ['scanPlan', 'saveAbbr', 'getDaily', 'setAiDaily'].forEach(f => { if (OWN_FNS.indexOf(f) < 0) OWN_FNS.push(f); });
  const SCAN_NOTE = '📷 照片會交給 AI（Google Gemini 付費版）讀，讀完只留下排好的計畫。App 不會存照片，照片也不會被拿去訓練 AI。'   // 文案審查 67;
  window.abbrOf = (abbrOf0 => () => S.save.abbr ? abbrOf0() : { map: {}, ignore: [] })(window.abbrOf);   // 她的預設字典是她的寫法，家人從空的開始
  window.viewAbbr = (v0 => () => v0().split('右邊是週檢討表上的項目').join('右邊是你島上的項目').split('例如：理複、Wei M').join('例如：英聽、晨跑')
    .split('全部都要做（例如「國三」＝online、閱策、成語）').join('全部都要做（例如「早上」＝伸展、喝水）').split('其中一項，上課後才知道（例如「Wei H」）').join('其中一項，做了才知道是哪一項')
    .split('跟讀書無關的行程').join('跟項目無關的行程').split('例如才藝課、運動。').join('例如開會、聚餐。').split('例如：violin').join('例如：開會'))(window.viewAbbr);
  window.viewScan = (v0 => () => v0().split('不是讀書的行程，按「無關」').join('不是項目的行程，按「無關」'))(window.viewScan);
  // 拍照：和她的一樣，只多一種結果：今天的 AI 次數用完了（後端回 { quota: true }），說一聲、讓他自己排，不當成錯誤
  window.scanPlanPhoto = async function (file) {
    const wk = planWeek, t0 = Date.now();
    const tick = () => scanOverlay(`<div class="big">🔍</div><h3 style="text-align:center">島民正在讀你的計畫…</h3><div class="muted" style="text-align:center">大約 10 到 60 秒・已經 ${Math.round((Date.now() - t0) / 1000)} 秒</div>`);
    tick(); clearInterval(scanOverlay.t); scanOverlay.t = setInterval(tick, 1000);
    try {
      const photo = await shrinkPhoto(file);
      await flush();
      const res = await Promise.race([call('scanPlan', wk, photo),
        new Promise((_, bad) => setTimeout(() => bad(new Error('等了 150 秒還沒讀完，可能是網路或 AI 太忙，過一下再拍一次')), 150000))]);
      if (res && res.quota) {
        clearInterval(scanOverlay.t);
        return scanOverlay(`<div class="big">🌙</div><h3 style="text-align:center">今天的 AI 次數用完了</h3><div class="muted" style="text-align:center">這週的計畫可以點日子自己排，明天再拍也可以。</div><div class="row" style="margin-top:12px"><button class="grow" onclick="scanOverlayClose()">好，我自己排</button></div>`);
      }
      scanOverlayClose();
      draft = { scan: res, week: wk, markDone: true }; tab = 'scan'; render(); window.scrollTo(0, 0);
    } catch (e) {
      clearInterval(scanOverlay.t);
      scanOverlay(`<div class="big">😵</div><h3 style="text-align:center">這次沒讀出來</h3><div class="muted" style="text-align:center">${esc(e.message || String(e))}</div><div class="row" style="margin-top:12px"><button class="grow" onclick="scanOverlayClose()">知道了</button></div>`);
    }
  };
  // 島民每天的信：開著才有回覧板（沒有新聞），每天第一次回到島上叫一次；次數用完或 AI 出錯，回覧板照舊用內建的島上消息
  window.kairanCard = () => dailyOn() ? kairan0().split('爸爸回覆了').join('App 管理員回覆了') : '';
  window.guideNews = () => '';
  function dailyRow() {
    if (!S.dailyOk) return '';
    const on = dailyOn();
    return `<div class="row" style="flex-wrap:nowrap;margin-top:10px"><div class="grow"><b>✉️ 島民每天的信</b><div class="muted">打開以後，每天第一次回到島上，島民會各寫一句話給你，放在首頁的回覧板。信是 AI（Google Gemini 付費版）寫的，送出去的只有島民的名字、個性、說話方式、負責的方向和跟你的交情；你寫的紀錄、成績和App 管理員的備註都不送。一天寫一次。</div></div>
        <button class="ghost" onclick="famDailySet(${on ? 'false' : 'true'})">${on ? '✅ 開著' : '⬜ 關著'}</button></div>`;
  }
  window.famDailySet = async function (on) {
    try { await flush(); S = await call('setAiDaily', on); D = derive(S); } catch (e) { return toast('沒有存到：' + (e.message || e)); }
    toast(on ? '✉️ 打開了，回到島上就會收到今天的信' : '關掉了，首頁的回覧板收起來了'); render();
  };
  function common2After(t) {
    const app = document.getElementById('app');
    if (t === 'plan' && scanOn()) {
      const f = document.getElementById('scanFile'), card = f && f.closest('.card'), m = card && card.querySelector('.muted');
      if (m && !card.querySelector('#famScanNote')) m.insertAdjacentHTML('afterend', `<div class="muted" id="famScanNote" style="margin-top:6px;font-size:12px">${SCAN_NOTE}</div>`);
    }
    if (t === 'abbr') app.querySelectorAll('[onclick*="go(\'items\')"]').forEach(b => b.remove());
    if (t === 'home' && dailyOn() && !S.save['daily:' + S.today]) ensureDaily0();
  }
  ['coinBook', 'coinGoal', 'coinFoot'].forEach(k => { if (OWN_CARDS.indexOf(k) < 0) OWN_CARDS.push(k); });   // COINBOOK_v1 家人自己的島也有島幣帳本、存錢目標
  // ---------- B1b（內容規則 10/28、工程顧問 10/28 四點，排在 11/13）：燈塔、紙船碼頭、小巷；跟 B1 同一個開關，不碰 AI ----------
  function b1bOpen() {
    OWN_TABS.push('light', 'paper'); KEEP_PLACE.push('light', 'paper');   // 燈塔只有海灘一層；燈室、航海日誌不開
    OWN_CARDS.push('link');   // 確認這週頁下面的小巷
    ['saveLighthouse', 'addPaper', 'saveLink'].forEach(f => { if (OWN_FNS.indexOf(f) < 0) OWN_FNS.push(f); });
    const lk = PLACE_LINKS.find(p => p.key === 'light'); if (lk) lk.on = () => true;   // 還沒取名也能從「去島上走走」進燈塔
    PLACES.lighthouse = Object.assign({}, PLACES.lighthouse, { lead: '燈塔由你請一位守燈人來顧：取名字、選樣子、寫個性。',
      about: ['這座燈塔每天晚上都會亮著，替你的島照路', '燈塔下面的岬角有一個紙船碼頭，做完一件事想記一下心得，就去那裡放一艘船', '樓上的燈室還在整理，之後會再開放'] });
    VISIT_NO.push('紙船上的心得、連結寫的那一句');
  }
  const famDir = code => ((isle() && isle().dirs) || []).find(d => SLOT[d.slot] === code);
  const dirPill = code => { const d = famDir(code); return `<span class="pill">${d ? esc(d.ic) + ' ' + esc(d.name) : '🌾'}</span>`; };
  // FAM_LIGHT2F_v1：樓層列四格，2F 航海日誌（爸爸 11/1「燈塔預設存在」：建物、守燈人、1F、碼頭、2F 每座島都有；3F 燈室、錯題跟學習類模組走，先「整理中」）
  // 美術 11/1：≤360 寬拿掉 emoji 只留兩行字；樓層編號 12px；「整理中」那格不用透明度（washi 底、1px 虛線、#5f5a55、12px）；所在樓層梅紅實心；數字標籤和週次不換行
  const FLOOR_CSS = '.floors button small{font-size:12px;opacity:1}.floors button:disabled:not(.on),button.floff:disabled{opacity:1;background:#fffdf8;border:1px dashed #5f5a55;color:#5f5a55}.floors button:disabled:not(.on) small{color:#5f5a55}.floors button.on:disabled{opacity:1}.hud .muted{white-space:nowrap}@media (max-width:360px){.floors .fi{display:none}}';
  function famFloors(cur) {
    if (!document.getElementById('famFloorsCss')) document.head.insertAdjacentHTML('beforeend', '<style id="famFloorsCss">' + FLOOR_CSS + '</style>');
    const f = [['light', '1F', '🌊', '海灘'], ['log', '2F', '📖', '航海日誌'], ['lamp', '3F', '🔭', '燈室'], ['paper', '岬角下', '⛵', '碼頭']];
    const f2 = f.filter(([t]) => t === 'lamp' || t === cur || OWN_TABS.includes(t));   // 11/9：家人島還沒開那個分頁（例如 FAM_B1 關著時的 1F、碼頭）就不畫那格，免得按了被擋回島上（own_buttons）
    return `<div class="floors">${f2.map(([t, n, ic, name]) => t === 'lamp' ? `<button disabled><small>${n}</small><span class="fi">${ic} </span>${name}<small>整理中</small></button>`
      : `<button class="${cur === t ? 'on' : ''}" ${cur === t ? 'disabled' : `onclick="go('${t}');window.scrollTo(0,0)"`}><small>${n}</small><span class="fi">${ic} </span>${name}</button>`).join('')}</div>`;
  }
  // 這週（週一到今天）完成幾次、碼頭上放了幾艘船：只算這位家人自己的存檔
  function famLightWeek() {
    const wk = mondayOf(S.today), wd = weekData(wk);
    return { done: Object.values(wd.done).reduce((a, b) => a + b, 0), boats: D.paperSessions.filter(x => x.date >= wk && x.date <= S.today).length };
  }
  // 守燈人的話：事先寫好的句子，只看這週有沒有完成項目、有沒有放船，不提高低、不比較
  const LIGHT_SAY = {
    both: ['這週做了好多事，也記下了心得，燈塔今晚照得特別亮。', '一邊做、一邊想，碼頭上的船都看得到喔。'],
    done: ['這週一件一件做著，燈塔都看在眼裡。想記一句心得的話，碼頭隨時都在。', '做完的事情，燈塔都替你記得。'],
    boats: ['碼頭上有新的船，我會幫你看著。', '寫下來的心得，會一直停在碼頭上。'],
    none: ['燈塔每天晚上都會亮著，慢慢來就好。', '今天也辛苦了，燈塔替你照著路。'] };
  function famLightSay(w) { const l = LIGHT_SAY[w.done && w.boats ? 'both' : w.done ? 'done' : w.boats ? 'boats' : 'none']; return l[daySeed() % l.length]; }
  const viewLight0 = viewLight;
  window.viewLight = function () {
    if (!b1On()) return viewLight0();
    if (!lighthouseName()) {
      const v = draft.lightName != null ? draft.lightName : '';
      return `<div class="card"><div class="big">🗼</div><h2 style="text-align:center">島的岬角上蓋了一座燈塔</h2>
        <div class="muted" style="text-align:center">燈塔每天晚上都會亮著，替你的島照路。先幫燈塔取個名字吧！</div>
        <div class="row" style="gap:6px;margin-top:12px;justify-content:center">${LIGHT_NAMES.map(n => `<button class="ghost" style="padding:6px 12px" onclick="draft.lightName='${n}';render()">${n}</button>`).join('')}</div>
        <label>燈塔的名字（也可以自己取）</label><input id="lhName" maxlength="12" value="${esc(v)}" placeholder="例如：燈塔岬" oninput="draft.lightName=this.value">
        <button style="width:100%;margin-top:12px" onclick="nameLighthouse()">就叫這個名字！</button></div>
        <div class="row"><button class="ghost grow" onclick="go('home')">回到小島 🏝️</button></div>`;
    }
    const kp = keeperOf('lighthouse'), w = famLightWeek(), intro = placeIntro('lighthouse');
    return `${famFloors('light')}<div class="card"><h2>🗼 ${esc(lightTitle())}</h2>
        ${intro || (kp ? `<div class="row" style="flex-wrap:nowrap;cursor:pointer" onclick="openKeeper('lighthouse')"><span style="font-size:32px">${kpPic(kp)}</span>
          <div class="speech grow"><b>${esc(kp.name)}</b>${kp.role ? '（' + esc(kp.role) + '）' : ''}：${esc(famLightSay(w))}</div></div>`
          : `<button class="ghost" style="width:100%" onclick="openKeeper('lighthouse')">🧓 燈塔還沒有守燈人，請一位來守燈吧</button>`)}
        <div class="hud" style="margin-top:10px"><div><b>${w.done}</b><span class="muted">✅ 這週完成</span></div><div><b>${w.boats}</b><span class="muted">⛵ 這週的船</span></div></div></div>
      <div class="card"><div class="row" style="flex-wrap:nowrap"><span style="font-size:28px">⛵</span><div class="grow"><b>燈塔下面的紙船碼頭</b>
          <div class="muted">做完一件事，想記一句心得，就去碼頭放一艘船。</div></div>
        <button onclick="go('paper');window.scrollTo(0,0)">去碼頭</button></div></div>
      ${wordsOn() ? famWordCard() : ''}
      ${langActive() ? famBottleCards() : ''}
      <div class="row"><button class="ghost" onclick="renameLighthouse()">✏️ 改燈塔的名字</button><button class="ghost grow" onclick="go('home')">回到小島 🏝️</button></div>`;
  };
  // 紙船碼頭：做完一件事、想記一句心得就放一艘；沒有錯幾題、錯因、親子船。島幣照她的規則（一天第一艘 🪙2～4、+20 經驗值）
  const viewPaper0 = viewPaper;
  window.viewPaper = function () {
    if (!b1On()) return viewPaper0();
    const live = liveDirs(), f = draft.fpaper || (draft.fpaper = { lanes: [], note: '' });
    f.lanes = f.lanes.filter(l => live.some(d => SLOT[d.slot] === l));
    const used = D.paperSessions.some(x => x.date === S.today), gain = f.lanes.length ? Math.min(PAPER_MAX, 1 + f.lanes.length) : 0;
    const list = D.paperSessions.slice().reverse().slice(0, 20);
    const form = live.length ? `<div class="card">
        <label>這次跟哪幾個方向有關（可以多選）</label>
        <div class="row" style="gap:6px">${live.map(d => { const c = SLOT[d.slot]; return `<button class="${f.lanes.includes(c) ? '' : 'ghost'}" style="padding:6px 10px;font-size:14px" onclick="famPaperLane('${c}')">${esc(d.ic)} ${esc(d.name)}</button>`; }).join('')}</div>
        <label style="margin-top:10px">今天最大的收穫（一句話）</label>
        <input id="famPpNote" value="${esc(f.note)}" maxlength="200" placeholder="例如：早上先走 20 分鐘，下午比較有精神" oninput="draft.fpaper.note=this.value">
        <div class="muted" style="margin-top:10px">${used ? '今天已經放過紙船了，這艘會記下來，但不會再給島幣。' : gain ? `這艘船：🪙 +${gain}、+20 經驗值` : '第一個方向 2 枚島幣，每多一個方向 +1 枚，一次最多 4 枚。'}</div>
        <button style="width:100%;margin-top:10px" id="famPpGo" onclick="famSendPaper()">放船 ⛵</button></div>`
      : `<div class="card"><div class="muted">先到「更多 → 我的方向」訂一個方向，才能放船。</div><button class="ghost" style="width:100%;margin-top:8px" onclick="go('more')">去我的方向</button></div>`;
    return `${famFloors('paper')}<div class="card"><h2>⛵ 紙船碼頭</h2><div class="muted">做完一件事，想記一句心得，就放一艘船。船會停在燈塔下面的小碼頭，在島上只有你自己看得到。</div></div>
      ${form}
      <div class="card"><h3>🌊 碼頭上的船</h3>${list.length ? list.map(x => `<div class="item" style="display:block">
          <div class="row"><b class="grow">⛵ 紙船　${x.lanes.map(dirPill).join('')}</b><span class="muted">${short(x.date)}${x.paid ? '・🪙 +' + x.coins : ''}</span></div>
          <div style="margin-top:4px">💡 ${esc(x.note)}</div></div>`).join('')
        : '<div class="muted">碼頭還空空的，放第一艘船吧！</div>'}</div>
      <div class="row"><button class="ghost" onclick="go('light')">去燈塔 🗼</button><button class="ghost grow" onclick="go('home')">回到小島 🏝️</button></div>`;
  };
  const famPaperKeep = () => { const n = document.getElementById('famPpNote'); if (n) draft.fpaper.note = n.value; };
  window.famPaperLane = function (c) { famPaperKeep(); const f = draft.fpaper; f.lanes = f.lanes.includes(c) ? f.lanes.filter(x => x !== c) : f.lanes.concat([c]); render(); };
  window.famSendPaper = async function () {
    famPaperKeep(); const f = draft.fpaper;
    if (!f.lanes.length) return toast('選一下這次跟哪幾個方向有關');
    if (!f.note.trim()) return toast('寫一句今天最大的收穫');
    document.getElementById('famPpGo').disabled = true;
    const before = D.coins;
    try { await flush(); S = await call('addPaper', f.lanes, f.note); D = derive(S); }
    catch (e) { document.getElementById('famPpGo').disabled = false; return toast('放船失敗：' + (e.message || e)); }
    draft = {}; toast(D.coins > before ? '⛵ 船出發了！🪙 +' + (D.coins - before) : '⛵ 船停進碼頭了'); render(); window.scrollTo(0, 0);
  };
  // 小巷：確認這週頁下面，兩個方向之間的連結（+15 經驗值，兩位島民好感度上升）；少於兩個方向時不出現；一天最多 3 條、同一對不重複
  const viewLinkForm0 = viewLinkForm;
  window.viewLinkForm = function () {
    if (!b1On()) return viewLinkForm0();
    const live = liveDirs(); if (live.length < 2) return '';
    const n = (S.save.links || []).filter(l => l.date === S.today).length;
    const opts = pick => live.map((d, i) => `<option value="${SLOT[d.slot]}"${i === pick ? ' selected' : ''}>${esc(d.ic)} ${esc(d.name)}</option>`).join('');
    return `<div class="card" id="famLink"><h3>🔗 發現兩個方向的連結（選填）</h3>
      <div class="muted">例如「外語 × 健康：走路的時候聽外語 podcast」。每發現一條 +15 經驗值，兩位島民好感度上升。</div>
      ${n >= 3 ? '<div class="muted" style="margin-top:8px">今天已經記了 3 條連結，明天再來吧。</div>' : `<div class="row" style="margin-top:8px"><select id="famLa" class="grow">${opts(0)}</select><span>×</span><select id="famLb" class="grow">${opts(1)}</select></div>
      <label>它們怎麼連在一起？</label><input id="famLn" maxlength="100" placeholder="一句話就好">
      <div style="margin-top:8px"><button class="ghost" id="famAddLink" onclick="famAddLink()">記下這條連結</button></div>`}</div>`;
  };
  window.famAddLink = async function () {
    const $ = id => document.getElementById(id), a = $('famLa').value, b = $('famLb').value, note = $('famLn').value.trim();
    if (a === b) return toast('選兩個不同的方向喔');
    if ((S.save.links || []).some(l => (l.a === a && l.b === b) || (l.a === b && l.b === a))) return toast('這兩個方向已經連過了');
    if (!note) return toast('寫一句話說明它們怎麼連在一起');
    if ($('note')) draft.note = $('note').value;
    $('famAddLink').disabled = true;
    try { S = await call('saveLink', { a, b, note }); D = derive(S); }
    catch (e) { $('famAddLink').disabled = false; return toast('沒有存到：' + (e.message || e)); }
    toast(resident(a).name + ' 和 ' + resident(b).name + ' 的好感度上升了！'); render();
  };
  // ---------- FAM_LANG_A 語言先行：答錯的單字變瓶子（模組規格串，11/19）；P3 時整段登記進 lang／review，只搬家不改資料 ----------
  const LANG_DAY = 10;   // 一天最多漂回幾個（後端 FamLang.gs 的 FAM_LANG_DAY）
  const langCanOn = () => !!(S && S.langOk) && wordsOn();
  const langActive = () => langCanOn() && !!(S.save.lang_on && S.save.lang_on.on === true);
  let langReady = false, langAuto = false;
  function langOpen() {
    if (!langCanOn()) return;
    ['setLangOn', 'reviewLangBottle'].forEach(f => { if (OWN_FNS.indexOf(f) < 0) OWN_FNS.push(f); });
    // 預設開（爸爸 11/4：功能隨包上線就預設開放）：還沒設過的人，第一次進家人島自動打開一次（順便補瓶子）。工程顧問 11/4 五個條件：
    // 只在自己的島（ownMode）且 FAM_LANG 開著（langCanOn 已含 S.langOk）；狀態拿到了、lang_on 確定是 undefined 才叫；一次開 App 只叫一次；
    // 失敗不跳 toast、不擋畫面、這次開 App 不重試（下次開再試）；存成 on:false 的人永遠不會被改回開
    if (!langAuto && typeof ownMode === 'function' && ownMode() && S.save && S.save.lang_on === undefined) { langAuto = true;
      call('setLangOn', true).then(st => { S = st; D = derive(S); render(); }).catch(() => {}); }
    if (langReady || !langActive()) return; langReady = true;
    PLACES.lighthouse = Object.assign({}, PLACES.lighthouse, { about: PLACES.lighthouse.about.concat(['單字練習答錯的字會變成瓶子，漂到海灘；過幾天漂回來再練一次，答對三次就變成一盞燈籠']) });
    VISIT_NO.push('瓶子和燈籠');
  }
  // 自己的語言瓶子：pq: 裡 src 是 word、有四個選項的（她的島不會跑到這裡：family.js 只在家人島載入）
  function langBottles() {
    return Object.keys(S.save).filter(k => /^pq:\d+$/.test(k) && S.save[k] && S.save[k].src === 'word' && Array.isArray(S.save[k].o) && S.save[k].o.length === 4).sort()
      .map(k => { const b = S.save[k], rv = S.save['rv:' + k] || {};
        return { id: k, b, rv, lantern: rv.lantern || null, due: reviewDue(rv, b.at || b.date), today: (rv.tries || []).some(t => t.at === S.today) }; });
  }
  function langToday() {
    const all = langBottles(), done = all.filter(x => x.today).length;
    const due = all.filter(x => !x.today && x.due && x.due <= S.today).sort((a, b) => (!!a.lantern - !!b.lantern) || a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
    return { all, done, list: due.slice(0, Math.max(0, LANG_DAY - done)) };
  }
  // 常卡住的字：單字卡裡答錯兩次以上的字，只列字（不列錯幾次，工程顧問 11/2 條件 3）
  function langStuck() {
    const out = [];
    Object.keys(S.save).filter(k => /^vw:\d+$/.test(k)).sort().forEach(k => ((S.save[k] && S.save[k].words) || []).forEach(w => { if ((w.n || 0) - (w.ok || 0) >= 2 && out.indexOf(w.w) < 0) out.push(w.w); }));
    return out.slice(0, 20);
  }
  const langMark = l => l === 'ja' ? '<span class="lmk" style="background:#9a3567">あ</span>' : '<span class="lmk" style="background:#3d6694">A</span>';
  window.famBottleCards = function () {
    const t = langToday(), st = langStuck(), lan = t.all.filter(x => x.lantern).length;
    const step = x => x.lantern ? '老朋友回來打招呼' : '第 ' + ((x.rv.tries || []).filter(y => !y.friend).length + 1) + ' 次漂回' + (reviewStreak(x.rv) === LANTERN_AT - 1 ? '・答對就變燈籠' : '');
    return `<style>.lmk{display:inline-flex;width:18px;height:18px;border-radius:5px;color:#fff;font-weight:700;font-size:11px;align-items:center;justify-content:center;vertical-align:-3px;margin-right:4px}</style>
      <div class="card" id="langBottles"><h3>🍶 今天漂回來的瓶子</h3>
      ${t.list.length ? t.list.map((x, n) => `<div class="row" style="flex-wrap:nowrap;padding:8px 0;border-bottom:1px dashed var(--plum-light)"><div class="grow"><div style="font-size:16px">${esc(x.b.word)}</div>
          <div class="muted">${langMark(x.b.lang)}${step(x)}</div></div><button${n ? ' class="ghost"' : ''} onclick="langGo('${x.id}')">練一下</button></div>`).join('')
        : `<div class="muted">${t.done ? '今天漂回來的都練完了，明天再來看看海灘。' : '今天沒有瓶子漂回來。單字練習答錯的字，過一天會漂回這裡。'}</div>`}
      <div class="muted" style="margin-top:6px">一天最多漂回 ${LANG_DAY} 個，其他的會在海上慢慢漂，不會不見。${lan ? '已經有 ' + lan + ' 盞燈籠了。' : ''}</div></div>
      ${st.length ? `<div class="card"><h3>常卡住的字</h3><div class="muted">答錯兩次以上的字。多看幾眼就好，不用一次記住。</div>
        <div class="row" style="gap:6px;margin-top:6px">${st.map(w => `<span class="pill">${esc(w)}</span>`).join('')}</div></div>` : ''}`;
  };
  window.langGo = function (id) { draft = { lb: id, lbOrder: [0, 1, 2, 3].sort(() => Math.random() - 0.5) }; render(); window.scrollTo(0, 0); };
  const viewLightLang0 = window.viewLight;
  window.viewLight = function () {
    if (langActive() && draft && draft.lb) return viewLangBottle();
    const h = viewLightLang0();   // 有瓶子要練時，一頁只留一顆實心（美術 11/2）：去碼頭改淡底
    return langActive() && langToday().list.length ? h.replace(`<button onclick="go('paper');window.scrollTo(0,0)">去碼頭</button>`, `<button class="ghost" onclick="go('paper');window.scrollTo(0,0)">去碼頭</button>`) : h;
  };
  window.viewLangBottle = function () {
    const id = draft.lb, b = id && S.save[id];
    if (!langActive() || !b) return `<div class="card"><div class="muted">這個瓶子不在海灘上了。</div></div><div class="row"><button class="ghost grow" onclick="draft={};render()">回到海灘 🌊</button></div>`;
    const ord = draft.lbOrder || [0, 1, 2, 3], r = draft.lbRes;
    return `<div class="card"><h2>🍶 ${esc(b.word)}</h2><div style="margin:8px 0 12px">${esc(b.q)}</div>
      ${ord.map(i => { const mine = r && r.choice === i, right = r && i === r.a, base = 'display:block;width:100%;text-align:left;margin-bottom:8px';
        if (!r) return `<button class="ghost" style="${base}" onclick="langAnswer(${i})">${esc(b.o[i])}</button>`;
        // 答完（美術 11/2）：不用 disabled 淡化；正確＝完成色＋2px 框＋✓，選錯的＝生成り底鼠色字＋「你選的」，其他同底不加框；不用紅色
        const st = right ? 'background:#e5efe0;color:#2f5a3a;border:2px solid #2f5a3a' : 'background:#f7f1e5;color:#5f5a55;border:2px solid transparent';
        return `<button aria-disabled="true" tabindex="-1" style="${base};pointer-events:none;${st}">${right ? '✓ ' : ''}${esc(b.o[i])}${mine && !right ? ' <small style="font-size:12px">你選的</small>' : ''}</button>`; }).join('')}
      ${r ? `<div class="speech" style="margin-top:8px">${r.ok ? (r.lantern ? '答對三次，這個字變成一盞燈籠了。過一陣子它會以老朋友的身分回來打招呼。' : '答對了！過幾天它會再漂回來一次。') : '這次沒想起來也沒關係，明天它會再漂回來。'}</div>
        ${b.ex ? `<div class="muted" style="margin-top:8px">${esc(b.ex)}</div>` : ''}` : ''}</div>
      <div class="row"><button class="ghost grow" onclick="draft={};render();window.scrollTo(0,0)">回到海灘 🌊</button></div>`;
  };
  window.langAnswer = function (i) {
    const id = draft.lb;
    call('reviewLangBottle', id, i).then(res => {
      const rv = Object.assign({ tries: [] }, S.save['rv:' + id] || {}); rv.tries = (rv.tries || []).concat([Object.assign({ at: S.today, ok: res.ok }, rv.lantern ? { friend: true } : {})]);
      if (res.lantern) rv.lantern = S.today;
      S.save['rv:' + id] = rv; draft.lbRes = { choice: i, a: res.a, ok: res.ok, lantern: res.lantern }; render();
    }).catch(e => toast(e.message || String(e)));
  };
  window.famLangRow = function () {
    const on = langActive();
    return `<div class="row" style="flex-wrap:nowrap;margin-top:10px"><div class="grow"><b>🍶 答錯的字變成瓶子</b><div class="muted">打開以後，單字練習答錯的字會漂到燈塔海灘，過幾天漂回來再練一次。在 App 裡只有你自己看得到，其他家人都看不到。關掉時瓶子和燈籠都留著。</div></div>
      <button class="ghost" onclick="famLangSet(${on ? 'false' : 'true'})">${on ? '✅ 開著' : '⬜ 關著'}</button></div>`;
  };
  window.famLangSet = async function (on) {
    if (on && !(S.save.lang_on && S.save.lang_on.bf)) toast('整理中…');   // 第一次打開要補瓶子，會等幾秒（工程顧問 11/2）
    try { await flush(); S = await call('setLangOn', on); D = derive(S); } catch (e) { return toast('沒有存到：' + (e.message || e)); }   // 回來的是整份狀態（第一次打開會補瓶子）
    const n = langBottles().length;
    toast(on ? (n ? '🍶 打開了，之前答錯的字也變成瓶子了，會陸續漂回海灘' : '🍶 打開了，答錯的字之後會漂到燈塔海灘') : '關掉了，瓶子和燈籠都留著'); render();
  };
  // ---------- 單字出題（11/13 簡化版）：FAM_WORDS 開了、燈塔也有了才出現；她的 viewWords 一字不動 ----------
  const wordsOn = () => !!(S && S.wordsOk) && b1On();
  let wordsReady = false;
  function wordsOpen() {
    if (wordsReady || !wordsOn()) return; wordsReady = true;
    OWN_TABS.push('words'); KEEP_PLACE.push('words');
    ['scanWords', 'saveWords', 'delWords', 'wordQuest', 'answerWord', 'agreeWords'].forEach(f => { if (OWN_FNS.indexOf(f) < 0) OWN_FNS.push(f); });
    PLACES.lighthouse = Object.assign({}, PLACES.lighthouse, { about: PLACES.lighthouse.about.concat(['燈塔一樓可以拍單字出題：要背的英文、日文單字拍下來或打字，AI 照你選的程度出題給你練']) });
    VISIT_NO.push('單字卡和練習的結果');
  }
  // 程度：每組單字卡自己選；新的一組的程度按鈕分英文、日文兩行，按鈕只寫「一般／學測／多益」「N5～N1」（美術 10/29），存了就不換（後端 FamWords.gs 的 FAM_WORD_LV）
  const WORD_LV = [['en-gen', '英文・一般'], ['en-gsat', '英文・學測'], ['en-toeic', '英文・多益'], ['ja-n5', '日文・N5'], ['ja-n4', '日文・N4'], ['ja-n3', '日文・N3'], ['ja-n2', '日文・N2'], ['ja-n1', '日文・N1']];
  const lvName = lv => (WORD_LV.find(x => x[0] === lv) || [0, ''])[1];
  const lvJa = lv => /^ja-/.test(String(lv));
  const famAiDay = () => (S && Number(S.wordsAiDay)) || 5;   // 家人 AI 每人每天幾次（後端 FAM_AI_DAY，和其他 AI 功能共用；「怎麼玩？」的說明在載入時算，用預設的 5）
  const famWordAi = () => Math.max(0, Number(S.wordsAi) || 0);   // 今天還能叫幾次 AI（後端算，和智慧島共用）
  // FAMWORDS_COPY_191：文案審查 191 改字（明天會恢復、資料存在哪裡）
  const FAM_WORD_HOW = '拍課本、講義、單字表或書上<b>印刷</b>的英文或日文單字，或直接打字，存成單字卡；每組自己選程度（英文：一般、學測、多益；日文：N5～N1）。按「出 5 題」，AI 照這個程度出題，之前沒答對、還沒練過的字會先出。一天最多 ' + WORD_Q_DAILY + ' 題，答一題 +2 經驗值（一天最多 ' + WORD_XP_DAILY + '），不換島幣。AI 次數和其他 AI 功能（智慧島老師的回話、拍手寫計畫、島民的信）共用，一天 ' + famAiDay() + ' 次：拍一張算 1 次，出一組算 1 次。App 不留照片；單字卡和練習的結果存在 App 管理員的試算表，管理員技術上打得開；其他家人都看不到。請不要拍有個人資料或公司資料的東西。';
  function famWordToday() {
    const all = wordQuizzes();
    return { made: all.filter(q => q.date === S.today).reduce((a, q) => a + (q.items || []).length, 0),
      xp: all.reduce((a, q) => a + (q.items || []).filter(x => x.at === S.today).reduce((b, x) => b + (x.xp || 0), 0), 0),
      open: all.find(q => !q.done) || null, last: all[all.length - 1] || null, ai: famWordAi() };
  }
  // 擋下的原因（工程顧問 10/29 條件 6：每一種都要在畫面上說明）
  function famWordBlocked(t) {
    return t.open ? '上一組還沒答完，答完再出新的一組。' : t.made >= WORD_Q_DAILY ? `今天的 ${WORD_Q_DAILY} 題練完了，明天會再開放。`
      : t.ai < 1 ? `今天的 AI 次數用完了（和其他 AI 功能共用，一天 ${famAiDay()} 次），明天會恢復。打字存單字卡不用 AI，現在就可以先存。` : '';
  }
  window.famWordCard = function () {
    const t = famWordToday();
    return `<div class="card"><div class="row" style="flex-wrap:nowrap"><span style="font-size:28px">🔤</span><div class="grow"><b>拍單字出題</b>
        <div class="muted">要背的英文或日文單字拍下來或打字，AI 照你選的程度出題給你練。${t.open ? '有一組還沒答完。' : '今天 ' + t.made + '／' + WORD_Q_DAILY + ' 題。'}</div></div>
      <button class="ghost" style="white-space:nowrap" onclick="go('words');window.scrollTo(0,0)">${t.open ? '繼續練' : '去練'}</button></div></div>`;
  };
  const consentCard = () => `<div class="card" id="fwConsent"><h3>🔒 開始之前</h3>
      <div>你拍的照片和單字卡上的字，會送到 Google 的 AI（Gemini）讀字和出題，不會被拿去訓練 AI；App 不留照片。單字卡和練習的結果存在 App 管理員的試算表，管理員技術上打得開；其他家人都看不到。請不要拍有個人資料或公司資料的東西。</div>
      <div class="muted" style="margin-top:6px">打字存單字卡不用 AI，不同意也可以先存。</div>
      <button style="width:100%;margin-top:10px" id="fwAgree" onclick="famAgreeWords()">我知道了，同意</button></div>`;
  window.famAgreeWords = async function () {
    document.getElementById('fwAgree').disabled = true;
    try { await flush(); S = await call('agreeWords'); D = derive(S); } catch (e) { document.getElementById('fwAgree').disabled = false; return toast('沒有存到：' + (e.message || e)); }
    render();
  };
  window.viewWords = function () {
    if (!wordsOn()) return `<div class="card"><h2>🔤 拍單字出題</h2><div class="muted">單字出題還沒開放。開放以後，燈塔一樓會多一張「拍單字出題」的卡。</div></div>
      <div class="row"><button class="x grow" onclick="go('light')">回燈塔 🗼</button></div>`;
    if (draft.wv) return famWordNew(draft.wv);
    const t = famWordToday(), kp = keeperOf('lighthouse'), sets = wordSets(), agreed = !!S.save.wordOk;
    const show = t.open || (t.last && t.last.done && !t.last.lean && draft.wqShow === t.last.id ? t.last : null);
    const block = famWordBlocked(t);
    const setRow = x => {
      const good = x.words.filter(wordGood).length, open = draft.wsOpen === x.id;
      return `<div class="item" style="flex-wrap:wrap"><div class="name grow"><b>${esc(x.name)}</b> <span class="pill" style="font-size:12px">${esc(lvName(x.lv))}</span><div class="muted">${x.words.length} 個字・練熟 ${good} 個</div>
          <div class="bar" style="margin-top:4px"><i style="width:${Math.round(good / Math.max(1, x.words.length) * 100)}%"></i></div></div>
        ${t.open && t.open.set === x.id ? '<span class="muted" style="padding:6px 4px">練習中…</span>' : agreed ? `<button style="padding:6px 12px" onclick="wordQuestQ('${x.id}')" ${wordBusy || block ? 'disabled' : ''}>出 ${Math.min(5, x.words.length, WORD_Q_DAILY - t.made) || 5} 題</button>` : ''}
        <button class="ghost" style="padding:6px 10px" onclick="draft.wsOpen=draft.wsOpen==='${x.id}'?null:'${x.id}';render()">${open ? '收起' : '看字'}</button>
        ${open ? `<div style="width:100%;margin-top:6px">${x.words.map(w => `<div class="row" style="gap:6px;font-size:14px;padding:3px 0;border-bottom:1px solid #eee"><b class="grow">${esc(w.w)}</b>${sayBtn(w.w, x.lv)}<span class="muted">${esc(w.pos)} ${esc(w.zh)}</span><span class="muted" style="min-width:52px;text-align:right">${w.n ? (wordGood(w) ? '✅ ' : '') + w.ok + '／' + w.n : '還沒練'}</span></div>`).join('')}
          <div class="row" style="margin-top:6px"><button class="ghost" onclick="famEditWords('${x.id}')">✏️ 修改</button><button class="ghost" onclick="famDelWords('${x.id}')">🗑️ 刪掉這組</button></div></div>` : ''}</div>`;
    };
    return `${famFloors('light')}<div class="card"><h2>🔤 拍單字出題</h2>
        ${kp ? `<div class="row" style="flex-wrap:nowrap"><span style="font-size:32px">${kpPic(kp)}</span><div class="speech grow"><b>${esc(kp.name)}</b>：把要背的單字拍給我，或打字給我，我照你選的程度出題給你練。沒答對的字，下次會先出。</div></div>` : ''}
        <div class="hud" style="margin-top:10px"><div><b>${t.made}／${WORD_Q_DAILY}</b><span class="muted">今天的單字題</span></div><div><b>${t.xp}／${WORD_XP_DAILY}</b><span class="muted">今天的經驗值</span></div><div><b>${t.ai} 次</b><span class="muted">今天還能用 AI</span></div></div>
        <details class="muted" style="margin-top:8px;font-size:13px"><summary>怎麼玩？</summary>${FAM_WORD_HOW} ${SAY_HOW}</details>${sayNote(sets)}</div>
      ${agreed ? '' : consentCard()}
      ${show ? famWordQuiz(show) : ''}
      ${wordBusy ? '<div class="card"><div class="muted">✍️ 守燈人正在照你的單字出題…（大約 10～30 秒）</div></div>' : ''}
      <div class="card"><h3>📚 我的單字卡</h3>
        ${agreed && block && !t.open ? `<div style="margin-bottom:6px;color:var(--plum)">⏳ ${block}</div>` : ''}
        ${sets.length ? sets.map(setRow).join('') : '<div class="muted">還沒有單字卡。拍一張單字表，或直接打字，做第一組吧！</div>'}
        <button class="${agreed ? '' : 'ghost'}" style="width:100%;margin-top:10px" onclick="famWordStart()">＋ 新的一組單字卡</button></div>
      <div class="row"><button class="x grow" onclick="go('light')">回燈塔 🗼</button></div>`;
  };
  // 一組題：和她的一樣，只是沒有漂流瓶、題型多一個讀音題
  function famWordQuiz(q) {
    const ABCD = 'ABCD', items = q.items || [], cur = items.findIndex(x => x.choice == null);
    const set = S.save[q.set], right = items.filter(x => x.correct).length, wrong = items.filter(x => x.choice != null && !x.correct).length;
    const lastDone = cur < 0 ? items.length - 1 : cur - 1, ja = lvJa(set && set.lv);
    const kindName = k => ja ? (k === '讀音' ? '漢字読み' : '文脈規定') : k === '片語' ? '片語題' : '字彙題';   // 日文照 JLPT 的題型名稱（文案審查 42）
    const done = (x, i) => `<details class="item" style="display:block" ${i === lastDone ? 'open' : ''}><summary><b>${x.correct ? '⭕' : '❌'} ${esc(x.w)}</b> <span class="pill" style="font-size:12px;${x.correct ? 'background:var(--grass);color:#2e6b34' : 'background:#fbe3dc;color:#b5452b'}">${x.correct ? '答對' : '再練'}</span><span class="muted">・${kindName(x.kind)}</span></summary>
        <div style="margin:6px 0;white-space:pre-wrap">${esc(x.q)}</div>
        <div class="opts">${x.o.map((o, j) => `<button class="opt ${j === x.a ? 'right' : j === x.choice ? 'wrong' : ''}" disabled>(${ABCD.charAt(j)}) ${esc(o)}</button>`).join('')}</div>
        <div class="speech" style="margin-top:6px">${esc(x.ex)}</div>${saySentence(x, set && set.lv)}
        <div class="muted" style="font-size:12px;margin-top:4px">🤖 題目和解說是 AI 照你的單字卡出的，可能會錯；覺得怪怪的就查字典。</div></details>`;
    return `<div class="card" id="wqCard"><h3>🔤 ${esc(set ? set.name : '單字題')}</h3>
        <div class="muted">${q.done ? `這組答完了：答對 ${right}／${items.length} 題。${wrong ? '沒答對的 ' + wrong + ' 個字，下次出題會先出。' : '全部答對！'}` : `第 ${cur + 1}／${items.length} 題・答一題 +2 經驗值`}</div>
        ${items.map((x, i) => x.choice != null ? done(x, i) : i === cur ? `<div style="margin:12px 0 8px;font-weight:700;white-space:pre-wrap">${esc(x.q)}</div>
          <div class="opts">${x.o.map((o, j) => `<button class="opt" onclick="answerWordQ('${q.id}',${i},${j})">(${ABCD.charAt(j)}) ${esc(o)}</button>`).join('')}</div>` : '').join('')}</div>`;
  }
  window.famWordStart = function () {
    const last = wordSets()[0];
    draft.wv = { step: 'pick', name: '', items: [], text: '', lv: (last && last.lv) || 'en-gen' }; render(); window.scrollTo(0, 0);
  };
  window.famDelWords = async function (id) {
    const x = S.save[id]; if (!x || !confirm('刪掉「' + x.name + '」這組單字卡嗎？練習的紀錄也會一起刪掉。')) return;
    try { await flush(); S = await call('delWords', id); D = derive(S); } catch (e) { return toast('刪掉失敗：' + (e.message || e)); }
    draft.wsOpen = null; render();
  };
  window.famEditWords = function (id) {
    const x = S.save[id]; if (!x) return;
    draft.wv = { step: 'review', id, lv: x.lv, name: x.name, items: x.words.map(w => ({ w: w.w, zh: w.zh, pos: w.pos, use: true })) }; render(); window.scrollTo(0, 0);
  };
  // 打字：英文照她的 parseTypedWords；日文一行一個，第一個空白（或逗號、頓號、冒號）前面是字，後面是中文意思
  function famParseTyped(text, lv) {
    if (!lvJa(lv)) return parseTypedWords(text);
    return String(text || '').split(/\n+/).map(l => { const m = l.trim().match(/^([^\s,，、:：;；]+)[\s,，、:：;；]*(.*)$/); if (!m || !/[぀-ヿ㐀-鿿]/.test(m[1])) return null;
      return { w: m[1].slice(0, 30), zh: m[2].trim().slice(0, 20), pos: '', use: true }; }).filter(Boolean).slice(0, 30);
  }
  window.famWordNext = function () {
    const l = famParseTyped(draft.wv.text, draft.wv.lv);
    if (!l.length) return toast(lvJa(draft.wv.lv) ? '還沒讀到日文單字' : '還沒讀到英文單字');
    draft.wv.items = l; draft.wv.step = 'review'; render();
  };
  window.famWordPhoto = async function (input) {
    const file = input.files && input.files[0]; if (!file) return;
    input.value = '';
    try { draft.wv.shot = await shrinkPhoto(file); } catch (e) { return toast(e.message || '讀不到這張照片'); }
    famWordScan();
  };
  window.famWordScan = async function () {
    const w = draft.wv, t0 = Date.now(), photo = w && w.shot; if (!photo) return;
    const tick = () => scanOverlay(`<div class="big">🔍</div><h3 style="text-align:center">守燈人正在讀單字…</h3><div class="muted" style="text-align:center">大約 10 到 40 秒・已經 ${Math.round((Date.now() - t0) / 1000)} 秒</div>`);
    tick(); clearInterval(scanOverlay.t); scanOverlay.t = setInterval(tick, 1000);
    try {
      await flush();
      const res = await Promise.race([call('scanWords', photo, w.lv),
        new Promise((_, bad) => setTimeout(() => bad(new Error('等了 120 秒還沒讀完，可能是網路或 AI 太忙，過一下再拍一次')), 120000))]);
      scanOverlayClose();
      w.items = w.items.concat(res.items.map(x => Object.assign(x, { use: true }))).slice(0, 30); w.shot = null; w.step = 'review';
      S.wordsAi = Math.max(0, famWordAi() - 1);   // 畫面上的次數先減，下次同步會換成後端的數字
      render(); window.scrollTo(0, 0);
    } catch (e) {
      clearInterval(scanOverlay.t);
      scanOverlay(`<div class="big">😵</div><h3 style="text-align:center">這次沒讀出來</h3><div class="muted" style="text-align:center">${esc(e.message || String(e))}</div><div class="row" style="margin-top:12px">${famWordAi() ? '<button class="grow" onclick="scanOverlayClose();famWordScan()">🔁 用同一張再試一次</button>' : ''}<button class="ghost" onclick="scanOverlayClose()">先不用</button></div>`);
    }
  };
  function famWordNew(w) {
    const back = `<div class="row"><button class="x grow" onclick="draft.wv=null;render()">返回</button></div>`, ja = lvJa(w.lv), lang = ja ? '日文' : '英文';
    if (w.step === 'pick') {
      const photo = !S.save.wordOk ? '<div class="muted" style="margin-top:12px">📷 拍照要先回上一頁看過說明、按同意；打字不用。</div>'
        : famWordAi() ? `<label class="btn" style="display:block;text-align:center;margin-top:12px">📷 拍單字表<input type="file" accept="image/*" hidden onchange="famWordPhoto(this)"></label>`
        : `<div class="muted" style="margin-top:12px">⏳ 今天的 AI 次數用完了（和其他 AI 功能共用，一天 ${famAiDay()} 次），明天才能拍照讀字；可以先用打字的。</div>`;
      return `<div class="card"><h2>🔤 新的一組單字卡</h2>
        <label>這組的程度（存了就不能換）</label>
        ${[['en', '英文'], ['ja', '日文']].map(([g, gn]) => `<div class="muted" style="font-size:12px;margin-top:6px">${gn}</div>
        <div class="row" style="gap:6px;flex-wrap:wrap">${WORD_LV.filter(([k]) => k.startsWith(g + '-')).map(([k, n]) => `<button class="${w.lv === k ? '' : 'ghost'}" data-lv="${k}" style="padding:6px 10px;font-size:14px" onclick="draft.wv.lv='${k}';render()">${n.split('・')[1]}</button>`).join('')}</div>`).join('')}
        <div style="margin-top:10px;color:var(--plum)">📖 請拍<b>印刷</b>的內容（課本、講義、單字表、書），不要拍自己寫的字。</div>
        <div class="muted" style="margin-top:6px">AI 只讀印刷的${lang}單字${ja ? '' : '和片語'}，手寫的會略過。App 不留照片，也請不要拍有個人資料或公司資料的東西。一次拍一頁，光線亮一點、字要拍清楚。</div>
        ${photo}
        <label style="margin-top:14px">或直接打字（一行一個，${lang}後面可以寫中文意思）</label>
        <textarea rows="6" placeholder="${ja ? '勉強 讀書&#10;予約 預約&#10;お願いします 拜託' : 'look forward to 期待&#10;reservation 預約&#10;luggage 行李'}" oninput="draft.wv.text=this.value;document.getElementById('wvNext').className=this.value.trim()?'':'ghost'">${esc(w.text || '')}</textarea>
        <button id="wvNext" class="${String(w.text || '').trim() ? '' : 'ghost'}" style="width:100%;margin-top:8px" onclick="famWordNext()">下一步</button></div>${back}`;
    }
    const n = w.items.filter(x => x.use && String(x.w).trim()).length;
    return `<div class="card"><h2>🔤 ${w.id ? '修改單字卡' : '讀到 ' + w.items.length + ' 個字'}</h2>
        <div class="muted">${esc(lvName(w.lv))}・勾選要練的字；讀錯的地方直接改。一組最多 30 個字。</div>
        <label>這組叫什麼？</label><input maxlength="20" value="${esc(w.name)}" placeholder="${ja ? '例如：N4 第 3 課' : '例如：旅行用字'}" oninput="draft.wv.name=this.value"></div>
      <div class="card">${w.items.length ? w.items.map((x, i) => `<div class="row" style="gap:6px;flex-wrap:nowrap;${x.use ? '' : 'opacity:.55'}">
          <input type="checkbox" class="check" ${x.use ? 'checked' : ''} onchange="draft.wv.items[${i}].use=this.checked;render()">
          <input style="flex:3" maxlength="40" value="${esc(x.w)}" oninput="draft.wv.items[${i}].w=this.value">
          <input style="flex:2" maxlength="20" value="${esc(x.zh)}" placeholder="中文意思" oninput="draft.wv.items[${i}].zh=this.value"></div>`).join('')
        : `<div class="muted">照片上沒讀到印刷的${lang}單字。換個角度、拍亮一點再試一次，或改用打字。</div>`}
        ${w.items.length < 30 ? `<button class="ghost" style="margin-top:8px" onclick="draft.wv.items.push({w:'',zh:'',pos:'',use:true});render()">＋ 加一個字</button>` : ''}</div>
      <button id="wvGo" style="width:100%" onclick="famSaveWords()" ${n ? '' : 'disabled'}>存成單字卡（${n} 個字）</button>
      <div class="row" style="margin-top:8px">${w.id ? '' : `<button class="ghost grow" onclick="draft.wv.step='pick';render()">再拍或打字</button>`}<button class="x" onclick="draft.wv=null;render()">取消</button></div>`;
  }
  window.famSaveWords = async function () {
    const w = draft.wv, list = w.items.filter(x => x.use && String(x.w).trim()).map(x => ({ w: x.w, zh: x.zh, pos: x.pos }));
    if (!list.length) return toast('勾一個要練的字');
    document.getElementById('wvGo').disabled = true;
    try { await flush(); S = await call('saveWords', w.id || '', w.name, list, w.lv); D = derive(S); }
    catch (e) { document.getElementById('wvGo').disabled = false; return toast('存檔失敗：' + (e.message || e)); }
    toast(S.save.wordOk ? '📚 存好了，按「出 5 題」開始練' : '📚 存好了。要出題的話，先看過上面的說明、按同意');
    draft = {}; render(); window.scrollTo(0, 0);
  };
  // FAM_NOSTREAK_v1（文案審查 95）：家人島不顯示連續類的字。運動獎勵照累積達標週數解鎖（中間斷掉也算），
  // 完走メダル改成拿到全部運動獎勵就解鎖（家人沒有會考週）；徽章「連續 N 週」改成「累積 N 週」，照有紀錄的週數算
  const derive0ns = derive;
  window.derive = function (st) {
    const d = derive0ns(st);
    if (d && d.exWeeks) { const n = Object.values(d.exWeeks).filter(x => x >= EX_GOAL).length; d.exStreak = n; d.exBest = n; }
    if (d && Array.isArray(d.badges)) d.badges = d.badges.map(b => { const m = /^連續 (\d+) 週$/.exec(b.name || '');
      return m ? Object.assign({}, b, { name: '累積 ' + m[1] + ' 週', ok: (d.recordedWeeks || 0) >= +m[1] }) : b; });
    return d;
  };
  EX_MEDAL.lock = '拿到全部的運動獎勵';
  window.exMedal = () => !!(D && EX_REWARDS.every(r => D.exBest >= r.weeks));
  const furnRewards0ns = furnRewards;
  window.furnRewards = () => furnRewards0ns().split('每週運動 3 天、連續達標就會解鎖，不用島幣。').join('每週運動 3 天就算一週，累積幾週就會解鎖，不用島幣。')
    .replace(/連續 (\d+) 週/g, '累積 $1 週');
  const habitCard0ns = habitCard;
  window.habitCard = () => habitCard0ns().replace(/已經連續 (\d+) 週達標 🔥/, '已經累積 $1 週').replace(/・連續 (\d+) 週可以拿到/, '・累積 $1 週可以拿到')
    .split('一週運動 3 天就達標').join('一週運動 3 天就算一週').split('海邊步道還沒有管理員').join('海邊步道還沒有主人');   // 管理員是 App 管理員的稱呼（文案審查 97）
  // 地方的「管理員」在家人島叫「主人」（文案審查 68、97）；App 管理員不動；不用「他」指主人
  const host = s => s.replace(/(?<!App )管理員/g, '主人').split('。他每天會用自己的個性跟你說話').join('。每天會用自己的個性跟你說話');
  const viewKeeper0ns = viewKeeper, viewKizuna0ns = viewKizuna;
  window.viewKeeper = (...a) => host(viewKeeper0ns(...a));
  window.viewKizuna = (...a) => host(viewKizuna0ns(...a));
  const moveBlock0ns = moveBlock;
  window.moveBlock = (...a) => moveBlock0ns(...a).split('沒帶手機（體育課、校隊）').join('沒帶手機（例如打球、游泳）');
  if (PLACES.walk && PLACES.walk.about) PLACES.walk.about = PLACES.walk.about.map(s => s === '連續幾週都達標，可以拿到排球、浴衣這些運動家具' ? '累積幾週運動 3 天，就可以拿到排球、浴衣這些運動家具' : s);
  const flame = PLANTS.find(x => x.id === 'flame'); if (flame) flame.when = flame.when.split('，會考完、畢業的時候剛好開').join('，畢業季剛好開');
  if (typeof S !== 'undefined' && S) D = derive(S);   // family.js 載入前畫面已經用快取算過一次 D，這裡用家人版重算
  window.FamIsle = { apply, after, cards: OWN_CARDS };
})();

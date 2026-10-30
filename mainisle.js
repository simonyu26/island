/* 會考小島：核心主島的畫面（家人島第二階段 2a）
 * 點她島上（或家人島上）遠海的主島剪影、或「去島上走走」的 ⛰️ 主島，才下載這個檔和 mainisle3d.js。
 * 2a 開的是飛船碼頭（主島浮在海面上空，爸爸 10/27）：搭飛船回自己的島、去她的島、去智慧島；媽祖廟、教會、交易所先掛「準備中」。
 * 2b-2（12/11）開玉山聚會所：家人貼公告、看公告、刪自己貼的；她走進聚會所才看得到，只能看（爸爸 10/27）。
 *   公告只在點聚會所時讀（getBoard），不進她的首頁、看板、郵便受け，沒有紅點、沒有通知。
 * 管理角色用預設的（爸爸 2026-10-26，比照智慧島），每個地方第一次點開先打招呼。
 * 工程顧問條件：去主島沒有任何獎勵；這裡不畫紅點、沒有通知，也不寫任何紀錄（getIsles 只讀）。
 */
(function () {
  const KEEPER = {
    port: { name: 'Solomon', ic: '🎈', role: '飛船碼頭的船長', place: '飛船碼頭',
      intro: '很小就到英國唸書，中文、英文都很好。數理和寫程式是強項，飛船的導航程式是自己寫的。愛玩 Minecraft，笑起來很大聲。',
      first: '嗨！我是 Solomon，這裡是列島的飛船碼頭。主島浮在天上，想回家、想去別的島，跟我說一聲就好。',
      hello: ['飛船都準備好了，要去哪裡？', '導航程式昨天又改了一版，今天飛得更穩，哈哈！', 'Ready when you are！慢慢來，飛船不會跑掉。'] },
    hall: { name: '阿台婆婆', ic: '🏔️', role: '玉山聚會所的管理員', place: '玉山聚會所',
      intro: '以前是中學的輔導老師，退休後上山顧聚會所。做事俐落、愛笑、喜歡運動，口頭禪是「沒事」。',   // 爸爸 10/28 人物設定：她和姐姐的外婆，叫她們「喵呱」
      first: '來坐喔！我是阿台婆婆，以前在中學當輔導老師。這裡是大家貼公告、說說近況的地方，想跟大家說什麼就寫在這裡，家人和她來都看得到。寫錯了刪掉重寫就好，沒事。',
      firstHer: '喵呱來啦！婆婆在這裡顧聚會所。家人想說的話會貼在這裡，有空就上來看看，慢慢看，沒事。',   // 她只能看，不能貼（爸爸 10/27）
      firstGrand: '喵呱來啦！婆婆在這裡顧聚會所。這裡是大家貼公告、說說近況的地方，想說什麼就寫在這裡，寫錯了刪掉重寫就好，沒事。',   // 姐姐
      hello: ['進來坐，山上風大，沒事。', '公告我照日期排好了，來看看。', '以前最喜歡聽下課鐘，現在天天都是下課，哈哈。', '今天早上又爬了一趟山，腳還很有力，哈哈。', '累了喔？坐一下，喝杯茶再走。'] },
    temple: { name: '高姨媽', ic: '🏮', role: '媽祖廟的志工', place: '媽祖廟',
      intro: '從小在廟裡長大，節慶、典故和老街的故事都知道，每天一早掃廟埕、泡一壺茶。很會唱歌仔戲，講話帶一點台語腔。',   // 爸爸 10/28 人物設定：她和姐姐小時候的保母
      first: '哎唷，是你喔！我是姨媽啦。這間廟以後會說媽祖的故事，也會講廟裡節慶和老街的由來。廟還在整理，開門的日子還沒定，到時候再請你進來喝茶。',   // 爸爸 10/28：還沒開門的建物先打招呼；開門日未定
      hello: ['廟埕剛掃好，姨媽唱一段歌仔戲給你聽好不好？', '開門的日子定了就跟你說，再等姨媽一下。', '茶剛泡好，下次開門請你喝。'] },
    church: { name: 'Elisha 牧師', ic: '⛪', role: '教會的牧師', place: '教會',
      intro: '教會大小事都顧，日文很好，笑瞇瞇的，講話很快。',   // 爸爸 10/28 人物設定；口頭禪先不放（宗教中立，爸爸 10/28 同意）
      first: '你好你好，我是 Elisha 牧師！這座教會以後會說聖經裡的故事，也會講教會節期的由來。還在整修，開門的日子還沒定，到時候再請你進來坐坐。',
      hello: ['屋頂快修好了，再等我一下。', '最近在練一首日文歌，開門那天唱給你聽！', '開門的日子定了就跟你說。'] },
    exchange: { name: '阿黛阿嬤', ic: '🧮', role: '交易所的資深行員', place: '交易所',
      intro: '過去在銀行工作很久，現在是交易所的資深行員。隨身帶一把算盤，什麼帳都算得清清楚楚，閒暇時喜歡玩數獨、看股票。',   // 爸爸 10/28 人物設定：她和姐姐的阿嬤，叫她們「喵呱」
      first: '你好，我是阿黛阿嬤。以前在銀行做了很久，現在在交易所當資深行員。這裡以後是練習理財、學記帳的地方，還沒開張，開門的日子還在排，排好了再來找我。',
      firstHer: '喵呱來啦！阿嬤以前在銀行做了很久，現在在交易所當資深行員。這裡以後是練習理財、學記帳的地方，還沒開張，開門的日子還在排，排好了再來找阿嬤。',
      firstGrand: '喵呱來啦！阿嬤以前在銀行做了很久，現在在交易所當資深行員。這裡以後是練習理財、學記帳的地方，還沒開張，開門的日子還在排，排好了再來找阿嬤。',   // 姐姐
      hello: ['算盤先幫你擦亮了。', '今天的數獨解完了，換你來考考我。', '開張的日子定了就告訴你，不急。', '帳記清楚，事情就順。'] }
  };
  const OPEN = { port: true, hall: true, notes: true };
  KEEPER.temple.open = { first: '哎唷，你來了！廟終於整理好了，姨媽泡了一壺茶。這間廟的故事、節慶和老街的由來，都寫在下面，慢慢看，看累了喝茶。',
    hello: ['廟埕剛掃好，坐一下。', '今天想聽哪一段？姨媽講給你聽。', '下次唱一段歌仔戲給你聽好不好？'] };
  KEEPER.church.open = { first: '你好你好！教會整修好了，歡迎進來坐坐。教會的歷史、節期和這棟建築的故事，都寫在下面，慢慢看。',
    hello: ['進來坐，外面風大。', '今天想聽哪一段？我講話快，聽不清楚就叫我慢一點。', '最近練的那首日文歌，下次唱給你聽！'] };
  KEEPER.temple.face = '👵'; KEEPER.church.face = '🧑'; KEEPER.temple.ic = KEEPER.church.ic = '';   // 兩位的頭像都用人，對等（美術 10/30）；地方的圖示 ic 照舊   // notes：聚會所裡的山海筆記
  // 玉山山頂的節氣小卡（爸爸 10/28）：阿台婆婆說今天的節氣，配一則跟會考自然、社會有關的小知識；只在點聚會所時顯示，不推、不給獎勵
  const SUMMIT_FACT = {
    立春: '節氣是照太陽在天上走的位置訂的，每走 15 度換一個，所以國曆日期每年都差不多。',
    雨水: '這時鋒面一波波經過，北部常下毛毛雨。鋒面就是冷、暖兩團空氣碰在一起的交界。',
    驚蟄: '古人說春雷把蟲叫醒，其實是氣溫回升，昆蟲結束冬天的休眠。',
    春分: '太陽直射赤道，全世界白天和晚上幾乎一樣長。',
    清明: '清明是二十四節氣裡唯一的國定假日，也就是民族掃墓節，很多人家這時去掃墓。',
    穀雨: '雨水變多，對稻作很重要。臺灣一年可以種兩期稻，第一期大約冬末到春天插秧。',
    立夏: '太陽直射的位置一天天往北回歸線移動，所以北半球白天越來越長。',
    小滿: '臺灣進入梅雨季。冷、暖空氣勢力差不多，鋒面停住不動，就成了滯留鋒面，帶來連續的雨。',
    芒種: '「芒」是稻穗、麥穗上的細毛。梅雨帶來的雨，是臺灣夏天重要的水源。',
    夏至: '太陽直射北回歸線，北半球白天最長。嘉義和花蓮都有北回歸線的標誌。',
    小暑: '夏天午後常有雷陣雨：地面曬熱，空氣上升、冷卻，水氣凝結成雲，再下成雨。',
    大暑: '一年最熱的時候，也是颱風多的時候。北半球的颱風是逆時針旋轉的。',
    立秋: '暑氣還沒退。颱風中心的颱風眼風小、雨停，眼過了以後風雨又會變大。',
    處暑: '「處」是停止的意思，暑氣慢慢退了。',
    白露: '晚上氣溫下降，空氣裡的水氣碰到冷的草葉，凝結成小水珠，就是露。',
    秋分: '太陽又直射赤道，白天和晚上又差不多一樣長。',
    寒露: '東北季風開始吹。宜蘭、基隆在迎風面，秋冬特別多雨。',
    霜降: '地面冷到 0°C 以下時，空氣裡的水氣不經過液態，直接變成冰晶，結出來的就是霜。',
    立冬: '冬天開始了。很多人家會「補冬」，吃熱熱的食物補身體。',
    小雪: '臺灣平地不下雪，高山偶爾會。越往高處越冷，大約每升高 100 公尺，氣溫降 0.6°C。',
    大雪: '東北季風南下，北部又濕又冷，南部卻比較乾，因為中央山脈把水氣擋住了。',
    冬至: '太陽直射南回歸線，北半球白天最短。這天很多人家吃湯圓。',
    小寒: '寒流來的時候，是很冷的大陸冷氣團從北方南下。',
    大寒: '春節常在大寒前後。農曆的月份跟著月亮的圓缺走，節氣則跟著太陽走。'
  };
  // 飛船碼頭的「今天的世界遺產」（爸爸 10/28：Solomon 打招呼帶一則世界各國的小知識，世界遺產優先、帶照片）：照日期輪流，一天一處；只在點碼頭時顯示，不推、不給獎勵
  // 照片放 wh/<i>.webp，wh/credits.json 記來源、攝影者、授權（工程顧問 10/28：只用公有領域、CC BY、CC BY-SA）；沒有照片時只顯示文字
  const WORLD_SITE = [
    { n: '泰姬瑪哈陵', c: '印度', f: '蒙兀兒皇帝沙賈汗為了紀念過世的妻子蓋的，整座用白色大理石，顏色會跟著早晚的光線變化。' },
    { n: '萬里長城', c: '中國', f: '長城不是一道牆，是好幾個朝代分段修築的防禦工程，各段並不全部相連。從太空用肉眼其實看不到。' },
    { n: '吳哥', c: '柬埔寨', f: '吳哥窟是世界上最大的宗教建築群之一，正門朝西。春分、秋分的早上，太陽會從中央塔頂升起。' },
    { n: '馬丘比丘', c: '秘魯', f: '印加人把城蓋在海拔約 2,400 公尺的山脊上。石塊不用灰泥，切得剛好密合，連刀片都插不進去。' },
    { n: '佩特拉', c: '約旦', f: '整座城的建築是直接從紅色砂岩山壁雕出來的，進城要先走過一條又窄又長的峽谷。' },
    { n: '大堡礁', c: '澳洲', f: '世界上最大的珊瑚礁，綿延超過 2,000 公里。珊瑚看起來像石頭，其實是很小的動物。' },
    { n: '加拉巴哥群島', c: '厄瓜多', f: '達爾文來過這裡，發現各島雀鳥的嘴形不一樣，成了他思考演化的重要線索。' },
    { n: '黃石國家公園', c: '美國', f: '1872 年成立，是世界上第一座國家公園。地底下有大量岩漿，所以有很多間歇泉和溫泉。' },
    { n: '吉薩金字塔', c: '埃及', f: '古夫金字塔大約 4,500 年前完成，之後將近 3,800 年都是世界上最高的人造建築。' },
    { n: '羅馬歷史中心', c: '義大利', f: '羅馬競技場大約可以坐 5 萬人，上面還能拉起遮陽的大布篷，有點像今天的巨蛋。' },
    { n: '雅典衛城', c: '希臘', f: '帕德嫩神廟看起來筆直，其實柱子微微向內傾、中段稍粗，一般認為是為了讓眼睛看起來更直。' },
    { n: '富士山', c: '日本', f: '富士山登錄的是「文化遺產」，不是自然遺產，因為它在日本的信仰和浮世繪裡都很重要。' },
    { n: '古都京都', c: '日本', f: '京都在 794 年成為首都，之後一千多年都是天皇住的地方，寺廟和庭園留下來很多。' },
    { n: '昌德宮', c: '韓國', f: '朝鮮王朝的宮殿，順著山勢來蓋，不硬把地剷平。後面的庭園幾乎保留了原本的樹林。' },
    { n: '下龍灣', c: '越南', f: '海上有一千多座石灰岩島和石柱，是石灰岩經過很長時間被雨水和海水侵蝕形成的。' },
    { n: '婆羅浮屠', c: '印尼', f: '大約 1,200 年前用火山岩一層層堆成，牆上刻了兩千多幅浮雕，像一本石頭做的故事書。' },
    { n: '薩加瑪塔國家公園', c: '尼泊爾', f: '聖母峰就在這裡，高 8,848 公尺。印度板塊一直往北擠進歐亞板塊，喜馬拉雅山到現在還在慢慢變高。' },
    { n: '塞倫蓋提國家公園', c: '坦尚尼亞', f: '每年有上百萬隻角馬跟著雨季和青草移動，繞一大圈，是地球上最壯觀的動物大遷徙之一。' },
    { n: '維多利亞瀑布', c: '尚比亞、辛巴威', f: '當地的名字意思是「會打雷的煙」：水氣遠遠就看得到，轟隆聲遠遠就聽得到。' },
    { n: '巨石陣', c: '英國', f: '大約 4,500 年前就排好了。夏至的早上，太陽會從特定的石頭方向升起。' },
    { n: '凡爾賽宮', c: '法國', f: '宮裡的鏡廳有 357 面鏡子。在那個年代，鏡子非常昂貴，這是在炫耀國力。' },
    { n: '威尼斯', c: '義大利', f: '整座城蓋在一百多個小島上，房子底下是打進泥地裡的木樁。城裡用船代替車。' },
    { n: '挪威峽灣', c: '挪威', f: '峽灣是冰河把山谷刨得又深又陡，冰融化後海水灌進來形成的。' },
    { n: '伊瓜蘇國家公園', c: '阿根廷、巴西', f: '由兩百多道瀑布組成，寬將近 3 公里，站在旁邊講話都要用喊的。' },
    { n: '拉帕努伊國家公園', c: '智利', f: '復活節島上有近千尊巨大的摩艾石像，大多背對大海、面向村落。' },
    { n: '大峽谷國家公園', c: '美國', f: '科羅拉多河花了幾百萬年切出這道峽谷。岩壁一層一層，像一本攤開的地球歷史課本。' },
    { n: '烏魯魯－卡塔丘塔國家公園', c: '澳洲', f: '烏魯魯是一整塊巨大的砂岩，日出和日落時顏色會從橘色變成深紅。這裡是原住民阿南古族的聖地，2019 年起禁止攀爬。' },
    { n: '東加里羅國家公園', c: '紐西蘭', f: '毛利人把這裡的火山當成祖先。它是第一個以「文化景觀」登錄的世界遺產。' },
    { n: '布拉格歷史中心', c: '捷克', f: '舊城廣場的天文鐘從 1410 年開始運轉，是世界上還在走的最古老天文鐘之一。' },
    { n: '伊斯坦堡歷史區', c: '土耳其', f: '這座城橫跨歐洲和亞洲，中間隔著博斯普魯斯海峽，搭船幾分鐘就能換一洲。' }
  ];
  let whCredits = null;
  function worldIdx() {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S && S.today || '');
    const d = m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : Date.now();
    return Math.floor(d / 86400000) % WORLD_SITE.length;
  }
  function worldHtml() {
    const i = worldIdx(), w = WORLD_SITE[i], c = whCredits && whCredits[i];
    const img = c ? `<img src="wh/${i}.webp" alt="${esc(w.n)}" loading="lazy" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;margin-top:6px;display:block">
      <div class="muted" style="font-size:11px;margin-top:2px">照片：${esc(c.author)}／<a href="${esc(c.licenseUrl)}" target="_blank" rel="noopener">${esc(c.license)}</a>，<a href="${esc(c.src)}" target="_blank" rel="noopener">來源</a></div>` : '';
    return `<div style="margin-top:10px;padding:10px 12px;border-radius:14px;background:#f3f7fb"><b>🌍 今天的世界遺產・${esc(w.n)}（${esc(w.c)}）</b>${img}
      <div style="margin-top:4px">${esc(w.f)}</div></div>`;
  }
  function loadCredits() {
    if (whCredits) return;
    fetch('wh/credits.json').then(r => r.ok ? r.json() : null).then(j => { if (Array.isArray(j)) { whCredits = j; if (info && info.key === 'port') paintInfo(); } }).catch(() => {});   // 讀到時碼頭卡片已經打開，就補上照片
  }
  function summitHtml() {
    const t = typeof solarTerm === 'function' && S && S.today ? solarTerm(S.today) : '', f = SUMMIT_FACT[t];
    if (!f) return '';
    return `<div style="margin-top:10px;padding:10px 12px;border-radius:14px;background:#f3f7fb"><b>${typeof termIcon === 'function' ? termIcon(t) : '🏔️'} 山頂的節氣・${esc(t)}</b>
      <div style="margin-top:4px">${esc(f)}</div></div>`;
  }
  // ---------- 山海筆記（工程待辦 149，爸爸 10/30 動工）：聚會所節氣卡下面，點「打開」才下載 notes/shanhai.json ----------
  // 不記錄、不加島幣、不推送，她和家人看同一份；今天的推薦只是排在最前面，不跳出來
  const notesOn = () => !!(OPEN.notes && OPEN.hall);   // 自己的開關（爸爸 10/30：山海筆記先開，不等廟和教會）
  // 三本書（山海筆記、廟埕的故事、教會的故事）共用：data 點了才下載；nb：null 收起、{ u: -1 } 單元列表、{ u, c } 第 u 單元第 c 張（只放記憶體，不存）
  const BOOK = { shanhai: { file: 'notes/shanhai.json', name: '📚 山海筆記', lead: '用台灣的山、海和天氣，說說課本裡的觀念。', id: 'miNotes' },
    temple: { file: 'notes/temple.json', name: '廟埕的故事', lead: '這裡的歷史、文化和節期，對到課本裡的觀念。', id: 'miStory' },   // 廟和教會兩邊的字級、版面、按鈕完全一樣，標題不放 emoji（美術 10/30）
    church: { file: 'notes/church.json', name: '教會的故事', lead: '這裡的歷史、文化和節期，對到課本裡的觀念。', id: 'miStory' } };
  const bookOn = b => b === 'shanhai' ? notesOn() : !!OPEN[b];
  function moonAge(day) {   // 月齡（天）：從 2000-01-06 18:14 UTC 的新月往後推，取台北中午
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day || ''); if (!m) return null;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3], 4) - Date.UTC(2000, 0, 6, 18, 14), syn = 29.530589;
    return ((t / 86400000) % syn + syn) % syn;
  }
  function notesPick(day, units) {   // 新月、滿月前後 1.5 天推「大潮和小潮」；6～10 月颱風季推颱風；其他時候全部卡片依日期輪
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day || ''); if (!m || !units.length) return { u: 0, c: 0 };
    const n = Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000), a = moonAge(day), ix = k => units.findIndex(x => x.key === k);
    const tide = ix('tide'), ty = ix('typhoon');
    if (tide >= 0 && (a < 1.5 || a > 29.530589 - 1.5 || Math.abs(a - 14.765) < 1.5)) return { u: tide, c: Math.min(2, units[tide].cards.length - 1) };   // 潮汐第 3 張是大潮和小潮
    if (ty >= 0 && +m[2] >= 6 && +m[2] <= 10) return { u: ty, c: n % units[ty].cards.length };
    const all = []; units.forEach((x, u) => x.cards.forEach((_, c) => all.push({ u, c })));
    return all[n % all.length];
  }
  function festPick(day, B) {   // 節期前後先推那一張（媽祖生日、聖誕節、復活節）；日期表在 JSON 裡，農曆和復活節不在 App 裡算
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day || ''), dn = (y, mo, d) => Math.floor(Date.UTC(y, mo - 1, d) / 86400000); if (!m || !Array.isArray(B.fest)) return 0;
    const n = dn(+m[1], +m[2], +m[3]);
    return B.fest.some(f => { const q = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f[0]); return q && Math.abs(n - dn(+q[1], +q[2], +q[3])) <= f[1]; }) ? B.festCard || 0 : 0;
  }
  window.mainBook = function (b, u, c) {
    const B = BOOK[b]; if (!B) return;
    B.nb = u == null ? null : { u, c: c || 0 };
    if (B.nb && !B.data && !B.busy) {
      B.busy = true;
      fetch(B.file).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(j => { B.data = j && Array.isArray(j.units) ? j : null; if (!B.data) throw 0; })
        .catch(() => { B.nb = null; toast((b === 'shanhai' ? '山海筆記' : B.name) + '讀不到，等一下再試'); }).then(() => { B.busy = false; paintInfo(); });
    }
    paintInfo();
  };
  window.mainNotes = (u, c) => mainBook('shanhai', u, c);
  function bookHtml(b) {
    const B = BOOK[b]; if (!bookOn(b)) return '';
    const box = s => `<div id="${B.id}" style="margin-top:10px;padding:10px 12px;border-radius:14px;background:#f3f7fb">${s}</div>`, one = b !== 'shanhai', nb = B.nb;
    if (!nb) return box(`<div class="row"><b class="grow">${B.name}</b><button class="ghost" onclick="${one ? `mainBook('${b}',0,-1)` : 'mainNotes(-1)'}">打開</button></div>
      <div class="muted" style="margin-top:2px">${B.lead}</div>`);
    if (!B.data) return box(`<b>${B.name}</b><div class="muted" style="margin-top:4px">讀${one ? '故事' : '筆記'}中…</div>`);
    const U = B.data.units;
    if (one && nb.c < 0) nb.c = festPick(S && S.today, B.data);   // 廟、教會只有一個單元：打開就是卡片，節期前後從那一張開始
    if (!one && (nb.u < 0 || !U[nb.u])) {
      const p = notesPick(S && S.today, U), pu = U[p.u];
      return box(`<div class="row"><b class="grow">📚 山海筆記</b><button class="ghost" onclick="mainNotes()">收起</button></div>
        <div class="muted" style="margin-top:6px">今天的推薦</div><button style="margin-top:4px" onclick="mainNotes(${p.u},${p.c})">${pu.ic} ${esc(pu.title)}・${esc(pu.cards[p.c].t)}</button>
        <div class="muted" style="margin-top:10px">全部單元</div>${U.map((x, u) => `<button class="ghost" style="margin:4px 4px 0 0" onclick="mainNotes(${u},0)">${x.ic} ${esc(x.title)}（${x.cards.length}）</button>`).join('')}`);
    }
    const x = U[one ? 0 : nb.u], c = Math.max(0, Math.min(nb.c, x.cards.length - 1)), k = x.cards[c], last = c === x.cards.length - 1;
    const go = (cc, label, off) => `<button class="ghost" onclick="${one ? `mainBook('${b}',0,${cc})` : `mainNotes(${nb.u},${cc})`}"${off ? ' disabled' : ''}>${label}</button>`;
    const img = k.img && /^[a-z0-9-]+\.svg$/.test(k.img) ? `<img src="notes/${k.img}" alt="${esc(k.alt || k.t)}" style="width:100%;max-width:420px;display:block;margin:8px auto 0;border-radius:10px">` : '';   // 示意圖是單獨的 svg 檔，用 img 載（工程顧問 10/30）
    return box(`<div class="row"><b class="grow">${one ? '' : x.ic + ' '}${esc(x.title)}・${c + 1}／${x.cards.length}</b>${one ? `<button class="ghost" onclick="mainBook('${b}')">收起</button>` : '<button class="ghost" onclick="mainNotes(-1)">單元列表</button>'}</div>
      <div style="margin-top:6px"><b>${esc(k.t)}</b></div>${img}
      <div style="margin-top:6px">${esc(k.b)}</div>
      <div class="muted" style="margin-top:6px;font-size:12px">課本裡叫什麼：${esc(k.k)}</div>
      <div class="muted" style="font-size:11px">出處：${esc(k.src)}</div>
      ${last ? `<div class="speech" style="margin-top:10px">${esc(x.ask)}</div>` : ''}
      <div class="row" style="margin-top:8px">${go(c - 1, '◀ 上一張', !c)}<span class="grow"></span>${go(c + 1, '下一張 ▶', last)}</div>`);
  }
  const notesHtml = () => bookHtml('shanhai');
  // 列島的方位（爸爸 2026-10-26）：角度÷π，0 東、0.5 南、1 西、-0.5 北；她東、爸爸西、媽媽南、姐姐東北（爸爸 10/27 從北邊改過來）、姑姑西南，智慧島東南，新加入的家人依序用預留的五個位置
  const ISLE_DIR = { 爸爸: 1, 媽媽: 0.5, 姐姐: -0.25, 姑姑: 0.75 }, SPARE = [-0.5, -0.75, 0.38, -0.38, 0.88];
  let isles = null, herBg = null, loading = false, info = null, board = null, boardBusy = false;

  function met(k) { return local.get('mainMet:' + k) === '1'; }
  function meet(k) { local.set('mainMet:' + k, '1'); }
  function her() { return !ownMode() && !isFamily(); }
  const famKey = () => 'f' + (isles || []).findIndex(x => x.name === S.who.name);   // 家人自己的那座島
  function myIsle() { return ownMode() ? famKey() : 'her'; }   // 「回到」的那座島：家人觀看時是她的島
  const backLabel = () => isFamily() ? '回到她的島' : '回到我的島';
  function isleList() {
    const herName = !ownMode() && D.cfg && D.cfg.islandName ? D.cfg.islandName : '她的島';
    const out = [{ key: 'her', slot: 'her', a: 0, name: herName, mine: her(), bg: herBg || (D.cfg && !ownMode() ? D.cfg.bg : '') || 'sea' }];
    if (!ownMode() && !isFamily()) out.push({ key: 'wisdom', slot: 'wisdom', a: 0.25, name: '智慧島' });
    let spare = 0;
    (isles || []).forEach((x, i) => {
      const mine = (ownMode() || isFamily()) && x.name === S.who.name;
      const a = ISLE_DIR[x.name] != null ? ISLE_DIR[x.name] : SPARE[spare++];
      if (a == null) return;
      out.push({ key: 'f' + i, slot: 'f' + i, a, name: mine && D.cfg ? D.cfg.islandName : x.name + '的島', sub: x.open ? '' : '還沒開島', open: x.open, mine, bg: x.bg || 'sea' });
    });
    return out;
  }
  function places() {
    const o = {};
    Object.keys(KEEPER).forEach(k => { const kp = KEEPER[k]; o[k] = OPEN[k] ? { name: kp.place, sub: (kp.ic ? kp.ic + ' ' : '') + kp.name } : { name: kp.place, sub: '準備中', closed: 1 }; });
    return o;
  }
  function sail(fn) {   // 搭飛船：轉場一兩秒（工程顧問建議）
    const o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;z-index:60;background:rgba(207,232,243,.92);display:flex;align-items:center;justify-content:center;font-size:22px';
    o.innerHTML = '<div style="text-align:center"><div style="font-size:48px">🎈</div>起飛囉…</div>';
    document.body.appendChild(o);
    setTimeout(() => { o.remove(); fn(); }, 1200);
  }
  window.mainSail = function (key) {
    if (key === myIsle()) return sail(() => go('home'));
    if (isFamily() && key === famKey()) return sail(() => famOwnSwitch(true));
    if (key === 'her') return sail(() => ownMode() ? famOwnSwitch(false) : go('home'));
    if (key === 'wisdom') return sail(() => go('wisdom'));
  };
  window.mainFocus = function (key) { if (window.MainIsle3D && MainIsle3D.focus) MainIsle3D.focus(key); mainInfo('isle', key); };   // 點下面的島名：鏡頭轉過去（工程顧問 10/27）
  window.mainInfo = function (kind, key, greeted) {
    info = { kind, key, first: kind === 'place' && !met(key) && !greeted };   // greeted：港口的招呼卡已經說過第一次的台詞   // 第一次見面要在 meet() 之前記下來，才會說第一次的台詞
    if (info.first) meet(key);
    if (kind === 'place' && key === 'hall') loadBoard();
    paintInfo();
  };

  // ---------- 玉山聚會所的公告（2b-2）：只在點聚會所時讀 ----------
  const canPost = () => ownMode() || isFamily();   // 家人「我的島」和「看她的島」都可以貼；她只能看
  function loadBoard() {
    if (boardBusy) return;
    boardBusy = true;
    call('getBoard').then(r => { board = r || { items: [], left: 0 }; }).catch(e => { board = board || { items: [], left: 0 }; toast('公告讀不到：' + (e.message || e)); })
      .then(() => { boardBusy = false; paintInfo(); });
  }
  window.hallPost = function () {
    const el = document.getElementById('hallText'), text = el ? el.value.trim() : '';
    if (!text || boardBusy) return;
    boardBusy = true;
    call('postBoard', text).then(r => { board = r; toast('貼好了'); }).catch(e => toast(e.message || String(e)))
      .then(() => { boardBusy = false; paintInfo(); });
  };
  window.hallDel = function (id) {
    if (boardBusy || !confirm('要刪掉這則公告嗎？刪掉就找不回來了。')) return;
    boardBusy = true;
    call('delBoard', id).then(r => { board = r; }).catch(e => toast(e.message || String(e)))
      .then(() => { boardBusy = false; paintInfo(); });
  };
  function boardHtml() {
    if (!board) return '<div class="muted" style="margin-top:8px">讀公告中…</div>';
    const list = board.items.length ? board.items.map(x => `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #eee">
        <div class="row"><b class="grow">${esc(x.name)}</b><span class="muted">${esc(String(x.at).slice(5))}</span></div>
        <div style="white-space:pre-wrap;word-break:break-word">${esc(x.text)}</div>
        ${x.mine ? `<button class="ghost" style="margin-top:4px" data-id="${esc(x.id)}" onclick="hallDel(this.dataset.id)">刪掉</button>` : ''}</div>`).join('')
      : '<div class="muted" style="margin-top:8px">還沒有人貼公告。</div>';
    if (!canPost()) return `<h3 style="margin:12px 0 0">📌 公告</h3>${list}`;
    const full = board.left <= 0;
    return `<h3 style="margin:12px 0 0">📌 公告</h3>
      <div style="margin-top:8px"><textarea id="hallText" maxlength="100" rows="2" style="width:100%" placeholder="想跟大家說什麼？（最多 100 字）"${full ? ' disabled' : ''}></textarea>
      <div class="row"><span class="muted grow">${full ? '今天已經貼了 3 則，明天再來吧。' : '今天還可以貼 ' + board.left + ' 則'}</span><button onclick="hallPost()"${full ? ' disabled' : ''}>貼上</button></div></div>${list}`;
  }

  function keeperCard(k, first) {
    const kp = OPEN[k] && KEEPER[k].open ? Object.assign({}, KEEPER[k], KEEPER[k].open) : KEEPER[k]; if (first === undefined) first = !met(k);   // 開門以後換開門的台詞
    const grand = kp.firstGrand && isFamily() && S.who && S.who.name === '姐姐';
    const line = first || !kp.hello ? (kp.firstHer && !canPost() ? kp.firstHer : grand ? kp.firstGrand : kp.first) : kp.hello[daySeed() % kp.hello.length];
    return `<div class="resident"><span class="avatar">${kp.face || kp.ic}</span><div><b>${esc(kp.name)}</b><div class="muted">${esc(kp.role)}・${esc(kp.intro)}</div></div></div>
      <div class="speech" style="margin-top:8px">${esc(line)}</div>`;
  }
  function ferryRows() {
    return isleList().filter(x => x.key === myIsle() || x.key === 'her' || x.key === 'wisdom' || (isFamily() && x.key === famKey() && x.open)).map(x =>
      `<button class="ghost" style="margin:4px 4px 0 0" onclick="mainSail('${x.key}')">🎈 ${x.key === myIsle() ? backLabel() : esc(x.name)}</button>`).join('');
  }
  function infoHtml() {
    if (!info) return '<div class="muted">👆 點飛船碼頭搭飛船；點其他建物看看它們什麼時候開門。用手指拖曳可以轉動，兩指可以縮放。</div>';
    if (info.kind === 'place') {
      const k = info.key;
      return keeperCard(k, info.first) + (k === 'port' ? worldHtml() + `<div style="margin-top:8px">${ferryRows()}</div>` : k === 'hall' ? summitHtml() + notesHtml() + boardHtml() : OPEN[k] ? (BOOK[k] ? bookHtml(k) : '') : '<div class="muted" style="margin-top:6px">準備中</div>');
    }
    const x = isleList().find(i => i.key === info.key); if (!x) return '';
    if (x.mine) return `<b>🏝️ ${esc(x.name)}</b><div class="muted">這是你的島。</div>${x.open !== false ? `<button style="margin-top:8px" onclick="mainSail('${x.key}')">🎈 ${isFamily() ? '去我的島' : '回到我的島'}</button>` : ''}`;
    if (x.key === 'her' || x.key === 'wisdom') return `<b>🏝️ ${esc(x.name)}</b><div style="margin-top:8px">${`<button onclick="mainSail('${x.key}')">🎈 搭飛船過去</button>`}</div>`;
    return `<b>🏝️ ${esc(x.name)}</b><div class="muted">${x.open ? '島主同意分享以後，才能搭飛船過去拜訪。' : '還沒開島。'}</div>`;
  }
  function paintInfo() { const el = document.getElementById('miInfo'); if (el) el.innerHTML = infoHtml(); }

  function view() {
    loadCredits();   // 碼頭照片的授權清單，進主島時先讀（清單版和 3D 版都要），點碼頭才載當天那張照片
    if (!isles && !loading) {
      loading = true;
      call('getIsles', { bg: 1 }).then(r => { if (Array.isArray(r)) isles = r; else { isles = (r && r.isles) || []; herBg = r && r.herBg; } })   // 舊後端回傳陣列，照舊畫（沒有背景）
        .catch(e => { isles = []; toast('列島清單讀不到：' + (e.message || e)); })
        .then(() => { loading = false; if (tab === 'mainisle') render(); });
    }
    const greet = met('port') ? '' : `<div class="card" id="miHello">${keeperCard('port')}
      <div class="row" style="margin-top:8px"><button class="grow" onclick="mainInfo('place','port',1);document.getElementById('miHello').remove()">好</button></div></div>`;
    const body = use3D() ? `<div id="mi3d" style="height:min(66vh,560px);border-radius:24px;overflow:hidden;background:${env.phase === 'night' ? '#1b2440' : '#cfe8f3'};position:relative">
        <div class="loading" style="padding-top:120px">☁️ 主島從雲裡浮出來…</div></div>
        <div style="margin-top:8px">${isleList().filter(x => x.open !== false).map(x => `<button class="ghost" style="margin:4px 4px 0 0" onclick="mainFocus('${x.key}')">🏝️ ${esc(x.name)}</button>`).join('')}</div>`
      : `<div class="card"><h3>🏛️ 主島上的地方</h3>${Object.keys(KEEPER).map(k => `<button class="ghost" style="margin:4px 4px 0 0" onclick="mainInfo('place','${k}')">${KEEPER[k].ic ? KEEPER[k].ic + ' ' : ''}${KEEPER[k].place}${OPEN[k] ? '' : '（準備中）'}</button>`).join('')}
        <h3 style="margin-top:12px">🏝️ 列島</h3>${isleList().map(x => `<button class="ghost" style="margin:4px 4px 0 0" onclick="mainInfo('isle','${x.key}')">${esc(x.name)}${x.sub ? '（' + esc(x.sub) + '）' : ''}</button>`).join('')}</div>`;
    return `<div class="card"><div class="row"><h2 class="grow" style="margin:0">⛰️ 核心主島</h2><button class="ghost" onclick="mainSail('${myIsle()}')">🎈 ${backLabel()}</button></div>
      <div class="muted">浮在列島中間的天上，從這裡的飛船碼頭可以飛去每座島。</div></div>
      ${greet}${body}<div class="card" id="miInfo" style="margin-top:12px">${infoHtml()}</div>`;
  }
  async function after() {
    const el = document.getElementById('mi3d'); if (!el || !isles) return;
    try {
      if (!window.THREE) await loadScript('three.min.js');
      if (!THREE.OrbitControls) await loadScript('OrbitControls.js');
      if (!window.FpsGuard) await loadScript('fpsguard.js').catch(() => {});   // 自動調畫質（v2.39）；載不到就照原本畫質畫，不擋主島
      if (!window.MainIsle3D) await loadScript('mainisle3d.js');
      if (!document.getElementById('mi3d')) return;
      el.innerHTML = '';
      MainIsle3D.mount(el, { env: { phase: env.phase, weather: env.weather }, season: typeof solarTerm === 'function' ? solarTerm(S.today) : null, places: places(), isles: isleList(),   // 時間、台北天氣、節氣都跟她的島一樣
        onPlace: k => mainInfo('place', k), onIsle: k => mainInfo('isle', k) });
    } catch (e) { local.set('islandView', 'list'); toast('這支手機開不了 3D，先用清單模式'); render(); }
  }
  window.MainIsle = { view, after };
})();

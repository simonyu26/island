// 開島模組 P1：這個檔由 模組/build_mods.py 產生，不要手改。和 Modules.gs 同一份表、同一套算法；family.js 的 apply() 用它把白名單和開著的模組取交集
window.MOD_TABLE = {"always":["getState","getImages","saveIsle"],"legacy":["core","health"],"modules":{"core":{"ai":true,"api":["addFamAsk","addPaper","addWish","agreeAi","agreeWords","answerWord","bookAdd","bookCat","bookDel","bookRead","buy","buyIslet","buyMat","confirmWeek","createTicket","delBoard","delWords","diaryGuest","enCards","exchangeXp","famAnswer","famQuest","famQuestAi","famSnap","famStory","getBoard","getDaily","getImages","getIsles","getState","giftDish","gramGet","guestView","logDay","n1Cards","postBoard","rdGet","refreshTicket","replyFamAsk","replyShiori","reviewLangBottle","revokeTicket","saveAbbr","saveCoinGoal","saveConfig","saveCraft","saveDecor","saveDiary","saveFocus","saveGarden","saveHome","saveImage","saveIq","saveIsle","saveKeeper","saveLifeTags","saveLighthouse","saveLike","saveLink","savePlan","saveVisit","saveWelcome","saveWords","scanPlan","scanWords","sellDish","sendShiori","setAiDaily","setLangOn","shelfAdd","shioriBox","shioriFrom","shioriIn","shioriOut","shioriTo","takeLesson","wordQuest"],"board":["plan","walk"],"cards":["buyBack","coinBook","coinFoot","coinGoal","daylog","diary","diaryShare","famask","famlog","homeMate","islet","kairan","keeperImg","link","matShelf","medit","moveArt","moveRead","news","talk","talkEntry","timeline","version","xpEx"],"default":{"一般":true,"會考準備":true,"語言學習":true},"id":"core","keys":{},"learn":false,"name":"核心","needs":[],"note":"現在家人島有的一切（含跟旗標走的）；清單由 build_mods.py 從 family.js、index.html、Family.gs 掃出，扣掉其他模組認領的。ai: true 是既有、已經同意的智慧島與島民的話；額度不變。","on3d":true,"owner":"家人島工作串","place":["books","garden","hall","home","light","main","paper","walk","wisdom","words","yatai"],"tabs":["abbr","bookstore","coins","confirm","day","famvisit","focus","garden","guide","hall","hand","home","house","isle","isleNew","keeper","kizuna","light","log","mail","mainisle","more","paper","pick","plan","scan","setup","shop","talk","visits","walk","whut","wisdom","wish","wlesson","words","yatai"],"ver":1},"health":{"ai":false,"api":["saveExercise","saveMed","saveMedCfg","saveMove","saveWater"],"board":["med"],"cards":["habit","move","water"],"default":{"一般":true,"會考準備":true,"語言學習":true},"id":"health","keys":{"ex:":"study","med":"never","med:":"never","move:":"study","water:":"never"},"learn":false,"name":"健康作息","needs":["core"],"note":"第一版只是把核心裡的喝水、運動、吃藥收成一筆，沒有程式檔（沒有 file）；關掉時這些卡片、分頁、看板不出現、五支函式叫不到，資料留著。moveRead 是共讀，留在 core（模組規格串 11/1）。","on3d":false,"owner":"家人島工作串","place":[],"tabs":["moveStop"],"ver":1}},"v":1};
window.MOD_LEGACY = ["core", "health"];
window.MOD_ALWAYS = { getState: 1, getImages: 1, saveIsle: 1 };

/** 這座島開著的模組：isle 沒有 mods（舊島）→ MOD_LEGACY_（寫死，之後的新模組不得自動加進去）；是陣列 → 留認得的 id，補上 needs，core 永遠在；認不得的 id 丟掉（fail-closed 到模組層級） */
function modsOf(isle) {
  var T = MOD_TABLE.modules, want = isle && Array.isArray(isle.mods) ? isle.mods : MOD_LEGACY, on = {}, q = ['core'];
  want.forEach(function (id) { if (T[id]) q.push(id); });
  while (q.length) { var id = q.shift(); if (on[id] || !T[id]) continue; on[id] = 1; (T[id].needs || []).forEach(function (n) { q.push(n); }); }
  return Object.keys(on).sort();
}
/** name 在任何一個開著模組的 kind（tabs／cards／board／place／api）清單裡才 true；沒登記的一律 false */
function modAllows(mods, kind, name) {
  var T = MOD_TABLE.modules;
  for (var i = 0; i < mods.length; i++) { var m = T[mods[i]]; if (m && m[kind] && m[kind].indexOf(name) >= 0) return true; }
  return false;
}
window.modsOf = modsOf; window.modAllows = modAllows;

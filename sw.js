// 快取 App 外殼，讓小島打開更快；資料仍以伺服器為準
const CACHE = 'island-v96';
// 不會改版的檔案（函式庫、考古題圖片）照一般快取，不用每次問伺服器；exam/units.json 修標籤、exam/cards.json 加審過的觀念小卡會改版，要每次確認
const FIXED = /\/exam\/(?!(units|cards)\.json$)|three\.min\.js$|OrbitControls\.js$|qrcode\.js$|\.(png|jpe?g|webp)$/;
const SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// 外殼檔案：先用網路，失敗才用快取（更新後馬上生效）；API 請求不經過快取
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, FIXED.test(url.pathname) ? {} : { cache: 'no-cache' }).then(r => {   // GitHub Pages 有 10 分鐘的瀏覽器快取；會改版的檔案用 no-cache 每次跟伺服器確認（沒變只回 304），新版馬上生效
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request))
  );
});

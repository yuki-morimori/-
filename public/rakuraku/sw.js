// らくらく手配 配車表 Service Worker
// ナビゲーションはネットワーク優先（更新を確実に反映）、
// アセット類はキャッシュ優先（ExcelJS CDN含む＝初回オンライン後はオフラインでも出力可）。
const CACHE = "rakuraku-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // ページ遷移：ネットワーク優先 → 失敗時はキャッシュのindex.html
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const cp = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", cp));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // それ以外（同一オリジン資産・ExcelJS CDN等）：キャッシュ優先
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const cp = res.clone();
          caches.open(CACHE).then(c => c.put(req, cp));
        }
        return res;
      });
    })
  );
});

// echo のサービスワーカー：一度開けば、電波がなくても開けるようにする。
// 先にキャッシュから返し、裏で新しい版を取ってきて入れ替える（次に開いたときに反映）。
const CACHE = "echo-v1";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const key = req.mode === "navigate" ? "./" : req;
    const hit = await cache.match(key, {ignoreSearch: req.mode === "navigate"});
    const net = fetch(req).then(res => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    }).catch(() => hit || cache.match("./"));
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }));
});

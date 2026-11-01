// Copia local de la app para que abra sin conexión.
// La página se pide primero a internet (para tener siempre la última versión)
// y, si no hay cobertura, se usa la copia guardada.
const CACHE = "donde-estoy-brujula-v2";
const APP = ["./", "index.html", "manifest.json", "apple-touch-icon.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Direcciones (CartoCiudad, OpenStreetMap): solo con internet, nunca se guardan
  if (/cartociudad\.es|openstreetmap\.org/.test(url.hostname)) return;
  // Páginas de la app: internet primero, copia guardada si no hay cobertura
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); return r;
    }).catch(() => caches.match("index.html")));
    return;
  }
  // Resto (iconos, tipos de letra): copia guardada primero, y se guarda lo nuevo
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === "opaque") { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});

// Copia local de la app para que abra sin conexión.
// Se abre siempre con la copia guardada (rápido y sin cobertura);
// la versión nueva se baja por detrás y se ve en la siguiente apertura.
const CACHE = "donde-estoy-v8";
const APP = ["./", "index.html", "manifest.json", "apple-touch-icon.png", "icon-192.png", "icon-512.png",
  "archivo-latin-500-normal.woff2", "archivo-latin-800-normal.woff2",
  "jetbrains-mono-latin-500-normal.woff2", "jetbrains-mono-latin-700-normal.woff2"];

// El mapa NO va en la caché: Safari lee la caché entera cada vez que arranca la app,
// y con cientos de MB de mapa tardaba segundos en abrir. Va en una base de datos aparte.
const DB_NAME = "mapa", DB_STORE = "t";
let dbP = null;
function mapDB() {
  return dbP || (dbP = new Promise((ok, ko) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(DB_STORE);
    r.onsuccess = () => { const d = r.result; d.onversionchange = () => { d.close(); dbP = null; }; ok(d); };
    r.onerror = () => { dbP = null; ko(r.error); };
  }));
}
function mapTx(mode, fn) {
  return mapDB().then(d => new Promise((ok, ko) => {
    const tx = d.transaction(DB_STORE, mode); let res;
    const q = fn(tx.objectStore(DB_STORE)); if (q) q.onsuccess = () => { res = q.result; };
    tx.oncomplete = () => ok(res); tx.onerror = tx.onabort = () => ko(tx.error);
  }));
}

self.addEventListener("install", e => {
  // cache: "reload" para no guardar una versión vieja que el móvil tuviera a medias
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(APP.map(u => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
// Se borran las copias viejas de ESTA app y el mapa en formato antiguo ("mapa-datos").
// Las demás apps de jc7190.github.io comparten el mismo espacio y no se tocan.
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => (k.startsWith("donde-estoy-") && k !== CACHE) || k === "mapa-datos").map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Direcciones (CartoCiudad, OpenStreetMap): solo con internet, nunca se guardan
  if (/cartociudad\.es|openstreetmap\.org/.test(url.hostname)) return;
  // Mapa (carreteras, relieve, letras y el programa del mapa): primero lo guardado; lo nuevo se guarda
  if (/tiles\.openfreemap\.org|elevation-tiles-prod|unpkg\.com/.test(url.href)) {
    if (req.cache === "no-store") return;   // la descarga del mapa ya lo guarda ella misma
    e.respondWith(mapTx("readonly", s => s.get(req.url)).catch(() => null).then(hit => {
      if (hit) return new Response(hit.b, { headers: hit.t ? { "Content-Type": hit.t } : {} });
      return fetch(req).then(r => {
        if (r.ok && r.type !== "opaque") {
          const t = r.headers.get("Content-Type") || "";
          e.waitUntil(r.clone().arrayBuffer().then(b => mapTx("readwrite", s => s.put({ b, t }, req.url))).catch(() => {}));
        }
        return r;
      });
    }));
    return;
  }
  // Páginas de la app: se abre AL INSTANTE con la copia guardada.
  // Por detrás se descarga la versión nueva, que se verá la próxima vez que se abra.
  if (req.mode === "navigate") {
    const net = fetch(req, { cache: "no-store" }).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); }
      return r;
    });
    e.waitUntil(net.catch(() => {}));
    e.respondWith(caches.open(CACHE).then(c => c.match("index.html")).then(hit => hit || net));
    return;
  }
  // Resto (iconos, tipos de letra): copia guardada de ESTA app primero
  e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
    if (r.ok && url.origin === location.origin) c.put(req, r.clone());
    return r;
  }))));
});

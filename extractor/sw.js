// Calculadora extractor Â· funciona sin internet: guarda la app, jsPDF y las fuentes la primera vez que se abre.
// Cambia VERSION cada vez que se publique una actualizaciÃ³n de index.html.
const VERSION = 'extractor-v3';
const SHELL = ['./', './index.html', './manifest.json', './jspdf.umd.min.js', './icono-192.png', './icono-512.png', './icono-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // PÃ¡gina: primero la red (para recibir actualizaciones); sin seÃ±al, la copia guardada.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req.url, { cache: 'no-cache' }).then(r => { const c = r.clone(); caches.open(VERSION).then(k => k.put('./index.html', c)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // Archivos propios y fuentes de Google: primero la copia guardada.
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSION).then(k => k.put(req, c)); }
      return r;
    })));
  }
});
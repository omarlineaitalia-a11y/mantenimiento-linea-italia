/* Misión Enfoque · service worker (instalar como app y abrir sin señal).
 * Alcance: solo la carpeta de la app. No toca las peticiones a Firebase (Firestore/Auth),
 * que tienen su propio manejo sin conexión.
 * Si cambias archivos, sube la versión de CACHE para que los teléfonos tomen lo nuevo.
 */
var CACHE = 'mision-enfoque-v1';
var BASE = ['./', 'index.html', 'estilos.css?v=1', 'instrumentos.js?v=1', 'ilustraciones.js?v=1', 'dialogo.js?v=1', 'almacenamiento.js?v=1',
  'juegos.js?v=1', 'encuesta.js?v=1', 'informe.js?v=1', 'panel.js?v=1', 'manifest.json', 'iconos/icono-192.png', 'iconos/icono-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(BASE).catch(function () {}); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('mision-enfoque-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Firebase (datos y sesión): nunca desde caché
  if (/googleapis\.com|firebaseio|identitytoolkit|securetoken|firebaseapp\.com/.test(url.hostname)) return;
  var mismoOrigen = url.origin === self.location.origin;
  if (mismoOrigen) {
    // archivos propios (y ../firebase-config.js): primero la red, si no hay señal, la copia guardada
    e.respondWith(fetch(req).then(function (r) {
      if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
      return r;
    }).catch(function () { return caches.match(req).then(function (r) { return r || caches.match('index.html'); }); }));
    return;
  }
  // librerías de CDN (cdnjs, gstatic, Google Fonts): primero la caché
  if (/cdnjs\.cloudflare\.com|gstatic\.com|fonts\.googleapis\.com/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(function (r) {
      return r || fetch(req).then(function (res) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); return res; });
    }));
  }
});

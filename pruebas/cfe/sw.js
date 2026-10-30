// Lecturas CFE · instalación como aplicación (tableta / PC). Sin caché: siempre baja la versión más nueva.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

// Caja Chica · instalación como aplicación (PC / teléfono)
// Sin caché: siempre se baja la versión más nueva de la página.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // necesario para que el navegador permita instalarla como aplicación

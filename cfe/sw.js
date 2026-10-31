// Lecturas CFE · instalación como aplicación (tableta / PC). Sin caché: siempre baja la versión más nueva.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
// al tocar el aviso de "lectura pendiente" se abre (o se trae al frente) la app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) if ('focus' in c) return c.focus(); return self.clients.openWindow('./'); }));
});

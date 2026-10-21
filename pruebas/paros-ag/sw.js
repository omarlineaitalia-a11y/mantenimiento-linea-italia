// Control de Paros · avisos de falla (Windows / Android)
// Al tocar el aviso, se abre o se trae al frente la página de Control de Paros.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // necesario para que Android permita instalarla como aplicación
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.includes('/paros/'));
    if (c) return c.focus();
    return self.clients.openWindow('./');
  }));
});

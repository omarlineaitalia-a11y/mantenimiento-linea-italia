// Control de Rechazos · avisos (Windows / Android) e instalación como aplicación
// Sin caché: siempre se baja la versión más nueva de la página.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // necesario para que Android permita instalarla como aplicación
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.startsWith(self.registration.scope));
    if (c) return c.focus();
    return self.clients.openWindow('./');
  }));
});

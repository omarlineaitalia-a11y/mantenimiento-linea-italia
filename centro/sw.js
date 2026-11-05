// Centro de Mantenimiento LI · necesario para instalarlo como aplicación (no guarda copias: siempre lo más nuevo)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

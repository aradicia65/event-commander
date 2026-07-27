const CACHE = 'ec-v2';
const OFFLINE = '/offline.html';
const PRE = ['/', '/index.html', '/offline.html', '/manifest.json',
             '/icons/icon-192x192.png', '/icons/icon-512x512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r && r.status===200) { const c=r.clone(); caches.open(CACHE).then(ca=>ca.put(e.request,c)); }
      return r;
    }).catch(() => caches.match(e.request).then(c => c || (e.request.mode==='navigate' ? caches.match(OFFLINE) : new Response('Offline',{status:503}))))
  );
});
self.addEventListener('push', e => {
  if (!e.data) return;
  let d; try { d=e.data.json(); } catch { d={title:'Event Commander',body:e.data.text()}; }
  const urgent = ['active-shooter','riot','hazmat'].includes(d.type);
  e.waitUntil(self.registration.showNotification(d.title||'Event Commander', {
    body: d.body||'',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: d.tag||'ec',
    vibrate: urgent ? [200,100,200,100,200,100,400] : [200,100,200],
    requireInteraction: urgent,
    data: { url: d.url||'/' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(cs => {
    for (const c of cs) { if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow(e.notification.data?.url||'/');
  }));
});
self.addEventListener('message', e => {
  if (e.data?.type==='SKIP_WAITING') self.skipWaiting();
});

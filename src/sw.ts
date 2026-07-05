/// <reference lib="webworker" />
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { firebaseWebConfig } from '@/shared/lib/firebaseConfig';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string | null }>;
};

const CACHE_NAME = 'admin-delivery-pwa-v2';
const PRECACHE_URLS = self.__WB_MANIFEST.map((entry) => entry.url);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key !== CACHE_NAME && key.startsWith('admin-delivery-'))
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((response) =>
        response || caches.match('/index.html') as Promise<Response>
      )
    )
  );
});

if (firebaseWebConfig.apiKey && firebaseWebConfig.projectId && firebaseWebConfig.messagingSenderId && firebaseWebConfig.appId) {
  const messaging = getMessaging(initializeApp(firebaseWebConfig));
  onBackgroundMessage(messaging, (payload) => {
    const data = payload.data || {};
    const title = data.title || 'Nova notificação';
    self.registration.showNotification(title, {
      body: data.body,
      image: data.image_url || undefined,
      icon: '/icons/icon-192x192.png',
      data,
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = String(event.notification.data?.route || '/notifications');
  const destination = new URL(route, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const current = clients[0] as WindowClient | undefined;
      if (current) {
        await current.navigate(destination);
        return current.focus();
      }
      return self.clients.openWindow(destination);
    })
  );
});

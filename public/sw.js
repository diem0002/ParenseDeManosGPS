self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
    // Basic pass-through to allow installation criteria to be met
    // We don't need complex caching for this use case yet
});

const cachePrefix = "rentaloc-";
const cacheName = `${cachePrefix}v17`;
const coreAppShell = [
  "./",
  "./index.html",
  "./app.html",
  "./src/styles.css?v=17",
  "./src/install.js",
  "./src/rules.js",
  "./src/schema.js",
  "./src/domain.js",
  "./src/storage.js",
  "./src/app.js",
  "./site.webmanifest",
  "./assets/icons/icon.svg",
  "./assets/icons/maskable-icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/maskable-icon-512.png",
];

const scopedUrl = (path) => new URL(path, self.registration.scope).toString();
const scopeUrl = new URL(self.registration.scope);
const landingDocumentUrl = scopedUrl("./index.html");
const appDocumentUrl = scopedUrl("./app.html");

function offlineDocumentFor(url) {
  return url.pathname.endsWith("/app.html") ? appDocumentUrl : landingDocumentUrl;
}

function isWithinScope(url) {
  return url.origin === scopeUrl.origin && url.pathname.startsWith(scopeUrl.pathname);
}

function isCacheable(response) {
  return response && response.ok && response.type !== "opaque";
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => cache.addAll(coreAppShell.map(scopedUrl)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(cachePrefix) && name !== cacheName)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (!isWithinScope(requestUrl)) return;

  if (event.request.mode === "navigate") {
    const offlineDocumentUrl = offlineDocumentFor(requestUrl);
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (isCacheable(response)) {
            const cache = await caches.open(cacheName);
            await cache.put(offlineDocumentUrl, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const offlineDocument = await caches.match(offlineDocumentUrl);
          return (
            offlineDocument ||
            new Response("RentaLoc est indisponible hors connexion.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }),
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!isCacheable(response)) return response;
        const copy = response.clone();
        caches.open(cacheName).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});

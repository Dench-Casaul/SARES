const CACHE_NAME = "sares-shell-v1";
const SHELL_URLS = ["/", "/manifest.webmanifest", "/favicon.png"];

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch("/");
  if (!response.ok) throw new Error(`Failed to fetch app shell: ${response.status}`);

  await cache.put("/", response.clone());
  const html = await response.text();
  const assetUrls = Array.from(html.matchAll(/(?:src|href)=["']([^"']+)["']/g))
    .map((match) => match[1])
    .filter((path) => path.startsWith("/assets/"));

  await cache.addAll([
    ...SHELL_URLS.filter((path) => path !== "/"),
    ...new Set(assetUrls),
  ]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("sares-shell-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedShell = await caches.match("/");
        if (cachedShell) return cachedShell;
        return Response.error();
      })
    );
    return;
  }

  if (!url.pathname.startsWith("/assets/")) return;

  event.respondWith(
    caches.match(request).then((cachedAsset) => {
      if (cachedAsset) return cachedAsset;

      return fetch(request).then((response) => {
        if (response.ok) {
          const responseCopy = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy))
          );
        }
        return response;
      });
    })
  );
});

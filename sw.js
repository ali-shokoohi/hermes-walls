/* Hermes Walls Lab service worker: offline-first shell, network-first page so updates land fast. */
const VERSION = "walls-lab-v2";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/shortcut-add.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => undefined))))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});

async function fromNetwork(request, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(request, { signal: ctrl.signal });
    if (res && res.ok) {
      const cache = await caches.open(VERSION);
      cache.put(request, res.clone());
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network first (4 s budget), then the cached shell. The page is fully self-contained.
  if (req.mode === "navigate") {
    event.respondWith(
      fromNetwork(req, 4000).catch(async () =>
        (await caches.match(req, { ignoreSearch: true })) ||
        (await caches.match("./index.html")) ||
        (await caches.match("./")) ||
        Response.error()
      )
    );
    return;
  }

  // Everything else (icons, manifest): stale-while-revalidate.
  const refresh = fromNetwork(req, 8000).catch(() => undefined);
  event.waitUntil(refresh);
  event.respondWith(
    caches.match(req).then((hit) => hit || refresh.then((res) => res || Response.error()))
  );
});

/* Service Worker: macht die Rechen-App offline nutzbar.
   Beim Aktualisieren der App die Versionsnummer hochzählen. */
const CACHE = "rechnen-ueben-v2";

const DATEIEN = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(DATEIEN))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(
        namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then((treffer) => {
      if (treffer) return treffer;

      return fetch(e.request).then((antwort) => {
        // Erfolgreiche Antworten (auch Schriften von Google) nachträglich ablegen,
        // damit die App ab dem zweiten Start komplett offline läuft.
        if (antwort && (antwort.ok || antwort.type === "opaque")) {
          const kopie = antwort.clone();
          caches.open(CACHE).then((c) => c.put(e.request, kopie)).catch(() => {});
        }
        return antwort;
      }).catch(() => caches.match("./index.html"));
    })
  );
});

/* Service Worker der Rechen-App.
   Strategie:
   - HTML (die App selbst): erst Netz, dann Cache. So kommt eine neue Fassung
     sofort an, offline funktioniert die App trotzdem.
   - Icons, Manifest, Schriften: erst Cache, im Hintergrund aktualisiert.
   Bei jeder Änderung an der App die Versionsnummer hochzählen. */
const VERSION = "v3";
const CACHE = "rechnen-ueben-" + VERSION;

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

// Erkennt Anfragen nach der App-Seite selbst
function istSeite(request){
  return request.mode === "navigate" ||
         (request.headers.get("accept") || "").indexOf("text/html") !== -1;
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  if (istSeite(e.request)) {
    // Netz zuerst: neue Fassungen kommen ohne Umweg an
    e.respondWith(
      fetch(e.request)
        .then((antwort) => {
          const kopie = antwort.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", kopie)).catch(() => {});
          return antwort;
        })
        .catch(() => caches.match("./index.html").then((t) => t || caches.match("./")))
    );
    return;
  }

  // Übrige Dateien: aus dem Cache ausliefern und im Hintergrund erneuern
  e.respondWith(
    caches.match(e.request).then((treffer) => {
      const ausDemNetz = fetch(e.request).then((antwort) => {
        if (antwort && (antwort.ok || antwort.type === "opaque")) {
          const kopie = antwort.clone();
          caches.open(CACHE).then((c) => c.put(e.request, kopie)).catch(() => {});
        }
        return antwort;
      }).catch(() => treffer);
      return treffer || ausDemNetz;
    })
  );
});

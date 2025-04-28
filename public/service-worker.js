const CACHE_NAME = "termox-cache-v1";
const WORDLIST_URL = "/wordlist";

let cachedWords = [];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        cache.addAll([
          "/",
          "/index.html",
          "/modal.html",
          "/icon.png",
          "/wordlist",
          "/client.js",
          "https://cdn.tailwindcss.com/",
        ])
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function loadWords() {
  if (cachedWords.length > 0) return cachedWords;

  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(WORDLIST_URL);

  if (!response) {
    console.error("No wordlist cached.");
    return [];
  }

  const text = await response.text();
  cachedWords = text.split("\n").map((w) => w.trim().toUpperCase()).filter(
    (w) => w,
  );
  return cachedWords;
}

function getRandomWord() {
  if (cachedWords.length === 0) return "TERMO";
  const idx = Math.floor(Math.random() * cachedWords.length);
  return cachedWords[idx];
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname === "/word") {
    event.respondWith(
      fetch(request).catch(async () => {
        console.log("Offline, serving random word.");
        await loadWords();
        const randomWord = getRandomWord();
        return new Response(randomWord, {
          headers: { "Content-Type": "text/plain" },
        });
      }),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response) return response;
        return caches.match("/index.html");
      })
      .catch(() => caches.match(request)),
  );
});

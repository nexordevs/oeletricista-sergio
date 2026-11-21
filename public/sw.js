// Service worker do painel: deixa o app funcionar sem internet.
// - Arquivos do app (JS/CSS/fontes/ícones): cache-first (têm hash no nome).
// - Páginas do /painel: tenta a internet; sem internet, mostra a última versão salva.
// - Nada de POST, API, admin ou PDF é guardado. Ao sair da conta, as páginas salvas são apagadas.
const V = "v1";
const STATIC = `static-${V}`;
const PAGES = `paginas-${V}`;
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll([OFFLINE, "/icon.svg", "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== STATIC && k !== PAGES) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type === "warm" && Array.isArray(d.urls)) e.waitUntil(warm(d.urls));
  if (d.type === "clear") e.waitUntil(caches.delete(PAGES));
});

const isStatic = (p) => p.startsWith("/_next/static/") || p.startsWith("/fonts/") || p.startsWith("/icons/") || p === "/icon.svg";
const isPrivatePage = (p) => p === "/painel" || p.startsWith("/painel/");
const pageKey = (url) => url.pathname + url.search;

// Guarda páginas importantes (e os arquivos JS/CSS que elas usam) para abrir sem internet.
async function warm(urls) {
  const pages = await caches.open(PAGES);
  const stat = await caches.open(STATIC);
  for (const u of urls) {
    try {
      const r = await fetch(u, { credentials: "same-origin", redirect: "follow" });
      if (!r.ok || r.redirected) continue; // sessão expirada → não guarda a tela de login
      const html = await r.clone().text();
      await pages.put(u, r);
      const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
      for (const a of assets) if (!(await stat.match(a))) { try { const ar = await fetch(a); if (ar.ok) await stat.put(a, ar); } catch { /* segue */ } }
    } catch { /* sem internet: tenta na próxima */ }
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isStatic(url.pathname)) { e.respondWith(cacheFirst(req)); return; }
  if (req.mode === "navigate" && isPrivatePage(url.pathname) && !url.pathname.endsWith("/pdf")) e.respondWith(networkFirst(req, url));
});

async function cacheFirst(req) {
  const c = await caches.open(STATIC);
  const hit = await c.match(req, { ignoreSearch: false });
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok) c.put(req, r.clone());
  return r;
}

async function networkFirst(req, url) {
  const c = await caches.open(PAGES);
  try {
    const r = await fetch(req);
    if (r.ok && r.type === "basic" && !r.redirected) c.put(pageKey(url), r.clone());
    return r;
  } catch {
    const hit = (await c.match(pageKey(url))) || (await c.match(url.pathname));
    if (hit) return hit;
    return (await caches.match(OFFLINE)) || new Response("Sem internet", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

// Lápide de service worker: este arquivo continua publicado de propósito.
// Clientes PWA antigos têm este caminho registrado e só conseguem sair da versão
// presa se o navegador rebuscar exatamente esta URL — por isso o nome não muda.
// O worker antigo era cache-first sem revalidação e pré-cacheava os próprios
// scripts que o re-registravam, então o único jeito de libertar esses clientes é
// servir aqui um worker que se autodestrói. Não registre nenhum handler "fetch":
// sem ele o navegador entrega a rede diretamente enquanto a limpeza acontece.

const LEGACY_CACHE_PREFIX = "xbpneus-racing-";

async function selfDestruct() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter(key => key.startsWith(LEGACY_CACHE_PREFIX))
      .map(key => caches.delete(key))
  );
  await self.clients.claim();
  await self.registration.unregister();
  const windows = await self.clients.matchAll({ type: "window" });
  for (const client of windows) {
    // Recarrega a aba já sem worker controlador, trazendo o build atual.
    client.navigate(client.url);
  }
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(selfDestruct());
});

// Worker ativo do XBPNEUS Racing.
//
// A URL deste arquivo é estável de propósito: o servidor a entrega com
// "no-store", então o navegador rebusca o worker a cada atualização e compara
// byte a byte. Renomear o arquivo a cada release é o que criou as sete lápides
// deste diretório — e um cliente que perde um elo da corrente fica preso.
// Quem precisa mudar a cada release é o NOME DO CACHE: é ele que decide o que
// sobrevive à troca de versão.
const RELEASE = "3.6.1";
const CACHE_NAME = `xbpneus-racing-v${RELEASE.replaceAll(".", "")}`;

// Chave única para toda navegação: o SPA sempre devolve o mesmo shell, então
// cachear por URL de navegação faria o cache crescer sem limite.
const APP_SHELL_URL = "/index.html";

// Só caminhos estáveis entram no pré-cache. Os bundles do Vite têm hash no nome
// e mudam a cada build, por isso são cacheados sob demanda pelo handler.
const PRECACHE_URLS = [
  "/",
  APP_SHELL_URL,
  "/manifest.webmanifest",
  "/assets/app-icon.svg",
  "/assets/logo-xb-mark-v3.webp",
  "/assets/glb/XB_Road_Straight.glb",
  "/assets/glb/XB_Road_Cross.glb",
  "/assets/glb/XB_Road_T.glb",
  "/assets/glb/entregador_web.glb",
  "/assets/glb/XB_Circuito_Vestido.glb",
];

// Uma escrita de cache pode falhar por cota (QuotaExceededError) ou por a
// resposta ser parcial (206). Isso nunca pode derrubar a resposta ao jogador.
async function putSafely(cache, key, response) {
  if (!response || response.status !== 200 || response.type === "opaque")
    return;
  try {
    await cache.put(key, response.clone());
  } catch {
    // Cache indisponível ou cheio: seguimos servindo direto da rede.
  }
}

// Quem decide se uma resposta pode ser servida do cache sem revalidar é o
// próprio servidor, pelo Cache-Control. Só a URL com hash de conteúdo recebe
// "immutable" — para todo o resto (manifest, GLB, svg do /assets) o worker
// devolve o cache e revalida em segundo plano, senão trocar um byte de um asset
// sem hash nunca chegaria a um PWA já instalado. A revalidação usa o modo de
// cache padrão de propósito: o worker não encurta nem estica a validade que o
// servidor publicou, então um jogador com o PWA instalado nunca fica mais
// desatualizado do que um que abre o jogo sem worker nenhum.
function isImmutable(response) {
  return (response?.headers.get("cache-control") || "").includes("immutable");
}

// "no-store" é uma ordem: /healthz e os próprios workers não podem virar cópia
// guardada. A única exceção deliberada é o shell do SPA, gravado pelo handler
// de navegação — sem ele não existe jogo offline.
function isStorable(response) {
  return !(response?.headers.get("cache-control") || "").includes("no-store");
}

async function precache() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    PRECACHE_URLS.map(async url => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        await putSafely(cache, url, response);
      } catch {
        // Um item ausente não pode impedir a ativação do worker novo.
      }
    })
  );
}

self.addEventListener("install", event => {
  event.waitUntil(precache());
  self.skipWaiting();
});

// O cache da geração anterior morre aqui. Como o nome carrega o release, subir
// a versão basta para o PWA instalado começar limpo em vez de acumular uma
// geração de ~4 MB de Babylon por release.
async function dropStaleCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter(key => key.startsWith("xbpneus-racing-") && key !== CACHE_NAME)
      .map(key => caches.delete(key))
  );
  await self.clients.claim();
}

self.addEventListener("activate", event => {
  event.waitUntil(dropStaleCaches());
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await putSafely(cache, APP_SHELL_URL, response);
    return response;
  } catch {
    // O shell é o único "no-store" que guardamos de propósito: sem ele não há
    // jogo offline. Toda navegação bem-sucedida o reescreve.
    return (await cache.match(APP_SHELL_URL)) || Response.error();
  }
}

async function assetFromCache(event, request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached && isImmutable(cached)) return cached;

  const revalidation = fetch(request)
    .then(async response => {
      if (isStorable(response)) await putSafely(cache, request, response);
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    // Devolve o cache agora e atualiza para a próxima visita; o waitUntil
    // segura o worker vivo até a revalidação terminar.
    event.waitUntil(revalidation);
    return cached;
  }
  return (await revalidation) || Response.error();
}

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Requisições com Range devolvem 206 e não podem ser cacheadas nem servidas
  // de um cache completo: deixe o navegador falar direto com o servidor.
  if (request.headers.has("range")) return;
  event.respondWith(
    request.mode === "navigate"
      ? networkFirstNavigation(request)
      : assetFromCache(event, request)
  );
});

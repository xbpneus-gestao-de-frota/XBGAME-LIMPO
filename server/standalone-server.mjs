import { createReadStream, existsSync } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const RELEASE = "3.6.1";

// Hash de conteúdo do Vite: 8 caracteres do alfabeto base64url. "-" e "_" fazem
// parte desse alfabeto e aparecem em ~12% dos nomes gerados — deixar o "-" de
// fora tirava o `immutable` de um arquivo a cada oito, inclusive do único CSS do
// app. A fonte é exportada para que os gates de release usem exatamente a mesma
// definição que o servidor, em vez de manter uma cópia que diverge em silêncio.
export const VITE_HASH_SOURCE = "[A-Za-z0-9_-]{8}";
const VITE_HASH_LENGTH = 8;
const HASHED_SEGMENT = new RegExp(`^${VITE_HASH_SOURCE}$`);
// Extensões que, dentro de /assets, só o bundler escreve: client/public/assets
// guarda apenas svg/webp, e o gate de release reprova se algum .js/.css nascer
// lá. Por isso, para elas, o sufixo com hash já é prova suficiente e aceitamos
// "-" dentro do hash.
const BUNDLER_ONLY_EXTENSIONS = new Set([".css", ".js", ".map", ".mjs"]);
const SERVICE_WORKER_BASENAME = /^sw-v\d+\.js$/;

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const nearbyPublic = path.join(currentDirectory, "public");
const publicDirectory = existsSync(nearbyPublic)
  ? nearbyPublic
  : path.resolve(currentDirectory, "..", "dist", "public");

export const securityHeaders = Object.freeze({
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
  ].join("; "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy":
    "camera=(), display-capture=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
});

const mimeTypes = new Map([
  [".avif", "image/avif"],
  [".bin", "application/octet-stream"],
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".glb", "model/gltf-binary"],
  [".gltf", "model/gltf+json"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".ktx2", "image/ktx2"],
  [".map", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".mp3", "audio/mpeg"],
  [".mp4", "video/mp4"],
  [".ogg", "audio/ogg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".wav", "audio/wav"],
  [".webm", "video/webm"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
]);

function readPort(value) {
  const port = Number(value ?? "3000");
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("PORT deve ser um número inteiro entre 0 e 65535");
  }
  return port;
}

function applyHeaders(response) {
  for (const [name, value] of Object.entries(securityHeaders)) {
    response.setHeader(name, value);
  }
  response.setHeader("X-XBPNEUS-Release", RELEASE);
}

// Só um nome com hash de conteúdo do Vite (`nome-<hash>.ext`, dentro de
// /assets) pode receber cache imutável: um arquivo batizado à mão muda de
// conteúdo sem mudar de URL e ficaria preso um ano no navegador do jogador.
// Na dúvida o arquivo cai em must-revalidate: perder cache é barato, servir
// conteúdo velho não é.
function isHashedAssetPath(urlPath) {
  if (!urlPath.startsWith("/assets/")) return false;
  const fileName = path.posix.basename(urlPath);
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0) return false;
  const stem = fileName.slice(0, lastDot);
  const extension = fileName.slice(lastDot).toLowerCase();

  if (BUNDLER_ONLY_EXTENSIONS.has(extension)) {
    // O hash tem tamanho fixo, então medimos do fim para trás. Recortar no
    // último "-" perdia justamente os hashes que contêm "-".
    if (stem.length <= VITE_HASH_LENGTH) return false;
    if (stem.at(-VITE_HASH_LENGTH - 1) !== "-") return false;
    return HASHED_SEGMENT.test(stem.slice(-VITE_HASH_LENGTH));
  }

  // Nas outras extensões o hash convive com nomes escritos à mão que também
  // terminam em "-<8 caracteres>" ("logo-xb-metal-v3.webp" termina em
  // "-metal-v3"). Aqui o hash precisa ser um segmento inteiro entre o último
  // "-" e a extensão e ainda trazer dígito ou maiúscula — mistura que só o hash
  // tem. Um asset com hash e "-" no hash perde o immutable por essa regra: é o
  // lado barato do erro.
  const lastDash = stem.lastIndexOf("-");
  if (lastDash <= 0) return false;
  const candidateHash = stem.slice(lastDash + 1);
  return HASHED_SEGMENT.test(candidateHash) && /[0-9A-Z]/.test(candidateHash);
}

export function cacheControl(urlPath) {
  const fileName = path.posix.basename(urlPath);
  if (urlPath === "/" || fileName === "index.html") return "no-store";
  // Toda lápide de worker precisa ser rebuscada, senão o cliente preso continua
  // preso com a versão em cache do worker antigo.
  if (SERVICE_WORKER_BASENAME.test(fileName)) return "no-store";
  if (fileName === "manifest.webmanifest") {
    return "public, max-age=0, must-revalidate";
  }
  if (isHashedAssetPath(urlPath)) return "public, max-age=31536000, immutable";
  return "public, max-age=3600, must-revalidate";
}

function decodeRequestPath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const normalized = path.posix.normalize(`/${decoded}`);
  if (normalized.includes("\0") || normalized.startsWith("/..")) return null;
  return normalized;
}

let cachedRealRoot;
async function realRootDirectory() {
  if (cachedRealRoot === undefined) {
    try {
      cachedRealRoot = await realpath(publicDirectory);
    } catch {
      cachedRealRoot = null;
    }
  }
  return cachedRealRoot;
}

// `path.resolve` só contém a travessia lexicamente; um link simbólico dentro da
// raiz continua escapando dela. Reavaliamos o caminho real antes de servir.
async function resolveInsideRoot(candidate) {
  const root = await realRootDirectory();
  if (root === null) return candidate;
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    const lexicalRoot = path.resolve(publicDirectory);
    if (
      candidate !== lexicalRoot &&
      !candidate.startsWith(`${lexicalRoot}${path.sep}`)
    ) {
      return null;
    }
  }
  let real;
  try {
    real = await realpath(candidate);
  } catch {
    return candidate;
  }
  if (real !== root && !real.startsWith(`${root}${path.sep}`)) return null;
  return real;
}

async function isFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function sendText(
  response,
  status,
  body,
  contentType = "text/plain; charset=utf-8"
) {
  const buffer = Buffer.from(body);
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Length": buffer.byteLength,
    "Content-Type": contentType,
  });
  response.end(buffer);
}

function etagMatches(header, etag) {
  if (!header) return false;
  if (header.trim() === "*") return true;
  const bare = etag.replace(/^W\//, "");
  return header
    .split(",")
    .map(value => value.trim().replace(/^W\//, ""))
    .some(value => value === bare);
}

// RFC 9110 §13.1.3 proíbe usar validador fraco no If-Range, e é por isso que o
// ETag daqui é forte: tamanho + mtime identificam a representação exata que o
// cliente começou a baixar. Se o validador não bater, a retomada é de outra
// geração do arquivo e a resposta certa é o arquivo inteiro (200) — costurar
// bytes de duas gerações num 206 entrega um GLB corrompido ao jogador.
function ifRangeAllowsPartial(header, etag, mtimeMs) {
  if (!header) return true;
  const value = header.trim();
  if (value === "") return true;
  // Um W/"..." nunca autoriza resposta parcial, mesmo que case.
  if (value.startsWith("W/")) return false;
  if (value.startsWith('"')) return value === etag;
  const requested = Date.parse(value);
  if (Number.isNaN(requested)) return false;
  return Math.floor(mtimeMs / 1000) * 1000 === requested;
}

function notModifiedSince(header, mtimeMs) {
  if (!header) return false;
  const since = Date.parse(header);
  if (Number.isNaN(since)) return false;
  // Last-Modified só tem resolução de segundo; comparar em segundos evita 200
  // desnecessários por causa dos milissegundos truncados no cabeçalho.
  return Math.floor(mtimeMs / 1000) * 1000 <= since;
}

function parseRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  // Faixas múltiplas ou sintaxe estranha: ignoramos e devolvemos o arquivo todo.
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;
  let start;
  let end;
  if (rawStart === "") {
    const suffix = Number(rawEnd);
    if (!Number.isInteger(suffix) || suffix <= 0)
      return { unsatisfiable: true };
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Number(rawEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
    if (end > size - 1) end = size - 1;
  }
  if (size === 0 || start > end || start >= size)
    return { unsatisfiable: true };
  return { end, start };
}

function streamFile(response, filePath, options) {
  const stream = createReadStream(filePath, options);
  stream.on("error", () => {
    if (!response.headersSent)
      sendText(response, 500, "Falha ao ler o arquivo");
    else response.destroy();
  });
  stream.pipe(response);
}

const comprimir = promisify(gzip);

/**
 * O circuito de 800 m sai do Unreal com 1,3 MB de geometria em ponto
 * flutuante, e ponto flutuante repetido comprime cinco para um: 1.309 KB
 * viram 267 KB. Sem esta camada o jogador baixa o arquivo cru e o orcamento
 * de 1 MB do kit vira mentira — o teste mediria um numero que nao e o que
 * chega ao telefone.
 *
 * Comprimir e caro (dezenas de milissegundos no arquivo grande), entao o
 * resultado fica guardado por caminho e data do arquivo. Trocar o .glb muda a
 * data e invalida a entrada sozinho.
 */
const COMPRIMIVEL = new Set([
  ".css",
  ".glb",
  ".html",
  ".js",
  ".json",
  ".map",
  ".mjs",
  ".svg",
  ".txt",
  ".webmanifest",
]);
const COMPRIMIR_A_PARTIR_DE = 1024;
const LIMITE_DO_CACHE = 24;
const cacheComprimido = new Map();

function aceitaGzip(request) {
  const cabecalho = request.headers["accept-encoding"];
  if (typeof cabecalho !== "string") return false;
  return /\bgzip\b/i.test(cabecalho);
}

async function corpoComprimido(filePath, mtimeMs) {
  const chave = `${filePath}:${Math.trunc(mtimeMs)}`;
  const guardado = cacheComprimido.get(chave);
  if (guardado) return guardado;
  const bruto = await readFile(filePath);
  const pronto = await comprimir(bruto, { level: 9 });
  if (cacheComprimido.size >= LIMITE_DO_CACHE) {
    const primeira = cacheComprimido.keys().next().value;
    cacheComprimido.delete(primeira);
  }
  cacheComprimido.set(chave, pronto);
  return pronto;
}

async function sendFile(request, response, filePath, urlPath) {
  const details = await stat(filePath);
  const cache = cacheControl(urlPath);
  // Pedido com faixa continua sem compressao: faixa e sobre bytes do arquivo
  // cru, e misturar as duas coisas entrega pedaco errado sem erro nenhum.
  const comprime =
    !request.headers.range &&
    details.size >= COMPRIMIR_A_PARTIR_DE &&
    COMPRIMIVEL.has(path.extname(filePath).toLowerCase()) &&
    aceitaGzip(request);
  const etag = `"${details.size.toString(16)}-${Math.trunc(details.mtimeMs).toString(16)}${comprime ? "-gz" : ""}"`;
  const lastModified = new Date(
    Math.floor(details.mtimeMs / 1000) * 1000
  ).toUTCString();
  const contentType =
    mimeTypes.get(path.extname(filePath).toLowerCase()) ||
    "application/octet-stream";

  const conditional = request.headers["if-none-match"]
    ? etagMatches(request.headers["if-none-match"], etag)
    : notModifiedSince(request.headers["if-modified-since"], details.mtimeMs);
  if (conditional) {
    response.writeHead(304, {
      "Accept-Ranges": "bytes",
      "Cache-Control": cache,
      ETag: etag,
      "Last-Modified": lastModified,
    });
    response.end();
    return;
  }

  const range = ifRangeAllowsPartial(
    request.headers["if-range"],
    etag,
    details.mtimeMs
  )
    ? parseRange(request.headers.range, details.size)
    : null;
  if (range?.unsatisfiable) {
    response.writeHead(416, {
      "Accept-Ranges": "bytes",
      "Cache-Control": cache,
      "Content-Range": `bytes */${details.size}`,
      ETag: etag,
      "Last-Modified": lastModified,
    });
    response.end();
    return;
  }

  if (range) {
    response.writeHead(206, {
      "Accept-Ranges": "bytes",
      "Cache-Control": cache,
      "Content-Length": range.end - range.start + 1,
      "Content-Range": `bytes ${range.start}-${range.end}/${details.size}`,
      "Content-Type": contentType,
      ETag: etag,
      "Last-Modified": lastModified,
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    streamFile(response, filePath, { end: range.end, start: range.start });
    return;
  }

  if (comprime) {
    const corpo = await corpoComprimido(filePath, details.mtimeMs);
    response.writeHead(200, {
      "Cache-Control": cache,
      "Content-Encoding": "gzip",
      "Content-Length": corpo.byteLength,
      "Content-Type": contentType,
      ETag: etag,
      "Last-Modified": lastModified,
      Vary: "Accept-Encoding",
    });
    response.end(request.method === "HEAD" ? undefined : corpo);
    return;
  }

  response.writeHead(200, {
    "Accept-Ranges": "bytes",
    "Cache-Control": cache,
    "Content-Length": details.size,
    "Content-Type": contentType,
    ETag: etag,
    "Last-Modified": lastModified,
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  streamFile(response, filePath);
}

export function createStandaloneServer() {
  const server = createServer(async (request, response) => {
    applyHeaders(response);
    const method = request.method || "GET";
    if (method !== "GET" && method !== "HEAD") {
      response.setHeader("Allow", "GET, HEAD");
      sendText(response, 405, "Método não permitido");
      return;
    }

    const requestUrl = new URL(request.url || "/", "http://localhost");
    if (requestUrl.pathname === "/healthz") {
      sendText(
        response,
        200,
        JSON.stringify({
          status: "ok",
          game: "XBPNEUS Racing",
          version: RELEASE,
        }),
        "application/json; charset=utf-8"
      );
      return;
    }

    const decodedPath = decodeRequestPath(requestUrl.pathname);
    if (decodedPath === null) {
      sendText(response, 400, "Caminho inválido");
      return;
    }

    const relative = decodedPath.replace(/^\/+/, "");
    const candidate =
      relative === ""
        ? path.join(publicDirectory, "index.html")
        : path.resolve(publicDirectory, relative);
    const requestedFile = await resolveInsideRoot(candidate);
    if (requestedFile === null) {
      sendText(response, 400, "Caminho inválido");
      return;
    }

    if (await isFile(requestedFile)) {
      await sendFile(request, response, requestedFile, decodedPath);
      return;
    }

    // A decisão 404 x SPA usa o caminho já decodificado: em `/foo%2Ejs` a
    // extensão só aparece depois de decodificar.
    if (path.posix.extname(decodedPath)) {
      sendText(response, 404, "Arquivo não encontrado");
      return;
    }

    const fallback = await resolveInsideRoot(
      path.join(publicDirectory, "index.html")
    );
    if (fallback !== null && (await isFile(fallback))) {
      await sendFile(request, response, fallback, "/index.html");
      return;
    }
    sendText(response, 500, "Build do game não encontrado");
  });

  // Limites básicos de socket: sem eles um cliente lento segura conexões abertas
  // indefinidamente e derruba a disponibilidade do processo único.
  server.maxConnections = 1024;
  server.headersTimeout = 10_000;
  server.requestTimeout = 30_000;
  return server;
}

export function startStandaloneServer() {
  const port = readPort(process.env.PORT);
  const host = process.env.HOST || "127.0.0.1";
  const server = createStandaloneServer();
  server.listen(port, host, () => {
    const visibleHost = host === "0.0.0.0" ? "localhost" : host;
    const address = server.address();
    const boundPort =
      typeof address === "object" && address ? address.port : port;
    console.log(
      `XBPNEUS Racing ${RELEASE} disponível em http://${visibleHost}:${boundPort}`
    );
    console.log("Para encerrar, pressione Ctrl+C.");
  });

  const shutdown = signal => {
    console.log(`\n${signal} recebido; encerrando o game.`);
    server.close(error => {
      if (error) {
        console.error("Falha no encerramento", error);
        process.exitCode = 1;
      }
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  return server;
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(currentFile);
if (isDirectExecution) {
  try {
    startStandaloneServer();
  } catch (error) {
    console.error("Falha ao iniciar o XBPNEUS Racing", error);
    process.exitCode = 1;
  }
}

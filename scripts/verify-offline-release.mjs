import { spawn, spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { VITE_HASH_SOURCE } from "../server/standalone-server.mjs";

// XB_DIST permite apontar o verificador para uma build de teste sem tocar em
// dist/.
const DIST = process.env.XB_DIST ?? "dist";
// O worker conferido é o que a aplicação realmente registra.
const WORKER_URL =
  readFileSync("client/src/main.tsx", "utf8").match(
    /register\("(\/[^"]+\.js)"/
  )?.[1] ?? "/sw-v320.js";
const TOMBSTONE_URL = `/${readdirSync("client/public")
  .filter(
    file =>
      /^sw-v\d+\.js$/.test(file) && file !== path.posix.basename(WORKER_URL)
  )
  .sort()
  .at(-1)}`;

// A versão vem do pacote: repetir o número aqui só cria mais uma string de
// release para esquecer no próximo bump.
const RELEASE = JSON.parse(readFileSync("package.json", "utf8")).version;
// Todo worker publicado passa pelo verificador de sintaxe, ativo ou lápide:
// nada mais no `verify` olha para client/public.
const workerChecks = readdirSync("client/public")
  .filter(file => file.endsWith(".js"))
  .sort()
  .map(file => [
    `Sintaxe do worker ${file}`,
    ["--check", `client/public/${file}`],
  ]);

// Gates estáticos. Nenhum deles inspeciona string de bundle minificado: o que
// importa é o comportamento do servidor, verificado por HTTP logo abaixo.
const checks = [
  ["Integridade do código-fonte", ["scripts/source-integrity-check.mjs"]],
  ["Arquitetura 3.2 sem adaptadores", ["scripts/runtime-overlay-check.mjs"]],
  ["Sintaxe TypeScript/TSX", ["scripts/typescript-syntax-check.mjs"]],
  ["Testes de segurança", ["scripts/run-node-tests.mjs"]],
  ["Verificação de release", ["scripts/release-check.mjs"]],
  ["Integridade da distribuição", ["scripts/dist-integrity.mjs"]],
  ...workerChecks,
  ["Sintaxe do servidor fonte", ["--check", "server/standalone-server.mjs"]],
  [
    "Sintaxe do servidor distribuído",
    ["--check", `${DIST}/standalone-server.mjs`],
  ],
];

for (const [label, args] of checks) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Todo cabeçalho de segurança que a produção precisa entregar. HSTS entra aqui
// porque só existia no servidor Express aposentado.
const requiredHeaders = [
  ["content-security-policy", /default-src 'self'/],
  ["strict-transport-security", /max-age=31536000; includeSubDomains/],
  ["x-content-type-options", /^nosniff$/],
  ["x-frame-options", /^DENY$/],
  ["referrer-policy", /^no-referrer$/],
  ["cross-origin-opener-policy", /^same-origin$/],
  ["cross-origin-resource-policy", /^same-origin$/],
  ["permissions-policy", /camera=\(\)/],
  ["x-xbpneus-release", new RegExp(`^${RELEASE.replace(/\./g, "\\.")}$`)],
];

console.log("\n== Teste HTTP da distribuição real ==");
const server = spawn(process.execPath, [`${DIST}/standalone-server.mjs`], {
  env: { ...process.env, HOST: "127.0.0.1", PORT: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", chunk => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", chunk => {
  serverOutput += chunk.toString();
});

// PORT=0 deixa o SO escolher a porta; lemos a porta realmente aberta no log em
// vez de reservar uma "livre" antes, o que sempre tem janela de corrida.
async function waitForPort() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const match = /http:\/\/[^:\s]+:(\d+)/.exec(serverOutput);
    if (match) return Number(match[1]);
    if (server.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Servidor não abriu porta. Saída:\n${serverOutput}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const port = await waitForPort();
  const origin = `http://127.0.0.1:${port}`;

  const health = await fetch(`${origin}/healthz`);
  assert(health.status === 200, "/healthz não respondeu 200");
  assert(
    health.headers.get("content-type") === "application/json; charset=utf-8",
    "/healthz sem Content-Type JSON"
  );
  const healthData = await health.json();
  assert(healthData.status === "ok", "/healthz não reporta status ok");
  assert(healthData.version === RELEASE, `/healthz não reporta ${RELEASE}`);

  const index = await fetch(`${origin}/`);
  assert(index.status === 200, "/ não respondeu 200");
  assert(
    index.headers.get("content-type") === "text/html; charset=utf-8",
    "/ não entregou HTML com charset"
  );
  const indexHtml = await index.text();
  assert(
    indexHtml.includes(`data-xb-release="${RELEASE}"`),
    `HTML distribuído sem a marca ${RELEASE}`
  );
  assert(
    new RegExp(`/assets/index-${VITE_HASH_SOURCE}\\.js`).test(indexHtml),
    "HTML distribuído não carrega o bundle com hash do Vite"
  );

  for (const [header, expected] of requiredHeaders) {
    const value = index.headers.get(header) || "";
    assert(expected.test(value), `/ sem cabeçalho válido: ${header}`);
  }

  const manifest = await fetch(`${origin}/manifest.webmanifest`);
  assert(manifest.status === 200, "/manifest.webmanifest ausente");
  assert(
    manifest.headers.get("content-type") ===
      "application/manifest+json; charset=utf-8",
    "/manifest.webmanifest com MIME incorreto"
  );

  const worker = await fetch(`${origin}${WORKER_URL}`);
  assert(worker.status === 200, `${WORKER_URL} ausente`);
  assert(
    worker.headers.get("cache-control") === "no-store",
    "service worker precisa usar no-store"
  );
  // O cache precisa carregar o release: sem isso um PWA instalado guarda tudo
  // o que já cacheou sob a mesma chave, para sempre.
  const workerSource = await worker.text();
  const expectedCache = `xbpneus-racing-v${RELEASE.replaceAll(".", "")}`;
  const workerRelease = workerSource.match(/const RELEASE = "([^"]+)"/)?.[1];
  assert(
    workerRelease === RELEASE,
    `${WORKER_URL} anuncia release ${workerRelease} em vez de ${RELEASE} (cache esperado: ${expectedCache})`
  );

  // Uma lápide precisa continuar alcançável: é o resgate dos clientes presos.
  const tombstone = await fetch(`${origin}${TOMBSTONE_URL}`);
  assert(
    tombstone.status === 200,
    `${TOMBSTONE_URL} (lápide) não está publicado`
  );
  assert(
    (await tombstone.text()).includes("self.registration.unregister()"),
    `${TOMBSTONE_URL} não é uma lápide autodestrutiva`
  );

  // Contrato de cache no fio: todo asset com hash sai immutable, inclusive
  // aquele cujo hash contém "-".
  const hashedAssets = readdirSync(`${DIST}/public/assets`).filter(file =>
    new RegExp(`-${VITE_HASH_SOURCE}\\.(?:css|js)$`).test(file)
  );
  const withDash = hashedAssets.filter(file =>
    /-[A-Za-z0-9_]*-[A-Za-z0-9_-]*\.(?:css|js)$/.test(file)
  );
  assert(hashedAssets.length > 0, "build sem assets com hash");
  assert(
    withDash.length > 0,
    "nenhum asset com '-' no hash nesta build; o caso que quebrava não está coberto"
  );
  for (const file of [...withDash, ...hashedAssets.slice(0, 5)]) {
    const asset = await fetch(`${origin}/assets/${file}`, { method: "HEAD" });
    assert(asset.status === 200, `/assets/${file} ausente`);
    assert(
      (asset.headers.get("cache-control") || "").includes("immutable"),
      `/assets/${file} sem cache immutable (${asset.headers.get("cache-control")})`
    );
  }

  const packPath = "/assets/glb/entregador_web.glb";
  const pack = await fetch(`${origin}${packPath}`, { method: "HEAD" });
  assert(pack.status === 200, `${packPath} ausente`);
  assert(
    pack.headers.get("accept-ranges") === "bytes",
    `${packPath} não anuncia Accept-Ranges`
  );
  const etag = pack.headers.get("etag");
  assert(Boolean(etag), `${packPath} sem ETag`);

  const conditional = await fetch(`${origin}${packPath}`, {
    headers: { "If-None-Match": etag },
  });
  assert(
    conditional.status === 304,
    `${packPath} ignorou If-None-Match e devolveu ${conditional.status}`
  );

  const lastModified = pack.headers.get("last-modified");
  assert(Boolean(lastModified), `${packPath} sem Last-Modified`);
  const dated = await fetch(`${origin}${packPath}`, {
    headers: { "If-Modified-Since": lastModified },
  });
  assert(
    dated.status === 304,
    `${packPath} ignorou If-Modified-Since e devolveu ${dated.status}`
  );

  const ranged = await fetch(`${origin}${packPath}`, {
    headers: { Range: "bytes=0-1023" },
  });
  assert(
    ranged.status === 206,
    `${packPath} não suporta Range (status ${ranged.status})`
  );
  assert(
    /^bytes 0-1023\/\d+$/.test(ranged.headers.get("content-range") || ""),
    `${packPath} devolveu Content-Range inválido`
  );
  assert(
    (await ranged.arrayBuffer()).byteLength === 1024,
    `${packPath} devolveu corpo parcial com tamanho errado`
  );

  // If-Range com validador velho: o cliente está retomando outra geração do
  // arquivo, então a resposta certa é o arquivo inteiro, não um 206.
  const staleRange = await fetch(`${origin}${packPath}`, {
    headers: { Range: "bytes=0-99", "If-Range": '"deadbeef-1"' },
  });
  assert(
    staleRange.status === 200,
    `${packPath} honrou Range com If-Range velho (${staleRange.status})`
  );
  const freshRange = await fetch(`${origin}${packPath}`, {
    headers: { Range: "bytes=0-99", "If-Range": etag },
  });
  assert(
    freshRange.status === 206,
    `${packPath} recusou Range com If-Range válido (${freshRange.status})`
  );
  // RFC 9110 §13.1.3: validador fraco não pode servir de âncora para retomada.
  assert(
    !etag.startsWith("W/"),
    `${packPath} usa ETag fraco com suporte a Range`
  );
  const weakRange = await fetch(`${origin}${packPath}`, {
    headers: { Range: "bytes=0-99", "If-Range": `W/${etag}` },
  });
  assert(
    weakRange.status === 200,
    `${packPath} aceitou If-Range fraco (${weakRange.status})`
  );

  const missingScript = await fetch(`${origin}/assets/nao-existe.js`);
  assert(
    missingScript.status === 404,
    `script inexistente devolveu ${missingScript.status} em vez de 404`
  );
  const missingBody = await missingScript.text();
  assert(
    !missingBody.includes("<html"),
    "script inexistente caiu no fallback SPA em vez de 404"
  );

  // A extensão só aparece depois de decodificar: /foo%2Ejs também é um .js.
  const encodedMissing = await fetch(`${origin}/assets/nao-existe%2Ejs`);
  assert(
    encodedMissing.status === 404,
    `caminho percent-encoded devolveu ${encodedMissing.status} em vez de 404`
  );

  const spa = await fetch(`${origin}/rota/primeiro-pedal`);
  assert(spa.status === 200, "fallback SPA não respondeu 200");
  assert(
    (await spa.text()).includes(`data-xb-release="${RELEASE}"`),
    `fallback SPA não entregou o release ${RELEASE}`
  );

  console.log(`Servidor autônomo ${RELEASE}: OK`);
} finally {
  server.kill("SIGTERM");
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 1000);
    server.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

console.log("\nVERIFICACAO_OFFLINE_OK");

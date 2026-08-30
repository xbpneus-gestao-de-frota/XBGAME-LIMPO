import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VITE_HASH_SOURCE,
  cacheControl,
} from "../server/standalone-server.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
// package.json é a única fonte da versão; todo o resto é conferido contra ela.
const packageJson = JSON.parse(
  await readFile(path.join(projectRoot, "package.json"), "utf8")
);
const RELEASE = packageJson.version;
const OVERLAY_PATTERN =
  /v250-runtime|v260-pilot-fusion|v270-hud-focus|v280-neighborhood|v300-golden-route|v310-real-assets/;
// Mesma definição de hash que o servidor usa para decidir o cache imutável: com
// duas cópias, uma delas mente sobre os mesmos arquivos.
const HASHED_ENTRY_PATTERN = new RegExp(
  `/assets/index-${VITE_HASH_SOURCE}\\.js`
);

const ignoredDirectories = new Set([".git", "node_modules"]);
const blockedFileName = [".project", "-config.json"].join("");
const blockedDirectoryName = ["__", "manus", "__"].join("");
const blockedDirectoryNames = new Set([
  blockedDirectoryName,
  [".", "manus"].join(""),
  ".tmp-asset-preview",
]);
const remoteAssetPrefix = ["/", "manus", "-storage/"].join("");
const self = path.join("scripts", "release-check.mjs");
const directories = [];
const symlinks = [];

const secretKeyNames = "API_KEY|JWT_SECRET|ACCESS_TOKEN|OWNER_OPEN_ID";
const sensitiveValuePatterns = [
  /github_pat_[A-Za-z0-9_]{20,}/,
  /gh[opusr]_[A-Za-z0-9]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  new RegExp(`(?:${secretKeyNames})["']?\\s*[:=]\\s*["'][^"'\\s]{16,}["']`),
  // Sem aspas: é exatamente o formato de um .env real vazado.
  new RegExp(`(?:${secretKeyNames})\\s*=\\s*(?!["'])[^\\s"'#]{16,}`),
  /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{16,}/,
  /AKIA[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /xox[abprs]-[A-Za-z0-9-]{10,}/,
  /sk_live_[A-Za-z0-9]{16,}/,
  /_authToken\s*=\s*\S+/,
  /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:/@]+:[^\s@/]+@/,
];

// A documentação e o .env.example citam credenciais de mentira. Bloquear o
// release por causa delas transformaria o gate em ruído e ensinaria a equipe a
// ignorá-lo, então marcadores óbvios de exemplo não contam como vazamento.
const placeholderHint =
  /:(?:pass|password|senha|secret|user|usuario|token)@|xxxx|<[^>]*>|change[-_]?me|your[-_]|seu[-_]|exemplo|example|placeholder|\.{3}/i;

function findSecret(content) {
  for (const pattern of sensitiveValuePatterns) {
    const scanner = new RegExp(pattern.source, `${pattern.flags}g`);
    for (const match of content.matchAll(scanner)) {
      if (!placeholderHint.test(match[0])) return true;
    }
  }
  return false;
}

const failures = [];

async function readText(relativePath) {
  try {
    return await readFile(path.join(projectRoot, relativePath), "utf8");
  } catch {
    failures.push(`${relativePath}: arquivo obrigatório ausente ou ilegível`);
    return null;
  }
}

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        directories.push(relativePath);
        files.push(
          ...(await listFiles(path.join(directory, entry.name), relativePath))
        );
      }
      continue;
    }

    if (entry.isFile()) files.push(relativePath);
    if (entry.isSymbolicLink()) symlinks.push(relativePath);
  }

  return files;
}

const files = await listFiles(projectRoot);

for (const directory of directories) {
  if (directory.split(path.sep).some(part => blockedDirectoryNames.has(part))) {
    failures.push(`${directory}: diretório do ambiente de autoria incluído`);
  }
}

for (const symlink of symlinks) {
  failures.push(`${symlink}: link simbólico não permitido na distribuição`);
}

for (const relativePath of files) {
  const parts = relativePath.split(path.sep);
  if (path.basename(relativePath) === blockedFileName) {
    failures.push(`${relativePath}: configuração privada incluída`);
  }
  if (
    path.basename(relativePath).startsWith(".env") &&
    path.basename(relativePath) !== ".env.example"
  ) {
    failures.push(`${relativePath}: arquivo de ambiente privado incluído`);
  }
  if (parts.some(part => blockedDirectoryNames.has(part))) {
    failures.push(`${relativePath}: artefato do ambiente de autoria incluído`);
  }
  if (/\.(?:7z|gz|rar|tar|tgz|zip)$/i.test(relativePath)) {
    failures.push(`${relativePath}: arquivo compactado aninhado incluído`);
  }

  if (
    relativePath === self ||
    /\.(?:bin|fbx|uasset|png|jpe?g|gif|webp|woff2?|ico|zip)$/i.test(
      relativePath
    )
  ) {
    continue;
  }

  let content;
  try {
    content = await readFile(path.join(projectRoot, relativePath), "utf8");
  } catch {
    failures.push(`${relativePath}: arquivo ilegível durante a varredura`);
    continue;
  }
  if (content.includes(remoteAssetPrefix)) {
    failures.push(`${relativePath}: referência a armazenamento externo`);
  }
  // Nunca ecoar o valor encontrado: o log do CI é lido por mais gente que o repo.
  if (findSecret(content)) {
    failures.push(`${relativePath}: possível credencial em texto claro`);
  }
}

if (!/^\d+\.\d+\.\d+$/.test(RELEASE ?? "")) {
  failures.push("package.json: versão precisa ser um semver x.y.z");
}

const sourceHtml = await readText(path.join("client", "index.html"));
const sourceMain = await readText(path.join("client", "src", "main.tsx"));
const sourceServer = await readText(
  path.join("server", "standalone-server.mjs")
);
const renderConfig = await readText("render.yaml");
const distHtml = await readText(path.join("dist", "public", "index.html"));

if (sourceHtml !== null) {
  if (!sourceHtml.includes(`data-xb-release="${RELEASE}"`)) {
    failures.push(`client/index.html: release ${RELEASE} ausente`);
  }
  if (OVERLAY_PATTERN.test(sourceHtml)) {
    failures.push(
      "client/index.html: overlay histórico ainda participa do boot"
    );
  }
}
// O worker ativo é descoberto pelo que a aplicação registra, não por um nome
// congelado aqui: era isso que deixava o gate aplaudir a versão 3.2 em cima de
// quatro releases.
const workerUrl = sourceMain?.match(/register\("(\/[^"]+\.js)"/)?.[1] ?? null;
if (sourceMain !== null && workerUrl === null) {
  failures.push("client/src/main.tsx: nenhum service worker é registrado");
}
const workerFileName =
  workerUrl === null ? null : path.posix.basename(workerUrl);
if (workerUrl !== null && sourceHtml !== null) {
  if (!sourceHtml.includes(`content="${workerUrl}"`)) {
    failures.push(
      `client/index.html: o meta xb-service-worker não aponta para ${workerUrl}`
    );
  }
}
if (sourceServer !== null) {
  if (!sourceServer.includes(`const RELEASE = "${RELEASE}"`)) {
    failures.push(`server/standalone-server.mjs: release ${RELEASE} incorreto`);
  }
  if (!sourceServer.includes("Strict-Transport-Security")) {
    failures.push("server/standalone-server.mjs: HSTS ausente");
  }
}
const expectedCacheName = `xbpneus-racing-v${RELEASE.replaceAll(".", "")}`;
if (workerFileName !== null) {
  const sourceWorker = await readText(
    path.join("client", "public", workerFileName)
  );
  if (sourceWorker !== null) {
    const workerRelease = sourceWorker.match(/const RELEASE = "([^"]+)"/)?.[1];
    if (workerRelease !== RELEASE) {
      failures.push(
        `client/public/${workerFileName}: release ${workerRelease ?? "ausente"} diverge de package.json (${RELEASE})`
      );
    }
    // O valor conferido é o DERIVADO. Um literal escrito à mão sobrevive a
    // qualquer bump de versão e foi o que prendeu o cache em v320.
    if (
      !/const CACHE_NAME = `xbpneus-racing-v\$\{RELEASE[^`]*\}`;/.test(
        sourceWorker
      )
    ) {
      failures.push(
        `client/public/${workerFileName}: o nome do cache precisa ser derivado do release (esperado ${expectedCacheName})`
      );
    }
    if (sourceWorker.includes("self.registration.unregister()")) {
      failures.push(
        `client/public/${workerFileName}: o worker ativo se autodestrói como lápide`
      );
    }
    if (!/addEventListener\(\s*["']fetch["']/.test(sourceWorker)) {
      failures.push(
        `client/public/${workerFileName}: worker ativo sem handler de fetch; o jogo não abre offline`
      );
    }
  }
}

// Toda lápide precisa continuar publicada: é o único caminho que liberta um
// cliente PWA preso numa geração antiga do worker. A lista é derivada do
// diretório — um worker aposentado novo entra no gate sozinho.
let workerFiles = [];
try {
  workerFiles = (await readdir(path.join(projectRoot, "client", "public")))
    .filter(name => /^sw-v\d+\.js$/.test(name))
    .sort();
} catch {
  failures.push("client/public: diretório do worker ausente");
}
if (workerFileName !== null && !workerFiles.includes(workerFileName)) {
  failures.push(
    `client/public/${workerFileName}: worker registrado não existe`
  );
}
for (const legacy of workerFiles) {
  if (legacy === workerFileName) continue;
  const tombstone = await readText(path.join("client", "public", legacy));
  if (tombstone === null) continue;
  if (!tombstone.includes("self.registration.unregister()")) {
    failures.push(`client/public/${legacy}: lápide não se desregistra`);
  }
  if (/addEventListener\(\s*["']fetch["']/.test(tombstone)) {
    failures.push(`client/public/${legacy}: lápide ainda intercepta fetch`);
  }
}

// Nenhuma string de release pode ficar para trás num bump de versão. O HTML, o
// servidor e o worker já foram conferidos acima; faltava o manifesto de deploy,
// que anunciou 3.2.0 durante quatro releases sem ninguém olhar.
if (renderConfig !== null) {
  const declared = renderConfig.match(/XB_RELEASE\s*\n\s*value:\s*(\S+)/)?.[1];
  if (declared !== RELEASE) {
    failures.push(
      `render.yaml: XB_RELEASE ${declared ?? "ausente"} diverge de package.json (${RELEASE})`
    );
  }
}

// Script nenhum pode voltar a fixar a versão: foi assim que a build 3.5.0
// sobrescreveu SHA256SUMS_3.2.0.txt.
for (const script of files.filter(
  file => file.startsWith(`scripts${path.sep}`) && file.endsWith(".mjs")
)) {
  const content = await readText(script);
  if (content === null) continue;
  if (/const RELEASE = "\d+\.\d+\.\d+"/.test(content)) {
    failures.push(`${script}: versão fixada no código; leia de package.json`);
  }
}

if (distHtml !== null) {
  if (!distHtml.includes(`data-xb-release="${RELEASE}"`)) {
    failures.push(`dist/public/index.html: release ${RELEASE} ausente`);
  }
  if (!HASHED_ENTRY_PATTERN.test(distHtml)) {
    failures.push(
      "dist/public/index.html: bundle com hash do Vite (/assets/index-*.js) ausente"
    );
  }
  if (OVERLAY_PATTERN.test(distHtml)) {
    failures.push(
      "dist/public/index.html: adaptador de compatibilidade ainda referenciado"
    );
  }
}

const distAssets = path.join(projectRoot, "dist", "public", "assets");
try {
  const distributedAssets = await readdir(distAssets);
  for (const fileName of distributedAssets) {
    if (OVERLAY_PATTERN.test(fileName)) {
      failures.push(
        `dist/public/assets/${fileName}: adaptador aposentado distribuído`
      );
    }
  }
} catch {
  failures.push("dist/public/assets: diretório da build ausente");
}

// ---------------------------------------------------------------------------
// Contrato de cache conferido contra a BUILD REAL, com o classificador do
// próprio servidor. O oráculo é independente do nome: um arquivo que existe em
// client/public foi batizado à mão e sua URL muda de conteúdo; qualquer outro
// arquivo dentro de /assets saiu do bundler com hash de conteúdo. Um hash
// contendo "-" perdendo o `immutable` reprova aqui — era o caso de 27 dos 232
// chunks da 3.5.0, incluindo o único CSS do app.
// ---------------------------------------------------------------------------
async function listTree(absoluteDirectory, prefix = "") {
  const found = [];
  let entries;
  try {
    entries = await readdir(absoluteDirectory, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      found.push(
        ...((await listTree(
          path.join(absoluteDirectory, entry.name),
          relativePath
        )) ?? [])
      );
      continue;
    }
    found.push(relativePath);
  }
  return found;
}

const publicAssetsDirectory = path.join(
  projectRoot,
  "client",
  "public",
  "assets"
);
const handWritten = new Set((await listTree(publicAssetsDirectory)) ?? []);
for (const relativePath of handWritten) {
  // A regra do servidor só dispensa a heurística de entropia em .js/.css
  // porque nenhum arquivo batizado à mão nasce com essas extensões.
  if (/\.(?:css|js|mjs)$/.test(relativePath)) {
    failures.push(
      `client/public/assets/${relativePath}: script/estilo batizado à mão colide com o espaço de nomes do bundler`
    );
  }
}

const distributedTree = await listTree(distAssets);
if (distributedTree === null) {
  failures.push("dist/public/assets: árvore da build ilegível");
} else {
  let immutableCount = 0;
  for (const relativePath of distributedTree) {
    const policy = cacheControl(`/assets/${relativePath}`);
    const isImmutable = policy.includes("immutable");
    if (handWritten.has(relativePath)) {
      if (isImmutable) {
        failures.push(
          `dist/public/assets/${relativePath}: arquivo mutável servido como immutable`
        );
      }
      continue;
    }
    if (!isImmutable) {
      failures.push(
        `dist/public/assets/${relativePath}: asset com hash sem cache immutable (${policy})`
      );
      continue;
    }
    immutableCount += 1;
  }
  if (immutableCount === 0) {
    failures.push("dist/public/assets: nenhum asset com hash na distribuição");
  }
}

// Os assets reais são consumidos pelo cliente tipado; entregador.png não é lido
// por código algum e por isso saiu do pré-cache do worker.
const gltfAssets = ["XB_Road_Straight.glb", "entregador_web.glb"];
for (const fileName of gltfAssets) {
  for (const base of [
    path.join(projectRoot, "client", "public", "assets", "glb"),
    path.join(projectRoot, "dist", "public", "assets", "glb"),
  ]) {
    const target = path.join(base, fileName);
    try {
      const stats = await stat(target);
      if (!stats.isFile() || stats.size === 0) {
        failures.push(`${path.relative(projectRoot, target)}: arquivo vazio`);
      }
    } catch {
      failures.push(`${path.relative(projectRoot, target)}: ausente`);
    }
  }
}

for (const script of ["check", "test", "build", "start"]) {
  if (!packageJson.scripts?.[script])
    failures.push(`package.json: script obrigatório ausente (${script})`);
}
if (!packageJson.packageManager?.startsWith("pnpm@")) {
  failures.push("package.json: packageManager do pnpm não está fixado");
}
if (!packageJson.engines?.node)
  failures.push("package.json: versão do Node não está declarada");

const directDependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};
for (const [name, version] of Object.entries(directDependencies)) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    failures.push(`package.json: dependência direta não fixada (${name})`);
  }
}

const viteVersion = directDependencies.vite;
if (viteVersion) {
  const [major, minor, patch] = viteVersion.split(".").map(Number);
  const isPatched =
    major > 7 || (major === 7 && (minor > 3 || (minor === 3 && patch >= 5)));
  if (!isPatched)
    failures.push("package.json: Vite precisa ser 7.3.5 ou superior");
}

const assetModule = await readText(
  path.join("client", "src", "game", "assets.ts")
);
let referencedAssets = [];
if (assetModule !== null) {
  referencedAssets = [
    ...assetModule.matchAll(/["']\/assets\/([^"']+)["']/g),
  ].map(match => match[1]);
  if (referencedAssets.length === 0)
    failures.push("assets.ts: nenhum ativo local encontrado");
}

for (const asset of referencedAssets) {
  const assetPath = path.join(projectRoot, "client", "public", "assets", asset);
  try {
    const details = await stat(assetPath);
    if (!details.isFile() || details.size === 0)
      failures.push(`ativo inválido: ${asset}`);
  } catch {
    failures.push(`ativo ausente: ${asset}`);
  }
}

if (failures.length > 0) {
  console.error(
    "Release bloqueado:\n" + failures.map(failure => `- ${failure}`).join("\n")
  );
  process.exitCode = 1;
} else {
  console.log(
    `Release verificado: ${files.length} arquivos, ${referencedAssets.length} ativos locais e nenhum segredo detectado.`
  );
}

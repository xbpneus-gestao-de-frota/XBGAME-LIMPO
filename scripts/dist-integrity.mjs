import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { VITE_HASH_SOURCE } from "../server/standalone-server.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
// A versão vem do pacote. Fixá-la aqui fez a build 3.5.0 sobrescrever
// SHA256SUMS_3.2.0.txt: nenhum manifesto de 3.3/3.4/3.5 chegou a existir e o de
// 3.2.0 passou a mentir sobre uma distribuição que não era a dele.
const RELEASE = JSON.parse(
  await readFile(path.join(projectRoot, "package.json"), "utf8")
).version;
// XB_DIST existe para verificar uma build de teste fora de dist/; o manifesto
// acompanha a raiz escolhida.
const distRoot = path.resolve(projectRoot, process.env.XB_DIST ?? "dist");
const manifestRoot = path.dirname(distRoot);
const SUMS_FILE = `SHA256SUMS_${RELEASE}.txt`;
const shouldWrite = process.argv.includes("--write");

// O bundler é a única origem de um nome com hash de conteúdo dentro de /assets;
// o padrão do hash é o mesmo que o servidor usa para decidir o cache imutável.
const BUNDLED_ASSET = new RegExp(`-${VITE_HASH_SOURCE}\\.[A-Za-z0-9]+$`);
const SOURCE_PUBLIC = path.join(projectRoot, "client", "public");
// O servidor autonomo vem em DUAS pecas desde 07/09/2026: quem serve o jogo e
// quem atende o XBWAPP. As duas viajam juntas — sem a segunda, a primeira nao
// sobe, porque a importa. Este portao confere as duas pelo conteudo.
const PECAS_DO_SERVIDOR = [
  "standalone-server.mjs",
  "xbwapp-atendimento.mjs",
];
const SOURCE_SERVER_DIR = path.join(projectRoot, "server");

const failures = [];

async function hashFile(absolutePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(absolutePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function collect(absoluteDirectory, prefix = "") {
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relativePath = path.posix.join(prefix, entry.name);
    const absolute = path.join(absoluteDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collect(absolute, relativePath)));
      continue;
    }
    // Um link simbólico dentro da distribuição não é conteúdo verificável:
    // aponta para fora do pacote e quebra a reprodutibilidade do hash.
    if (!entry.isFile()) {
      failures.push(`${relativePath}: entrada não regular na distribuição`);
      continue;
    }
    files.push(relativePath);
  }
  return files;
}

async function hashTree(absoluteDirectory) {
  const files = await collect(absoluteDirectory);
  const hashes = new Map();
  for (const relativePath of files) {
    hashes.set(
      relativePath,
      await hashFile(path.join(absoluteDirectory, relativePath))
    );
  }
  return hashes;
}

function formatLine(hash, relativePath) {
  return `${hash}  ${relativePath}`;
}

let distributed;
try {
  distributed = await hashTree(distRoot);
} catch {
  console.error("DIST_INTEGRITY_FAIL");
  console.error(
    `- ${path.relative(projectRoot, distRoot)}/: distribuição ausente; rode a build antes deste gate`
  );
  process.exit(1);
}

if (distributed.size === 0) {
  console.error("DIST_INTEGRITY_FAIL");
  console.error(
    `- ${path.relative(projectRoot, distRoot)}/: distribuição vazia`
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Conferência contra a FONTE. É isto que dá dente ao gate: o manifesto sozinho
// não prova nada, porque a mesma cadeia que monta a build também o reescreve
// com `--write` segundos antes de compará-lo consigo mesmo.
// ---------------------------------------------------------------------------

const source = await hashTree(SOURCE_PUBLIC);
for (const [relativePath, hash] of source) {
  const shipped = distributed.get(path.posix.join("public", relativePath));
  if (shipped === undefined) {
    failures.push(
      `public/${relativePath}: arquivo de client/public não foi distribuído`
    );
    continue;
  }
  if (shipped !== hash) {
    failures.push(
      `public/${relativePath}: conteúdo diverge de client/${path.posix.join("public", relativePath)}`
    );
  }
}

for (const peca of PECAS_DO_SERVIDOR) {
  const esperado = await hashFile(path.join(SOURCE_SERVER_DIR, peca));
  if (distributed.get(peca) !== esperado) {
    failures.push(`${peca}: distribuído diverge de server/${peca}`);
  }
}

// Todo arquivo distribuído precisa ter uma origem conhecida: cópia literal de
// client/public, o index.html gerado pelo Vite, um asset com hash do bundler ou
// o servidor autônomo. Qualquer outra coisa entrou na distribuição por fora.
const bundled = [];
for (const relativePath of distributed.keys()) {
  if (PECAS_DO_SERVIDOR.includes(relativePath)) continue;
  if (!relativePath.startsWith("public/")) {
    failures.push(`${relativePath}: arquivo fora de public/ na distribuição`);
    continue;
  }
  const insidePublic = relativePath.slice("public/".length);
  if (source.has(insidePublic)) continue;
  if (insidePublic === "index.html") continue;
  if (
    insidePublic.startsWith("assets/") &&
    BUNDLED_ASSET.test(path.posix.basename(insidePublic))
  ) {
    bundled.push(insidePublic);
    continue;
  }
  failures.push(
    `${relativePath}: não veio de client/public nem do bundler; origem desconhecida`
  );
}

const indexHtmlPath = path.join(distRoot, "public", "index.html");
let indexHtml = null;
try {
  indexHtml = await readFile(indexHtmlPath, "utf8");
} catch {
  failures.push("public/index.html: ausente na distribuição");
}
if (indexHtml !== null) {
  if (!indexHtml.includes(`data-xb-release="${RELEASE}"`)) {
    failures.push(
      `public/index.html: release ${RELEASE} ausente no HTML distribuído`
    );
  }
  if (!new RegExp(`/assets/index-${VITE_HASH_SOURCE}\\.js`).test(indexHtml)) {
    failures.push("public/index.html: bundle de entrada com hash ausente");
  }
}

// Um arquivo com nome de hash que ninguém referencia não veio desta build.
if (indexHtml !== null && bundled.length > 0) {
  const referencedIn = [indexHtml];
  for (const relativePath of bundled) {
    if (!/\.(?:css|js|mjs)$/.test(relativePath)) continue;
    referencedIn.push(
      await readFile(path.join(distRoot, "public", relativePath), "latin1")
    );
  }
  const haystack = referencedIn.join("\n");
  for (const relativePath of bundled) {
    if (!haystack.includes(path.posix.basename(relativePath))) {
      failures.push(
        `public/${relativePath}: asset com hash que nada referencia`
      );
    }
  }
}

if (failures.length > 0) {
  console.error("DIST_INTEGRITY_FAIL");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

const measured = new Map(
  [...distributed].map(([relativePath, hash]) => [
    path.posix.join(path.basename(distRoot), relativePath),
    hash,
  ])
);

if (shouldWrite) {
  const body = [...measured]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([relativePath, hash]) => formatLine(hash, relativePath))
    .join("\n");
  await writeFile(path.join(manifestRoot, SUMS_FILE), `${body}\n`, "utf8");
  console.log(
    `DIST_INTEGRITY_WRITTEN (${measured.size} arquivos em ${SUMS_FILE})`
  );
  process.exit(0);
}

let recorded;
try {
  recorded = await readFile(path.join(manifestRoot, SUMS_FILE), "utf8");
} catch {
  console.error("DIST_INTEGRITY_FAIL");
  console.error(`- ${SUMS_FILE}: manifesto ausente; gere com --write`);
  process.exit(1);
}

const expected = new Map();
for (const [index, line] of recorded.split("\n").entries()) {
  if (line.trim() === "") continue;
  const match = /^([0-9a-f]{64}) {2}(.+)$/.exec(line);
  if (!match) {
    failures.push(`${SUMS_FILE}:${index + 1}: linha fora do formato sha256sum`);
    continue;
  }
  expected.set(match[2], match[1]);
}

for (const [relativePath, hash] of expected) {
  const actual = measured.get(relativePath);
  if (actual === undefined) {
    failures.push(`${relativePath}: listado no manifesto mas ausente na build`);
    continue;
  }
  if (actual !== hash) {
    failures.push(`${relativePath}: conteúdo diverge do manifesto`);
  }
}

for (const relativePath of measured.keys()) {
  if (!expected.has(relativePath)) {
    failures.push(`${relativePath}: presente na build mas fora do manifesto`);
  }
}

if (failures.length > 0) {
  console.error("DIST_INTEGRITY_FAIL");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`DIST_INTEGRITY_OK (${measured.size} arquivos conferidos)`);

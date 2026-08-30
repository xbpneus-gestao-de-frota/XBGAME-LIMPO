import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

// Este gate já foi quatro regex atrás de quatro bugs históricos concretos: uma
// declaração `let feature: AbstractMesh` duplicada, uma linha de rotação de
// telhado duplicada, um literal de Y negativo e uma string exata de useState.
// Nenhuma delas era invariante — bastava reintroduzir o mesmo bug com outro
// nome de variável ou outro espaçamento para passar. Foram substituídas:
//
// - declaração duplicada no mesmo escopo é erro TS2451; quem pega é o
//   `tsc --noEmit`, e o que se confere aqui é que ele continua no caminho do
//   `verify` (nenhum gate serve desligado);
// - statement copiado e colado vira a varredura genérica abaixo, que não
//   depende do nome nem do espaçamento;
// - "o cenário não pode estar enterrado" é comportamento, não texto: quem
//   afirma isso é tests/game/neighborhood.test.ts, que monta o bairro e exige
//   `position.y >= 0` em cada lote.

const projectRoot = process.cwd();
const failures = [];

const SOURCE_ROOTS = ["client/src", "client/public", "server", "scripts"];
const SOURCE_FILE = /\.(?:ts|tsx|mjs|js)$/;

async function collect(directory) {
  let entries;
  try {
    entries = await readdir(path.join(projectRoot, directory), {
      withFileTypes: true,
    });
  } catch {
    failures.push(`${directory}: diretório de fonte ausente`);
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(relativePath)));
    else if (SOURCE_FILE.test(entry.name)) files.push(relativePath);
  }
  return files;
}

// Uma atribuição repetida na linha seguinte é sempre defeito: ou é código morto
// ou é o segundo lado de um copiar-colar que esqueceu de mudar o alvo. Vale
// para `const x = ...`, `let x = ...` e `alvo.prop = ...`; compostos (`+=`,
// `-=`, ...) ficam de fora porque repetir um acumulador é legítimo.
const ASSIGNMENT =
  /^(?:const |let |var )?[A-Za-z_$][\w$.[\]"'`?]*\s=\s[^=].*;$/;

const sourceFiles = (await Promise.all(SOURCE_ROOTS.map(collect))).flat();
for (const relativePath of sourceFiles) {
  const lines = (
    await readFile(path.join(projectRoot, relativePath), "utf8")
  ).split("\n");
  for (let index = 1; index < lines.length; index += 1) {
    const previous = lines[index - 1].trim();
    const current = lines[index].trim();
    if (previous !== current || previous.length < 12) continue;
    if (!ASSIGNMENT.test(current)) continue;
    failures.push(
      `${relativePath}:${index + 1}: atribuição repetida na linha seguinte (${current})`
    );
  }
}

// Um gate desligado não protege nada: `tsc --noEmit` é quem reprova declaração
// duplicada, e ele precisa continuar dentro do caminho que o CI roda.
const packageJson = JSON.parse(
  await readFile(path.join(projectRoot, "package.json"), "utf8")
);
const scripts = packageJson.scripts ?? {};
if (!/tsc --noEmit/.test(scripts.check ?? "")) {
  failures.push("package.json: o script check não roda tsc --noEmit");
}
if (!/run check/.test(scripts.lint ?? "")) {
  failures.push("package.json: o script lint não roda o check de tipos");
}
if (!/run lint/.test(scripts.verify ?? "")) {
  failures.push("package.json: o verify não roda o lint");
}

if (failures.length > 0) {
  console.error("SOURCE_INTEGRITY_FAIL");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`SOURCE_INTEGRITY_OK (${sourceFiles.length} arquivos varridos)`);

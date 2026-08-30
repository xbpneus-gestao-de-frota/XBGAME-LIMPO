import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import process from "node:process";

// Um glob que não casa com nada é silêncio, não sucesso: `node --test
// tests/game/*.test.mjs security/*.test.mjs` rodava só a metade de si mesmo
// porque todo teste de jogo é .ts (esses rodam no vitest) — e o node sai 0
// tanto com o glob literal quanto com o glob vazio. Aqui a lista é descoberta
// e diretório sem suíte reprova.
const ROOTS = ["security"];

const suites = [];
for (const root of ROOTS) {
  let entries;
  try {
    entries = readdirSync(root);
  } catch {
    console.error("NODE_TEST_FAIL");
    console.error(`- ${root}/: diretório de suítes ausente`);
    process.exit(1);
  }
  const found = entries
    .filter(file => file.endsWith(".test.mjs"))
    .map(file => `${root}/${file}`);
  if (found.length === 0) {
    console.error("NODE_TEST_FAIL");
    console.error(`- ${root}/: nenhuma suíte *.test.mjs encontrada`);
    process.exit(1);
  }
  suites.push(...found.sort());
}

const result = spawnSync(process.execPath, ["--test", ...suites], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);

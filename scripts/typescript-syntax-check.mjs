import { createRequire } from "node:module";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);
// Este script só valida SINTAXE (transpileModule não faz checagem de tipos);
// `tsc --noEmit` continua sendo obrigatório e é rodado pelo script `check`.
const typescript = require("typescript");

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(fullPath)));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

const files = await collect("client/src");
const failures = [];
for (const file of files) {
  const source = await readFile(file, "utf8");
  const result = typescript.transpileModule(source, {
    compilerOptions: {
      target: typescript.ScriptTarget.ES2022,
      module: typescript.ModuleKind.ESNext,
      jsx: typescript.JsxEmit.ReactJSX,
      strict: true,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  for (const diagnostic of result.diagnostics ?? []) {
    if (diagnostic.category !== typescript.DiagnosticCategory.Error) continue;
    failures.push(
      `${file}: ${typescript.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`
    );
  }
}

if (failures.length > 0) {
  console.error("TYPESCRIPT_SYNTAX_FAIL");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`TYPESCRIPT_SYNTAX_OK (${files.length} arquivos)`);

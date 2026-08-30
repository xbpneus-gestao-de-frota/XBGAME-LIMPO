import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  cacheControl,
  createStandaloneServer,
  securityHeaders,
} from "../server/standalone-server.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const read = file => readFile(new URL(`../${file}`, import.meta.url), "utf8");

async function listTree(absoluteDirectory, prefix = "") {
  const found = [];
  for (const entry of await readdir(absoluteDirectory, {
    withFileTypes: true,
  })) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      found.push(
        ...(await listTree(
          path.join(absoluteDirectory, entry.name),
          relativePath
        ))
      );
      continue;
    }
    found.push(relativePath);
  }
  return found;
}

function parseDirectives(policy) {
  const directives = new Map();
  for (const chunk of policy.split(";")) {
    const tokens = chunk.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    directives.set(tokens[0], tokens.slice(1));
  }
  return directives;
}

async function withServer(run) {
  const server = createStandaloneServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test("dependencies and runtime are reproducibly pinned", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const versions = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  assert.equal(packageJson.engines.node, "22.18.0");
  assert.equal(packageJson.engines.pnpm, "10.15.1");
  assert.equal(packageJson.devDependencies.vite, "7.3.5");
  // Ordem, nao formato: o portao precisa montar a build antes de auditar,
  // e a auditoria de integridade precisa participar. Casar a string exata
  // fazia o teste quebrar a cada ajuste de script sem defeito nenhum.
  const verifySteps = packageJson.scripts.verify;
  const buildAt = verifySteps.indexOf("run build");
  const releaseAt = verifySteps.indexOf("run release:check");
  const integrityAt = verifySteps.indexOf("run dist:integrity");
  assert.ok(buildAt >= 0, "o portao precisa montar a build");
  assert.ok(
    releaseAt > buildAt,
    "a auditoria de release precisa rodar depois da build"
  );
  assert.ok(
    integrityAt > buildAt,
    "a integridade do dist precisa rodar depois da build"
  );
  assert.ok(
    verifySteps.includes("run test"),
    "o portao precisa rodar os testes"
  );
  assert.ok(
    Object.values(versions).every(version => /^\d+\.\d+\.\d+$/.test(version)),
    "dependency versions must not use ranges or tags"
  );
});

test("development and preview servers stay on loopback", async () => {
  const viteConfig = await read("vite.config.ts");
  const packageJson = await read("package.json");

  assert.doesNotMatch(viteConfig, /host:\s*true/);
  assert.match(viteConfig, /host:\s*"127\.0\.0\.1"/);
  assert.doesNotMatch(
    packageJson,
    /vite (?:preview )?--host(?:"|\s+(?:0\.0\.0\.0|::))/
  );
});

test("the deployed server publishes a restrictive content security policy", () => {
  const policy = securityHeaders["Content-Security-Policy"];
  const directives = parseDirectives(policy);

  assert.deepEqual(directives.get("default-src"), ["'self'"]);
  assert.deepEqual(directives.get("frame-ancestors"), ["'none'"]);
  assert.deepEqual(directives.get("object-src"), ["'none'"]);
  assert.deepEqual(directives.get("base-uri"), ["'self'"]);
  assert.deepEqual(directives.get("script-src"), ["'self'"]);
  assert.deepEqual(directives.get("connect-src"), ["'self'"]);
  assert.deepEqual(directives.get("form-action"), ["'self'"]);
  assert.ok(
    [...directives.values()].every(
      sources => !sources.includes("'unsafe-eval'")
    ),
    "no directive may allow 'unsafe-eval'"
  );
  assert.ok(
    !directives.get("script-src").includes("'unsafe-inline'"),
    "scripts must not be allowed inline"
  );
});

test("the deployed server publishes the transport and isolation headers", () => {
  const hsts = securityHeaders["Strict-Transport-Security"];
  const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1]);

  assert.ok(maxAge >= 31_536_000, "HSTS must last at least one year");
  assert.match(hsts, /includeSubDomains/);
  assert.equal(securityHeaders["X-Content-Type-Options"], "nosniff");
  assert.equal(securityHeaders["Referrer-Policy"], "no-referrer");
  assert.equal(securityHeaders["Cross-Origin-Resource-Policy"], "same-origin");
  assert.equal(securityHeaders["Cross-Origin-Opener-Policy"], "same-origin");
  assert.equal(securityHeaders["X-Frame-Options"], "DENY");
});

test("the running server actually sends every declared header", async () => {
  await withServer(async origin => {
    const response = await fetch(`${origin}/healthz`);
    assert.equal(response.status, 200);
    for (const [name, value] of Object.entries(securityHeaders)) {
      assert.equal(
        response.headers.get(name.toLowerCase()),
        value,
        `${name} is declared but not sent`
      );
    }
  });
});

test("immutable caching only applies to hashed asset paths", () => {
  const immutable = "public, max-age=31536000, immutable";

  assert.equal(cacheControl("/assets/index-Dk3xQ9aZ.js"), immutable);
  assert.equal(cacheControl("/assets/index-Dk3xQ9aZ.css"), immutable);
  assert.equal(
    cacheControl("/assets/logo-xb-mark-v3-BdK9xY2p.webp"),
    immutable
  );
  // O hash do Vite é base64url: "-" e "_" fazem parte do alfabeto. Um hash sem
  // "-" nunca reprova a regra que recortava o nome no último "-", e era por
  // isso que este teste passava para sempre enquanto 11% do bundle perdia o
  // cache imutável — inclusive o único CSS do app.
  for (const urlPath of [
    "/assets/index-DETty-2g.css",
    "/assets/clipPlaneVertex-B-Ygqea7.js",
    "/assets/flowGraphDataSwitchBlock-jEH-G-Eq.js",
    "/assets/flowGraphPauseSoundBlock-C-Q229OK.js",
    "/assets/default.vertex-C-qTevhm.js",
    "/assets/bumpVertex-CGz_T0LC.js",
  ]) {
    assert.equal(cacheControl(urlPath), immutable, `${urlPath} sem immutable`);
  }

  for (const urlPath of [
    "/assets/daily-missions.svg",
    "/assets/logo-xb-mark-v3.webp",
    // Termina em "-metal-v3": tem cara de hash e não é. Um arquivo batizado à
    // mão preso um ano no navegador é o erro caro.
    "/assets/logo-xb-metal-v3.webp",
    "/assets/base-regional.svg",
    "/assets/driver-mascot-v3.webp",
    "/assets/real-v310/manifest.json",
    "/assets/real-v310/assets.bin",
    "/assets/v310-real-assets.js",
    "/legado-Dk3xQ9aZ.js",
  ]) {
    const policy = cacheControl(urlPath);
    assert.doesNotMatch(
      policy,
      /immutable/,
      `${urlPath} must not be cached as immutable`
    );
    assert.match(policy, /must-revalidate/, `${urlPath} must be revalidated`);
  }

  for (const urlPath of ["/", "/index.html", "/sw-v320.js", "/sw-v310.js"]) {
    assert.equal(cacheControl(urlPath), "no-store");
  }
  assert.equal(
    cacheControl("/manifest.webmanifest"),
    "public, max-age=0, must-revalidate"
  );
});

// Nomes inventados provam a regra; a build real prova os arquivos. O oráculo
// aqui não é o nome: é a origem. O que existe em client/public/assets foi
// batizado à mão e muda de conteúdo sem mudar de URL; o resto saiu do bundler
// com hash de conteúdo e precisa de immutable.
test("every hashed file in the real build is served immutable", async () => {
  const distAssets = path.join(projectRoot, "dist", "public", "assets");
  let distributed;
  try {
    distributed = await listTree(distAssets);
  } catch {
    assert.fail(
      "dist/public/assets ausente: rode a build antes — o contrato de cache é conferido contra a distribuição real"
    );
  }
  const handWritten = new Set(
    await listTree(path.join(projectRoot, "client", "public", "assets"))
  );

  const hashedWithDash = [];
  for (const relativePath of distributed) {
    const policy = cacheControl(`/assets/${relativePath}`);
    if (handWritten.has(relativePath)) {
      assert.doesNotMatch(
        policy,
        /immutable/,
        `${relativePath} é batizado à mão e não pode ser immutable`
      );
      continue;
    }
    assert.match(
      policy,
      /immutable/,
      `${relativePath} saiu do bundler com hash e perdeu o immutable`
    );
    const hash = path.posix
      .basename(relativePath)
      .replace(/\.[^.]+$/, "")
      .slice(-8);
    if (hash.includes("-")) hashedWithDash.push(relativePath);
  }
  assert.ok(
    hashedWithDash.length > 0,
    "nenhum hash com '-' nesta build: o caso que quebrava não está coberto"
  );
});

test("the browser resumes only against the validator it started with", async () => {
  await withServer(async origin => {
    const target = `${origin}/manifest.webmanifest`;
    const head = await fetch(target, { method: "HEAD" });
    assert.equal(head.status, 200, "manifesto ausente na distribuição");
    const etag = head.headers.get("etag");
    // RFC 9110 §13.1.3: If-Range exige validador forte.
    assert.ok(etag && !etag.startsWith("W/"), "ETag precisa ser forte");

    const fresh = await fetch(target, {
      headers: { Range: "bytes=0-9", "If-Range": etag },
    });
    assert.equal(fresh.status, 206);
    assert.equal((await fresh.arrayBuffer()).byteLength, 10);

    for (const ifRange of [
      '"deadbeef-1"',
      `W/${etag}`,
      "Mon, 01 Jan 2001 00:00:00 GMT",
    ]) {
      const stale = await fetch(target, {
        headers: { Range: "bytes=0-9", "If-Range": ifRange },
      });
      assert.equal(
        stale.status,
        200,
        `If-Range ${ifRange} devia devolver o arquivo inteiro`
      );
    }
  });
});

// Uma string de release esquecida num arquivo de deploy não dói até doer: o
// render.yaml anunciou 3.2.0 durante quatro releases.
test("every shipped release string follows package.json", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const version = packageJson.version;
  const html = await read("client/index.html");
  const renderConfig = await read("render.yaml");
  const server = await read("server/standalone-server.mjs");

  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(server.match(/const RELEASE = "([^"]+)"/)?.[1], version);
  assert.ok(html.includes(`data-xb-release="${version}"`));
  assert.equal(
    renderConfig.match(/XB_RELEASE\s*\n\s*value:\s*(\S+)/)?.[1],
    version,
    "render.yaml: XB_RELEASE fora da versão do pacote"
  );

  const main = await read("client/src/main.tsx");
  const workerUrl = main.match(/register\("(\/[^"]+\.js)"/)?.[1];
  assert.ok(workerUrl, "nenhum service worker registrado");
  assert.ok(
    html.includes(`content="${workerUrl}"`),
    "o meta xb-service-worker não aponta para o worker registrado"
  );
  const worker = await read(`client/public${workerUrl}`);
  assert.equal(
    worker.match(/const RELEASE = "([^"]+)"/)?.[1],
    version,
    "o worker ativo anuncia outra versão"
  );
  // O nome do cache precisa ser derivado: um literal sobrevive ao bump e foi o
  // que prendeu quatro releases dentro de "xbpneus-racing-v320".
  assert.match(
    worker,
    /const CACHE_NAME = `xbpneus-racing-v\$\{RELEASE[^`]*\}`;/,
    "o nome do cache do worker não é derivado do release"
  );
  assert.doesNotMatch(
    worker,
    /self\.registration\.unregister\(\)/,
    "o worker ativo se autodestrói como lápide"
  );
});

// O gate offline sobe o servidor distribuído de verdade; era o único que
// conferia cabeçalhos, ETag/304, Range e a divisão 404 x SPA, e o CI nunca o
// rodava.
test("the offline gate runs inside verify, and CI runs verify", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const workflow = await read(".github/workflows/ci.yml");

  assert.match(packageJson.scripts.verify, /run verify:offline/);
  assert.match(packageJson.scripts["verify:offline"], /verify-offline-release/);
  assert.match(workflow, /run: pnpm verify\b/);
  // Um glob que não casa com nada saía 0 e escondia metade da suíte.
  assert.match(packageJson.scripts.test, /run-node-tests\.mjs/);
  assert.doesNotMatch(packageJson.scripts.test, /\*\.test\.mjs/);
  for (const listed of ["client/public", "vitest.config.ts"]) {
    assert.ok(
      packageJson.scripts.lint.includes(` ${listed}`),
      `${listed} fora da lista do prettier`
    );
  }
});

test("the deployed server is the standalone one and carries no express", async () => {
  const server = await read("server/standalone-server.mjs");
  const renderConfig = await read("render.yaml");
  const packageJson = JSON.parse(await read("package.json"));

  assert.match(renderConfig, /startCommand: node dist\/standalone-server\.mjs/);
  assert.doesNotMatch(server, /from ["']express["']/);
  // Invariante, nao literal: o servidor precisa anunciar a MESMA versao do
  // pacote. Fixar o numero aqui so fazia o teste quebrar a cada release.
  const declared = server.match(/const RELEASE = "([^"]+)"/)?.[1];
  assert.equal(
    declared,
    packageJson.version,
    "o servidor anuncia uma versao diferente da do pacote"
  );
  assert.match(server, /server\.headersTimeout/);
  assert.match(server, /server\.requestTimeout/);
  assert.match(server, /server\.maxConnections/);
});

test("document entrypoint uses only local executable scripts", async () => {
  const html = await read("client/index.html");
  const scriptSources = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(
    match => match[1]
  );

  assert.deepEqual(scriptSources, ["/src/main.tsx"]);
  assert.doesNotMatch(
    html,
    /v250-runtime|v260-pilot-fusion|v270-hud-focus|v280-neighborhood|v300-golden-route|v310-real-assets/
  );
  assert.ok(
    scriptSources.every(
      source => source.startsWith("/") && !source.startsWith("//")
    ),
    "all executable scripts must be same-origin local resources"
  );
  assert.match(
    html,
    /<link rel="icon" type="image\/webp" href="\/assets\/logo-xb-mark-v3\.webp" \/>/
  );
  assert.doesNotMatch(html, /maximum-scale|user-scalable=no/i);
});

/**
 * O servidor que vai para produção, exercitado por HTTP de verdade. Três
 * regras que nenhum teste alcançava: um link simbólico dentro da pasta pública
 * não pode virar uma janela para fora dela, escrita não é leitura, e uma
 * validação condicional só pode responder 304 quando o ETag realmente bate —
 * senão o jogador fica preso no bundle antigo depois de cada deploy.
 *
 * Vive em tests/game por ser o único diretório de vitest disponível; o
 * arnês de node:test de security/ continua sendo o outro dono do servidor e
 * não é tocado aqui.
 */
import { existsSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import type { Server } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { createStandaloneServer } from "../../server/standalone-server.mjs";

/** Mesma resolução que o servidor faz para a raiz pública. */
const serverDirectory = fileURLToPath(
  new URL("../../server/", import.meta.url)
);
const nearbyPublic = path.join(serverDirectory, "public");
const publicDirectory = existsSync(nearbyPublic)
  ? nearbyPublic
  : path.resolve(serverDirectory, "..", "dist", "public");

const SECRET = "xb-segredo-que-nunca-pode-vazar";
const PUBLIC_BODY = "conteudo publico do bundle";
const LEAK_NAME = `xb-test-leak-${process.pid}.txt`;
const REAL_NAME = `xb-test-real-${process.pid}.txt`;

let server: Server;
let origin: string;
let outsideDirectory: string;
let createdRoot = false;

beforeAll(async () => {
  createdRoot = !existsSync(publicDirectory);
  await mkdir(publicDirectory, { recursive: true });
  outsideDirectory = await mkdtemp(path.join(os.tmpdir(), "xb-outside-"));
  await writeFile(path.join(outsideDirectory, "segredo.txt"), SECRET, "utf8");

  server = createStandaloneServer();
  await new Promise<void>(resolve => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  origin = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>(resolve => {
    server.close(() => resolve());
  });
  await rm(outsideDirectory, { force: true, recursive: true });
  if (createdRoot) await rm(publicDirectory, { force: true, recursive: true });
});

beforeEach(async () => {
  await writeFile(path.join(publicDirectory, REAL_NAME), PUBLIC_BODY, "utf8");
});

afterEach(async () => {
  await rm(path.join(publicDirectory, LEAK_NAME), { force: true });
  await rm(path.join(publicDirectory, REAL_NAME), { force: true });
});

describe("servidor autônomo do game", () => {
  it("não serve o arquivo apontado por um link simbólico para fora da raiz", async () => {
    const linkPath = path.join(publicDirectory, LEAK_NAME);
    await symlink(path.join(outsideDirectory, "segredo.txt"), linkPath);
    // O cenário é real: pelo sistema de arquivos o link entrega o segredo.
    expect(await readFile(linkPath, "utf8")).toBe(SECRET);

    const leaked = await fetch(`${origin}/${LEAK_NAME}`);
    const body = await leaked.text();
    expect(body).not.toContain(SECRET);
    expect(leaked.status).not.toBe(200);
    expect(leaked.status).toBe(400);

    // Controle: um arquivo de verdade dentro da raiz continua sendo servido,
    // então a recusa acima é do link, não de tudo.
    const allowed = await fetch(`${origin}/${REAL_NAME}`);
    expect(allowed.status).toBe(200);
    expect(await allowed.text()).toBe(PUBLIC_BODY);
  });

  it("recusa qualquer método que não seja leitura", async () => {
    for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
      for (const target of ["/healthz", `/${REAL_NAME}`, "/"]) {
        const response = await fetch(`${origin}${target}`, { method });
        expect(
          response.status,
          `${method} ${target} deveria ser recusado`
        ).toBe(405);
        expect(response.headers.get("allow")).toBe("GET, HEAD");
        const body = await response.text();
        expect(body).not.toContain(PUBLIC_BODY);
        expect(body).not.toContain("XBPNEUS Racing");
      }
    }

    // Leitura continua funcionando pelos dois métodos permitidos.
    const read = await fetch(`${origin}/${REAL_NAME}`);
    expect(read.status).toBe(200);
    expect(await read.text()).toBe(PUBLIC_BODY);
    const head = await fetch(`${origin}/${REAL_NAME}`, { method: "HEAD" });
    expect(head.status).toBe(200);
  });

  it("só responde 304 quando o ETag apresentado é mesmo o do arquivo", async () => {
    const first = await fetch(`${origin}/${REAL_NAME}`);
    expect(first.status).toBe(200);
    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();

    // ETag de um deploy anterior: o jogador precisa receber o arquivo novo.
    for (const stale of ['W/"0-0"', '"deadbeef-1"', 'W/"1-2", W/"3-4"']) {
      const response = await fetch(`${origin}/${REAL_NAME}`, {
        headers: { "If-None-Match": stale },
      });
      expect(response.status, `If-None-Match: ${stale}`).toBe(200);
      expect(await response.text()).toBe(PUBLIC_BODY);
    }

    // E com o ETag correto a revalidação continua economizando a transferência.
    const cached = await fetch(`${origin}/${REAL_NAME}`, {
      headers: { "If-None-Match": etag! },
    });
    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe("");

    // Uma lista que contenha o ETag correto também vale.
    const listed = await fetch(`${origin}/${REAL_NAME}`, {
      headers: { "If-None-Match": `W/"0-0", ${etag}` },
    });
    expect(listed.status).toBe(304);
  });
});

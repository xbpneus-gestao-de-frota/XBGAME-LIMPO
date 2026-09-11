/**
 * Servidor de PREVIA — ferramenta de mesa, nao faz parte do jogo publicado.
 *
 * O servidor de verdade (standalone-server.mjs) proibe, de proposito, que o
 * jogo seja mostrado dentro da janela de outro site: e o que impede alguem de
 * embutir o jogo numa pagina falsa e roubar cliques. Essa protecao fica onde
 * esta, intocada.
 *
 * Este aqui serve os MESMOS arquivos sem essa proibicao, para o jogo poder
 * aparecer dentro da aba lateral do chat enquanto estamos ajustando. Ele:
 *   - escuta so em 127.0.0.1, ou seja, so este computador alcanca;
 *   - nao guarda nada, nao escreve nada, nao tem rota de envio;
 *   - vive enquanto a janela preta estiver aberta, e some quando ela fecha.
 *
 * Para jogar de verdade, use o TESTAR_JOGO.bat, que sobe o servidor completo.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = [
  path.join(AQUI, "dist", "public"),
  path.join(AQUI, "public"),
].find(caminho => existsSync(path.join(caminho, "index.html")));

const PORTA = Number(process.env.PORT ?? 8124);

const TIPOS = new Map([
  [".css", "text/css; charset=utf-8"],
  [".glb", "model/gltf-binary"],
  [".gltf", "model/gltf+json"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".mp3", "audio/mpeg"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".txt", "text/plain; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

if (!RAIZ) {
  console.error("Nao achei a pasta do jogo aqui do lado. Rode o TESTAR_JOGO.bat");
  process.exit(1);
}

const servidor = createServer((pedido, resposta) => {
  let caminho;
  try {
    caminho = decodeURIComponent(new URL(pedido.url, "http://local").pathname);
  } catch {
    resposta.writeHead(400).end();
    return;
  }
  if (caminho.endsWith("/")) caminho += "index.html";

  // Ninguem sai da pasta do jogo, nem com ../ no endereco.
  const alvo = path.join(RAIZ, path.normalize(caminho));
  if (!alvo.startsWith(RAIZ) || !existsSync(alvo) || !statSync(alvo).isFile()) {
    resposta.writeHead(404, { "Content-Type": "text/plain" }).end("nao achei");
    return;
  }

  const info = statSync(alvo);
  const tipo = TIPOS.get(path.extname(alvo).toLowerCase()) ?? "application/octet-stream";
  const cabecalho = {
    "Content-Type": tipo,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };

  // Faixa de bytes: o audio e os modelos pedem pedaco por pedaco.
  const faixa = pedido.headers.range;
  if (faixa) {
    const casou = /^bytes=(\d*)-(\d*)$/.exec(faixa);
    if (casou) {
      const inicio = casou[1] === "" ? 0 : Number(casou[1]);
      const fim = casou[2] === "" ? info.size - 1 : Math.min(Number(casou[2]), info.size - 1);
      if (inicio <= fim) {
        resposta.writeHead(206, {
          ...cabecalho,
          "Content-Range": `bytes ${inicio}-${fim}/${info.size}`,
          "Content-Length": fim - inicio + 1,
        });
        createReadStream(alvo, { start: inicio, end: fim }).pipe(resposta);
        return;
      }
    }
  }

  resposta.writeHead(200, { ...cabecalho, "Content-Length": info.size });
  createReadStream(alvo).pipe(resposta);
});

servidor.listen(PORTA, "127.0.0.1", () => {
  console.log("");
  console.log("  Previa do jogo no ar para a aba lateral do chat.");
  console.log(`  Endereco: http://127.0.0.1:${PORTA}`);
  console.log("  Feche esta janela para desligar.");
  console.log("");
});

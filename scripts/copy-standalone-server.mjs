import { copyFile, mkdir } from "node:fs/promises";

// O servidor autonomo vem em TRES pecas: quem serve o jogo, quem atende o
// XBWAPP e o caminho ate a inteligencia gratuita. As tres precisam viajar
// juntas — sem qualquer uma delas o servidor montado nao sobe, porque a
// primeira importa as outras duas.
//
// A terceira entrou em 13/09/2026 e este comentario existe por causa dela:
// esquecer de listar aqui nao quebra teste nenhum, nao quebra o "pnpm dev",
// e so aparece quando o jogo montado ja esta no ar e nao sobe.
const PECAS = [
  "standalone-server.mjs",
  "xbwapp-atendimento.mjs",
  "xbwapp-ia-gratuita.mjs",
];

await mkdir("dist", { recursive: true });
for (const peca of PECAS) {
  await copyFile(`server/${peca}`, `dist/${peca}`);
}
console.log(`Servidor autônomo copiado para dist/ (${PECAS.join(", ")})`);

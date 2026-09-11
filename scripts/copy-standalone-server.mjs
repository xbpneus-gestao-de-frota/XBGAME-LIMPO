import { copyFile, mkdir } from "node:fs/promises";

// O servidor autonomo vem em duas pecas: quem serve o jogo e quem atende o
// XBWAPP. As duas precisam viajar juntas — sem a segunda, o servidor montado
// nao sobe, porque a primeira importa a segunda.
const PECAS = ["standalone-server.mjs", "xbwapp-atendimento.mjs"];

await mkdir("dist", { recursive: true });
for (const peca of PECAS) {
  await copyFile(`server/${peca}`, `dist/${peca}`);
}
console.log(`Servidor autônomo copiado para dist/ (${PECAS.join(", ")})`);

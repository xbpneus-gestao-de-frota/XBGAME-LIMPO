import path from "node:path";
import { defineConfig } from "vitest/config";

const raiz = path.dirname(new URL(import.meta.url).pathname);

// Os testes .mjs rodam sob node:test, nao sob o vitest. Sem este include o
// vitest os coletava e reportava "No test suite found", o que deixava a saida
// vermelha sem nenhum defeito real por tras.
//
// O ".tsx" entrou junto com o XBWAPP: o aplicativo tem mil linhas de tela, e
// tela que nunca foi montada nem uma vez e tela que ninguem sabe se monta. O
// teste dele desenha o componente em texto (react-dom/server) — nao precisa de
// navegador, nem de jsdom, e pega o erro que so aparece na montagem.
//
// O apelido "@" e o mesmo do vite; sem ele os componentes nao acham o que
// importam, porque so o vite sabia traduzir esse atalho.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(raiz, "client", "src"),
    },
  },
  esbuild: {
    // JSX sem precisar importar o React em cada arquivo — o mesmo que o vite faz.
    jsx: "automatic",
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
  },
});

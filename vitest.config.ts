import { defineConfig } from "vitest/config";

// Os testes .mjs rodam sob node:test, nao sob o vitest. Sem este include o
// vitest os coletava e reportava "No test suite found", o que deixava a saida
// vermelha sem nenhum defeito real por tras.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});

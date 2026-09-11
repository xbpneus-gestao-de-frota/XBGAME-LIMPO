/**
 * OS MORADORES DO BAIRRO, dentro do aplicativo.
 *
 * Os oito primeiros retratos chegaram desenhados em 08/09/2026. Estes testes
 * seguram as duas coisas que quebram calado quando entra gente nova:
 *
 *   · TODO RETRATO APONTA PARA UM ARQUIVO QUE EXISTE. Foto errada nao explode
 *     em teste nenhum: ela some da tela e vira uma roda cinza, e ninguem
 *     percebe ate abrir a lista.
 *   · TODO MORADOR TEM PORTA NO MAPA. O nome do contato e do bairro tem de
 *     casar, senao a entrega sai para lugar nenhum e o frete cai para a parte
 *     fixa sem ninguem entender por que.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { CONTATOS, MORADORES } from "@/game/xbwapp/contatos";
import { enderecoDe } from "@/game/xbwapp/distancias";

describe("os moradores", () => {
  it("todo retrato do aplicativo aponta para um arquivo que existe", () => {
    const semArquivo: string[] = [];
    for (const c of CONTATOS) {
      if (!c.foto) continue;
      try {
        readFileSync(resolve("client/public", c.foto.replace(/^\//, "")));
      } catch {
        semArquivo.push(`${c.nome} → ${c.foto}`);
      }
    }
    expect(semArquivo).toEqual([]);
  });

  it("todo morador tem porta no desenho do bairro", () => {
    const semPorta = MORADORES.filter(m => !enderecoDe(m.id)).map(m => m.nome);
    expect(semPorta).toEqual([]);
  });

  it("quem nao tem retrato tem cor de roda — ninguem fica sem cara", () => {
    for (const m of MORADORES) {
      expect(Boolean(m.foto) || Boolean(m.cor)).toBe(true);
    }
  });

  it("o numero da casa do contato e o numero da casa no mapa", () => {
    for (const m of MORADORES) {
      const numero = Number(/casa\s*(\d+)/i.exec(m.endereco ?? "")?.[1]);
      expect(enderecoDe(m.id)!.numero).toBe(numero);
    }
  });

  it("os oito primeiros ja chegaram desenhados", () => {
    const comFoto = MORADORES.filter(m => m.foto);
    expect(comFoto.length).toBeGreaterThanOrEqual(8);
  });
});

/**
 * OS ACESSORIOS — e o alivio que eles dao no folego.
 *
 * Ordem dele, 13/09/2026: "acessorios podem entrar como garrafa de agua
 * maior, protetor solar, etc, isso sendo melhorado".
 *
 * O que estes testes protegem e a regra que faz o acessorio ser jogo e nao
 * enfeite: ele ALIVIA e nunca ANULA. Se um dia alguem somar um quarto
 * acessorio de sol e o meio-dia deixar de pesar, a decisao de quando
 * trabalhar desaparece do jogo sem nenhum erro aparecer na tela.
 */
import { describe, expect, it } from "vitest";

import {
  ACESSORIOS,
  ACESSORIOS_ZERADOS,
  MAX_NIVEL_DO_ACESSORIO,
  alivioDosAcessorios,
  custoDoAcessorio,
  degrauDoAcessorio,
} from "@/game/osAcessorios";
import {
  FOLEGO_CHEIO,
  VOLTA_PARADO_POR_SEGUNDO,
  pesoDaCarga,
  pesoDoSol,
  umSegundoDeFolego,
} from "@/game/xbwapp/oFolego";
import { novoEmRota } from "@/game/xbwapp/aRota";
import { COMECA_AS, MINUTOS_POR_DIA, SEGUNDOS_DO_DIA } from "@/game/oRelogioDoBairro";

/* O relogio do balcao no momento em que o sol esta mais alto (fracao 0.45). */
const MEIO_DIA = 0.45 * SEGUNDOS_DO_DIA;

describe("a tabela", () => {
  it("todo acessorio tem exatamente os degraus que o teto promete", () => {
    for (const a of ACESSORIOS) {
      expect(a.tiers, a.name).toHaveLength(MAX_NIVEL_DO_ACESSORIO);
      expect(a.tiers.map(t => t.level)).toEqual([1, 2, 3]);
    }
  });

  it("cada degrau custa mais que o anterior", () => {
    for (const a of ACESSORIOS) {
      const custos = a.tiers.map(t => t.cost);
      expect([...custos].sort((x, y) => x - y), a.name).toEqual(custos);
    }
  });

  it("o primeiro degrau de todos cabe no bolso de quem esta comecando", () => {
    /* Menos que o primeiro pneu, que custa trinta: e o alivio mais barato. */
    for (const a of ACESSORIOS) {
      expect(a.tiers[0]!.cost, a.name).toBeLessThanOrEqual(30);
    }
  });

  it("no topo nao ha mais o que comprar", () => {
    for (const a of ACESSORIOS) {
      expect(custoDoAcessorio(a.id, MAX_NIVEL_DO_ACESSORIO)).toBeNull();
      expect(custoDoAcessorio(a.id, 0)).toBe(a.tiers[0]!.cost);
    }
  });

  it("sem nivel nao ha degrau nenhum montado", () => {
    expect(degrauDoAcessorio("agua", 0)).toBeUndefined();
    expect(degrauDoAcessorio("agua", 1)?.name).toBe(
      ACESSORIOS.find(a => a.id === "agua")!.tiers[0]!.name
    );
  });
});

describe("o alivio somado", () => {
  it("sem acessorio nenhum nao alivia nada", () => {
    expect(alivioDosAcessorios(ACESSORIOS_ZERADOS)).toEqual({
      aguaPorSegundo: 0,
      alivioDoSol: 0,
      alivioDaCarga: 0,
    });
  });

  it("nunca passa de 0,9 — o sol e a bolsa nao somem", () => {
    const tudo = alivioDosAcessorios({
      agua: MAX_NIVEL_DO_ACESSORIO,
      sol: MAX_NIVEL_DO_ACESSORIO,
      carga: MAX_NIVEL_DO_ACESSORIO,
    });
    expect(tudo.alivioDoSol).toBeLessThanOrEqual(0.9);
    expect(tudo.alivioDaCarga).toBeLessThanOrEqual(0.9);
  });
});

describe("o que o acessorio faz no folego", () => {
  it("o protetor solar encolhe o peso do meio-dia, e nunca o inverte", () => {
    const semNada = pesoDoSol(MEIO_DIA, 0);
    const comTudo = pesoDoSol(MEIO_DIA, 0.8);
    expect(comTudo).toBeLessThan(semNada);
    /* Mesmo com alivio total, o meio-dia nunca custa MENOS que a tarde. */
    expect(pesoDoSol(MEIO_DIA, 1)).toBeGreaterThanOrEqual(1);
    expect(pesoDoSol(MEIO_DIA, 1)).toBeCloseTo(1, 10);
  });

  it("o cinto encolhe o peso da bolsa cheia, e a bolsa vazia continua leve", () => {
    expect(pesoDaCarga(6, 0.75)).toBeLessThan(pesoDaCarga(6, 0));
    expect(pesoDaCarga(0, 0.75)).toBe(1);
  });

  it("a garrafa faz recuperar mais depressa parado", () => {
    const parado = novoEmRota("Renan");
    const semNada = umSegundoDeFolego(50, parado, 0);
    const comGarrafa = umSegundoDeFolego(50, parado, 0, {
      agua: 3,
      sol: 0,
      carga: 0,
    });
    expect(semNada).toBeCloseTo(50 + VOLTA_PARADO_POR_SEGUNDO, 10);
    expect(comGarrafa).toBeGreaterThan(semNada);
  });

  it("nem com tudo no maximo o folego passa de cheio", () => {
    const parado = novoEmRota("Renan");
    expect(
      umSegundoDeFolego(FOLEGO_CHEIO, parado, 0, {
        agua: 3,
        sol: 3,
        carga: 3,
      })
    ).toBe(FOLEGO_CHEIO);
  });

  it("quem nao passa acessorio nenhum sente o folego de antes", () => {
    const parado = novoEmRota("Renan");
    expect(umSegundoDeFolego(50, parado, 0)).toBe(
      umSegundoDeFolego(50, parado, 0, ACESSORIOS_ZERADOS)
    );
  });

  it("o dia do bairro continua sendo o mesmo relogio", () => {
    /* Guarda-corpo: se o dia mudar de tamanho, o marco do meio-dia muda. */
    expect(COMECA_AS).toBe(6 * 60);
    expect(MINUTOS_POR_DIA).toBe(14 * 60);
  });
});

/**
 * O NUMERO NA TELA E ESCRITO COMO SE ESCREVE AQUI.
 *
 * "1.5x" e ingles; no Brasil e "1,5x". Passou uma vez, e o teste existe para
 * nao passar de novo — nenhuma frase da ficha pode sair com ponto decimal.
 */
describe("como o numero aparece escrito", () => {
  it("a frase da garrafa usa virgula, e nao ponto", async () => {
    const { oQueMudaNoAcessorio } = await import("@/game/xbwapp/aFicha");
    for (const a of ACESSORIOS) {
      for (const degrau of a.tiers) {
        for (const frase of oQueMudaNoAcessorio(degrau)) {
          expect(frase, `${a.name} nível ${degrau.level}`).not.toMatch(
            /\d\.\d/
          );
        }
      }
    }
  });
});

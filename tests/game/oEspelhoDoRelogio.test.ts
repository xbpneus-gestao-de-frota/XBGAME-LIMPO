import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import doRenan from "../../client/src/game/data/moldes-entregador.json";
import daLorena from "../../client/src/game/data/moldes-lorena.json";

/*
 * O BURACO DA FRENTE, E O ESPELHO QUE O FECHA.
 *
 * Ordem dele em 12/09/2026: "PRIMEIRO APLIQUE O QUE TEMOS SEM TRAVAR CAMERA EM
 * ENTREGADORES". O que tinhamos era um relogio com um buraco: entre 06h00 e
 * 04h34 o Renan passava 43,1 graus sem desenho nenhum, e a Lorena 46,1. E o
 * pedaco em que o entregador vem para a camera — o tranco aparece justamente
 * quando ele cruza a tela por baixo, na frente do jogador.
 *
 * O espelho que fecha esse buraco NAO e o espelho antigo, que virava o desenho
 * na hora de pintar e deixava as pegadas no lugar velho (dai a sombra a meia
 * bicicleta do pneu, e o menino subindo a tela de cara para a camera). Quem
 * vira agora e o gerador: ele grava um ARQUIVO novo, com os pixels ao
 * contrario e as pegadas ao contrario junto. O jogo pinta esse arquivo como
 * pinta qualquer outro.
 *
 * Estes testes guardam as tres coisas que podem estragar isso de novo: o
 * buraco voltar a abrir, o espelho sair com a pegada do lado errado, e alguem
 * voltar a virar desenho na tela.
 */

interface Linha {
  nome: string;
  graus: number;
  frenteX: number;
  frenteY: number;
  trasX: number;
  trasY: number;
  folha?: string;
  espelho?: string;
  umaRoda?: boolean;
}

/** Buraco maior que isto no relogio: o desenho da um salto que se ve. */
const VAO_MAXIMO = 38;
/** Um espelho tem de cair no meio do buraco, nunca colado num vizinho. */
const LONGE_DA_BORDA = 8;

const RELOGIOS = [
  { quem: "Renan", lista: doRenan.moldes as unknown as Linha[], prefixo: "XB_Entregador" },
  { quem: "Lorena", lista: daLorena.moldes as unknown as Linha[], prefixo: "XB_Lorena" },
];

/** Os buracos do relogio: quantos graus depois de cada desenho ate o proximo. */
const vaos = (lista: Linha[]) => {
  const graus = lista.map(m => m.graus).sort((a, b) => a - b);
  return graus.map((g, i) => ({ vao: (graus[(i + 1) % graus.length]! - g + 360) % 360, de: g }));
};

const paraCamera = (g: number) => Math.sin((g * Math.PI) / 180) < 0;

describe("o relogio dos desenhos nao tem buraco grande", () => {
  for (const { quem, lista } of RELOGIOS) {
    it(`${quem}: nenhum salto passa de ${VAO_MAXIMO} graus`, () => {
      const pior = vaos(lista).sort((a, b) => b.vao - a.vao)[0]!;
      expect(pior.vao, `${quem} pula ${pior.vao.toFixed(1)}° depois de ${pior.de}°`)
        .toBeLessThanOrEqual(VAO_MAXIMO);
    });

    it(`${quem}: o pedaco em que ele vem para a camera tem desenho`, () => {
      // 06h00 e 270°: dali ate 04h30 e o trecho que ficava vazio.
      const depoisDe270 = vaos(lista).find(v => v.de === 270);
      expect(depoisDe270, `${quem} nem tem o desenho de 06h00`).toBeTruthy();
      expect(depoisDe270!.vao).toBeLessThanOrEqual(VAO_MAXIMO);
    });
  }
});

describe("cada espelho e um desenho de verdade, virado por inteiro", () => {
  for (const { quem, lista, prefixo } of RELOGIOS) {
    const espelhos = lista.filter(m => m.espelho);

    it(`${quem}: ha espelho fechando o buraco da frente`, () => {
      expect(espelhos.length).toBeGreaterThan(0);
    });

    it(`${quem}: o espelho aponta para 180 menos o rumo de origem`, () => {
      for (const e of espelhos) {
        const base = lista.find(m => m.nome === e.espelho);
        expect(base, `${quem}: ${e.nome} diz vir de ${e.espelho}, que nao existe`).toBeTruthy();
        expect(e.graus).toBeCloseTo((180 - base!.graus + 360) % 360, 1);
      }
    });

    it(`${quem}: as pegadas viram junto com os pixels`, () => {
      // O erro do espelho antigo: virar o desenho e deixar o pneu no lugar
      // velho. Aqui os dois x trocam de lado e as alturas ficam — o chao nao
      // se mexeu.
      for (const e of espelhos) {
        const base = lista.find(m => m.nome === e.espelho)!;
        expect(e.frenteX).toBeCloseTo(100 - base.frenteX, 1);
        expect(e.trasX).toBeCloseTo(100 - base.trasX, 1);
        expect(e.frenteY).toBeCloseTo(base.frenteY, 1);
        expect(e.trasY).toBeCloseTo(base.trasY, 1);
        expect(e.umaRoda ?? false).toBe(base.umaRoda ?? false);
      }
    });

    it(`${quem}: o espelho nunca troca costas por frente`, () => {
      // O outro erro do espelho antigo: o noroeste pintava o espelho de uma
      // folha de frente, e o menino subia a tela mostrando o rosto.
      for (const e of espelhos) {
        const base = lista.find(m => m.nome === e.espelho)!;
        expect(paraCamera(e.graus), `${quem}: ${e.nome} virou de lado`)
          .toBe(paraCamera(base.graus));
        expect(e.folha?.split("_")[0]).toBe(base.folha?.split("_")[0]);
      }
    });

    it(`${quem}: nenhum espelho cai colado num desenho que ja existe`, () => {
      for (const e of espelhos) {
        for (const outro of lista) {
          if (outro.nome === e.nome) continue;
          const d = Math.abs(((e.graus - outro.graus) % 360) + 360) % 360;
          expect(Math.min(d, 360 - d), `${quem}: ${e.nome} colado em ${outro.nome}`)
            .toBeGreaterThanOrEqual(LONGE_DA_BORDA);
        }
      }
    });

    it(`${quem}: o espelho tem arquivo proprio na pasta dos desenhos`, () => {
      for (const e of espelhos) {
        const caminho = `client/public/assets/${prefixo}_pedalando1_${e.nome}.webp`;
        expect(existsSync(caminho), `falta ${caminho}`).toBe(true);
      }
    });
  }
});

describe("nada vira desenho na hora de pintar", () => {
  it("o entregador nao tem espelho de tela em lugar nenhum", () => {
    const componente = readFileSync("client/src/components/Entregador.tsx", "utf8");
    expect(componente).not.toContain("scaleX(-1)");
    expect(componente).not.toContain("scale(-1");
  });
});

/**
 * A parada da entrega — onde ele desce da bicicleta.
 *
 * Estes testes existem por causa de um defeito que ninguem tinha visto porque
 * ele nao dava erro nenhum: o entregador PASSAVA RETO PELA LOJA. O caminho da
 * corrida e base -> loja -> casa emendado num tracado so, e a parada do meio
 * simplesmente nao existia no codigo — ele pegava a encomenda em movimento.
 */
import { describe, expect, it } from "vitest";
import { BASE, CASAS, COMERCIOS } from "../../client/src/game/addresses";
import {
  PARADA_MAXIMA_MS,
  PARADA_MINIMA_MS,
  metrosDaLinha,
  montarCorrida,
  tempoDaParada,
} from "../../client/src/game/aParada";
import { rota } from "../../client/src/game/rotas";
import { MAPA, METROS_POR_PIXEL } from "../../client/src/game/streets";

const coleta = COMERCIOS[0]!;
const entrega = CASAS[3]!;
const pernaDaColeta = rota(BASE.em, coleta.em);
const pernaDaEntrega = rota(coleta.em, entrega.em);
const { caminho, paradas } = montarCorrida(
  [
    { papel: "coleta", endereco: coleta, caminho: pernaDaColeta },
    { papel: "entrega", endereco: entrega, caminho: pernaDaEntrega },
  ],
  MAPA.largura,
  MAPA.altura,
  METROS_POR_PIXEL
);

const metros = (l: readonly (readonly [number, number])[]) =>
  metrosDaLinha(l, MAPA.largura, MAPA.altura, METROS_POR_PIXEL);

describe("a parada da entrega", () => {
  it("tem uma parada para cada destino, na ordem em que se chega", () => {
    expect(paradas).toHaveLength(2);
    expect(paradas[0]!.papel).toBe("coleta");
    expect(paradas[1]!.papel).toBe("entrega");
    expect(paradas[0]!.ate).toBeLessThan(paradas[1]!.ate);
  });

  it("a parada da loja cai no meio do caminho, e nao no fim", () => {
    /*
     * O defeito original em uma linha: se a coleta caisse no fim, ele nunca
     * pararia nela. Ela tem de cair onde a primeira perna acaba — nem antes,
     * porque ai ele para longe da loja, nem depois, porque ai ele ja passou.
     */
    const total = metros(caminho);
    expect(paradas[0]!.ate).toBeCloseTo(metros(pernaDaColeta), 1);
    expect(paradas[0]!.ate).toBeLessThan(total * 0.95);
    expect(paradas[1]!.ate).toBeCloseTo(total, 1);
    /*
     * E A EMENDA NAO PODE SUMIR NA CONTA. Chegando na loja ele encosta de um
     * lado da rua; saindo, na outra direcao, a direita e o lado de la. Sao
     * alguns metros de travessia, e o caminho tem de passar por eles — senao a
     * bicicleta para num ponto e volta a andar de outro.
     */
    expect(total).toBeGreaterThanOrEqual(
      metros(pernaDaColeta) + metros(pernaDaEntrega) - 0.01
    );
  });

  it("a bicicleta fica onde a perna termina, e a caminhada comeca ali", () => {
    const pontas = [
      [paradas[0]!, pernaDaColeta] as const,
      [paradas[1]!, pernaDaEntrega] as const,
    ];
    for (const [parada, perna] of pontas) {
      expect(parada.aPe[0]).toEqual(perna[perna.length - 1]);
      expect(parada.aPe.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("o tempo parado sai da caminhada, e nao de um numero inventado", () => {
    // caminhada maior, parada maior — mas sempre entre o piso e o teto
    expect(tempoDaParada(0)).toBe(PARADA_MINIMA_MS);
    expect(tempoDaParada(30)).toBeGreaterThan(tempoDaParada(5));
    expect(tempoDaParada(10_000)).toBe(PARADA_MAXIMA_MS);
    /*
     * E A CAMINHADA TIPICA NAO PODE BATER NO TETO. Se ela bater, o tempo deixa
     * de sair da caminhada e passa a ser sempre o mesmo — e o teto vira o
     * numero inventado que este teste existe para impedir. Trinta e um metros
     * e a mediana dos riscos que ele desenhou.
     */
    expect(tempoDaParada(31)).toBeLessThan(PARADA_MAXIMA_MS);
    expect(tempoDaParada(31)).toBeGreaterThan(PARADA_MINIMA_MS);
    for (const p of paradas) {
      expect(p.ms).toBeGreaterThanOrEqual(PARADA_MINIMA_MS);
      expect(p.ms).toBeLessThanOrEqual(PARADA_MAXIMA_MS);
    }
  });

  it("nenhuma parada deixa a bicicleta dentro do lugar", () => {
    /*
     * A regra dele, conferida na ponta que o jogo realmente usa: a bicicleta
     * fica a mais de dez metros da bola que ele pintou.
     */
    const emMetros = (
      a: readonly [number, number],
      b: readonly [number, number]
    ) =>
      Math.hypot(
        ((a[0] - b[0]) / 100) * MAPA.largura,
        ((a[1] - b[1]) / 100) * MAPA.altura
      ) * METROS_POR_PIXEL;
    expect(emMetros(paradas[0]!.aPe[0]!, coleta.telhado)).toBeGreaterThan(10);
    expect(emMetros(paradas[1]!.aPe[0]!, entrega.telhado)).toBeGreaterThan(10);
  });
});

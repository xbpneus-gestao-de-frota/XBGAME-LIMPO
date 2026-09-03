/**
 * A malha de ruas foi medida em cima de um desenho, e por isso ela precisa
 * provar o que afirma. Estes testes sao a prova.
 *
 * Um mapa torto nao quebra a tela: a rota simplesmente sai atravessando um
 * jardim, ou dois pedaços do bairro ficam sem ligacao e o entregador nunca
 * chega — e ninguem descobre por que.
 */
import { describe, expect, it } from "vitest";
import {
  METROS_POR_PIXEL,
  MAPA,
  NOS,
  TRECHOS,
  emPixels,
  metrosDoTrecho,
} from "../../client/src/game/streets";

describe("a malha de ruas do bairro", () => {
  it("tem no e trecho de verdade, e nenhum sobrando", () => {
    expect(NOS.length).toBeGreaterThan(50);
    expect(TRECHOS.length).toBeGreaterThan(100);
    const ids = new Set(NOS.map(n => n.id));
    expect(ids.size).toBe(NOS.length);
    TRECHOS.forEach(t => {
      // Trecho apontando para no que nao existe e o erro que so aparece
      // quando alguem tenta andar por ele.
      expect(ids.has(t.de), `${t.de} nao existe`).toBe(true);
      expect(ids.has(t.ate), `${t.ate} nao existe`).toBe(true);
      expect(t.de).not.toBe(t.ate);
    });
  });

  it("cabe inteira dentro do mapa", () => {
    const dentro = (p: readonly [number, number]) =>
      p[0] >= 0 && p[0] <= 100 && p[1] >= 0 && p[1] <= 100;
    NOS.forEach(n => expect(dentro(n.em), n.id).toBe(true));
    TRECHOS.forEach(t =>
      t.linha.forEach(p =>
        expect(dentro(p), `${t.de}-${t.ate}`).toBe(true)
      )
    );
  });

  it("todo trecho tem traçado, e traçado tem comprimento", () => {
    TRECHOS.forEach(t => {
      expect(t.linha.length).toBeGreaterThanOrEqual(2);
      expect(t.px).toBeGreaterThan(0);
      expect(metrosDoTrecho(t)).toBeGreaterThan(0);
    });
  });

  it("o traçado começa e termina nos nos que ele diz ligar", () => {
    /*
     * Sem isto, um trecho pode desenhar uma rua certa mas ligada ao lugar
     * errado — e o caminho mais curto passa a mentir.
     */
    const onde = new Map(NOS.map(n => [n.id, n.em]));
    const longe = (a: readonly [number, number], b: readonly [number, number]) =>
      Math.hypot(a[0] - b[0], a[1] - b[1]);
    TRECHOS.forEach(t => {
      expect(longe(t.linha[0]!, onde.get(t.de)!)).toBeLessThan(1.2);
      expect(longe(t.linha.at(-1)!, onde.get(t.ate)!)).toBeLessThan(1.2);
    });
  });

  it("o bairro e uma peça só: da para ir de qualquer canto a qualquer canto", () => {
    /*
     * Uma ilha de ruas sem ligacao com o resto e a falha mais cara desta
     * malha: a rota existe no papel e nunca acontece no jogo.
     */
    const vizinhos = new Map<string, string[]>(NOS.map(n => [n.id, []]));
    TRECHOS.forEach(t => {
      vizinhos.get(t.de)!.push(t.ate);
      vizinhos.get(t.ate)!.push(t.de);
    });
    const visto = new Set<string>([NOS[0]!.id]);
    const fila = [NOS[0]!.id];
    while (fila.length) {
      for (const v of vizinhos.get(fila.pop()!)!) {
        if (!visto.has(v)) { visto.add(v); fila.push(v); }
      }
    }
    expect(visto.size).toBe(NOS.length);
  });

  it("o grau declarado bate com os trechos que existem", () => {
    // O numero de saidas que o no anuncia e o que a tela usa para dizer
    // "cruzamento" ou "ponta". Se ele mentir, o desenho mente junto.
    const conta = new Map<string, number>(NOS.map(n => [n.id, 0]));
    TRECHOS.forEach(t => {
      conta.set(t.de, conta.get(t.de)! + 1);
      conta.set(t.ate, conta.get(t.ate)! + 1);
    });
    NOS.forEach(n => expect(conta.get(n.id), n.id).toBe(n.saidas));
  });

  it("a escala transforma pixel em metro, e porcentagem em pixel", () => {
    expect(METROS_POR_PIXEL).toBeGreaterThan(0);
    const total = TRECHOS.reduce((s, t) => s + metrosDoTrecho(t), 0);
    // Bairro de verdade: quilometros de rua, nao metros nem centenas de km.
    expect(total).toBeGreaterThan(5_000);
    expect(total).toBeLessThan(60_000);

    const p = emPixels([50, 50], MAPA.largura, MAPA.altura);
    expect(p.x).toBeCloseTo(MAPA.largura / 2, 6);
    expect(p.y).toBeCloseTo(MAPA.altura / 2, 6);
  });
});

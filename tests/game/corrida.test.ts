import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  A_DECIDIR,
  desgasteDaCorrida,
  estagioDaBolinha,
  estagioDaEncomenda,
  fecharCorrida,
  fracaoQueSobra,
  passouDoTempo,
  pisoDaCorridaPequena,
  prazoDaEncomenda,
  type Encomenda,
} from "../../client/src/game/corrida";

const CSS = readFileSync("client/src/index.css", "utf8");

const encomenda = (
  metros: number,
  extra: Partial<Encomenda> = {}
): Encomenda => ({
  id: "e1",
  daLoja: "Padaria",
  paraCasa: "casa 3",
  metros,
  estado: "coletada",
  coletadaEm: 0,
  ...extra,
});

describe("as regras da corrida", () => {
  /*
   * O PRAZO NASCE DA DISTANCIA, e nao de um numero escrito a mao.
   *
   * Um prazo fixo mente em metade do bairro: folgado na casa da esquina,
   * impossivel na ponta do mapa. Se algum dia alguem trocar isto por uma
   * constante, o teste cai — e tem que cair.
   */
  it("a casa longe ganha mais tempo que a casa perto", () => {
    expect(prazoDaEncomenda(1200)).toBeGreaterThan(prazoDaEncomenda(300) * 2);
  });

  /* O relogio comeca na COLETA. Um lugar de onde ninguem retirou nada nao
   * pode estar atrasado. */
  it("sem coleta nao ha relogio correndo", () => {
    const e = encomenda(500, { estado: "aceita", coletadaEm: undefined });
    expect(fracaoQueSobra(e, 10_000)).toBe(1);
    expect(passouDoTempo(e, 10_000)).toBe(false);
    expect(estagioDaEncomenda(e, 10_000)).toBe("no-prazo");
  });

  /*
   * OS ESTAGIOS DESCEM NA ORDEM, E O ULTIMO E CURTO.
   *
   * Os primeiros sao largos porque a subida E o jogo: o jogador precisa de
   * tempo para escolher qual entrega sacrificar. O ultimo e curto porque o
   * aviso de que essa acabou tem que ser inconfundivel, e nao um longo
   * lamento.
   */
  it("a bolinha desce na ordem, e o aviso final e o mais curto", () => {
    const ordem = [1, 0.8, 0.5, 0.3, 0.1, 0].map(estagioDaBolinha);
    expect(ordem).toEqual([
      "no-prazo",
      "no-prazo",
      "folga-acabando",
      "atrasando",
      "no-limite",
      "estourou",
    ]);
    const largura = (de: number, ate: number) => de - ate;
    expect(largura(0.2, 0)).toBeLessThan(largura(1, 0.66));
    expect(largura(0.2, 0)).toBeLessThan(largura(0.66, 0.42));
  });

  it("passou do tempo quando o prazo acaba, e nao antes", () => {
    const e = encomenda(600);
    const prazo = prazoDaEncomenda(600);
    expect(passouDoTempo(e, prazo - 1)).toBe(false);
    expect(passouDoTempo(e, prazo + 1)).toBe(true);
    expect(estagioDaEncomenda(e, prazo + 1)).toBe("estourou");
  });

  /*
   * A PARTE MAIS AFIADA DO DESENHO DELE: "manutencao de bicicleta continuara
   * progresso de desgaste". E o que faz a corrida perdida NAO SER NEUTRA —
   * sem isso, falhar seria so deixar de ganhar; com isso, falhar custa.
   */
  it("o desgaste e cobrado mesmo quando tudo falhou", () => {
    const perdidas: Encomenda[] = [
      encomenda(800, { id: "a", estado: "estourada" }),
      encomenda(900, { id: "b", estado: "estourada" }),
    ];
    const f = fecharCorrida(perdidas, 2400, () => 12);
    expect(f.recebe).toBe(0);
    expect(f.desgaste).toBeGreaterThan(0);
    expect(f.sobra).toBeLessThan(0);
    expect(f.devolver.map(e => e.id)).toEqual(["a", "b"]);
  });

  /*
   * O PISO TAPA O BURACO DO CICLO: falhou, nao ganhou, nao pode melhorar,
   * falha de novo. Uma entrega aceita e cumprida nunca da prejuizo.
   */
  it("uma entrega sozinha e cumprida nunca da prejuizo", () => {
    const so = [encomenda(3000, { estado: "entregue" })];
    const f = fecharCorrida(so, 3000, () => 0.01);
    expect(f.recebe).toBeCloseTo(pisoDaCorridaPequena(3000), 6);
    expect(f.sobra).toBeGreaterThan(0);
  });

  /* Mas quem pegou seis e derrubou cinco esta na ambicao, e ambicao arrisca. */
  it("o piso nao socorre quem se encheu de coletas", () => {
    const muitas: Encomenda[] = [
      encomenda(900, { id: "a", estado: "entregue" }),
      encomenda(900, { id: "b", estado: "estourada" }),
      encomenda(900, { id: "c", estado: "estourada" }),
    ];
    const f = fecharCorrida(muitas, 4000, () => 0.01);
    expect(f.recebe).toBeCloseTo(0.01, 6);
    expect(f.sobra).toBeLessThan(0);
  });

  /*
   * OS NUMEROS DE EQUILIBRIO MORAM TODOS JUNTOS. Ele disse "depois decidimos
   * o tempo de cada regra" — entao trocar um deles tem que ser trocar uma
   * linha, e nao cacar constante espalhada pelo jogo.
   */
  it("todo numero que ele ainda vai decidir esta num lugar so", () => {
    const fonte = readFileSync("client/src/game/corrida.ts", "utf8");
    expect(Object.keys(A_DECIDIR).sort()).toEqual([
      "folgaDoPrazo",
      "margemDoPiso",
      "paradaNaPorta",
      "viradasDaBolinha",
    ]);
    /*
     * E nao pode haver numero de equilibrio SOLTO no resto do arquivo. Este
     * teste ja pegou um vazamento meu: as viradas de cor da bolinha estavam
     * escondidas no meio da regra, longe de onde ele vai procurar.
     */
    const corpo = fonte.split("export type EstadoDaEncomenda")[1] ?? "";
    expect([...corpo.matchAll(/[^\w.](\d+\.\d+)/g)].map(m => m[1])).toEqual([]);
  });

  /* A cor nao pode existir na regra sem existir na tela. */
  it("todo estagio da bolinha tem a sua cor no jogo", () => {
    for (const e of [
      "no-prazo",
      "folga-acabando",
      "atrasando",
      "no-limite",
      "estourou",
    ]) {
      expect(CSS).toContain(`.mapa__pino[data-bolinha="${e}"]`);
    }
  });

  /*
   * PULSO NOS DOIS ESTAGIOS QUENTES. A cor sozinha falha em dois casos reais:
   * a bolinha laranja em cima da loja laranja, e o jogador que nao distingue
   * as cores. O movimento salva os dois.
   */
  it("os estagios quentes pulsam, e o pulso final e o mais rapido", () => {
    const periodo = (estagio: string) => {
      const bloco =
        CSS.split(`[data-bolinha="${estagio}"] .mapa__bolinha`)[1] ?? "";
      return Number((bloco.match(/mapa-pulso\s+([\d.]+)s/) ?? [])[1]);
    };
    expect(periodo("atrasando")).toBeGreaterThan(0);
    expect(periodo("no-limite")).toBeGreaterThan(0);
    expect(periodo("no-limite")).toBeLessThan(periodo("atrasando"));
  });
});

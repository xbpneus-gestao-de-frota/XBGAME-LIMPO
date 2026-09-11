import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ENCANTO_DURA_MS,
  ENCANTO_ESPERA_MINIMA_MS,
  PONTOS,
  QUE_ACENDEM,
  QUE_RESPIRAM,
  SORTEAVEIS,
  esperaDoProximo,
  proximoEncanto,
} from "../../client/src/game/aVidaDoMapa";

const CSS = readFileSync("client/src/index.css", "utf8");
const VIDA = readFileSync("client/src/components/VidaDoMapa.tsx", "utf8");
const MAPA = readFileSync("client/src/components/MapaDoBairro.tsx", "utf8");

/**
 * A VIDA DO MAPA — os quinze pontos que ele marcou no desenho.
 */
describe("a vida do mapa", () => {
  it("sao os quinze pontos, e cada um sabe em que camada esta", () => {
    expect(PONTOS).toHaveLength(15);
    expect(new Set(PONTOS.map(p => p.numero)).size).toBe(15);
    for (const p of PONTOS) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(100);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(100);
      // quem ainda nao se mexe tem de dizer por que
      if (p.efeito === null) expect(p.espera).toBeTruthy();
    }
  });

  it("o que ainda espera desenho esta escrito, e nao esquecido", () => {
    /*
     * Cinco pontos precisam de desenho novo e um fica parado de proposito. Sem
     * este teste, "esperando desenho" vira "ninguem lembra por que aquele ponto
     * nao faz nada".
     */
    const esperando = PONTOS.filter(p => p.efeito === null);
    expect(esperando.length).toBeGreaterThan(0);
    for (const p of esperando) expect(p.espera!.length).toBeGreaterThan(20);
    // e o estacionamento continua parado DE PROPOSITO
    expect(PONTOS.find(p => p.numero === 13)!.espera).toContain("PARADOS");
  });

  it("um encanto por vez, e nunca o mesmo duas vezes seguidas", () => {
    /*
     * A regra do plano e "acontece pouco, num lugar por vez". Sao poucos pontos
     * sorteaveis: sem a regra do "nao repete", o acaso repete o mesmo lugar com
     * frequencia alta o bastante para a pessoa perceber que ha um sorteio — e
     * perceber o sorteio e perder o encanto.
     */
    expect(SORTEAVEIS.length).toBeGreaterThanOrEqual(2);
    for (const p of SORTEAVEIS)
      expect(proximoEncanto(p.numero, 0).numero).not.toBe(p.numero);
    // com um sorteio no limite de cima ainda sai um ponto valido
    expect(proximoEncanto(null, 0.999999)).toBeTruthy();
    // e o componente guarda UM, e nao uma lista
    expect(VIDA).toContain("useState<PontoDeVida | null>(null)");
  });

  it("ha silencio entre um encanto e outro", () => {
    /*
     * Encanto que acontece a cada tres segundos vira ruido de fundo em dois
     * minutos de jogo. A espera minima e maior que a duracao: o mapa fica
     * quieto mais tempo do que fica encantado.
     */
    expect(ENCANTO_ESPERA_MINIMA_MS).toBeGreaterThan(ENCANTO_DURA_MS);
    expect(esperaDoProximo(0)).toBe(ENCANTO_ESPERA_MINIMA_MS);
    expect(esperaDoProximo(1)).toBeGreaterThan(esperaDoProximo(0));
    // e o mapa nao abre com fumaca saindo
    expect(VIDA).toContain("setTimeout(acender, esperaDoProximo())");
  });

  it("as luzes do entardecer andam no mesmo relogio da luz do dia", () => {
    /*
     * Elas nao sao sorteadas: dependem da hora. As duas animacoes tem o mesmo
     * tempo e comecam juntas, entao ficam em fase sem ninguem sincronizar nada.
     * Se uma delas mudar de tempo, as luzes acendem no meio da manha.
     */
    expect(QUE_ACENDEM.length).toBeGreaterThan(0);
    const bloco = CSS.split(".vida__acende {")[1]!.split("}")[0]!;
    expect(bloco).toContain("var(--dia");
    const luz = CSS.split(".mapa__luz {")[1]!.split("}")[0]!;
    expect(luz).toContain("var(--dia");
  });

  it("o que respira fica ligado sempre, e sem sorteio", () => {
    expect(QUE_RESPIRAM.map(p => p.efeito).sort()).toEqual(["agua", "petalas"]);
    for (const p of QUE_RESPIRAM) expect(p.camada).toBe("respira");
  });

  it("a vida nao e corrigida pelo zoom, e o entregador e", () => {
    /*
     * O entregador e PECA DE JOGO — maior que a pessoa que representa —, entao
     * encolhe quando a pessoa aproxima. A fumaca que sai de uma chamine tem o
     * tamanho da chamine e cresce junto com ela.
     */
    const bloco = CSS.split("\n.vida {")[1]!.split("}")[0]!;
    expect(bloco).not.toContain("--zoom-raiz");
    const boneco = CSS.split("\n.entregador {")[1]!.split("}")[0]!;
    expect(boneco).toContain("--zoom-raiz");
  });

  it("a vida fica entre o desenho e os pinos", () => {
    expect(MAPA.indexOf("mapa__foto")).toBeLessThan(MAPA.indexOf("<VidaDoMapa"));
    expect(MAPA.indexOf("<VidaDoMapa")).toBeLessThan(
      MAPA.indexOf("O PINO RENDERIZADO")
    );
  });

  it("quem pediu menos movimento nao ve nada disso", () => {
    const onde = CSS.indexOf("  .vida {\n    display: none;");
    expect(onde).toBeGreaterThan(-1);
    const abertura = CSS.lastIndexOf(
      "@media (prefers-reduced-motion: reduce) {",
      onde
    );
    expect(abertura).toBeGreaterThan(-1);
    expect(CSS.slice(abertura, onde)).not.toMatch(/\n\.[a-z]/);
  });
});

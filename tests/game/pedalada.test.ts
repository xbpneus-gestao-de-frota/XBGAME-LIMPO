/**
 * O PRIMEIRO MINUTO NAO PODE VIRAR ESPERA.
 *
 * Estes testes nao existem para provar que uma divisao funciona. Existem
 * porque tres numeros diferentes — a regua do mapa, a velocidade da bicicleta
 * e o relogio do modo mapa — se multiplicam para decidir uma coisa so: quanto
 * tempo alguem fica pedalando sem nada acontecer na primeira corrida.
 *
 * Qualquer um dos tres pode ser mexido por um bom motivo, e o estrago so
 * apareceria jogando. Um bairro "um pouco maior" para caber mais casas, uma
 * bicicleta "mais realista" a 9 km/h, um relogio "menos arcade" — cada um
 * sozinho parece inofensivo e todos empurram a abertura para o mesmo lugar:
 * um minuto e meio olhando um desenho bonito sem fazer nada.
 */
import { describe, expect, it } from "vitest";
import { BASE, CASAS, COMERCIOS } from "../../client/src/game/addresses";
import {
  RELOGIO_DO_MAPA,
  VELOCIDADE_KMH,
  comoRelogio,
  segundosNaVidaReal,
  segundosPedalando,
} from "../../client/src/game/pedalada";

/** A corrida que o jogo monta na estreia: a loja mais perto da base. */
const lojaDaEstreia = [...COMERCIOS].sort(
  (a, b) => a.metrosDaBase - b.metrosDaBase
)[0]!;

const perto = (a: typeof BASE, b: typeof BASE) =>
  Math.hypot(a.em[0] - b.em[0], a.em[1] - b.em[1]);

const casaDaEstreia = [...CASAS].sort(
  (a, b) => perto(a, lojaDaEstreia) - perto(b, lojaDaEstreia)
)[0]!;

const METROS_DA_ESTREIA =
  lojaDaEstreia.metrosDaBase +
  Math.abs(casaDaEstreia.metrosDaBase - lojaDaEstreia.metrosDaBase);

describe("a pedalada", () => {
  it("a bicicleta anda como bicicleta, e nao como moto nem como quem empurra", () => {
    /*
     * Um adolescente solto faz 16 a 18 por hora; entregando, com esquina,
     * faixa e parada na porta, a media cai. Fora desta faixa nao e mais uma
     * bicicleta: abaixo e alguem empurrando, acima e motor.
     */
    expect(VELOCIDADE_KMH).toBeGreaterThanOrEqual(9);
    expect(VELOCIDADE_KMH).toBeLessThanOrEqual(20);
  });

  it("o relogio do mapa corre para frente, e no maximo como bicicleta rapida", () => {
    // Menor que 1 seria camera lenta; acima de 6 a bicicleta vira desenho
    // animado e o bairro perde o tamanho que ele tem.
    expect(RELOGIO_DO_MAPA).toBeGreaterThanOrEqual(1);
    expect(RELOGIO_DO_MAPA).toBeLessThanOrEqual(6);
  });

  it("a estreia comeca na loja mais perto da base", () => {
    // E o que salva o primeiro minuto: a primeira corrida e, de proposito, a
    // mais curta do bairro. Se um dia a estreia passar a sortear a loja, esta
    // conta cai junto.
    for (const c of COMERCIOS) {
      expect(lojaDaEstreia.metrosDaBase).toBeLessThanOrEqual(c.metrosDaBase);
    }
  });

  it("a primeira corrida cabe no primeiro minuto de jogo", () => {
    /*
     * Um minuto de pedalada e o teto, e ainda e generoso: falta somar a
     * conversa da coleta e a da entrega. Passando disso, o laco inteiro da
     * estreia — pegar, levar, receber — nao fecha antes de a pessoa decidir
     * se continua.
     */
    const segundos = segundosPedalando(METROS_DA_ESTREIA);
    expect(segundos).toBeLessThanOrEqual(60);
    // E nem tao curta que a corrida deixe de existir: o mapa precisa ser
    // atravessado para a entrega significar alguma coisa.
    expect(segundos).toBeGreaterThanOrEqual(8);
  });

  it("nenhuma entrega do bairro vira uma travessia sem fim", () => {
    // A casa mais longe da base e o pior caso possivel de uma entrega.
    const maisLonge = Math.max(...CASAS.map(c => c.metrosDaBase));
    expect(segundosPedalando(maisLonge)).toBeLessThanOrEqual(180);
  });

  it("o tempo de vida real continua plausivel para um bairro de verdade", () => {
    /*
     * Esta e a trava da REGUA, e nao do relogio. Se alguem encolher o mapa
     * para as corridas ficarem rapidas, o tempo de vida real desaba junto — e
     * ai o frete por quilometro passa a pagar centavos por uma entrega que no
     * mundo levaria dez minutos.
     */
    const maisLonge = Math.max(...CASAS.map(c => c.metrosDaBase));
    const minutos = segundosNaVidaReal(maisLonge) / 60;
    expect(minutos).toBeGreaterThan(2);
    expect(minutos).toBeLessThan(20);
  });

  it("diz a hora de um jeito que se le em voz alta", () => {
    expect(comoRelogio(28)).toBe("28s");
    expect(comoRelogio(88)).toBe("1m28s");
    expect(comoRelogio(120)).toBe("2m00s");
    // Distancia zero nao vira "0s": a casa ao lado da base soaria como defeito.
    expect(comoRelogio(0)).toBe("1s");
    expect(segundosPedalando(0)).toBe(0);
    expect(segundosPedalando(Number.NaN)).toBe(0);
  });
});

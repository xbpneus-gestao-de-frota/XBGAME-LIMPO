/**
 * O CAMINHO NÃO PODE CORTAR QUARTEIRÃO.
 *
 * Este arquivo existe por causa de uma frase dita olhando a tela: "TEMOS CASOS
 * DE JOGADOR NA CALÇADA". A malha foi consertada, mas a rota e outra coisa: dá
 * para ter uma malha perfeita e ainda assim mandar o entregador em linha reta
 * por cima de um jardim, se quem monta o caminho errar uma emenda.
 *
 * O jeito de pegar isso sem olhar cada rota à mão é medir a distância de cada
 * ponto do caminho até a linha da rua mais perto. Se algum ponto está longe da
 * rua, aquele pedaço atravessa quintal — e nenhum desenho bonito conserta.
 */
import { describe, expect, it } from "vitest";
import { BASE, CASAS, COMERCIOS } from "../../client/src/game/addresses";
import { metrosAPe, metrosDaRota, rota } from "../../client/src/game/rotas";
import { TRECHOS } from "../../client/src/game/streets";

/** Distancia de um ponto ate a LINHA da rua mais perto, em % do mapa. */
function ateARua(p: readonly [number, number]): number {
  let perto = Infinity;
  for (const t of TRECHOS) {
    for (let i = 1; i < t.linha.length; i += 1) {
      const a = t.linha[i - 1]!;
      const b = t.linha[i]!;
      const vx = b[0] - a[0];
      const vy = b[1] - a[1];
      const c = vx * vx + vy * vy;
      let f = c === 0 ? 0 : ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / c;
      f = Math.max(0, Math.min(1, f));
      const d = Math.hypot(p[0] - (a[0] + vx * f), p[1] - (a[1] + vy * f));
      if (d < perto) perto = d;
    }
  }
  return perto;
}

describe("o caminho pelas ruas", () => {
  it("liga a base a qualquer porta do bairro", () => {
    for (const destino of [...COMERCIOS, CASAS[0]!, CASAS[CASAS.length - 1]!]) {
      const caminho = rota(BASE.em, destino.em);
      expect(caminho.length).toBeGreaterThan(1);
    }
  });

  it("nenhum ponto do caminho sai da rua", () => {
    /*
     * Meio por cento do mapa e cerca de seis metros: cabe a largura da faixa
     * de rolamento e o meio-fio, e nao cabe um quintal.
     */
    const destinos = [
      COMERCIOS[0]!,
      COMERCIOS[3]!,
      CASAS[10]!,
      CASAS[CASAS.length - 1]!,
    ];
    for (const d of destinos) {
      for (const p of rota(BASE.em, d.em)) {
        expect(ateARua(p)).toBeLessThan(0.5);
      }
    }
  });

  it("comeca onde manda e termina onde manda", () => {
    const destino = CASAS[Math.floor(CASAS.length / 3)]!;
    const caminho = rota(BASE.em, destino.em);
    const primeiro = caminho[0]!;
    const ultimo = caminho[caminho.length - 1]!;
    // As pontas sao as PORTAS, que ficam na rua — nao o meio do predio.
    expect(
      Math.hypot(primeiro[0] - BASE.em[0], primeiro[1] - BASE.em[1])
    ).toBeLessThan(1.5);
    expect(
      Math.hypot(ultimo[0] - destino.em[0], ultimo[1] - destino.em[1])
    ).toBeLessThan(1.5);
  });

  it("o caminho desenhado tem o mesmo tamanho da caminhada calculada", () => {
    /*
     * Sao duas contas diferentes: uma soma trechos da malha, a outra soma o
     * desenho ponto a ponto. Se elas se separarem, o jogo cobra um frete que
     * nao corresponde ao caminho que a pessoa viu ser percorrido.
     */
    for (const destino of [
      COMERCIOS[1]!,
      CASAS[5]!,
      CASAS[CASAS.length - 2]!,
    ]) {
      const desenhado = metrosDaRota(rota(BASE.em, destino.em));
      const calculado = metrosAPe(BASE.em, destino.em);
      expect(Math.abs(desenhado - calculado)).toBeLessThan(
        Math.max(12, calculado * 0.06)
      );
    }
  });

  it("nao volta pelo mesmo lugar sem motivo", () => {
    // Um caminho que anda muito mais que a linha reta esta dando volta demais;
    // um que anda menos atravessou alguma coisa.
    for (const destino of [
      COMERCIOS[2]!,
      CASAS[Math.floor(CASAS.length / 2)]!,
    ]) {
      const caminho = rota(BASE.em, destino.em);
      const reta = Math.hypot(
        destino.em[0] - BASE.em[0],
        destino.em[1] - BASE.em[1]
      );
      const andado = metrosDaRota(caminho);
      // A reta esta em % do mapa; convertida grosso modo para metros pela
      // largura do bairro, ela e sempre menor que o caminho pela rua.
      const retaEmMetros = (reta / 100) * 1448 * 0.83;
      expect(andado).toBeGreaterThan(retaEmMetros * 0.9);
      expect(andado).toBeLessThan(retaEmMetros * 2.6);
    }
  });
});

/**
 * O CAMINHO TAMBEM PRECISA FICAR PRONTO A TEMPO.
 *
 * Em 13/09/2026 este arquivo nao teria pegado o defeito que apareceu: montar
 * UMA rota custava 135 ms, e nenhum teste mede tempo. Com 18 moradores na
 * agenda isso passava despercebido, porque cada caminho fica guardado depois
 * de feito; com as 48 casas do bairro, a tela que lista todo mundo com
 * quilometragem passaria seis segundos parada na primeira vez.
 *
 * Nao ha numero magico aqui: a folga e enorme de proposito. O teste nao esta
 * medindo a velocidade da maquina de quem roda — esta impedindo que a conta
 * volte a ser cem vezes mais cara sem ninguem perceber.
 */
describe("o caminho fica pronto a tempo", () => {
  it("uma rota nova, do outro lado do bairro, sai em bem menos de meio segundo", () => {
    const loja = COMERCIOS[COMERCIOS.length - 1]!;
    const casa = CASAS[CASAS.length - 1]!;
    const comeco = Date.now();
    const caminho = rota(loja.em, casa.em);
    const gasto = Date.now() - comeco;

    expect(caminho.length).toBeGreaterThan(2);
    expect(gasto).toBeLessThan(500);
  });

  it("a agenda inteira com quilometragem nao trava a tela", () => {
    /*
     * E exatamente o que a tela da loja faz quando pergunta "para quem e a
     * entrega?": uma rota para cada morador do bairro, de uma vez so.
     */
    const loja = COMERCIOS[0]!;
    const comeco = Date.now();
    for (const casa of CASAS) rota(loja.em, casa.em);
    const gasto = Date.now() - comeco;

    expect(gasto).toBeLessThan(4000);
  });
});

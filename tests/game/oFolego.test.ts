/**
 * O FOLEGO CAI COM A DISTANCIA.
 *
 * Ordem dele, 12/09/2026: "cada corrida quanto desgasta".
 *
 * Este e o primeiro pedaco da saude e so ele: o numero caindo. O que estes
 * testes seguram e o que, se soltar, faz a saude inteira nascer torta depois:
 *
 *   · O DIA TEM DE ESVAZIAR UM ENTREGADOR que nao para nunca. Se o folego
 *     sobrar no fim do dia, agua, almoco e expediente viram enfeite — ninguem
 *     vai precisar deles.
 *   · MAS NAO PODE ESVAZIAR NA PRIMEIRA HORA, senao o jogo vira uma parada so.
 *   · QUEM ESTA PARADO NAO PODE SE RECUPERAR SOZINHO ate em cima. Se ficar de
 *     pe na base devolvesse o dia inteiro, o descanso nao teria para que
 *     existir.
 *   · A REGUA DA DISTANCIA E A DO RESTO DO JOGO. Se o folego passar a medir a
 *     pedalada com uma velocidade propria, ele e o mapa contam corridas
 *     diferentes.
 */
import { describe, expect, it } from "vitest";

import {
  CUSTO_POR_KM,
  FAIXAS_DO_FOLEGO,
  FOLEGO_CHEIO,
  custoDeUmSegundo,
  faixaDoFolego,
  folegoDe,
  pesoDaCarga,
  pesoDoSol,
  umSegundoDeFolego,
} from "@/game/xbwapp/oFolego";
import { SEGUNDOS_POR_KM, novoEmRota, type EmRota } from "@/game/xbwapp/aRota";
import { SEGUNDOS_DO_DIA } from "@/game/oRelogioDoBairro";
import { KM_DA_CORRIDA_TIPICA } from "@/game/xbwapp/entregaRapida";
import { estadoInicial } from "@/game/xbwapp/estado";

/**
 * Alguem na rua, com uma parada pela frente E A BOLSA VAZIA.
 *
 * A parada e de COLETA de proposito: ele esta indo buscar, entao nao carrega
 * nada. Uma parada de entrega sem a coleta antes significa encomenda na bolsa,
 * e a bolsa pesa — o primeiro teste escrito aqui media o peso junto com a
 * distancia sem perceber.
 */
function naRua(veiculo = "bicicleta"): EmRota {
  return {
    ...novoEmRota("Renan", veiculo),
    paradas: [{ pedido: "#1", o: "coleta", lugar: "padaria" }],
  };
}

describe("o folego cai com a distancia", () => {
  it("quem esta parado nao gasta nada", () => {
    const parado = novoEmRota("Renan");
    expect(custoDeUmSegundo(parado, 0)).toBe(0);
  });

  it("um quilometro pedalado custa o que esta escrito", () => {
    /*
     * O segundo de pedalada sai da velocidade do veiculo — a MESMA que o resto
     * do jogo usa. Somando os segundos de um quilometro tem de dar o custo do
     * quilometro, ou as duas reguas se separaram.
     */
    const quem = naRua();
    const segundosDeUmKm = SEGUNDOS_POR_KM.bicicleta!;
    /* Ao amanhecer o sol nao pesa, e a bolsa esta vazia: so a distancia. */
    const deUmKm = custoDeUmSegundo(quem, 0) * segundosDeUmKm;
    expect(deUmKm).toBeCloseTo(CUSTO_POR_KM, 5);
  });

  it("a moto cansa bem menos que a bicicleta", () => {
    const km = (v: string) =>
      custoDeUmSegundo(naRua(v), 0) * (SEGUNDOS_POR_KM[v] ?? 1);
    expect(km("moto")).toBeLessThan(km("bicicleta") / 2);
  });

  it("o sol do meio-dia pesa, e o do amanhecer nao", () => {
    const meioDia = 0.45 * SEGUNDOS_DO_DIA;
    expect(pesoDoSol(0)).toBeCloseTo(1, 5);
    expect(pesoDoSol(meioDia)).toBeGreaterThan(1.3);
    /* Sobe e desce junto com o dia: nao liga e desliga numa hora cravada. */
    expect(pesoDoSol(meioDia * 0.5)).toBeGreaterThan(1);
    expect(pesoDoSol(meioDia * 0.5)).toBeLessThan(pesoDoSol(meioDia));
  });

  it("a bolsa cheia pesa, e para de pesar em algum ponto", () => {
    expect(pesoDaCarga(0)).toBe(1);
    expect(pesoDaCarga(3)).toBeGreaterThan(pesoDaCarga(0));
    expect(pesoDaCarga(50)).toBe(pesoDaCarga(6));
  });

  it("um dia inteiro de pedalada sem parar esvazia o entregador", () => {
    /*
     * ESTA E A CONTA QUE FAZ A SAUDE VIRAR JOGO. Se sobrar folego no fim do
     * dia, agua, almoco e expediente nao terao para que existir.
     */
    let folego = FOLEGO_CHEIO;
    const quem = naRua();
    for (let s = 0; s < SEGUNDOS_DO_DIA; s += 1) {
      folego = umSegundoDeFolego(folego, quem, s);
    }
    expect(folego).toBe(0);
  });

  it("mas nao esvazia na primeira hora", () => {
    /* Um dia que acaba as sete da manha nao e jogo, e uma parede. */
    let folego = FOLEGO_CHEIO;
    const quem = naRua();
    const umaHora = SEGUNDOS_DO_DIA / 14;
    for (let s = 0; s < umaHora; s += 1) {
      folego = umSegundoDeFolego(folego, quem, s);
    }
    expect(folego).toBeGreaterThan(FOLEGO_CHEIO / 2);
  });

  it("vinte corridas tipicas gastam quase tudo", () => {
    /* E a conta de onde o numero saiu: vinte corridas sao um dia de trabalho. */
    const gasto = 20 * KM_DA_CORRIDA_TIPICA * CUSTO_POR_KM;
    expect(gasto).toBeGreaterThan(FOLEGO_CHEIO * 0.85);
    expect(gasto).toBeLessThan(FOLEGO_CHEIO * 1.3);
  });

  it("ficar parado devolve pouco, e nunca o dia inteiro", () => {
    let folego = 10;
    const parado = novoEmRota("Renan");
    for (let s = 0; s < SEGUNDOS_DO_DIA; s += 1) {
      folego = umSegundoDeFolego(folego, parado, s);
    }
    expect(folego).toBeGreaterThan(10);
    expect(folego).toBeLessThan(40);
  });

  it("nunca passa de cheio nem cai abaixo de zero", () => {
    const parado = novoEmRota("Renan");
    expect(umSegundoDeFolego(FOLEGO_CHEIO, parado, 0)).toBe(FOLEGO_CHEIO);
    expect(umSegundoDeFolego(0.001, naRua(), 0)).toBe(0);
  });

  it("as faixas cobrem de zero a cheio, sem buraco", () => {
    expect(faixaDoFolego(FOLEGO_CHEIO)).toBe("inteiro");
    expect(faixaDoFolego(0)).toBe("acabado");
    for (let n = 0; n <= FOLEGO_CHEIO; n += 1) {
      const f = faixaDoFolego(n);
      expect(FAIXAS_DO_FOLEGO.some(x => x.chave === f)).toBe(true);
    }
    /* Escritas de cima para baixo: a busca pega a primeira que couber. */
    const portas = FAIXAS_DO_FOLEGO.map(f => f.de);
    expect([...portas].sort((a, b) => b - a)).toEqual(portas);
  });

  it("quem ainda nao trabalhou esta inteiro, e nao zerado", () => {
    /* Entregador novo nao nasce cansado, e nao precisa ser cadastrado. */
    expect(folegoDe({}, "Lorena")).toBe(FOLEGO_CHEIO);
    expect(estadoInicial().folego).toEqual({});
  });
});

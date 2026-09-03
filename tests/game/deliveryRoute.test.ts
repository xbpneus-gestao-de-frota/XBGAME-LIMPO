/**
 * Guarda da regra da entrega. Ela e pura de proposito: a fila de paradas e a
 * conta do ganho tem de poder ser conferidas sem cena, sem GPU e sem sorte.
 *
 * As distancias abaixo sao as reais, medidas no circuito vestido: Mercado no
 * metro 71, Base no 341, Hospital no 566 e Pizzaria no 786 de uma volta de
 * 799,2 m — em unidades do jogo, tudo isso vezes 2,3. E sao 61 casas, como no
 * mapa de verdade, numeradas na ordem da rua.
 */
import { describe, expect, it } from "vitest";
import type { LugarNaVolta } from "../../client/src/game/CircuitTrack";
import {
  MAXIMO_ATE_A_ENTREGA,
  MAXIMO_DE_COLETAS,
  MAXIMO_DE_ENTREGAS,
  MINIMO_ATE_A_ENTREGA,
  MINIMO_ENTRE_PARADAS,
  TARIFA_PADRAO,
  coletadasAte,
  distanciaAdiante,
  entreguesAte,
  etapaEm,
  ganhoDaRota,
  montarRota,
  pacotesNaBolsa,
  proximaParada,
} from "../../client/src/game/deliveryRoute";

const ESCALA = 2.3;
const VOLTA = 799.2 * ESCALA;

const lugar = (
  nome: string,
  papel: LugarNaVolta["papel"],
  metros: number,
  numero?: number
): LugarNaVolta => ({
  chave: nome,
  nome,
  papel,
  distancia: metros * ESCALA,
  lado: -1,
  local: { x: 0, z: 0 },
  ...(numero === undefined ? {} : { numero }),
});

const BAIRRO: LugarNaVolta[] = [
  lugar("Mercado XB", "comercio", 71, 1),
  lugar("Base XB", "base", 341),
  lugar("Hospital", "comercio", 566, 2),
  lugar("Pizzaria", "comercio", 786, 3),
  // 61 casas espalhadas, uma a cada ~13 m, como no mapa de verdade.
  ...Array.from({ length: 61 }, (_, i) =>
    lugar(`Casa ${i + 1}`, "casa", 8.5 + i * 12.7, i + 1)
  ),
];

/** Varre o sorteio inteiro: a regra tem de valer sempre, nao no caso escolhido. */
const paraCadaSorteio = (
  quantos: number,
  capacidade: number,
  conferir: (rota: NonNullable<ReturnType<typeof montarRota>>) => void
) => {
  for (let i = 0; i < quantos; i += 1) {
    const rota = montarRota(BAIRRO, VOLTA, () => i / quantos, capacidade);
    expect(rota).not.toBeNull();
    conferir(rota!);
  }
};

describe("a entrega em cima do circuito", () => {
  it("mede a distancia sempre para a frente, dando a volta quando precisa", () => {
    expect(distanciaAdiante(10, 90, 100)).toBe(80);
    // De 90 para 10 nao volta 80 para tras: anda 20 para a frente e fecha a
    // volta. Sem isto, uma entrega logo depois da linha viraria numero negativo.
    expect(distanciaAdiante(90, 10, 100)).toBe(20);
    expect(distanciaAdiante(50, 50, 100)).toBe(0);
  });

  it("com a bolsa do comeco, faz uma coleta e uma porta", () => {
    paraCadaSorteio(60, 1, rota => {
      expect(rota.coletas).toBe(1);
      expect(rota.entregas).toBe(1);
      expect(rota.paradas[0]!.tipo).toBe("coleta");
      expect(rota.paradas[0]!.lugar.papel).toBe("comercio");
      expect(rota.paradas[1]!.tipo).toBe("entrega");
      expect(rota.paradas[1]!.lugar.numero).toBeGreaterThan(0);
    });
  });

  it("da bolsa 2 em diante, duas portas — e as vezes duas coletas", () => {
    const formatos = new Set<string>();
    for (let i = 0; i < 80; i += 1) {
      const rota = montarRota(BAIRRO, VOLTA, () => i / 80, 2)!;
      expect(rota.entregas).toBe(2);
      formatos.add(`${rota.coletas}c${rota.entregas}e`);
    }
    // Os dois formatos que o Fernando pediu aparecem: uma coleta com duas
    // entregas, e duas coletas com duas entregas.
    expect(formatos.has("1c2e")).toBe(true);
    expect(formatos.has("2c2e")).toBe(true);
  });

  it("coleta antes de entregar, e a bolsa nunca fica negativa", () => {
    paraCadaSorteio(60, 4, rota => {
      let jaEntregou = false;
      rota.paradas.forEach(parada => {
        if (parada.tipo === "coleta") {
          // Voltar ao comercio depois de comecar a entregar seria vaivem.
          expect(jaEntregou).toBe(false);
        } else {
          jaEntregou = true;
          // Entregar de bolsa vazia e a falha que mais passa despercebida: a
          // rota parece certa e o pacote nunca existiu. Depois de tirar um, a
          // bolsa ainda tem de fechar em zero ou mais.
          expect(parada.naBolsa).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  it("a bolsa enche nas coletas, esvazia nas portas e fecha em zero", () => {
    const CAPACIDADE = 3;
    paraCadaSorteio(40, CAPACIDADE, rota => {
      let anterior = 0;
      rota.paradas.forEach(parada => {
        if (parada.tipo === "coleta") {
          // Cada comercio entrega pelo menos um pacote: passar la para nao
          // pegar nada seria parada sem motivo.
          expect(parada.naBolsa).toBeGreaterThan(anterior);
        } else {
          // Cada porta tira exatamente um.
          expect(parada.naBolsa).toBe(anterior - 1);
        }
        expect(parada.naBolsa).toBeGreaterThanOrEqual(0);
        expect(parada.naBolsa).toBeLessThanOrEqual(CAPACIDADE);
        anterior = parada.naBolsa;
      });
      // Sair com a bolsa cheia e voltar com pacote dentro seria entrega que
      // nao aconteceu.
      expect(anterior).toBe(0);
    });
  });

  it("nao repete lugar e respeita o espaco entre as paradas", () => {
    paraCadaSorteio(60, 4, rota => {
      const chaves = rota.paradas.map(parada => parada.lugar.chave);
      expect(new Set(chaves).size).toBe(chaves.length);

      for (let k = 1; k < rota.paradas.length; k += 1) {
        const anterior = rota.paradas[k - 1]!;
        const atual = rota.paradas[k]!;
        const minimo =
          anterior.tipo === "coleta" && atual.tipo === "entrega"
            ? MINIMO_ATE_A_ENTREGA
            : MINIMO_ENTRE_PARADAS;
        expect(atual.distancia).toBeGreaterThanOrEqual(
          anterior.distancia + minimo
        );
      }
    });
  });

  it("nunca joga a primeira porta do outro lado do mundo", () => {
    paraCadaSorteio(60, 3, rota => {
      const ultimaColeta = [...rota.paradas]
        .reverse()
        .find(parada => parada.tipo === "coleta")!;
      const primeiraPorta = rota.paradas.find(
        parada => parada.tipo === "entrega"
      )!;
      expect(
        primeiraPorta.distancia - ultimaColeta.distancia
      ).toBeLessThanOrEqual(MAXIMO_ATE_A_ENTREGA);
    });
  });

  it("pedir mais portas do que o bairro comporta nao quebra a rota", () => {
    const rota = montarRota(BAIRRO, VOLTA, () => 0.5, 99)!;
    expect(rota.entregas).toBeGreaterThanOrEqual(1);
    expect(rota.entregas).toBeLessThanOrEqual(MAXIMO_DE_ENTREGAS);
    expect(rota.coletas).toBeLessThanOrEqual(MAXIMO_DE_COLETAS);
  });

  it("traduz a bolsa em numero de portas", () => {
    expect(pacotesNaBolsa(0)).toBe(1);
    expect(pacotesNaBolsa(1)).toBe(1);
    expect(pacotesNaBolsa(4)).toBe(2);
    expect(pacotesNaBolsa(7)).toBe(3);
    expect(pacotesNaBolsa(9)).toBe(4);
    expect(pacotesNaBolsa(19)).toBe(MAXIMO_DE_ENTREGAS);
    expect(pacotesNaBolsa(Number.NaN)).toBe(1);
    expect(pacotesNaBolsa(-5)).toBe(1);
  });

  it("paga por distancia rodada e por porta aberta, nunca por tempo", () => {
    const rota = montarRota(BAIRRO, VOLTA, () => 0.4, 2)!;
    const esperado = Math.round(
      rota.entregas * TARIFA_PADRAO.porEntrega +
        rota.distancia * TARIFA_PADRAO.porUnidade
    );
    expect(ganhoDaRota(rota)).toBe(esperado);

    // Duas rotas com as mesmas portas: quem rodou mais recebe mais. E esta a
    // diferenca entre pagar por distancia e pagar por tempo.
    const perto = { ...rota, distancia: 200 };
    const longe = { ...rota, distancia: 900 };
    expect(ganhoDaRota(longe)).toBeGreaterThan(ganhoDaRota(perto));

    // E mais portas no mesmo caminho tambem valem mais.
    const maisPortas = { ...rota, entregas: rota.entregas + 1 };
    expect(ganhoDaRota(maisPortas)).toBeGreaterThan(ganhoDaRota(rota));
  });

  it("a corrida de uma porta rende no patamar da primeira entrega", () => {
    /*
     * Amarra a tarifa nova ao patamar da economia antiga: se alguem mexer nos
     * numeros sem querer, este teste avisa antes de o jogo ficar rico ou pobre.
     *
     * O teto sai da geometria, nao de gosto: nenhuma corrida pode render mais
     * do que uma volta inteira mais a porta. E o piso existe para a primeira
     * entrega continuar valendo a pena.
     */
    const teto = TARIFA_PADRAO.porEntrega + VOLTA * TARIFA_PADRAO.porUnidade;
    const ganhos: number[] = [];
    for (let i = 0; i < 40; i += 1) {
      const rota = montarRota(BAIRRO, VOLTA, () => i / 40, 1)!;
      const ganho = ganhoDaRota(rota);
      expect(ganho).toBeGreaterThanOrEqual(6);
      expect(ganho).toBeLessThanOrEqual(teto);
      ganhos.push(ganho);
    }
    // O caso tipico — nao o extremo — fica na casa dos dez, como a primeira
    // entrega escrita a mao. Mediana, e nao media: um sorteio de ponta nao
    // desloca a conta.
    ganhos.sort((a, b) => a - b);
    const mediana = ganhos[Math.floor(ganhos.length / 2)]!;
    expect(mediana).toBeGreaterThanOrEqual(8);
    expect(mediana).toBeLessThanOrEqual(14);
  });

  it("diz em que etapa o jogador esta", () => {
    const rota = montarRota(BAIRRO, VOLTA, () => 0.2, 2)!;
    const ultimaColeta = [...rota.paradas]
      .reverse()
      .find(parada => parada.tipo === "coleta")!;
    expect(etapaEm(rota, 0)).toBe("indo-coletar");
    expect(etapaEm(rota, ultimaColeta.distancia - 1)).toBe("indo-coletar");
    expect(etapaEm(rota, ultimaColeta.distancia)).toBe("indo-entregar");
    expect(etapaEm(rota, rota.distancia - 1)).toBe("indo-entregar");
    expect(etapaEm(rota, rota.distancia)).toBe("entregue");
  });

  it("conta coletas e portas feitas, e aponta a proxima parada", () => {
    const rota = montarRota(BAIRRO, VOLTA, () => 0.3, 3)!;
    expect(coletadasAte(rota, 0)).toBe(0);
    expect(entreguesAte(rota, 0)).toBe(0);
    expect(proximaParada(rota, 0)).toBe(rota.paradas[0]);

    rota.paradas.forEach((parada, i) => {
      const feitas = rota.paradas.slice(0, i + 1);
      expect(coletadasAte(rota, parada.distancia)).toBe(
        feitas.filter(p => p.tipo === "coleta").length
      );
      expect(entreguesAte(rota, parada.distancia)).toBe(
        feitas.filter(p => p.tipo === "entrega").length
      );
    });

    // Acabou: nao ha proxima parada, e ninguem pode ficar esperando uma.
    expect(proximaParada(rota, rota.distancia)).toBeNull();
  });

  it("devolve nada quando falta base, comercio ou casa", () => {
    expect(montarRota([], VOLTA, () => 0.5)).toBeNull();
    const semCasa = BAIRRO.filter(l => l.papel !== "casa");
    expect(montarRota(semCasa, VOLTA, () => 0.5)).toBeNull();
    const semBase = BAIRRO.filter(l => l.papel !== "base");
    expect(montarRota(semBase, VOLTA, () => 0.5)).toBeNull();
  });
});

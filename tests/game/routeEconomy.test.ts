/**
 * A tabela de rotas da campanha, agora que o preco dela nao e mais digitado.
 *
 * Estes testes existem por causa de dois defeitos que ninguem tinha visto —
 * porque nenhum dos dois quebra a tela, trava o jogo ou aparece no console:
 *
 *   1. A entrega de bicicleta de 18 km pagava 680 XB$. O frete real dela e
 *      39. O jogo tinha uma economia inflada em dezessete vezes na era da
 *      bicicleta e uma economia correta na era da carreta — as duas ao mesmo
 *      tempo, dentro do mesmo jogo.
 *
 *   2. TODA rota planetaria dava prejuizo. O custo por km do veiculo
 *      planetario (9,80) era maior que o frete por km (6,67), entao quanto
 *      mais longe a carreta espacial ia, mais dinheiro a empresa perdia. O
 *      fim do jogo era um buraco no caixa.
 *
 * Numero errado nao grita. Por isso ele precisa de teste.
 */
import { describe, expect, it } from "vitest";
import {
  DURACAO_MINIMA_SEGUNDOS,
  ROUTES,
  duracaoDaRota,
} from "../../client/src/game/progression";
import {
  operatingCosts,
  routeDistanceKm,
} from "../../client/src/game/operations";
import { REGIONS } from "../../client/src/game/progression";
import {
  CLASSE_DO_VEICULO,
  FROTA,
  REPASSE,
  freteDaRotaDaCarreira,
} from "../../client/src/game/freight";

const escalaDaRota = (regionId: string) =>
  REGIONS.find(regiao => regiao.id === regionId)?.scale ?? "city";

/** O custo de rodar a rota, no terreno e no ajuste neutros. */
const custoDaRota = (rota: (typeof ROUTES)[number]) =>
  operatingCosts(
    rota.requiredVehicle,
    routeDistanceKm(rota.distanceKm, rota.durationSeconds, rota.difficulty),
    rota.difficulty,
    escalaDaRota(rota.regionId),
    "urban",
    "neutral"
  ).total * (rota.operatingCostScale ?? 1);

describe("o preco de cada rota da campanha", () => {
  it("e o frete de verdade, e nao um numero escolhido", () => {
    // Se alguem voltar a digitar um premio, a diferenca aparece aqui.
    ROUTES.forEach(rota => {
      expect(rota.baseReward).toBe(
        Math.round(
          freteDaRotaDaCarreira(
            rota.requiredVehicle,
            rota.distanceKm,
            rota.volumes
          )
        )
      );
    });
  });

  it("nunca cobra por mais volume do que cabe no veiculo", () => {
    ROUTES.forEach(rota => {
      const capacidade = FROTA[CLASSE_DO_VEICULO[rota.requiredVehicle]]
        .capacidade;
      expect(rota.volumes).toBeGreaterThan(0);
      expect(rota.volumes).toBeLessThanOrEqual(capacidade);
    });
  });

  it("cresce a cada rota da campanha, do pedal ao planeta", () => {
    /*
     * A tabela e a escada do jogo. Se uma rota mais adiante pagar menos que
     * uma anterior, a pessoa que chegou ate ali e punida por ter avancado.
     */
    for (let i = 1; i < ROUTES.length; i += 1) {
      expect(ROUTES[i]!.baseReward).toBeGreaterThan(ROUTES[i - 1]!.baseReward);
    }
  });

  it("sobra dinheiro em toda rota, inclusive nas planetarias", () => {
    ROUTES.forEach(rota => {
      const liquido = rota.baseReward - custoDaRota(rota);
      expect(
        liquido,
        `${rota.id} fecha no vermelho: ${liquido.toFixed(0)}`
      ).toBeGreaterThan(0);
    });
  });

  it("o que sobra tambem cresce rota a rota", () => {
    // Nao basta a rota dar lucro: ela tem de dar MAIS lucro que a anterior,
    // senao subir de veiculo vira castigo.
    const liquidos = ROUTES.map(rota => rota.baseReward - custoDaRota(rota));
    for (let i = 1; i < liquidos.length; i += 1) {
      expect(
        liquidos[i]!,
        `${ROUTES[i]!.id} sobra menos que ${ROUTES[i - 1]!.id}`
      ).toBeGreaterThan(liquidos[i - 1]!);
    }
  });

  it("nenhum veiculo custa mais por km do que o frete que ele cobra", () => {
    /*
     * Este e o defeito planetario, preso na raiz: um veiculo cujo custo por
     * km passa o frete por km perde dinheiro em toda viagem longa, e o
     * prejuizo cresce junto com a distancia. Nao da para descobrir isso
     * jogando sem ficar rico primeiro.
     */
    (Object.keys(CLASSE_DO_VEICULO) as (keyof typeof CLASSE_DO_VEICULO)[])
      .forEach(veiculo => {
        const tabela = FROTA[CLASSE_DO_VEICULO[veiculo]];
        const custo =
          tabela.custo.combustivel +
          tabela.custo.pneus +
          tabela.custo.manutencao +
          tabela.custo.depreciacao +
          tabela.fretePorKm * REPASSE.transportadora;
        expect(custo, `${veiculo} gasta mais do que cobra`).toBeLessThan(
          tabela.fretePorKm
        );
      });
  });
});

describe("o tempo de cada rota", () => {
  it("nunca encolhe quando a distancia cresce", () => {
    /*
     * O defeito que estava na tabela escrita a mao: 8 km levavam 30 s e 18 km
     * levavam 15 s. A rota mais longa terminava primeiro.
     */
    for (let km = 1; km <= 5_000; km += 7) {
      expect(duracaoDaRota(km + 7)).toBeGreaterThanOrEqual(duracaoDaRota(km));
    }
  });

  it("respeita o piso, mesmo na entrega da esquina", () => {
    expect(duracaoDaRota(0)).toBe(DURACAO_MINIMA_SEGUNDOS);
    expect(duracaoDaRota(1)).toBe(DURACAO_MINIMA_SEGUNDOS);
    ROUTES.forEach(rota => {
      expect(rota.durationSeconds).toBeGreaterThanOrEqual(
        DURACAO_MINIMA_SEGUNDOS
      );
    });
  });

  it("continua parecida com a tabela que o Fernando aprovou", () => {
    // A curva foi ajustada em cima da tabela antiga justamente para o fim do
    // jogo nao mudar de ritmo. Se alguem mexer no expoente, isto avisa.
    expect(duracaoDaRota(300)).toBe(36);
    expect(duracaoDaRota(4_200)).toBe(136); // a tabela antiga dizia 135
  });

  it("nao decide mais quanto a rota paga", () => {
    // Rota por distancia, e nao por tempo: duas rotas do mesmo tamanho pagam
    // igual, por mais que a barra demore.
    const iguais = ROUTES.filter(
      rota => rota.requiredVehicle === "truck"
    ).map(rota => rota.baseReward / rota.distanceKm);
    iguais.forEach(porKm => expect(porKm).toBeGreaterThan(0));
    expect(Math.max(...iguais) / Math.min(...iguais)).toBeLessThan(2);
  });
});

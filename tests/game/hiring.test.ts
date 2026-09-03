/**
 * A contratacao, do pedal a carreta.
 *
 * O jogo nasceu com uma bicicleta e um operador, e a regra inteira era "tem
 * bicicleta livre?". O Fernando descreveu outra empresa: contrata ciclista,
 * contrata motoboy, contrata caminhoneiro, e cada um traz o que o veiculo
 * dele fatura. Estes testes existem porque uma economia torta nao aparece na
 * tela — o jogo continua rodando, so fica rico ou pobre demais, e ninguem
 * descobre por que.
 *
 * O jeito de testar aqui e varrer TODAS as classes, e nao escolher uma. Um
 * teste que so olha a bicicleta nao teria pego nenhum dos defeitos que estes
 * pegaram.
 */
import { describe, expect, it } from "vitest";
import {
  KM_DA_VIAGEM_TIPICA,
  MAXIMO_POR_CLASSE,
  PONTOS_DO_OPERADOR,
  VIAGENS_PARA_PAGAR_A_CONTRATACAO,
  VIAGENS_PARA_PAGAR_O_VEICULO,
  capacidadeOperacional,
  custoDeContratar,
  custoDeUmaUnidade,
  frotaMaxima,
  lucroDaViagemTipica,
  podeContratar,
  salarioDaViagem,
} from "../../client/src/game/hiring";
import { CLASSE_DO_VEICULO, REPASSE } from "../../client/src/game/freight";
import { CampaignStore } from "../../client/src/game/GameState";
import {
  VEHICLE_UNLOCK_LEVELS,
  companyXpRequiredForLevel,
} from "../../client/src/game/progression";
import type { VehicleId } from "../../client/src/game/types";
import { installBrowserWindow, seedCampaign } from "./harness";

const CLASSES: VehicleId[] = [
  "bike",
  "moto",
  "van",
  "truck",
  "fleet",
  "planetary",
];

/** A escada de verdade: o planetario herda a carreta e empata com ela. */
const ESCADA: VehicleId[] = ["bike", "moto", "van", "truck", "fleet"];

describe("o preco de crescer", () => {
  it("sobe do pedal a carreta, em comprar e em contratar", () => {
    for (let i = 1; i < ESCADA.length; i += 1) {
      const antes = ESCADA[i - 1]!;
      const agora = ESCADA[i]!;
      expect(custoDeUmaUnidade(agora, 0)).toBeGreaterThan(
        custoDeUmaUnidade(antes, 1)
      );
      expect(custoDeContratar(agora, 0)).toBeGreaterThan(
        custoDeContratar(antes, 0)
      );
    }
  });

  it("encarece a cada unidade e a cada contratacao da mesma classe", () => {
    // Sem isto, a pessoa compraria trinta bicicletas pelo preco da primeira e
    // a escolha "crescer ou melhorar" deixaria de ser escolha.
    CLASSES.forEach(veiculo => {
      for (let n = 1; n < 5; n += 1) {
        expect(custoDeUmaUnidade(veiculo, n + 1)).toBeGreaterThan(
          custoDeUmaUnidade(veiculo, n)
        );
        expect(custoDeContratar(veiculo, n)).toBeGreaterThan(
          custoDeContratar(veiculo, n - 1)
        );
      }
    });
  });

  it("todo mundo se paga no mesmo numero de viagens", () => {
    /*
     * Esta e a regra que substituiu os numeros escolhidos: comprar custa oito
     * viagens de lucro, contratar custa onze. Vale igual para a bicicleta e
     * para a carreta — e por isso a escada nao trava no meio nem fica de
     * graca no fim.
     */
    CLASSES.forEach(veiculo => {
      const lucro = lucroDaViagemTipica(veiculo);
      const primeiraUnidade = custoDeUmaUnidade(
        veiculo,
        veiculo === "bike" ? 1 : 0
      );
      expect(primeiraUnidade / lucro).toBeCloseTo(
        VIAGENS_PARA_PAGAR_O_VEICULO,
        1
      );
      expect(custoDeContratar(veiculo, 0) / lucro).toBeCloseTo(
        VIAGENS_PARA_PAGAR_A_CONTRATACAO,
        1
      );
    });
  });

  it("a viagem de referencia cresce junto com a classe", () => {
    for (let i = 1; i < ESCADA.length; i += 1) {
      expect(
        KM_DA_VIAGEM_TIPICA[CLASSE_DO_VEICULO[ESCADA[i]!]]
      ).toBeGreaterThan(KM_DA_VIAGEM_TIPICA[CLASSE_DO_VEICULO[ESCADA[i - 1]!]]);
    }
  });
});

describe("o salario do operador", () => {
  it("e o repasse do frete, e nao um numero solto", () => {
    // Era `wageRate: 0.18`, escrito dentro do operador. Salario em dois
    // lugares diferentes e como ter dois relogios.
    expect(salarioDaViagem(1_000)).toBe(Math.round(1_000 * REPASSE.transportadora));
    expect(salarioDaViagem(0)).toBe(1);
  });
});

describe("quem a central aguenta", () => {
  it("cobra mais atencao por veiculo mais pesado", () => {
    for (let i = 1; i < ESCADA.length; i += 1) {
      expect(PONTOS_DO_OPERADOR[ESCADA[i]!]).toBeGreaterThanOrEqual(
        PONTOS_DO_OPERADOR[ESCADA[i - 1]!]
      );
    }
    expect(PONTOS_DO_OPERADOR.planetary).toBeGreaterThan(
      PONTOS_DO_OPERADOR.bike
    );
  });

  it("a capacidade cresce e nunca encolhe", () => {
    let anterior = 0;
    for (let nivel = 1; nivel <= 300; nivel += 17) {
      for (let predio = 0; predio <= 5; predio += 1) {
        const agora = capacidadeOperacional(nivel, predio, 5);
        expect(agora).toBeGreaterThanOrEqual(5);
        if (predio === 0) {
          expect(agora).toBeGreaterThanOrEqual(anterior);
          anterior = agora;
        }
      }
    }
    // O Centro de Rotas e o predio que existe para isso: ele tem de pesar.
    expect(capacidadeOperacional(1, 5, 5)).toBeGreaterThan(
      capacidadeOperacional(1, 0, 5)
    );
  });

  it("a garagem abre vagas com o nivel, ate o teto", () => {
    CLASSES.forEach(veiculo => {
      const abre = VEHICLE_UNLOCK_LEVELS[veiculo];
      // Antes de a classe abrir, nao ha vaga nenhuma.
      expect(frotaMaxima(abre, abre - 1)).toBe(0);
      expect(frotaMaxima(abre, abre)).toBe(1);
      expect(frotaMaxima(abre, 500)).toBe(MAXIMO_POR_CLASSE);
      for (let nivel = abre; nivel < abre + 60; nivel += 1) {
        expect(frotaMaxima(abre, nivel + 1)).toBeGreaterThanOrEqual(
          frotaMaxima(abre, nivel)
        );
      }
    });
  });
});

describe("o que falta para contratar, e em que ordem", () => {
  const base = {
    classeLiberada: true,
    unidades: 2,
    operadoresDaClasse: 0,
    pontosLivres: 9,
    caixa: 9_999_999,
  };

  it("primeiro o que nao se compra", () => {
    /*
     * A ordem e a mesma da habilitacao no freight.ts, e pelo mesmo motivo:
     * mandar a pessoa juntar dinheiro para um operador que nao tem veiculo
     * para dirigir e recado errado. Ela junta, volta, e continua barrada.
     */
    expect(podeContratar("moto", { ...base, classeLiberada: false }).motivo).toBe(
      "classe-bloqueada"
    );
    expect(podeContratar("moto", { ...base, unidades: 1 }).motivo).toBe(
      "sem-veiculo-livre"
    );
    expect(podeContratar("moto", { ...base, pontosLivres: 0 }).motivo).toBe(
      "sem-pontos"
    );
    expect(podeContratar("moto", { ...base, caixa: 0 }).motivo).toBe(
      "sem-dinheiro"
    );
    expect(podeContratar("moto", base).pode).toBe(true);
  });

  it("uma unidade fica sempre com o jogador", () => {
    // Duas unidades e um operador: nao cabe um segundo, senao dois sairiam na
    // mesma moto.
    CLASSES.forEach(veiculo => {
      expect(
        podeContratar(veiculo, { ...base, unidades: 2, operadoresDaClasse: 1 })
          .motivo
      ).toBe("sem-veiculo-livre");
      expect(
        podeContratar(veiculo, { ...base, unidades: 3, operadoresDaClasse: 1 })
          .pode
      ).toBe(true);
    });
  });

  it("diz quanto falta, quando o que falta e contavel", () => {
    const semGrana = podeContratar("van", { ...base, caixa: 10 });
    expect(semGrana.faltam).toBe(semGrana.custo - 10);
    const semPontos = podeContratar("van", { ...base, pontosLivres: 1 });
    expect(semPontos.faltam).toBe(PONTOS_DO_OPERADOR.van - 1);
  });
});

describe("a contratacao dentro do jogo", () => {
  const abrirEmpresaGrande = () => {
    const storage = installBrowserWindow();
    seedCampaign(storage, {
      credits: 5_000_000,
      companyXp: companyXpRequiredForLevel(120),
      reputation: 5_000,
      unlockedVehicles: ["bike", "moto", "van", "truck"],
      vehicleFleet: { bike: 3, moto: 3, van: 2, truck: 2, fleet: 0, planetary: 0 },
      hiredCouriers: [],
      // Com as pecas no maximo nenhuma rota de bicicleta fica barrada por
      // equipamento: o que estes testes medem e a contratacao, nao o bau.
      bikePartLevels: { tire: 5, cargo: 5, drive: 5, brake: 5, wheels: 5 },
    });
    return new CampaignStore();
  };

  it("contrata para classes diferentes, e cada um fica com a sua unidade", () => {
    const store = abrirEmpresaGrande();
    expect(store.hireOperator("bike", 1).ok).toBe(true);
    expect(store.hireOperator("moto", 2).ok).toBe(true);
    expect(store.hireOperator("truck", 3).ok).toBe(true);

    const equipe = store.value.hiredCouriers;
    expect(equipe.map(operador => operador.vehicleId)).toEqual([
      "bike",
      "moto",
      "truck",
    ]);
    // Ninguem divide veiculo, e ninguem pega a unidade 1 — ela e do jogador.
    const unidades = equipe.map(operador => operador.vehicleUnitId);
    expect(new Set(unidades).size).toBe(unidades.length);
    unidades.forEach(unidade => expect(unidade).not.toMatch(/-1$/));
  });

  it("o operador so dirige a classe dele", () => {
    const store = abrirEmpresaGrande();
    store.hireOperator("bike", 1);
    /*
     * Antes o despacho automatico preparava TODA rota como bicicleta, com o
     * `vehicleId: "bike"` escrito na entrega. Com a XB tendo caminhao, isso
     * mandaria um ciclista para a rota industrial de 300 km — e o jogo
     * pagaria frete de caminhao por ela.
     */
    const recusa = store.dispatchAutomatedRoute("rota-industrial", "courier-1", 5);
    expect(recusa.ok).toBe(false);
    expect(recusa.message).toContain("não dirige");
  });

  it("nao paga dois motoristas pela mesma viagem", () => {
    /*
     * O defeito que so apareceu quando o custo por km deixou de ser
     * inventado: a linha `labor` da rota JA e o repasse ao condutor, e o
     * salario do operador era somado por cima. Dois motoristas, um veiculo,
     * e a conta some no caixa sem nenhum erro na tela.
     */
    const store = abrirEmpresaGrande();
    store.hireOperator("bike", 1);
    const previa = store.previewRoute("bairro-distante").plan!;
    const despacho = store.dispatchAutomatedRoute(
      "bairro-distante",
      "courier-1",
      10
    );
    expect(despacho.ok).toBe(true);
    const entrega = store.value.activeDeliveries.at(-1)!;

    const salarioEsperado = salarioDaViagem(previa.grossReward);
    expect(entrega.costBreakdown.labor).toBe(salarioEsperado);
    // O custo total e o da rota com a mao de obra TROCADA, nao somada.
    expect(entrega.costBreakdown.total).toBe(
      previa.costBreakdown.total -
        previa.costBreakdown.labor +
        salarioEsperado
    );
    expect(entrega.netReward).toBe(entrega.grossReward - entrega.operatingCost);
  });

  it("o espelho da frota nunca sai do lugar", () => {
    /*
     * `bikeFleetSize` continua no save e em algumas telas, e agora e copia de
     * `vehicleFleet.bike`. Dois numeros para a mesma coisa e como ter dois
     * relogios — entao a copia esta presa aqui.
     */
    const store = abrirEmpresaGrande();
    expect(store.value.bikeFleetSize).toBe(store.value.vehicleFleet.bike);
    store.buyVehicleUnit("bike");
    expect(store.value.bikeFleetSize).toBe(store.value.vehicleFleet.bike);
    store.buyVehicleUnit("moto");
    expect(store.value.bikeFleetSize).toBe(store.value.vehicleFleet.bike);
    // Recarregar do disco tambem tem de trazer os dois iguais.
    const recarregado = new CampaignStore();
    expect(recarregado.value.bikeFleetSize).toBe(
      recarregado.value.vehicleFleet.bike
    );
  });

  it("nao vende unidade de classe que a empresa nao tem", () => {
    const store = abrirEmpresaGrande();
    const recusa = store.buyVehicleUnit("planetary");
    expect(recusa.ok).toBe(false);
    expect(store.value.vehicleFleet.planetary).toBe(0);
  });

  it("save antigo, so com bicicleta, vira frota por classe sem perder nada", () => {
    const storage = installBrowserWindow();
    seedCampaign(storage, {
      companyXp: companyXpRequiredForLevel(30),
      bikeFleetSize: 2,
      hiredCouriers: [
        {
          id: "courier-1",
          name: "Operador XB 01",
          hiredAt: 0,
          // Save antigo nao tinha classe nem `vehicleUnitId`.
          bikeUnitId: "bike-2",
          operationalPoints: 1,
          wageRate: 0.18,
        },
      ],
    } as never);
    const store = new CampaignStore();
    expect(store.value.vehicleFleet.bike).toBe(2);
    const operador = store.value.hiredCouriers[0]!;
    expect(operador.vehicleId).toBe("bike");
    expect(operador.vehicleUnitId).toBe("bike-2");
  });
});

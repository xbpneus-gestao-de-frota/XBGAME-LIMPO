/**
 * A EQUAÇÃO MESTRA.
 *
 * Ordem dele, 13/09/2026: "precisamos de uma equação mestra: se mudarmos de um
 * veículo, o que aumenta de saúde, velocidade, tudo, e tudo que afeta ao
 * entregador e tempo de entrega e desgaste".
 *
 * O que estes testes guardam não são os números — números são decisão dele e
 * mudam. É a FORMA: as três regras que seguram a tabela, e o fato de o resto do
 * jogo perguntar aqui em vez de guardar cópia.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  ERA_DOS_MOTORES,
  ERA_DOS_PEDAIS,
  IDADE_DA_VIRADA,
  VEICULO_DE_ENTRADA,
  aEquacao,
  folegoPorSegundo,
  numerosDoVeiculo,
  oQueMudaNaTroca,
  tempoDaEntrega,
  type FamiliaDeVeiculo,
} from "@/game/aEquacaoMestra";
import { MAX_BIKE_PART_LEVEL } from "@/game/asPecasDaBicicleta";

const FAMILIAS: FamiliaDeVeiculo[] = [
  "bicicleta",
  "patins",
  "triciclo",
  "patinete",
  "caiaque",
  "skate",
];

const TUDO_NO_MAXIMO = {
  tire: MAX_BIKE_PART_LEVEL,
  cargo: MAX_BIKE_PART_LEVEL,
  chain: MAX_BIKE_PART_LEVEL,
  brake: MAX_BIKE_PART_LEVEL,
  wheels: MAX_BIKE_PART_LEVEL,
};

describe("a tabela dos veiculos", () => {
  it("tem as seis familias da loja, com cinco degraus cada", () => {
    for (const familia of FAMILIAS) {
      for (let degrau = 1; degrau <= 5; degrau += 1) {
        const n = numerosDoVeiculo({ familia, degrau });
        expect(n.segundosPorKm).toBeGreaterThan(0);
        expect(n.cansaco).toBeGreaterThan(0);
        expect(n.bolsa).toBeGreaterThanOrEqual(1);
        expect(n.desgaste).toBeGreaterThan(0);
      }
    }
  });

  it("degrau fora da escada vira o mais perto, e nao quebra", () => {
    const primeiro = numerosDoVeiculo({ familia: "bicicleta", degrau: 1 });
    const ultimo = numerosDoVeiculo({ familia: "bicicleta", degrau: 5 });
    expect(numerosDoVeiculo({ familia: "bicicleta", degrau: 0 })).toEqual(primeiro);
    expect(numerosDoVeiculo({ familia: "bicicleta", degrau: 99 })).toEqual(ultimo);
  });

  /*
   * REGRA 1 — CARGA BRIGA COM VELOCIDADE. Sem ela existiria um veiculo melhor
   * em tudo, e escolher deixaria de ser uma decisao.
   */
  it("quem leva mais nao e tambem o mais rapido", () => {
    const porBolsa = FAMILIAS.map(familia => ({
      familia,
      ...numerosDoVeiculo({ familia, degrau: 3 }),
    })).sort((a, b) => b.bolsa - a.bolsa);

    const queMaisLeva = porBolsa[0]!;
    const queMenosLeva = porBolsa[porBolsa.length - 1]!;
    expect(queMaisLeva.segundosPorKm).toBeGreaterThan(
      queMenosLeva.segundosPorKm
    );
  });

  /*
   * REGRA 2 — O MOTOR TIRA O CANSACO E COBRA NO DESGASTE. O eletrico nao e de
   * graca: troca suor por manutencao.
   */
  it("o eletrico cansa menos que o comum, e se gasta mais", () => {
    for (const familia of FAMILIAS) {
      const comum = numerosDoVeiculo({ familia, degrau: 1 });
      const eletrico = numerosDoVeiculo({ familia, degrau: 5 });
      expect(eletrico.cansaco).toBeLessThan(comum.cansaco);
      expect(eletrico.segundosPorKm).toBeLessThan(comum.segundosPorKm);
    }
  });

  it("do degrau 4 para cima o desgaste sobe em relacao ao degrau 3", () => {
    for (const familia of FAMILIAS) {
      const carga = numerosDoVeiculo({ familia, degrau: 3 });
      const eletrico = numerosDoVeiculo({ familia, degrau: 5 });
      expect(eletrico.desgaste).toBeGreaterThan(carga.desgaste);
    }
  });

  /* REGRA 3 — O DEGRAU 3 E SEMPRE O DE CARGA. */
  it("o terceiro degrau leva mais que o primeiro, em todas as familias", () => {
    for (const familia of FAMILIAS) {
      const comum = numerosDoVeiculo({ familia, degrau: 1 });
      const carga = numerosDoVeiculo({ familia, degrau: 3 });
      expect(carga.bolsa).toBeGreaterThan(comum.bolsa);
    }
  });
});

describe("a conta", () => {
  it("sem nada, o entregador anda na bicicleta comum", () => {
    expect(aEquacao().segundosPorKm).toBe(
      numerosDoVeiculo(VEICULO_DE_ENTRADA).segundosPorKm
    );
  });

  it("peca nova deixa mais rapido e nunca mais lento", () => {
    const parado = aEquacao();
    const equipado = aEquacao({ pecas: TUDO_NO_MAXIMO });
    expect(equipado.segundosPorKm).toBeLessThan(parado.segundosPorKm);
    expect(equipado.bolsa).toBeGreaterThanOrEqual(parado.bolsa);
  });

  /*
   * O aproveitamento e o que impede a peca de virar bonus solto: corrente nova
   * nao pode melhorar um caiaque como melhora uma bicicleta.
   */
  it("a peca vale mais na bicicleta do que no caiaque", () => {
    const naBike =
      aEquacao({ veiculo: { familia: "bicicleta", degrau: 1 } }).segundosPorKm /
      aEquacao({
        veiculo: { familia: "bicicleta", degrau: 1 },
        pecas: TUDO_NO_MAXIMO,
      }).segundosPorKm;
    const noCaiaque =
      aEquacao({ veiculo: { familia: "caiaque", degrau: 1 } }).segundosPorKm /
      aEquacao({
        veiculo: { familia: "caiaque", degrau: 1 },
        pecas: TUDO_NO_MAXIMO,
      }).segundosPorKm;
    expect(naBike).toBeGreaterThan(noCaiaque);
  });

  it("o tempo da entrega cresce com a distancia e com as paradas", () => {
    const perto = tempoDaEntrega(1, 1);
    const longe = tempoDaEntrega(5, 1);
    const muitasParadas = tempoDaEntrega(1, 6);
    expect(longe).toBeGreaterThan(perto);
    expect(muitasParadas).toBeGreaterThan(perto);
  });

  /*
   * A pergunta dele em uma linha: "a saude muda se ele trocar de veiculo?".
   * Muda por dois caminhos ao mesmo tempo — cobra menos por km e faz o km
   * passar mais rapido.
   */
  it("o eletrico cansa muito menos que o comum, na mesma hora e carga", () => {
    const meioDia = 0.5;
    const comum = folegoPorSegundo(
      { veiculo: { familia: "bicicleta", degrau: 1 } },
      meioDia,
      3
    );
    const eletrico = folegoPorSegundo(
      { veiculo: { familia: "bicicleta", degrau: 5 } },
      meioDia,
      3
    );
    expect(eletrico).toBeLessThan(comum);
  });

  it("bolsa cheia e sol a pino cansam mais que bolsa vazia de madrugada", () => {
    const pesado = folegoPorSegundo({}, 0.5, 8);
    const leve = folegoPorSegundo({}, 0, 0);
    expect(pesado).toBeGreaterThan(leve);
  });
});

describe("o que muda na troca", () => {
  it("diz em fracao o que melhora e o que piora", () => {
    const muda = oQueMudaNaTroca(
      { familia: "bicicleta", degrau: 1 },
      { familia: "bicicleta", degrau: 5 }
    );
    expect(muda.velocidade).toBeGreaterThan(0);
    expect(muda.cansaco).toBeLessThan(0);
    expect(muda.desgaste).toBeGreaterThan(0);
  });

  it("trocar para o mesmo veiculo nao muda nada", () => {
    const muda = oQueMudaNaTroca(VEICULO_DE_ENTRADA, VEICULO_DE_ENTRADA);
    expect(muda.velocidade).toBeCloseTo(0, 10);
    expect(muda.cansaco).toBeCloseTo(0, 10);
    expect(muda.bolsa).toBeCloseTo(0, 10);
    expect(muda.desgaste).toBeCloseTo(0, 10);
  });
});

/*
 * UMA CONTA SO. O resto do jogo pergunta aqui em vez de guardar copia — era
 * exatamente o que ele pediu ao chamar isto de "equacao mestra".
 */
describe("quem mais usa a equacao", () => {
  it("a rota pergunta quantos segundos por km, em vez de escrever", () => {
    const rota = readFileSync("client/src/game/xbwapp/aRota.ts", "utf8");
    expect(rota).toContain("numerosDoVeiculo(VEICULO_DE_ENTRADA).segundosPorKm");
  });

  it("o folego pergunta o cansaco, em vez de escrever", () => {
    const folego = readFileSync("client/src/game/xbwapp/oFolego.ts", "utf8");
    expect(folego).toContain("numerosDoVeiculo(VEICULO_DE_ENTRADA).cansaco");
  });
});

/**
 * AS DUAS ERAS.
 *
 * Ordem dele, 13/09/2026: "moto, van, onibus, caminhao, carreta sera na mudanca
 * de era do jogo, jogadores fazem 18 anos e começamos uma nova era".
 *
 * Este teste existe para que ninguem — nem ele num dia de pressa, nem o outro
 * time, nem eu — coloque uma van na loja sem passar pela virada. A crianca que
 * entrega de bicicleta e o adulto que dirige carreta sao dois jogos.
 */
describe("as duas eras", () => {
  it("a loja de hoje e a era dos pedais, e so ela", () => {
    expect([...ERA_DOS_PEDAIS].sort()).toEqual([...FAMILIAS].sort());
  });

  it("nenhum veiculo de motor tem numeros ainda", () => {
    for (const motorizado of ERA_DOS_MOTORES) {
      expect(ERA_DOS_PEDAIS).not.toContain(motorizado);
    }
  });

  it("a virada e a maioridade", () => {
    expect(IDADE_DA_VIRADA).toBe(18);
  });
});

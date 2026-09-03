/**
 * Os tetos que impedem a progressão de virar dinheiro de graça: o conjunto de
 * peças da bicicleta somado passa de 100% de redução de desgaste, e o painel
 * de operações não pode anunciar automação que a garagem não sustenta.
 */
import { describe, expect, it } from "vitest";
import {
  BIKE_PARTS,
  EMPTY_BIKE_PART_LEVELS,
  MAX_BIKE_PART_LEVEL,
  MAX_MVP_BIKE_FLEET,
  bikePartEffects,
  operationsSummary,
} from "../../client/src/game/progression";
import { CampaignStore } from "../../client/src/game/GameState";
import type {
  BikePartLevels,
  HiredCourier,
  VehicleId,
} from "../../client/src/game/types";
import { REPASSE } from "../../client/src/game/freight";
import { installBrowserWindow, seedCampaign } from "./harness";

const MAXED: BikePartLevels = {
  tire: MAX_BIKE_PART_LEVEL,
  cargo: MAX_BIKE_PART_LEVEL,
  chain: MAX_BIKE_PART_LEVEL,
  brake: MAX_BIKE_PART_LEVEL,
  wheels: MAX_BIKE_PART_LEVEL,
};

/** Quanto o catálogo promete de redução se todas as promessas fossem somadas. */
const declaredWearReductionAtMax = (): number =>
  BIKE_PARTS.reduce((total, part) => {
    const top = part.tiers.find(tier => tier.level === MAX_BIKE_PART_LEVEL);
    return total + (top?.wearReduction ?? 0);
  }, 0);

const courier = (index: number): HiredCourier => ({
  id: `courier-${index}`,
  name: `Operador XB 0${index}`,
  hiredAt: 0,
  vehicleId: "bike",
  vehicleUnitId: `bike-${index + 1}`,
  operationalPoints: 1,
  wageRate: REPASSE.transportadora,
});

/** A garagem, montada a partir de quantas bicicletas ela tem. */
const garagem = (bikes: number): Record<VehicleId, number> => ({
  bike: bikes,
  moto: 0,
  van: 0,
  truck: 0,
  fleet: 0,
  planetary: 0,
});

describe("teto de desgaste das peças da bicicleta", () => {
  it("reduz o desgaste com o conjunto no máximo, mas nunca o zera", () => {
    const bare = bikePartEffects(EMPTY_BIKE_PART_LEVELS);
    const maxed = bikePartEffects(MAXED);

    // Sem peça nenhuma o desgaste é o do contrato, sem desconto.
    expect(bare.wearMultiplier).toBe(1);
    // Somadas, as promessas do catálogo passam de 100% — daí o teto existir.
    expect(declaredWearReductionAtMax()).toBeGreaterThan(1);

    // O conjunto no máximo desconta de verdade...
    expect(maxed.wearMultiplier).toBeLessThan(bare.wearMultiplier);
    // ...e ainda assim continua sendo desgaste: nem zero, nem negativo.
    expect(maxed.wearMultiplier).toBeGreaterThan(0);
    // Aplicado ao desgaste de uma rota comum, o pneu continua gastando.
    expect(Math.ceil(6 * maxed.wearMultiplier)).toBeGreaterThanOrEqual(1);
    expect(maxed.wearMultiplier).toBeLessThan(1);
  });
});

describe("slots automáticos anunciados pelo painel de operações", () => {
  it("nunca promete mais automação do que operadores e bicicletas livres", () => {
    // Duas bicicletas na garagem e nenhum operador: nada roda sozinho.
    expect(operationsSummary(5, garagem(2), []).automatedSlots).toBe(0);
    // Um operador sem bicicleta livre (a única é a do jogador) também não.
    expect(operationsSummary(5, garagem(1), [courier(1)]).automatedSlots).toBe(
      0
    );
    // Com a segunda bicicleta comprada, exatamente uma rota automática.
    expect(operationsSummary(5, garagem(2), [courier(1)]).automatedSlots).toBe(
      1
    );

    for (const bikes of [0, 1, 2, 3]) {
      for (const hired of [0, 1, 2, 3]) {
        const couriers = Array.from({ length: hired }, (_, index) =>
          courier(index + 1)
        );
        const summary = operationsSummary(20, garagem(bikes), couriers);
        expect(summary.automatedSlots).toBeLessThanOrEqual(couriers.length);
        expect(summary.automatedSlots).toBeLessThanOrEqual(
          Math.max(0, summary.bikeUnits - 1)
        );
        expect(summary.automatedSlots).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("o painel da campanha conta a mesma história da garagem", () => {
    const storage = installBrowserWindow();
    seedCampaign(storage, {
      bikeFleetSize: MAX_MVP_BIKE_FLEET,
      hiredCouriers: [],
      operationalPointsCapacity: 20,
    });
    const store = new CampaignStore();

    expect(store.value.bikeFleetSize).toBe(MAX_MVP_BIKE_FLEET);
    expect(store.value.hiredCouriers).toHaveLength(0);
    // Frota completa e nenhum contratado: zero rotas automáticas prometidas.
    expect(store.operations.bikeUnits).toBe(MAX_MVP_BIKE_FLEET);
    expect(store.operations.couriers).toBe(0);
    expect(store.operations.automatedSlots).toBe(0);
  });
});

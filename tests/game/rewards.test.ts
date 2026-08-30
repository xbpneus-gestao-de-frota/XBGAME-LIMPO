/**
 * Coletaveis nunca podem virar a fonte principal de receita: o contrato-base
 * manda, o bonus e limitado a 50% dele e cresce com a maturidade da operacao.
 */
import { describe, expect, it } from "vitest";
import {
  collectibleRewardBreakdown,
  perfectRouteReward,
} from "../../client/src/game/rewards";

describe("recompensa de coletáveis", () => {
  it("mantém o primeiro contrato pequeno e auditável", () => {
    const first = collectibleRewardBreakdown({
      baseReward: 10,
      vehicleOrder: 0,
      cargoCount: 1,
      tireTokenCount: 0,
    });
    expect(first.cargoBonus).toBe(1);
    expect(first.tireTokenBonus).toBe(0);
    expect(first.cap).toBe(5);
    expect(first.totalBonus).toBeLessThanOrEqual(first.cap);
    expect(first.totalBonus).toBe(first.cargoBonus + first.tireTokenBonus);
  });

  it("limita o bônus agregado a metade do contrato-base", () => {
    const busy = collectibleRewardBreakdown({
      baseReward: 10,
      vehicleOrder: 0,
      cargoCount: 8,
      tireTokenCount: 8,
    });
    expect(busy.totalBonus).toBe(5);
    expect(busy.totalBonus).toBe(busy.cap);
    expect(busy.rawBonus).toBeGreaterThan(busy.cap);

    for (const baseReward of [0, 1, 42, 680, 4_200]) {
      const breakdown = collectibleRewardBreakdown({
        baseReward,
        vehicleOrder: 5,
        cargoCount: 99,
        tireTokenCount: 99,
      });
      expect(breakdown.cap).toBe(Math.round(baseReward * 0.5));
      expect(breakdown.totalBonus).toBeLessThanOrEqual(breakdown.cap);
      expect(breakdown.cargoBonus + breakdown.tireTokenBonus).toBe(
        breakdown.totalBonus
      );
    }
  });

  it("cresce com a maturidade do contrato e do veículo", () => {
    const first = collectibleRewardBreakdown({
      baseReward: 10,
      vehicleOrder: 0,
      cargoCount: 1,
      tireTokenCount: 0,
    });
    const mature = collectibleRewardBreakdown({
      baseReward: 680,
      vehicleOrder: 2,
      cargoCount: 1,
      tireTokenCount: 1,
    });
    expect(mature.totalBonus).toBeGreaterThan(first.totalBonus);
    expect(mature.totalBonus).toBeLessThanOrEqual(mature.cap);
    expect(mature.cargoUnit).toBeGreaterThan(mature.tireTokenUnit);

    const heavier = collectibleRewardBreakdown({
      baseReward: 680,
      vehicleOrder: 5,
      cargoCount: 1,
      tireTokenCount: 1,
    });
    expect(heavier.cargoUnit).toBeGreaterThan(mature.cargoUnit);
  });

  it("neutraliza entradas hostis sem gerar crédito do nada", () => {
    const hostile = collectibleRewardBreakdown({
      baseReward: Number.NaN,
      vehicleOrder: -3,
      cargoCount: -8,
      tireTokenCount: Number.POSITIVE_INFINITY,
    });
    expect(hostile.cap).toBe(0);
    expect(hostile.totalBonus).toBe(0);
    expect(Number.isFinite(hostile.rawBonus)).toBe(true);
  });
});

describe("bônus de Rota Perfeita", () => {
  it("só paga quando a rota foi elegível", () => {
    expect(perfectRouteReward(680, false)).toBe(0);
    expect(perfectRouteReward(680, true)).toBe(Math.round(680 * 0.18));
    expect(perfectRouteReward(10, true)).toBe(2);
  });

  it("nunca fica negativo nem infinito", () => {
    expect(perfectRouteReward(-500, true)).toBe(0);
    expect(perfectRouteReward(Number.NaN, true)).toBe(0);
    expect(perfectRouteReward(Number.POSITIVE_INFINITY, true)).toBe(0);
  });
});

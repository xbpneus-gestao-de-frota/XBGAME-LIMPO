/**
 * A costura mais cara do jogo: uma rota pilotada inteira, do custo reservado
 * ao credito pago. Nada aqui e montado a mao — o `RunResult` sai do proprio
 * mundo e a campanha e lida depois, para que um erro de sinal ou uma cobranca
 * dupla apareca como diferenca de saldo, e nao como formato invalido.
 */
import { describe, expect, it, vi } from "vitest";
import { GameWorld } from "../../client/src/game/GameWorld";
import { CampaignStore } from "../../client/src/game/GameState";
import {
  REGIONS,
  ROUTES,
  companyXpRequiredForLevel,
} from "../../client/src/game/progression";
import type { RouteRunPlan, VehicleId } from "../../client/src/game/types";
import {
  createNullScene,
  installBrowserWindow,
  keyboardTarget,
  seedCampaign,
} from "./harness";

const ROUTE_ID = "triangulo-carga";
const FRAME = 1 / 60;
const FRAME_LIMIT = 60 * 120;

/** O clima do contrato vem do dia local; fixar a data torna a rota repetivel. */
const FIXED_DAY = new Date(2026, 0, 15, 12, 0, 0);

describe("rota pilotada até a economia da campanha", () => {
  it("cobra o custo operacional uma única vez e paga o bruto apurado", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FIXED_DAY);
    const storage = installBrowserWindow();
    seedCampaign(storage, {
      credits: 50_000,
      companyXp: companyXpRequiredForLevel(60),
      completedRouteIds: ROUTES.map(route => route.id),
      unlockedRegionIds: REGIONS.map(region => region.id),
      unlockedVehicles: ["bike", "moto", "van", "truck", "fleet", "planetary"],
      selectedVehicleId: "planetary",
      // Pneus resistentes: a rota precisa terminar por tempo, e nao por dano.
      tireLevels: { grip: 5, durability: 5, efficiency: 0, capacity: 0 },
    });

    const rendering = createNullScene();
    const world = new GameWorld(
      rendering.scene,
      rendering.camera,
      keyboardTarget,
      false
    );

    const before = world.getSnapshot().campaign;
    world.startRun(ROUTE_ID);

    const started = world.getSnapshot();
    expect(started.mode).toBe("running");
    const reserved = started.campaign.activePilotedRun;
    expect(reserved).not.toBeNull();
    const plan: RouteRunPlan = reserved!.plan;
    const vehicleId: VehicleId = plan.vehicleId;
    // Sem custo reservado, "cobrado uma vez" e "cobrado duas" seriam iguais.
    expect(plan.operatingCost).toBeGreaterThan(0);
    expect(started.campaign.credits).toBe(before.credits - plan.operatingCost);

    let frames = 0;
    while (world.getSnapshot().mode === "running" && frames < FRAME_LIMIT) {
      world.update(FRAME);
      frames += 1;
    }
    expect(frames).toBeLessThan(FRAME_LIMIT);

    const finished = world.getSnapshot();
    const result = finished.lastResult;
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.aborted).toBe(false);
    expect(result!.routeId).toBe(ROUTE_ID);
    expect(result!.vehicleId).toBe(vehicleId);

    // O resultado tem de fechar internamente antes de virar dinheiro.
    const gross = result!.grossCreditsEarned!;
    expect(gross).toBe(
      result!.baseCreditsEarned! +
        result!.collectibleBonusCredits! +
        result!.perfectRouteBonusCredits!
    );
    expect(result!.collectibleBonusCredits).toBeLessThanOrEqual(
      result!.collectibleBonusCap!
    );
    expect(result!.operatingCost).toBe(plan.operatingCost);
    expect(result!.netCreditsEarned).toBe(gross - plan.operatingCost);
    expect(result!.creditsEarned).toBe(result!.netCreditsEarned);

    const after = finished.campaign;
    // Reserva no inicio + bruto no fim. Uma segunda cobranca apareceria aqui.
    expect(after.credits).toBe(started.campaign.credits + gross);
    expect(after.credits).toBe(before.credits + result!.creditsEarned);
    expect(before.credits + gross - after.credits).toBe(plan.operatingCost);

    // Progressão: tudo que o resultado declara precisa ter entrado na campanha.
    expect(result!.xpEarned).toBe(plan.xpReward);
    expect(after.companyXp).toBe(before.companyXp + result!.xpEarned!);
    expect(result!.reputationEarned).toBeGreaterThan(0);
    expect(after.reputation).toBe(before.reputation + result!.reputationEarned);
    expect(after.deliveries).toBe(before.deliveries + 1);
    expect(result!.distance).toBe(plan.distance);
    expect(after.totalDistance).toBe(before.totalDistance + result!.distance);
    expect(result!.tireWear).toBeGreaterThan(0);
    expect(after.tireCondition[vehicleId]).toBe(
      before.tireCondition[vehicleId] - result!.tireWear!
    );
    expect(after.completedRouteIds).toContain(ROUTE_ID);
    expect(after.activePilotedRun).toBeNull();

    // O save tem de contar a mesma historia: recarregar nao cobra de novo.
    world.dispose();
    const reloaded = new CampaignStore().value;
    expect(reloaded.credits).toBe(after.credits);
    expect(reloaded.activePilotedRun).toBeNull();
    expect(reloaded.deliveries).toBe(after.deliveries);

    vi.useRealTimers();
    rendering.dispose();
  });

  it("não credita nem debita nada além do previsto quando a rota é abortada", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FIXED_DAY);
    const storage = installBrowserWindow();
    seedCampaign(storage, {
      credits: 50_000,
      companyXp: companyXpRequiredForLevel(60),
      completedRouteIds: ROUTES.map(route => route.id),
      unlockedRegionIds: REGIONS.map(region => region.id),
      unlockedVehicles: ["bike", "moto", "van", "truck", "fleet", "planetary"],
      selectedVehicleId: "planetary",
      tireLevels: { grip: 5, durability: 5, efficiency: 0, capacity: 0 },
    });

    const rendering = createNullScene();
    const world = new GameWorld(
      rendering.scene,
      rendering.camera,
      keyboardTarget,
      false
    );
    const before = world.getSnapshot().campaign;
    world.startRun(ROUTE_ID);
    const started = world.getSnapshot();
    const plan = started.campaign.activePilotedRun!.plan;
    for (let frame = 0; frame < 120; frame += 1) world.update(FRAME);
    world.abortRun();

    const finished = world.getSnapshot();
    const result = finished.lastResult!;
    expect(result.aborted).toBe(true);
    expect(result.success).toBe(false);
    // Abortar nao reembolsa o custo ja mobilizado, e tambem nao cobra de novo.
    expect(result.grossCreditsEarned).toBe(0);
    expect(result.creditsEarned).toBe(-plan.operatingCost);
    expect(finished.campaign.credits).toBe(before.credits - plan.operatingCost);
    expect(finished.campaign.deliveries).toBe(before.deliveries);
    expect(finished.campaign.companyXp).toBe(before.companyXp);
    expect(finished.campaign.activePilotedRun).toBeNull();

    world.dispose();
    vi.useRealTimers();
    rendering.dispose();
  });
});

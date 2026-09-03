/**
 * Os guardas de caixa da campanha. Cada um deles separa uma operação que
 * fecha a conta de uma fábrica de dinheiro: coletar antes da hora, receber
 * o líquido no lugar do bruto, despachar sem ter o custo, comprar frota
 * acima do teto, contratar quem não tem bicicleta e absorver reputação
 * negativa. Aqui não se inspeciona constante de balanceamento — observa-se
 * o saldo, a frota e a resposta que o jogador recebe.
 */
import { describe, expect, it, vi } from "vitest";
import { CampaignStore } from "../../client/src/game/GameState";
import {
  FIRST_COURIER_UNLOCK_LEVEL,
  MAX_MVP_BIKE_FLEET,
  REGIONS,
  ROUTES,
  SECOND_BIKE_UNLOCK_LEVEL,
  companyXpRequiredForLevel,
} from "../../client/src/game/progression";
import { installBrowserWindow, seedCampaign } from "./harness";

/** O clima do contrato vem do dia local; fixar a data torna a economia fixa. */
const FIXED_DAY = new Date(2026, 0, 15, 12, 0, 0);

const freezeClock = (): void => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FIXED_DAY);
};

/** Empresa madura: veículos livres, regiões abertas e caixa folgado. */
const seedMatureCompany = (dispatchLevel: number, credits = 50_000): void => {
  const storage = installBrowserWindow();
  seedCampaign(storage, {
    credits,
    companyXp: companyXpRequiredForLevel(60),
    completedRouteIds: ROUTES.map(route => route.id),
    unlockedRegionIds: REGIONS.map(region => region.id),
    unlockedVehicles: ["bike", "moto", "van", "truck", "fleet", "planetary"],
    selectedVehicleId: "planetary",
    buildingLevels: {
      hq: 1,
      garage: 5,
      workshop: 1,
      warehouse: 0,
      dispatch: dispatchLevel,
      planetLab: 1,
    },
  });
};

describe("guardas de caixa da campanha", () => {
  it("não paga uma entrega antes de a equipe chegar", () => {
    freezeClock();
    seedMatureCompany(4);
    const store = new CampaignStore();
    const before = store.value;

    const dispatched = store.dispatchRoute("triangulo-carga", 1_000);
    expect(dispatched.ok).toBe(true);
    const delivery = store.value.activeDeliveries[0]!;
    expect(delivery.completesAt).toBeGreaterThan(delivery.startedAt);
    const reserved = store.value.credits;

    // Um milissegundo antes do fim ainda é a rota inteira por fazer.
    const early = store.collectDelivery(
      delivery.instanceId,
      delivery.startedAt
    );
    expect(early.ok).toBe(false);
    const stillEarly = store.collectDelivery(
      delivery.instanceId,
      delivery.completesAt - 1
    );
    expect(stillEarly.ok).toBe(false);
    expect(store.value.credits).toBe(reserved);
    expect(store.value.deliveries).toBe(before.deliveries);
    expect(store.value.activeDeliveries).toHaveLength(1);

    // A varredura em lote também não pode antecipar nada.
    const swept = store.collectCompletedDeliveries(delivery.completesAt - 1);
    expect(swept.collected).toBe(0);
    expect(store.value.credits).toBe(reserved);

    // No instante do prazo, e só nele, o contrato paga.
    const paid = store.collectDelivery(
      delivery.instanceId,
      delivery.completesAt
    );
    expect(paid.ok).toBe(true);
    expect(store.value.deliveries).toBe(before.deliveries + 1);
    vi.useRealTimers();
  });

  it("libera o bruto na coleta e cobra o custo operacional uma única vez", () => {
    freezeClock();
    seedMatureCompany(4);
    const store = new CampaignStore();
    const before = store.value.credits;

    const dispatched = store.dispatchRoute("triangulo-carga", 1_000);
    expect(dispatched.ok).toBe(true);
    const delivery = store.value.activeDeliveries[0]!;
    // Sem custo reservado "cobrado uma vez" e "cobrado duas" seriam iguais.
    expect(delivery.operatingCost).toBeGreaterThan(0);
    expect(delivery.netReward).toBe(
      delivery.grossReward - delivery.operatingCost
    );
    expect(store.value.credits).toBe(before - delivery.operatingCost);

    const collected = store.collectDelivery(
      delivery.instanceId,
      delivery.completesAt
    );
    expect(collected.ok).toBe(true);
    // O despacho já pagou o custo; a coleta libera o bruto apurado.
    expect(store.value.credits).toBe(before + delivery.netReward);
    expect(before + delivery.grossReward - store.value.credits).toBe(
      delivery.operatingCost
    );
    expect(collected.creditsEarned).toBe(delivery.netReward);

    // O save conta a mesma história: recarregar não cobra o custo de novo.
    expect(new CampaignStore().value.credits).toBe(before + delivery.netReward);
    vi.useRealTimers();
  });

  it("recusa a rota que o caixa não cobre e nunca deixa o saldo negativo", () => {
    freezeClock();
    seedMatureCompany(4, 100);
    const store = new CampaignStore();
    const preview = store.previewRoute("triangulo-carga");
    expect(preview.operatingCost).toBeGreaterThan(store.value.credits);

    const dispatched = store.dispatchRoute("triangulo-carga", 1_000);
    expect(dispatched.ok).toBe(false);
    expect(dispatched.message).toContain("Faltam");
    expect(store.value.activeDeliveries).toHaveLength(0);
    expect(store.value.credits).toBe(100);

    const piloted = store.startPilotedRoute("triangulo-carga");
    expect(piloted.ok).toBe(false);
    expect(store.value.activePilotedRun).toBeNull();
    expect(store.value.credits).toBe(100);
    expect(new CampaignStore().value.credits).toBe(100);
    vi.useRealTimers();
  });

  it("o Despacho nível 5 entrega o terceiro slot que o jogador comprou", () => {
    freezeClock();
    seedMatureCompany(4);
    const four = new CampaignStore();
    expect(four.dispatchRoute("triangulo-carga", 1_000).ok).toBe(true);
    expect(four.dispatchRoute("serra-segura", 1_001).ok).toBe(true);
    const blocked = four.dispatchRoute("eixo-sudeste", 1_002);
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toContain("slots de entrega");
    expect(four.value.activeDeliveries).toHaveLength(2);

    seedMatureCompany(5);
    const five = new CampaignStore();
    expect(five.dispatchRoute("triangulo-carga", 1_000).ok).toBe(true);
    expect(five.dispatchRoute("serra-segura", 1_001).ok).toBe(true);
    const third = five.dispatchRoute("eixo-sudeste", 1_002);
    expect(third.ok).toBe(true);
    expect(five.value.activeDeliveries).toHaveLength(3);
    vi.useRealTimers();
  });
});

describe("teto da frota e da equipe do MVP", () => {
  it("não vende bicicleta além do teto da frota do MVP", () => {
    freezeClock();
    const storage = installBrowserWindow();
    seedCampaign(storage, {
      credits: 100_000,
      companyXp: companyXpRequiredForLevel(SECOND_BIKE_UNLOCK_LEVEL),
      bikeFleetSize: MAX_MVP_BIKE_FLEET,
    });
    const store = new CampaignStore();
    const credits = store.value.credits;

    const refused = store.buyBikeUnit();
    expect(refused.ok).toBe(false);
    expect(store.value.bikeFleetSize).toBe(MAX_MVP_BIKE_FLEET);
    expect(store.value.credits).toBe(credits);
    // Insistir não fura o teto nem sangra o caixa.
    store.buyBikeUnit();
    store.buyBikeUnit();
    expect(store.value.bikeFleetSize).toBe(MAX_MVP_BIKE_FLEET);
    expect(store.value.credits).toBe(credits);
    expect(new CampaignStore().value.bikeFleetSize).toBe(MAX_MVP_BIKE_FLEET);
    vi.useRealTimers();
  });

  it("manda comprar a segunda bicicleta antes de contratar o operador", () => {
    freezeClock();
    const storage = installBrowserWindow();
    seedCampaign(storage, {
      credits: 100_000,
      companyXp: companyXpRequiredForLevel(FIRST_COURIER_UNLOCK_LEVEL),
      bikeFleetSize: 1,
      hiredCouriers: [],
      operationalPointsCapacity: 20,
    });
    const store = new CampaignStore();
    const credits = store.value.credits;

    const refused = store.hireCourier(1_000);
    expect(refused.ok).toBe(false);
    // Nem dinheiro nem Pontos Operacionais faltam: o que falta é a bicicleta.
    expect(store.operations.available).toBeGreaterThan(0);
    expect(refused.message).toContain("Compre uma bicicleta");
    // O recado nomeia o veiculo da classe: a XB contrata do pedal a carreta,
    // e "compre uma unidade" nao diria a ninguem o que comprar.
    expect(store.value.hiredCouriers).toHaveLength(0);
    expect(store.value.credits).toBe(credits);

    // Com a segunda bicicleta na garagem a mesma chamada passa.
    expect(store.buyBikeUnit().ok).toBe(true);
    const hired = store.hireCourier(1_001);
    expect(hired.ok).toBe(true);
    expect(store.value.hiredCouriers).toHaveLength(1);
    expect(store.value.hiredCouriers[0]!.vehicleUnitId).toBe("bike-2");
    // O operador nasce ligado a uma classe. Antes todo operador era ciclista
    // por construcao, e a classe nem existia.
    expect(store.value.hiredCouriers[0]!.vehicleId).toBe("bike");
    vi.useRealTimers();
  });

  it("ignora reputação negativa vinda de um resultado hostil", () => {
    freezeClock();
    const storage = installBrowserWindow();
    seedCampaign(storage, { credits: 1_000, reputation: 42 });
    const store = new CampaignStore();

    store.applyRunResult({
      success: false,
      aborted: false,
      creditsEarned: 0,
      grossCreditsEarned: 0,
      operatingCost: 0,
      netCreditsEarned: 0,
      reputationEarned: -500,
      xpEarned: 0,
      distance: 0,
      cargo: 0,
      tireTokens: 0,
      integrity: 0,
      routeId: "primeiro-pedal",
      vehicleId: "bike",
      tireWear: 0,
    });

    expect(store.value.reputation).toBe(42);
    expect(store.value.companyXp).toBe(0);
    expect(new CampaignStore().value.reputation).toBe(42);
    vi.useRealTimers();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TIRE_MAX_LEVEL,
  getVehicle,
  tireUpgradeCost,
} from "../../client/src/game/config";
import {
  CAMPAIGN_STORAGE_KEY,
  CampaignStore,
  LEGACY_CAMPAIGN_STORAGE_KEY,
  PREVIOUS_CAMPAIGN_STORAGE_KEY,
  createDefaultCampaignState,
} from "../../client/src/game/GameState";
import { dayKey } from "../../client/src/game/operations";
import {
  CAMPAIGN_SAVE_VERSION,
  type CampaignState,
  type DailyMissionState,
} from "../../client/src/game/types";
import {
  companyXpRequiredForLevel,
  courierHireCost,
  secondBikeCost,
} from "../../client/src/game/progression";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number {
    return this.values.size;
  }
  clear(): void {
    this.values.clear();
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

let storage: MemoryStorage;

const installStorage = (replacement: Storage = storage): void => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: replacement },
  });
};

const seed = (overrides: Partial<CampaignState>): CampaignState => {
  const base = createDefaultCampaignState();
  const state: CampaignState = {
    ...base,
    ...overrides,
    vehicleLevels: { ...base.vehicleLevels, ...overrides.vehicleLevels },
    tireLevels: { ...base.tireLevels, ...overrides.tireLevels },
    buildingLevels: { ...base.buildingLevels, ...overrides.buildingLevels },
    equippedCompounds: {
      ...base.equippedCompounds,
      ...overrides.equippedCompounds,
    },
    tireCondition: { ...base.tireCondition, ...overrides.tireCondition },
    bikePartLevels: {
      ...base.bikePartLevels,
      ...overrides.bikePartLevels,
    },
    hiredCouriers: overrides.hiredCouriers
      ? [...overrides.hiredCouriers]
      : [...base.hiredCouriers],
  };
  storage.setItem(
    CAMPAIGN_STORAGE_KEY,
    JSON.stringify({
      version: CAMPAIGN_SAVE_VERSION,
      savedAt: Date.now(),
      state,
    })
  );
  return state;
};

/**
 * `dayKey()` le o relogio local. Sem congelar, a missao diaria montada pelo
 * teste e a que a loja recalcula em `ensureDailyMissions()` podem cair em dias
 * diferentes se a meia-noite passar entre as duas leituras — o teste quebra
 * sem nenhum defeito por tras e nao repete. A economia da rota tambem e
 * derivada do dia (o clima sai de um hash de `dayKey()`, e ele move receita,
 * duracao e desgaste), entao o dia fixo mantem os valores exatos verdadeiros
 * por construcao, e nao por sorte do calendario.
 */
const FIXED_DAY = new Date(2026, 0, 15, 12, 0, 0);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FIXED_DAY);
  storage = new MemoryStorage();
  installStorage();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CampaignStore dispatch and progression", () => {
  it("allows the subsidized inaugural route exactly once", () => {
    const store = new CampaignStore();
    const dispatched = store.dispatchRoute("primeiro-pedal", 1_000);
    expect(dispatched.ok).toBe(true);
    expect(dispatched.operatingCost).toBe(0);
    const delivery = store.value.activeDeliveries[0]!;
    expect(
      store.collectDelivery(delivery.instanceId, delivery.completesAt).ok
    ).toBe(true);
    expect(
      store.dispatchRoute("primeiro-pedal", delivery.completesAt + 1).ok
    ).toBe(false);
    expect(store.value.completedRouteIds).toContain("primeiro-pedal");
  });

  it("blocks duplicate contracts and a vehicle from doing two deliveries", () => {
    const base = createDefaultCampaignState();
    seed({ buildingLevels: { ...base.buildingLevels, dispatch: 2 } });
    const store = new CampaignStore();
    expect(store.dispatchRoute("primeiro-pedal", 10).ok).toBe(true);
    expect(store.dispatchRoute("primeiro-pedal", 11).message).toContain(
      "andamento"
    );
    const second = store.dispatchRoute("bairro-expresso", 12);
    expect(second.ok).toBe(false);
    expect(second.message).toContain("veículos compatíveis");
  });

  it("snapshots duration, reward, cost and wear and blocks occupied-vehicle work", () => {
    seed({ credits: 1_000 });
    const store = new CampaignStore();
    store.dispatchRoute("primeiro-pedal", 100);
    const first = store.value.activeDeliveries[0]!;
    store.collectDelivery(first.instanceId, first.completesAt);
    expect(store.dispatchRoute("bairro-expresso", 1_000).ok).toBe(true);
    const snapshot = store.value.activeDeliveries[0]!;
    expect(snapshot.durationSeconds).toBeGreaterThan(0);
    expect(snapshot.grossReward).toBeGreaterThan(0);
    expect(snapshot.operatingCost).toBe(0);
    expect(snapshot.expectedWear).toBeGreaterThan(0);
    expect(snapshot.costBreakdown.total).toBe(snapshot.operatingCost);

    expect(store.upgradeVehicle("bike").message).toContain("em rota");
    expect(store.equipCompound("bike", "urban").message).toContain("em rota");
    expect(store.maintainVehicleTires("bike").message).toContain("em rota");

    const creditsBeforeCollection = store.value.credits;
    // This may change headquarters economics, but the in-flight snapshot cannot change.
    store.upgradeBuilding("hq");
    const collected = store.collectDelivery(
      snapshot.instanceId,
      snapshot.completesAt
    );
    expect(collected.ok).toBe(true);
    expect(collected.creditsEarned).toBe(snapshot.netReward);
    expect(store.value.credits).toBe(
      creditsBeforeCollection + snapshot.grossReward - 350
    );
  });

  it("requires previous vehicles and a completed route in the previous region", () => {
    seed({
      credits: 100_000,
      reputation: 10_000,
      companyXp: 20_000,
      buildingLevels: {
        ...createDefaultCampaignState().buildingLevels,
        garage: 5,
        hq: 10,
      },
      unlockedRegionIds: ["divinopolis", "belo-horizonte"],
    });
    const store = new CampaignStore();
    expect(store.buyVehicle(getVehicle("truck")).ok).toBe(false);
    expect(store.buyVehicle(getVehicle("truck")).message).toContain(
      "Utilitário"
    );
    const route = store.previewRoute("bh-mesmo-dia");
    expect(route.ok).toBe(false);
    expect(route.message).toContain("Divinópolis");
  });

  it("blocks dispatch and piloting below 15% tire condition", () => {
    seed({
      credits: 10_000,
      tireCondition: {
        ...createDefaultCampaignState().tireCondition,
        bike: 14,
      },
    });
    const store = new CampaignStore();
    expect(store.dispatchRoute("primeiro-pedal").message).toContain(
      "Condição crítica"
    );
    expect(store.startPilotedRoute("primeiro-pedal").ok).toBe(false);
  });

  it("records every newly unlocked territory as expansion mission progress", () => {
    const missionBase = {
      target: 1,
      progress: 0,
      rewardCredits: 10,
      rewardXp: 1,
      rewardReputation: 1,
      claimed: false,
    };
    seed({
      companyXp: companyXpRequiredForLevel(5) - 1,
      reputation: 7,
      dailyMissionDay: dayKey(),
      dailyMissions: [
        {
          ...missionBase,
          id: "expansion",
          kind: "expansion",
          title: "EXP",
          description: "EXP",
        },
        {
          ...missionBase,
          id: "delivery",
          kind: "deliveries",
          title: "DEL",
          description: "DEL",
        },
        {
          ...missionBase,
          id: "revenue",
          kind: "revenue",
          title: "REV",
          description: "REV",
        },
      ],
    });
    const store = new CampaignStore();
    store.dispatchRoute("primeiro-pedal", 100);
    const delivery = store.value.activeDeliveries[0]!;
    store.collectDelivery(delivery.instanceId, delivery.completesAt);
    expect(store.value.unlockedRegionIds).toContain("belo-horizonte");
    expect(
      store.value.dailyMissions.find(mission => mission.kind === "expansion")
        ?.progress
    ).toBe(1);
  });

  it("binds a piloted run to its route, environment, compound and frozen economics", () => {
    const store = new CampaignStore();
    const started = store.startPilotedRoute("primeiro-pedal");
    expect(started.ok).toBe(true);
    expect(started.plan).toMatchObject({
      routeId: "primeiro-pedal",
      vehicleId: "bike",
      compoundId: "urban",
      terrain: "urban",
      operatingCost: 0,
    });
    expect(started.plan?.weather).toBeTruthy();
    expect(store.upgradeVehicle("bike").message).toContain("em rota");

    const plan = started.plan!;
    store.applyRunResult({
      success: true,
      routeId: plan.routeId,
      vehicleId: plan.vehicleId,
      creditsEarned: plan.netReward,
      grossCreditsEarned: plan.grossReward,
      operatingCost: plan.operatingCost,
      netCreditsEarned: plan.netReward,
      reputationEarned: plan.reputationReward,
      xpEarned: plan.xpReward,
      distance: plan.distance,
      cargo: 0,
      tireTokens: 0,
      integrity: 100,
      tireWear: plan.expectedWear,
      tireFit: plan.tireFit,
    });
    expect(store.value.completedRouteIds).toContain("primeiro-pedal");
    expect(store.value.tireCondition.bike).toBe(100 - plan.expectedWear);
    expect(store.isVehicleOccupied("bike")).toBe(false);
  });
});

describe("CampaignStore bicycle-company MVP", () => {
  it("starts with the promised resources and pays the exact first contract", () => {
    const store = new CampaignStore();
    expect(store.value).toMatchObject({
      credits: 0,
      companyXp: 0,
      reputation: 0,
      bikeFleetSize: 1,
      operationalPointsCapacity: 5,
      hiredCouriers: [],
      bikePartLevels: {
        tire: 0,
        cargo: 0,
        chain: 0,
        brake: 0,
        wheels: 0,
      },
    });
    expect(store.value.buildingLevels.garage).toBe(1);

    const preview = store.previewRoute("primeiro-pedal").plan!;
    // 5 s era a rota inaugural antes do piso de 30 s: ela acabava antes de o
    // jogador chegar na primeira curva do circuito.
    expect(preview.duration).toBe(30);
    expect(preview.grossReward).toBe(10);
    expect(preview.operatingCost).toBe(0);
    expect(preview.xpReward).toBe(1);
    expect(preview.reputationReward).toBe(1);

    expect(store.dispatchRoute("primeiro-pedal", 1_000).ok).toBe(true);
    const delivery = store.value.activeDeliveries[0]!;
    const result = store.collectDelivery(
      delivery.instanceId,
      delivery.completesAt
    );
    expect(result).toMatchObject({
      ok: true,
      creditsEarned: 10,
      xpEarned: 1,
      reputationEarned: 1,
    });
    expect(store.value.credits).toBe(10);
  });

  it("reaches level 2 through the short loop and buys the XB$ 30 urban tyre", () => {
    const store = new CampaignStore();
    store.dispatchRoute("primeiro-pedal", 0);
    let delivery = store.value.activeDeliveries[0]!;
    store.collectDelivery(delivery.instanceId, delivery.completesAt);
    for (let index = 0; index < 2; index += 1) {
      store.dispatchRoute("bairro-expresso", 10_000 + index * 10_000);
      delivery = store.value.activeDeliveries[0]!;
      store.collectDelivery(delivery.instanceId, delivery.completesAt);
    }
    expect(store.companyLevel).toBe(2);
    /*
     * Eram 46 (10 + 18 + 18) enquanto o premio de cada rota era digitado a
     * mao. Agora o premio sai da conta de frete de verdade — 10 + 12 + 12 —
     * e o comeco ficou apertado de proposito: o dinheiro do inicio tem de vir
     * de colocar mais gente pedalando, e nao de uma entrega de bairro valer
     * quase um salario.
     */
    expect(store.value.credits).toBe(34);

    // A carga (60 XB$, nivel 3) ainda esta fora de alcance no nivel 2.
    const tooEarly = store.upgradeBikePart("cargo");
    expect(tooEarly.ok).toBe(false);
    expect(tooEarly.message).toContain("nível 3");
    expect(store.value.credits).toBe(34);

    // O pneu de 30 continua cabendo no fim do circuito de abertura — de
    // raspao, com 4 sobrando. Se um dia nao couber mais, este teste avisa
    // antes de alguem descobrir jogando.
    const upgraded = store.upgradeBikePart("tire");
    expect(upgraded.ok).toBe(true);
    expect(store.value.credits).toBe(4);
    expect(store.value.bikePartLevels.tire).toBe(1);
    // Sem o bau, o Mercado Pequeno continua bloqueado — e diz por que.
    expect(store.previewRoute("mercado-pequeno").message).toContain("Carga");
  });

  it("applies the five part paths to requirements, speed and maintenance", () => {
    seed({
      credits: 2_000,
      companyXp: companyXpRequiredForLevel(4),
    });
    const store = new CampaignStore();
    expect(store.previewRoute("mercado-pequeno").message).toContain("Carga");
    expect(store.upgradeBikePart("cargo").ok).toBe(true);
    expect(store.previewRoute("mercado-pequeno").ok).toBe(true);
    expect(store.upgradeBikePart("cargo").ok).toBe(true);
    expect(store.previewRoute("bairro-distante").message).toContain("Freio");
    expect(store.upgradeBikePart("brake").ok).toBe(true);
    expect(store.previewRoute("bairro-distante").ok).toBe(true);

    const beforeTire = store.previewRoute("bairro-expresso").plan!.duration;
    expect(store.upgradeBikePart("tire").ok).toBe(true);
    expect(store.upgradeBikePart("chain").ok).toBe(true);
    expect(store.upgradeBikePart("wheels").ok).toBe(true);
    const afterParts = store.previewRoute("bairro-expresso").plan!.duration;
    expect(afterParts).toBeLessThan(beforeTire);
    expect(store.value.bikePartLevels).toEqual({
      tire: 1,
      cargo: 2,
      chain: 1,
      brake: 1,
      wheels: 1,
    });

    store.dispatchRoute("bairro-expresso", 100);
    const delivery = store.value.activeDeliveries[0]!;
    store.collectDelivery(delivery.instanceId, delivery.completesAt);
    expect(store.value.tireCondition.bike).toBeLessThan(100);
    expect(store.maintainBike().ok).toBe(true);
    expect(store.value.tireCondition.bike).toBe(100);
  });

  it("buys a second bike, consumes OP and runs a salaried automation in parallel", () => {
    seed({
      credits: 1_000,
      companyXp: companyXpRequiredForLevel(10),
      reputation: 20,
    });
    const store = new CampaignStore();
    /*
     * Eram 180 escritos a mao. Agora o preco sai da conta de frete — oito
     * viagens do que a bicicleta da de lucro — e devolve 177. Os tres XB$ de
     * diferenca sao a prova de que o numero antigo estava certo: a regra que
     * faltava so o explicou.
     */
    expect(secondBikeCost(1)).toBe(177);
    // Mesma historia: eram 250 na mao, sao 243 pela conta — onze viagens do
    // lucro que o ciclista traz.
    expect(courierHireCost(0)).toBe(243);
    expect(store.buyBikeUnit()).toMatchObject({ ok: true, bikeFleetSize: 2 });
    expect(store.hireCourier(500)).toMatchObject({
      ok: true,
      courierId: "courier-1",
      operationalPointsAvailable: 5,
    });
    /*
     * A capacidade era 5 e ficava 5 para sempre: cinco ciclistas e nada mais,
     * em qualquer nivel, com qualquer predio. Agora ela cresce com o Centro
     * de Rotas — o predio que existe justamente para coordenar contratos
     * simultaneos — e um ponto a cada dez niveis. Aqui a empresa esta no
     * nivel 10 sem o predio: 5 + 1.
     */
    expect(store.operations).toEqual({
      capacity: 6,
      used: 1,
      available: 5,
      bikeUnits: 2,
      couriers: 1,
      automatedSlots: 1,
    });

    const automated = store.dispatchAutomatedRoute(
      "bairro-expresso",
      "courier-1",
      1_000
    );
    expect(automated.ok).toBe(true);
    const automatedDelivery = store.value.activeDeliveries[0]!;
    expect(automatedDelivery).toMatchObject({
      operatorId: "courier-1",
      vehicleUnitId: "bike-2",
      automated: true,
    });
    expect(automatedDelivery.costBreakdown.labor).toBeGreaterThan(0);
    expect(automatedDelivery.netReward).toBe(
      automatedDelivery.grossReward - automatedDelivery.operatingCost
    );

    expect(store.dispatchRoute("primeiro-pedal", 1_100).ok).toBe(true);
    expect(store.value.activeDeliveries).toHaveLength(2);
    const collection = store.collectCompletedDeliveries(
      Math.max(...store.value.activeDeliveries.map(item => item.completesAt))
    );
    expect(collection.collected).toBe(2);
    expect(collection.totalNetReward).toBeGreaterThan(0);
  });

  it("keeps the motorcycle locked at 19 and purchasable at level 20", () => {
    seed({
      credits: 10_000,
      reputation: 100,
      companyXp: companyXpRequiredForLevel(19),
    });
    expect(
      new CampaignStore().buyVehicle(getVehicle("moto")).message
    ).toContain("nível 20");

    seed({
      credits: 10_000,
      reputation: 100,
      companyXp: companyXpRequiredForLevel(20),
    });
    const atTwenty = new CampaignStore();
    expect(atTwenty.buyVehicle(getVehicle("moto")).ok).toBe(true);
    expect(atTwenty.value.unlockedVehicles).toContain("moto");
  });
});

describe("CampaignStore v3 persistence", () => {
  it("writes a versioned v3 envelope", () => {
    new CampaignStore();
    const payload = JSON.parse(storage.getItem(CAMPAIGN_STORAGE_KEY) ?? "null");
    expect(payload.version).toBe(CAMPAIGN_SAVE_VERSION);
    expect(payload.state.selectedVehicleId).toBe("bike");
  });

  it("migrates a v2 envelope and supplies every new MVP field", () => {
    const legacy = {
      ...createDefaultCampaignState(),
    } as Record<string, unknown>;
    legacy.credits = 777;
    delete legacy.bikePartLevels;
    delete legacy.bikeFleetSize;
    delete legacy.operationalPointsCapacity;
    delete legacy.hiredCouriers;
    storage.setItem(
      PREVIOUS_CAMPAIGN_STORAGE_KEY,
      JSON.stringify({ version: 2, savedAt: 10, state: legacy })
    );

    const migrated = new CampaignStore().value;
    expect(migrated.credits).toBe(777);
    expect(migrated.bikePartLevels).toEqual({
      tire: 0,
      cargo: 0,
      chain: 0,
      brake: 0,
      wheels: 0,
    });
    expect(migrated.bikeFleetSize).toBe(1);
    expect(migrated.operationalPointsCapacity).toBe(5);
    expect(migrated.hiredCouriers).toEqual([]);
    expect(
      JSON.parse(storage.getItem(CAMPAIGN_STORAGE_KEY) ?? "null").version
    ).toBe(3);
  });

  it("persists and clamps the Turbo Borracha run contract", () => {
    const store = new CampaignStore();
    const started = store.startPilotedRoute("primeiro-pedal");
    expect(started.run).toMatchObject({
      turboEnergy: 0,
      turboActive: false,
      turboSecondsRemaining: 0,
      turboActivations: 0,
      perfectRouteEligible: true,
    });
    // Sem `persist`, a atualizacao fica so na memoria: o laco do jogo grava a
    // cada meio segundo e nao pode pagar uma serializacao por quadro.
    store.updatePilotedRun({ ...started.run!, turboEnergy: 42 });
    expect(store.restorablePilotedRun!.run.turboEnergy).toBe(42);
    expect(new CampaignStore().restorablePilotedRun!.run.turboEnergy).toBe(0);

    store.updatePilotedRun(
      {
        ...started.run!,
        turboEnergy: 500,
        turboActive: true,
        turboSecondsRemaining: -8,
        turboActivations: 3.8,
        perfectRouteEligible: false,
      },
      true
    );

    const restored = new CampaignStore().restorablePilotedRun!.run;
    expect(restored.turboEnergy).toBe(100);
    expect(restored.turboActive).toBe(true);
    expect(restored.turboSecondsRemaining).toBe(0);
    expect(restored.turboActivations).toBe(3);
    expect(restored.perfectRouteEligible).toBe(false);
    expect(restored.vehicleUnitId).toBe("bike-1");
  });

  it("restores immutable in-flight snapshots without recalculation", () => {
    const firstStore = new CampaignStore();
    firstStore.dispatchRoute("primeiro-pedal", 100);
    const inaugural = firstStore.value.activeDeliveries[0]!;
    firstStore.collectDelivery(inaugural.instanceId, inaugural.completesAt);
    firstStore.dispatchRoute("bairro-expresso", 1_000);
    const beforeReload = firstStore.value.activeDeliveries[0]!;

    const restored = new CampaignStore().value.activeDeliveries[0]!;
    expect(restored).toEqual(beforeReload);
    expect(restored.netReward).toBe(
      restored.grossReward - restored.operatingCost
    );
  });

  it("restores a piloted run without charging twice or allowing duplicates", () => {
    // Contrato da capital: e o primeiro com custo operacional real, entao
    // "cobrado uma vez" e distinguivel de "cobrado duas".
    seed({
      credits: 1_000,
      reputation: 20,
      companyXp: companyXpRequiredForLevel(6),
      completedRouteIds: ["primeiro-pedal", "bairro-expresso"],
    });
    const firstStore = new CampaignStore();
    const creditsBeforeRun = firstStore.value.credits;
    const started = firstStore.startPilotedRoute("bh-mesmo-dia");
    expect(started.ok).toBe(true);
    const plan = started.plan!;
    expect(plan.operatingCost).toBeGreaterThan(0);
    expect(firstStore.value.credits).toBe(
      creditsBeforeRun - plan.operatingCost
    );
    firstStore.updatePilotedRun(
      {
        ...started.run!,
        elapsed: 2,
        progress: 0.25,
        distance: plan.distance * 0.25,
        score: 500,
        cargo: 1,
      },
      true
    );

    const restoredStore = new CampaignStore();
    const restored = restoredStore.restorablePilotedRun!;
    expect(restored.plan).toEqual(plan);
    expect(restored.run.elapsed).toBe(2);
    expect(restored.run.score).toBe(500);
    expect(restored.run.cargo).toBe(1);
    expect(restoredStore.value.credits).toBe(
      creditsBeforeRun - plan.operatingCost
    );
    expect(restoredStore.startPilotedRoute("bh-mesmo-dia").ok).toBe(false);
    expect(restoredStore.dispatchRoute("bh-mesmo-dia").ok).toBe(false);
    expect(restoredStore.dispatchRoute("primeiro-pedal").ok).toBe(false);
  });

  it("rejects an invalid persisted piloted plan without crashing migration", () => {
    const store = new CampaignStore();
    store.startPilotedRoute("primeiro-pedal");
    const creditsAfterReservation = store.value.credits;
    const payload = JSON.parse(storage.getItem(CAMPAIGN_STORAGE_KEY) ?? "null");
    payload.state.activePilotedRun.plan.vehicleId = "hacker";
    payload.state.activePilotedRun.plan.operatingCost = -50;
    storage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(payload));

    const restored = new CampaignStore();
    expect(restored.restorablePilotedRun).toBeNull();
    expect(restored.value.credits).toBe(creditsAfterReservation);
    const canonical = JSON.parse(
      storage.getItem(CAMPAIGN_STORAGE_KEY) ?? "null"
    );
    expect(canonical.version).toBe(CAMPAIGN_SAVE_VERSION);
    expect(canonical.state.activePilotedRun).toBeNull();
  });

  it("migrates and validates a hostile legacy save", () => {
    const base = createDefaultCampaignState();
    storage.setItem(
      LEGACY_CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        ...base,
        credits: "not-a-number",
        unlockedVehicles: ["bike", "truck", "hacker"],
        selectedVehicleId: "truck",
        buildingLevels: {
          ...base.buildingLevels,
          garage: 99,
          dispatch: -4,
          planetLab: 8,
        },
        equippedCompounds: {
          ...base.equippedCompounds,
          bike: "planet",
        },
        unlockedRegionIds: ["divinopolis", "marte"],
        activeDeliveries: [
          {
            instanceId: "a",
            routeId: "primeiro-pedal",
            vehicleId: "bike",
            startedAt: 1,
            completesAt: 2,
          },
          {
            instanceId: "b",
            routeId: "bairro-expresso",
            vehicleId: "bike",
            startedAt: 1,
            completesAt: 2,
          },
        ],
      })
    );
    const state = new CampaignStore().value;
    expect(state.credits).toBe(0);
    expect(state.unlockedVehicles).toEqual(["bike"]);
    expect(state.selectedVehicleId).toBe("bike");
    expect(state.buildingLevels.garage).toBe(5);
    expect(state.buildingLevels.dispatch).toBe(0);
    expect(state.buildingLevels.planetLab).toBe(1);
    expect(state.equippedCompounds.bike).toBe("urban");
    expect(state.unlockedRegionIds).toEqual(["divinopolis"]);
    expect(state.activeDeliveries).toHaveLength(1);
    expect(state.activeDeliveries[0]?.grossReward).toBeGreaterThan(0);
  });

  it("zera valores explicitamente negativos de um save adulterado", () => {
    const base = createDefaultCampaignState();
    storage.setItem(
      CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        version: CAMPAIGN_SAVE_VERSION,
        savedAt: Date.now(),
        state: {
          ...base,
          credits: -5_000,
          reputation: -50,
          companyXp: -900,
          deliveries: -3,
          totalDistance: -12,
          onboardingStep: -7,
          bikeFleetSize: -4,
          operationalPointsCapacity: -80,
          vehicleLevels: { ...base.vehicleLevels, bike: -4 },
          tireLevels: {
            grip: -2,
            durability: -9,
            efficiency: -1,
            capacity: -3,
          },
          bikePartLevels: { ...base.bikePartLevels, tire: -2, cargo: -8 },
          tireCondition: { ...base.tireCondition, bike: -20 },
        },
      })
    );

    const store = new CampaignStore();
    const state = store.value;
    expect(state.credits).toBe(0);
    expect(state.reputation).toBe(0);
    expect(state.companyXp).toBe(0);
    expect(state.deliveries).toBe(0);
    expect(state.totalDistance).toBe(0);
    expect(state.onboardingStep).toBe(0);
    expect(state.bikeFleetSize).toBe(1);
    expect(state.vehicleLevels.bike).toBe(1);
    expect(Object.values(state.tireLevels).every(level => level === 0)).toBe(
      true
    );
    expect(
      Object.values(state.bikePartLevels).every(level => level === 0)
    ).toBe(true);
    expect(state.tireCondition.bike).toBe(0);
    expect(store.companyLevel).toBe(1);
    // Pneu zerado nao pode virar rota: o jogo pede manutencao, nao trava.
    expect(store.previewRoute("primeiro-pedal").message).toContain("crítica");
    expect(store.maintainBike().ok).toBe(true);
    expect(store.previewRoute("primeiro-pedal").ok).toBe(true);
  });

  it("mantém crédito finito diante de Number.MAX_VALUE no save", () => {
    const base = createDefaultCampaignState();
    storage.setItem(
      CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        version: CAMPAIGN_SAVE_VERSION,
        savedAt: Date.now(),
        state: {
          ...base,
          credits: Number.MAX_VALUE,
          companyXp: Number.MAX_VALUE,
          buildingLevels: { ...base.buildingLevels, workshop: 3 },
        },
      })
    );

    const store = new CampaignStore();
    expect(Number.isFinite(store.value.credits)).toBe(true);
    expect(store.value.credits).toBeGreaterThan(0);
    expect(Number.isFinite(store.value.companyXp)).toBe(true);
    expect(store.companyLevel).toBe(500);

    // Gastar a partir de um saldo absurdo nao pode gerar NaN nem negativo.
    expect(store.upgradeTire("grip").ok).toBe(true);
    expect(Number.isFinite(store.value.credits)).toBe(true);
    expect(store.value.credits).toBeGreaterThan(0);

    const persisted = JSON.parse(storage.getItem(CAMPAIGN_STORAGE_KEY) ?? "{}");
    expect(Number.isFinite(persisted.state.credits)).toBe(true);
    expect(new CampaignStore().value.credits).toBe(store.value.credits);
  });

  it("corrige uma missão diária com meta zero em vez de premiá-la", () => {
    const today = dayKey();
    const base = createDefaultCampaignState();
    storage.setItem(
      CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        version: CAMPAIGN_SAVE_VERSION,
        savedAt: Date.now(),
        state: {
          ...base,
          dailyMissionDay: today,
          dailyMissions: [
            {
              id: `${today}-deliveries-0`,
              kind: "deliveries",
              title: "META ZERO",
              description: "Meta adulterada.",
              target: 0,
              progress: -5,
              rewardCredits: -10,
              rewardXp: Number.NaN,
              rewardReputation: 1e400,
              claimed: "sim",
            },
            base.dailyMissions[1] ?? {
              id: `${today}-revenue-1`,
              kind: "revenue",
              title: "CAIXA",
              description: "Gere caixa.",
              target: 900,
              progress: 0,
              rewardCredits: 300,
              rewardXp: 20,
              rewardReputation: 6,
              claimed: false,
            },
            base.dailyMissions[2] ?? {
              id: `${today}-upgrade-2`,
              kind: "upgrade",
              title: "MELHORIA",
              description: "Melhore algo.",
              target: 1,
              progress: 0,
              rewardCredits: 300,
              rewardXp: 20,
              rewardReputation: 6,
              claimed: false,
            },
          ],
        },
      })
    );

    const store = new CampaignStore();
    const mission = store.value.dailyMissions.find(
      item => item.id === `${today}-deliveries-0`
    )!;
    expect(mission.target).toBeGreaterThanOrEqual(1);
    expect(mission.progress).toBe(0);
    expect(mission.progress).toBeLessThanOrEqual(mission.target);
    expect(mission.rewardCredits).toBe(0);
    expect(mission.rewardXp).toBe(0);
    expect(mission.rewardReputation).toBe(0);
    expect(mission.claimed).toBe(false);

    // Meta zero nao pode se autoconcluir e virar recompensa gratuita.
    const claimed = store.claimDailyMission(mission.id);
    expect(claimed.ok).toBe(false);
    expect(claimed.message).toContain("Complete a meta");
    expect(store.value.credits).toBe(0);
  });

  it("recovers from corrupt JSON and unavailable/full storage", () => {
    storage.setItem(CAMPAIGN_STORAGE_KEY, "{not-json");
    expect(new CampaignStore().value.selectedVehicleId).toBe("bike");

    const throwing = new MemoryStorage();
    vi.spyOn(throwing, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    installStorage(throwing);
    expect(() => new CampaignStore()).not.toThrow();
  });

  it("falls back to a valid previous save when the current JSON is corrupt", () => {
    const previous = createDefaultCampaignState();
    previous.credits = 777;
    storage.setItem(CAMPAIGN_STORAGE_KEY, "{not-json");
    storage.setItem(
      PREVIOUS_CAMPAIGN_STORAGE_KEY,
      JSON.stringify({ version: 2, savedAt: 10, state: previous })
    );

    expect(new CampaignStore().value.credits).toBe(777);
  });
});

describe("CampaignStore garagem, pesquisa, missões e reinício", () => {
  it("só troca para veículos já adquiridos", () => {
    seed({ unlockedVehicles: ["bike", "moto"] });
    const store = new CampaignStore();

    const locked = store.selectVehicle("truck");
    expect(locked.ok).toBe(false);
    expect(locked.message).toContain("adquirido");
    expect(store.value.selectedVehicleId).toBe("bike");

    const selected = store.selectVehicle("moto");
    expect(selected.ok).toBe(true);
    expect(selected.message).toContain(getVehicle("moto").shortName);
    expect(store.value.selectedVehicleId).toBe("moto");
    // A escolha vale para a proxima sessao, nao so para a tela aberta.
    expect(new CampaignStore().value.selectedVehicleId).toBe("moto");
  });

  it("cobra a pesquisa de pneus e respeita oficina e teto", () => {
    const base = createDefaultCampaignState();
    seed({
      credits: 100_000,
      buildingLevels: { ...base.buildingLevels, workshop: 0 },
    });
    const blocked = new CampaignStore();
    const withoutWorkshop = blocked.upgradeTire("grip");
    expect(withoutWorkshop.ok).toBe(false);
    expect(withoutWorkshop.message).toContain("Oficina");
    expect(blocked.value.tireLevels.grip).toBe(0);

    seed({
      credits: 100_000,
      buildingLevels: { ...base.buildingLevels, workshop: TIRE_MAX_LEVEL },
    });
    const store = new CampaignStore();
    let spent = 0;
    for (let level = 0; level < TIRE_MAX_LEVEL; level += 1) {
      const cost = tireUpgradeCost("grip", level);
      const upgraded = store.upgradeTire("grip");
      expect(upgraded.ok).toBe(true);
      spent += cost;
      expect(store.value.tireLevels.grip).toBe(level + 1);
      expect(store.value.credits).toBe(100_000 - spent);
    }
    const capped = store.upgradeTire("grip");
    expect(capped.ok).toBe(false);
    expect(capped.message).toContain("máximo");
    expect(store.value.tireLevels.grip).toBe(TIRE_MAX_LEVEL);

    seed({
      credits: 5,
      buildingLevels: { ...base.buildingLevels, workshop: 3 },
    });
    const broke = new CampaignStore();
    const unaffordable = broke.upgradeTire("durability");
    expect(unaffordable.ok).toBe(false);
    expect(unaffordable.message).toContain("Faltam");
    expect(broke.value.credits).toBe(5);
    expect(broke.value.tireLevels.durability).toBe(0);
  });

  it("paga a missão diária uma única vez e recusa meta incompleta", () => {
    const today = dayKey();
    const missions: DailyMissionState[] = [
      {
        id: `${today}-deliveries-0`,
        kind: "deliveries",
        title: "GIRO COMPLETO",
        description: "Conclua 2 entregas.",
        target: 2,
        progress: 2,
        rewardCredits: 350,
        rewardXp: 27,
        rewardReputation: 8,
        claimed: false,
      },
      {
        id: `${today}-revenue-1`,
        kind: "revenue",
        title: "CAIXA EM MOVIMENTO",
        description: "Gere XB$ 1.300.",
        target: 1_300,
        progress: 10,
        rewardCredits: 400,
        rewardXp: 31,
        rewardReputation: 9,
        claimed: false,
      },
      {
        id: `${today}-upgrade-2`,
        kind: "upgrade",
        title: "TURNO DE MELHORIA",
        description: "Conclua uma melhoria.",
        target: 1,
        progress: 1,
        rewardCredits: 330,
        rewardXp: 26,
        rewardReputation: 7,
        claimed: true,
      },
    ];
    seed({ credits: 500, dailyMissionDay: today, dailyMissions: missions });
    const store = new CampaignStore();
    const before = store.value;

    const claimed = store.claimDailyMission(`${today}-deliveries-0`);
    expect(claimed.ok).toBe(true);
    expect(claimed.creditsEarned).toBe(350);
    expect(store.value.credits).toBe(before.credits + 350);
    expect(store.value.companyXp).toBe(before.companyXp + 27);
    expect(store.value.reputation).toBe(before.reputation + 8);

    const again = store.claimDailyMission(`${today}-deliveries-0`);
    expect(again.ok).toBe(false);
    expect(again.message).toContain("já coletada");
    expect(store.value.credits).toBe(before.credits + 350);

    const incomplete = store.claimDailyMission(`${today}-revenue-1`);
    expect(incomplete.ok).toBe(false);
    expect(incomplete.message).toContain("Complete a meta");
    expect(store.value.credits).toBe(before.credits + 350);

    expect(store.claimDailyMission("missao-que-nao-existe").ok).toBe(false);
    // A coleta sobrevive ao recarregamento: nada de dobrar recompensa.
    const reloaded = new CampaignStore();
    expect(reloaded.value.credits).toBe(before.credits + 350);
    expect(reloaded.claimDailyMission(`${today}-deliveries-0`).ok).toBe(false);
  });

  it("reinicia a campanha e apaga o progresso persistido", () => {
    seed({
      credits: 9_000,
      reputation: 120,
      companyXp: companyXpRequiredForLevel(12),
      deliveries: 31,
      totalDistance: 990,
      unlockedVehicles: ["bike", "moto"],
      selectedVehicleId: "moto",
      completedRouteIds: ["primeiro-pedal", "bairro-expresso"],
    });
    const store = new CampaignStore();
    store.startPilotedRoute("bairro-expresso");
    expect(store.restorablePilotedRun).not.toBeNull();

    store.reset();

    const fresh = createDefaultCampaignState();
    const state = store.value;
    expect(state.credits).toBe(fresh.credits);
    expect(state.reputation).toBe(0);
    expect(state.companyXp).toBe(0);
    expect(state.deliveries).toBe(0);
    expect(state.totalDistance).toBe(0);
    expect(state.completedRouteIds).toEqual([]);
    expect(state.unlockedVehicles).toEqual(["bike"]);
    expect(state.selectedVehicleId).toBe("bike");
    expect(state.unlockedRegionIds).toEqual(["divinopolis"]);
    expect(store.restorablePilotedRun).toBeNull();
    expect(store.companyLevel).toBe(1);
    // O reinicio tem de chegar ao disco, senao volta no proximo boot.
    expect(new CampaignStore().value.credits).toBe(fresh.credits);
    expect(new CampaignStore().value.deliveries).toBe(0);
    // E a campanha continua jogavel logo apos o reinicio.
    expect(store.previewRoute("primeiro-pedal").ok).toBe(true);
  });
});

describe("CampaignStore previsão de rota é pura", () => {
  it("não destrava região, não move crédito e não reserva veículo", () => {
    seed({
      credits: 1_000,
      reputation: 20,
      companyXp: companyXpRequiredForLevel(6),
      completedRouteIds: ["primeiro-pedal", "bairro-expresso"],
    });
    const store = new CampaignStore();
    const mutable = store as unknown as { state: CampaignState };
    // Volta a foto para antes da expansao: agora um refresh mudaria o estado.
    mutable.state.unlockedRegionIds = ["divinopolis"];

    const before = store.value;
    const preview = store.previewRoute("bairro-expresso");
    expect(preview.ok).toBe(true);

    const after = store.value;
    expect(after.unlockedRegionIds).toEqual(["divinopolis"]);
    expect(after.credits).toBe(before.credits);
    expect(after.activeDeliveries).toEqual(before.activeDeliveries);
    expect(after.activePilotedRun).toBeNull();
    expect(store.isVehicleOccupied("bike")).toBe(false);

    // Enquanto a regiao segue fechada, a previsao diz isso — em vez de abrir
    // a regiao durante o render e deixar a tela contraditoria.
    const locked = store.previewRoute("bh-mesmo-dia");
    expect(locked.ok).toBe(false);
    expect(locked.message).toContain("Expanda a operação");
    expect(store.value.unlockedRegionIds).toEqual(["divinopolis"]);

    // A expansao acontece quando o jogador age, e nao quando olha.
    expect(store.startPilotedRoute("bairro-expresso").ok).toBe(true);
    expect(store.value.unlockedRegionIds).toContain("belo-horizonte");
  });
});

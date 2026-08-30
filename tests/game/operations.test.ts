import { describe, expect, it } from "vitest";
import { VEHICLES, vehicleCargoCapacity } from "../../client/src/game/config";
import {
  earlyGameObjectives,
  generateDailyMissions,
} from "../../client/src/game/missions";
import {
  bikeMaintenanceCost,
  conditionDurationMultiplier,
  conditionRevenueMultiplier,
  getVehicleConditionBand,
  operatingCosts,
  operatingProfile,
  routeDistanceKm,
} from "../../client/src/game/operations";
import {
  BIKE_PARTS,
  BUILDINGS,
  ROUTES,
  VEHICLE_UNLOCK_LEVELS,
  bikePartEffects,
  bikePartUpgradeCost,
  companyLevelFromXp,
  companyXpRequiredForLevel,
} from "../../client/src/game/progression";
import { createDefaultCampaignState } from "../../client/src/game/GameState";
import {
  fixedStepBudget,
  gameplayKeyboardCommand,
  scoreForStep,
} from "../../client/src/game/simulation";

describe("pure campaign rules", () => {
  it("defines the 5/8/15/30 second bicycle opening and long vehicle runway", () => {
    expect(
      ROUTES.filter(route => route.regionId === "divinopolis")
        .slice(0, 4)
        .map(route => route.durationSeconds)
    ).toEqual([5, 8, 15, 30]);
    expect(VEHICLE_UNLOCK_LEVELS).toEqual({
      bike: 1,
      moto: 20,
      van: 40,
      truck: 80,
      fleet: 180,
      planetary: 300,
    });
    expect(companyLevelFromXp(companyXpRequiredForLevel(20) - 1)).toBe(19);
    expect(companyLevelFromXp(companyXpRequiredForLevel(20))).toBe(20);
    expect(companyLevelFromXp(companyXpRequiredForLevel(300))).toBe(300);
  });

  it("aggregates exactly five deterministic bicycle part paths", () => {
    expect(BIKE_PARTS.map(part => part.id)).toEqual([
      "tire",
      "cargo",
      "chain",
      "brake",
      "wheels",
    ]);
    // O Pneu Urbano (30) abre no nivel 2 e a Mochila Pequena (60) no nivel 3.
    expect(bikePartUpgradeCost("tire", 0)).toBe(30);
    expect(bikePartUpgradeCost("cargo", 0)).toBe(60);
    expect(bikePartUpgradeCost("cargo", 1)).toBe(150);
    expect(bikePartUpgradeCost("tire", 5)).toBeNull();
    expect(bikePartUpgradeCost("cargo", -3)).toBe(60);
    const effects = bikePartEffects({
      tire: 1,
      cargo: 2,
      chain: 1,
      brake: 1,
      wheels: 1,
    });
    expect(effects.speedMultiplier).toBeGreaterThan(1);
    expect(effects.payloadBonusKg).toBe(4);
    expect(effects.wearMultiplier).toBeLessThan(1);
    expect(effects.controlBonus).toBeGreaterThan(0);
  });

  it("models normal, worn, critical and broken durability bands", () => {
    expect(getVehicleConditionBand(100)).toBe("normal");
    expect(getVehicleConditionBand(69)).toBe("worn");
    expect(getVehicleConditionBand(39)).toBe("critical");
    expect(getVehicleConditionBand(14)).toBe("broken");
    const base = bikeMaintenanceCost(40, {
      tire: 0,
      cargo: 0,
      chain: 0,
      brake: 0,
      wheels: 0,
    });
    const upgraded = bikeMaintenanceCost(40, {
      tire: 5,
      cargo: 0,
      chain: 5,
      brake: 5,
      wheels: 5,
    });
    expect(upgraded).toBeLessThan(base);
  });

  it("provides a UI-ready early-game objective checklist", () => {
    const state = createDefaultCampaignState();
    const objectives = earlyGameObjectives(state);
    expect(objectives.map(item => item.id)).toEqual([
      "first-delivery",
      "urban-tire",
      "small-backpack",
      "small-trunk",
      "second-bike",
      "first-courier",
    ]);
    expect(objectives.every(item => !item.completed)).toBe(true);
    // A lista so serve se estiver na ordem em que o jogador pode cumpri-la.
    objectives.forEach((item, index) => {
      if (index === 0) return;
      expect(item.unlockLevel).toBeGreaterThanOrEqual(
        objectives[index - 1]!.unlockLevel
      );
    });
  });

  it("defines useful building caps and a contract for Europa", () => {
    expect(BUILDINGS.find(building => building.id === "garage")?.maxLevel).toBe(
      5
    );
    expect(
      BUILDINGS.find(building => building.id === "dispatch")?.maxLevel
    ).toBe(5);
    expect(
      BUILDINGS.find(building => building.id === "planetLab")?.maxLevel
    ).toBe(1);
    expect(ROUTES.find(route => route.regionId === "europa-lua")?.id).toBe(
      "europa-criovault"
    );
  });

  it("keeps logical wheel counts aligned with eight-wheel vehicle visuals", () => {
    expect(VEHICLES.find(vehicle => vehicle.id === "fleet")?.wheelCount).toBe(
      8
    );
    expect(
      VEHICLES.find(vehicle => vehicle.id === "planetary")?.wheelCount
    ).toBe(8);
    expect(
      VEHICLES.every(
        vehicle => vehicle.payload > 0 && vehicle.collisionWidth > 0
      )
    ).toBe(true);
  });

  it("uses one capacity rule for vehicle level and tire technology", () => {
    const truck = VEHICLES.find(vehicle => vehicle.id === "truck")!;
    expect(vehicleCargoCapacity(truck, 1, 0)).toBe(truck.payload);
    expect(vehicleCargoCapacity(truck, 2, 0)).toBe(truck.payload);
    expect(vehicleCargoCapacity(truck, 3, 0)).toBe(truck.payload + 1);
    expect(vehicleCargoCapacity(truck, 5, 0)).toBe(truck.payload + 2);
    expect(vehicleCargoCapacity(truck, 5, 4)).toBe(truck.payload + 6);
  });

  it("accepts gameplay keys only in a running canvas context", () => {
    expect(gameplayKeyboardCommand("a", false, false)).toBeNull();
    expect(gameplayKeyboardCommand("g", true, false)).toBeNull();
    expect(gameplayKeyboardCommand("b", true, false)).toBeNull();
    expect(gameplayKeyboardCommand("r", true, false)).toBeNull();
    expect(gameplayKeyboardCommand("a", true, false)).toBe("left");
    expect(gameplayKeyboardCommand("d", true, false)).toBe("right");
    expect(gameplayKeyboardCommand("Escape", true, false)).toBe("pause");
    expect(gameplayKeyboardCommand("Escape", true, true)).toBe("resume");
    expect(gameplayKeyboardCommand("a", true, true)).toBeNull();
  });

  it("builds deterministic terrain/weather/compound profiles", () => {
    const first = operatingProfile(
      "europa-criovault",
      "world",
      "planet",
      5,
      "2026-08-15"
    );
    const second = operatingProfile(
      "europa-criovault",
      "world",
      "planet",
      5,
      "2026-08-15"
    );
    expect(first).toEqual(second);
    expect(first.terrain).toBe("planetary");
    expect(first.recommendedCompoundId).toBe("planet");
    expect(first.fit).toBe("ideal");
  });

  it("returns an auditable operating-cost total", () => {
    const distance = routeDistanceKm(700, 50, 4);
    const costs = operatingCosts(
      "truck",
      distance,
      4,
      "country",
      "offroad",
      "adequate"
    );
    expect(distance).toBe(700);
    expect(costs.total).toBe(
      costs.fuelEnergy + costs.tolls + costs.labor + costs.maintenanceReserve
    );
    expect(costs.fuelEnergy).toBeGreaterThan(0);
    expect(costs.maintenanceReserve).toBeGreaterThan(0);
  });

  it("makes poor tire condition slower and less profitable", () => {
    expect(conditionDurationMultiplier(20)).toBeGreaterThan(
      conditionDurationMultiplier(100)
    );
    expect(conditionRevenueMultiplier(20)).toBeLessThan(
      conditionRevenueMultiplier(100)
    );
  });

  it("filters impossible upgrade and expansion missions at endgame", () => {
    const missions = generateDailyMissions("2026-08-15", 20, {
      upgrade: false,
      expansion: false,
    });
    expect(missions).toHaveLength(3);
    expect(missions.some(mission => mission.kind === "upgrade")).toBe(false);
    expect(missions.some(mission => mission.kind === "expansion")).toBe(false);
  });

  it("produces the same elapsed simulation and score at 30, 60 and 120 FPS", () => {
    const simulate = (fps: number) => {
      let accumulator = 0;
      let elapsed = 0;
      let score = 0;
      for (let frame = 0; frame < fps * 3; frame += 1) {
        const budget = fixedStepBudget(accumulator, 1 / fps);
        accumulator = budget.remainder;
        for (let step = 0; step < budget.steps; step += 1) {
          elapsed += 1 / 60;
          score += scoreForStep(25, 1 / 60, 3);
        }
      }
      return { elapsed, score };
    };
    const at30 = simulate(30);
    const at60 = simulate(60);
    const at120 = simulate(120);
    expect(at30.elapsed).toBeCloseTo(3, 10);
    expect(at60.elapsed).toBeCloseTo(at30.elapsed, 10);
    expect(at120.elapsed).toBeCloseTo(at30.elapsed, 10);
    expect(at60.score).toBeCloseTo(at30.score, 10);
    expect(at120.score).toBeCloseTo(at30.score, 10);
  });
});

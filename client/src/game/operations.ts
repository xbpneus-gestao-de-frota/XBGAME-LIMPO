/**
 * Pit Lane Industrial: decisões operacionais devem ser legíveis antes do
 * despacho. Todas as previsões são determinísticas e não dependem de rede.
 */
import type {
  BikePartLevels,
  OperatingCostBreakdown,
  RegionScale,
  RouteTerrain,
  TireCompoundId,
  TireFit,
  VehicleId,
  WeatherCondition,
} from "./types";
import { bikePartEffects } from "./progression";

export interface TireCompoundConfig {
  id: TireCompoundId;
  code: string;
  name: string;
  description: string;
  workshopLevel: number;
  planetLabLevel: number;
  accent: string;
  terrains: readonly RouteTerrain[];
  weathers: readonly WeatherCondition[];
}

export interface RouteOperatingProfile {
  terrain: RouteTerrain;
  weather: WeatherCondition;
  recommendedCompoundId: TireCompoundId;
  fit: TireFit;
  revenueMultiplier: number;
  durationMultiplier: number;
  wear: number;
}

export const TIRE_COMPOUNDS: readonly TireCompoundConfig[] = [
  {
    id: "urban",
    code: "URB",
    name: "Urbano Flex",
    description:
      "Resposta equilibrada para as primeiras entregas e o trânsito urbano.",
    workshopLevel: 0,
    planetLabLevel: 0,
    accent: "#18BFEA",
    terrains: ["urban", "highway"],
    weathers: ["clear"],
  },
  {
    id: "rain",
    code: "WET",
    name: "Chuva Control",
    description:
      "Canais direcionais para asfalto molhado e tempestades urbanas.",
    workshopLevel: 1,
    planetLabLevel: 0,
    accent: "#48C6E8",
    terrains: ["urban", "highway"],
    weathers: ["rain", "storm"],
  },
  {
    id: "highway",
    code: "PRO",
    name: "Estrada Pro",
    description: "Baixa resistência e estabilidade em corredores rodoviários.",
    workshopLevel: 2,
    planetLabLevel: 0,
    accent: "#5AA7E8",
    terrains: ["highway", "urban"],
    weathers: ["clear", "heat"],
  },
  {
    id: "cargo",
    code: "MAX",
    name: "Carga Max",
    description:
      "Carcaça reforçada para terminais, depósitos e veículos pesados.",
    workshopLevel: 3,
    planetLabLevel: 0,
    accent: "#86D67C",
    terrains: ["industrial", "highway"],
    weathers: ["clear", "heat", "cold"],
  },
  {
    id: "offroad",
    code: "TRR",
    name: "Terra Force",
    description:
      "Blocos agressivos para poeira, lama e corredores fora de estrada.",
    workshopLevel: 4,
    planetLabLevel: 0,
    accent: "#D9824B",
    terrains: ["offroad", "industrial"],
    weathers: ["dust", "rain"],
  },
  {
    id: "planet",
    code: "PX",
    name: "Planet X",
    description:
      "Composto térmico para órbita, gelo e superfícies planetárias.",
    workshopLevel: 5,
    planetLabLevel: 1,
    accent: "#B8D9FF",
    terrains: ["orbital", "planetary"],
    weathers: ["cold", "dust", "storm"],
  },
] as const;

const TERRAIN_BY_ROUTE: Record<string, RouteTerrain> = {
  "primeiro-pedal": "urban",
  "bairro-expresso": "urban",
  "mercado-pequeno": "urban",
  "bairro-distante": "urban",
  "bh-mesmo-dia": "urban",
  "anel-urbano": "urban",
  "triangulo-carga": "highway",
  "serra-segura": "offroad",
  "eixo-sudeste": "highway",
  "rota-industrial": "industrial",
  "brasil-norte-sul": "highway",
  "transamazonia-xb": "offroad",
  "andes-logistica": "offroad",
  "atlantic-bridge": "industrial",
  "global-relay": "orbital",
  "ponte-lunar": "orbital",
  "corredor-ares": "planetary",
  "europa-criovault": "planetary",
  "rede-solar-final": "planetary",
};

const VEHICLE_COST_RATES: Record<
  VehicleId,
  { fuelEnergy: number; labor: number; reserve: number }
> = {
  bike: { fuelEnergy: 0.08, labor: 0.1, reserve: 0.04 },
  moto: { fuelEnergy: 0.22, labor: 0.14, reserve: 0.08 },
  van: { fuelEnergy: 0.65, labor: 0.22, reserve: 0.16 },
  truck: { fuelEnergy: 1.45, labor: 0.4, reserve: 0.45 },
  fleet: { fuelEnergy: 2.1, labor: 0.55, reserve: 0.62 },
  planetary: { fuelEnergy: 6.8, labor: 1.2, reserve: 1.8 },
};

const WEATHER_LABELS: Record<WeatherCondition, string> = {
  clear: "Aberto",
  rain: "Chuva",
  heat: "Calor intenso",
  dust: "Poeira",
  cold: "Frio extremo",
  storm: "Tempestade",
};

const TERRAIN_LABELS: Record<RouteTerrain, string> = {
  urban: "Urbano",
  highway: "Rodoviário",
  industrial: "Industrial",
  offroad: "Fora de estrada",
  orbital: "Orbital",
  planetary: "Planetário",
};

const WEATHER_POOL: Record<RouteTerrain, readonly WeatherCondition[]> = {
  urban: ["clear", "rain", "heat"],
  highway: ["clear", "rain", "heat"],
  industrial: ["clear", "rain", "cold"],
  offroad: ["clear", "dust", "rain"],
  orbital: ["cold", "storm", "clear"],
  planetary: ["dust", "cold", "storm"],
};

export const dayKey = (date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const hash = (value: string): number => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result >>> 0);
};

export const getCompound = (id: TireCompoundId): TireCompoundConfig =>
  TIRE_COMPOUNDS.find(compound => compound.id === id) ?? TIRE_COMPOUNDS[0]!;

export const terrainForRoute = (
  routeId: string,
  scale?: RegionScale
): RouteTerrain =>
  TERRAIN_BY_ROUTE[routeId] ??
  (scale === "world" ? "planetary" : scale === "country" ? "highway" : "urban");

export const weatherForRoute = (
  routeId: string,
  terrain: RouteTerrain,
  dateKey = dayKey()
): WeatherCondition => {
  const pool = WEATHER_POOL[terrain];
  return pool[hash(`${dateKey}:${routeId}`) % pool.length]!;
};

export const recommendedCompound = (
  terrain: RouteTerrain,
  weather: WeatherCondition
): TireCompoundId => {
  if (terrain === "planetary" || terrain === "orbital") return "planet";
  if (weather === "rain" || weather === "storm") return "rain";
  if (terrain === "offroad" || weather === "dust") return "offroad";
  if (terrain === "industrial") return "cargo";
  if (terrain === "highway" || weather === "heat") return "highway";
  return "urban";
};

export const tireFit = (
  compoundId: TireCompoundId,
  terrain: RouteTerrain,
  weather: WeatherCondition
): TireFit => {
  const compound = getCompound(compoundId);
  const terrainMatch = compound.terrains.includes(terrain);
  const weatherMatch = compound.weathers.includes(weather);
  if (
    compoundId === recommendedCompound(terrain, weather) ||
    (terrainMatch && weatherMatch)
  ) {
    return "ideal";
  }
  if (terrainMatch || weatherMatch) return "adequate";
  if (
    compoundId === "urban" &&
    terrain !== "orbital" &&
    terrain !== "planetary"
  ) {
    return "adequate";
  }
  return "risky";
};

export const operatingProfile = (
  routeId: string,
  scale: RegionScale,
  compoundId: TireCompoundId,
  difficulty: number,
  dateKey = dayKey()
): RouteOperatingProfile => {
  const terrain = terrainForRoute(routeId, scale);
  const weather = weatherForRoute(routeId, terrain, dateKey);
  const fit = tireFit(compoundId, terrain, weather);
  const wearBase = 4 + difficulty * 1.8;
  const fitWear = fit === "ideal" ? 0.72 : fit === "risky" ? 1.55 : 1;
  return {
    terrain,
    weather,
    recommendedCompoundId: recommendedCompound(terrain, weather),
    fit,
    revenueMultiplier: fit === "ideal" ? 1.15 : fit === "risky" ? 0.88 : 1,
    durationMultiplier: fit === "ideal" ? 0.9 : fit === "risky" ? 1.12 : 1,
    wear: Math.max(3, Math.round(wearBase * fitWear)),
  };
};

export const routeDistanceKm = (
  declaredDistanceKm: number | undefined,
  durationSeconds: number,
  difficulty: number
): number => {
  if (
    typeof declaredDistanceKm === "number" &&
    Number.isFinite(declaredDistanceKm) &&
    declaredDistanceKm > 0
  ) {
    return Math.max(1, Math.round(declaredDistanceKm));
  }

  // Migração fail-safe para saves antigos. O tempo da partida é comprimido e
  // nunca mais representa velocidade ou distância física da operação.
  const fallbackRate = 0.12 + Math.max(1, difficulty) * 0.08;
  return Math.max(1, Math.round(durationSeconds * fallbackRate));
};

/**
 * Fuel/energy, tolls, crew and preventive maintenance are deliberately kept
 * separate. This makes the cost auditable and prevents "reward" from silently
 * meaning revenue in one screen and profit in another.
 */
export const operatingCosts = (
  vehicleId: VehicleId,
  distance: number,
  difficulty: number,
  scale: RegionScale,
  terrain: RouteTerrain,
  fit: TireFit
): OperatingCostBreakdown => {
  const rates = VEHICLE_COST_RATES[vehicleId];
  const terrainFactor =
    terrain === "offroad"
      ? 1.22
      : terrain === "industrial"
        ? 1.1
        : terrain === "orbital" || terrain === "planetary"
          ? 1.28
          : 1;
  const fitFactor = fit === "ideal" ? 0.94 : fit === "risky" ? 1.2 : 1;
  const tollRate =
    scale === "city"
      ? 0
      : scale === "state"
        ? 0.08
        : scale === "country"
          ? 0.2
          : 1.1;
  const fuelEnergy = Math.round(
    distance * rates.fuelEnergy * terrainFactor * fitFactor
  );
  const tolls = Math.round(distance * tollRate);
  const labor = Math.round(distance * rates.labor * (1 + difficulty * 0.04));
  const maintenanceReserve = Math.round(
    distance * rates.reserve * terrainFactor * (fit === "risky" ? 1.3 : 1)
  );
  return {
    fuelEnergy,
    tolls,
    labor,
    maintenanceReserve,
    total: fuelEnergy + tolls + labor + maintenanceReserve,
  };
};

export const conditionDurationMultiplier = (condition: number): number =>
  1 + Math.max(0, 70 - Math.min(100, condition)) * 0.006;

export const conditionRevenueMultiplier = (condition: number): number =>
  Math.max(0.75, 1 - Math.max(0, 70 - Math.min(100, condition)) * 0.003);

export type VehicleConditionBand = "normal" | "worn" | "critical" | "broken";

export const getVehicleConditionBand = (
  condition: number
): VehicleConditionBand => {
  const safe = Math.max(0, Math.min(100, condition));
  if (safe >= 70) return "normal";
  if (safe >= 40) return "worn";
  if (safe >= 15) return "critical";
  return "broken";
};

export const isCompoundUnlocked = (
  compound: TireCompoundConfig,
  workshopLevel: number,
  planetLabLevel: number
): boolean =>
  workshopLevel >= compound.workshopLevel &&
  planetLabLevel >= compound.planetLabLevel;

export const maintenanceCost = (
  vehicleId: VehicleId,
  condition: number,
  bikePartLevels?: BikePartLevels
): number => {
  const order = ["bike", "moto", "van", "truck", "fleet", "planetary"].indexOf(
    vehicleId
  );
  const missing = Math.max(0, 100 - condition);
  const baseCost = Math.max(
    40,
    Math.round((missing * (2.2 + Math.max(0, order) * 1.7)) / 10) * 10
  );
  if (vehicleId !== "bike" || !bikePartLevels) return baseCost;
  const discount = bikePartEffects(bikePartLevels).maintenanceDiscount;
  return Math.max(20, Math.round((baseCost * (1 - discount)) / 10) * 10);
};

export const bikeMaintenanceCost = (
  condition: number,
  levels: BikePartLevels
): number => maintenanceCost("bike", condition, levels);

export const scaleOperatingCosts = (
  costs: OperatingCostBreakdown,
  multiplier: number
): OperatingCostBreakdown => {
  const safeMultiplier = Math.max(
    0,
    Number.isFinite(multiplier) ? multiplier : 1
  );
  const fuelEnergy = Math.round(costs.fuelEnergy * safeMultiplier);
  const tolls = Math.round(costs.tolls * safeMultiplier);
  const labor = Math.round(costs.labor * safeMultiplier);
  const maintenanceReserve = Math.round(
    costs.maintenanceReserve * safeMultiplier
  );
  return {
    fuelEnergy,
    tolls,
    labor,
    maintenanceReserve,
    total: fuelEnergy + tolls + labor + maintenanceReserve,
  };
};

export const weatherLabel = (weather: WeatherCondition): string =>
  WEATHER_LABELS[weather];
export const terrainLabel = (terrain: RouteTerrain): string =>
  TERRAIN_LABELS[terrain];
export const fitLabel = (fit: TireFit): string =>
  fit === "ideal" ? "IDEAL" : fit === "risky" ? "ARRISCADO" : "ADEQUADO";

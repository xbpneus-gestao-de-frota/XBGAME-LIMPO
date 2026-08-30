import type { TireStat, VehicleConfig, VehicleId } from "./types";

export const VEHICLES: readonly VehicleConfig[] = [
  {
    id: "bike",
    order: 0,
    name: "Bike Cargo XB",
    shortName: "Bicicleta",
    era: "Pedal Local",
    route: "Bairro Central",
    description:
      "Comece pequeno, aprenda cada rua e faça a primeira entrega acontecer.",
    cost: 0,
    reputationRequired: 0,
    speed: 16,
    baseReward: 430,
    reputationReward: 20,
    payload: 1,
    wheelCount: 2,
    collisionWidth: 0.9,
    accent: "#18BFEA",
    sky: "#9ED0E6",
    ground: "#6E866A",
  },
  {
    id: "moto",
    order: 1,
    name: "Moto Express XB",
    shortName: "Motocicleta",
    era: "Entrega Urbana",
    route: "Eixo Metropolitano",
    description: "Mais agilidade, mais bairros e contratos com prazo apertado.",
    cost: 780,
    reputationRequired: 35,
    speed: 19,
    baseReward: 900,
    reputationReward: 36,
    payload: 2,
    wheelCount: 2,
    collisionWidth: 0.9,
    accent: "#2499E6",
    sky: "#8FC6DF",
    ground: "#647566",
  },
  {
    id: "van",
    order: 2,
    name: "Van Carga XB",
    shortName: "Utilitário",
    era: "Carga Regional",
    route: "Corredor Mineiro",
    description:
      "A operação ganha volume e cruza cidades com carga consolidada.",
    cost: 2_450,
    reputationRequired: 95,
    speed: 22,
    baseReward: 2_050,
    reputationReward: 62,
    payload: 4,
    wheelCount: 4,
    collisionWidth: 2.7,
    accent: "#1687C9",
    sky: "#77B8D7",
    ground: "#7D795F",
  },
  {
    id: "truck",
    order: 3,
    name: "Caminhão Estradeiro XB",
    shortName: "Caminhão",
    era: "Frota Nacional",
    route: "Rota Brasil",
    description:
      "Longas distâncias, cargas pesadas e uma empresa reconhecida na estrada.",
    cost: 6_800,
    reputationRequired: 220,
    speed: 25,
    baseReward: 5_100,
    reputationReward: 108,
    payload: 7,
    wheelCount: 6,
    collisionWidth: 3.05,
    accent: "#12547A",
    sky: "#6EA9C8",
    ground: "#766E54",
  },
  {
    id: "fleet",
    order: 4,
    name: "Comboio Autônomo XB",
    shortName: "Frota Global",
    era: "Rede Global",
    route: "Corredor Continental",
    description:
      "Tecnologia e escala conectam centros logísticos em vários continentes.",
    cost: 15_800,
    reputationRequired: 460,
    speed: 28,
    baseReward: 12_200,
    reputationReward: 185,
    payload: 11,
    wheelCount: 8,
    collisionWidth: 3.25,
    accent: "#0E6A9E",
    sky: "#456D8F",
    ground: "#525C5E",
  },
  {
    id: "planetary",
    order: 5,
    name: "Transportador Planetário XB",
    shortName: "Planetário",
    era: "Rota Planetária",
    route: "Terminal Ares",
    description:
      "Sua empresa ultrapassa fronteiras terrestres e abastece um novo mundo.",
    cost: 39_500,
    reputationRequired: 800,
    speed: 31,
    baseReward: 30_000,
    reputationReward: 360,
    payload: 16,
    wheelCount: 8,
    collisionWidth: 3.8,
    accent: "#48C6E8",
    sky: "#172E4A",
    ground: "#9A4F38",
  },
] as const;

/** HUD speed targets keep each vehicle believable while gameplay remains arcade. */
export const VEHICLE_DISPLAY_SPEED_KMH: Readonly<Record<VehicleId, number>> =
  Object.freeze({
    bike: 26,
    moto: 58,
    van: 72,
    truck: 82,
    fleet: 92,
    planetary: 118,
  });

export function vehicleDisplaySpeedKmh(
  vehicleId: VehicleId,
  vehicleLevel = 1,
  tireCondition = 100
): number {
  const base = VEHICLE_DISPLAY_SPEED_KMH[vehicleId];
  const safeLevel = Math.max(1, Math.min(5, Math.floor(vehicleLevel)));
  const safeCondition = Math.max(0, Math.min(100, tireCondition));
  return Math.round(
    base * (1 + (safeLevel - 1) * 0.05) * (0.82 + (safeCondition / 100) * 0.18)
  );
}

export const TIRE_STATS: readonly {
  id: TireStat;
  label: string;
  shortLabel: string;
  description: string;
  benefit: string;
  baseCost: number;
}[] = [
  {
    id: "grip",
    label: "Aderência",
    shortLabel: "GRIP",
    description: "Trocas de faixa mais rápidas e precisas.",
    benefit: "+16% de resposta",
    baseCost: 240,
  },
  {
    id: "durability",
    label: "Durabilidade",
    shortLabel: "DURA",
    description: "Menor dano ao encontrar perigos na rota.",
    benefit: "−3 de dano",
    baseCost: 280,
  },
  {
    id: "efficiency",
    label: "Eficiência",
    shortLabel: "ECO",
    description: "Mais retorno financeiro a cada entrega.",
    benefit: "+8% de receita",
    baseCost: 320,
  },
  {
    id: "capacity",
    label: "Capacidade",
    shortLabel: "CARGA",
    description: "Transporta mais volumes no mesmo contrato.",
    benefit: "+1 volume",
    baseCost: 360,
  },
] as const;

export const TIRE_MAX_LEVEL = 5;
export const LANE_POSITIONS = [-4, 0, 4] as const;
export const RUN_DURATION_SECONDS = 21;

export function getVehicle(id: VehicleId): VehicleConfig {
  return VEHICLES.find(vehicle => vehicle.id === id) ?? VEHICLES[0]!;
}

/** Single source of truth for the catalog and the cargo pickup limit. */
export function vehicleCargoCapacity(
  vehicle: VehicleConfig,
  vehicleLevel: number,
  tireCapacityLevel: number
): number {
  const safeVehicleLevel = Math.max(1, Math.min(5, Math.floor(vehicleLevel)));
  const safeTireLevel = Math.max(
    0,
    Math.min(TIRE_MAX_LEVEL, Math.floor(tireCapacityLevel))
  );
  return (
    vehicle.payload + Math.floor((safeVehicleLevel - 1) / 2) + safeTireLevel
  );
}

export function tireUpgradeCost(stat: TireStat, currentLevel: number): number {
  const meta = TIRE_STATS.find(item => item.id === stat) ?? TIRE_STATS[0]!;
  return Math.round(meta.baseCost * Math.pow(2.05, currentLevel));
}

/**
 * Economia da Central Logística XB. Números compactos e sessões curtas permitem
 * provar a progressão sem moeda premium, mantendo cada compra compreensível.
 */
import type {
  BikePartEffects,
  BikePartId,
  BikePartLevels,
  BuildingId,
  HiredCourier,
  OperationsSummary,
  RegionScale,
  VehicleId,
} from "./types";

export interface BuildingConfig {
  id: BuildingId;
  name: string;
  shortName: string;
  description: string;
  effect: string;
  unlockLevel: number;
  maxLevel: number;
  baseCost: number;
  position: { x: number; y: number };
}

export interface RegionConfig {
  id: string;
  name: string;
  label: string;
  scale: RegionScale;
  unlockLevel: number;
  reputationRequired: number;
  requiredVehicle: VehicleId;
  accent: string;
  coordinates: { x: number; y: number };
}

export interface RouteConfig {
  id: string;
  regionId: string;
  name: string;
  cargo: string;
  durationSeconds: number;
  /** Distância operacional do contrato; independente do tempo comprimido de gameplay. */
  distanceKm: number;
  baseReward: number;
  xpReward: number;
  reputationReward: number;
  requiredVehicle: VehicleId;
  requiredCompanyLevel: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  firstDelivery?: boolean;
  cargoKg?: number;
  requiredBikeParts?: Partial<BikePartLevels>;
  /** Scales costs only for explicitly subsidised local onboarding contracts. */
  operatingCostScale?: number;
}

export interface BikePartTier {
  level: number;
  name: string;
  cost: number;
  speedBonus?: number;
  payloadBonusKg?: number;
  wearReduction?: number;
  controlBonus?: number;
  maintenanceDiscount?: number;
  operatingCostReduction?: number;
}

export interface BikePartConfig {
  id: BikePartId;
  name: string;
  shortName: string;
  description: string;
  unlockLevel: number;
  tiers: readonly BikePartTier[];
}

export const EMPTY_BIKE_PART_LEVELS: Readonly<BikePartLevels> = {
  tire: 0,
  cargo: 0,
  chain: 0,
  brake: 0,
  wheels: 0,
};

export const BIKE_PARTS: readonly BikePartConfig[] = [
  {
    id: "tire",
    name: "Pneus",
    shortName: "Pneu",
    description: "Velocidade, aderência e menor desgaste nas rotas urbanas.",
    unlockLevel: 2,
    tiers: [
      {
        level: 1,
        name: "Pneu Urbano",
        cost: 30,
        speedBonus: 0.1,
        wearReduction: 0.05,
        controlBonus: 5,
      },
      {
        level: 2,
        name: "Pneu Reforçado",
        cost: 130,
        speedBonus: 0.13,
        wearReduction: 0.16,
        controlBonus: 7,
        maintenanceDiscount: 0.04,
      },
      {
        level: 3,
        name: "Pneu de Chuva",
        cost: 260,
        speedBonus: 0.16,
        wearReduction: 0.2,
        controlBonus: 14,
        maintenanceDiscount: 0.06,
      },
      {
        level: 4,
        name: "Pneu Off-road",
        cost: 520,
        speedBonus: 0.2,
        wearReduction: 0.25,
        controlBonus: 17,
        maintenanceDiscount: 0.08,
      },
      {
        level: 5,
        name: "Pneu Premium XB",
        cost: 980,
        speedBonus: 0.3,
        wearReduction: 0.32,
        controlBonus: 20,
        maintenanceDiscount: 0.1,
      },
    ],
  },
  {
    id: "cargo",
    name: "Baú e carga",
    shortName: "Carga",
    description: "Libera contratos maiores em troca de um pouco mais de peso.",
    unlockLevel: 3,
    tiers: [
      { level: 1, name: "Mochila Pequena", cost: 60, payloadBonusKg: 1 },
      {
        level: 2,
        name: "Baú Traseiro Pequeno",
        cost: 150,
        payloadBonusKg: 4,
        speedBonus: -0.03,
      },
      {
        level: 3,
        name: "Baú Médio",
        cost: 340,
        payloadBonusKg: 7,
        speedBonus: -0.05,
      },
      {
        level: 4,
        name: "Baú Refrigerado",
        cost: 720,
        payloadBonusKg: 9,
        speedBonus: -0.04,
        controlBonus: 4,
      },
      {
        level: 5,
        name: "Micro-reboque XB",
        cost: 1_400,
        payloadBonusKg: 19,
        speedBonus: -0.08,
        controlBonus: 6,
      },
    ],
  },
  {
    id: "chain",
    name: "Corrente",
    shortName: "Corrente",
    description: "Melhora a eficiência da pedalada e a confiabilidade.",
    unlockLevel: 2,
    tiers: [
      {
        level: 1,
        name: "Corrente Reforçada",
        cost: 45,
        speedBonus: 0.04,
        wearReduction: 0.08,
        maintenanceDiscount: 0.03,
      },
      {
        level: 2,
        name: "Corrente Lubrificada",
        cost: 110,
        speedBonus: 0.08,
        wearReduction: 0.13,
        maintenanceDiscount: 0.06,
        operatingCostReduction: 0.03,
      },
      {
        level: 3,
        name: "Corrente Profissional",
        cost: 240,
        speedBonus: 0.12,
        wearReduction: 0.18,
        maintenanceDiscount: 0.09,
        operatingCostReduction: 0.05,
      },
      {
        level: 4,
        name: "Corrente Silenciosa",
        cost: 480,
        speedBonus: 0.16,
        wearReduction: 0.24,
        maintenanceDiscount: 0.12,
        operatingCostReduction: 0.07,
      },
      {
        level: 5,
        name: "Corrente Magnética XB",
        cost: 920,
        speedBonus: 0.22,
        wearReduction: 0.3,
        maintenanceDiscount: 0.16,
        operatingCostReduction: 0.1,
      },
    ],
  },
  {
    id: "brake",
    name: "Freios",
    shortName: "Freio",
    description: "Aumenta o controle e libera entregas frágeis.",
    unlockLevel: 3,
    tiers: [
      { level: 1, name: "Freio V-brake", cost: 50, controlBonus: 10 },
      {
        level: 2,
        name: "Freio a Disco",
        cost: 125,
        controlBonus: 18,
        wearReduction: 0.04,
      },
      {
        level: 3,
        name: "Freio Hidráulico",
        cost: 280,
        controlBonus: 27,
        wearReduction: 0.08,
        maintenanceDiscount: 0.04,
      },
      {
        level: 4,
        name: "Freio Profissional",
        cost: 560,
        controlBonus: 35,
        wearReduction: 0.12,
        maintenanceDiscount: 0.07,
      },
      {
        level: 5,
        name: "Freio Inteligente XB",
        cost: 1_050,
        controlBonus: 45,
        wearReduction: 0.18,
        maintenanceDiscount: 0.1,
      },
    ],
  },
  {
    id: "wheels",
    name: "Rodas e aros",
    shortName: "Rodas",
    description: "Reduz o tempo das entregas e absorve impactos.",
    unlockLevel: 4,
    tiers: [
      {
        level: 1,
        name: "Aro Leve",
        cost: 75,
        speedBonus: 0.06,
        wearReduction: 0.04,
      },
      {
        level: 2,
        name: "Aro Reforçado",
        cost: 160,
        speedBonus: 0.08,
        payloadBonusKg: 1,
        wearReduction: 0.1,
      },
      {
        level: 3,
        name: "Roda Aerodinâmica",
        cost: 320,
        speedBonus: 0.15,
        wearReduction: 0.13,
      },
      {
        level: 4,
        name: "Roda Anti-impacto",
        cost: 640,
        speedBonus: 0.18,
        wearReduction: 0.24,
        maintenanceDiscount: 0.08,
      },
      {
        level: 5,
        name: "Roda de Competição XB",
        cost: 1_200,
        speedBonus: 0.28,
        wearReduction: 0.28,
        maintenanceDiscount: 0.12,
      },
    ],
  },
] as const;

export const MAX_BIKE_PART_LEVEL = 5;
export const STARTING_OPERATIONAL_POINTS = 5;
export const SECOND_BIKE_UNLOCK_LEVEL = 5;
export const FIRST_COURIER_UNLOCK_LEVEL = 10;
export const MAX_MVP_BIKE_FLEET = 2;
export const SECOND_BIKE_BASE_COST = 180;
export const FIRST_COURIER_BASE_COST = 250;

export const VEHICLE_UNLOCK_LEVELS: Readonly<Record<VehicleId, number>> = {
  bike: 1,
  moto: 20,
  van: 40,
  truck: 80,
  fleet: 180,
  planetary: 300,
};

/** Smooth early game and long runway for the level-300 planetary milestone. */
export const MAX_COMPANY_LEVEL = 500;

/**
 * A curva era quadratica ate o fim: chegar ao nivel 500 pedia 499.000 de XP e,
 * na pratica, 184 repeticoes do mesmo contrato. Ate o nivel 30 nada muda (a
 * abertura do jogo esta boa); dali em diante o custo cresce bem mais devagar.
 * Nenhum save perde progresso: quem ja tinha XP simplesmente sobe de nivel.
 */
const CURVE_PIVOT_LEVEL = 30;
const CURVE_PIVOT_XP =
  (CURVE_PIVOT_LEVEL - 1) * (CURVE_PIVOT_LEVEL - 1) * 2 +
  (CURVE_PIVOT_LEVEL - 1) * 2;
const LATE_CURVE_FACTOR = 9.6;
const LATE_CURVE_EXPONENT = 1.5;

export const companyXpRequiredForLevel = (level: number): number => {
  const safeLevel = Math.max(1, Math.min(MAX_COMPANY_LEVEL, Math.floor(level)));
  const completedLevels = safeLevel - 1;
  if (safeLevel <= CURVE_PIVOT_LEVEL) {
    return completedLevels * completedLevels * 2 + completedLevels * 2;
  }
  return (
    CURVE_PIVOT_XP +
    Math.round(
      LATE_CURVE_FACTOR *
        Math.pow(safeLevel - CURVE_PIVOT_LEVEL, LATE_CURVE_EXPONENT)
    )
  );
};

export const COMPANY_LEVEL_XP: readonly number[] = Array.from(
  { length: MAX_COMPANY_LEVEL },
  (_, index) => companyXpRequiredForLevel(index + 1)
);

export const BUILDINGS: readonly BuildingConfig[] = [
  {
    id: "hq",
    name: "Sede XB",
    shortName: "Sede",
    description: "Comando da empresa e limite de evolução de toda a central.",
    effect: "+5% de receita geral por nível",
    unlockLevel: 1,
    maxLevel: 10,
    baseCost: 350,
    position: { x: 49, y: 34 },
  },
  {
    id: "garage",
    name: "Garagem de Frota",
    shortName: "Garagem",
    description: "Compra veículos e aumenta o nível máximo de cada unidade.",
    effect: "+1 nível de veículo por nível",
    unlockLevel: 1,
    maxLevel: 5,
    baseCost: 420,
    position: { x: 72, y: 47 },
  },
  {
    id: "workshop",
    name: "Oficina de Pneus",
    shortName: "Oficina",
    description: "Pesquisa aderência, durabilidade, eficiência e capacidade.",
    effect: "+1 teto tecnológico de pneus",
    unlockLevel: 3,
    maxLevel: 5,
    baseCost: 380,
    position: { x: 28, y: 52 },
  },
  {
    id: "warehouse",
    name: "Depósito de Cargas",
    shortName: "Depósito",
    description: "Consolida volumes e aumenta o pagamento por entrega.",
    effect: "+8% de recompensa de carga por nível",
    unlockLevel: 8,
    maxLevel: 8,
    baseCost: 620,
    position: { x: 63, y: 68 },
  },
  {
    id: "dispatch",
    name: "Centro de Rotas",
    shortName: "Rotas",
    description: "Coordena contratos simultâneos e novas regiões.",
    effect: "Libera até 3 entregas simultâneas",
    unlockLevel: 10,
    maxLevel: 5,
    baseCost: 850,
    position: { x: 40, y: 72 },
  },
  {
    id: "planetLab",
    name: "Laboratório Planetário",
    shortName: "Orbital",
    description: "Desenvolve compostos e logística para outros mundos.",
    effect: "Libera contratos e o composto Planet X",
    unlockLevel: 300,
    maxLevel: 1,
    baseCost: 18_000,
    position: { x: 84, y: 28 },
  },
] as const;

export const REGIONS: readonly RegionConfig[] = [
  {
    id: "divinopolis",
    name: "Divinópolis",
    label: "Cidade-base",
    scale: "city",
    unlockLevel: 1,
    reputationRequired: 0,
    requiredVehicle: "bike",
    accent: "#18BFEA",
    coordinates: { x: 34, y: 64 },
  },
  {
    id: "belo-horizonte",
    name: "Belo Horizonte",
    label: "Capital conectada",
    scale: "city",
    unlockLevel: 5,
    reputationRequired: 8,
    requiredVehicle: "bike",
    accent: "#2499E6",
    coordinates: { x: 68, y: 40 },
  },
  {
    id: "minas-gerais",
    name: "Minas Gerais",
    label: "Malha estadual",
    scale: "state",
    unlockLevel: 20,
    reputationRequired: 35,
    requiredVehicle: "moto",
    accent: "#1687C9",
    coordinates: { x: 34, y: 64 },
  },
  {
    id: "sudeste",
    name: "Região Sudeste",
    label: "Corredor regional",
    scale: "state",
    unlockLevel: 40,
    reputationRequired: 95,
    requiredVehicle: "van",
    accent: "#12547A",
    coordinates: { x: 68, y: 40 },
  },
  {
    id: "brasil",
    name: "Brasil",
    label: "Rede nacional",
    scale: "country",
    unlockLevel: 80,
    reputationRequired: 220,
    requiredVehicle: "truck",
    accent: "#4FD08A",
    coordinates: { x: 28, y: 47 },
  },
  {
    id: "america-sul",
    name: "América do Sul",
    label: "Eixo continental",
    scale: "country",
    unlockLevel: 120,
    reputationRequired: 430,
    requiredVehicle: "truck",
    accent: "#3DB8C9",
    coordinates: { x: 40, y: 73 },
  },
  {
    id: "euro-africa",
    name: "Europa–África",
    label: "Ponte transatlântica",
    scale: "country",
    unlockLevel: 180,
    reputationRequired: 620,
    requiredVehicle: "fleet",
    accent: "#5AA7E8",
    coordinates: { x: 65, y: 34 },
  },
  {
    id: "rede-global",
    name: "Rede Global",
    label: "Operação mundial",
    scale: "country",
    unlockLevel: 220,
    reputationRequired: 850,
    requiredVehicle: "fleet",
    accent: "#8A8FE8",
    coordinates: { x: 75, y: 62 },
  },
  {
    id: "lua",
    name: "Lua",
    label: "Primeira base orbital",
    scale: "world",
    unlockLevel: 300,
    reputationRequired: 1_150,
    requiredVehicle: "planetary",
    accent: "#D6E4EA",
    coordinates: { x: 24, y: 61 },
  },
  {
    id: "marte",
    name: "Marte",
    label: "Corredor Ares",
    scale: "world",
    unlockLevel: 350,
    reputationRequired: 1_500,
    requiredVehicle: "planetary",
    accent: "#D96B47",
    coordinates: { x: 47, y: 43 },
  },
  {
    id: "europa-lua",
    name: "Europa",
    label: "Lua de Júpiter",
    scale: "world",
    unlockLevel: 400,
    reputationRequired: 1_850,
    requiredVehicle: "planetary",
    accent: "#7AD6E8",
    coordinates: { x: 70, y: 27 },
  },
  {
    id: "rede-solar",
    name: "Rede Solar XB",
    label: "Empresa planetária",
    scale: "world",
    unlockLevel: 500,
    reputationRequired: 2_200,
    requiredVehicle: "planetary",
    accent: "#48C6E8",
    coordinates: { x: 77, y: 69 },
  },
] as const;

/**
 * Piso de duracao de rota, em segundos. Com o circuito de verdade no lugar da
 * esteira, uma entrega de 5 s acabava antes de o jogador chegar na primeira
 * curva: ele nao via a volta, nao via o bairro e nao dava tempo de a coleta e
 * a entrega acontecerem em lugares diferentes.
 *
 * O piso mora aqui, uma vez, em cima da tabela — assim nenhuma rota nova
 * nasce curta demais por esquecimento.
 */
export const DURACAO_MINIMA_SEGUNDOS = 30;

const ROTAS_ESCRITAS: readonly RouteConfig[] = [
  {
    id: "primeiro-pedal",
    regionId: "divinopolis",
    name: "Primeira Entrega XB",
    cargo: "Kit de reparo",
    durationSeconds: 5,
    distanceKm: 1,
    baseReward: 10,
    xpReward: 1,
    reputationReward: 1,
    requiredVehicle: "bike",
    requiredCompanyLevel: 1,
    difficulty: 1,
    firstDelivery: true,
    cargoKg: 0.1,
  },
  {
    id: "bairro-expresso",
    regionId: "divinopolis",
    name: "Giro do Bairro",
    cargo: "Lanche quente",
    durationSeconds: 8,
    distanceKm: 2,
    baseReward: 18,
    xpReward: 2,
    reputationReward: 1,
    requiredVehicle: "bike",
    requiredCompanyLevel: 1,
    difficulty: 1,
    cargoKg: 0.5,
    // Recurring recovery contract: it keeps the campaign playable even when
    // an upgrade uses the last XB Coin.
    operatingCostScale: 0,
  },
  {
    id: "mercado-pequeno",
    regionId: "divinopolis",
    name: "Mercado Pequeno",
    cargo: "Compras do bairro",
    durationSeconds: 15,
    distanceKm: 4,
    baseReward: 42,
    xpReward: 4,
    reputationReward: 2,
    requiredVehicle: "bike",
    requiredCompanyLevel: 2,
    difficulty: 1,
    cargoKg: 2,
    requiredBikeParts: { cargo: 1 },
    operatingCostScale: 0.1,
  },
  {
    id: "bairro-distante",
    regionId: "divinopolis",
    name: "Bairro Distante",
    cargo: "Pacote frágil",
    durationSeconds: 30,
    distanceKm: 8,
    baseReward: 95,
    xpReward: 8,
    reputationReward: 4,
    requiredVehicle: "bike",
    requiredCompanyLevel: 3,
    difficulty: 2,
    cargoKg: 4,
    requiredBikeParts: { cargo: 2, brake: 1 },
    operatingCostScale: 0.12,
  },
  {
    id: "bh-mesmo-dia",
    regionId: "belo-horizonte",
    name: "Capital no Mesmo Dia",
    cargo: "Rodas compactas",
    durationSeconds: 15,
    distanceKm: 18,
    baseReward: 680,
    xpReward: 55,
    reputationReward: 24,
    requiredVehicle: "bike",
    requiredCompanyLevel: 5,
    difficulty: 1,
  },
  {
    id: "anel-urbano",
    regionId: "belo-horizonte",
    name: "Anel Urbano",
    cargo: "Pneus express",
    durationSeconds: 30,
    distanceKm: 42,
    baseReward: 920,
    xpReward: 72,
    reputationReward: 31,
    requiredVehicle: "moto",
    requiredCompanyLevel: 20,
    difficulty: 2,
  },
  {
    id: "triangulo-carga",
    regionId: "minas-gerais",
    name: "Triângulo de Carga",
    cargo: "Lote utilitário",
    durationSeconds: 20,
    distanceKm: 120,
    baseReward: 1_450,
    xpReward: 98,
    reputationReward: 44,
    requiredVehicle: "moto",
    requiredCompanyLevel: 24,
    difficulty: 2,
  },
  {
    id: "serra-segura",
    regionId: "minas-gerais",
    name: "Serra Segura",
    cargo: "Composto de aderência",
    durationSeconds: 24,
    distanceKm: 150,
    baseReward: 1_880,
    xpReward: 118,
    reputationReward: 52,
    requiredVehicle: "van",
    requiredCompanyLevel: 40,
    difficulty: 2,
  },
  {
    id: "eixo-sudeste",
    regionId: "sudeste",
    name: "Eixo Sudeste",
    cargo: "Carga consolidada",
    durationSeconds: 30,
    distanceKm: 240,
    baseReward: 2_650,
    xpReward: 150,
    reputationReward: 70,
    requiredVehicle: "van",
    requiredCompanyLevel: 45,
    difficulty: 3,
  },
  {
    id: "rota-industrial",
    regionId: "sudeste",
    name: "Rota Industrial",
    cargo: "Pneus de carga",
    durationSeconds: 36,
    distanceKm: 300,
    baseReward: 3_300,
    xpReward: 178,
    reputationReward: 82,
    requiredVehicle: "truck",
    requiredCompanyLevel: 80,
    difficulty: 3,
  },
  {
    id: "brasil-norte-sul",
    regionId: "brasil",
    name: "Brasil Norte–Sul",
    cargo: "Frota comercial",
    durationSeconds: 42,
    distanceKm: 500,
    baseReward: 4_600,
    xpReward: 220,
    reputationReward: 105,
    requiredVehicle: "truck",
    requiredCompanyLevel: 85,
    difficulty: 3,
  },
  {
    id: "transamazonia-xb",
    regionId: "brasil",
    name: "Transamazônica XB",
    cargo: "Pneus todo-terreno",
    durationSeconds: 50,
    distanceKm: 700,
    baseReward: 5_800,
    xpReward: 260,
    reputationReward: 122,
    requiredVehicle: "truck",
    requiredCompanyLevel: 100,
    difficulty: 4,
  },
  {
    id: "andes-logistica",
    regionId: "america-sul",
    name: "Corredor dos Andes",
    cargo: "Carga internacional",
    durationSeconds: 58,
    distanceKm: 950,
    baseReward: 7_200,
    xpReward: 310,
    reputationReward: 145,
    requiredVehicle: "truck",
    requiredCompanyLevel: 120,
    difficulty: 4,
  },
  {
    id: "atlantic-bridge",
    regionId: "euro-africa",
    name: "Ponte Atlântica",
    cargo: "Módulos globais",
    durationSeconds: 68,
    distanceKm: 1300,
    baseReward: 9_600,
    xpReward: 380,
    reputationReward: 180,
    requiredVehicle: "fleet",
    requiredCompanyLevel: 180,
    difficulty: 4,
  },
  {
    id: "global-relay",
    regionId: "rede-global",
    name: "Revezamento Global",
    cargo: "Carga autônoma",
    durationSeconds: 78,
    distanceKm: 1800,
    baseReward: 13_500,
    xpReward: 480,
    reputationReward: 230,
    requiredVehicle: "fleet",
    requiredCompanyLevel: 220,
    difficulty: 4,
  },
  {
    id: "ponte-lunar",
    regionId: "lua",
    name: "Ponte Lunar",
    cargo: "Habitat pressurizado",
    durationSeconds: 90,
    distanceKm: 2100,
    baseReward: 19_000,
    xpReward: 620,
    reputationReward: 310,
    requiredVehicle: "planetary",
    requiredCompanyLevel: 300,
    difficulty: 5,
  },
  {
    id: "corredor-ares",
    regionId: "marte",
    name: "Corredor Ares",
    cargo: "Unidade de energia",
    durationSeconds: 110,
    distanceKm: 2800,
    baseReward: 28_000,
    xpReward: 820,
    reputationReward: 420,
    requiredVehicle: "planetary",
    requiredCompanyLevel: 350,
    difficulty: 5,
  },
  {
    id: "europa-criovault",
    regionId: "europa-lua",
    name: "Criocorredor Europa",
    cargo: "Laboratório subglacial",
    durationSeconds: 122,
    distanceKm: 3500,
    baseReward: 36_500,
    xpReward: 980,
    reputationReward: 510,
    requiredVehicle: "planetary",
    requiredCompanyLevel: 400,
    difficulty: 5,
  },
  {
    id: "rede-solar-final",
    regionId: "rede-solar",
    name: "Rede Solar XB",
    cargo: "Núcleo logístico",
    durationSeconds: 135,
    distanceKm: 4200,
    baseReward: 48_000,
    xpReward: 1_200,
    reputationReward: 650,
    requiredVehicle: "planetary",
    requiredCompanyLevel: 500,
    difficulty: 5,
  },
] as const;

/**
 * A tabela acima e a escrita a mao; esta e a que o jogo usa. O piso e
 * aplicado aqui, num lugar so, em vez de espalhado por cinquenta numeros que
 * alguem esqueceria de atualizar.
 */
export const ROUTES: readonly RouteConfig[] = ROTAS_ESCRITAS.map(rota =>
  rota.durationSeconds >= DURACAO_MINIMA_SEGUNDOS
    ? rota
    : { ...rota, durationSeconds: DURACAO_MINIMA_SEGUNDOS }
);

export function companyLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, Number.isFinite(xp) ? xp : 0);
  let low = 0;
  let high = COMPANY_LEVEL_XP.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (safeXp >= COMPANY_LEVEL_XP[middle]!) low = middle + 1;
    else high = middle - 1;
  }
  return Math.min(MAX_COMPANY_LEVEL, Math.max(1, high + 1));
}

export function xpProgress(xp: number): {
  level: number;
  current: number;
  needed: number;
  percent: number;
} {
  const level = companyLevelFromXp(xp);
  if (level >= MAX_COMPANY_LEVEL) {
    return { level, current: 1, needed: 1, percent: 100 };
  }
  const floor = COMPANY_LEVEL_XP[level - 1]!;
  const ceiling = COMPANY_LEVEL_XP[level]!;
  const current = Math.max(0, xp - floor);
  const needed = ceiling - floor;
  return {
    level,
    current,
    needed,
    percent: Math.min(100, (current / needed) * 100),
  };
}

export function buildingUpgradeCost(
  building: BuildingConfig,
  currentLevel: number
): number {
  return (
    Math.round(
      (building.baseCost * Math.pow(1.72, Math.max(0, currentLevel - 1))) / 10
    ) * 10
  );
}

export function vehicleUpgradeCost(
  vehicleCost: number,
  currentLevel: number
): number {
  const base = Math.max(260, vehicleCost * 0.42);
  return (
    Math.round((base * Math.pow(1.65, Math.max(0, currentLevel - 1))) / 10) * 10
  );
}

export function deliverySlotCount(dispatchLevel: number): number {
  if (dispatchLevel >= 5) return 3;
  if (dispatchLevel >= 2) return 2;
  return 1;
}

export function getBikePart(id: BikePartId): BikePartConfig {
  return BIKE_PARTS.find(part => part.id === id) ?? BIKE_PARTS[0]!;
}

export function bikePartUpgradeCost(
  id: BikePartId,
  currentLevel: number
): number | null {
  const next = getBikePart(id).tiers.find(
    tier => tier.level === Math.max(0, Math.floor(currentLevel)) + 1
  );
  return next?.cost ?? null;
}

const tierForLevel = (
  id: BikePartId,
  level: number
): BikePartTier | undefined =>
  getBikePart(id).tiers.find(tier => tier.level === Math.floor(level));

/** Aggregates all five part paths without hidden randomness. */
export function bikePartEffects(levels: BikePartLevels): BikePartEffects {
  const tiers = BIKE_PARTS.map(part => tierForLevel(part.id, levels[part.id]));
  const sum = (read: (tier: BikePartTier) => number | undefined): number =>
    tiers.reduce((total, tier) => total + (tier ? (read(tier) ?? 0) : 0), 0);
  const speedBonus = sum(tier => tier.speedBonus);
  const wearReduction = Math.min(
    0.55,
    sum(tier => tier.wearReduction)
  );
  return {
    speedMultiplier: Math.max(0.75, 1 + speedBonus),
    payloadBonusKg: Math.max(
      0,
      sum(tier => tier.payloadBonusKg)
    ),
    wearMultiplier: 1 - wearReduction,
    controlBonus: Math.max(
      0,
      sum(tier => tier.controlBonus)
    ),
    maintenanceDiscount: Math.min(
      0.5,
      sum(tier => tier.maintenanceDiscount)
    ),
    operatingCostMultiplier: Math.max(
      0.7,
      1 - sum(tier => tier.operatingCostReduction)
    ),
  };
}

export const secondBikeCost = (bikeFleetSize: number): number =>
  Math.round(
    SECOND_BIKE_BASE_COST *
      Math.pow(1.8, Math.max(0, Math.floor(bikeFleetSize) - 1))
  );

export const courierHireCost = (courierCount: number): number =>
  Math.round(
    FIRST_COURIER_BASE_COST * Math.pow(1.65, Math.max(0, courierCount))
  );

export const operationalPointsUsed = (
  couriers: readonly HiredCourier[]
): number =>
  couriers.reduce(
    (total, courier) => total + Math.max(0, courier.operationalPoints),
    0
  );

export const operationalPointsAvailable = (
  capacity: number,
  couriers: readonly HiredCourier[]
): number =>
  Math.max(0, Math.floor(capacity) - operationalPointsUsed(couriers));

export const operationsSummary = (
  capacity: number,
  bikeFleetSize: number,
  couriers: readonly HiredCourier[]
): OperationsSummary => {
  const used = operationalPointsUsed(couriers);
  return {
    capacity: Math.max(0, Math.floor(capacity)),
    used,
    available: Math.max(0, Math.floor(capacity) - used),
    bikeUnits: Math.max(1, Math.floor(bikeFleetSize)),
    couriers: couriers.length,
    automatedSlots: Math.max(
      0,
      Math.min(Math.max(0, Math.floor(bikeFleetSize) - 1), couriers.length)
    ),
  };
};

export function previousRegion(regionId: string): RegionConfig | undefined {
  const index = REGIONS.findIndex(region => region.id === regionId);
  return index > 0 ? REGIONS[index - 1] : undefined;
}

export function routeCompletedInRegion(
  regionId: string,
  completedRouteIds: readonly string[]
): boolean {
  return ROUTES.some(
    route => route.regionId === regionId && completedRouteIds.includes(route.id)
  );
}

export function scaleLabel(scale: RegionScale): string {
  if (scale === "city") return "CIDADE";
  if (scale === "state") return "ESTADO";
  if (scale === "country") return "PAÍS";
  return "MUNDO";
}

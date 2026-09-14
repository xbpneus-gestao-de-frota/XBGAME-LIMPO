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
import {
  CLASSE_DO_VEICULO,
  FROTA,
  freteDaRotaDaCarreira,
} from "./freight";
import { custoDeContratar, custoDeUmaUnidade } from "./hiring";
/*
 * A tabela das pecas mora em asPecasDaBicicleta: o aplicativo tambem le dela,
 * e ela nao pode depender da economia. Reexportada aqui para quem ja usava.
 */
import {
  BIKE_PARTS,
  MAX_BIKE_PART_LEVEL,
  bikePartEffects,
  bikePartUpgradeCost,
  getBikePart,
} from "./asPecasDaBicicleta";

export type {
  BikePartConfig,
  BikePartTier,
} from "./asPecasDaBicicleta";
export {
  BIKE_PARTS,
  EMPTY_BIKE_PART_LEVELS,
  MAX_BIKE_PART_LEVEL,
  bikePartEffects,
  bikePartUpgradeCost,
  getBikePart,
} from "./asPecasDaBicicleta";

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
  /** Quantos volumes saem nesta viagem. É o que a conta de frete cobra por item. */
  volumes: number;
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

type RotaEscrita = Omit<
  RouteConfig,
  "baseReward" | "durationSeconds" | "volumes"
> & {
  /**
   * Quantos volumes saem nesta viagem. Sem valor, o veiculo sai lotado — rota
   * de campanha e contrato fechado, e ninguem manda uma carreta rodar mil
   * quilometros com meia carga.
   */
  volumes?: number;
};

const ROTAS_ESCRITAS: readonly RotaEscrita[] = [
  {
    id: "primeiro-pedal",
    // Um kit de reparo. A primeira saida leva um volume so.
    volumes: 1,
    regionId: "divinopolis",
    name: "Primeira Entrega XB",
    cargo: "Kit de reparo",
    distanceKm: 1,
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
    // Um lanche quente, e ele nao espera companhia.
    volumes: 1,
    regionId: "divinopolis",
    name: "Giro do Bairro",
    cargo: "Lanche quente",
    distanceKm: 2,
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
    // Duas sacolas de compras do bairro.
    volumes: 2,
    regionId: "divinopolis",
    name: "Mercado Pequeno",
    cargo: "Compras do bairro",
    distanceKm: 4,
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
    distanceKm: 8,
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
    distanceKm: 18,
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
    distanceKm: 42,
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
    distanceKm: 120,
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
    distanceKm: 150,
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
    distanceKm: 240,
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
    distanceKm: 300,
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
    distanceKm: 500,
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
    distanceKm: 700,
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
    distanceKm: 950,
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
    distanceKm: 1300,
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
    distanceKm: 1800,
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
    distanceKm: 2100,
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
    distanceKm: 2800,
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
    distanceKm: 3500,
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
    distanceKm: 4200,
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
/**
 * Quanto tempo a rota leva, em segundos de jogo.
 *
 * A duracao era escrita a mao rota por rota, e por isso saiu torta: a entrega
 * de 8 km levava 30 s e a de 18 km levava 15 s — a rota mais longa terminava
 * antes. Agora ela sai da distancia, e essa inversao nao pode mais acontecer.
 *
 * A curva e `5 + 1,415 x km^0,543`, ajustada em cima da propria tabela que o
 * Fernando ja aprovou: de 300 km para cima ela devolve praticamente os mesmos
 * numeros de antes (300 km -> 36 s, 4.200 km -> 135 s). Ela nao e o tempo
 * real da viagem, e nem tenta ser: 18 km de bicicleta levam 1h12 de verdade,
 * e ninguem espera 1h12 olhando para a tela. O tempo do jogo e comprimido, e
 * comprimido cada vez mais conforme a distancia cresce — e por isso o
 * expoente e menor que 1.
 *
 * O pagamento NAO passa por aqui. Ele vem da distancia, pela conta de frete.
 * Esta funcao decide so quanto tempo a barra demora a encher.
 */
export const duracaoDaRota = (km: number): number =>
  Math.max(
    DURACAO_MINIMA_SEGUNDOS,
    Math.round(5 + 1.415 * Math.pow(Math.max(0, km), 0.543))
  );

/**
 * A tabela de rotas, ja com o preco e o tempo calculados.
 *
 * ── POR QUE O PRECO NAO E MAIS ESCRITO A MAO ──────────────────────────────
 *
 * Cada rota tinha um `baseReward` digitado. Funcionava enquanto o jogo era so
 * bicicleta; quando chegou a carreta, ficou impossivel: ninguem sabe de
 * cabeca quanto vale um frete de 1.300 km, e o numero chutado ou paga demais
 * ou paga de menos sem ninguem perceber. A tabela antiga pagava 680 numa
 * entrega de bicicleta de 18 km — dezessete vezes o frete real — enquanto as
 * rotas de carreta ja estavam certas. O jogo tinha duas economias diferentes
 * dentro dele, e so a de baixo estava inflada.
 *
 * Agora o preco de toda rota, do pedal a Marte, sai da mesma conta de frete:
 * parte fixa + distancia + volumes, com os numeros de fonte anotada no
 * freight.ts. Uma rota nova nasce com o preco certo sem ninguem decidir nada.
 *
 * A era da bicicleta fica mesmo mais pobre por corrida — e essa e a ideia. O
 * dinheiro do inicio nao vem de uma entrega valer muito; vem de colocar mais
 * gente pedalando ao mesmo tempo, que e o jogo que o Fernando descreveu.
 */
export const ROUTES: readonly RouteConfig[] = ROTAS_ESCRITAS.map(rota => {
  const classe = CLASSE_DO_VEICULO[rota.requiredVehicle];
  const volumes = rota.volumes ?? FROTA[classe].capacidade;
  return {
    ...rota,
    volumes,
    baseReward: Math.round(
      freteDaRotaDaCarreira(rota.requiredVehicle, rota.distanceKm, volumes)
    ),
    durationSeconds: duracaoDaRota(rota.distanceKm),
  };
});

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

/**
 * O preco da proxima bicicleta e da proxima contratacao de ciclista.
 *
 * Continuam existindo porque meia duzia de lugares ja os chamavam pelo nome,
 * mas os dois agora sao apenas o caso "bicicleta" da conta geral do
 * hiring.ts, que vale para toda classe. Nao ha mais dois precos possiveis
 * para a mesma coisa.
 */
export const secondBikeCost = (bikeFleetSize: number): number =>
  custoDeUmaUnidade("bike", bikeFleetSize);

export const courierHireCost = (courierCount: number): number =>
  custoDeContratar("bike", courierCount);

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

const VEHICLE_IDS_DA_FROTA: readonly VehicleId[] = [
  "bike",
  "moto",
  "van",
  "truck",
  "fleet",
  "planetary",
];

/**
 * O retrato da operacao: quanto a central aguenta, quanto ja esta em uso.
 *
 * `automatedSlots` deixou de ser "bicicletas menos a do jogador": a XB agora
 * tem moto, van, caminhao e carreta, e cada operador contratado ja saiu com
 * uma unidade reservada para ele no momento da contratacao. Entao o numero de
 * rotas que rodam sozinhas e o numero de operadores — de qualquer classe.
 */
export const operationsSummary = (
  capacity: number,
  frota: Readonly<Record<VehicleId, number>>,
  couriers: readonly HiredCourier[]
): OperationsSummary => {
  const used = operationalPointsUsed(couriers);
  return {
    capacity: Math.max(0, Math.floor(capacity)),
    used,
    available: Math.max(0, Math.floor(capacity) - used),
    bikeUnits: Math.max(1, Math.floor(frota.bike ?? 1)),
    couriers: couriers.length,
    /*
     * Quantas rotas rodam sozinhas de verdade: por classe, o menor entre as
     * unidades livres (a primeira e sempre do jogador) e os operadores
     * daquela classe. Prometer automacao que nao existe e pior que nao
     * prometer nada — a pessoa despacha, nada sai, e ela nao sabe por que.
     */
    automatedSlots: VEHICLE_IDS_DA_FROTA.reduce((total, veiculo) => {
      const livres = Math.max(0, Math.floor(frota[veiculo] ?? 0) - 1);
      const daClasse = couriers.filter(
        operador => operador.vehicleId === veiculo
      ).length;
      return total + Math.min(livres, daClasse);
    }, 0),
  };
};

/** Quantas unidades a empresa tem, somando todas as classes. */
export const totalDaFrota = (
  frota: Readonly<Record<VehicleId, number>>
): number =>
  VEHICLE_IDS_DA_FROTA.reduce(
    (total, veiculo) => total + Math.max(0, Math.floor(frota[veiculo] ?? 0)),
    0
  );



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

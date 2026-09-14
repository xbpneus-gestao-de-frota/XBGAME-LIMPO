/**
 * AS PECAS DA BICICLETA — a tabela, e so a tabela.
 *
 * Ordem dele, 12/09/2026: "ao clicar em bicicleta deve aparecer outra tela, e
 * ali ter itens para melhorar bicicleta, novos pneus, corrente, banco, freios,
 * cada item melhorado pode aumentar volume de entregas, velocidade, diminuir
 * cansasso dos entregadores".
 *
 * ── POR QUE A TABELA SAIU DE CASA ─────────────────────────────────────────
 *
 * Estes numeros ja existiam, e ja funcionavam: a garagem do jogo compra peca,
 * gasta dinheiro e a rota fica mais rapida. O que mudou foi quem mais precisa
 * ler: agora o aplicativo tambem mostra as pecas, dentro da ficha de cada
 * entregador.
 *
 * Dois leitores e um convite para duas tabelas — e duas tabelas e como um
 * pneu fica custando trinta num lugar e trinta e cinco no outro sem ninguem
 * perceber. Entao a tabela mudou de casa para um arquivo que NAO IMPORTA NADA
 * do jogo, e os dois leem daqui. A economia do jogo continua em progression,
 * que passa a reexportar isto para nao quebrar quem ja usava.
 */
/** Os cinco caminhos de melhoria da bicicleta. */
export type BikePartId = "tire" | "cargo" | "chain" | "brake" | "wheels";

/** Em que nivel esta cada peca. Zero e "de fabrica". */
export type BikePartLevels = Record<BikePartId, number>;

/**
 * O efeito somado das cinco pecas. Multiplicador neutro e 1; bonus neutro e 0.
 */
export interface BikePartEffects {
  speedMultiplier: number;
  payloadBonusKg: number;
  wearMultiplier: number;
  controlBonus: number;
  maintenanceDiscount: number;
  operatingCostMultiplier: number;
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


export type GameMode =
  | "menu"
  | "base"
  | "routes"
  | "garage"
  | "running"
  | "result"
  | "complete";

export const CAMPAIGN_SAVE_VERSION = 3 as const;

export type VehicleId =
  | "bike"
  | "moto"
  | "van"
  | "truck"
  | "fleet"
  | "planetary";

export type TireStat = "grip" | "durability" | "efficiency" | "capacity";

/*
 * OS TIPOS DAS PECAS MORAM COM A TABELA.
 *
 * Em asPecasDaBicicleta, que nao importa nada — porque o aplicativo tambem
 * precisa deles, e o aplicativo nao pode conhecer o jogo. Reexportados aqui
 * para quem ja escrevia `from "./types"`.
 */
import type { BikePartLevels } from "./asPecasDaBicicleta";
import type { NiveisDosAcessorios } from "./osAcessorios";

export type {
  BikePartEffects,
  BikePartId,
  BikePartLevels,
} from "./asPecasDaBicicleta";

export type CourierId = `courier-${number}`;
export type DeliveryOperatorId = "player" | CourierId;

export interface HiredCourier {
  id: CourierId;
  name: string;
  hiredAt: number;
  /**
   * A classe que este operador dirige. Antes todo operador era ciclista, e
   * por isso a classe nem existia; agora a XB contrata do pedal a carreta.
   * Save antigo, sem o campo, vira ciclista — que e o que ele era.
   */
  vehicleId: VehicleId;
  /** A unidade da frota que ficou com ele. Ninguem divide veiculo. */
  vehicleUnitId: string;
  operationalPoints: number;
  /**
   * Fatia do frete que vai para ele. E o repasse do freight.ts — 0,15 para
   * quem dirige veiculo da XB, 0,80 para quem traz o proprio.
   */
  wageRate: number;
  /*
   * ── DE QUEM E O VEICULO ─────────────────────────────────────────────────
   *
   * Ordem dele, 08/09/2026: o bairro passa a ter oito entregadores, alguns
   * com bicicleta e outros sem.
   *
   * Quem TRAZ o proprio veiculo e agregado: leva 80% do frete e paga do
   * bolso dele o combustivel, o pneu, a manutencao e a depreciacao. Quem
   * dirige veiculo da XB leva 15% e nao gasta nada — a empresa paga tudo.
   *
   * Este campo e o que faz `fecharConta` saber de que lado esta o custo. Sem
   * ele o jogo tinha a conta do agregado escrita e ninguem para viver.
   *
   * Save antigo, sem o campo, vira frotista — que e o que todos eram.
   */
  veiculoProprio?: boolean;
  /** De qual candidato do bairro ele veio, quando veio de um. */
  candidatoId?: string;
}

export interface OperationsSummary {
  capacity: number;
  used: number;
  available: number;
  bikeUnits: number;
  couriers: number;
  automatedSlots: number;
}

export type TireCompoundId =
  | "urban"
  | "rain"
  | "highway"
  | "cargo"
  | "offroad"
  | "planet";

export type RouteTerrain =
  | "urban"
  | "highway"
  | "industrial"
  | "offroad"
  | "orbital"
  | "planetary";

export type WeatherCondition =
  | "clear"
  | "rain"
  | "heat"
  | "dust"
  | "cold"
  | "storm";

export type TireFit = "ideal" | "adequate" | "risky";

export type DailyMissionKind =
  | "deliveries"
  | "revenue"
  | "upgrade"
  | "idealTire"
  | "expansion";

export type BuildingId =
  | "hq"
  | "garage"
  | "workshop"
  | "warehouse"
  | "dispatch"
  | "planetLab";

export type RegionScale = "city" | "state" | "country" | "world";

export interface ActiveDelivery {
  instanceId: string;
  routeId: string;
  vehicleId: VehicleId;
  startedAt: number;
  completesAt: number;
  compoundId: TireCompoundId;
  terrain: RouteTerrain;
  weather: WeatherCondition;
  tireFit: TireFit;
  expectedWear: number;
  /** Immutable commercial/operational snapshot created at dispatch time. */
  durationSeconds: number;
  grossReward: number;
  operatingCost: number;
  netReward: number;
  xpReward: number;
  reputationReward: number;
  distance: number;
  conditionAtDispatch: number;
  costBreakdown: OperatingCostBreakdown;
  operatorId: DeliveryOperatorId;
  vehicleUnitId: string;
  automated: boolean;
}

export interface OperatingCostBreakdown {
  fuelEnergy: number;
  tolls: number;
  labor: number;
  maintenanceReserve: number;
  total: number;
}

export interface RouteRunPlan {
  routeId: string;
  regionId: string;
  vehicleId: VehicleId;
  compoundId: TireCompoundId;
  terrain: RouteTerrain;
  weather: WeatherCondition;
  tireFit: TireFit;
  difficulty: number;
  duration: number;
  grossReward: number;
  operatingCost: number;
  netReward: number;
  xpReward: number;
  reputationReward: number;
  expectedWear: number;
  distance: number;
  conditionAtStart: number;
  costBreakdown: OperatingCostBreakdown;
  vehicleUnitId: string;
}

export interface ActivePilotedRun {
  plan: RouteRunPlan;
  run: RunSnapshot;
  reservedAt: number;
  updatedAt: number;
}

export interface DailyMissionState {
  id: string;
  kind: DailyMissionKind;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardCredits: number;
  rewardXp: number;
  rewardReputation: number;
  claimed: boolean;
}

export interface VehicleConfig {
  id: VehicleId;
  order: number;
  name: string;
  shortName: string;
  era: string;
  route: string;
  description: string;
  cost: number;
  reputationRequired: number;
  speed: number;
  baseReward: number;
  reputationReward: number;
  payload: number;
  wheelCount: number;
  collisionWidth: number;
  accent: string;
  sky: string;
  ground: string;
}

export interface CampaignState {
  /**
   * Como a pessoa quer ser chamada, e qual dos oito entregadores ela escolheu
   * na primeira entrada. Vazio quer dizer que ela ainda nao se apresentou — e
   * e assim que o jogo sabe que precisa mostrar a tela de boas-vindas.
   */
  playerName: string;
  playerAvatarId: string;
  credits: number;
  reputation: number;
  companyXp: number;
  deliveries: number;
  totalDistance: number;
  selectedVehicleId: VehicleId;
  unlockedVehicles: VehicleId[];
  vehicleLevels: Record<VehicleId, number>;
  tireLevels: Record<TireStat, number>;
  buildingLevels: Record<BuildingId, number>;
  unlockedRegionIds: string[];
  activeDeliveries: ActiveDelivery[];
  activePilotedRun: ActivePilotedRun | null;
  completedRouteIds: string[];
  onboardingStep: number;
  equippedCompounds: Record<VehicleId, TireCompoundId>;
  tireCondition: Record<VehicleId, number>;
  dailyMissionDay: string;
  dailyMissions: DailyMissionState[];
  bikePartLevels: BikePartLevels;
  /** Em que nivel esta cada acessorio do entregador. Ver `osAcessorios`. */
  acessorioLevels: NiveisDosAcessorios;
  /**
   * Quantas unidades a empresa tem de cada classe. E a fonte da verdade da
   * frota.
   */
  vehicleFleet: Record<VehicleId, number>;
  /**
   * Espelho de `vehicleFleet.bike`, mantido para os saves e as telas que ja
   * liam este campo. Quem escreve nele e so `sincronizarFrota`, e um teste
   * garante que ele nunca sai do lugar. Nao ler nem escrever fora dali.
   */
  bikeFleetSize: number;
  operationalPointsCapacity: number;
  hiredCouriers: HiredCourier[];
}

export interface RunSnapshot {
  elapsed: number;
  duration: number;
  progress: number;
  distance: number;
  integrity: number;
  cargo: number;
  tireTokens: number;
  score: number;
  combo: number;
  impactSerial: number;
  paused: boolean;
  /** Faixa lógica atual do modo piloto: esquerda, centro ou direita. */
  laneIndex: 0 | 1 | 2;
  routeId?: string;
  vehicleId?: VehicleId;
  vehicleUnitId?: string;
  compoundId?: TireCompoundId;
  terrain?: RouteTerrain;
  weather?: WeatherCondition;
  tireFit?: TireFit;
  grossReward?: number;
  operatingCost?: number;
  projectedNetReward?: number;
  expectedWear?: number;
  /** Persisted contract for the Turbo Borracha XB simulation. */
  turboEnergy: number;
  turboActive: boolean;
  turboSecondsRemaining: number;
  turboActivations: number;
  perfectRouteEligible: boolean;
}

export interface RunResult {
  success: boolean;
  creditsEarned: number;
  reputationEarned: number;
  distance: number;
  cargo: number;
  tireTokens: number;
  integrity: number;
  routeId?: string;
  vehicleId?: VehicleId;
  grossCreditsEarned?: number;
  /** Receita do contrato após integridade e conclusão, antes dos bônus. */
  baseCreditsEarned?: number;
  /** Parcela efetivamente paga pelos volumes e tokens coletados. */
  collectibleBonusCredits?: number;
  cargoBonusCredits?: number;
  tireTokenBonusCredits?: number;
  collectibleBonusCap?: number;
  perfectRouteBonusCredits?: number;
  operatingCost?: number;
  netCreditsEarned?: number;
  xpEarned?: number;
  tireWear?: number;
  tireFit?: TireFit;
  aborted?: boolean;
  perfectRoute?: boolean;
  turboActivations?: number;
}

export interface GameSnapshot {
  mode: GameMode;
  campaign: CampaignState;
  now: number;
  run: RunSnapshot;
  lastResult: RunResult | null;
  vehicles: readonly VehicleConfig[];
  notice: string | null;
  isDemo: boolean;
}

export type GameListener = (snapshot: GameSnapshot) => void;

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

/** The five upgrade paths in the bicycle-first MVP. */
export type BikePartId = "tire" | "cargo" | "chain" | "brake" | "wheels";

export type BikePartLevels = Record<BikePartId, number>;

/**
 * Aggregated, deterministic effects consumed by route previews and the UI.
 * Multipliers use 1 as their neutral value; bonuses use 0 as neutral.
 */
export interface BikePartEffects {
  speedMultiplier: number;
  payloadBonusKg: number;
  wearMultiplier: number;
  controlBonus: number;
  maintenanceDiscount: number;
  operatingCostMultiplier: number;
}

export type CourierId = `courier-${number}`;
export type DeliveryOperatorId = "player" | CourierId;

export interface HiredCourier {
  id: CourierId;
  name: string;
  hiredAt: number;
  bikeUnitId: string;
  operationalPoints: number;
  /** Fraction of gross revenue reserved as salary (0.18 = 18%). */
  wageRate: number;
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

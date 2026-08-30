/**
 * Quadro diário Pit Lane: três metas determinísticas e legíveis. A data local é
 * a única semente; não há dependência de rede nem recompensas aleatórias.
 */
import type {
  CampaignState,
  DailyMissionKind,
  DailyMissionState,
} from "./types";

export type EarlyGameObjectiveId =
  | "first-delivery"
  | "small-backpack"
  | "urban-tire"
  | "small-trunk"
  | "second-bike"
  | "first-courier";

export interface EarlyGameObjective {
  id: EarlyGameObjectiveId;
  title: string;
  description: string;
  completed: boolean;
  unlockLevel: number;
}

/** A UI-ready, deterministic checklist for the bicycle-company opening. */
export function earlyGameObjectives(
  state: CampaignState
): EarlyGameObjective[] {
  return [
    {
      id: "first-delivery",
      title: "Primeiro pedal",
      description: "Conclua a entrega de 5 segundos.",
      completed: state.completedRouteIds.includes("primeiro-pedal"),
      unlockLevel: 1,
    },
    {
      id: "urban-tire",
      title: "Pneu urbano",
      description: "Instale o Pneu Urbano por XB$ 30 e ganhe velocidade.",
      completed: state.bikePartLevels.tire >= 1,
      unlockLevel: 2,
    },
    {
      id: "small-backpack",
      title: "Mochila pequena",
      description: "Compre a primeira melhoria de carga por XB$ 60.",
      completed: state.bikePartLevels.cargo >= 1,
      unlockLevel: 3,
    },
    {
      id: "small-trunk",
      title: "Baú pequeno",
      description: "Amplie a capacidade para contratos de mercado.",
      completed: state.bikePartLevels.cargo >= 2,
      unlockLevel: 3,
    },
    {
      id: "second-bike",
      title: "Começo da frota",
      description: "Adicione a segunda bicicleta à garagem.",
      completed: state.bikeFleetSize >= 2,
      unlockLevel: 5,
    },
    {
      id: "first-courier",
      title: "Primeiro operador",
      description: "Contrate um entregador e automatize uma rota.",
      completed: state.hiredCouriers.length >= 1,
      unlockLevel: 10,
    },
  ];
}

interface MissionTemplate {
  kind: DailyMissionKind;
  title: string;
  description: (target: number) => string;
  target: (level: number) => number;
  rewardFactor: number;
}

const TEMPLATES: readonly MissionTemplate[] = [
  {
    kind: "deliveries",
    title: "GIRO COMPLETO",
    description: target => `Conclua ${target} entregas em qualquer escala.`,
    target: level => (level >= 10 ? 4 : level >= 4 ? 3 : 2),
    rewardFactor: 1,
  },
  {
    kind: "revenue",
    title: "CAIXA EM MOVIMENTO",
    description: target =>
      `Gere XB$ ${target.toLocaleString("pt-BR")} em contratos.`,
    target: level => Math.round((900 + level * 360) / 100) * 100,
    rewardFactor: 1.15,
  },
  {
    kind: "upgrade",
    title: "TURNO DE MELHORIA",
    description: () =>
      "Conclua uma melhoria de edifício, veículo ou tecnologia.",
    target: () => 1,
    rewardFactor: 0.95,
  },
  {
    kind: "idealTire",
    title: "ESCOLHA PERFEITA",
    description: target => `Conclua ${target} rotas com o composto ideal.`,
    target: level => (level >= 8 ? 3 : 2),
    rewardFactor: 1.2,
  },
  {
    kind: "expansion",
    title: "NOVO TERRITÓRIO",
    description: () => "Conecte uma nova cidade, estado, país ou mundo.",
    target: () => 1,
    rewardFactor: 1.35,
  },
] as const;

const hash = (value: string): number => {
  let result = 5381;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 33) ^ value.charCodeAt(index);
  }
  return Math.abs(result >>> 0);
};

export type MissionAvailability = Partial<Record<DailyMissionKind, boolean>>;

export function generateDailyMissions(
  day: string,
  companyLevel: number,
  availability: MissionAvailability = {}
): DailyMissionState[] {
  const feasible = TEMPLATES.filter(
    template => availability[template.kind] !== false
  );
  const pool =
    feasible.length >= 3
      ? feasible
      : TEMPLATES.filter(
          template =>
            template.kind === "deliveries" ||
            template.kind === "revenue" ||
            template.kind === "idealTire"
        );
  const offset = hash(day) % pool.length;
  const selected = Array.from(
    { length: 3 },
    (_, index) => pool[(offset + index) % pool.length]!
  );
  const baseCredits = 260 + companyLevel * 90;

  return selected.map((template, index) => {
    const target = template.target(companyLevel);
    return {
      id: `${day}-${template.kind}-${index}`,
      kind: template.kind,
      title: template.title,
      description: template.description(target),
      target,
      progress: 0,
      rewardCredits:
        Math.round((baseCredits * template.rewardFactor) / 10) * 10,
      rewardXp: Math.round((22 + companyLevel * 5) * template.rewardFactor),
      rewardReputation: Math.round(
        (6 + companyLevel * 1.5) * template.rewardFactor
      ),
      claimed: false,
    };
  });
}

export function progressDailyMissions(
  missions: readonly DailyMissionState[],
  kind: DailyMissionKind,
  amount: number
): DailyMissionState[] {
  if (amount <= 0) return missions.map(mission => ({ ...mission }));
  return missions.map(mission =>
    mission.kind === kind && !mission.claimed
      ? {
          ...mission,
          progress: Math.min(mission.target, mission.progress + amount),
        }
      : { ...mission }
  );
}

export function missionComplete(mission: DailyMissionState): boolean {
  return mission.progress >= mission.target;
}

export function secondsUntilNextDay(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
}

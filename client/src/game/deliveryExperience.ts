export type DeliveryStageId =
  | "en-route"
  | "approach"
  | "stopping"
  | "unloading"
  | "handoff"
  | "returning"
  | "complete";

export interface DeliveryStageDefinition {
  id: DeliveryStageId;
  start: number;
  end: number;
  label: string;
  detail: string;
}

export interface DeliveryExperience {
  stage: DeliveryStageId;
  label: string;
  detail: string;
  progress: number;
  stageProgress: number;
  activeStep: number;
  totalSteps: number;
  paused: boolean;
  cinematic: boolean;
  complete: boolean;
}

export const DELIVERY_STAGE_SEQUENCE: readonly DeliveryStageDefinition[] = [
  {
    id: "en-route",
    start: 0,
    end: 0.74,
    label: "Em rota",
    detail: "Siga pelo bairro XB e preserve a carga.",
  },
  {
    id: "approach",
    start: 0.74,
    end: 0.82,
    label: "Aproximação",
    detail: "Destino identificado. Reduza e alinhe o veículo.",
  },
  {
    id: "stopping",
    start: 0.82,
    end: 0.86,
    label: "Parada segura",
    detail: "Veículo posicionado na área de entrega.",
  },
  {
    id: "unloading",
    start: 0.86,
    end: 0.91,
    label: "Desembarque",
    detail: "Entregador retirando o volume do compartimento.",
  },
  {
    id: "handoff",
    start: 0.91,
    end: 0.96,
    label: "Entrega",
    detail: "Volume sendo entregue ao cliente XB.",
  },
  {
    id: "returning",
    start: 0.96,
    end: 1,
    label: "Retorno",
    detail: "Confirmação registrada. Entregador retornando.",
  },
  {
    id: "complete",
    start: 1,
    end: 1,
    label: "Concluída",
    detail: "Entrega confirmada e operação encerrada.",
  },
] as const;

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

export function deliveryExperience(
  progress: number,
  paused = false,
  completed = false
): DeliveryExperience {
  const normalized = completed ? 1 : clamp01(progress);
  const definition =
    normalized >= 1
      ? DELIVERY_STAGE_SEQUENCE[DELIVERY_STAGE_SEQUENCE.length - 1]
      : (DELIVERY_STAGE_SEQUENCE.find(
          stage => normalized >= stage.start && normalized < stage.end
        ) ?? DELIVERY_STAGE_SEQUENCE[0]);
  const span = Math.max(0.000_001, definition.end - definition.start);
  const stageProgress =
    definition.id === "complete"
      ? 1
      : clamp01((normalized - definition.start) / span);
  const activeStep = DELIVERY_STAGE_SEQUENCE.findIndex(
    stage => stage.id === definition.id
  );

  return {
    stage: definition.id,
    label: definition.label,
    detail: paused ? `Rota pausada · ${definition.detail}` : definition.detail,
    progress: normalized,
    stageProgress,
    activeStep,
    totalSteps: DELIVERY_STAGE_SEQUENCE.length,
    paused,
    cinematic: definition.id !== "en-route",
    complete: definition.id === "complete",
  };
}

export interface DeliveryStopPose {
  visible: boolean;
  z: number;
  customerWalk: number;
  customerReturn: number;
  parcelProgress: number;
  markerPulse: number;
  vehicleStopped: boolean;
}

export function deliveryStopPose(progress: number): DeliveryStopPose {
  const normalized = clamp01(progress);
  const visible = normalized >= 0.74 && normalized < 1;
  const approachProgress = clamp01((normalized - 0.74) / 0.1);
  const departureProgress = clamp01((normalized - 0.96) / 0.04);
  const z =
    normalized < 0.74
      ? 72
      : normalized < 0.84
        ? 72 - approachProgress * 62
        : normalized < 0.96
          ? 10
          : 10 - departureProgress * 24;
  const customerApproach = clamp01((normalized - 0.84) / 0.07);
  const customerReturn = clamp01((normalized - 0.96) / 0.04);
  const parcelProgress = clamp01((normalized - 0.86) / 0.08);

  return {
    visible,
    z,
    customerWalk: Math.max(0, customerApproach * (1 - customerReturn)),
    customerReturn,
    parcelProgress,
    markerPulse: visible
      ? 0.82 + Math.sin(normalized * Math.PI * 24) * 0.12
      : 0,
    vehicleStopped: normalized >= 0.82 && normalized < 0.98,
  };
}

export interface DeliveryCameraCue {
  cinematicBlend: number;
  positionY: number;
  positionZ: number;
  targetY: number;
  targetZ: number;
  fov: number;
}

const smoothStep01 = (value: number): number => {
  const normalized = clamp01(value);
  return normalized * normalized * (3 - 2 * normalized);
};

export function deliveryCameraCue(progress: number): DeliveryCameraCue {
  const normalized = clamp01(progress);
  const enter = smoothStep01((normalized - 0.72) / 0.18);
  const exit = 1 - smoothStep01((normalized - 0.975) / 0.025);
  const cinematicBlend = normalized >= 1 ? 0 : clamp01(enter * exit);

  return {
    cinematicBlend,
    positionY: 5.85 - cinematicBlend * 0.7,
    positionZ: -12.15 + cinematicBlend * 1.45,
    targetY: 1.3 + cinematicBlend * 0.45,
    targetZ: 9.5 - cinematicBlend * 2.7,
    fov: 0.78 - cinematicBlend * 0.08,
  };
}

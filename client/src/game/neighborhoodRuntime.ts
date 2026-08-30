import {
  neighborhoodCurvePose,
  type NeighborhoodCurvePose,
} from "./neighborhoodLayout";

export interface NeighborhoodPathState {
  readonly routeKey: string;
  readonly routePhase: number;
  readonly travelDistance: number;
  readonly progress: number;
  readonly urban: boolean;
}

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

const routePhaseFor = (routeKey: string): number => {
  let hash = 2_166_136_261;
  for (let index = 0; index < routeKey.length; index += 1) {
    hash ^= routeKey.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return ((hash >>> 0) / 4_294_967_296) * Math.PI * 2;
};

export function createNeighborhoodPathState(
  routeKey: string,
  urban: boolean
): NeighborhoodPathState {
  const safeRouteKey = routeKey.trim() || "default";
  return {
    routeKey: safeRouteKey,
    routePhase: routePhaseFor(safeRouteKey),
    travelDistance: 0,
    progress: 0,
    urban,
  };
}

export function advanceNeighborhoodPath(
  state: NeighborhoodPathState,
  distanceDelta: number,
  progress: number
): NeighborhoodPathState {
  const safeDelta = Number.isFinite(distanceDelta)
    ? Math.max(0, distanceDelta)
    : 0;
  return {
    ...state,
    travelDistance: state.travelDistance + safeDelta,
    progress: clamp01(progress),
  };
}

export function resetNeighborhoodPath(
  _state: NeighborhoodPathState,
  routeKey: string,
  urban: boolean
): NeighborhoodPathState {
  return createNeighborhoodPathState(routeKey, urban);
}

export function neighborhoodPoseAt(
  state: NeighborhoodPathState,
  relativeDistance: number
): NeighborhoodCurvePose {
  if (!state.urban) return { offsetX: 0, yaw: 0 };
  return neighborhoodCurvePose(
    state.travelDistance + relativeDistance,
    state.travelDistance,
    state.progress,
    state.routePhase
  );
}

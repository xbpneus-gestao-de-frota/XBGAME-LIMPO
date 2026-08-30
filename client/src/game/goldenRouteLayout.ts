export type GoldenRouteSide = -1 | 0 | 1;

export type GoldenRouteModuleKind =
  | "residential"
  | "bus-stop"
  | "commercial"
  | "park"
  | "destination";

export interface GoldenRouteModule {
  readonly kind: GoldenRouteModuleKind;
  readonly busStopSide: GoldenRouteSide;
  readonly parkSide: GoldenRouteSide;
  readonly houseDensity: 1 | 2;
  readonly treeCount: 2 | 3 | 4;
  readonly commercial: boolean;
  readonly garage: boolean;
  readonly destinationEmphasis: 0 | 1 | 2;
}

export interface GoldenRoutePose {
  readonly offsetX: number;
  readonly yaw: number;
}

export const GOLDEN_ROUTE_VIRTUAL_LENGTH = 260;
const RIGHT_CURVE_OFFSET = 4.5;
const LEFT_CURVE_OFFSET = -3;
const MAX_YAW = 0.12;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? clamp(value, 0, 1) : 0;

export function goldenRouteCameraScale(aspectRatio: number): number {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return 1;
  if (aspectRatio <= 0.62) return 0.2;
  if (aspectRatio >= 1.15) return 1;
  const progress = (aspectRatio - 0.62) / (1.15 - 0.62);
  return 0.2 + progress * 0.8;
}

const smoothstep = (value: number): number => {
  const normalized = clamp01(value);
  return normalized * normalized * (3 - 2 * normalized);
};

const blend = (from: number, to: number, progress: number): number =>
  from + (to - from) * smoothstep(progress);

export function goldenRouteCenterline(progress: number): number {
  const normalized = clamp01(progress);
  if (normalized <= 0.14) return 0;
  if (normalized <= 0.34) {
    return blend(0, RIGHT_CURVE_OFFSET, (normalized - 0.14) / 0.2);
  }
  if (normalized <= 0.48) return RIGHT_CURVE_OFFSET;
  if (normalized <= 0.7) {
    return blend(
      RIGHT_CURVE_OFFSET,
      LEFT_CURVE_OFFSET,
      (normalized - 0.48) / 0.22
    );
  }
  if (normalized <= 0.86) {
    return blend(LEFT_CURVE_OFFSET, 0, (normalized - 0.7) / 0.16);
  }
  return 0;
}

function centerlineDerivative(progress: number): number {
  const sampleDistance = 0.5;
  const sampleProgress = sampleDistance / GOLDEN_ROUTE_VIRTUAL_LENGTH;
  const before = goldenRouteCenterline(progress - sampleProgress);
  const after = goldenRouteCenterline(progress + sampleProgress);
  return (after - before) / (sampleDistance * 2);
}

export function goldenRoutePose(
  progress: number,
  relativeDistance: number
): GoldenRoutePose {
  if (!Number.isFinite(progress) || !Number.isFinite(relativeDistance)) {
    return { offsetX: 0, yaw: 0 };
  }
  const currentProgress = clamp01(progress);
  const pathProgress = clamp01(
    currentProgress + relativeDistance / GOLDEN_ROUTE_VIRTUAL_LENGTH
  );
  const offsetX =
    goldenRouteCenterline(pathProgress) -
    goldenRouteCenterline(currentProgress);
  const yaw = clamp(
    Math.atan(centerlineDerivative(pathProgress)),
    -MAX_YAW,
    MAX_YAW
  );
  return {
    offsetX: Math.abs(offsetX) < 1e-12 ? 0 : offsetX,
    yaw: Math.abs(yaw) < 1e-12 ? 0 : yaw,
  };
}

export const GOLDEN_ROUTE_MODULE_SEQUENCE: readonly GoldenRouteModule[] =
  Object.freeze([
    Object.freeze({
      kind: "residential",
      busStopSide: 0,
      parkSide: 0,
      houseDensity: 2,
      treeCount: 2,
      commercial: false,
      garage: true,
      destinationEmphasis: 0,
    }),
    Object.freeze({
      kind: "residential",
      busStopSide: 0,
      parkSide: 0,
      houseDensity: 2,
      treeCount: 4,
      commercial: false,
      garage: false,
      destinationEmphasis: 0,
    }),
    Object.freeze({
      kind: "bus-stop",
      busStopSide: -1,
      parkSide: 0,
      houseDensity: 1,
      treeCount: 3,
      commercial: false,
      garage: false,
      destinationEmphasis: 0,
    }),
    Object.freeze({
      kind: "commercial",
      busStopSide: 0,
      parkSide: 0,
      houseDensity: 2,
      treeCount: 2,
      commercial: true,
      garage: false,
      destinationEmphasis: 0,
    }),
    Object.freeze({
      kind: "residential",
      busStopSide: 0,
      parkSide: 0,
      houseDensity: 2,
      treeCount: 2,
      commercial: false,
      garage: false,
      destinationEmphasis: 0,
    }),
    Object.freeze({
      kind: "park",
      busStopSide: 0,
      parkSide: 1,
      houseDensity: 1,
      treeCount: 4,
      commercial: false,
      garage: false,
      destinationEmphasis: 0,
    }),
    Object.freeze({
      kind: "residential",
      busStopSide: 0,
      parkSide: 0,
      houseDensity: 2,
      treeCount: 3,
      commercial: false,
      garage: true,
      destinationEmphasis: 0,
    }),
    Object.freeze({
      kind: "commercial",
      busStopSide: 1,
      parkSide: 0,
      houseDensity: 1,
      treeCount: 2,
      commercial: true,
      garage: false,
      destinationEmphasis: 1,
    }),
    Object.freeze({
      kind: "destination",
      busStopSide: 0,
      parkSide: -1,
      houseDensity: 1,
      treeCount: 3,
      commercial: false,
      garage: true,
      destinationEmphasis: 2,
    }),
  ]);

export function goldenRouteModuleFor(segmentIndex: number): GoldenRouteModule {
  const safeIndex = Number.isFinite(segmentIndex)
    ? Math.max(0, Math.trunc(segmentIndex))
    : 0;
  return GOLDEN_ROUTE_MODULE_SEQUENCE[
    safeIndex % GOLDEN_ROUTE_MODULE_SEQUENCE.length
  ];
}

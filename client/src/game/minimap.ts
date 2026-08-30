export interface MinimapPoint {
  x: number;
  y: number;
}

export interface MinimapStreet {
  id: string;
  points: readonly MinimapPoint[];
  kind: "primary" | "secondary";
}

export interface MinimapSnapshot {
  progress: number;
  point: MinimapPoint;
  nextCheckpoint: MinimapPoint;
  segmentIndex: number;
  headingDegrees: number;
  completed: boolean;
  routePath: string;
}

export const XB_CITY_ROUTE: readonly MinimapPoint[] = [
  { x: 14, y: 88 },
  { x: 14, y: 72 },
  { x: 32, y: 72 },
  { x: 32, y: 55 },
  { x: 51, y: 55 },
  { x: 51, y: 37 },
  { x: 70, y: 37 },
  { x: 70, y: 20 },
  { x: 86, y: 20 },
  { x: 86, y: 13 },
] as const;

export const XB_CITY_STREETS: readonly MinimapStreet[] = [
  {
    id: "avenida-base",
    kind: "primary",
    points: [
      { x: 8, y: 88 },
      { x: 92, y: 88 },
    ],
  },
  {
    id: "avenida-norte",
    kind: "primary",
    points: [
      { x: 8, y: 20 },
      { x: 92, y: 20 },
    ],
  },
  {
    id: "eixo-oeste",
    kind: "primary",
    points: [
      { x: 14, y: 8 },
      { x: 14, y: 94 },
    ],
  },
  {
    id: "eixo-central",
    kind: "secondary",
    points: [
      { x: 32, y: 8 },
      { x: 32, y: 94 },
    ],
  },
  {
    id: "eixo-logistico",
    kind: "primary",
    points: [
      { x: 51, y: 8 },
      { x: 51, y: 94 },
    ],
  },
  {
    id: "eixo-leste",
    kind: "secondary",
    points: [
      { x: 70, y: 8 },
      { x: 70, y: 94 },
    ],
  },
  {
    id: "rua-bairro-1",
    kind: "secondary",
    points: [
      { x: 8, y: 72 },
      { x: 92, y: 72 },
    ],
  },
  {
    id: "rua-bairro-2",
    kind: "secondary",
    points: [
      { x: 8, y: 55 },
      { x: 92, y: 55 },
    ],
  },
  {
    id: "rua-bairro-3",
    kind: "secondary",
    points: [
      { x: 8, y: 37 },
      { x: 92, y: 37 },
    ],
  },
] as const;

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

const distance = (from: MinimapPoint, to: MinimapPoint): number =>
  Math.hypot(to.x - from.x, to.y - from.y);

const segmentLengths = XB_CITY_ROUTE.slice(0, -1).map((point, index) =>
  distance(point, XB_CITY_ROUTE[index + 1])
);
const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);

export const minimapRoutePath = (
  points: readonly MinimapPoint[] = XB_CITY_ROUTE
): string =>
  points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

export function minimapRouteSnapshot(progress: number): MinimapSnapshot {
  const normalized = clamp01(progress);
  const targetDistance = normalized * totalLength;
  let traversed = 0;
  let segmentIndex = segmentLengths.length - 1;

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentEnd = traversed + segmentLengths[index];
    if (targetDistance <= segmentEnd || index === segmentLengths.length - 1) {
      segmentIndex = index;
      break;
    }
    traversed = segmentEnd;
  }

  const from = XB_CITY_ROUTE[segmentIndex];
  const to = XB_CITY_ROUTE[segmentIndex + 1];
  const segmentLength = Math.max(0.000_001, segmentLengths[segmentIndex]);
  const localProgress = clamp01((targetDistance - traversed) / segmentLength);
  const point = {
    x: Number((from.x + (to.x - from.x) * localProgress).toFixed(3)),
    y: Number((from.y + (to.y - from.y) * localProgress).toFixed(3)),
  };

  if (normalized === 0) Object.assign(point, XB_CITY_ROUTE[0]);
  if (normalized === 1) Object.assign(point, XB_CITY_ROUTE.at(-1));

  return {
    progress: normalized,
    point,
    nextCheckpoint: { ...to },
    segmentIndex,
    headingDegrees: (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI,
    completed: normalized >= 1,
    routePath: minimapRoutePath(),
  };
}

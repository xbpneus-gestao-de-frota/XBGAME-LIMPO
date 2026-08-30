export type UrbanSide = -1 | 1;
export type UrbanLotKind = "residence" | "corner-shop" | "service" | "park";

export interface UrbanLot {
  segmentIndex: number;
  side: UrbanSide;
  variant: number;
  kind: UrbanLotKind;
  position: { x: number; y: number; z: number };
  rotationY: number;
  wallWidth: number;
  wallHeight: number;
  wallDepth: number;
  roofHeight: number;
  treeOffsetX: number;
  treeOffsetZ: number;
  facadeColor: string;
  secondaryColor: string;
  accentColor: string;
}

export const XB_URBAN_PALETTE = {
  navy: "#0D1B33",
  deepBlue: "#12547A",
  electricCyan: "#18BFEA",
  ice: "#EDF5F6",
  white: "#F7FBFF",
  steel: "#93A2A8",
  slate: "#40566C",
  foliage: "#2E6B45",
  grass: "#3E7B46",
} as const;

const facades = [
  XB_URBAN_PALETTE.ice,
  XB_URBAN_PALETTE.white,
  XB_URBAN_PALETTE.steel,
  XB_URBAN_PALETTE.slate,
] as const;
const kinds: readonly UrbanLotKind[] = [
  "residence",
  "residence",
  "corner-shop",
  "service",
  "park",
] as const;

const positiveModulo = (value: number, divisor: number): number =>
  ((value % divisor) + divisor) % divisor;

export function isYellowLikeHex(color: string): boolean {
  const normalized = color.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return false;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return red > 150 && green > 125 && blue < 115 && Math.abs(red - green) < 105;
}

export function urbanLotFor(segmentIndex: number, side: UrbanSide): UrbanLot {
  const safeSegment = Number.isFinite(segmentIndex)
    ? Math.max(0, Math.trunc(segmentIndex))
    : 0;
  const normalizedSide: UrbanSide = side < 0 ? -1 : 1;
  const sideIndex = normalizedSide < 0 ? 0 : 1;
  const variant = positiveModulo(safeSegment * 3 + sideIndex * 2, 5);
  const zSeed = positiveModulo(safeSegment * 7 + sideIndex * 11, 17);
  const kind = kinds[variant];
  const wallHeight = 2.72 + (variant % 3) * 0.28;
  const wallWidth = 4.72 + (variant % 2) * 0.5;
  const wallDepth = 3.72 + ((variant + 1) % 3) * 0.28;

  return {
    segmentIndex: safeSegment,
    side: normalizedSide,
    variant,
    kind,
    position: {
      x: normalizedSide * (14.2 + variant * 0.48),
      y: 0.02,
      z: -8.5 + zSeed,
    },
    rotationY: normalizedSide * (Math.PI / 2 - 0.035 - variant * 0.012),
    wallWidth,
    wallHeight,
    wallDepth,
    roofHeight: 1.08 + variant * 0.055,
    treeOffsetX: variant % 2 === 0 ? 3.55 : -3.55,
    treeOffsetZ: 0.42 - (variant % 3) * 0.25,
    facadeColor: facades[variant % facades.length],
    secondaryColor:
      variant % 2 === 0 ? XB_URBAN_PALETTE.deepBlue : XB_URBAN_PALETTE.slate,
    accentColor: XB_URBAN_PALETTE.electricCyan,
  };
}

export interface UrbanRoadDecor {
  segmentIndex: number;
  crosswalk: boolean;
  sideStreetSide: -1 | 0 | 1;
  streetLightOffsets: readonly [-6, 6];
  parkedVehicleSide: UrbanSide;
}

export function urbanRoadDecorFor(segmentIndex: number): UrbanRoadDecor {
  const safeSegment = Number.isFinite(segmentIndex)
    ? Math.max(0, Math.trunc(segmentIndex))
    : 0;
  const crosswalk = safeSegment % 3 === 1;
  const sideStreetSide: -1 | 0 | 1 =
    safeSegment % 4 === 2
      ? -1
      : safeSegment % 4 === 0 && safeSegment > 0
        ? 1
        : 0;
  return {
    segmentIndex: safeSegment,
    crosswalk,
    sideStreetSide,
    streetLightOffsets: [-6, 6],
    parkedVehicleSide: safeSegment % 2 === 0 ? -1 : 1,
  };
}

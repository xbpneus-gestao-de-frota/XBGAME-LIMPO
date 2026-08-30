import {
  GOLDEN_ROUTE_MODULE_SEQUENCE,
  goldenRouteModuleFor,
  goldenRoutePose,
  type GoldenRouteModule,
  type GoldenRouteModuleKind,
  type GoldenRoutePose,
  type GoldenRouteSide,
} from "./goldenRouteLayout";

export type NeighborhoodSide = GoldenRouteSide;
export type NeighborhoodModuleKind = GoldenRouteModuleKind;
export type NeighborhoodModule = GoldenRouteModule;
export type NeighborhoodCurvePose = GoldenRoutePose;

export const NEIGHBORHOOD_MODULE_SEQUENCE = GOLDEN_ROUTE_MODULE_SEQUENCE;

export function neighborhoodCurveIntensity(progress: number): number {
  return Number.isFinite(progress) && progress >= 0 && progress <= 1 ? 1 : 0;
}

export function neighborhoodCurvePose(
  pathDistance: number,
  travelDistance: number,
  progress: number,
  _phase = 0
): NeighborhoodCurvePose {
  const relativeDistance =
    Number.isFinite(pathDistance) && Number.isFinite(travelDistance)
      ? pathDistance - travelDistance
      : 0;
  return goldenRoutePose(progress, relativeDistance);
}

export function neighborhoodModuleFor(
  segmentIndex: number
): NeighborhoodModule {
  return goldenRouteModuleFor(segmentIndex);
}

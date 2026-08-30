import type { RouteConfig } from "./progression";

/**
 * Keeps the Central actionable when the next new contract requires an upgrade:
 * prefer a ready new route, otherwise offer the newest repeatable route.
 */
export function selectQuickRoute(
  candidates: readonly RouteConfig[],
  completedRouteIds: readonly string[],
  isReady: (route: RouteConfig) => boolean,
  fallback: RouteConfig
): RouteConfig {
  const completed = new Set(completedRouteIds);
  const ready = candidates.filter(isReady);
  return (
    ready.find(route => !completed.has(route.id)) ??
    [...ready]
      .reverse()
      .find(route => !route.firstDelivery && completed.has(route.id)) ??
    candidates.find(route => !completed.has(route.id)) ??
    candidates[candidates.length - 1] ??
    fallback
  );
}

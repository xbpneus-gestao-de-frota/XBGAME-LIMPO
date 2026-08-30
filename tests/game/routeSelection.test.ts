import { describe, expect, it } from "vitest";
import { ROUTES } from "../../client/src/game/progression";
import { selectQuickRoute } from "../../client/src/game/routeSelection";

const first = ROUTES.find(route => route.id === "primeiro-pedal")!;
const repeatable = ROUTES.find(route => route.id === "bairro-expresso")!;
const upgraded = ROUTES.find(route => route.id === "mercado-pequeno")!;

describe("Central quick-route selection", () => {
  it("offers a repeatable route while the next upgrade-gated route is blocked", () => {
    const selected = selectQuickRoute(
      [first, repeatable, upgraded],
      [first.id, repeatable.id],
      route => route.id === repeatable.id,
      first
    );
    expect(selected.id).toBe(repeatable.id);
  });

  it("advances immediately when the next new route becomes ready", () => {
    const selected = selectQuickRoute(
      [first, repeatable, upgraded],
      [first.id, repeatable.id],
      route => route.id === repeatable.id || route.id === upgraded.id,
      first
    );
    expect(selected.id).toBe(upgraded.id);
  });
});

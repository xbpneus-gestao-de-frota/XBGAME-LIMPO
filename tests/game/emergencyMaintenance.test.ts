import { describe, expect, it } from "vitest";
import { CampaignStore } from "../../client/src/game/GameState";
import type { CampaignState } from "../../client/src/game/types";

describe("emergency bicycle maintenance", () => {
  it("keeps a subsidised repeatable contract available at zero credits", () => {
    const store = new CampaignStore(false, true);
    const mutable = store as unknown as { state: CampaignState };
    mutable.state.credits = 0;
    mutable.state.completedRouteIds = ["primeiro-pedal"];

    const preview = store.previewRoute("bairro-expresso");
    expect(preview.ok).toBe(true);
    expect(preview.plan?.operatingCost).toBe(0);
    expect(preview.plan?.netReward).toBeGreaterThan(0);
  });

  it("prevents a zero-credit critical-condition softlock", () => {
    const store = new CampaignStore(false, true);
    const mutable = store as unknown as { state: CampaignState };
    mutable.state.credits = 0;
    mutable.state.tireCondition.bike = 8;

    const repaired = store.maintainBike();
    expect(repaired.ok).toBe(true);
    expect(repaired.message).toContain("emergencial");
    expect(store.value.credits).toBe(0);
    expect(store.value.tireCondition.bike).toBe(40);
    expect(store.previewRoute("primeiro-pedal").ok).toBe(true);
  });
});

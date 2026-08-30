import { describe, expect, it } from "vitest";
import {
  QUALITY_OPTIONS,
  QUALITY_STORAGE_KEY,
  babylonHardwareScalingLevel,
  loadQualitySettings,
  loadQualityPreference,
  recommendQualityPreset,
  resolveQualitySettings,
  saveQualityPreference,
} from "../../client/src/game/quality";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("quality settings", () => {
  it("starts in Automatic mode and ignores invalid stored values", () => {
    const storage = new MemoryStorage();
    expect(loadQualityPreference(storage)).toBe("auto");
    storage.setItem(QUALITY_STORAGE_KEY, "ultra");
    expect(loadQualityPreference(storage)).toBe("auto");
  });

  it("exposes the four Portuguese UI labels in product order", () => {
    expect(QUALITY_OPTIONS.map(option => option.label)).toEqual([
      "Automático",
      "Desempenho",
      "Equilibrado",
      "Qualidade",
    ]);
  });

  it("persists every supported preference", () => {
    const storage = new MemoryStorage();
    expect(saveQualityPreference("performance", storage)).toBe(true);
    expect(loadQualityPreference(storage)).toBe("performance");
    expect(saveQualityPreference("balanced", storage)).toBe(true);
    expect(loadQualityPreference(storage)).toBe("balanced");
    expect(saveQualityPreference("quality", storage)).toBe(true);
    expect(loadQualityPreference(storage)).toBe("quality");
  });

  it("recommends Performance for constrained hardware or data saver", () => {
    expect(
      recommendQualityPreset({
        hardwareConcurrency: 2,
        deviceMemoryGb: 2,
        isMobile: true,
      })
    ).toBe("performance");
    expect(recommendQualityPreset({ saveData: true })).toBe("performance");
    expect(recommendQualityPreset({ effectiveConnectionType: "3g" })).toBe(
      "performance"
    );
  });

  it("recommends Balanced for ordinary mobile hardware", () => {
    expect(
      recommendQualityPreset({
        hardwareConcurrency: 6,
        deviceMemoryGb: 6,
        pixelRatio: 3,
        isMobile: true,
      })
    ).toBe("balanced");
  });

  it("recommends Quality only for capable desktop hardware", () => {
    expect(
      recommendQualityPreset({
        hardwareConcurrency: 12,
        deviceMemoryGb: 16,
        pixelRatio: 2,
        isMobile: false,
      })
    ).toBe("quality");
    expect(recommendQualityPreset({})).toBe("balanced");
  });

  it("keeps a manual choice above the automatic recommendation", () => {
    const settings = resolveQualitySettings("quality", {
      hardwareConcurrency: 2,
      deviceMemoryGb: 2,
      isMobile: true,
      prefersReducedMotion: true,
    });
    expect(settings.preference).toBe("quality");
    expect(settings.preset).toBe("quality");
    expect(settings.antialias).toBe(true);
    expect(settings.targetFps).toBe(60);
    expect(settings.reducedMotion).toBe(true);
  });

  it("resolves Automatic into a concrete immutable-friendly profile", () => {
    const settings = resolveQualitySettings("auto", {
      hardwareConcurrency: 4,
      deviceMemoryGb: 4,
      isMobile: true,
    });
    expect(settings.preference).toBe("auto");
    expect(settings.preset).toBe("balanced");
    expect(settings.renderScale).toBeLessThanOrEqual(1);
    expect(settings.targetFps).toBe(45);
  });

  it("loads and translates a persisted profile for Babylon", () => {
    const storage = new MemoryStorage();
    saveQualityPreference("performance", storage);
    const settings = loadQualitySettings(storage, {
      pixelRatio: 3,
      isMobile: true,
    });
    expect(settings.preset).toBe("performance");
    expect(babylonHardwareScalingLevel(settings, 3)).toBeCloseTo(1 / 0.78);
  });

  it("fails safely when storage access is unavailable", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    expect(loadQualityPreference(storage)).toBe("auto");
    expect(saveQualityPreference("quality", storage)).toBe(false);
  });
});

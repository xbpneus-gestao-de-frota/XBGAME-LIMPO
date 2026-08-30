export const QUALITY_STORAGE_KEY = "xbpneus-racing:quality-preference";

export type QualityPreference = "auto" | "performance" | "balanced" | "quality";

export type ResolvedQualityPreset = Exclude<QualityPreference, "auto">;

export interface QualityOption {
  value: QualityPreference;
  label: string;
  description: string;
}

export const QUALITY_OPTIONS: readonly Readonly<QualityOption>[] = [
  {
    value: "auto",
    label: "Automático",
    description: "Ajusta o visual ao aparelho.",
  },
  {
    value: "performance",
    label: "Desempenho",
    description: "Prioriza fluidez e bateria.",
  },
  {
    value: "balanced",
    label: "Equilibrado",
    description: "Combina boa imagem e fluidez.",
  },
  {
    value: "quality",
    label: "Qualidade",
    description: "Prioriza resolução, suavização e 60 FPS.",
  },
];

export interface DeviceQualitySignals {
  hardwareConcurrency?: number;
  deviceMemoryGb?: number;
  pixelRatio?: number;
  viewportWidth?: number;
  isMobile?: boolean;
  saveData?: boolean;
  effectiveConnectionType?: string;
  prefersReducedMotion?: boolean;
}

export interface QualitySettings {
  preference: QualityPreference;
  preset: ResolvedQualityPreset;
  maxDevicePixelRatio: number;
  renderScale: number;
  antialias: boolean;
  targetFps: 30 | 45 | 60;
  reducedMotion: boolean;
}

export type QualityProfile = Omit<
  QualitySettings,
  "preference" | "preset" | "reducedMotion"
>;

export const QUALITY_PROFILES: Readonly<
  Record<ResolvedQualityPreset, Readonly<QualityProfile>>
> = {
  performance: {
    maxDevicePixelRatio: 1,
    renderScale: 0.78,
    antialias: false,
    targetFps: 30,
  },
  balanced: {
    maxDevicePixelRatio: 1.5,
    renderScale: 0.92,
    antialias: true,
    targetFps: 45,
  },
  quality: {
    maxDevicePixelRatio: 2,
    renderScale: 1,
    antialias: true,
    targetFps: 60,
  },
};

interface NavigatorWithQualityHints extends Navigator {
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
  userAgentData?: {
    mobile?: boolean;
  };
}

const QUALITY_PREFERENCES = new Set<QualityPreference>([
  "auto",
  "performance",
  "balanced",
  "quality",
]);

export const isQualityPreference = (
  value: unknown
): value is QualityPreference =>
  typeof value === "string" &&
  QUALITY_PREFERENCES.has(value as QualityPreference);

const safeMatchMedia = (query: string): boolean => {
  try {
    return globalThis.matchMedia?.(query).matches ?? false;
  } catch {
    return false;
  }
};

export const detectDeviceQualitySignals = (): DeviceQualitySignals => {
  const navigatorValue = globalThis.navigator as
    | NavigatorWithQualityHints
    | undefined;
  const viewportWidth = globalThis.innerWidth;
  const mobileFromHints = navigatorValue?.userAgentData?.mobile;
  const mobileFromMedia = safeMatchMedia("(pointer: coarse)");

  return {
    hardwareConcurrency: navigatorValue?.hardwareConcurrency,
    deviceMemoryGb: navigatorValue?.deviceMemory,
    pixelRatio: globalThis.devicePixelRatio,
    viewportWidth:
      typeof viewportWidth === "number" ? viewportWidth : undefined,
    isMobile:
      mobileFromHints ??
      (mobileFromMedia ||
        (typeof viewportWidth === "number" && viewportWidth <= 768)),
    saveData: navigatorValue?.connection?.saveData,
    effectiveConnectionType: navigatorValue?.connection?.effectiveType,
    prefersReducedMotion: safeMatchMedia("(prefers-reduced-motion: reduce)"),
  };
};

const isSlowConnection = (effectiveType?: string): boolean =>
  effectiveType === "slow-2g" ||
  effectiveType === "2g" ||
  effectiveType === "3g";

/**
 * Conservative initial recommendation. A manual preference always wins when
 * `resolveQualitySettings` is called.
 */
export const recommendQualityPreset = (
  signals: DeviceQualitySignals
): ResolvedQualityPreset => {
  if (
    signals.saveData === true ||
    isSlowConnection(signals.effectiveConnectionType) ||
    (signals.deviceMemoryGb !== undefined && signals.deviceMemoryGb <= 2) ||
    (signals.hardwareConcurrency !== undefined &&
      signals.hardwareConcurrency <= 2)
  ) {
    return "performance";
  }

  if (
    signals.isMobile === true ||
    (signals.deviceMemoryGb !== undefined && signals.deviceMemoryGb <= 4) ||
    (signals.hardwareConcurrency !== undefined &&
      signals.hardwareConcurrency <= 4) ||
    (signals.pixelRatio !== undefined && signals.pixelRatio > 2.25)
  ) {
    return "balanced";
  }

  const hasCapabilitySignal =
    signals.deviceMemoryGb !== undefined ||
    signals.hardwareConcurrency !== undefined;
  if (
    hasCapabilitySignal &&
    (signals.deviceMemoryGb === undefined || signals.deviceMemoryGb >= 8) &&
    (signals.hardwareConcurrency === undefined ||
      signals.hardwareConcurrency >= 8)
  ) {
    return "quality";
  }

  return "balanced";
};

export const resolveQualitySettings = (
  preference: QualityPreference,
  signals: DeviceQualitySignals = detectDeviceQualitySignals()
): QualitySettings => {
  const preset =
    preference === "auto" ? recommendQualityPreset(signals) : preference;
  const profile = QUALITY_PROFILES[preset];

  return {
    preference,
    preset,
    ...profile,
    reducedMotion: signals.prefersReducedMotion === true,
  };
};

const browserStorage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export const loadQualityPreference = (
  storage: Storage | null = browserStorage()
): QualityPreference => {
  if (!storage) return "auto";

  try {
    const stored = storage.getItem(QUALITY_STORAGE_KEY);
    return isQualityPreference(stored) ? stored : "auto";
  } catch {
    return "auto";
  }
};

export const saveQualityPreference = (
  preference: QualityPreference,
  storage: Storage | null = browserStorage()
): boolean => {
  if (!storage) return false;

  try {
    storage.setItem(QUALITY_STORAGE_KEY, preference);
    return true;
  } catch {
    return false;
  }
};

export const loadQualitySettings = (
  storage: Storage | null = browserStorage(),
  signals: DeviceQualitySignals = detectDeviceQualitySignals()
): QualitySettings =>
  resolveQualitySettings(loadQualityPreference(storage), signals);

/** Value expected by Babylon's `engine.setHardwareScalingLevel`. */
export const babylonHardwareScalingLevel = (
  settings: QualitySettings,
  devicePixelRatio = globalThis.devicePixelRatio || 1
): number => {
  const effectivePixelRatio =
    Math.min(Math.max(1, devicePixelRatio), settings.maxDevicePixelRatio) *
    settings.renderScale;
  return 1 / Math.max(0.5, effectivePixelRatio);
};

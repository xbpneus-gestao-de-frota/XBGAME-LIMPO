export const FEEDBACK_STORAGE_KEY = "xbpneus-racing:feedback-preferences";

export interface FeedbackPreferences {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

/**
 * O som sai ligado: o jogo abre com a trilha tocando, como jogo faz. Quem nao
 * quiser desliga em AJUSTES, e a escolha fica guardada no aparelho.
 *
 * A vibracao continua desligada de fabrica — ela nao enfeita nada, so mexe no
 * corpo de quem esta jogando, e isso e para a pessoa pedir.
 */
export const DEFAULT_FEEDBACK_PREFERENCES: Readonly<FeedbackPreferences> = {
  soundEnabled: true,
  vibrationEnabled: false,
};

export type FeedbackCue =
  | "button"
  | "pickup"
  | "boost"
  | "collision"
  | "success"
  | "error";

export type FeedbackKind = "sound" | "vibration";

export interface FeedbackContext {
  paused: boolean;
  hidden: boolean;
  reducedMotion: boolean;
  soundAllowed: boolean;
  vibrationAllowed: boolean;
}

export interface FeedbackCueSpec {
  wave: OscillatorType;
  frequency: number;
  endFrequency: number;
  durationMs: number;
  gain: number;
  vibration: number | readonly number[];
}

export interface FeedbackAudioParam {
  setValueAtTime(value: number, startTime: number): unknown;
  exponentialRampToValueAtTime(value: number, endTime: number): unknown;
}

export interface FeedbackAudioNode {
  connect(destination: unknown): unknown;
  disconnect?(): void;
}

export interface FeedbackOscillatorNode extends FeedbackAudioNode {
  type: OscillatorType;
  frequency: FeedbackAudioParam;
  onended: (() => void) | null;
  start(when?: number): void;
  stop(when?: number): void;
}

export interface FeedbackGainNode extends FeedbackAudioNode {
  gain: FeedbackAudioParam;
}

export interface FeedbackAudioContext {
  readonly currentTime: number;
  readonly destination: unknown;
  readonly state: "closed" | "running" | "suspended";
  createOscillator(): FeedbackOscillatorNode;
  createGain(): FeedbackGainNode;
  resume(): Promise<void>;
  close?(): Promise<void>;
}

export interface FeedbackTriggerResult {
  soundPlayed: boolean;
  vibrationPlayed: boolean;
}

export interface GameFeedbackOptions {
  storage?: Storage | null;
  initialPreferences?: Partial<FeedbackPreferences>;
  audioContextFactory?: (() => FeedbackAudioContext) | null;
  vibrate?: ((pattern: number | readonly number[]) => boolean) | null;
  contextProvider?: () => Partial<FeedbackContext>;
}

interface StoredFeedbackPreferences {
  version: 1;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export const FEEDBACK_CUE_SPECS: Readonly<
  Record<FeedbackCue, Readonly<FeedbackCueSpec>>
> = {
  button: {
    wave: "sine",
    frequency: 460,
    endFrequency: 620,
    durationMs: 55,
    gain: 0.035,
    vibration: 8,
  },
  pickup: {
    wave: "triangle",
    frequency: 520,
    endFrequency: 880,
    durationMs: 95,
    gain: 0.055,
    vibration: 12,
  },
  boost: {
    wave: "sawtooth",
    frequency: 120,
    endFrequency: 360,
    durationMs: 180,
    gain: 0.045,
    vibration: [18, 16, 32],
  },
  collision: {
    wave: "square",
    frequency: 110,
    endFrequency: 55,
    durationMs: 130,
    gain: 0.045,
    vibration: [35, 18, 55],
  },
  success: {
    wave: "triangle",
    frequency: 440,
    endFrequency: 990,
    durationMs: 260,
    gain: 0.06,
    vibration: [20, 35, 20],
  },
  error: {
    wave: "square",
    frequency: 180,
    endFrequency: 120,
    durationMs: 170,
    gain: 0.04,
    vibration: [45, 30, 45],
  },
};

const browserStorage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

const parseStoredPreferences = (value: string | null): FeedbackPreferences => {
  if (!value) return { ...DEFAULT_FEEDBACK_PREFERENCES };

  try {
    const parsed = JSON.parse(value) as Partial<StoredFeedbackPreferences>;
    if (
      parsed.version !== 1 ||
      typeof parsed.soundEnabled !== "boolean" ||
      typeof parsed.vibrationEnabled !== "boolean"
    ) {
      return { ...DEFAULT_FEEDBACK_PREFERENCES };
    }

    return {
      soundEnabled: parsed.soundEnabled,
      vibrationEnabled: parsed.vibrationEnabled,
    };
  } catch {
    return { ...DEFAULT_FEEDBACK_PREFERENCES };
  }
};

export const loadFeedbackPreferences = (
  storage: Storage | null = browserStorage()
): FeedbackPreferences => {
  if (!storage) return { ...DEFAULT_FEEDBACK_PREFERENCES };

  try {
    return parseStoredPreferences(storage.getItem(FEEDBACK_STORAGE_KEY));
  } catch {
    return { ...DEFAULT_FEEDBACK_PREFERENCES };
  }
};

export const saveFeedbackPreferences = (
  preferences: FeedbackPreferences,
  storage: Storage | null = browserStorage()
): boolean => {
  if (!storage) return false;

  const stored: StoredFeedbackPreferences = {
    version: 1,
    soundEnabled: preferences.soundEnabled,
    vibrationEnabled: preferences.vibrationEnabled,
  };

  try {
    storage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
};

const prefersReducedMotion = (): boolean => {
  try {
    return (
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
      false
    );
  } catch {
    return false;
  }
};

export const resolveFeedbackContext = (
  overrides: Partial<FeedbackContext> = {}
): FeedbackContext => ({
  paused: overrides.paused ?? false,
  hidden: overrides.hidden ?? globalThis.document?.hidden ?? false,
  reducedMotion: overrides.reducedMotion ?? prefersReducedMotion(),
  soundAllowed: overrides.soundAllowed ?? true,
  vibrationAllowed: overrides.vibrationAllowed ?? true,
});

export const isFeedbackAllowed = (
  kind: FeedbackKind,
  preferences: FeedbackPreferences,
  context: FeedbackContext
): boolean => {
  if (context.paused || context.hidden) return false;
  if (kind === "sound") {
    return preferences.soundEnabled && context.soundAllowed;
  }
  return (
    preferences.vibrationEnabled &&
    context.vibrationAllowed &&
    !context.reducedMotion
  );
};

const defaultAudioContextFactory = (): FeedbackAudioContext => {
  const scope = globalThis as typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextClass = scope.AudioContext ?? scope.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Web Audio is not available");
  return new AudioContextClass() as unknown as FeedbackAudioContext;
};

const defaultVibrate = (pattern: number | readonly number[]): boolean => {
  if (typeof globalThis.navigator?.vibrate !== "function") return false;
  return globalThis.navigator.vibrate(pattern as number | number[]);
};

export class GameFeedback {
  private preferencesValue: FeedbackPreferences;
  private readonly storage: Storage | null;
  private readonly audioContextFactory: (() => FeedbackAudioContext) | null;
  private readonly vibrate: (pattern: number | readonly number[]) => boolean;
  private readonly contextProvider: () => Partial<FeedbackContext>;
  private audioContext: FeedbackAudioContext | null = null;

  constructor(options: GameFeedbackOptions = {}) {
    this.storage =
      options.storage === undefined ? browserStorage() : options.storage;
    this.preferencesValue = {
      ...loadFeedbackPreferences(this.storage),
      ...options.initialPreferences,
    };
    this.audioContextFactory =
      options.audioContextFactory === undefined
        ? defaultAudioContextFactory
        : options.audioContextFactory;
    this.vibrate =
      options.vibrate === null
        ? () => false
        : (options.vibrate ?? defaultVibrate);
    this.contextProvider = options.contextProvider ?? (() => ({}));
  }

  get preferences(): Readonly<FeedbackPreferences> {
    return { ...this.preferencesValue };
  }

  setPreferences(
    preferences: Partial<FeedbackPreferences>
  ): Readonly<FeedbackPreferences> {
    this.preferencesValue = {
      ...this.preferencesValue,
      ...preferences,
    };
    saveFeedbackPreferences(this.preferencesValue, this.storage);
    return this.preferences;
  }

  private context(overrides: Partial<FeedbackContext> = {}): FeedbackContext {
    return resolveFeedbackContext({
      ...this.contextProvider(),
      ...overrides,
    });
  }

  private async readyAudioContext(): Promise<FeedbackAudioContext | null> {
    if (!this.audioContext && this.audioContextFactory) {
      try {
        this.audioContext = this.audioContextFactory();
      } catch {
        return null;
      }
    }

    if (!this.audioContext || this.audioContext.state === "closed") {
      return null;
    }

    if (this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch {
        return null;
      }
    }

    return this.audioContext.state === "running" ? this.audioContext : null;
  }

  /** Call from a click/tap after sound opt-in to satisfy browser autoplay rules. */
  async unlockAudio(context: Partial<FeedbackContext> = {}): Promise<boolean> {
    if (
      !isFeedbackAllowed("sound", this.preferencesValue, this.context(context))
    ) {
      return false;
    }
    return (await this.readyAudioContext()) !== null;
  }

  private async playSound(spec: FeedbackCueSpec): Promise<boolean> {
    const audioContext = await this.readyAudioContext();
    if (!audioContext) return false;

    try {
      const now = audioContext.currentTime;
      const endsAt = now + spec.durationMs / 1_000;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = spec.wave;
      oscillator.frequency.setValueAtTime(spec.frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, spec.endFrequency),
        endsAt
      );
      gain.gain.setValueAtTime(Math.max(0.0001, spec.gain), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.onended = () => {
        oscillator.disconnect?.();
        gain.disconnect?.();
      };
      oscillator.start(now);
      oscillator.stop(endsAt);
      return true;
    } catch {
      return false;
    }
  }

  async trigger(
    cue: FeedbackCue,
    context: Partial<FeedbackContext> = {}
  ): Promise<FeedbackTriggerResult> {
    const resolvedContext = this.context(context);
    const spec = FEEDBACK_CUE_SPECS[cue];
    const soundPromise = isFeedbackAllowed(
      "sound",
      this.preferencesValue,
      resolvedContext
    )
      ? this.playSound(spec)
      : Promise.resolve(false);

    let vibrationPlayed = false;
    if (
      isFeedbackAllowed("vibration", this.preferencesValue, resolvedContext)
    ) {
      try {
        vibrationPlayed = this.vibrate(spec.vibration);
      } catch {
        vibrationPlayed = false;
      }
    }

    const soundPlayed = await soundPromise;
    return { soundPlayed, vibrationPlayed };
  }

  async dispose(): Promise<void> {
    const audioContext = this.audioContext;
    this.audioContext = null;
    if (!audioContext?.close || audioContext.state === "closed") return;
    try {
      await audioContext.close();
    } catch {
      // Browsers may reject close() while tearing a page down.
    }
  }
}

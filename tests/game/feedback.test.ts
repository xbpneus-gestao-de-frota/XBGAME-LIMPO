import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FEEDBACK_PREFERENCES,
  FEEDBACK_STORAGE_KEY,
  GameFeedback,
  isFeedbackAllowed,
  loadFeedbackPreferences,
  saveFeedbackPreferences,
  type FeedbackAudioContext,
  type FeedbackAudioParam,
  type FeedbackGainNode,
  type FeedbackOscillatorNode,
} from "../../client/src/game/feedback";

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

const activeContext = {
  paused: false,
  hidden: false,
  reducedMotion: false,
  soundAllowed: true,
  vibrationAllowed: true,
};

class MockAudioParam implements FeedbackAudioParam {
  readonly values: Array<[number, number]> = [];

  setValueAtTime(value: number, time: number): void {
    this.values.push([value, time]);
  }

  exponentialRampToValueAtTime(value: number, time: number): void {
    this.values.push([value, time]);
  }
}

class MockOscillator implements FeedbackOscillatorNode {
  type: OscillatorType = "sine";
  readonly frequency = new MockAudioParam();
  onended: (() => void) | null = null;
  readonly connect = vi.fn();
  readonly disconnect = vi.fn();
  readonly start = vi.fn();
  readonly stop = vi.fn();
}

class MockGain implements FeedbackGainNode {
  readonly gain = new MockAudioParam();
  readonly connect = vi.fn();
  readonly disconnect = vi.fn();
}

class MockAudioContext implements FeedbackAudioContext {
  readonly currentTime = 10;
  readonly destination = {};
  state: "closed" | "running" | "suspended" = "suspended";
  readonly oscillator = new MockOscillator();
  readonly gain = new MockGain();
  readonly resume = vi.fn(async () => {
    this.state = "running";
  });
  readonly close = vi.fn(async () => {
    this.state = "closed";
  });

  createOscillator(): FeedbackOscillatorNode {
    return this.oscillator;
  }

  createGain(): FeedbackGainNode {
    return this.gain;
  }
}

describe("optional game feedback", () => {
  it("keeps sound and vibration opt-in by default", () => {
    expect(loadFeedbackPreferences(new MemoryStorage())).toEqual(
      DEFAULT_FEEDBACK_PREFERENCES
    );
    expect(DEFAULT_FEEDBACK_PREFERENCES).toEqual({
      soundEnabled: false,
      vibrationEnabled: false,
    });
  });

  it("persists validated controls and rejects malformed data", () => {
    const storage = new MemoryStorage();
    expect(
      saveFeedbackPreferences(
        { soundEnabled: true, vibrationEnabled: false },
        storage
      )
    ).toBe(true);
    expect(loadFeedbackPreferences(storage)).toEqual({
      soundEnabled: true,
      vibrationEnabled: false,
    });
    storage.setItem(FEEDBACK_STORAGE_KEY, "not-json");
    expect(loadFeedbackPreferences(storage)).toEqual(
      DEFAULT_FEEDBACK_PREFERENCES
    );
  });

  it("blocks both channels while paused or hidden", () => {
    const preferences = { soundEnabled: true, vibrationEnabled: true };
    expect(
      isFeedbackAllowed("sound", preferences, {
        ...activeContext,
        paused: true,
      })
    ).toBe(false);
    expect(
      isFeedbackAllowed("vibration", preferences, {
        ...activeContext,
        hidden: true,
      })
    ).toBe(false);
  });

  it("suppresses vibration under reduced-motion without muting sound", () => {
    const preferences = { soundEnabled: true, vibrationEnabled: true };
    const context = { ...activeContext, reducedMotion: true };
    expect(isFeedbackAllowed("sound", preferences, context)).toBe(true);
    expect(isFeedbackAllowed("vibration", preferences, context)).toBe(false);
  });

  it("does not create audio or vibrate before explicit opt-in", async () => {
    const audioFactory = vi.fn(() => new MockAudioContext());
    const vibrate = vi.fn(() => true);
    const feedback = new GameFeedback({
      storage: null,
      audioContextFactory: audioFactory,
      vibrate,
      contextProvider: () => activeContext,
    });
    expect(await feedback.trigger("button")).toEqual({
      soundPlayed: false,
      vibrationPlayed: false,
    });
    expect(audioFactory).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("unlocks Web Audio and synthesizes a cue after opt-in", async () => {
    const audioContext = new MockAudioContext();
    const feedback = new GameFeedback({
      storage: null,
      initialPreferences: { soundEnabled: true },
      audioContextFactory: () => audioContext,
      vibrate: null,
      contextProvider: () => activeContext,
    });
    expect(await feedback.unlockAudio()).toBe(true);
    expect(audioContext.resume).toHaveBeenCalledOnce();
    expect(await feedback.trigger("boost")).toEqual({
      soundPlayed: true,
      vibrationPlayed: false,
    });
    expect(audioContext.oscillator.start).toHaveBeenCalledWith(10);
    expect(audioContext.oscillator.stop).toHaveBeenCalledWith(10.18);
    expect(audioContext.gain.connect).toHaveBeenCalledWith(
      audioContext.destination
    );
  });

  it("vibrates immediately when enabled and respects reduced-motion", async () => {
    const vibrate = vi.fn(() => true);
    const feedback = new GameFeedback({
      storage: null,
      initialPreferences: { vibrationEnabled: true },
      audioContextFactory: null,
      vibrate,
      contextProvider: () => activeContext,
    });
    expect((await feedback.trigger("collision")).vibrationPlayed).toBe(true);
    expect(vibrate).toHaveBeenCalledWith([35, 18, 55]);
    expect(
      (
        await feedback.trigger("collision", {
          reducedMotion: true,
        })
      ).vibrationPlayed
    ).toBe(false);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it("updates and persists controls as one atomic preference", () => {
    const storage = new MemoryStorage();
    const feedback = new GameFeedback({
      storage,
      audioContextFactory: null,
      vibrate: null,
    });
    expect(
      feedback.setPreferences({ soundEnabled: true, vibrationEnabled: true })
    ).toEqual({ soundEnabled: true, vibrationEnabled: true });
    expect(loadFeedbackPreferences(storage)).toEqual({
      soundEnabled: true,
      vibrationEnabled: true,
    });
  });

  it("closes the synthetic audio context on disposal", async () => {
    const audioContext = new MockAudioContext();
    const feedback = new GameFeedback({
      storage: null,
      initialPreferences: { soundEnabled: true },
      audioContextFactory: () => audioContext,
      contextProvider: () => activeContext,
    });
    await feedback.unlockAudio();
    await feedback.dispose();
    expect(audioContext.close).toHaveBeenCalledOnce();
  });
});

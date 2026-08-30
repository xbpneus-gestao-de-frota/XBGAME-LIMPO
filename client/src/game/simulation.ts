export const FIXED_SIMULATION_STEP = 1 / 60;
export const MAX_SIMULATION_FRAME_DELTA = 0.5;

export interface FixedStepBudget {
  steps: number;
  remainder: number;
}

/** Converts variable render frames into deterministic 60 Hz simulation work. */
export function fixedStepBudget(
  accumulator: number,
  frameDelta: number,
  step = FIXED_SIMULATION_STEP
): FixedStepBudget {
  const safeStep = Math.max(Number.EPSILON, step);
  const safeFrame = Math.min(
    MAX_SIMULATION_FRAME_DELTA,
    Math.max(0, Number.isFinite(frameDelta) ? frameDelta : 0)
  );
  const total = Math.max(0, accumulator) + safeFrame;
  const steps = Math.floor((total + Number.EPSILON * 8) / safeStep);
  return {
    steps,
    remainder: Math.max(0, total - steps * safeStep),
  };
}

export function scoreForStep(
  effectiveSpeed: number,
  delta: number,
  combo: number
): number {
  return (
    Math.max(0, effectiveSpeed) *
    Math.max(0, delta) *
    (1 + Math.max(0, combo) * 0.05)
  );
}

export type GameplayKeyboardCommand = "left" | "right" | "pause" | "resume";

/** Commands are intentionally valid only while the focused canvas owns play. */
export function gameplayKeyboardCommand(
  key: string,
  running: boolean,
  paused: boolean
): GameplayKeyboardCommand | null {
  if (!running) return null;
  const normalized = key.toLowerCase();
  if (!paused && (normalized === "arrowleft" || normalized === "a")) {
    return "left";
  }
  if (!paused && (normalized === "arrowright" || normalized === "d")) {
    return "right";
  }
  if (normalized === "p" || normalized === "escape") {
    return paused ? "resume" : "pause";
  }
  return null;
}

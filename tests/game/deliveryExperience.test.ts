/**
 * O teatro de entrega e puro: fase, pose do ponto e sugestao de camera saem
 * so do progresso da rota. Portado do antigo v24-core, sem as verificacoes de
 * texto de arquivo que nao provavam comportamento nenhum.
 */
import { describe, expect, it } from "vitest";
import {
  DELIVERY_STAGE_SEQUENCE,
  deliveryCameraCue,
  deliveryExperience,
  deliveryStopPose,
} from "../../client/src/game/deliveryExperience";

describe("experiência de entrega", () => {
  it("limita o progresso e percorre todas as fases", () => {
    expect(deliveryExperience(-1).progress).toBe(0);
    expect(deliveryExperience(2).progress).toBe(1);
    expect(deliveryExperience(Number.NaN).progress).toBe(0);
    expect(deliveryExperience(0).stage).toBe("en-route");
    expect(deliveryExperience(0.75).stage).toBe("approach");
    expect(deliveryExperience(0.83).stage).toBe("stopping");
    expect(deliveryExperience(0.88).stage).toBe("unloading");
    expect(deliveryExperience(0.93).stage).toBe("handoff");
    expect(deliveryExperience(0.975).stage).toBe("returning");
    expect(deliveryExperience(1).stage).toBe("complete");
    expect(DELIVERY_STAGE_SEQUENCE.map(stage => stage.id)).toEqual([
      "en-route",
      "approach",
      "stopping",
      "unloading",
      "handoff",
      "returning",
      "complete",
    ]);
  });

  it("avança de etapa sem saltos e só é cinematográfica na reta final", () => {
    let lastStep = 0;
    for (let index = 0; index <= 200; index += 1) {
      const experience = deliveryExperience(index / 200);
      expect(experience.activeStep).toBeGreaterThanOrEqual(lastStep);
      expect(experience.activeStep - lastStep).toBeLessThanOrEqual(1);
      expect(experience.stageProgress).toBeGreaterThanOrEqual(0);
      expect(experience.stageProgress).toBeLessThanOrEqual(1);
      expect(experience.totalSteps).toBe(DELIVERY_STAGE_SEQUENCE.length);
      lastStep = experience.activeStep;
    }
    expect(deliveryExperience(0.5).cinematic).toBe(false);
    expect(deliveryExperience(0.8).cinematic).toBe(true);
    expect(deliveryExperience(1).complete).toBe(true);
    expect(deliveryExperience(0.4, false, true).stage).toBe("complete");
  });

  it("preserva a fase quando a rota está pausada", () => {
    const active = deliveryExperience(0.9, false, false);
    const paused = deliveryExperience(0.9, true, false);
    expect(paused.stage).toBe(active.stage);
    expect(paused.stageProgress).toBe(active.stageProgress);
    expect(paused.paused).toBe(true);
    expect(paused.detail).toMatch(/pausada/i);
  });

  it("aproxima o destino, segura a entrega e libera a saída", () => {
    const hidden = deliveryStopPose(0.7);
    const approach = deliveryStopPose(0.76);
    const stopped = deliveryStopPose(0.86);
    const handoff = deliveryStopPose(0.94);
    const returning = deliveryStopPose(0.98);
    const complete = deliveryStopPose(1);

    expect(hidden.visible).toBe(false);
    expect(approach.visible).toBe(true);
    expect(approach.z).toBeGreaterThan(stopped.z);
    expect(stopped.z).toBeGreaterThanOrEqual(8);
    expect(stopped.z).toBeLessThanOrEqual(12);
    expect(stopped.vehicleStopped).toBe(true);
    expect(handoff.parcelProgress).toBeGreaterThan(0.5);
    expect(returning.customerReturn).toBeGreaterThan(0);
    expect(complete.visible).toBe(false);

    // O ponto so anda para frente enquanto o veiculo se aproxima.
    let previous = deliveryStopPose(0.74).z;
    for (let index = 74; index <= 84; index += 1) {
      const current = deliveryStopPose(index / 100).z;
      expect(current).toBeLessThanOrEqual(previous);
      previous = current;
    }
  });

  it("aproxima a câmera sem saltos e sem valores inválidos", () => {
    const cruising = deliveryCameraCue(0.5);
    const approach = deliveryCameraCue(0.78);
    const handoff = deliveryCameraCue(0.93);
    const complete = deliveryCameraCue(1);

    expect(cruising.cinematicBlend).toBe(0);
    expect(approach.cinematicBlend).toBeGreaterThan(0);
    expect(approach.cinematicBlend).toBeLessThan(1);
    expect(handoff.cinematicBlend).toBeGreaterThan(approach.cinematicBlend);
    expect(handoff.targetZ).toBeLessThan(cruising.targetZ);
    expect(handoff.targetY).toBeGreaterThan(cruising.targetY);
    expect(complete.cinematicBlend).toBe(0);

    for (let index = 0; index <= 100; index += 1) {
      const cue = deliveryCameraCue(index / 100);
      expect(cue.cinematicBlend).toBeGreaterThanOrEqual(0);
      expect(cue.cinematicBlend).toBeLessThanOrEqual(1);
      expect(Number.isFinite(cue.targetY)).toBe(true);
      expect(Number.isFinite(cue.targetZ)).toBe(true);
      expect(Number.isFinite(cue.positionY)).toBe(true);
      expect(Number.isFinite(cue.positionZ)).toBe(true);
      expect(Number.isFinite(cue.fov)).toBe(true);
    }
  });
});

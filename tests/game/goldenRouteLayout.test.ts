/**
 * A Rota Ouro e a autoridade unica de curva: pista, atores, destino e camera
 * leem daqui. Se ela deixar de ser deterministica ou aceitar entrada invalida,
 * o mundo inteiro se desalinha — por isso os limites sao verificados ponto a
 * ponto, e nao por amostragem simpatica.
 */
import { describe, expect, it } from "vitest";
import {
  GOLDEN_ROUTE_MODULE_SEQUENCE,
  GOLDEN_ROUTE_VIRTUAL_LENGTH,
  goldenRouteCameraScale,
  goldenRouteCenterline,
  goldenRouteModuleFor,
  goldenRoutePose,
} from "../../client/src/game/goldenRouteLayout";

describe("traçado da Rota Ouro", () => {
  it("faz curva à direita, curva à esquerda e chegada centralizada", () => {
    expect(GOLDEN_ROUTE_VIRTUAL_LENGTH).toBe(260);
    expect(Math.abs(goldenRouteCenterline(0))).toBeLessThan(1e-9);
    expect(goldenRouteCenterline(0.34)).toBeGreaterThan(4);
    expect(goldenRouteCenterline(0.7)).toBeLessThan(-2.4);
    expect(Math.abs(goldenRouteCenterline(1))).toBeLessThan(1e-9);

    // Sem degraus: a linha de centro e continua ao longo de toda a rota.
    let previous = goldenRouteCenterline(0);
    for (let index = 1; index <= 1_000; index += 1) {
      const current = goldenRouteCenterline(index / 1_000);
      expect(Math.abs(current - previous)).toBeLessThan(0.12);
      previous = current;
    }
  });

  it("olha adiante para o lado correto de cada curva", () => {
    const centred = goldenRoutePose(0.34, 0);
    expect(Math.abs(centred.offsetX)).toBeLessThan(1e-9);

    // Na curva a direita o traçado adiante abre para +X; na transicao para a
    // esquerda, para -X. E assim que a pista "vira" sob o jogador.
    expect(goldenRoutePose(0.2, 24).offsetX).toBeGreaterThan(0);
    expect(goldenRoutePose(0.5, 24).offsetX).toBeLessThan(0);

    for (let index = 0; index <= 100; index += 1) {
      for (const distance of [-24, 0, 12, 48, 120]) {
        const pose = goldenRoutePose(index / 100, distance);
        expect(Number.isFinite(pose.offsetX)).toBe(true);
        expect(Math.abs(pose.offsetX)).toBeLessThanOrEqual(7.5);
        expect(Math.abs(pose.yaw)).toBeLessThanOrEqual(0.120001);
      }
    }
  });

  it("é determinística e protege entradas inválidas", () => {
    expect(goldenRouteCenterline(-50)).toBe(goldenRouteCenterline(0));
    expect(goldenRouteCenterline(50)).toBe(goldenRouteCenterline(1));
    expect(goldenRouteCenterline(Number.NaN)).toBe(goldenRouteCenterline(0));
    expect(goldenRoutePose(0.57, 31)).toEqual(goldenRoutePose(0.57, 31));
    expect(goldenRoutePose(Number.NaN, Number.POSITIVE_INFINITY)).toEqual({
      offsetX: 0,
      yaw: 0,
    });
    expect(goldenRoutePose(0.5, Number.NaN)).toEqual({ offsetX: 0, yaw: 0 });
  });

  it("reduz a antecipação da câmera em telas verticais", () => {
    expect(goldenRouteCameraScale(Number.NaN)).toBe(1);
    expect(goldenRouteCameraScale(0)).toBe(1);
    expect(goldenRouteCameraScale(-2)).toBe(1);
    expect(goldenRouteCameraScale(390 / 844)).toBeLessThanOrEqual(0.25);
    expect(goldenRouteCameraScale(768 / 1024)).toBeGreaterThan(
      goldenRouteCameraScale(390 / 844)
    );
    expect(goldenRouteCameraScale(16 / 9)).toBe(1);

    // Monotonica entre os extremos: nenhum salto ao girar o aparelho.
    let previous = goldenRouteCameraScale(0.3);
    for (let index = 3; index <= 20; index += 1) {
      const current = goldenRouteCameraScale(index / 10);
      expect(current).toBeGreaterThanOrEqual(previous - 1e-9);
      expect(current).toBeLessThanOrEqual(1);
      previous = current;
    }
  });
});

describe("sequência modular da Rota Ouro", () => {
  it("cobre bairro, comércio, ônibus, praça e destino", () => {
    expect(GOLDEN_ROUTE_MODULE_SEQUENCE).toHaveLength(9);
    const kinds = new Set(
      GOLDEN_ROUTE_MODULE_SEQUENCE.map(module => module.kind)
    );
    for (const required of [
      "residential",
      "bus-stop",
      "commercial",
      "park",
      "destination",
    ]) {
      expect(kinds.has(required as never)).toBe(true);
    }
    expect(GOLDEN_ROUTE_MODULE_SEQUENCE.at(-1)?.kind).toBe("destination");
    expect(GOLDEN_ROUTE_MODULE_SEQUENCE.some(module => module.garage)).toBe(
      true
    );
    expect(GOLDEN_ROUTE_MODULE_SEQUENCE.some(module => module.commercial)).toBe(
      true
    );
    expect(
      GOLDEN_ROUTE_MODULE_SEQUENCE.some(
        module => module.destinationEmphasis === 2
      )
    ).toBe(true);
  });

  it("repete o ciclo e protege índices inválidos", () => {
    expect(goldenRouteModuleFor(9)).toBe(GOLDEN_ROUTE_MODULE_SEQUENCE[0]);
    expect(goldenRouteModuleFor(-1)).toBe(GOLDEN_ROUTE_MODULE_SEQUENCE[0]);
    expect(goldenRouteModuleFor(Number.NaN)).toBe(
      GOLDEN_ROUTE_MODULE_SEQUENCE[0]
    );
    for (let index = 0; index < 27; index += 1) {
      expect(goldenRouteModuleFor(index)).toBe(
        GOLDEN_ROUTE_MODULE_SEQUENCE[index % 9]
      );
    }
    GOLDEN_ROUTE_MODULE_SEQUENCE.forEach(module => {
      expect([-1, 0, 1]).toContain(module.busStopSide);
      expect([-1, 0, 1]).toContain(module.parkSide);
      expect([0, 1, 2]).toContain(module.destinationEmphasis);
      expect(module.treeCount).toBeGreaterThanOrEqual(2);
      expect(Object.isFrozen(module)).toBe(true);
    });
  });
});

/**
 * O bairro modular e a leitura que a pista, o cenario e a camera fazem da Rota
 * Ouro. Aqui valem as curvas, o estado de percurso e o loteamento urbano —
 * tudo puro e deterministico, sem ler arquivo nenhum.
 */
import { describe, expect, it } from "vitest";
import {
  NEIGHBORHOOD_MODULE_SEQUENCE,
  neighborhoodCurveIntensity,
  neighborhoodCurvePose,
  neighborhoodModuleFor,
} from "../../client/src/game/neighborhoodLayout";
import {
  advanceNeighborhoodPath,
  createNeighborhoodPathState,
  neighborhoodPoseAt,
  resetNeighborhoodPath,
} from "../../client/src/game/neighborhoodRuntime";
import {
  XB_URBAN_PALETTE,
  isYellowLikeHex,
  urbanLotFor,
  urbanRoadDecorFor,
} from "../../client/src/game/urbanLayout";

describe("curvas do bairro", () => {
  it("abre para os dois lados conforme o trecho da rota", () => {
    // Na primeira curva o traçado adiante vai para a direita; na segunda,
    // para a esquerda. E o que faz o bairro parecer um bairro, e nao um tubo.
    expect(neighborhoodCurvePose(24, 0, 0.2).offsetX).toBeGreaterThan(0.75);
    expect(neighborhoodCurvePose(24, 0, 0.5).offsetX).toBeLessThan(-0.75);
  });

  it("mantém deslocamento e guinada dentro do limite em toda a rota", () => {
    for (let step = 0; step <= 50; step += 1) {
      const progress = step / 50;
      for (let index = 0; index < 12; index += 1) {
        const pose = neighborhoodCurvePose(index * 12, 0, progress, 0.7);
        expect(Math.abs(pose.offsetX)).toBeLessThanOrEqual(7.5);
        expect(Math.abs(pose.yaw)).toBeLessThanOrEqual(0.120001);
      }
    }
    expect(neighborhoodCurvePose(48, 12, 0.4)).toEqual(
      neighborhoodCurvePose(48, 12, 0.4)
    );
    expect(neighborhoodCurvePose(Number.NaN, 0, 0.4)).toEqual({
      offsetX: 0,
      yaw: 0,
    });
  });

  it("só considera intensidade dentro do intervalo de progresso válido", () => {
    expect(neighborhoodCurveIntensity(0)).toBe(1);
    expect(neighborhoodCurveIntensity(0.5)).toBe(1);
    expect(neighborhoodCurveIntensity(1)).toBe(1);
    expect(neighborhoodCurveIntensity(-0.01)).toBe(0);
    expect(neighborhoodCurveIntensity(1.01)).toBe(0);
    expect(neighborhoodCurveIntensity(Number.NaN)).toBe(0);
  });
});

describe("módulos do bairro", () => {
  it("inclui casas, praças e pontos de ônibus, e nenhum veículo", () => {
    expect(NEIGHBORHOOD_MODULE_SEQUENCE).toHaveLength(9);
    const kinds = NEIGHBORHOOD_MODULE_SEQUENCE.map(module => module.kind);
    expect(kinds).toContain("bus-stop");
    expect(kinds).toContain("park");
    expect(kinds).toContain("residential");
    expect(neighborhoodModuleFor(10)).toEqual(neighborhoodModuleFor(1));
    NEIGHBORHOOD_MODULE_SEQUENCE.forEach(module => {
      expect([-1, 0, 1]).toContain(module.busStopSide);
      expect([-1, 0, 1]).toContain(module.parkSide);
      expect("vehicle" in module).toBe(false);
    });
  });
});

describe("estado de percurso do bairro", () => {
  it("acumula distância, limita o progresso e reinicia por rota", () => {
    const initial = createNeighborhoodPathState("primeiro-pedal", true);
    expect(initial.travelDistance).toBe(0);
    expect(initial.progress).toBe(0);

    const advanced = advanceNeighborhoodPath(initial, 12, 0.3);
    expect(advanced.travelDistance).toBe(12);
    expect(advanced.progress).toBe(0.3);
    expect(advanceNeighborhoodPath(advanced, -40, 9).travelDistance).toBe(12);
    expect(advanceNeighborhoodPath(advanced, 0, 9).progress).toBe(1);
    expect(advanceNeighborhoodPath(advanced, Number.NaN, Number.NaN)).toEqual({
      ...advanced,
      progress: 0,
    });

    const reset = resetNeighborhoodPath(advanced, "bairro-expresso", true);
    expect(reset.travelDistance).toBe(0);
    expect(reset.routeKey).toBe("bairro-expresso");
    expect(reset.routePhase).not.toBe(initial.routePhase);
    // A fase e uma funcao pura da chave: a mesma rota gera o mesmo bairro.
    expect(createNeighborhoodPathState("primeiro-pedal", true).routePhase).toBe(
      initial.routePhase
    );
    expect(createNeighborhoodPathState("   ", true).routeKey).toBe("default");
  });

  it("entrega pose plana fora do cenário urbano", () => {
    const urban = advanceNeighborhoodPath(
      createNeighborhoodPathState("bairro-expresso", true),
      30,
      0.2
    );
    const offroad = advanceNeighborhoodPath(
      createNeighborhoodPathState("bairro-expresso", false),
      30,
      0.2
    );
    expect(neighborhoodPoseAt(offroad, 24)).toEqual({ offsetX: 0, yaw: 0 });
    expect(neighborhoodPoseAt(urban, 0).offsetX).toBe(0);
    expect(neighborhoodPoseAt(urban, 24)).toEqual(
      neighborhoodCurvePose(
        urban.travelDistance + 24,
        urban.travelDistance,
        urban.progress,
        urban.routePhase
      )
    );
  });
});

describe("loteamento urbano", () => {
  it("distribui travessias, acessos e luzes sem repetição caótica", () => {
    const layouts = Array.from({ length: 9 }, (_, index) =>
      urbanRoadDecorFor(index)
    );
    expect(layouts.filter(layout => layout.crosswalk)).toHaveLength(3);
    expect(
      layouts
        .filter(layout => layout.crosswalk)
        .map(layout => layout.segmentIndex)
    ).toEqual([1, 4, 7]);
    expect(layouts.some(layout => layout.sideStreetSide === -1)).toBe(true);
    expect(layouts.some(layout => layout.sideStreetSide === 1)).toBe(true);
    layouts.forEach(layout => {
      expect(layout.streetLightOffsets).toEqual([-6, 6]);
      expect([-1, 0, 1]).toContain(layout.sideStreetSide);
    });
    expect(urbanRoadDecorFor(-4)).toEqual(urbanRoadDecorFor(0));
    expect(urbanRoadDecorFor(Number.NaN)).toEqual(urbanRoadDecorFor(0));
  });

  it("cria bairro determinístico acima do solo e sem amarelo", () => {
    expect(urbanLotFor(3, -1)).toEqual(urbanLotFor(3, -1));
    for (let segment = 0; segment < 9; segment += 1) {
      for (const side of [-1, 1] as const) {
        const lot = urbanLotFor(segment, side);
        expect(lot.position.y).toBeGreaterThanOrEqual(0);
        expect(Math.abs(lot.position.x)).toBeGreaterThanOrEqual(13.8);
        expect(Math.sign(lot.position.x)).toBe(side);
        expect(lot.wallHeight).toBeGreaterThanOrEqual(2.7);
        expect(lot.roofHeight).toBeGreaterThan(0.8);
        expect(Math.abs(lot.rotationY)).toBeLessThan(Math.PI);
        expect(isYellowLikeHex(lot.facadeColor)).toBe(false);
        expect(isYellowLikeHex(lot.accentColor)).toBe(false);
      }
    }
    Object.values(XB_URBAN_PALETTE).forEach(color => {
      expect(isYellowLikeHex(color), color).toBe(false);
    });
    // O detector precisa reconhecer amarelo de verdade, senao nao protege nada.
    expect(isYellowLikeHex("#FFD400")).toBe(true);
    expect(isYellowLikeHex("nao-e-cor")).toBe(false);
  });
});

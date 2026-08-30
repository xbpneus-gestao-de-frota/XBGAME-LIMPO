/**
 * A curva do bairro vista pela geometria que o jogador realmente enxerga.
 * A pista e uma corrente de nove blocos rigidos de 24: cada bloco so consegue
 * desenhar a CORDA da curva no seu trecho, nunca a tangente do meio. Se
 * alguem voltar a girar o bloco pelo angulo do centro, as pontas deixam de se
 * encostar e o meio-fio — que tem 1,5 de largura — rasga. Nada disso vira
 * erro em tempo de execucao: so aparece como calcada quebrada na tela, por
 * isso e medido aqui, com geometria real (NullEngine) e pelo grafo de cena.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { RoadSystem } from "../../client/src/game/RoadSystem";
import { LANE_POSITIONS, getVehicle } from "../../client/src/game/config";
import {
  createNullScene,
  installBrowserWindow,
  type NullScene,
} from "./harness";

const noop = (): void => undefined;
const ACTOR_NAME = /^(?:cargo|tire|cone|pothole)-\d+$/;
const SEGMENT_LENGTH = 24;
const HALF = SEGMENT_LENGTH / 2;
/** Fora da pista: nada encosta no jogador e nada e consumido por engano. */
const PARKED_FAR_AWAY = 999;

interface Ponta {
  x: number;
  z: number;
}

/**
 * Ponta do bloco no mundo. Babylon aplica escala, depois giro, depois
 * translacao, entao (0, 0, sinal*12) vira (sinal*12*k*sen, 0, sinal*12*k*cos).
 */
const ponta = (segment: TransformNode, sinal: 1 | -1): Ponta => {
  const giro = segment.rotation.y;
  const alcance = sinal * HALF * segment.scaling.z;
  return {
    x: segment.position.x + alcance * Math.sin(giro),
    z: segment.position.z + alcance * Math.cos(giro),
  };
};

/**
 * Eixo do asfalto no ponto `z`, lido do bloco que cobre esse ponto — a mesma
 * reta que o jogador ve sob as rodas.
 */
const eixoDaPista = (blocos: TransformNode[], z: number): number => {
  let escolhido = blocos[0]!;
  let melhor = Number.POSITIVE_INFINITY;
  blocos.forEach(bloco => {
    const distancia = Math.abs(z - bloco.position.z);
    if (distancia < melhor) {
      melhor = distancia;
      escolhido = bloco;
    }
  });
  return (
    escolhido.position.x +
    (z - escolhido.position.z) * Math.tan(escolhido.rotation.y)
  );
};

describe("curva urbana em blocos rigidos", () => {
  let rendering: NullScene;
  let road: RoadSystem;

  const segments = (): TransformNode[] =>
    rendering.scene.transformNodes
      .filter(node => /^road-segment-\d+$/.test(node.name))
      .sort((left, right) => left.position.z - right.position.z);

  const actors = (): TransformNode[] =>
    rendering.scene.transformNodes.filter(node => ACTOR_NAME.test(node.name));

  beforeEach(() => {
    installBrowserWindow();
    rendering = createNullScene();
    road = new RoadSystem(rendering.scene);
    // Terreno urbano: e o unico em que o tracado curva.
    road.setRouteEnvironment(getVehicle("bike"), "urban", "clear", "urban");
    road.reset("rota-em-curva");
  });

  afterEach(() => {
    road.dispose();
    rendering.dispose();
  });

  it("emenda os blocos ponta com ponta ao longo de toda a rota", () => {
    let piorLateral = 0;
    let piorLongitudinal = 0;
    let giroMaximo = 0;

    for (let passo = 0; passo < 220; passo += 1) {
      road.setRunProgress(passo / 220, false);
      road.update(1, 6.4, PARKED_FAR_AWAY, 0, noop, noop);

      const blocos = segments();
      expect(blocos).toHaveLength(9);
      blocos.forEach(bloco => {
        giroMaximo = Math.max(giroMaximo, Math.abs(bloco.rotation.y));
        // O bloco estica so o bastante para continuar medindo 24 em z.
        expect(bloco.scaling.z).toBeCloseTo(1 / Math.cos(bloco.rotation.y), 12);
      });

      for (let indice = 1; indice < blocos.length; indice += 1) {
        const fim = ponta(blocos[indice - 1]!, 1);
        const inicio = ponta(blocos[indice]!, -1);
        piorLateral = Math.max(piorLateral, Math.abs(inicio.x - fim.x));
        piorLongitudinal = Math.max(
          piorLongitudinal,
          Math.abs(inicio.z - fim.z)
        );
      }
    }

    // Pre-condicao: a rota realmente curvou neste percurso, senao o teste
    // passaria de graca sobre uma pista reta.
    expect(giroMaximo).toBeGreaterThan(0.05);
    // E a emenda fecha nos dois eixos — so ruido de ponto flutuante.
    expect(piorLateral).toBeLessThan(1e-9);
    expect(piorLongitudinal).toBeLessThan(1e-9);
  });

  it("mantem cada ator exatamente sobre a faixa do asfalto que pisa", () => {
    let piorDesvio = 0;
    let medidas = 0;

    for (let passo = 0; passo < 220; passo += 1) {
      road.setRunProgress(passo / 220, false);
      road.update(1, 6.4, PARKED_FAR_AWAY, 0, noop, noop);

      const blocos = segments();
      // So vale para quem ja tem asfalto embaixo: o rodizio joga ator novo
      // adiante do ultimo bloco, e la ainda nao ha pista com que comparar.
      const inicio = blocos[0]!.position.z - HALF;
      const fim = blocos[blocos.length - 1]!.position.z + HALF;
      actors()
        .filter(
          actor =>
            actor.isEnabled() &&
            actor.position.z >= inicio &&
            actor.position.z <= fim
        )
        .forEach(actor => {
          const eixo = eixoDaPista(blocos, actor.position.z);
          const relativo = actor.position.x - eixo;
          const desvio = Math.min(
            ...LANE_POSITIONS.map(faixa => Math.abs(relativo - faixa))
          );
          piorDesvio = Math.max(piorDesvio, desvio);
          medidas += 1;
        });
    }

    expect(medidas).toBeGreaterThan(500);
    // Com a tangente do centro este numero passava de meia unidade: o ator
    // flutuava para fora da faixa no miolo do bloco.
    expect(piorDesvio).toBeLessThan(1e-9);
  });

  it("deixa a pista reta e sem esticao fora do terreno urbano", () => {
    road.setRouteEnvironment(
      getVehicle("planetary"),
      "planetary",
      "clear",
      "planet"
    );
    road.reset("rota-fora-da-cidade");

    for (let passo = 0; passo < 60; passo += 1) {
      road.setRunProgress(passo / 60, false);
      road.update(1, 6.4, PARKED_FAR_AWAY, 0, noop, noop);
      segments().forEach(bloco => {
        expect(bloco.position.x).toBe(0);
        expect(bloco.rotation.y).toBe(0);
        expect(bloco.scaling.z).toBe(1);
      });
    }
  });
});

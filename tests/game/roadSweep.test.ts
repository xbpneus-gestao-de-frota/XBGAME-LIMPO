/**
 * A pista por baixo do jogo: o teste de colisão varrido, o rodízio dos
 * segmentos, o rodízio dos atores e a faixa que o piloto automático sugere.
 * Tudo aqui roda com geometria real (NullEngine) e é medido pelo grafo de
 * cena — nenhum destes defeitos aparece como erro, só como pista vazia,
 * buraco no mundo ou obstáculo que atravessa o jogador em silêncio.
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
const OBSTACLE_NAME = /^(?:cone|pothole)-\d+$/;
const PLAYER_HALF_WIDTH = 0.5;
/** Fora da pista: nada encosta no jogador e nada é consumido por engano. */
const PARKED_FAR_AWAY = 999;

describe("pista procedural em movimento", () => {
  let rendering: NullScene;
  let road: RoadSystem;

  const segments = (): TransformNode[] =>
    rendering.scene.transformNodes.filter(node =>
      /^road-segment-\d+$/.test(node.name)
    );

  const actors = (): TransformNode[] =>
    rendering.scene.transformNodes.filter(node => ACTOR_NAME.test(node.name));

  const laneOf = (node: TransformNode): number =>
    LANE_POSITIONS.findIndex(
      position => Math.abs(position - node.position.x) < 1e-6
    );

  beforeEach(() => {
    installBrowserWindow();
    rendering = createNullScene();
    road = new RoadSystem(rendering.scene);
    // Terreno não urbano: a rua corre reta, então cada ator fica exatamente
    // sobre a sua faixa e a colisão pode ser conferida no milímetro.
    road.setRouteEnvironment(
      getVehicle("planetary"),
      "planetary",
      "clear",
      "planet"
    );
    road.reset("rota-de-teste");
  });

  afterEach(() => {
    road.dispose();
    rendering.dispose();
  });

  it("resolve a colisão de quem atravessa a janela do jogador num único passo", () => {
    const events: string[] = [];
    const onPickup = (kind: string): void => void events.push(`pickup:${kind}`);
    const onObstacle = (kind: string): void =>
      void events.push(`obstacle:${kind}`);

    const cargo = rendering.scene.getTransformNodeByName("cargo-0")!;
    const pothole = rendering.scene.getTransformNodeByName("pothole-3")!;
    // Ambos nascem na faixa do meio, à frente do jogador.
    expect(laneOf(cargo)).toBe(1);
    expect(laneOf(pothole)).toBe(1);
    const cargoBefore = cargo.position.z;
    const potholeStart = pothole.position.z;
    expect(cargoBefore).toBeGreaterThan(0);

    // Um passo longo (engasgo de quadro, ou turbo) pula a janela inteira:
    // antes o volume estava bem à frente, depois já está atrás.
    road.update(1, 25, 0, PLAYER_HALF_WIDTH, onPickup, onObstacle);
    expect(cargo.position.z).toBeLessThan(0);
    expect(events).toEqual(["pickup:cargo"]);

    const potholeMid = pothole.position.z;
    expect(potholeMid).toBeGreaterThan(0);
    road.update(1, 32, 0, PLAYER_HALF_WIDTH, onPickup, onObstacle);
    expect(pothole.position.z).toBeLessThan(0);
    expect(events).toEqual(["pickup:cargo", "obstacle:pothole"]);
    expect(potholeStart - pothole.position.z).toBeGreaterThan(
      potholeStart - potholeMid
    );
  });

  it("mantém o asfalto ladrilhado sem buraco e sem encurtar à frente", () => {
    const initial = segments()
      .map(segment => segment.position.z)
      .sort((left, right) => left - right);
    expect(initial.length).toBeGreaterThan(1);
    const tile = initial[1]! - initial[0]!;
    expect(tile).toBeGreaterThan(0);
    // No início a pista cobre de zero até o fim do último ladrilho.
    const reach = initial[initial.length - 1]! + tile;
    expect(initial[0]).toBe(0);

    for (let step = 0; step < 80; step += 1) {
      road.update(1, 7.3, PARKED_FAR_AWAY, 0, noop, noop);
      const current = segments()
        .map(segment => segment.position.z)
        .sort((left, right) => left - right);
      expect(current).toHaveLength(initial.length);
      // Ladrilhamento contínuo: nenhum vão entre segmentos vizinhos.
      for (let index = 1; index < current.length; index += 1) {
        expect(current[index]! - current[index - 1]!).toBeCloseTo(tile, 6);
      }
      // E o asfalto desenhado à frente nunca encolhe abaixo de um ciclo.
      expect(current[current.length - 1]! + tile).toBeGreaterThan(reach - tile);
      expect(current[0]!).toBeGreaterThan(-tile);
    }
  });

  it("recicla os atores para que a pista nunca fique vazia", () => {
    const movement = 7.3;
    for (let step = 0; step < 80; step += 1) {
      road.update(1, movement, PARKED_FAR_AWAY, 0, noop, noop);
    }

    const positions = actors().map(actor => actor.position.z);
    expect(positions.length).toBeGreaterThan(0);
    // Depois de quase 600 unidades ninguém pode ter ficado para trás...
    positions.forEach(z => expect(z).toBeGreaterThan(-(12 + movement)));
    // ...e o jogador continua tendo carga e perigo à frente para jogar.
    expect(positions.filter(z => z > 0).length).toBeGreaterThanOrEqual(4);
    expect(
      actors().filter(
        actor => OBSTACLE_NAME.test(actor.name) && actor.position.z > 0
      )
    ).not.toHaveLength(0);
  });

  it("nunca sugere ao piloto automático uma faixa ocupada por obstáculo", () => {
    // Avança até a janela de decisão conter apenas perigo; o jogador fica
    // fora da pista para que nada seja consumido no caminho.
    road.update(1, 94, PARKED_FAR_AWAY, 0, noop, noop);

    const window = actors().filter(
      actor =>
        actor.isEnabled() && actor.position.z > 5 && actor.position.z < 38
    );
    // Pré-condição do cenário: só obstáculos à vista, em duas faixas.
    expect(window.length).toBeGreaterThanOrEqual(2);
    window.forEach(actor => expect(actor.name).toMatch(OBSTACLE_NAME));
    const blocked = new Set(window.map(laneOf));
    expect(blocked.size).toBe(2);

    const suggested = road.getSuggestedLane();
    expect([0, 1, 2]).toContain(suggested);
    expect(blocked.has(suggested)).toBe(false);
  });
});

/**
 * Guarda de regressao do bug "arvores flutuando no espaco": a fusao por
 * material acelera a pista, mas nao pode engolir o bairro. Aqui a pista e
 * construida de verdade (NullEngine) e o grafo de cena e inspecionado.
 */
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RoadSystem } from "../../client/src/game/RoadSystem";
import {
  createNullScene,
  installBrowserWindow,
  type NullScene,
} from "./harness";

const SEGMENT_COUNT = 9;
const noop = (): void => undefined;

const layerOf = (mesh: AbstractMesh): string | undefined =>
  (mesh.metadata as { xbLayer?: string } | null)?.xbLayer;

const isUnder = (node: TransformNode | AbstractMesh, root: TransformNode) => {
  let parent = node.parent;
  while (parent) {
    if (parent === root) return true;
    parent = parent.parent;
  }
  return false;
};

describe("superfície da pista e bairro após a fusão por material", () => {
  let rendering: NullScene;
  let road: RoadSystem;

  beforeEach(() => {
    installBrowserWindow();
    rendering = createNullScene();
    road = new RoadSystem(rendering.scene);
  });

  afterEach(() => {
    road.dispose();
    rendering.dispose();
  });

  it("marca a pista de forma que a marca sobrevive ao MergeMeshes", () => {
    const surfaces = road.roadSurfaceNodes();
    expect(surfaces.length).toBeGreaterThan(0);
    surfaces.forEach(mesh => expect(layerOf(mesh)).toBe("road-surface"));

    // O nome original some na fusao; o lote fundido tem de continuar marcado.
    const merged = surfaces.filter(
      mesh =>
        mesh.name.startsWith("road-batch-") ||
        mesh.name.startsWith("urban-batch-")
    );
    expect(merged.some(mesh => mesh.name.startsWith("road-batch-"))).toBe(true);
    expect(merged.some(mesh => mesh.name.startsWith("urban-batch-"))).toBe(
      true
    );
    expect(merged.length).toBeGreaterThanOrEqual(SEGMENT_COUNT);

    // Cada segmento precisa contribuir com pista: um lote perdido significa
    // buraco visivel quando o pacote de assets reais esconde a procedural.
    for (let index = 0; index < SEGMENT_COUNT; index += 1) {
      const segment = rendering.scene.getTransformNodeByName(
        `road-segment-${index}`
      );
      expect(segment).not.toBeNull();
      expect(
        surfaces.filter(mesh => isUnder(mesh, segment!)).length
      ).toBeGreaterThan(0);
    }
  });

  it("reporta cada malha de pista uma única vez", () => {
    const surfaces = road.roadSurfaceNodes();
    const tagged = rendering.scene.meshes.filter(
      mesh => layerOf(mesh) === "road-surface"
    );
    expect(tagged.length).toBeGreaterThan(0);

    // O bairro pendura a calçada dentro do próprio segmento. Varrer a árvore
    // toda em vez dos filhos diretos devolve a mesma malha duas vezes — por
    // uma raiz e pela outra — e o pacote de assets reais passa a apagar e
    // reacender a mesma pista em duplicidade, sem nenhum erro à vista.
    expect(new Set(surfaces).size).toBe(surfaces.length);
    // E a lista é exatamente o conjunto marcado como pista: nem sobra, nem falta.
    expect(surfaces).toHaveLength(tagged.length);
    expect(new Set(surfaces)).toEqual(new Set(tagged));
  });

  it("não marca cenário nem bairro como superfície de pista", () => {
    const surfaces = road.roadSurfaceNodes();
    const intruders = surfaces.filter(
      mesh =>
        mesh.name.startsWith("neighborhood-") ||
        mesh.name.startsWith("scenery-") ||
        mesh.name.startsWith("delivery-")
    );
    expect(intruders).toEqual([]);

    const neighborhood = rendering.scene.meshes.filter(mesh =>
      mesh.name.startsWith("neighborhood-")
    );
    expect(neighborhood.length).toBeGreaterThan(0);
    neighborhood.forEach(mesh => expect(layerOf(mesh)).toBeUndefined());
  });

  it("preserva parques e pontos de ônibus como filhos do próprio segmento", () => {
    const parks = rendering.scene.transformNodes.filter(node =>
      /^neighborhood-park-\d+$/.test(node.name)
    );
    expect(parks.length).toBeGreaterThan(0);

    parks.forEach(park => {
      expect(park.parent?.name).toMatch(/^road-segment-\d+$/);
      const children = park.getChildMeshes(false).map(mesh => mesh.name);
      expect(
        children.some(name => name.startsWith("neighborhood-park-lawn-"))
      ).toBe(true);
      expect(
        children.filter(name => name.startsWith("neighborhood-park-trunk-"))
          .length
      ).toBeGreaterThanOrEqual(2);
      expect(
        children.filter(name => name.startsWith("neighborhood-park-crown-"))
          .length
      ).toBeGreaterThanOrEqual(2);
      expect(
        children.some(name => name.startsWith("neighborhood-park-bench-"))
      ).toBe(true);
    });

    const stops = rendering.scene.transformNodes.filter(node =>
      /^neighborhood-bus-stop-\d+$/.test(node.name)
    );
    expect(stops.length).toBeGreaterThan(0);
    stops.forEach(stop => {
      expect(stop.parent?.name).toMatch(/^road-segment-\d+$/);
      const children = stop.getChildMeshes(false).map(mesh => mesh.name);
      expect(
        children.some(name => name.startsWith("neighborhood-bus-roof-"))
      ).toBe(true);
      expect(
        children.some(name => name.startsWith("neighborhood-bus-bench-"))
      ).toBe(true);
    });
  });

  it("faz a árvore do parque viajar junto com a pista", () => {
    const crown = rendering.scene.meshes.find(mesh =>
      mesh.name.startsWith("neighborhood-park-crown-")
    );
    expect(crown).toBeDefined();
    crown!.computeWorldMatrix(true);
    const before = crown!.getAbsolutePosition().clone();

    const movement = 20;
    road.update(1, movement, 0, 0.5, noop, noop);
    crown!.computeWorldMatrix(true);
    const after = crown!.getAbsolutePosition();

    // Se a fusao tivesse assado a matriz de mundo da arvore, ela ficaria
    // parada enquanto o asfalto corre — exatamente o bug de 3.1.
    expect(after.z - before.z).toBeGreaterThan(-movement - 1);
    expect(after.z - before.z).toBeLessThan(-movement + 1);
  });
});

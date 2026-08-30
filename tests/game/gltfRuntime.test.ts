/**
 * O pacote de assets reais da rua, instalado numa cena de verdade porém sem
 * GPU: o carregador glTF é substituído por peças de medida conhecida, e o que
 * se mede depois é o mundo montado — a largura do asfalto sob as faixas do
 * jogo, o compasso dos cruzamentos e qual das duas ruas fica visível.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";
import { GameWorld } from "../../client/src/game/GameWorld";
import { installGltfAssets } from "../../client/src/game/GltfAssetRuntime";
import type { GltfAssetHandle } from "../../client/src/game/GltfAssetRuntime";
import { LANE_POSITIONS, getVehicle } from "../../client/src/game/config";
import { companyXpRequiredForLevel } from "../../client/src/game/progression";
import {
  createNullScene,
  installBrowserWindow,
  keyboardTarget,
  seedCampaign,
  type NullScene,
} from "./harness";

/** Largura real do asfalto da peça de rua, em metros. */
const ASPHALT_METRES = 6;
/** Altura da laje de asfalto da peça falsa, em metros. */
const ASPHALT_THICKNESS_METRES = 0.1;
/** Profundidade do ladrilho da peça real, em metros. */
const TILE_METRES = 8;
const HOLDER_NAME = /^xb-road-(\d+)-(\d+)-([a-z]+)$/;

interface Placement {
  tile: number;
  key: string;
}

describe("pacote glTF da rua real", () => {
  let rendering: NullScene;
  let world: GameWorld;
  let handle: GltfAssetHandle;
  let loader: ReturnType<typeof vi.spyOn>;
  let hadDocument: boolean;

  beforeEach(async () => {
    const storage = installBrowserWindow();
    seedCampaign(storage, {
      credits: 50_000,
      companyXp: companyXpRequiredForLevel(30),
      unlockedVehicles: ["bike", "moto"],
      selectedVehicleId: "bike",
      buildingLevels: {
        hq: 1,
        garage: 2,
        workshop: 1,
        warehouse: 0,
        dispatch: 1,
        planetLab: 0,
      },
    });
    hadDocument = "document" in globalThis;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        documentElement: { dataset: {} as Record<string, string> },
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });

    rendering = createNullScene();
    world = new GameWorld(
      rendering.scene,
      rendering.camera,
      keyboardTarget,
      false
    );

    // Peça de medida conhecida no lugar do arquivo .glb: uma laje de asfalto
    // de 6,00 m por 8,00 m, exatamente como a peça real do pacote.
    loader = vi
      .spyOn(SceneLoader, "ImportMeshAsync")
      .mockImplementation((async (
        _names: unknown,
        _root: string,
        file: string,
        scene: Scene
      ) => {
        const tag = String(file).replace(/\W+/g, "_");
        const root = MeshBuilder.CreateBox(
          `fake-root-${tag}`,
          { size: 0.001 },
          scene
        );
        const asphalt = MeshBuilder.CreateBox(
          `fake-asphalt-${tag}`,
          {
            width: ASPHALT_METRES,
            height: ASPHALT_THICKNESS_METRES,
            depth: TILE_METRES,
          },
          scene
        );
        asphalt.parent = root;
        return {
          meshes: [root, asphalt],
          transformNodes: [],
          skeletons: [],
          animationGroups: [],
          particleSystems: [],
          geometries: [],
          lights: [],
          spriteManagers: [],
        };
      }) as never);

    handle = await installGltfAssets(rendering.scene, world);
    expect(loader).toHaveBeenCalled();
  });

  afterEach(() => {
    handle.dispose();
    loader.mockRestore();
    world.dispose();
    rendering.dispose();
    if (!hadDocument) {
      Reflect.deleteProperty(globalThis as unknown as object, "document");
    }
  });

  const placements = (): Placement[] =>
    rendering.scene.transformNodes
      .map(node => HOLDER_NAME.exec(node.name))
      .filter((match): match is RegExpExecArray => match !== null)
      .map(match => ({
        tile: Number(match[1]) * 3 + Number(match[2]),
        key: match[3]!,
      }))
      .sort((left, right) => left.tile - right.tile);

  it("assenta o asfalto real com as três faixas do jogo dentro da pista", () => {
    const asphalt = rendering.scene.meshes.find(mesh =>
      mesh.name.startsWith("fake-asphalt-XB_Road_Straight")
    )!;
    // A peça precisa ter entrado num ladrilho, e não ficado solta na cena.
    expect(HOLDER_NAME.test(asphalt.parent!.parent!.name)).toBe(true);

    asphalt.computeWorldMatrix(true);
    const box = asphalt.getHierarchyBoundingVectors(true);
    const width = box.max.x - box.min.x;
    const thickness = box.max.y - box.min.y;

    // A peça entra sem distorção: um metro vale o mesmo em largura e altura.
    const unitsPerMetreAcross = width / ASPHALT_METRES;
    const unitsPerMetreUp = thickness / ASPHALT_THICKNESS_METRES;
    expect(unitsPerMetreAcross).toBeCloseTo(unitsPerMetreUp, 6);

    // E o asfalto tem de caber a pista inteira: as três faixas do jogo, com a
    // bicicleta inteira dentro delas, sem que ninguém pedale fora da rua.
    const outerLane = Math.max(
      ...LANE_POSITIONS.map(position => Math.abs(position))
    );
    const bikeHalfWidth = getVehicle("bike").collisionWidth / 2;
    expect(width / 2).toBeGreaterThan(outerLane + bikeHalfWidth);
  });

  it("distribui os cruzamentos num compasso fixo e sem rotatória", () => {
    const laid = placements();
    expect(laid.length).toBeGreaterThan(0);
    laid.forEach((placement, index) => expect(placement.tile).toBe(index));

    // A rotatória foi removida: o traçado atravessa o ladrilho em linha reta e
    // o ilhéu central caía no meio da faixa. Nenhum ladrilho pode trazê-la de
    // volta por acidente.
    expect(laid.every(item => item.key !== "roundabout")).toBe(true);

    // A malha viária é um compasso: os cruzamentos caem sempre no mesmo
    // intervalo, do começo ao fim do traçado.
    const crossings = laid
      .filter(item => item.key === "cross")
      .map(item => item.tile);
    expect(crossings.length).toBeGreaterThanOrEqual(3);
    const spacing = crossings[1]! - crossings[0]!;
    expect(spacing).toBeGreaterThan(1);
    for (let index = 1; index < crossings.length; index += 1) {
      expect(crossings[index]! - crossings[index - 1]!).toBe(spacing);
    }
  });

  it("mostra uma única rua: a real na bicicleta, a procedural nos outros", () => {
    const procedural = world.roadSurfaceNodes();
    const real = rendering.scene.transformNodes.filter(node =>
      HOLDER_NAME.test(node.name)
    );
    expect(procedural.length).toBeGreaterThan(0);
    expect(real.length).toBeGreaterThan(0);

    expect(world.selectedVehicleId).toBe("bike");
    rendering.scene.onBeforeRenderObservable.notifyObservers(
      rendering.scene as never
    );
    // Na bicicleta a rua real cobre a procedural; as duas juntas seriam
    // z-fighting sobre o mesmo asfalto.
    expect(real.every(node => node.isEnabled(false))).toBe(true);
    expect(procedural.some(mesh => mesh.isEnabled(false))).toBe(false);

    world.selectVehicle("moto");
    expect(world.selectedVehicleId).toBe("moto");
    rendering.scene.onBeforeRenderObservable.notifyObservers(
      rendering.scene as never
    );
    // Fora da bicicleta a peça real não serve, e a procedural precisa voltar:
    // sem ela o veículo corre sobre o vazio.
    expect(real.some(node => node.isEnabled(false))).toBe(false);
    expect(procedural.every(mesh => mesh.isEnabled(false))).toBe(true);
  });
});

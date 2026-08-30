/**
 * Guarda do bairro que deixou de ser carimbo. Duas coisas nao podem voltar
 * atras: a cor por instancia (parede, telhado e copa com tom proprio) e o fato
 * de essa cor nascer do lote — mesma rota, mesmo bairro, em toda sessao.
 * A cena e construida de verdade (NullEngine) e o grafo e inspecionado.
 */
import { Color4 } from "@babylonjs/core/Maths/math.color";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  EnvironmentVisuals,
  SCENERY_CANOPY_COLORS,
  SCENERY_ROOF_COLORS,
  SCENERY_WALL_COLORS,
  environmentPalette,
  sceneryStyleFor,
} from "../../client/src/game/environmentVisuals";
import { VEHICLES } from "../../client/src/game/config";
import {
  createNullScene,
  installBrowserWindow,
  type NullScene,
} from "./harness";

const SEGMENT_COUNT = 9;
const SIDES = [-1, 1] as const;

const hexOf = (color: Color4 | undefined): string => {
  if (!color) return "sem-cor";
  const channel = (value: number): string =>
    Math.round(Math.min(1, Math.max(0, value)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`.toUpperCase();
};

const tintOf = (mesh: AbstractMesh): string =>
  hexOf(
    (mesh as unknown as { instancedBuffers?: Record<string, Color4> })
      .instancedBuffers?.color
  );

interface ClusterProbe {
  wall: string;
  roof: string;
  canopy: string;
  roofKind: string;
  canopyKind: string;
  wallHeight: number;
  canopyScale: number;
  canopyYaw: number;
}

/** Monta a cena inteira e le o bairro pelo lado de fora, como o quadro le. */
const buildNeighborhood = (
  rendering: NullScene
): { visuals: EnvironmentVisuals; clusters: ClusterProbe[] } => {
  const visuals = new EnvironmentVisuals(rendering.scene);
  for (let index = 0; index < SEGMENT_COUNT; index += 1) {
    const segment = new TransformNode(`road-segment-${index}`, rendering.scene);
    segment.position.z = index * 24;
    visuals.registerSegment(segment, index);
  }
  visuals.setEra(VEHICLES[0]!);
  const clusters = (
    visuals as unknown as {
      clusters: {
        tower: AbstractMesh;
        feature: AbstractMesh;
        roofGable: AbstractMesh;
        roofParapet: AbstractMesh;
        roofShed: AbstractMesh;
        crown: AbstractMesh;
        crownConic: AbstractMesh;
        style: { roofKind: string; canopyKind: string };
      }[];
    }
  ).clusters;
  return {
    visuals,
    clusters: clusters.map(cluster => {
      const roof = [
        cluster.feature,
        cluster.roofGable,
        cluster.roofParapet,
        cluster.roofShed,
      ].find(part => part.isEnabled(false)) as AbstractMesh;
      const canopy = cluster.crownConic.isEnabled(false)
        ? cluster.crownConic
        : cluster.crown;
      return {
        wall: tintOf(cluster.tower),
        roof: tintOf(roof),
        canopy: tintOf(canopy),
        roofKind: cluster.style.roofKind,
        canopyKind: cluster.style.canopyKind,
        wallHeight: Number(cluster.tower.scaling.y.toFixed(6)),
        canopyScale: Number(canopy.scaling.x.toFixed(6)),
        canopyYaw: Number(canopy.rotation.y.toFixed(6)),
      };
    }),
  };
};

describe("estilo do lote", () => {
  it("é uma função pura do trecho e do lado", () => {
    for (let index = 0; index < 40; index += 1) {
      SIDES.forEach(side => {
        expect(sceneryStyleFor(index, side)).toEqual(
          sceneryStyleFor(index, side)
        );
      });
    }
  });

  it("não repete o mesmo lote nos dois lados da via", () => {
    let iguais = 0;
    for (let index = 0; index < SEGMENT_COUNT; index += 1) {
      const esquerda = sceneryStyleFor(index, -1);
      const direita = sceneryStyleFor(index, 1);
      if (
        esquerda.wallColor === direita.wallColor &&
        esquerda.roofColor === direita.roofColor &&
        esquerda.roofKind === direita.roofKind
      ) {
        iguais += 1;
      }
    }
    expect(iguais).toBe(0);
  });

  it("só usa cor das paletas fechadas", () => {
    for (let index = 0; index < 60; index += 1) {
      SIDES.forEach(side => {
        const style = sceneryStyleFor(index, side);
        expect(SCENERY_WALL_COLORS).toContain(style.wallColor);
        expect(SCENERY_ROOF_COLORS).toContain(style.roofColor);
        expect(SCENERY_CANOPY_COLORS).toContain(style.canopyColor);
        expect(SCENERY_CANOPY_COLORS).toContain(style.shrubColor);
      });
    }
  });

  it("mantém escala e inclinação dentro do combinado", () => {
    for (let index = 0; index < 60; index += 1) {
      SIDES.forEach(side => {
        const style = sceneryStyleFor(index, side);
        expect(style.heightScale).toBeGreaterThanOrEqual(0.86);
        expect(style.heightScale).toBeLessThanOrEqual(1.26);
        expect(style.canopyScale).toBeGreaterThanOrEqual(0.78);
        expect(style.canopyScale).toBeLessThanOrEqual(1.9);
        expect(style.canopyYaw).toBeGreaterThanOrEqual(0);
        expect(style.canopyYaw).toBeLessThanOrEqual(Math.PI * 2);
        expect(Math.abs(style.canopyTilt)).toBeLessThanOrEqual(0.14);
      });
    }
  });

  it("cobre a paleta inteira em vez de encalhar em duas cores", () => {
    const paredes = new Set<string>();
    const telhados = new Set<string>();
    const copas = new Set<string>();
    for (let index = 0; index < SEGMENT_COUNT; index += 1) {
      SIDES.forEach(side => {
        const style = sceneryStyleFor(index, side);
        paredes.add(style.wallColor);
        telhados.add(style.roofColor);
        copas.add(style.canopyColor);
      });
    }
    expect(paredes.size).toBe(SCENERY_WALL_COLORS.length);
    expect(telhados.size).toBe(SCENERY_ROOF_COLORS.length);
    expect(copas.size).toBe(SCENERY_CANOPY_COLORS.length);
  });
});

describe("bairro montado na cena", () => {
  let rendering: NullScene;
  let visuals: EnvironmentVisuals | null = null;

  beforeEach(() => {
    installBrowserWindow();
    rendering = createNullScene();
  });

  afterEach(() => {
    visuals?.dispose();
    visuals = null;
    rendering.dispose();
  });

  it("pinta cada casa, telhado e copa com a cor do proprio lote", () => {
    const built = buildNeighborhood(rendering);
    visuals = built.visuals;
    const { clusters } = built;
    expect(clusters).toHaveLength(SEGMENT_COUNT * 2);

    clusters.forEach((cluster, position) => {
      const index = Math.floor(position / 2);
      const side = position % 2 === 0 ? -1 : 1;
      const style = sceneryStyleFor(index, side);
      // Se a cor por instancia sumir, estes tres viram "sem-cor" ou branco.
      expect(cluster.wall).toBe(style.wallColor.toUpperCase());
      expect(cluster.roof).toBe(style.roofColor.toUpperCase());
      expect(cluster.canopy).toBe(style.canopyColor.toUpperCase());
    });

    // E a rua tem de ter variedade de verdade, nao uma cor repetida 18 vezes.
    expect(new Set(clusters.map(cluster => cluster.wall)).size).toBeGreaterThan(
      4
    );
    expect(new Set(clusters.map(cluster => cluster.roof)).size).toBeGreaterThan(
      3
    );
    expect(
      new Set(clusters.map(cluster => cluster.canopy)).size
    ).toBeGreaterThan(3);
    expect(
      new Set(clusters.map(cluster => cluster.wallHeight)).size
    ).toBeGreaterThan(12);
    expect(
      new Set(clusters.map(cluster => cluster.canopyYaw)).size
    ).toBeGreaterThan(12);
  });

  it("dá o mesmo bairro em duas cargas seguidas da mesma rota", () => {
    const primeira = buildNeighborhood(rendering);
    const assinatura = JSON.stringify(primeira.clusters);
    primeira.visuals.dispose();
    rendering.dispose();

    rendering = createNullScene();
    const segunda = buildNeighborhood(rendering);
    visuals = segunda.visuals;
    expect(JSON.stringify(segunda.clusters)).toBe(assinatura);
  });

  it("usa as quatro coberturas e as duas árvores ao longo da rua", () => {
    const built = buildNeighborhood(rendering);
    visuals = built.visuals;
    const coberturas = new Set(built.clusters.map(item => item.roofKind));
    expect(coberturas).toEqual(new Set(["hip", "gable", "parapet", "shed"]));
    expect(new Set(built.clusters.map(item => item.canopyKind))).toEqual(
      new Set(["round", "conic"])
    );
  });

  it("devolve a cor do terreno fora do urbano em vez de espalhar creme na lua", () => {
    const built = buildNeighborhood(rendering);
    visuals = built.visuals;
    const material = (name: string) =>
      rendering.scene.materials.find(item => item.name === name) as {
        diffuseColor: { r: number; g: number; b: number };
      };
    const hexOfColor = (color: { r: number; g: number; b: number }): string => {
      const channel = (value: number): string =>
        Math.round(Math.min(1, Math.max(0, value)) * 255)
          .toString(16)
          .padStart(2, "0");
      return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`.toUpperCase();
    };

    visuals.setTheme(VEHICLES[0]!, "orbital", "clear", "urban");
    const orbital = environmentPalette("orbital");
    expect(hexOfColor(material("scenery-wall").diffuseColor)).toBe(
      orbital.scenery.toUpperCase()
    );
    expect(hexOfColor(material("scenery-roof").diffuseColor)).toBe(
      orbital.scenerySecondary.toUpperCase()
    );
    const clusters = (
      visuals as unknown as { clusters: { tower: AbstractMesh }[] }
    ).clusters;
    clusters.forEach(cluster => {
      expect(tintOf(cluster.tower)).toBe("#FFFFFF");
    });

    visuals.setTheme(VEHICLES[0]!, "urban", "clear", "urban");
    expect(hexOfColor(material("scenery-wall").diffuseColor)).toBe("#FFFFFF");
    clusters.forEach((cluster, position) => {
      const style = sceneryStyleFor(
        Math.floor(position / 2),
        position % 2 === 0 ? -1 : 1
      );
      expect(tintOf(cluster.tower)).toBe(style.wallColor.toUpperCase());
    });
  });
});

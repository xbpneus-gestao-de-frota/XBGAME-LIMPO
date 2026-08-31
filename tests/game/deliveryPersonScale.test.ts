/**
 * Guarda de escala das duas figuras da parada de entrega. Elas sao feitas a
 * mao, com caixas e esferas, e por isso nenhuma medida delas vinha de lugar
 * nenhum: mediam 2,560 unidades (1,113 m), com cabeca ocupando 29% do corpo —
 * crianca pequena ao lado do entregador de 4,140 (1,80 m) que vem do arquivo.
 * O numero mentia calado porque ninguem media. Aqui a cena e construida de
 * verdade (NullEngine) e cada figura e medida peca por peca.
 */
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RoadSystem } from "../../client/src/game/RoadSystem";
import {
  createNullScene,
  installBrowserWindow,
  type NullScene,
} from "./harness";

/** Escala do mundo: 1 m = 2,3 unidades. */
const ESCALA = 2.3;
/** COURIER_HEIGHT do carregador de .glb: 1,80 m de gente. */
const ALTURA_ALVO = 4.14;
/** Pecas do corpo. A sombra fica de fora: e um disco deitado no chao. */
const PECAS = [
  "body",
  "head",
  "vest",
  "leg-0",
  "leg-1",
  "left-arm",
  "right-arm",
] as const;
const FIGURAS = ["delivery-courier", "delivery-customer"] as const;

interface Medida {
  topo: number;
  sola: number;
  altura: number;
  cabeca: number;
  ombro: number;
}

describe("escala das figuras da parada de entrega", () => {
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

  const pecaDe = (figura: string, sufixo: string): AbstractMesh => {
    const mesh = rendering.scene.meshes.find(
      item => item.name === `${figura}-${sufixo}`
    );
    if (!mesh) throw new Error(`peca ausente: ${figura}-${sufixo}`);
    return mesh;
  };

  const meiaAltura = (mesh: AbstractMesh): number =>
    mesh.getBoundingInfo().boundingBox.extendSize.y;

  // Mede no referencial da propria figura: a posicao da peca mais a meia
  // altura da caixa dela. Nada aqui depende de onde a parada caiu na pista.
  const medir = (figura: string): Medida => {
    let topo = -Infinity;
    let sola = Infinity;
    PECAS.forEach(sufixo => {
      const mesh = pecaDe(figura, sufixo);
      topo = Math.max(topo, mesh.position.y + meiaAltura(mesh));
      sola = Math.min(sola, mesh.position.y - meiaAltura(mesh));
    });
    const braco = pecaDe(figura, "left-arm");
    return {
      topo,
      sola,
      altura: topo - sola,
      cabeca: meiaAltura(pecaDe(figura, "head")) * 2,
      ombro: braco.position.y + meiaAltura(braco),
    };
  };

  it("dá 1,80 m às duas figuras, a mesma altura do entregador do arquivo", () => {
    FIGURAS.forEach(figura => {
      const medida = medir(figura);
      expect(medida.altura).toBeCloseTo(ALTURA_ALVO, 3);
      expect(medida.altura / ESCALA).toBeCloseTo(1.8, 3);
    });
  });

  it("apoia a sola no chão da própria figura, sem flutuar", () => {
    FIGURAS.forEach(figura => {
      expect(medir(figura).sola).toBeCloseTo(0, 3);
    });
  });

  it("dá cabeça de adulto, não de criança", () => {
    // Gente de verdade tem cabeca perto de 1/7,5 da altura. A figura antiga
    // tinha 29% — proporcao de crianca, e era isso que a tela mostrava.
    FIGURAS.forEach(figura => {
      const medida = medir(figura);
      expect(medida.cabeca / medida.altura).toBeLessThan(0.15);
      expect(medida.cabeca / medida.altura).toBeGreaterThan(0.11);
    });
  });

  it("põe o ombro na altura de ombro de gente (1,47 m)", () => {
    FIGURAS.forEach(figura => {
      expect(medir(figura).ombro / ESCALA).toBeCloseTo(1.47, 2);
    });
  });
});

/**
 * Costura de ambiente para os testes de motor: um `window` minimo (o jogo le
 * localStorage, teclado e timers a partir dele) e uma cena Babylon sem GPU.
 * Nenhum teste pode depender de navegador real, mas tambem nao pode falsificar
 * a regra sob teste — aqui so vive infraestrutura.
 */
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import {
  CAMPAIGN_STORAGE_KEY,
  createDefaultCampaignState,
} from "../../client/src/game/GameState";
import {
  CAMPAIGN_SAVE_VERSION,
  type CampaignState,
} from "../../client/src/game/types";

/** O save da campanha e o unico estado externo do jogo. */
export class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

/** Instala um `window` de teste e devolve o armazenamento usado por ele. */
export function installBrowserWindow(
  storage: MemoryStorage = new MemoryStorage()
): MemoryStorage {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: storage,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      setTimeout: (handler: () => void, delay?: number): number =>
        Number(setTimeout(handler, delay)),
      clearTimeout: (handle?: number): void => clearTimeout(handle),
      innerWidth: 1280,
      innerHeight: 720,
    },
  });
  return storage;
}

/** Alvo de teclado exigido pelo construtor do mundo (hoje o jogo usa window). */
export const keyboardTarget = {
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
} as unknown as HTMLElement;

export interface NullScene {
  engine: NullEngine;
  scene: Scene;
  camera: FreeCamera;
  dispose(): void;
}

/** Cena Babylon completa, porem sem GPU: geometria e grafo sao reais. */
export function createNullScene(): NullScene {
  const engine = new NullEngine({
    renderWidth: 320,
    renderHeight: 180,
    textureSize: 512,
    deterministicLockstep: true,
    lockstepMaxSteps: 4,
  });
  const scene = new Scene(engine);
  const camera = new FreeCamera("test-camera", new Vector3(0, 6, -13), scene);
  return {
    engine,
    scene,
    camera,
    dispose(): void {
      scene.dispose();
      engine.dispose();
    },
  };
}

/** Grava um save v3 valido para que a loja carregue o estado pedido. */
export function seedCampaign(
  storage: MemoryStorage,
  overrides: Partial<CampaignState>
): CampaignState {
  const base = createDefaultCampaignState();
  const state: CampaignState = {
    ...base,
    ...overrides,
    vehicleLevels: { ...base.vehicleLevels, ...overrides.vehicleLevels },
    tireLevels: { ...base.tireLevels, ...overrides.tireLevels },
    buildingLevels: { ...base.buildingLevels, ...overrides.buildingLevels },
    equippedCompounds: {
      ...base.equippedCompounds,
      ...overrides.equippedCompounds,
    },
    tireCondition: { ...base.tireCondition, ...overrides.tireCondition },
    bikePartLevels: { ...base.bikePartLevels, ...overrides.bikePartLevels },
  };
  storage.setItem(
    CAMPAIGN_STORAGE_KEY,
    JSON.stringify({
      version: CAMPAIGN_SAVE_VERSION,
      savedAt: Date.now(),
      state,
    })
  );
  return state;
}

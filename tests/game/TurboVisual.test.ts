import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { beforeEach, describe, expect, it } from "vitest";
import { VEHICLES } from "../../client/src/game/config";
import { PlayerVehicle } from "../../client/src/game/PlayerVehicle";
import { GameWorld } from "../../client/src/game/GameWorld";
import {
  createNullScene,
  installBrowserWindow,
  keyboardTarget,
} from "./harness";

describe("Turbo Borracha XB visual contract", () => {
  // O jogo escuta o teclado na janela e usa timers dela no impacto.
  beforeEach(() => {
    installBrowserWindow();
  });

  it("transforms every vehicle without changing collision or leaking resources", () => {
    const engine = new NullEngine({
      renderWidth: 320,
      renderHeight: 180,
      textureSize: 512,
      deterministicLockstep: true,
      lockstepMaxSteps: 4,
    });
    const scene = new Scene(engine);
    const player = new PlayerVehicle(scene);

    for (const vehicle of VEHICLES) {
      player.setVehicle(vehicle);
      const collisionBefore = player.collisionHalfWidth;
      player.setTurboActive(true);
      for (let frame = 0; frame < 90; frame += 1) {
        player.update(1 / 60, 2, vehicle.speed);
      }

      expect(player.turboActive).toBe(true);
      expect(player.turboProgress).toBeGreaterThan(0.98);
      expect(player.collisionHalfWidth).toBe(collisionBefore);

      player.setTurboActive(false);
      for (let frame = 0; frame < 90; frame += 1) {
        player.update(1 / 60, 2, vehicle.speed);
      }
      expect(player.turboProgress).toBeLessThan(0.01);

      player.setTurboActive(true);
      player.update(0.1, 2, vehicle.speed);
      player.resetTurboVisual();
      expect(player.turboActive).toBe(false);
      expect(player.turboProgress).toBe(0);
    }

    player.dispose();
    expect(scene.meshes).toHaveLength(0);
    expect(scene.materials).toHaveLength(0);
    expect(scene.transformNodes).toHaveLength(0);
    scene.dispose();
    engine.dispose();
  });

  it("accelerates a route, breaks obstacles and awards Rota Perfeita", () => {
    const rendering = createNullScene();
    const world = new GameWorld(
      rendering.scene,
      rendering.camera,
      keyboardTarget,
      false,
      "menu",
      true
    );

    world.startRun("primeiro-pedal");
    const mutable = world as unknown as {
      run: { turboEnergy: number; integrity: number };
      onObstacle(kind: "cone" | "pothole"): void;
    };
    mutable.run.turboEnergy = 100;
    world.activateTurbo();
    const elapsedBefore = world.getSnapshot().run.elapsed;
    world.update(0.1);
    const active = world.getSnapshot();
    expect(active.run.turboActive).toBe(true);
    expect(active.run.elapsed - elapsedBefore).toBeGreaterThan(0.1);

    mutable.onObstacle("pothole");
    expect(world.getSnapshot().run.integrity).toBe(100);

    for (
      let frame = 0;
      frame < 240 && world.getSnapshot().mode === "running";
      frame += 1
    ) {
      world.update(1 / 60);
    }
    const result = world.getSnapshot().lastResult;
    expect(result?.success).toBe(true);
    expect(result?.perfectRoute).toBe(true);
    expect(result?.turboActivations).toBe(1);

    world.dispose();
    rendering.dispose();
  });
});

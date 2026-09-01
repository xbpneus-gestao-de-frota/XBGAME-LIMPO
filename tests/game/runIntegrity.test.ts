/**
 * O contrato do modo piloto: uma rota que já começou tem de acabar quando a
 * bicicleta acaba, o baú tem de respeitar a capacidade que o jogador comprou,
 * a barra de turbo tem de ter teto e a Rota Perfeita tem de custar o que
 * promete. Nada é montado à mão — a rota é reservada pelo caminho de
 * produção, restaurada do save e pilotada de verdade; o que se observa é o
 * HUD e o resultado publicado.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameWorld } from "../../client/src/game/GameWorld";
import {
  CAMPAIGN_STORAGE_KEY,
  CampaignStore,
} from "../../client/src/game/GameState";
import { getVehicle, vehicleCargoCapacity } from "../../client/src/game/config";
import { companyXpRequiredForLevel } from "../../client/src/game/progression";
import type { RunSnapshot } from "../../client/src/game/types";
import {
  createNullScene,
  installBrowserWindow,
  keyboardTarget,
  seedCampaign,
  type NullScene,
} from "./harness";

const FRAME = 1 / 60;
const FRAME_LIMIT = 60 * 120;
const ROUTE_ID = "bh-mesmo-dia";
/** O clima do contrato vem do dia local; fixar a data torna a rota repetível. */
const FIXED_DAY = new Date(2026, 0, 15, 12, 0, 0);
/** Capacidade da bicicleta nua: um volume, e nada além disso. */
const BIKE_CARGO_LIMIT = vehicleCargoCapacity(getVehicle("bike"), 1, 0);

interface BootedRun {
  world: GameWorld;
  scene: NullScene;
  duration: number;
}

const openScenes: NullScene[] = [];
const openWorlds: GameWorld[] = [];

/**
 * Reserva a rota pelo caminho de produção, grava no save o estado de corrida
 * pedido e deixa o mundo restaurá-lo. É o mesmo trajeto de quem fecha a aba
 * no meio de uma entrega e volta depois.
 */
const bootRestoredRun = (
  patch: Partial<RunSnapshot> | ((duration: number) => Partial<RunSnapshot>)
): BootedRun => {
  const storage = installBrowserWindow();
  seedCampaign(storage, {
    credits: 5_000,
    companyXp: companyXpRequiredForLevel(8),
    completedRouteIds: ["primeiro-pedal"],
    unlockedRegionIds: ["divinopolis", "belo-horizonte"],
  });
  const reservation = new CampaignStore().startPilotedRoute(ROUTE_ID);
  expect(reservation.ok).toBe(true);

  const duration = reservation.plan!.duration;
  const saved = JSON.parse(storage.getItem(CAMPAIGN_STORAGE_KEY)!) as {
    state: { activePilotedRun: { run: RunSnapshot } };
  };
  Object.assign(
    saved.state.activePilotedRun.run,
    typeof patch === "function" ? patch(duration) : patch
  );
  storage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(saved));

  const scene = createNullScene();
  const world = new GameWorld(scene.scene, scene.camera, keyboardTarget, false);
  world.resumeRun();
  openScenes.push(scene);
  openWorlds.push(world);
  return { world, scene, duration };
};

/** Roda até a rota fechar; devolve quantos quadros isso custou. */
const runToTheEnd = (world: GameWorld, from = 0): number => {
  let frames = from;
  while (world.getSnapshot().mode === "running" && frames < FRAME_LIMIT) {
    world.update(FRAME);
    frames += 1;
  }
  return frames;
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FIXED_DAY);
});

afterEach(() => {
  openWorlds.splice(0).forEach(world => world.dispose());
  openScenes.splice(0).forEach(scene => scene.dispose());
  vi.useRealTimers();
});

describe("integridade e coleta durante a rota pilotada", () => {
  it("encerra a rota com a bicicleta destruída e sem integridade negativa", () => {
    const { world, duration } = bootRestoredRun({ integrity: 40 });
    const framesForWholeRoute = Math.ceil(duration / FRAME);

    let frames = 0;
    let lowest = Number.POSITIVE_INFINITY;
    while (world.getSnapshot().mode === "running" && frames < FRAME_LIMIT) {
      world.update(FRAME);
      frames += 1;
      lowest = Math.min(lowest, world.getSnapshot().run.integrity);
    }

    const snapshot = world.getSnapshot();
    const result = snapshot.lastResult!;
    // A rota acaba por dano, e antes de o cronômetro do contrato expirar.
    expect(snapshot.mode).toBe("result");
    expect(frames).toBeLessThan(framesForWholeRoute);
    expect(snapshot.run.impactSerial).toBeGreaterThan(0);
    expect(result.success).toBe(false);
    expect(result.aborted).toBe(false);
    // O HUD nunca mostra integridade negativa: o piso é zero.
    expect(lowest).toBe(0);
    expect(snapshot.run.integrity).toBe(0);
    expect(result.integrity).toBe(0);
  });

  it("recusa volumes acima da capacidade do baú", () => {
    expect(BIKE_CARGO_LIMIT).toBeGreaterThan(0);
    const { world, scene } = bootRestoredRun({
      cargo: BIKE_CARGO_LIMIT,
      integrity: 100,
    });
    const firstCargo = scene.scene.getTransformNodeByName("cargo-0")!;
    expect(firstCargo.isEnabled()).toBe(true);

    let frames = 0;
    let collected = false;
    while (world.getSnapshot().mode === "running" && frames < FRAME_LIMIT) {
      world.update(FRAME);
      frames += 1;
      if (!firstCargo.isEnabled()) {
        collected = true;
        break;
      }
    }

    const run = world.getSnapshot().run;
    // O volume saiu mesmo da pista...
    expect(collected).toBe(true);
    // ...e ainda assim o baú cheio não guardou nada a mais, nem pontuou combo.
    expect(run.cargo).toBe(BIKE_CARGO_LIMIT);
    expect(run.combo).toBe(0);

    runToTheEnd(world, frames);
    const result = world.getSnapshot().lastResult!;
    // O assunto deste teste e o bau cheio, e ele continua cheio no fim. Terminar
    // vivo deixou de ser garantido quando a rota passou de 15 s para o piso de
    // 30 s: aqui ninguem desvia, e meio minuto de cone derruba a integridade.
    // Isso e a rota mais longa cobrando pilotagem, nao um defeito do bau.
    expect(result.cargo).toBe(BIKE_CARGO_LIMIT);
  });

  it("mantém a barra do Turbo Borracha no teto de 100%", () => {
    const { world } = bootRestoredRun({ turboEnergy: 100, integrity: 100 });

    let frames = 0;
    let highest = 0;
    while (world.getSnapshot().mode === "running" && frames < FRAME_LIMIT) {
      world.update(FRAME);
      frames += 1;
      const run = world.getSnapshot().run;
      highest = Math.max(highest, run.turboEnergy);
      if (run.tireTokens > 0) break;
    }

    const run = world.getSnapshot().run;
    // Um token de borracha foi recolhido com a barra já cheia.
    expect(run.tireTokens).toBeGreaterThan(0);
    expect(highest).toBe(100);
    expect(run.turboEnergy).toBe(100);
  });
});

describe("bônus de Rota Perfeita", () => {
  /** Restaura a rota a um passo do fim para que ela feche por tempo. */
  const finishCleanRoute = (patch: Partial<RunSnapshot>) => {
    const { world } = bootRestoredRun(duration => ({
      elapsed: duration - 0.01,
      integrity: 100,
      ...patch,
    }));
    runToTheEnd(world);
    const result = world.getSnapshot().lastResult!;
    expect(result.success).toBe(true);
    expect(result.integrity).toBe(100);
    return result;
  };

  it("não paga o bônus sem nenhuma ativação do Turbo Borracha", () => {
    const result = finishCleanRoute({
      turboActivations: 0,
      perfectRouteEligible: true,
    });
    expect(result.turboActivations).toBe(0);
    expect(result.perfectRoute).toBe(false);
    expect(result.perfectRouteBonusCredits).toBe(0);
  });

  it("não paga o bônus depois de um impacto, mesmo com a lataria inteira", () => {
    const result = finishCleanRoute({
      turboActivations: 2,
      perfectRouteEligible: false,
    });
    expect(result.turboActivations).toBe(2);
    expect(result.perfectRoute).toBe(false);
    expect(result.perfectRouteBonusCredits).toBe(0);
  });

  it("paga o bônus quando turbo e rota limpa acontecem juntos", () => {
    const result = finishCleanRoute({
      turboActivations: 2,
      perfectRouteEligible: true,
    });
    expect(result.perfectRoute).toBe(true);
    expect(result.perfectRouteBonusCredits).toBeGreaterThan(0);
  });
});

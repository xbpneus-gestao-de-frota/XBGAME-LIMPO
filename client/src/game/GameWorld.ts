/**
 * Babylon renders the piloted contract; CampaignStore owns its commercial and
 * progression rules. A fixed simulation step keeps time, distance and score
 * stable across 30/60/120 Hz devices.
 */
import type { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import {
  RUN_DURATION_SECONDS,
  VEHICLES,
  getVehicle,
  vehicleCargoCapacity,
} from "./config";
import { CampaignStore, type StartRunResult } from "./GameState";
import { deliveryCameraCue } from "./deliveryExperience";
import { goldenRouteCameraScale } from "./goldenRouteLayout";
import { PlayerVehicle } from "./PlayerVehicle";
import { RoadSystem } from "./RoadSystem";
import { collectibleRewardBreakdown, perfectRouteReward } from "./rewards";
import {
  fixedStepBudget,
  gameplayKeyboardCommand,
  FIXED_SIMULATION_STEP,
  MAX_SIMULATION_FRAME_DELTA,
  scoreForStep,
} from "./simulation";
import type {
  BikePartId,
  BuildingId,
  GameListener,
  GameMode,
  GameSnapshot,
  RouteRunPlan,
  RunResult,
  RunSnapshot,
  TireCompoundId,
  TireStat,
  VehicleId,
} from "./types";

const emptyRun = (): RunSnapshot => ({
  elapsed: 0,
  duration: RUN_DURATION_SECONDS,
  progress: 0,
  distance: 0,
  integrity: 100,
  cargo: 0,
  tireTokens: 0,
  score: 0,
  combo: 0,
  impactSerial: 0,
  paused: false,
  laneIndex: 1,
  turboEnergy: 0,
  turboActive: false,
  turboSecondsRemaining: 0,
  turboActivations: 0,
  perfectRouteEligible: true,
});

/** Reaproveitado por quadro: setTarget alocava um Vector3 por passo fixo. */
const CAMERA_TARGET = new Vector3(0, 0, 0);

const TURBO_DURATION_SECONDS = 4.8;
const TURBO_SPEED_MULTIPLIER = 1.45;
const TURBO_TIME_MULTIPLIER = 1.35;
const TURBO_TIRE_ENERGY = 34;

type VehicleCameraProfile = Readonly<{
  positionY: number;
  positionZ: number;
  targetY: number;
  targetZ: number;
  fov: number;
}>;

export const VEHICLE_CAMERA_PROFILES: Readonly<
  Record<VehicleId, VehicleCameraProfile>
> = Object.freeze({
  bike: {
    positionY: 5.6,
    positionZ: -12,
    targetY: 1.3,
    targetZ: 9.5,
    fov: 0.78,
  },
  moto: {
    positionY: 5.9,
    positionZ: -13,
    targetY: 1.35,
    targetZ: 10,
    fov: 0.8,
  },
  van: {
    positionY: 6.8,
    positionZ: -15.2,
    targetY: 1.55,
    targetZ: 11,
    fov: 0.82,
  },
  truck: {
    positionY: 7.7,
    positionZ: -17.4,
    targetY: 1.9,
    targetZ: 12.2,
    fov: 0.84,
  },
  fleet: {
    positionY: 8.5,
    positionZ: -19.5,
    targetY: 2.2,
    targetZ: 13.5,
    fov: 0.86,
  },
  planetary: {
    positionY: 9.8,
    positionZ: -23,
    targetY: 2.8,
    targetZ: 15,
    fov: 0.9,
  },
});

export class GameWorld {
  private readonly store: CampaignStore;
  private readonly player: PlayerVehicle;
  private readonly road: RoadSystem;
  private readonly listeners = new Set<GameListener>();
  private mode: GameMode;
  private run = emptyRun();
  private activePlan: RouteRunPlan | null = null;
  private lastResult: RunResult | null = null;
  private notice: string | null = null;
  private publishAccumulator = 0;
  private simulationAccumulator = 0;
  private runPersistenceAccumulator = 0;
  private demoDecisionTimer = 0;
  private turboActivations = 0;
  private readonly keyHandler: (event: KeyboardEvent) => void;

  constructor(
    scene: Scene,
    private readonly camera: FreeCamera,
    private readonly keyboardTarget: HTMLElement,
    readonly isDemo: boolean,
    initialMode?: GameMode,
    freshCampaign = false
  ) {
    this.store = new CampaignStore(
      isDemo || Boolean(initialMode && !freshCampaign),
      freshCampaign
    );
    this.player = new PlayerVehicle(scene);
    this.road = new RoadSystem(scene);
    const restored = this.store.restorablePilotedRun;
    const vehicle = getVehicle(
      restored?.plan.vehicleId ?? this.store.value.selectedVehicleId
    );
    this.player.setVehicle(vehicle);
    if (restored) {
      this.activePlan = restored.plan;
      this.run = { ...restored.run, paused: true };
      this.mode = "running";
      this.notice = "Rota restaurada em pausa. Continue quando estiver pronto.";
      this.road.setRouteEnvironment(
        vehicle,
        restored.plan.terrain,
        restored.plan.weather,
        restored.plan.compoundId
      );
      this.road.reset(
        `${restored.plan.routeId}:${restored.plan.weather}:${restored.plan.compoundId}`
      );
      this.road.setRunProgress(this.run.progress);
      this.store.updatePilotedRun(this.run);
      this.player.setTurboActive(this.run.turboActive);
      this.player.moveToLane(this.run.laneIndex);
      this.turboActivations = this.run.turboActivations;
    } else {
      this.road.setEra(vehicle);
      this.mode = isDemo ? "running" : (initialMode ?? "menu");
    }

    this.keyHandler = event => this.onKeyDown(event);
    // Na janela, nao no canvas: preso ao canvas, o jogo ficava sem controle
    // assim que o foco ia para qualquer botao da tela, sem nenhum aviso.
    window.addEventListener("keydown", this.keyHandler);

    if (isDemo && !restored) this.startRun();
  }

  /** Nos da pista procedural, para o pacote de assets reais poder esconde-los. */
  roadSurfaceNodes(): AbstractMesh[] {
    return this.road.roadSurfaceNodes();
  }

  /** Leituras baratas para o laco de render: sem clone, sem snapshot. */
  get selectedVehicleId(): VehicleId {
    return this.store.current.selectedVehicleId;
  }

  get isRunActive(): boolean {
    return this.mode === "running" && !this.run.paused;
  }

  subscribe(listener: GameListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): GameSnapshot {
    return {
      mode: this.mode,
      campaign: this.store.value,
      now: Date.now(),
      run: {
        ...this.run,
        laneIndex: this.player.lane,
        score: Math.round(this.run.score),
      },
      lastResult: this.lastResult ? { ...this.lastResult } : null,
      vehicles: VEHICLES,
      notice: this.notice,
      isDemo: this.isDemo,
    };
  }

  update(delta: number): void {
    const frameDelta = Math.min(MAX_SIMULATION_FRAME_DELTA, Math.max(0, delta));
    if (this.mode !== "running" || this.run.paused || !this.activePlan) {
      this.publishAccumulator += frameDelta;
      if (
        this.store.current.activeDeliveries.length > 0 &&
        this.publishAccumulator >= 0.25
      ) {
        this.publishAccumulator = 0;
        this.publish();
      }
      return;
    }

    const budget = fixedStepBudget(this.simulationAccumulator, frameDelta);
    this.simulationAccumulator = budget.remainder;
    for (
      let step = 0;
      step < budget.steps && this.mode === "running" && !this.run.paused;
      step += 1
    ) {
      this.stepRun(FIXED_SIMULATION_STEP);
    }

    if (this.activePlan) this.updateCamera(frameDelta);

    this.runPersistenceAccumulator += frameDelta;
    if (this.runPersistenceAccumulator >= 0.5 && this.activePlan) {
      this.runPersistenceAccumulator = 0;
      this.store.updatePilotedRun(this.run, true);
    }

    this.publishAccumulator += frameDelta;
    if (this.publishAccumulator >= 0.1) {
      this.publishAccumulator = 0;
      this.publish();
    }
  }

  startRun(routeId?: string): void {
    if (this.mode === "running" && this.activePlan) {
      this.notice = "Finalize ou aborte a rota atual antes de iniciar outra.";
      this.publish();
      return;
    }
    const started = this.store.startPilotedRoute(routeId);
    if (!started.ok || !started.plan) {
      this.notice = started.message;
      if (this.mode === "running") this.mode = "routes";
      this.publish();
      return;
    }

    const plan = started.plan;
    const vehicle = getVehicle(plan.vehicleId);
    this.activePlan = plan;
    this.run = {
      ...(started.run ?? emptyRun()),
      duration: this.isDemo ? Math.min(36, plan.duration) : plan.duration,
      routeId: plan.routeId,
      vehicleId: plan.vehicleId,
      compoundId: plan.compoundId,
      terrain: plan.terrain,
      weather: plan.weather,
      tireFit: plan.tireFit,
      grossReward: plan.grossReward,
      operatingCost: plan.operatingCost,
      projectedNetReward: plan.netReward,
      expectedWear: plan.expectedWear,
    };
    this.lastResult = null;
    this.notice = started.message;
    this.mode = "running";
    this.turboActivations = this.run.turboActivations;
    this.simulationAccumulator = 0;
    this.runPersistenceAccumulator = 0;
    this.demoDecisionTimer = 0;
    this.player.setVehicle(vehicle);
    this.player.resetTurboVisual();
    this.player.setTurboActive(this.run.turboActive);
    this.player.moveToLane(this.run.laneIndex);
    this.run.laneIndex = this.player.lane;
    this.road.setRouteEnvironment(
      vehicle,
      plan.terrain,
      plan.weather,
      plan.compoundId
    );
    this.road.reset(`${plan.routeId}:${plan.weather}:${plan.compoundId}`);
    this.road.setRunProgress(this.run.progress);
    this.publish();
  }

  pauseRun(): void {
    if (this.mode !== "running" || !this.activePlan || this.run.paused) return;
    this.run.paused = true;
    this.simulationAccumulator = 0;
    this.store.updatePilotedRun(this.run, true);
    this.notice = "Rota pausada.";
    this.publish();
  }

  resumeRun(): void {
    if (this.mode !== "running" || !this.activePlan || !this.run.paused) return;
    this.run.paused = false;
    this.simulationAccumulator = 0;
    this.store.updatePilotedRun(this.run, true);
    this.notice = null;
    this.publish();
  }

  abortRun(): void {
    if (this.mode !== "running" || !this.activePlan) return;
    this.run.paused = false;
    this.finishRun(false, true);
  }

  activateTurbo(): void {
    if (
      this.mode !== "running" ||
      this.run.paused ||
      !this.activePlan ||
      this.run.turboActive
    )
      return;
    if (this.run.turboEnergy < 100) {
      this.notice = `Turbo Borracha XB carregando: ${Math.round(this.run.turboEnergy)}%.`;
      this.publish();
      return;
    }
    this.run.turboEnergy = 0;
    this.run.turboActive = true;
    this.run.turboSecondsRemaining = TURBO_DURATION_SECONDS;
    this.turboActivations += 1;
    this.run.turboActivations = this.turboActivations;
    this.player.setTurboActive(true);
    this.notice = "TURBO BORRACHA XB! Sulcos energizados e rota protegida.";
    this.store.updatePilotedRun(this.run);
    this.publish();
  }

  moveLeft(): void {
    if (this.mode !== "running" || this.run.paused) return;
    this.player.move(-1);
    this.run.laneIndex = this.player.lane;
    this.store.updatePilotedRun(this.run);
    this.publish();
  }

  moveRight(): void {
    if (this.mode !== "running" || this.run.paused) return;
    this.player.move(1);
    this.run.laneIndex = this.player.lane;
    this.store.updatePilotedRun(this.run);
    this.publish();
  }

  goBase(): void {
    if (this.mode === "running" && this.activePlan) this.abortRun();
    this.mode = "base";
    this.notice = null;
    this.lastResult = null;
    this.publish();
  }

  goRoutes(): void {
    if (this.mode === "running" && this.activePlan) this.abortRun();
    this.mode = "routes";
    this.notice = null;
    this.lastResult = null;
    this.publish();
  }

  goGarage(): void {
    if (this.mode === "running" && this.activePlan) this.abortRun();
    this.mode = "garage";
    this.notice = null;
    this.lastResult = null;
    this.publish();
  }

  goMenu(): void {
    if (this.mode === "running" && this.activePlan) this.abortRun();
    this.mode = "menu";
    this.notice = null;
    this.lastResult = null;
    this.publish();
  }

  buyVehicle(id: VehicleId): void {
    const vehicle = getVehicle(id);
    const result = this.store.buyVehicle(vehicle);
    this.notice = result.message;
    if (result.ok) {
      this.player.setVehicle(vehicle);
      this.road.setEra(vehicle);
    }
    this.publish();
  }

  selectVehicle(id: VehicleId): void {
    const result = this.store.selectVehicle(id);
    this.notice = result.message;
    if (result.ok) {
      const vehicle = getVehicle(id);
      this.player.setVehicle(vehicle);
      this.road.setEra(vehicle);
    }
    this.publish();
  }

  upgradeVehicle(id: VehicleId): void {
    const result = this.store.upgradeVehicle(id);
    this.notice = result.message;
    this.publish();
  }

  upgradeTire(stat: TireStat): void {
    const result = this.store.upgradeTire(stat);
    this.notice = result.message;
    this.publish();
  }

  upgradeBikePart(partId: BikePartId): void {
    const result = this.store.upgradeBikePart(partId);
    this.notice = result.message;
    this.publish();
  }

  /** Guarda quem a pessoa e, vindo da tela de boas-vindas. */
  definirJogador(nome: string, entregadorId: string) {
    const resultado = this.store.definirJogador(nome, entregadorId);
    this.notice = resultado.message;
    this.publish();
    return resultado;
  }

  /** Esquece o nome e o entregador, para a apresentacao acontecer de novo. */
  esquecerJogador() {
    const r = this.store.esquecerJogador();
    this.notice = r.message;
    this.publish();
    return r;
  }

  buyBikeUnit(): void {
    const result = this.store.buyBikeUnit();
    this.notice = result.message;
    this.publish();
  }

  /** Compra mais uma unidade de qualquer classe: moto, van, caminhao, carreta. */
  buyVehicleUnit(veiculo: VehicleId): void {
    const result = this.store.buyVehicleUnit(veiculo);
    this.notice = result.message;
    this.publish();
  }

  hireCourier(): void {
    const result = this.store.hireCourier();
    this.notice = result.message;
    this.publish();
  }

  /*
   * A primeira bicicleta, entregue a mao ao amigo. Chamada pela CENA da
   * abertura, e nao por um botao: aqui nao ha preco nem escolha.
   *
   * Nao mostra recado quando falha, e de proposito: a unica falha possivel e
   * a cena ter acontecido duas vezes, e avisar "ele ja esta com a bicicleta"
   * no meio do bairro so confundiria quem esta jogando.
   */
  entregarAPrimeiraBike(nome: string, candidatoId: string): void {
    const result = this.store.entregarAPrimeiraBike(nome, candidatoId);
    if (!result.ok) return;
    this.notice = result.message;
    this.publish();
  }

  /*
   * Quem entra junto com o Renan, sem preco (ver GameState.chegarNaEquipe).
   * Como a primeira bicicleta, nao avisa quando falha: a unica falha e ja ter
   * acontecido.
   */
  chegarNaEquipe(candidatoId: string): void {
    const result = this.store.chegarNaEquipe(candidatoId);
    if (!result.ok) return;
    this.notice = result.message;
    this.publish();
  }

  /** Contrata um operador para dirigir uma classe. */
  hireOperator(veiculo: VehicleId): void {
    const result = this.store.hireOperator(veiculo);
    this.notice = result.message;
    this.publish();
  }

  maintainBike(): void {
    const result = this.store.maintainBike();
    this.notice = result.message;
    this.publish();
  }

  equipCompound(vehicleId: VehicleId, compoundId: TireCompoundId): void {
    const result = this.store.equipCompound(vehicleId, compoundId);
    this.notice = result.message;
    this.publish();
  }

  maintainVehicleTires(vehicleId: VehicleId): void {
    const result = this.store.maintainVehicleTires(vehicleId);
    this.notice = result.message;
    this.publish();
  }

  upgradeBuilding(id: BuildingId): void {
    const result = this.store.upgradeBuilding(id);
    this.notice = result.message;
    this.publish();
  }

  dispatchRoute(routeId: string): void {
    const result = this.store.dispatchRoute(routeId);
    this.notice = result.message;
    this.publish();
  }

  dispatchAutomatedRoute(routeId: string): void {
    const result = this.store.dispatchAutomatedRoute(routeId);
    this.notice = result.message;
    this.publish();
  }

  previewRoute(routeId: string): StartRunResult {
    return this.store.previewRoute(routeId);
  }

  collectDelivery(instanceId: string): void {
    const delivery = this.store.current.activeDeliveries.find(
      item => item.instanceId === instanceId
    );
    const result = this.store.collectDelivery(instanceId);
    this.notice = result.message;
    if (result.ok && delivery?.routeId === "rede-solar-final") {
      this.mode = "complete";
    }
    this.publish();
  }

  claimDailyMission(id: string): void {
    const result = this.store.claimDailyMission(id);
    this.notice = result.message;
    this.publish();
  }

  resetProgress(): void {
    this.store.reset();
    const vehicle = getVehicle(this.store.value.selectedVehicleId);
    this.player.setVehicle(vehicle);
    this.road.setEra(vehicle);
    this.activePlan = null;
    this.run = emptyRun();
    this.lastResult = null;
    this.notice = "Campanha reiniciada. A primeira entrega está pronta.";
    this.turboActivations = 0;
    this.player.setTurboActive(false);
    this.player.resetTurboVisual();
    this.road.setRunProgress(0);
    this.mode = "menu";
    this.publish();
  }

  dispose(): void {
    if (this.activePlan) this.store.updatePilotedRun(this.run, true);
    window.removeEventListener("keydown", this.keyHandler);
    this.listeners.clear();
    this.player.dispose();
    this.road.dispose();
  }

  private stepRun(delta: number): void {
    const plan = this.activePlan;
    if (!plan) return;
    const campaign = this.store.current;
    const vehicle = getVehicle(plan.vehicleId);
    const vehicleLevel = campaign.vehicleLevels[plan.vehicleId] || 1;
    const conditionFactor = 0.82 + (plan.conditionAtStart / 100) * 0.18;
    const fitFactor =
      plan.tireFit === "ideal" ? 1.06 : plan.tireFit === "risky" ? 0.82 : 1;
    const weatherFactor =
      plan.weather === "storm"
        ? 0.86
        : plan.weather === "rain" || plan.weather === "dust"
          ? 0.93
          : 1;
    const terrainFactor =
      plan.terrain === "offroad"
        ? 0.9
        : plan.terrain === "planetary"
          ? 0.94
          : 1;
    if (this.run.turboActive) {
      this.run.turboSecondsRemaining = Math.max(
        0,
        this.run.turboSecondsRemaining - delta
      );
      if (this.run.turboSecondsRemaining <= 0) {
        this.run.turboActive = false;
        this.player.setTurboActive(false);
      }
    }
    const turboFactor = this.run.turboActive ? TURBO_SPEED_MULTIPLIER : 1;
    const routeTimeFactor = this.run.turboActive ? TURBO_TIME_MULTIPLIER : 1;
    const effectiveSpeed =
      vehicle.speed *
      (1 + (vehicleLevel - 1) * 0.05) *
      conditionFactor *
      fitFactor *
      weatherFactor *
      terrainFactor *
      turboFactor;

    this.run.elapsed = Math.min(
      this.run.duration,
      this.run.elapsed + delta * routeTimeFactor
    );
    this.run.progress = Math.min(1, this.run.elapsed / this.run.duration);
    this.run.distance = plan.distance * this.run.progress;
    this.run.score += scoreForStep(effectiveSpeed, delta, this.run.combo);
    // update() logo abaixo reposiciona tudo; pedir pose aqui era passada dupla.
    this.road.setRunProgress(this.run.progress, false);

    this.player.update(delta, campaign.tireLevels.grip, effectiveSpeed);
    this.run.laneIndex = this.player.lane;
    this.road.update(
      delta,
      effectiveSpeed,
      this.player.x,
      this.player.collisionHalfWidth,
      kind => this.onPickup(kind),
      kind => this.onObstacle(kind)
    );

    if (this.isDemo) {
      this.demoDecisionTimer -= delta;
      if (this.demoDecisionTimer <= 0) {
        this.player.moveToLane(this.road.getSuggestedLane());
        this.run.laneIndex = this.player.lane;
        this.demoDecisionTimer = 1.25;
      }
    }

    if (this.run.elapsed >= this.run.duration) this.finishRun(true);
    else if (this.run.integrity <= 0) this.finishRun(false);
  }

  /**
   * Camera e apresentacao, nao simulacao: uma passada por quadro renderizado.
   * Dentro do passo fixo isso montava e invertia uma matriz ate 30 vezes num
   * unico quadro depois de um engasgo.
   */
  private updateCamera(delta: number): void {
    const plan = this.activePlan;
    if (!plan) return;
    const vehicle = getVehicle(plan.vehicleId);
    const cameraCue = deliveryCameraCue(this.run.progress);
    const curveCue = this.road.getCameraCue();
    const cameraProfile = VEHICLE_CAMERA_PROFILES[vehicle.id];
    const cameraEase = 1 - Math.exp(-delta * 3.4);
    const cinematic = cameraCue.cinematicBlend;
    const viewportAspect =
      typeof window !== "undefined" && window.innerHeight > 0
        ? window.innerWidth / window.innerHeight
        : 1;
    const cameraScale = goldenRouteCameraScale(viewportAspect);
    const curveLook =
      (curveCue.offsetX * 0.58 + curveCue.yaw * 7.5) * cameraScale;
    const positionY = cameraProfile.positionY - cinematic * 0.7;
    const positionZ = cameraProfile.positionZ + cinematic * 1.45;
    const targetY = cameraProfile.targetY + cinematic * 0.45;
    const targetZ = cameraProfile.targetZ - cinematic * 2.7;
    const fov = cameraProfile.fov - cinematic * 0.08;
    const cameraX =
      this.player.x * 0.14 + curveCue.offsetX * 0.18 * cameraScale;
    const targetX = this.player.x * 0.12 + curveLook;
    this.camera.position.x += (cameraX - this.camera.position.x) * cameraEase;
    this.camera.position.y += (positionY - this.camera.position.y) * cameraEase;
    this.camera.position.z += (positionZ - this.camera.position.z) * cameraEase;
    this.camera.fov += (fov - this.camera.fov) * cameraEase;
    CAMERA_TARGET.set(targetX, targetY, targetZ);
    this.camera.setTarget(CAMERA_TARGET);
  }

  private onPickup(kind: "cargo" | "tire"): void {
    const campaign = this.store.current;
    const vehicleId = this.activePlan?.vehicleId ?? campaign.selectedVehicleId;
    const vehicle = getVehicle(vehicleId);
    const cargoLimit = vehicleCargoCapacity(
      vehicle,
      campaign.vehicleLevels[vehicleId] || 1,
      campaign.tireLevels.capacity
    );
    if (kind === "cargo") {
      if (this.run.cargo < cargoLimit) {
        this.run.cargo += 1;
        this.run.combo += 1;
        this.run.score += 220 * Math.max(1, this.run.combo);
      } else {
        this.run.score += 80;
      }
    } else {
      this.run.tireTokens += 1;
      this.run.combo += 1;
      this.run.integrity = Math.min(100, this.run.integrity + 4);
      this.run.turboEnergy = Math.min(
        100,
        this.run.turboEnergy + TURBO_TIRE_ENERGY
      );
      this.run.score += 310 * Math.max(1, this.run.combo);
    }
    this.store.updatePilotedRun(this.run);
    this.publish();
  }

  private onObstacle(kind: "cone" | "pothole"): void {
    if (this.run.turboActive) {
      this.run.combo += 1;
      this.run.score += 650 * Math.max(1, this.run.combo);
      this.store.updatePilotedRun(this.run);
      this.publish();
      return;
    }
    const campaign = this.store.current;
    const plan = this.activePlan;
    const durability = campaign.tireLevels.durability;
    const tireCondition = plan?.conditionAtStart ?? 100;
    const conditionPenalty = Math.round((100 - tireCondition) / 20);
    const fitPenalty =
      plan?.tireFit === "risky" ? 6 : plan?.tireFit === "ideal" ? -2 : 0;
    const weatherPenalty =
      plan?.weather === "storm" || plan?.weather === "rain" ? 3 : 0;
    const obstacleBase = kind === "pothole" ? 28 : 22;
    const damage = Math.max(
      7,
      obstacleBase -
        durability * 3 +
        conditionPenalty +
        fitPenalty +
        weatherPenalty
    );
    this.run.integrity = Math.max(0, this.run.integrity - damage);
    this.run.combo = 0;
    this.run.impactSerial += 1;
    this.run.perfectRouteEligible = false;
    this.player.pulseImpact();
    this.store.updatePilotedRun(this.run);
    this.publish();
  }

  private finishRun(success: boolean, aborted = false): void {
    if (this.mode !== "running" || !this.activePlan) return;
    const plan = this.activePlan;
    const vehicle = getVehicle(plan.vehicleId);
    const integrityMultiplier = 0.72 + this.run.integrity * 0.0028;
    const completionMultiplier = aborted ? 0 : success ? 1 : 0.18;
    const collectibleBreakdown = collectibleRewardBreakdown({
      baseReward: plan.grossReward,
      vehicleOrder: vehicle.order,
      cargoCount: this.run.cargo,
      tireTokenCount: this.run.tireTokens,
    });
    const perfectRoute = Boolean(
      success &&
        this.run.perfectRouteEligible &&
        this.run.integrity >= 99 &&
        this.turboActivations > 0
    );
    const baseCreditsEarned = Math.max(
      0,
      Math.round(plan.grossReward * integrityMultiplier * completionMultiplier)
    );
    const cargoBonusCredits = Math.max(
      0,
      Math.round(collectibleBreakdown.cargoBonus * completionMultiplier)
    );
    const tireTokenBonusCredits = Math.max(
      0,
      Math.round(collectibleBreakdown.tireTokenBonus * completionMultiplier)
    );
    const collectibleBonusCredits = cargoBonusCredits + tireTokenBonusCredits;
    const perfectRouteBonusCredits = Math.max(
      0,
      Math.round(
        perfectRouteReward(plan.grossReward, perfectRoute) *
          completionMultiplier
      )
    );
    const grossCreditsEarned =
      baseCreditsEarned + collectibleBonusCredits + perfectRouteBonusCredits;
    const netCreditsEarned = grossCreditsEarned - plan.operatingCost;
    const reputationEarned = Math.max(
      0,
      Math.round(
        (plan.reputationReward + this.run.cargo * 3 + this.run.tireTokens * 2) *
          completionMultiplier
      )
    );
    const tireWear = Math.ceil(
      plan.expectedWear * (success ? 1 : aborted ? 0.65 : 1.25)
    );

    this.run.distance = success ? plan.distance : Math.round(this.run.distance);
    this.lastResult = {
      success,
      aborted,
      creditsEarned: netCreditsEarned,
      grossCreditsEarned,
      baseCreditsEarned,
      collectibleBonusCredits,
      cargoBonusCredits,
      tireTokenBonusCredits,
      collectibleBonusCap: collectibleBreakdown.cap,
      perfectRouteBonusCredits,
      operatingCost: plan.operatingCost,
      netCreditsEarned,
      reputationEarned,
      xpEarned: success ? plan.xpReward : 0,
      distance: Math.round(this.run.distance),
      cargo: this.run.cargo,
      tireTokens: this.run.tireTokens,
      integrity: Math.round(this.run.integrity),
      routeId: plan.routeId,
      vehicleId: plan.vehicleId,
      tireWear,
      tireFit: plan.tireFit,
      perfectRoute,
      turboActivations: this.turboActivations,
    };
    this.store.applyRunResult(this.lastResult);
    this.activePlan = null;
    this.run.turboActive = false;
    this.run.turboSecondsRemaining = 0;
    this.player.setTurboActive(false);
    this.player.resetTurboVisual();
    this.turboActivations = 0;
    this.simulationAccumulator = 0;
    this.mode =
      success && plan.routeId === "rede-solar-final" ? "complete" : "result";
    this.notice = aborted
      ? "Rota abortada. Os custos já mobilizados não são reembolsáveis."
      : success
        ? `Contrato concluído. Lucro líquido XB$ ${netCreditsEarned}.`
        : "Rota interrompida. Revise os pneus antes de voltar.";
    this.publish();
  }

  /** Campos de texto tem prioridade; botao focado fica com Espaco e Enter. */
  private shouldIgnoreKey(event: KeyboardEvent): boolean {
    const target = document.activeElement as HTMLElement | null;
    if (!target) return false;
    const tag = target.tagName;
    if (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      target.isContentEditable
    ) {
      return true;
    }
    const isActivationKey =
      event.code === "Space" || event.key === " " || event.key === "Enter";
    return isActivationKey && (tag === "BUTTON" || tag === "A");
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.shouldIgnoreKey(event)) return;
    if (
      (event.code === "Space" || event.key === " ") &&
      this.mode === "running" &&
      !this.run.paused
    ) {
      event.preventDefault();
      this.activateTurbo();
      return;
    }
    const command = gameplayKeyboardCommand(
      event.key,
      this.mode === "running",
      this.run.paused
    );
    if (!command) return;
    event.preventDefault();
    if (command === "left") this.moveLeft();
    else if (command === "right") this.moveRight();
    else if (command === "pause") this.pauseRun();
    else this.resumeRun();
  }

  private publish(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(listener => listener(snapshot));
  }
}

import type { Material } from "@babylonjs/core/Materials/material";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { LANE_POSITIONS } from "./config";
import { TurboVisual } from "./TurboVisual";
import type { VehicleConfig } from "./types";

interface WheelAssembly {
  pivot: TransformNode;
  rollingMeshes: Mesh[];
  baseY: number;
  phase: number;
  steerable: boolean;
}

interface DriverOptions {
  x: number;
  y: number;
  z: number;
  scale: number;
  lean?: number;
  visor?: boolean;
  spaceSuit?: boolean;
  handsForward?: number;
  handsWide?: number;
  legsVisible?: boolean;
  steeringWheel?: boolean;
}

/**
 * Procedural, asset-free player vehicle art. Each era has a unique silhouette,
 * while shared PBR materials and compact primitives keep mobile cost bounded.
 */
// Caixa de entrega da bike medida no asset real: 35 x 40 x 35 cm a 0.023 u/cm.
// A altura 0.92 e a que faz o fundo da caixa cair exatamente sobre o bagageiro
// (1.886 - 0.46 = 1.426) e a largura 0.80 e a que poe a lateral direita em
// 0.40, onde fica a origem do logo (+0.409) da tabela.
const XB_CARGO_BOX = Object.freeze({
  width: 0.8,
  height: 0.92,
  depth: 0.8,
  bandHeight: 0.26,
  bandOverhang: 0.016,
});

export class PlayerVehicle {
  readonly root: TransformNode;
  private laneIndex: 0 | 1 | 2 = 1;
  private currentX = 0;
  private currentCollisionWidth = 0.9;
  private animationClock = 0;
  private impactResetTimer: number | undefined;
  private modelRoot: TransformNode | null = null;
  private bodyPivot: TransformNode | null = null;
  private driverPivot: TransformNode | null = null;
  private driverBaseY = 0;
  private driverBaseScale = 1;
  private driverBaseRotationX = 0;
  private readonly wheels: WheelAssembly[] = [];
  private readonly ownedMaterials: Material[] = [];
  private readonly turboVisual: TurboVisual;

  private readonly navy: PBRMaterial;
  private readonly steelBlue: PBRMaterial;
  private readonly cyan: PBRMaterial;
  private readonly ice: PBRMaterial;
  private readonly rubber: PBRMaterial;
  private readonly metal: PBRMaterial;
  private readonly darkMetal: PBRMaterial;
  private readonly skin: PBRMaterial;
  private readonly facialFeature: PBRMaterial;
  private readonly uniform: PBRMaterial;
  private readonly cargo: PBRMaterial;
  private readonly glass: StandardMaterial;
  private readonly headLamp: StandardMaterial;
  private readonly tailLamp: StandardMaterial;
  private readonly energy: StandardMaterial;
  private readonly xbBlack: PBRMaterial;
  private readonly xbTyre: PBRMaterial;
  private readonly xbMetal: PBRMaterial;
  private readonly xbWhite: PBRMaterial;
  private readonly xbNeon: StandardMaterial;

  constructor(private readonly scene: Scene) {
    this.root = new TransformNode("player-vehicle", scene);
    this.root.position.y = 0.05;

    this.navy = this.pbr("vehicle-paint-navy", "#0D1B33", 0.22, 0.28, 0.72);
    this.steelBlue = this.pbr(
      "vehicle-paint-steel-blue",
      "#12547A",
      0.18,
      0.32,
      0.62
    );
    this.cyan = this.pbr("vehicle-electric-cyan", "#18BFEA", 0.14, 0.3, 0.78);
    this.ice = this.pbr("vehicle-ice", "#EDF5F6", 0.08, 0.4, 0.32);
    this.rubber = this.pbr("vehicle-rubber", "#101418", 0.03, 0.88);
    this.metal = this.pbr("vehicle-metal", "#7A8993", 0.72, 0.28);
    this.darkMetal = this.pbr("vehicle-midnight", "#091222", 0.66, 0.34);
    this.skin = this.pbr("mascot-skin", "#D6B7AA", 0.02, 0.72);
    this.facialFeature = this.pbr("mascot-features", "#091222", 0.02, 0.78);
    this.uniform = this.pbr("mascot-uniform", "#0D1B33", 0.04, 0.62);
    this.cargo = this.pbr("cargo-graphite", "#5E6A72", 0.16, 0.68);
    this.glass = this.standard("vehicle-glass", "#6FC5EA", 0.58, 0.55);
    this.glass.alpha = 0.48;
    this.glass.backFaceCulling = false;
    this.glass.needDepthPrePass = true;
    this.headLamp = this.standard("vehicle-headlamp", "#EDF5F6", 0.22, 0.9);
    this.headLamp.emissiveColor = Color3.FromHexString("#18BFEA").scale(0.88);
    this.tailLamp = this.standard("vehicle-taillamp", "#12547A", 0.3, 0.78);
    this.tailLamp.emissiveColor = Color3.FromHexString("#18BFEA").scale(0.7);
    this.energy = this.standard("vehicle-energy", "#18BFEA", 0.2, 0.88);
    this.energy.emissiveColor = Color3.FromHexString("#18BFEA").scale(0.78);
    // Cores lidas dos materiais do asset real da bike XB. Ficam separadas das
    // tintas genericas acima para que ajustar um veiculo nao desafine o outro.
    this.xbBlack = this.pbr("xb-bike-black", "#141414", 0.18, 0.52);
    this.xbTyre = this.pbr("xb-bike-tyre", "#0C0C0C", 0.02, 0.9);
    this.xbMetal = this.pbr("xb-bike-metal", "#A0A0A5", 0.78, 0.3);
    this.xbWhite = this.pbr("xb-bike-white", "#F3F3F3", 0.05, 0.42);
    this.xbNeon = this.standard("xb-bike-neon", "#00A2FF", 0.35);
    // Emissivo HDR do material neon original. A cena roda com tone mapping
    // ACES, entao o valor acima de 1 vira brilho em vez de estourar em branco;
    // e o emissivo bem acima do difuso que faz a peca ler como auto-iluminada.
    this.xbNeon.emissiveColor = new Color3(0, 2.5, 4.2);
    this.turboVisual = new TurboVisual(scene, this.root);
  }

  get x(): number {
    return this.currentX;
  }

  get collisionHalfWidth(): number {
    return this.currentCollisionWidth / 2;
  }

  get lane(): 0 | 1 | 2 {
    return this.laneIndex;
  }

  get turboProgress(): number {
    return this.turboVisual.progress;
  }

  get turboActive(): boolean {
    return this.turboVisual.active;
  }

  setTurboActive(active: boolean): void {
    this.turboVisual.setActive(active);
  }

  setTurboProgress(progress: number): void {
    this.turboVisual.setProgress(progress);
  }

  resetTurboVisual(): void {
    this.turboVisual.reset();
    this.applyTurboPose(0);
  }

  setVehicle(vehicle: VehicleConfig): void {
    this.modelRoot?.dispose(false, false);
    this.modelRoot = new TransformNode(
      `vehicle-model-${vehicle.id}`,
      this.scene
    );
    this.modelRoot.parent = this.root;
    this.bodyPivot = new TransformNode(
      `vehicle-body-${vehicle.id}`,
      this.scene
    );
    this.bodyPivot.parent = this.modelRoot;
    this.driverPivot = null;
    this.driverBaseY = 0;
    this.driverBaseScale = 1;
    this.driverBaseRotationX = 0;
    this.wheels.length = 0;
    this.animationClock = 0;
    this.root.rotation.set(0, 0, 0);
    this.root.scaling.set(1, 1, 1);
    this.currentCollisionWidth = vehicle.collisionWidth;

    if (vehicle.id === "bike") this.buildBike();
    else if (vehicle.id === "moto") this.buildMoto();
    else if (vehicle.id === "van") this.buildVan(vehicle.wheelCount);
    else if (vehicle.id === "truck") this.buildTruck(vehicle.wheelCount);
    else if (vehicle.id === "fleet") this.buildFleet(vehicle.wheelCount);
    else this.buildPlanetary(vehicle.wheelCount);

    this.applyTurboPose(this.turboVisual.progress);
  }

  move(direction: -1 | 1): void {
    this.laneIndex = Math.min(2, Math.max(0, this.laneIndex + direction)) as
      | 0
      | 1
      | 2;
  }

  moveToLane(index: number): void {
    this.laneIndex = Math.min(2, Math.max(0, Math.round(index))) as 0 | 1 | 2;
  }

  update(delta: number, gripLevel: number, worldSpeed: number): void {
    const targetX = LANE_POSITIONS[this.laneIndex] ?? 0;
    const response = 5.8 + gripLevel * 1.35;
    const previousX = this.currentX;
    this.currentX += (targetX - this.currentX) * Math.min(1, delta * response);
    this.root.position.x = this.currentX;
    const lateralVelocity =
      (this.currentX - previousX) / Math.max(delta, 0.001);
    const targetTilt = Math.max(
      -0.12,
      Math.min(0.12, -lateralVelocity * 0.012)
    );
    this.root.rotation.z +=
      (targetTilt - this.root.rotation.z) * Math.min(1, delta * 8);

    this.animationClock += delta * (0.65 + Math.min(1.2, worldSpeed / 26));
    const steering = Math.max(-0.28, Math.min(0.28, -lateralVelocity * 0.026));
    this.wheels.forEach(wheel => {
      const suspension =
        Math.sin(this.animationClock * 8.5 + wheel.phase) *
        0.018 *
        Math.min(1, worldSpeed / 16);
      wheel.pivot.position.y = wheel.baseY + suspension;
      const targetSteer = wheel.steerable ? steering : 0;
      wheel.pivot.rotation.y +=
        (targetSteer - wheel.pivot.rotation.y) * Math.min(1, delta * 9);
      wheel.rollingMeshes.forEach(mesh => {
        mesh.rotation.x += delta * worldSpeed * 0.92;
      });
    });

    if (this.bodyPivot) {
      this.bodyPivot.position.y =
        Math.sin(this.animationClock * 5.2) *
        0.026 *
        Math.min(1, worldSpeed / 14);
      this.bodyPivot.rotation.x = Math.sin(this.animationClock * 2.7) * 0.006;
      this.bodyPivot.rotation.z = Math.sin(this.animationClock * 3.4) * 0.004;
    }
    if (this.driverPivot) {
      this.driverPivot.position.y =
        this.driverBaseY + Math.sin(this.animationClock * 6.1) * 0.012;
      this.driverPivot.rotation.z = Math.sin(this.animationClock * 3.6) * 0.012;
    }

    const turboProgress = this.turboVisual.update(delta, worldSpeed);
    this.applyTurboPose(turboProgress);
  }

  pulseImpact(): void {
    this.root.position.y = 0.15;
    if (this.impactResetTimer !== undefined) {
      window.clearTimeout(this.impactResetTimer);
    }
    this.impactResetTimer = window.setTimeout(() => {
      if (!this.root.isDisposed()) this.root.position.y = 0.05;
      this.impactResetTimer = undefined;
    }, 110);
  }

  dispose(): void {
    if (this.impactResetTimer !== undefined) {
      window.clearTimeout(this.impactResetTimer);
      this.impactResetTimer = undefined;
    }
    this.turboVisual.dispose();
    this.modelRoot?.dispose(false, false);
    this.root.dispose(false, false);
    this.ownedMaterials.forEach(material => material.dispose());
    this.ownedMaterials.length = 0;
  }

  private applyTurboPose(progress: number): void {
    if (!this.modelRoot) return;
    const normalized = Math.min(1, Math.max(0, progress));
    const ease = (from: number, to: number): number => {
      const value = Math.min(
        1,
        Math.max(0, (normalized - from) / Math.max(0.0001, to - from))
      );
      return value * value * (3 - value * 2);
    };
    const crouch = ease(0.02, 0.26) * (1 - ease(0.32, 0.64));
    const collapse = ease(0.25, 0.72);
    const modelScale = Math.max(0.035, 1 - collapse * 0.965);

    this.modelRoot.setEnabled(collapse < 0.995);
    this.modelRoot.scaling.setAll(modelScale);
    this.modelRoot.position.y = collapse * 0.86;
    this.modelRoot.rotation.y = collapse * Math.PI * 4;

    if (!this.driverPivot) return;
    this.driverPivot.position.y -= crouch * 0.3;
    this.driverPivot.scaling.set(
      this.driverBaseScale * (1 + crouch * 0.1),
      this.driverBaseScale * (1 - crouch * 0.42),
      this.driverBaseScale * (1 + crouch * 0.1)
    );
    this.driverPivot.rotation.x = this.driverBaseRotationX + crouch * 0.32;
    this.driverPivot.rotation.y = ease(0.12, 0.68) * Math.PI * 6;
  }

  /**
   * Geometria retirada da tabela de montagem recuperada do asset real da bike
   * XB: 15 pecas estaticas, hierarquia plana, so translacao (sem rotacao nem
   * escala). Conversao Unreal -> Babylon: x = X, y = Z, z = -Y, tudo x 0.023
   * porque o mundo do jogo roda a ~2,3 unidades por metro. Entre-eixos de
   * 100 cm (rodas em z = +-1.150) e topo das manoplas a 86 cm (y = 1.978).
   * Os numeros abaixo sao medidos, nao estimados: nao "arredonde" nem
   * reescale nada aqui sem a tabela na mao.
   */
  private buildBike(): void {
    const bracket = new Vector3(0, 0.644, -0.23); // quadro + pedivela
    const head = new Vector3(0, 1.656, 0.851); // garfo + guidao
    const grips = new Vector3(0, 1.978, 0.644);
    const seat = new Vector3(0, 1.84, -0.782);
    const rack = new Vector3(0, 1.426, -0.966);
    const wheelY = 0.69;
    // Bagageiro, caixa, painel e logo dividem a mesma origem em z (a face de
    // montagem, virada para a frente). Centrar o volume nela engoliria o
    // selim, que fica so 0.184 a frente, entao ele cresce para tras da origem.
    const boxCenterZ = -0.966 - XB_CARGO_BOX.depth / 2;
    const boxY = 1.886;

    this.addBikeWheel(1.15, true);
    this.addBikeWheel(-1.15, false);

    this.addBeam("bike-down-tube", bracket, head, 0.14, this.xbBlack);
    this.addBeam(
      "bike-seat-tube",
      bracket,
      new Vector3(0, 1.74, -0.71),
      0.13,
      this.xbBlack
    );
    this.addBeam(
      "bike-top-tube",
      new Vector3(0, 1.7, -0.69),
      new Vector3(0, 1.62, 0.79),
      0.115,
      this.xbBlack
    );
    this.addBeam(
      "bike-head-tube",
      new Vector3(0, 1.58, 0.9),
      new Vector3(0, 1.83, 0.74),
      0.17,
      this.xbBlack
    );
    this.addBeam(
      "bike-seat-post",
      new Vector3(0, 1.7, -0.69),
      seat,
      0.1,
      this.xbBlack
    );
    for (const side of [-1, 1]) {
      this.addBeam(
        `bike-chain-stay-${side}`,
        new Vector3(side * 0.075, bracket.y, bracket.z),
        new Vector3(side * 0.09, wheelY, -1.15),
        0.08,
        this.xbBlack
      );
      this.addBeam(
        `bike-seat-stay-${side}`,
        new Vector3(side * 0.06, 1.68, -0.68),
        new Vector3(side * 0.09, wheelY, -1.15),
        0.075,
        this.xbBlack
      );
      this.addBeam(
        `bike-fork-${side}`,
        new Vector3(side * 0.085, head.y, head.z),
        new Vector3(side * 0.085, wheelY, 1.15),
        0.085,
        this.xbBlack
      );
    }
    this.addCylinder(
      "bike-fork-crown",
      0.22,
      0.11,
      0.11,
      head.x,
      head.y,
      head.z,
      this.xbBlack,
      0,
      0,
      Math.PI / 2
    );

    this.addBeam(
      "bike-stem",
      head,
      new Vector3(0, grips.y, grips.z + 0.02),
      0.1,
      this.xbBlack
    );
    this.addCylinder(
      "bike-handlebar",
      0.92,
      0.085,
      0.085,
      grips.x,
      grips.y,
      grips.z,
      this.xbBlack,
      0,
      0,
      Math.PI / 2
    );
    for (const side of [-1, 1]) {
      this.addCylinder(
        `bike-grip-${side}`,
        0.2,
        0.115,
        0.115,
        side * 0.37,
        grips.y,
        grips.z,
        this.xbNeon,
        0,
        0,
        Math.PI / 2
      );
    }

    // Barra de acento neon: origem (0, 1.150, 0) e direcao paralela ao tubo
    // inferior, o que a deixa acesa dentro do triangulo do quadro.
    this.addBeam(
      "bike-accent-bar",
      new Vector3(0, 0.72, -0.46),
      new Vector3(0, 1.58, 0.46),
      0.09,
      this.xbNeon
    );

    this.addCylinder(
      "bike-bottom-bracket",
      0.3,
      0.16,
      0.16,
      bracket.x,
      bracket.y,
      bracket.z,
      this.xbMetal,
      0,
      0,
      Math.PI / 2
    );
    this.addCylinder(
      "bike-chainring",
      0.045,
      0.46,
      0.46,
      0.155,
      bracket.y,
      bracket.z,
      this.xbMetal,
      0,
      0,
      Math.PI / 2
    );
    for (const side of [-1, 1]) {
      // Os dois pedais ficam na mesma fase: o mascote tem os dois pes na mesma
      // altura, e so assim as botas pousam em cima dos pedais.
      this.addBox(
        `bike-crank-arm-${side}`,
        0.065,
        0.4,
        0.105,
        side * 0.175,
        0.799,
        -0.34,
        this.xbMetal,
        -0.618
      );
      this.addBox(
        `bike-pedal-${side}`,
        0.2,
        0.05,
        0.16,
        side * 0.205,
        0.954,
        -0.45,
        this.xbMetal
      );
    }

    this.addRoundedBox(
      "bike-seat",
      0.24,
      0.1,
      0.4,
      seat.x,
      seat.y,
      seat.z,
      this.xbBlack,
      0.05,
      -0.06
    );

    this.addBox(
      "bike-rack-deck",
      0.7,
      0.055,
      0.84,
      rack.x,
      rack.y,
      boxCenterZ,
      this.xbBlack
    );
    for (const side of [-1, 1]) {
      this.addBeam(
        `bike-rack-front-leg-${side}`,
        new Vector3(side * 0.24, 1.4, -1),
        new Vector3(side * 0.05, 1.16, -0.456),
        0.055,
        this.xbBlack
      );
      this.addBeam(
        `bike-rack-rear-leg-${side}`,
        new Vector3(side * 0.22, 1.4, -1.7),
        new Vector3(side * 0.13, 0.75, -1.2),
        0.055,
        this.xbBlack
      );
    }

    this.addBox(
      "bike-cargo-box",
      XB_CARGO_BOX.width,
      XB_CARGO_BOX.height,
      XB_CARGO_BOX.depth,
      0,
      boxY,
      boxCenterZ,
      this.xbBlack
    );
    this.addBox(
      "bike-cargo-panel",
      XB_CARGO_BOX.width + XB_CARGO_BOX.bandOverhang * 2,
      XB_CARGO_BOX.bandHeight,
      XB_CARGO_BOX.depth + XB_CARGO_BOX.bandOverhang * 2,
      0,
      boxY,
      boxCenterZ,
      this.xbNeon
    );

    // Logo na lateral direita (x = +0.409 = meia-largura da caixa). O pivo
    // gira -90 graus em Y para que a face da assinatura aponte para +x.
    const logo = new TransformNode("bike-xb-logo", this.scene);
    logo.parent = this.bodyPivot;
    logo.position.set(0.409, boxY, boxCenterZ);
    logo.rotation.y = -Math.PI / 2;
    this.addXBSignature(
      "bike",
      0,
      0,
      0,
      0.66,
      logo,
      this.xbWhite,
      this.xbNeon,
      this.xbNeon
    );

    // O mascote pedala de pe, a frente do selim: no asset real ha 52 cm entre
    // o selim (1.84) e o pedivela (0.644), e sentado as pernas dele nao
    // alcancariam os pedais. A escala 1.12 e a que poe maos nas manoplas.
    this.buildDriver({
      x: 0,
      y: 1.88,
      z: -0.3,
      scale: 1.12,
      lean: 0.3,
      visor: true,
      handsForward: 0.8,
      handsWide: 0.33,
      legsVisible: true,
      steeringWheel: false,
    });
  }

  private buildMoto(): void {
    this.addWheel(0, 0.63, -1.24, 1.02, 0.28, false);
    this.addWheel(0, 0.63, 1.31, 1.04, 0.28, true);
    this.addBeam(
      "moto-main-frame",
      new Vector3(0, 0.92, -0.74),
      new Vector3(0, 1.35, 0.78),
      0.2,
      this.darkMetal
    );
    this.addBeam(
      "moto-fork-a",
      new Vector3(-0.12, 1.52, 0.83),
      new Vector3(-0.12, 0.64, 1.31),
      0.09,
      this.metal
    );
    this.addBeam(
      "moto-fork-b",
      new Vector3(0.12, 1.52, 0.83),
      new Vector3(0.12, 0.64, 1.31),
      0.09,
      this.metal
    );
    this.addSphere(
      "moto-fuel-tank",
      0.78,
      0,
      1.28,
      0.25,
      this.navy,
      0.8,
      0.68,
      1.1
    );
    this.addRoundedBox(
      "moto-fairing",
      0.78,
      0.76,
      0.7,
      0,
      1.31,
      0.85,
      this.steelBlue,
      0.18,
      -0.14
    );
    this.addBox(
      "moto-windscreen",
      0.56,
      0.5,
      0.055,
      0,
      1.74,
      1.08,
      this.glass,
      -0.18
    );
    this.addBox(
      "moto-seat",
      0.64,
      0.16,
      0.92,
      0,
      1.36,
      -0.45,
      this.rubber,
      0.05
    );
    this.addRoundedBox(
      "moto-cargo-case",
      0.92,
      0.7,
      0.68,
      0,
      1.57,
      -1.08,
      this.cyan,
      0.14
    );
    this.addCylinder(
      "moto-exhaust",
      1.15,
      0.16,
      0.2,
      -0.39,
      0.85,
      -0.55,
      this.metal,
      Math.PI / 2
    );
    this.addSphere(
      "moto-headlamp",
      0.36,
      0,
      1.42,
      1.24,
      this.headLamp,
      1,
      0.72,
      0.48
    );
    this.addBox(
      "moto-tail-light",
      0.42,
      0.2,
      0.08,
      0,
      1.42,
      -1.43,
      this.tailLamp
    );
    this.addXBSignature("moto", 0, 1.69, -1.44, 0.54);
    this.buildDriver({
      x: 0,
      y: 1.43,
      z: -0.1,
      scale: 0.88,
      lean: 0.34,
      visor: true,
      handsForward: 0.8,
      handsWide: 0.36,
      legsVisible: true,
    });
  }

  private buildVan(wheels: number): void {
    this.buildRoadVehicle({
      width: 2.7,
      length: 4.5,
      wheels,
      wheelDiameter: 0.9,
      frontAxle: 1.45,
    });
    this.addRoundedBox(
      "van-main-body",
      2.5,
      1.52,
      3.55,
      0,
      1.48,
      -0.18,
      this.ice,
      0.26
    );
    this.addRoundedBox(
      "van-cab-nose",
      2.44,
      1.18,
      0.92,
      0,
      1.33,
      1.7,
      this.navy,
      0.18,
      -0.1
    );
    this.addBox(
      "van-windshield",
      2.14,
      0.76,
      0.07,
      0,
      1.92,
      2.12,
      this.glass,
      -0.17
    );
    this.addBox(
      "van-panoramic-roof",
      1.72,
      0.055,
      1.35,
      0,
      2.28,
      1.12,
      this.glass
    );
    this.addSphere(
      "van-driver-canopy",
      1.18,
      -0.42,
      2.38,
      1.15,
      this.glass,
      0.82,
      0.42,
      0.82
    );
    this.addBox(
      "van-side-window-l",
      0.055,
      0.7,
      0.9,
      -1.24,
      1.9,
      1.28,
      this.glass
    );
    this.addBox(
      "van-side-window-r",
      0.055,
      0.7,
      0.9,
      1.24,
      1.9,
      1.28,
      this.glass
    );
    this.addBox("van-brand-stripe", 2.57, 0.17, 3.5, 0, 1.14, -0.16, this.cyan);
    this.addBox(
      "van-rear-door-seam",
      0.055,
      1.25,
      0.05,
      0,
      1.55,
      -1.97,
      this.darkMetal
    );
    this.addBox(
      "van-rear-bumper",
      2.5,
      0.2,
      0.22,
      0,
      0.65,
      -2.13,
      this.darkMetal
    );
    for (const x of [-0.91, 0.91]) {
      this.addBox(
        `van-headlight-${x}`,
        0.44,
        0.28,
        0.07,
        x,
        1.18,
        2.18,
        this.headLamp
      );
      this.addBox(
        `van-taillight-${x}`,
        0.32,
        0.48,
        0.07,
        x,
        1.13,
        -2,
        this.tailLamp
      );
    }
    this.addMirrorPair("van", 1.44, 1.84, 1.63);
    this.addXBSignature("van", 0, 1.66, -2.02, 0.92);
    this.addCargoBoxes(-0.35, -0.82, 1.58, 0.68);
    this.buildDriver({
      x: -0.42,
      y: 1.65,
      z: 1.15,
      scale: 0.72,
      handsForward: 0.42,
      handsWide: 0.3,
    });
  }

  private buildTruck(wheels: number): void {
    this.buildRoadVehicle({
      width: 3.05,
      length: 6.6,
      wheels,
      wheelDiameter: 1.08,
      frontAxle: 2.3,
    });
    this.addRoundedBox(
      "truck-cab",
      2.78,
      2.35,
      2.02,
      0,
      1.83,
      2.15,
      this.navy,
      0.24
    );
    this.addBox(
      "truck-cab-lower",
      2.92,
      0.72,
      2.15,
      0,
      0.82,
      2.08,
      this.steelBlue
    );
    this.addBox(
      "truck-windshield",
      2.4,
      0.83,
      0.08,
      0,
      2.15,
      3.19,
      this.glass,
      -0.08
    );
    this.addBox(
      "truck-glass-roof",
      1.75,
      0.06,
      1.25,
      0,
      3.02,
      2.15,
      this.glass
    );
    this.addSphere(
      "truck-driver-canopy",
      1.28,
      -0.48,
      3.06,
      2.18,
      this.glass,
      0.8,
      0.4,
      0.82
    );
    this.addMirrorPair("truck", 1.62, 2.15, 2.74);
    this.addRoundedBox(
      "truck-trailer",
      2.86,
      2.45,
      3.9,
      0,
      1.95,
      -1.12,
      this.ice,
      0.2
    );
    this.addBox(
      "truck-trailer-header",
      2.92,
      0.42,
      3.94,
      0,
      2.82,
      -1.12,
      this.navy
    );
    for (const z of [-2.62, -1.72, -0.82, 0.08]) {
      this.addBox(
        `truck-trailer-rib-${z}`,
        2.91,
        0.1,
        0.11,
        0,
        1.92,
        z,
        this.metal
      );
    }
    this.addBox(
      "truck-trailer-stripe",
      2.93,
      0.19,
      3.88,
      0,
      1.26,
      -1.12,
      this.cyan
    );
    for (const x of [-1.13, 1.13]) {
      this.addCylinder(
        `truck-fuel-tank-${x}`,
        1.35,
        0.55,
        0.55,
        x,
        0.82,
        0.48,
        this.metal,
        Math.PI / 2
      );
      this.addBox(
        `truck-headlight-${x}`,
        0.48,
        0.34,
        0.08,
        x,
        1.05,
        3.21,
        this.headLamp
      );
      this.addBox(
        `truck-taillight-${x}`,
        0.38,
        0.28,
        0.08,
        x,
        0.73,
        -3.2,
        this.tailLamp
      );
    }
    this.addCylinder(
      "truck-exhaust-stack",
      1.72,
      0.18,
      0.22,
      1.27,
      2.1,
      0.95,
      this.darkMetal
    );
    this.addBox(
      "truck-rear-bumper",
      2.74,
      0.24,
      0.24,
      0,
      0.58,
      -3.28,
      this.darkMetal
    );
    this.addXBSignature("truck", 0, 1.92, -3.09, 1.08);
    this.addCargoBoxes(0, -1.18, 2.04, 0.82);
    this.buildDriver({
      x: -0.48,
      y: 2.25,
      z: 2.18,
      scale: 0.78,
      handsForward: 0.38,
      handsWide: 0.32,
    });
  }

  private buildFleet(wheels: number): void {
    this.buildRoadVehicle({
      width: 3.25,
      length: 7.3,
      wheels,
      wheelDiameter: 1.02,
      frontAxle: 2.52,
      lowProfile: true,
    });
    this.addRoundedBox(
      "fleet-spine",
      1.34,
      0.78,
      6.1,
      0,
      1.04,
      -0.12,
      this.navy,
      0.18
    );
    for (const x of [-1, 1]) {
      this.addRoundedBox(
        `fleet-cargo-pod-${x}`,
        1.12,
        1.54,
        3.65,
        x,
        1.52,
        -1.06,
        this.ice,
        0.22
      );
      this.addBox(
        `fleet-pod-stripe-${x}`,
        1.16,
        0.15,
        3.5,
        x,
        1.34,
        -1.06,
        this.cyan
      );
      this.addBox(
        `fleet-tail-${x}`,
        0.64,
        0.24,
        0.08,
        x,
        1.11,
        -2.91,
        this.tailLamp
      );
    }
    this.addRoundedBox(
      "fleet-cockpit",
      2.26,
      1.28,
      2.15,
      0,
      1.62,
      2.15,
      this.steelBlue,
      0.3,
      -0.08
    );
    this.addSphere(
      "fleet-glass-canopy",
      1.86,
      0,
      2.25,
      2.1,
      this.glass,
      1,
      0.62,
      1.05
    );
    this.addBox(
      "fleet-sensor-band",
      2.3,
      0.15,
      0.18,
      0,
      1.63,
      3.25,
      this.energy
    );
    this.addBox(
      "fleet-roof-fin",
      0.18,
      0.48,
      1.15,
      0,
      2.89,
      1.47,
      this.cyan,
      -0.2
    );
    for (const x of [-1.27, 1.27]) {
      this.addBox(
        `fleet-headlight-${x}`,
        0.38,
        0.18,
        0.1,
        x,
        1.16,
        3.35,
        this.headLamp
      );
      this.addBox(
        `fleet-side-energy-${x}`,
        0.08,
        0.12,
        4.8,
        x * 1.14,
        1.03,
        -0.22,
        this.energy
      );
    }
    this.addCylinder(
      "fleet-lidar",
      0.24,
      0.56,
      0.56,
      0,
      3.08,
      0.9,
      this.darkMetal
    );
    this.addCylinder(
      "fleet-lidar-light",
      0.12,
      0.42,
      0.42,
      0,
      3.22,
      0.9,
      this.energy
    );
    this.addXBSignature("fleet", 0, 1.32, -3.19, 1.02);
    this.buildDriver({
      x: 0,
      y: 1.72,
      z: 2.05,
      scale: 0.76,
      visor: true,
      handsForward: 0.36,
      handsWide: 0.34,
    });
  }

  private buildPlanetary(wheels: number): void {
    this.buildRoadVehicle({
      width: 3.8,
      length: 7.7,
      wheels,
      wheelDiameter: 1.34,
      wheelWidth: 0.45,
      frontAxle: 2.7,
      highClearance: true,
    });
    this.addRoundedBox(
      "planetary-core",
      2.52,
      1.05,
      5.7,
      0,
      1.42,
      -0.2,
      this.ice,
      0.28
    );
    this.addRoundedBox(
      "planetary-cockpit",
      2.78,
      1.35,
      2.35,
      0,
      2.05,
      2.18,
      this.navy,
      0.32,
      -0.08
    );
    this.addSphere(
      "planetary-canopy",
      2.18,
      0,
      2.72,
      2.14,
      this.glass,
      1,
      0.62,
      1.02
    );
    this.addRoundedBox(
      "planetary-cargo",
      2.94,
      1.62,
      3.25,
      0,
      2.02,
      -1.58,
      this.metal,
      0.24
    );
    this.addCylinder(
      "planetary-tank-a",
      2.35,
      0.68,
      0.68,
      -0.78,
      2.45,
      -1.52,
      this.darkMetal,
      Math.PI / 2
    );
    this.addCylinder(
      "planetary-tank-b",
      2.35,
      0.68,
      0.68,
      0.78,
      2.45,
      -1.52,
      this.darkMetal,
      Math.PI / 2
    );
    for (const x of [-1.42, 1.42]) {
      this.addBox(
        `planetary-rail-${x}`,
        0.2,
        0.22,
        6.35,
        x,
        2.95,
        -0.17,
        this.cyan
      );
      this.addBox(
        `planetary-energy-${x}`,
        0.12,
        0.16,
        4.9,
        x * 1.12,
        1.24,
        -0.45,
        this.energy
      );
      this.addSphere(
        `planetary-headlamp-${x}`,
        0.42,
        x,
        1.48,
        3.12,
        this.headLamp,
        1,
        0.62,
        0.42
      );
      this.addBox(
        `planetary-tail-${x}`,
        0.46,
        0.24,
        0.09,
        x,
        1.35,
        -3.24,
        this.tailLamp
      );
    }
    this.addCylinder(
      "planetary-antenna",
      1.2,
      0.07,
      0.1,
      1.16,
      3.62,
      1.02,
      this.darkMetal,
      -0.18
    );
    this.addSphere(
      "planetary-antenna-tip",
      0.24,
      1.36,
      4.18,
      1.02,
      this.energy
    );
    this.addBox(
      "planetary-rear-bumper",
      3.15,
      0.28,
      0.28,
      0,
      0.84,
      -3.38,
      this.darkMetal
    );
    this.addXBSignature("planetary", 0, 2.05, -3.23, 1.16);
    this.buildDriver({
      x: 0,
      y: 2,
      z: 2.05,
      scale: 0.82,
      visor: true,
      spaceSuit: true,
      handsForward: 0.34,
      handsWide: 0.36,
    });
  }

  private buildRoadVehicle(options: {
    width: number;
    length: number;
    wheels: number;
    wheelDiameter: number;
    frontAxle: number;
    wheelWidth?: number;
    lowProfile?: boolean;
    highClearance?: boolean;
  }): void {
    const wheelWidth = options.wheelWidth ?? options.wheelDiameter * 0.31;
    const chassisY = options.highClearance
      ? 0.92
      : options.lowProfile
        ? 0.54
        : 0.66;
    this.addBox(
      "vehicle-chassis",
      options.width * 0.84,
      options.highClearance ? 0.34 : 0.42,
      options.length * 0.9,
      0,
      chassisY,
      -0.02,
      this.darkMetal
    );
    this.addBox(
      "vehicle-chassis-accent",
      options.width * 0.7,
      0.12,
      options.length * 0.68,
      0,
      chassisY + 0.24,
      0,
      this.cyan
    );

    const axleCount = Math.max(1, Math.ceil(options.wheels / 2));
    const rearAxle = -options.length * 0.35;
    const rows = Array.from({ length: axleCount }, (_, index) => {
      if (axleCount === 1) return 0;
      if (index === axleCount - 1) return options.frontAxle;
      return (
        rearAxle + (index * options.length * 0.24) / Math.max(1, axleCount - 2)
      );
    });
    rows.forEach((z, rowIndex) => {
      const steerable = rowIndex === rows.length - 1;
      for (const side of [-1, 1]) {
        const x = side * options.width * 0.46;
        const wheelY = options.wheelDiameter * 0.52;
        this.addWheel(
          x,
          wheelY,
          z,
          options.wheelDiameter,
          wheelWidth,
          steerable
        );
        if (options.highClearance) {
          this.addBeam(
            `planetary-suspension-${rowIndex}-${side}`,
            new Vector3(side * options.width * 0.26, chassisY, z),
            new Vector3(x, wheelY, z),
            0.13,
            this.metal
          );
        }
      }
    });
  }

  private buildDriver(options: DriverOptions): void {
    if (!this.bodyPivot) return;
    const driver = new TransformNode("driver-rig", this.scene);
    driver.parent = this.bodyPivot;
    driver.position.set(options.x, options.y, options.z);
    driver.scaling.setAll(options.scale);
    driver.rotation.x = options.lean ?? 0;
    this.driverPivot = driver;
    this.driverBaseY = options.y;
    this.driverBaseScale = options.scale;
    this.driverBaseRotationX = options.lean ?? 0;

    // The official XB mascot is deliberately stocky, big-headed and friendly.
    // It remains the same recognisable character in every vehicle era.
    const suitMaterial = this.uniform;
    const torso = this.addCylinder(
      "xb-mascot-torso",
      0.7,
      0.48,
      0.68,
      0,
      0.34,
      0,
      suitMaterial,
      0,
      0,
      0,
      driver
    );
    torso.scaling.z = 0.88;
    this.addBox(
      "xb-mascot-collar-left",
      0.29,
      0.12,
      0.08,
      -0.13,
      0.6,
      0.26,
      this.steelBlue,
      0,
      0,
      -0.38,
      driver
    );
    this.addBox(
      "xb-mascot-collar-right",
      0.29,
      0.12,
      0.08,
      0.13,
      0.6,
      0.26,
      this.steelBlue,
      0,
      0,
      0.38,
      driver
    );
    this.addBox(
      "xb-mascot-badge-x-a",
      0.2,
      0.045,
      0.035,
      -0.1,
      0.4,
      0.31,
      this.cyan,
      0,
      0,
      0.64,
      driver
    );
    this.addBox(
      "xb-mascot-badge-x-b",
      0.2,
      0.045,
      0.035,
      -0.1,
      0.4,
      0.31,
      this.cyan,
      0,
      0,
      -0.64,
      driver
    );
    this.addBox(
      "xb-mascot-badge-b-stem",
      0.035,
      0.19,
      0.035,
      0.055,
      0.4,
      0.31,
      this.ice,
      0,
      0,
      0,
      driver
    );
    this.addTorus(
      "xb-mascot-badge-b-top",
      0.105,
      0.022,
      0.09,
      0.445,
      0.315,
      this.ice,
      Math.PI / 2,
      0,
      0,
      driver
    );
    this.addTorus(
      "xb-mascot-badge-b-bottom",
      0.105,
      0.022,
      0.09,
      0.36,
      0.315,
      this.ice,
      Math.PI / 2,
      0,
      0,
      driver
    );
    this.addCylinder(
      "xb-mascot-neck",
      0.14,
      0.22,
      0.25,
      0,
      0.75,
      0.02,
      this.skin,
      0,
      0,
      0,
      driver
    );
    this.addSphere(
      "xb-mascot-head",
      0.66,
      0,
      1.08,
      0.05,
      this.skin,
      0.96,
      1.02,
      0.9,
      driver
    );
    for (const side of [-1, 1]) {
      this.addSphere(
        `xb-mascot-eye-white-${side}`,
        0.23,
        side * 0.135,
        1.11,
        0.3,
        this.ice,
        0.76,
        1.08,
        0.42,
        driver
      );
      this.addSphere(
        `xb-mascot-eye-iris-${side}`,
        0.112,
        side * 0.135,
        1.105,
        0.354,
        this.steelBlue,
        0.8,
        1,
        0.35,
        driver
      );
      this.addSphere(
        `xb-mascot-eye-pupil-${side}`,
        0.065,
        side * 0.135,
        1.105,
        0.378,
        this.facialFeature,
        0.8,
        1,
        0.32,
        driver
      );
      this.addBox(
        `xb-mascot-eyebrow-${side}`,
        0.19,
        0.045,
        0.045,
        side * 0.14,
        1.265,
        0.305,
        this.facialFeature,
        0,
        0,
        side * -0.12,
        driver
      );
    }
    this.addSphere(
      "xb-mascot-smile",
      0.27,
      0,
      0.92,
      0.322,
      this.facialFeature,
      1,
      0.42,
      0.3,
      driver
    );
    this.addSphere(
      "xb-mascot-cap-crown",
      0.68,
      0,
      1.38,
      -0.015,
      this.navy,
      1.04,
      0.5,
      1,
      driver
    );
    this.addRoundedBox(
      "xb-mascot-cap-brim",
      0.5,
      0.085,
      0.32,
      0,
      1.33,
      0.28,
      this.navy,
      0.055,
      -0.08,
      0,
      0,
      driver
    );
    this.addSphere(
      "xb-mascot-cap-button",
      0.075,
      0,
      1.57,
      -0.02,
      this.cyan,
      1,
      0.58,
      1,
      driver
    );
    if (options.visor) {
      this.addBox(
        "xb-mascot-safety-visor",
        0.53,
        0.22,
        0.035,
        0,
        1.14,
        0.405,
        this.glass,
        -0.08,
        0,
        0,
        driver
      );
    }
    if (options.spaceSuit) {
      this.addTorus(
        "xb-mascot-space-collar",
        0.66,
        0.09,
        0,
        0.77,
        0,
        this.ice,
        0,
        0,
        0,
        driver
      );
    }

    const handZ = options.handsForward ?? 0.42;
    const handX = options.handsWide ?? 0.3;
    for (const side of [-1, 1]) {
      const shoulder = new Vector3(side * 0.3, 0.6, 0.03);
      const elbow = new Vector3(side * (handX + 0.08), 0.38, handZ * 0.54);
      const hand = new Vector3(side * handX, 0.3, handZ);
      this.addBeam(
        `driver-upper-arm-${side}`,
        shoulder,
        elbow,
        0.17,
        suitMaterial,
        driver
      );
      this.addBeam(
        `driver-forearm-${side}`,
        elbow,
        hand,
        0.15,
        this.skin,
        driver
      );
      this.addSphere(
        `driver-hand-${side}`,
        0.2,
        hand.x,
        hand.y,
        hand.z,
        this.skin,
        1,
        0.82,
        1,
        driver
      );
    }
    // Na bike as maos ficam no guidao real, entao o volante postico sairia
    // flutuando por cima da barra.
    if (options.steeringWheel !== false) {
      this.addTorus(
        "driver-steering-wheel",
        0.55,
        0.055,
        0,
        0.27,
        handZ + 0.04,
        this.darkMetal,
        Math.PI / 2,
        0,
        0,
        driver
      );
    }

    if (options.legsVisible) {
      for (const side of [-1, 1]) {
        const hip = new Vector3(side * 0.16, 0.06, -0.03);
        const knee = new Vector3(side * 0.22, -0.34, 0.21);
        const foot = new Vector3(side * 0.16, -0.64, 0.07);
        this.addBeam(
          `driver-thigh-${side}`,
          hip,
          knee,
          0.17,
          this.uniform,
          driver
        );
        this.addBeam(
          `driver-shin-${side}`,
          knee,
          foot,
          0.14,
          this.uniform,
          driver
        );
        this.addBox(
          `driver-boot-${side}`,
          0.2,
          0.14,
          0.34,
          foot.x,
          foot.y - 0.05,
          foot.z + 0.08,
          this.rubber,
          0.16,
          0,
          0,
          driver
        );
      }
    }
  }

  private addWheel(
    x: number,
    y: number,
    z: number,
    diameter: number,
    width: number,
    steerable: boolean
  ): void {
    if (!this.modelRoot) return;
    const pivot = new TransformNode(
      `wheel-pivot-${this.wheels.length}`,
      this.scene
    );
    pivot.parent = this.modelRoot;
    pivot.position.set(x, y, z);
    const tire = MeshBuilder.CreateTorus(
      `wheel-tire-${this.wheels.length}`,
      { diameter, thickness: Math.max(0.17, width * 0.72), tessellation: 22 },
      this.scene
    );
    tire.parent = pivot;
    tire.rotation.z = Math.PI / 2;
    tire.material = this.rubber;
    const rim = MeshBuilder.CreateCylinder(
      `wheel-rim-${this.wheels.length}`,
      { height: width * 0.92, diameter: diameter * 0.48, tessellation: 18 },
      this.scene
    );
    rim.parent = pivot;
    rim.rotation.z = Math.PI / 2;
    rim.material = this.metal;
    const hub = MeshBuilder.CreateCylinder(
      `wheel-hub-${this.wheels.length}`,
      { height: width * 1.02, diameter: diameter * 0.2, tessellation: 14 },
      this.scene
    );
    hub.parent = pivot;
    hub.rotation.z = Math.PI / 2;
    hub.material = this.cyan;
    this.wheels.push({
      pivot,
      rollingMeshes: [tire, rim, hub],
      baseY: y,
      phase: this.wheels.length * 1.73,
      steerable,
    });
  }

  /**
   * Roda da bike: 60 cm de diametro (1.38 u) com aro neon e pneu do asset
   * real, registrada na mesma lista de rodas que o resto do jogo anima. Os
   * raios cruzados existem porque torus e cilindro sao simetricos: sem eles o
   * giro da roda ficaria invisivel.
   */
  private addBikeWheel(z: number, steerable: boolean): void {
    if (!this.modelRoot) return;
    const index = this.wheels.length;
    const baseY = 0.69;
    const pivot = new TransformNode(`bike-wheel-pivot-${index}`, this.scene);
    pivot.parent = this.modelRoot;
    pivot.position.set(0, baseY, z);
    const tyre = MeshBuilder.CreateTorus(
      `bike-wheel-tyre-${index}`,
      { diameter: 1.2, thickness: 0.18, tessellation: 24 },
      this.scene
    );
    tyre.parent = pivot;
    tyre.rotation.z = Math.PI / 2;
    tyre.material = this.xbTyre;
    const rim = MeshBuilder.CreateTorus(
      `bike-wheel-rim-${index}`,
      { diameter: 1, thickness: 0.08, tessellation: 24 },
      this.scene
    );
    rim.parent = pivot;
    rim.rotation.z = Math.PI / 2;
    rim.material = this.xbNeon;
    const hub = MeshBuilder.CreateCylinder(
      `bike-wheel-hub-${index}`,
      { height: 0.18, diameter: 0.14, tessellation: 12 },
      this.scene
    );
    hub.parent = pivot;
    hub.rotation.z = Math.PI / 2;
    hub.material = this.xbMetal;
    const rollingMeshes: Mesh[] = [tyre, rim, hub];
    for (let spoke = 0; spoke < 2; spoke += 1) {
      const bar = MeshBuilder.CreateCylinder(
        `bike-wheel-spoke-${index}-${spoke}`,
        { height: 0.94, diameter: 0.045, tessellation: 8 },
        this.scene
      );
      bar.parent = pivot;
      bar.rotation.x = (spoke * Math.PI) / 2;
      bar.material = this.xbMetal;
      rollingMeshes.push(bar);
    }
    this.wheels.push({
      pivot,
      rollingMeshes,
      baseY,
      phase: index * 1.73,
      steerable,
    });
  }

  private addXBSignature(
    prefix: string,
    x: number,
    y: number,
    z: number,
    scale: number,
    parent: TransformNode | null = this.bodyPivot,
    plateMaterial: Material = this.navy,
    markMaterial: Material = this.cyan,
    accentMaterial: Material = this.ice
  ): void {
    this.addRoundedBox(
      `${prefix}-xb-badge-plate`,
      0.72 * scale,
      0.34 * scale,
      0.065 * scale,
      x,
      y,
      z,
      plateMaterial,
      0.055 * scale,
      0,
      0,
      0,
      parent
    );
    const faceZ = z - 0.045 * scale;
    this.addBox(
      `${prefix}-xb-x-a`,
      0.27 * scale,
      0.055 * scale,
      0.035 * scale,
      x - 0.18 * scale,
      y,
      faceZ,
      markMaterial,
      0,
      0,
      0.66,
      parent
    );
    this.addBox(
      `${prefix}-xb-x-b`,
      0.27 * scale,
      0.055 * scale,
      0.035 * scale,
      x - 0.18 * scale,
      y,
      faceZ,
      markMaterial,
      0,
      0,
      -0.66,
      parent
    );
    this.addBox(
      `${prefix}-xb-b-stem`,
      0.045 * scale,
      0.24 * scale,
      0.035 * scale,
      x + 0.06 * scale,
      y,
      faceZ,
      accentMaterial,
      0,
      0,
      0,
      parent
    );
    this.addTorus(
      `${prefix}-xb-b-top`,
      0.145 * scale,
      0.029 * scale,
      x + 0.125 * scale,
      y + 0.06 * scale,
      faceZ,
      accentMaterial,
      Math.PI / 2,
      0,
      0,
      parent
    );
    this.addTorus(
      `${prefix}-xb-b-bottom`,
      0.145 * scale,
      0.029 * scale,
      x + 0.125 * scale,
      y - 0.06 * scale,
      faceZ,
      accentMaterial,
      Math.PI / 2,
      0,
      0,
      parent
    );
  }

  private addCargoBoxes(x: number, z: number, y: number, scale: number): void {
    const placements = [
      { x: x - 0.46 * scale, y, z, r: 0.05 },
      { x: x + 0.42 * scale, y, z: z + 0.08, r: -0.08 },
      { x, y: y + 0.56 * scale, z: z - 0.05, r: 0.03 },
    ];
    placements.forEach((item, index) => {
      this.addRoundedBox(
        `cargo-box-${index}`,
        0.78 * scale,
        0.62 * scale,
        0.74 * scale,
        item.x,
        item.y,
        item.z,
        this.cargo,
        0.08,
        0,
        item.r
      );
      this.addBox(
        `cargo-tape-${index}`,
        0.14 * scale,
        0.64 * scale,
        0.76 * scale,
        item.x,
        item.y,
        item.z,
        this.cyan,
        0,
        item.r
      );
    });
  }

  private addMirrorPair(prefix: string, x: number, y: number, z: number): void {
    for (const side of [-1, 1]) {
      this.addBeam(
        `${prefix}-mirror-arm-${side}`,
        new Vector3(side * (x - 0.18), y, z),
        new Vector3(side * x, y + 0.07, z - 0.05),
        0.06,
        this.darkMetal
      );
      this.addRoundedBox(
        `${prefix}-mirror-${side}`,
        0.15,
        0.31,
        0.22,
        side * x,
        y + 0.08,
        z - 0.05,
        this.darkMetal,
        0.05
      );
    }
  }

  private addRoundedBox(
    name: string,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    material: Material,
    radius: number,
    rotationX = 0,
    rotationY = 0,
    rotationZ = 0,
    parent: TransformNode | null = this.bodyPivot
  ): Mesh {
    const longest = Math.max(width, height, depth);
    const actualRadius = Math.max(0.06, radius);
    const mesh = MeshBuilder.CreateCapsule(
      name,
      {
        height: longest,
        radius: actualRadius,
        tessellation: 12,
        subdivisions: 1,
        capSubdivisions: 3,
      },
      this.scene
    );
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    mesh.scaling.set(
      width / (actualRadius * 2),
      height / longest,
      depth / (actualRadius * 2)
    );
    mesh.rotation.set(rotationX, rotationY, rotationZ);
    mesh.material = material;
    return mesh;
  }

  private addBox(
    name: string,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    material: Material,
    rotationX = 0,
    rotationY = 0,
    rotationZ = 0,
    parent: TransformNode | null = this.bodyPivot
  ): Mesh {
    const mesh = MeshBuilder.CreateBox(
      name,
      { width, height, depth },
      this.scene
    );
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotationX, rotationY, rotationZ);
    mesh.material = material;
    return mesh;
  }

  private addSphere(
    name: string,
    diameter: number,
    x: number,
    y: number,
    z: number,
    material: Material,
    scaleX = 1,
    scaleY = 1,
    scaleZ = 1,
    parent: TransformNode | null = this.bodyPivot
  ): Mesh {
    const mesh = MeshBuilder.CreateSphere(
      name,
      { diameter, segments: 14 },
      this.scene
    );
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    mesh.scaling.set(scaleX, scaleY, scaleZ);
    mesh.material = material;
    return mesh;
  }

  private addCylinder(
    name: string,
    height: number,
    diameterTop: number,
    diameterBottom: number,
    x: number,
    y: number,
    z: number,
    material: Material,
    rotationX = 0,
    rotationY = 0,
    rotationZ = 0,
    parent: TransformNode | null = this.bodyPivot
  ): Mesh {
    const mesh = MeshBuilder.CreateCylinder(
      name,
      { height, diameterTop, diameterBottom, tessellation: 14 },
      this.scene
    );
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotationX, rotationY, rotationZ);
    mesh.material = material;
    return mesh;
  }

  private addTorus(
    name: string,
    diameter: number,
    thickness: number,
    x: number,
    y: number,
    z: number,
    material: Material,
    rotationX = 0,
    rotationY = 0,
    rotationZ = 0,
    parent: TransformNode | null = this.bodyPivot
  ): Mesh {
    const mesh = MeshBuilder.CreateTorus(
      name,
      { diameter, thickness, tessellation: 18 },
      this.scene
    );
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotationX, rotationY, rotationZ);
    mesh.material = material;
    return mesh;
  }

  private addBeam(
    name: string,
    from: Vector3,
    to: Vector3,
    thickness: number,
    material: Material,
    parent: TransformNode | null = this.bodyPivot
  ): Mesh {
    const delta = to.subtract(from);
    const length = Math.max(0.001, delta.length());
    const direction = delta.scale(1 / length);
    const up = Vector3.Up();
    const dot = Math.max(-1, Math.min(1, Vector3.Dot(up, direction)));
    const mesh = MeshBuilder.CreateCylinder(
      name,
      { height: length, diameter: thickness, tessellation: 10 },
      this.scene
    );
    mesh.parent = parent;
    mesh.position.copyFrom(from.add(to).scale(0.5));
    if (dot < 0.9999) {
      const axis =
        dot < -0.9999
          ? Vector3.Right()
          : Vector3.Cross(up, direction).normalize();
      mesh.rotationQuaternion = Quaternion.RotationAxis(axis, Math.acos(dot));
    }
    mesh.material = material;
    return mesh;
  }

  private pbr(
    name: string,
    color: string,
    metallic: number,
    roughness: number,
    clearCoat = 0
  ): PBRMaterial {
    const material = new PBRMaterial(name, this.scene);
    material.albedoColor = Color3.FromHexString(color);
    material.metallic = metallic;
    material.roughness = roughness;
    if (clearCoat > 0) {
      material.clearCoat.isEnabled = true;
      material.clearCoat.intensity = clearCoat;
      material.clearCoat.roughness = Math.min(0.42, roughness * 0.72);
    }
    this.ownedMaterials.push(material);
    return material;
  }

  private standard(
    name: string,
    color: string,
    specular: number,
    alpha = 1
  ): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.specularColor = new Color3(specular, specular, specular);
    material.alpha = alpha;
    this.ownedMaterials.push(material);
    return material;
  }
}

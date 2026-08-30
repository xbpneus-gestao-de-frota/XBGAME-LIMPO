import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

const smoothstep = (from: number, to: number, value: number): number => {
  const normalized = clamp01((value - from) / Math.max(0.0001, to - from));
  return normalized * normalized * (3 - normalized * 2);
};

/**
 * Original XB superpower art, kept separate from vehicle and collision logic.
 * It uses a fixed set of low-poly meshes: no particles, textures or allocations
 * occur while the scene is updating.
 */
export class TurboVisual {
  readonly root: TransformNode;

  private readonly tireRoot: TransformNode;
  private readonly tireSpin: TransformNode;
  private readonly faceRoot: TransformNode;
  private readonly auraRoot: TransformNode;
  private readonly energyRoot: TransformNode;
  private readonly eyeWhites: Mesh[] = [];
  private readonly energyStreaks: Mesh[] = [];
  private readonly ownedMaterials: StandardMaterial[] = [];

  private readonly cyanEnergy: StandardMaterial;
  private readonly iceEnergy: StandardMaterial;
  private readonly auraWire: StandardMaterial;
  private readonly auraFill: StandardMaterial;
  private currentProgress = 0;
  private targetProgress = 0;
  private animationClock = 0;

  constructor(scene: Scene, parent: TransformNode) {
    this.root = new TransformNode("turbo-borracha-xb", scene);
    this.root.parent = parent;

    this.tireRoot = new TransformNode("turbo-living-tire", scene);
    this.tireRoot.parent = this.root;
    this.tireRoot.position.y = 1.62;

    this.tireSpin = new TransformNode("turbo-tire-spin", scene);
    this.tireSpin.parent = this.tireRoot;

    this.faceRoot = new TransformNode("turbo-tire-face", scene);
    this.faceRoot.parent = this.tireRoot;

    this.energyRoot = new TransformNode("turbo-xb-energy", scene);
    this.energyRoot.parent = this.root;
    this.energyRoot.position.y = 1.62;

    this.auraRoot = new TransformNode("turbo-6x2-aura", scene);
    this.auraRoot.parent = this.root;

    const rubber = this.material(scene, "turbo-rubber", "#091222", 1, 0.22);
    const navy = this.material(scene, "turbo-navy", "#0D1B33", 1, 0.5);
    const steel = this.material(scene, "turbo-steel", "#12547A", 1, 0.62);
    const ice = this.material(scene, "turbo-ice", "#EDF5F6", 1, 0.78);
    this.cyanEnergy = this.material(
      scene,
      "turbo-cyan-energy",
      "#18BFEA",
      0.82,
      0.96
    );
    this.iceEnergy = this.material(
      scene,
      "turbo-ice-energy",
      "#EDF5F6",
      0.7,
      0.88
    );
    this.auraWire = this.material(
      scene,
      "turbo-aura-wire",
      "#18BFEA",
      0.16,
      0.9,
      true
    );
    this.auraFill = this.material(
      scene,
      "turbo-aura-fill",
      "#12547A",
      0.055,
      0.64
    );

    const tire = MeshBuilder.CreateTorus(
      "turbo-living-tire-shell",
      { diameter: 2.46, thickness: 0.64, tessellation: 28 },
      scene
    );
    tire.parent = this.tireSpin;
    tire.rotation.x = Math.PI / 2;
    tire.material = rubber;

    const innerEnergy = MeshBuilder.CreateTorus(
      "turbo-living-tire-inner-energy",
      { diameter: 1.76, thickness: 0.11, tessellation: 24 },
      scene
    );
    innerEnergy.parent = this.tireSpin;
    innerEnergy.rotation.x = Math.PI / 2;
    innerEnergy.position.z = -0.18;
    innerEnergy.material = this.cyanEnergy;

    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2;
      const tread = MeshBuilder.CreateBox(
        `turbo-glowing-tread-${index}`,
        { width: 0.17, height: 0.46, depth: 0.69 },
        scene
      );
      tread.parent = this.tireSpin;
      tread.position.set(Math.cos(angle) * 1.2, Math.sin(angle) * 1.2, -0.02);
      tread.rotation.z = angle;
      tread.material = index % 3 === 0 ? this.iceEnergy : this.cyanEnergy;
    }

    const facePlate = MeshBuilder.CreateCylinder(
      "turbo-living-tire-face-plate",
      { height: 0.18, diameter: 1.26, tessellation: 24 },
      scene
    );
    facePlate.parent = this.faceRoot;
    facePlate.position.z = -0.28;
    facePlate.rotation.x = Math.PI / 2;
    facePlate.material = navy;

    for (const side of [-1, 1]) {
      const eye = MeshBuilder.CreateSphere(
        `turbo-living-tire-eye-${side}`,
        { diameter: 0.34, segments: 12 },
        scene
      );
      eye.parent = this.faceRoot;
      eye.position.set(side * 0.25, 0.2, -0.43);
      eye.scaling.set(0.82, 1.08, 0.34);
      eye.material = ice;
      this.eyeWhites.push(eye);

      const iris = MeshBuilder.CreateSphere(
        `turbo-living-tire-iris-${side}`,
        { diameter: 0.16, segments: 10 },
        scene
      );
      iris.parent = this.faceRoot;
      iris.position.set(side * 0.25, 0.19, -0.5);
      iris.scaling.z = 0.3;
      iris.material = steel;

      const pupil = MeshBuilder.CreateSphere(
        `turbo-living-tire-pupil-${side}`,
        { diameter: 0.082, segments: 8 },
        scene
      );
      pupil.parent = this.faceRoot;
      pupil.position.set(side * 0.25, 0.185, -0.535);
      pupil.scaling.z = 0.26;
      pupil.material = rubber;

      const eyebrow = MeshBuilder.CreateBox(
        `turbo-living-tire-eyebrow-${side}`,
        { width: 0.24, height: 0.055, depth: 0.055 },
        scene
      );
      eyebrow.parent = this.faceRoot;
      eyebrow.position.set(side * 0.25, 0.43, -0.47);
      eyebrow.rotation.z = side * -0.12;
      eyebrow.material = this.cyanEnergy;
    }

    const smile = MeshBuilder.CreateSphere(
      "turbo-living-tire-smile",
      { diameter: 0.48, segments: 12 },
      scene
    );
    smile.parent = this.faceRoot;
    smile.position.set(0, -0.25, -0.45);
    smile.scaling.set(1, 0.34, 0.22);
    smile.material = rubber;

    const teeth = MeshBuilder.CreateBox(
      "turbo-living-tire-smile-teeth",
      { width: 0.31, height: 0.065, depth: 0.04 },
      scene
    );
    teeth.parent = this.faceRoot;
    teeth.position.set(0, -0.205, -0.51);
    teeth.material = ice;

    for (const direction of [-1, 1]) {
      const xStroke = MeshBuilder.CreateBox(
        `turbo-xb-mark-x-${direction}`,
        { width: 0.23, height: 0.045, depth: 0.035 },
        scene
      );
      xStroke.parent = this.faceRoot;
      xStroke.position.set(-0.19, -0.48, -0.48);
      xStroke.rotation.z = direction * 0.68;
      xStroke.material = this.cyanEnergy;
    }
    const bStem = MeshBuilder.CreateBox(
      "turbo-xb-mark-b",
      { width: 0.055, height: 0.25, depth: 0.035 },
      scene
    );
    bStem.parent = this.faceRoot;
    bStem.position.set(0.08, -0.48, -0.48);
    bStem.material = ice;

    this.buildEnergyField(scene);
    this.buildTruckAura(scene);

    this.root.getChildMeshes().forEach(mesh => {
      mesh.isPickable = false;
    });
    this.root.setEnabled(false);
  }

  get progress(): number {
    return this.currentProgress;
  }

  get active(): boolean {
    return this.targetProgress > 0.001;
  }

  setActive(active: boolean): void {
    this.targetProgress = active ? 1 : 0;
    if (active) this.root.setEnabled(true);
  }

  setProgress(progress: number): void {
    this.targetProgress = clamp01(progress);
    if (this.targetProgress > 0.001) this.root.setEnabled(true);
  }

  reset(): void {
    this.currentProgress = 0;
    this.targetProgress = 0;
    this.animationClock = 0;
    this.root.setEnabled(false);
  }

  update(delta: number, worldSpeed: number): number {
    const safeDelta = Math.min(0.1, Math.max(0, delta));
    const response = this.targetProgress > this.currentProgress ? 5.4 : 7.2;
    this.currentProgress +=
      (this.targetProgress - this.currentProgress) *
      Math.min(1, safeDelta * response);
    if (Math.abs(this.targetProgress - this.currentProgress) < 0.0005) {
      this.currentProgress = this.targetProgress;
    }

    const progress = this.currentProgress;
    if (progress <= 0.001 && this.targetProgress === 0) {
      this.currentProgress = 0;
      this.root.setEnabled(false);
      return 0;
    }
    this.root.setEnabled(true);

    this.animationClock += safeDelta * (1 + Math.min(1.5, worldSpeed / 28));
    const reveal = smoothstep(0.24, 0.7, progress);
    const energyStrength = smoothstep(0.02, 0.2, progress);
    const auraStrength = smoothstep(0.52, 0.96, progress);
    const pulse = 0.5 + Math.sin(this.animationClock * 9.2) * 0.5;
    const tireScale = Math.max(0.025, reveal) * (0.97 + pulse * 0.035);
    this.tireRoot.scaling.setAll(tireScale);
    this.tireRoot.position.y =
      1.62 + Math.sin(this.animationClock * 5.4) * 0.045;
    this.tireSpin.rotation.z -=
      safeDelta * (5.5 + Math.min(8.5, worldSpeed * 0.22)) * reveal;
    this.faceRoot.rotation.z = Math.sin(this.animationClock * 3.7) * 0.035;

    const blink = Math.sin(this.animationClock * 1.7) > 0.985 ? 0.16 : 1;
    this.eyeWhites.forEach(eye => {
      eye.scaling.y = 1.08 * blink;
    });

    this.energyRoot.scaling.setAll(0.45 + reveal * (0.55 + pulse * 0.035));
    this.energyRoot.rotation.y += safeDelta * 0.9 * reveal;
    this.energyRoot.rotation.z -= safeDelta * 0.36 * reveal;
    this.cyanEnergy.alpha =
      energyStrength * (0.34 + progress * (0.42 + pulse * 0.14));
    this.iceEnergy.alpha =
      energyStrength * (0.28 + progress * (0.38 + pulse * 0.12));

    this.auraRoot.scaling.set(
      0.72 + auraStrength * 0.28,
      0.82 + auraStrength * (0.18 + pulse * 0.025),
      0.7 + auraStrength * 0.3
    );
    this.auraRoot.position.y = Math.sin(this.animationClock * 4.1) * 0.028;
    this.auraWire.alpha = auraStrength * (0.11 + pulse * 0.09);
    this.auraFill.alpha = auraStrength * (0.025 + pulse * 0.035);

    this.energyStreaks.forEach((streak, index) => {
      const travel = (this.animationClock * (5.4 + index * 0.32) + index) % 4;
      streak.position.z = -1.1 - travel;
      streak.scaling.z = 0.72 + pulse * 0.5;
    });
    return progress;
  }

  dispose(): void {
    this.root.dispose(false, false);
    this.ownedMaterials.forEach(material => material.dispose());
    this.ownedMaterials.length = 0;
  }

  private buildEnergyField(scene: Scene): void {
    const ringSpecs = [
      { diameter: 3.18, rotationX: Math.PI / 2, rotationY: 0 },
      { diameter: 3.48, rotationX: Math.PI / 2 + 0.32, rotationY: 0.48 },
      { diameter: 3.76, rotationX: Math.PI / 2 - 0.4, rotationY: -0.56 },
    ];
    ringSpecs.forEach((spec, index) => {
      const ring = MeshBuilder.CreateTorus(
        `turbo-energy-orbit-${index}`,
        { diameter: spec.diameter, thickness: 0.055, tessellation: 24 },
        scene
      );
      ring.parent = this.energyRoot;
      ring.rotation.set(spec.rotationX, spec.rotationY, index * 0.42);
      ring.material = index === 1 ? this.iceEnergy : this.cyanEnergy;
    });

    const groundPulse = MeshBuilder.CreateTorus(
      "turbo-ground-pulse",
      { diameter: 4.25, thickness: 0.075, tessellation: 28 },
      scene
    );
    groundPulse.parent = this.root;
    groundPulse.position.y = 0.12;
    groundPulse.material = this.cyanEnergy;

    for (const x of [-1.35, -0.46, 0.46, 1.35]) {
      const streak = MeshBuilder.CreateBox(
        `turbo-energy-streak-${x}`,
        { width: 0.055, height: 0.055, depth: 2.7 },
        scene
      );
      streak.parent = this.root;
      streak.position.set(x, 0.65 + Math.abs(x) * 0.36, -2.4);
      streak.material = Math.abs(x) < 1 ? this.iceEnergy : this.cyanEnergy;
      this.energyStreaks.push(streak);
    }
  }

  private buildTruckAura(scene: Scene): void {
    const chassis = MeshBuilder.CreateBox(
      "turbo-6x2-aura-chassis",
      { width: 3.45, height: 0.28, depth: 6.9 },
      scene
    );
    chassis.parent = this.auraRoot;
    chassis.position.set(0, 0.74, -0.08);
    chassis.material = this.auraFill;

    const cab = MeshBuilder.CreateBox(
      "turbo-6x2-aura-cab",
      { width: 3.24, height: 2.42, depth: 2.15 },
      scene
    );
    cab.parent = this.auraRoot;
    cab.position.set(0, 1.83, 2.25);
    cab.material = this.auraWire;

    const windshield = MeshBuilder.CreateBox(
      "turbo-6x2-aura-windshield",
      { width: 2.5, height: 0.78, depth: 0.08 },
      scene
    );
    windshield.parent = this.auraRoot;
    windshield.position.set(0, 2.18, 3.34);
    windshield.material = this.auraFill;

    const trailer = MeshBuilder.CreateBox(
      "turbo-6x2-aura-trailer",
      { width: 3.48, height: 2.62, depth: 4.62 },
      scene
    );
    trailer.parent = this.auraRoot;
    trailer.position.set(0, 2.02, -1.08);
    trailer.material = this.auraWire;

    const crown = MeshBuilder.CreateBox(
      "turbo-6x2-aura-crown",
      { width: 3.58, height: 0.12, depth: 4.72 },
      scene
    );
    crown.parent = this.auraRoot;
    crown.position.set(0, 3.34, -1.08);
    crown.material = this.auraFill;

    const axlePositions = [-2.18, -0.48, 2.34];
    axlePositions.forEach((z, axle) => {
      for (const side of [-1, 1]) {
        const wheel = MeshBuilder.CreateTorus(
          `turbo-6x2-aura-wheel-${axle}-${side}`,
          { diameter: 1.08, thickness: 0.12, tessellation: 16 },
          scene
        );
        wheel.parent = this.auraRoot;
        wheel.position.set(side * 1.64, 0.64, z);
        wheel.rotation.z = Math.PI / 2;
        wheel.material = this.auraWire;
      }
    });
  }

  private material(
    scene: Scene,
    name: string,
    color: string,
    alpha: number,
    emissive: number,
    wireframe = false
  ): StandardMaterial {
    const material = new StandardMaterial(name, scene);
    const baseColor = Color3.FromHexString(color);
    material.diffuseColor = baseColor;
    material.emissiveColor = baseColor.scale(emissive);
    material.specularColor = Color3.FromHexString("#EDF5F6").scale(0.42);
    material.alpha = alpha;
    material.wireframe = wireframe;
    material.backFaceCulling = false;
    material.disableLighting = emissive > 0.8;
    this.ownedMaterials.push(material);
    return material;
  }
}

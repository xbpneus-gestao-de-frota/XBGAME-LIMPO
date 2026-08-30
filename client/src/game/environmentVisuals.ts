import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.pure";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type {
  RouteTerrain,
  TireCompoundId,
  VehicleConfig,
  WeatherCondition,
} from "./types";
import { urbanLotFor, type UrbanLot } from "./urbanLayout";
import {
  neighborhoodModuleFor,
  type NeighborhoodModule,
  type NeighborhoodSide,
} from "./neighborhoodLayout";

interface SceneryCluster {
  root: TransformNode;
  tower: AbstractMesh;
  feature: AbstractMesh;
  crown: AbstractMesh;
  accent: AbstractMesh;
  door: AbstractMesh;
  windowSecondary: AbstractMesh;
  trunk: AbstractMesh;
  planter: AbstractMesh;
  walkway: AbstractMesh;
  fence: AbstractMesh;
  lampPost: AbstractMesh;
  lampHead: AbstractMesh;
  parkedCar: AbstractMesh;
  shrub: AbstractMesh;
  shadow: AbstractMesh;
  variant: number;
  lot: UrbanLot;
  side: -1 | 1;
  module: NeighborhoodModule;
}

interface ScenerySources {
  tower: Mesh;
  feature: Mesh;
  crown: Mesh;
  accent: Mesh;
  door: Mesh;
  windowSecondary: Mesh;
  trunk: Mesh;
  planter: Mesh;
  walkway: Mesh;
  fence: Mesh;
  lampPost: Mesh;
  lampHead: Mesh;
  parkedCar: Mesh;
  shrub: Mesh;
  shadow: Mesh;
}

interface NeighborhoodFeature {
  root: TransformNode;
  kind: "bus-stop" | "park" | "commercial" | "garage" | "destination";
}

interface AtmosphereStreak {
  root: TransformNode;
  phase: number;
}

export interface EnvironmentPalette {
  road: string;
  shoulder: string;
  scenery: string;
  scenerySecondary: string;
  accent: string;
}

const TERRAIN_PALETTES: Record<RouteTerrain, EnvironmentPalette> = {
  urban: {
    road: "#30363B",
    shoulder: "#3E7B46",
    scenery: "#E4E9EB",
    scenerySecondary: "#40566C",
    accent: "#18BFEA",
  },
  highway: {
    road: "#2D3338",
    shoulder: "#47734B",
    scenery: "#615448",
    scenerySecondary: "#8FA4AF",
    accent: "#18BFEA",
  },
  industrial: {
    road: "#252B32",
    shoulder: "#091222",
    scenery: "#0D1B33",
    scenerySecondary: "#8FA4AF",
    accent: "#18BFEA",
  },
  offroad: {
    road: "#252B32",
    shoulder: "#0D1B33",
    scenery: "#091222",
    scenerySecondary: "#12547A",
    accent: "#18BFEA",
  },
  orbital: {
    road: "#091222",
    shoulder: "#0D1B33",
    scenery: "#12547A",
    scenerySecondary: "#8FA4AF",
    accent: "#18BFEA",
  },
  planetary: {
    road: "#091222",
    shoulder: "#252B32",
    scenery: "#0D1B33",
    scenerySecondary: "#12547A",
    accent: "#18BFEA",
  },
};

const ERA_TERRAINS: Record<VehicleConfig["id"], RouteTerrain> = {
  bike: "urban",
  moto: "urban",
  van: "highway",
  truck: "industrial",
  fleet: "orbital",
  planetary: "planetary",
};

export function terrainForEra(vehicle: VehicleConfig): RouteTerrain {
  return ERA_TERRAINS[vehicle.id];
}

export function environmentPalette(terrain: RouteTerrain): EnvironmentPalette {
  return TERRAIN_PALETTES[terrain];
}

/**
 * Lightweight procedural art direction for the endless road. It deliberately
 * uses shared materials and low-poly silhouettes so the scene remains viable
 * on mobile GPUs while each route still reads as a distinct place.
 */
export class EnvironmentVisuals {
  private readonly root: TransformNode;
  private readonly clusters: SceneryCluster[] = [];
  private readonly neighborhoodFeatures: NeighborhoodFeature[] = [];
  private cloudsVisible = true;
  private scenerySources: ScenerySources | null = null;
  private readonly streaks: AtmosphereStreak[] = [];
  private readonly stars: TransformNode[] = [];
  private readonly sceneryMaterial: StandardMaterial;
  private readonly scenerySecondaryMaterial: StandardMaterial;
  private readonly sceneryAccentMaterial: StandardMaterial;
  private readonly sceneryFoliageMaterial: StandardMaterial;
  private readonly sceneryWoodMaterial: StandardMaterial;
  private readonly sceneryPavementMaterial: StandardMaterial;
  private readonly sceneryFenceMaterial: StandardMaterial;
  private readonly sceneryVehicleMaterial: StandardMaterial;
  private readonly sceneryShadowMaterial: StandardMaterial;
  private readonly skyMaterial: StandardMaterial;
  private readonly sunMaterial: StandardMaterial;
  private readonly cloudMaterial: StandardMaterial;
  private readonly streakMaterial: StandardMaterial;
  private readonly starMaterial: StandardMaterial;
  private readonly sun: ReturnType<typeof MeshBuilder.CreateDisc>;
  private readonly clouds: TransformNode[] = [];
  private terrain: RouteTerrain = "urban";
  private weather: WeatherCondition = "clear";
  private visualTime = 0;

  constructor(private readonly scene: Scene) {
    this.root = new TransformNode("environment-visuals", scene);
    this.sceneryMaterial = this.material("scenery-primary", "#0D1B33", 0.12);
    this.scenerySecondaryMaterial = this.material(
      "scenery-secondary",
      "#8FA4AF",
      0.18
    );
    this.sceneryAccentMaterial = this.material(
      "scenery-accent",
      "#18BFEA",
      0.36,
      "#12547A"
    );
    this.sceneryFoliageMaterial = this.material(
      "scenery-foliage",
      "#2E6B45",
      0.08
    );
    this.sceneryWoodMaterial = this.material("scenery-wood", "#6A4B37", 0.08);
    this.sceneryPavementMaterial = this.material(
      "scenery-pavement",
      "#C8D0D3",
      0.1
    );
    this.sceneryFenceMaterial = this.material("scenery-fence", "#EDF5F6", 0.12);
    this.sceneryVehicleMaterial = this.material(
      "scenery-parked-vehicle",
      "#12547A",
      0.32
    );
    this.sceneryShadowMaterial = this.unlitMaterial(
      "scenery-shadow",
      "#091222",
      0.19
    );
    this.skyMaterial = this.unlitMaterial("sky-gradient", "#68C9F2", 1);
    this.sunMaterial = this.unlitMaterial("sun-disc", "#F7FBFF", 0.92);
    this.cloudMaterial = this.unlitMaterial("horizon-clouds", "#F3FAFD", 0.64);
    this.streakMaterial = this.unlitMaterial(
      "atmosphere-streaks",
      "#18BFEA",
      0
    );
    this.starMaterial = this.unlitMaterial("route-stars", "#EDF5F6", 0.86);

    const dome = MeshBuilder.CreateSphere(
      "sky-dome",
      { diameter: 245, segments: 12 },
      scene
    );
    dome.parent = this.root;
    dome.position.y = 18;
    dome.material = this.skyMaterial;
    dome.infiniteDistance = true;
    dome.isPickable = false;
    this.skyMaterial.backFaceCulling = false;

    this.sun = MeshBuilder.CreateDisc(
      "horizon-sun",
      { radius: 7.5, tessellation: 32 },
      scene
    );
    this.sun.parent = this.root;
    this.sun.position.set(-35, 42, 108);
    this.sun.material = this.sunMaterial;
    this.sun.isPickable = false;

    this.createClouds();
    this.createStars();
    this.createAtmosphereStreaks();
  }

  registerSegment(segment: TransformNode, index: number): void {
    const neighborhoodModule = neighborhoodModuleFor(index);
    if (neighborhoodModule.busStopSide !== 0) {
      this.createBusStop(segment, index, neighborhoodModule.busStopSide);
    }
    if (neighborhoodModule.parkSide !== 0) {
      this.createPark(segment, index, neighborhoodModule.parkSide);
    }
    const featureSide: NeighborhoodSide = index % 2 === 0 ? -1 : 1;
    if (neighborhoodModule.commercial) {
      this.createCommercialFacade(segment, index, featureSide);
    }
    if (neighborhoodModule.garage) {
      this.createGarage(segment, index, featureSide === -1 ? 1 : -1);
    }
    const destinationEmphasis = neighborhoodModule.destinationEmphasis;
    if (destinationEmphasis === 1 || destinationEmphasis === 2) {
      this.createDestinationMarker(
        segment,
        index,
        featureSide,
        destinationEmphasis
      );
    }

    [-1, 1].forEach((side, sideIndex) => {
      const lot = urbanLotFor(index, side < 0 ? -1 : 1);
      const variant = lot.variant;
      const root = new TransformNode(
        `scenery-${index}-${sideIndex}`,
        this.scene
      );
      root.parent = segment;
      root.position.set(lot.position.x, lot.position.y, lot.position.z);
      root.rotation.y = lot.rotationY;

      const names = {
        shadow: `scenery-shadow-${index}-${sideIndex}`,
        tower: `scenery-tower-${index}-${sideIndex}`,
        feature: `scenery-feature-${index}-${sideIndex}`,
        crown: `scenery-crown-${index}-${sideIndex}`,
        accent: `scenery-detail-${index}-${sideIndex}`,
        door: `scenery-door-${index}-${sideIndex}`,
        windowSecondary: `scenery-window-secondary-${index}-${sideIndex}`,
        trunk: `scenery-trunk-${index}-${sideIndex}`,
        planter: `scenery-planter-${index}-${sideIndex}`,
        walkway: `scenery-walkway-${index}-${sideIndex}`,
        fence: `scenery-fence-${index}-${sideIndex}`,
        lampPost: `scenery-lamp-post-${index}-${sideIndex}`,
        lampHead: `scenery-lamp-head-${index}-${sideIndex}`,
        parkedCar: `scenery-parked-car-${index}-${sideIndex}`,
        shrub: `scenery-shrub-${index}-${sideIndex}`,
      };
      const sources = this.scenerySources;
      let shadow: AbstractMesh;
      let tower: AbstractMesh;
      let feature: AbstractMesh;
      let crown: AbstractMesh;
      let accent: AbstractMesh;
      let door: AbstractMesh;
      let windowSecondary: AbstractMesh;
      let trunk: AbstractMesh;
      let planter: AbstractMesh;
      let walkway: AbstractMesh;
      let fence: AbstractMesh;
      let lampPost: AbstractMesh;
      let lampHead: AbstractMesh;
      let parkedCar: AbstractMesh;
      let shrub: AbstractMesh;

      if (sources) {
        shadow = new InstancedMesh(names.shadow, sources.shadow);
        tower = new InstancedMesh(names.tower, sources.tower);
        feature = new InstancedMesh(names.feature, sources.feature);
        crown = new InstancedMesh(names.crown, sources.crown);
        accent = new InstancedMesh(names.accent, sources.accent);
        door = new InstancedMesh(names.door, sources.door);
        windowSecondary = new InstancedMesh(
          names.windowSecondary,
          sources.windowSecondary
        );
        trunk = new InstancedMesh(names.trunk, sources.trunk);
        planter = new InstancedMesh(names.planter, sources.planter);
        walkway = new InstancedMesh(names.walkway, sources.walkway);
        fence = new InstancedMesh(names.fence, sources.fence);
        lampPost = new InstancedMesh(names.lampPost, sources.lampPost);
        lampHead = new InstancedMesh(names.lampHead, sources.lampHead);
        parkedCar = new InstancedMesh(names.parkedCar, sources.parkedCar);
        shrub = new InstancedMesh(names.shrub, sources.shrub);
      } else {
        const shadowSource = MeshBuilder.CreateDisc(
          names.shadow,
          { radius: 2.6, tessellation: 18 },
          this.scene
        );
        const towerSource = MeshBuilder.CreateBox(
          names.tower,
          { size: 1 },
          this.scene
        );
        const featureSource = MeshBuilder.CreateCylinder(
          names.feature,
          {
            height: 1,
            diameterTop: 0,
            diameterBottom: 1,
            tessellation: 4,
          },
          this.scene
        );
        const crownSource = MeshBuilder.CreateSphere(
          names.crown,
          { diameter: 1, segments: 6 },
          this.scene
        );
        const accentSource = MeshBuilder.CreateBox(
          names.accent,
          { size: 1 },
          this.scene
        );
        const doorSource = MeshBuilder.CreateBox(
          names.door,
          { size: 1 },
          this.scene
        );
        const windowSecondarySource = MeshBuilder.CreateBox(
          names.windowSecondary,
          { size: 1 },
          this.scene
        );
        const trunkSource = MeshBuilder.CreateBox(
          names.trunk,
          { size: 1 },
          this.scene
        );
        const planterSource = MeshBuilder.CreateBox(
          names.planter,
          { size: 1 },
          this.scene
        );
        const walkwaySource = MeshBuilder.CreateBox(
          names.walkway,
          { size: 1 },
          this.scene
        );
        const fenceSource = MeshBuilder.CreateBox(
          names.fence,
          { size: 1 },
          this.scene
        );
        const lampPostSource = MeshBuilder.CreateCylinder(
          names.lampPost,
          { height: 1, diameter: 1, tessellation: 8 },
          this.scene
        );
        const lampHeadSource = MeshBuilder.CreateBox(
          names.lampHead,
          { size: 1 },
          this.scene
        );
        const parkedCarSource = MeshBuilder.CreateBox(
          names.parkedCar,
          { size: 1 },
          this.scene
        );
        const shrubSource = MeshBuilder.CreateSphere(
          names.shrub,
          { diameter: 1, segments: 6 },
          this.scene
        );
        shadowSource.material = this.sceneryShadowMaterial;
        towerSource.material = this.sceneryMaterial;
        featureSource.material = this.scenerySecondaryMaterial;
        crownSource.material = this.sceneryFoliageMaterial;
        accentSource.material = this.sceneryAccentMaterial;
        doorSource.material = this.scenerySecondaryMaterial;
        windowSecondarySource.material = this.sceneryAccentMaterial;
        trunkSource.material = this.sceneryWoodMaterial;
        planterSource.material = this.sceneryMaterial;
        walkwaySource.material = this.sceneryPavementMaterial;
        fenceSource.material = this.sceneryFenceMaterial;
        lampPostSource.material = this.scenerySecondaryMaterial;
        lampHeadSource.material = this.sceneryAccentMaterial;
        parkedCarSource.material = this.sceneryVehicleMaterial;
        shrubSource.material = this.sceneryFoliageMaterial;
        this.scenerySources = {
          shadow: shadowSource,
          tower: towerSource,
          feature: featureSource,
          crown: crownSource,
          accent: accentSource,
          door: doorSource,
          windowSecondary: windowSecondarySource,
          trunk: trunkSource,
          planter: planterSource,
          walkway: walkwaySource,
          fence: fenceSource,
          lampPost: lampPostSource,
          lampHead: lampHeadSource,
          parkedCar: parkedCarSource,
          shrub: shrubSource,
        };
        shadow = shadowSource;
        tower = towerSource;
        feature = featureSource;
        crown = crownSource;
        accent = accentSource;
        door = doorSource;
        windowSecondary = windowSecondarySource;
        trunk = trunkSource;
        planter = planterSource;
        walkway = walkwaySource;
        fence = fenceSource;
        lampPost = lampPostSource;
        lampHead = lampHeadSource;
        parkedCar = parkedCarSource;
        shrub = shrubSource;
      }

      shadow.parent = root;
      shadow.position.y = 0.03;
      shadow.rotation.x = Math.PI / 2;
      shadow.scaling.y = 0.48;
      tower.parent = root;
      feature.parent = root;
      crown.parent = root;
      accent.parent = root;
      door.parent = root;
      windowSecondary.parent = root;
      trunk.parent = root;
      planter.parent = root;
      walkway.parent = root;
      fence.parent = root;
      lampPost.parent = root;
      lampHead.parent = root;
      parkedCar.parent = root;
      shrub.parent = root;

      [
        shadow,
        tower,
        feature,
        crown,
        accent,
        door,
        windowSecondary,
        trunk,
        planter,
        walkway,
        fence,
        lampPost,
        lampHead,
        parkedCar,
        shrub,
      ].forEach(mesh => {
        mesh.isPickable = false;
      });
      this.clusters.push({
        root,
        tower,
        feature,
        crown,
        accent,
        door,
        windowSecondary,
        trunk,
        planter,
        walkway,
        fence,
        lampPost,
        lampHead,
        parkedCar,
        shrub,
        shadow,
        variant,
        lot,
        side: side < 0 ? -1 : 1,
        module: neighborhoodModule,
      });
    });
    this.configureClusters();
  }

  private createBusStop(
    segment: TransformNode,
    index: number,
    side: NeighborhoodSide
  ): void {
    if (side === 0) return;
    const root = new TransformNode(
      `neighborhood-bus-stop-${index}`,
      this.scene
    );
    root.parent = segment;
    root.position.set(side * 11.2, 0.02, 1.8);
    root.rotation.y = side < 0 ? Math.PI : 0;

    const platform = MeshBuilder.CreateBox(
      `neighborhood-bus-platform-${index}`,
      { width: 4.6, height: 0.16, depth: 2.2 },
      this.scene
    );
    platform.parent = root;
    platform.position.y = 0.08;
    platform.material = this.sceneryPavementMaterial;

    [-1.65, 1.65].forEach((x, postIndex) => {
      const post = MeshBuilder.CreateBox(
        `neighborhood-bus-post-${index}-${postIndex}`,
        { width: 0.16, height: 2.6, depth: 0.16 },
        this.scene
      );
      post.parent = root;
      post.position.set(x, 1.38, 0.55);
      post.material = this.scenerySecondaryMaterial;
    });

    const roof = MeshBuilder.CreateBox(
      `neighborhood-bus-roof-${index}`,
      { width: 4.35, height: 0.18, depth: 1.75 },
      this.scene
    );
    roof.parent = root;
    roof.position.set(0, 2.72, 0.42);
    roof.material = this.sceneryAccentMaterial;

    const bench = MeshBuilder.CreateBox(
      `neighborhood-bus-bench-${index}`,
      { width: 2.6, height: 0.34, depth: 0.55 },
      this.scene
    );
    bench.parent = root;
    bench.position.set(0, 0.65, 0.55);
    bench.material = this.sceneryWoodMaterial;

    const sign = MeshBuilder.CreateBox(
      `neighborhood-bus-sign-${index}`,
      { width: 0.78, height: 1.08, depth: 0.12 },
      this.scene
    );
    sign.parent = root;
    sign.position.set(-2.25, 1.75, 0);
    sign.material = this.sceneryAccentMaterial;

    root.getChildMeshes(false).forEach(mesh => {
      mesh.isPickable = false;
    });
    this.neighborhoodFeatures.push({ root, kind: "bus-stop" });
  }

  private createPark(
    segment: TransformNode,
    index: number,
    side: NeighborhoodSide
  ): void {
    if (side === 0) return;
    const root = new TransformNode(`neighborhood-park-${index}`, this.scene);
    root.parent = segment;
    root.position.set(side * 15.2, 0, 0);

    const lawn = MeshBuilder.CreateBox(
      `neighborhood-park-lawn-${index}`,
      { width: 8.8, height: 0.12, depth: 15.8 },
      this.scene
    );
    lawn.parent = root;
    lawn.position.y = -0.02;
    lawn.material = this.sceneryFoliageMaterial;

    const path = MeshBuilder.CreateBox(
      `neighborhood-park-path-${index}`,
      { width: 1.3, height: 0.1, depth: 14.5 },
      this.scene
    );
    path.parent = root;
    path.position.y = 0.07;
    path.material = this.sceneryPavementMaterial;

    [-2.7, 2.7].forEach((x, treeIndex) => {
      const trunk = MeshBuilder.CreateCylinder(
        `neighborhood-park-trunk-${index}-${treeIndex}`,
        { height: 2.2, diameter: 0.38, tessellation: 7 },
        this.scene
      );
      trunk.parent = root;
      trunk.position.set(x, 1.1, treeIndex === 0 ? -3.7 : 3.7);
      trunk.material = this.sceneryWoodMaterial;

      const crown = MeshBuilder.CreateSphere(
        `neighborhood-park-crown-${index}-${treeIndex}`,
        { diameter: 2.8, segments: 6 },
        this.scene
      );
      crown.parent = root;
      crown.position.set(x, 2.9, treeIndex === 0 ? -3.7 : 3.7);
      crown.scaling.y = 0.82;
      crown.material = this.sceneryFoliageMaterial;
    });

    const bench = MeshBuilder.CreateBox(
      `neighborhood-park-bench-${index}`,
      { width: 2.2, height: 0.38, depth: 0.6 },
      this.scene
    );
    bench.parent = root;
    bench.position.set(2.2, 0.55, 0);
    bench.rotation.y = Math.PI / 2;
    bench.material = this.sceneryWoodMaterial;

    root.getChildMeshes(false).forEach(mesh => {
      mesh.isPickable = false;
    });
    this.neighborhoodFeatures.push({ root, kind: "park" });
  }

  private createCommercialFacade(
    segment: TransformNode,
    index: number,
    side: NeighborhoodSide
  ): void {
    if (side === 0) return;
    const root = new TransformNode(
      `neighborhood-commercial-${index}`,
      this.scene
    );
    root.parent = segment;
    root.position.set(side * 17.6, 0, -1.2);
    root.rotation.y = side < 0 ? Math.PI : 0;

    const body = MeshBuilder.CreateBox(
      `neighborhood-commercial-body-${index}`,
      { width: 7.8, height: 4.1, depth: 5.2 },
      this.scene
    );
    body.parent = root;
    body.position.y = 2.05;
    body.material = this.sceneryMaterial;

    const fascia = MeshBuilder.CreateBox(
      `neighborhood-commercial-fascia-${index}`,
      { width: 7.2, height: 0.82, depth: 0.2 },
      this.scene
    );
    fascia.parent = root;
    fascia.position.set(0, 3.12, -2.7);
    fascia.material = this.sceneryAccentMaterial;

    const awning = MeshBuilder.CreateBox(
      `neighborhood-commercial-awning-${index}`,
      { width: 7.45, height: 0.22, depth: 1.25 },
      this.scene
    );
    awning.parent = root;
    awning.position.set(0, 2.15, -3.12);
    awning.material = this.scenerySecondaryMaterial;

    [-2.1, 0, 2.1].forEach((x, windowIndex) => {
      const window = MeshBuilder.CreateBox(
        `neighborhood-commercial-window-${index}-${windowIndex}`,
        { width: 1.5, height: 1.38, depth: 0.12 },
        this.scene
      );
      window.parent = root;
      window.position.set(x, 1.18, -2.68);
      window.material = this.sceneryAccentMaterial;
    });

    root.getChildMeshes(false).forEach(mesh => {
      mesh.isPickable = false;
    });
    this.neighborhoodFeatures.push({ root, kind: "commercial" });
  }

  private createGarage(
    segment: TransformNode,
    index: number,
    side: NeighborhoodSide
  ): void {
    if (side === 0) return;
    const root = new TransformNode(`neighborhood-garage-${index}`, this.scene);
    root.parent = segment;
    root.position.set(side * 14.4, 0, 2.8);
    root.rotation.y = side < 0 ? Math.PI : 0;

    const slab = MeshBuilder.CreateBox(
      `neighborhood-garage-slab-${index}`,
      { width: 5.2, height: 0.12, depth: 5.4 },
      this.scene
    );
    slab.parent = root;
    slab.position.y = 0.06;
    slab.material = this.sceneryPavementMaterial;

    [-2.1, 2.1].forEach((x, postIndex) => {
      const post = MeshBuilder.CreateBox(
        `neighborhood-garage-post-${index}-${postIndex}`,
        { width: 0.18, height: 2.45, depth: 0.18 },
        this.scene
      );
      post.parent = root;
      post.position.set(x, 1.28, 0);
      post.material = this.sceneryFenceMaterial;
    });

    const roof = MeshBuilder.CreateBox(
      `neighborhood-garage-roof-${index}`,
      { width: 5.35, height: 0.2, depth: 5.55 },
      this.scene
    );
    roof.parent = root;
    roof.position.y = 2.55;
    roof.material = this.scenerySecondaryMaterial;

    const vehicle = MeshBuilder.CreateBox(
      `neighborhood-garage-vehicle-${index}`,
      { width: 2.05, height: 0.95, depth: 3.5 },
      this.scene
    );
    vehicle.parent = root;
    vehicle.position.set(0, 0.55, 0.25);
    vehicle.material = this.sceneryVehicleMaterial;

    root.getChildMeshes(false).forEach(mesh => {
      mesh.isPickable = false;
    });
    this.neighborhoodFeatures.push({ root, kind: "garage" });
  }

  private createDestinationMarker(
    segment: TransformNode,
    index: number,
    side: NeighborhoodSide,
    destinationEmphasis: 1 | 2
  ): void {
    if (side === 0) return;
    const root = new TransformNode(
      `neighborhood-destination-${index}`,
      this.scene
    );
    root.parent = segment;
    root.position.set(side * 11.5, 0, -3.6);
    root.rotation.y = side < 0 ? Math.PI : 0;
    root.scaling.setAll(destinationEmphasis === 2 ? 1.12 : 0.92);

    const pillar = MeshBuilder.CreateBox(
      `neighborhood-destination-pillar-${index}`,
      { width: 0.48, height: 3.8, depth: 0.48 },
      this.scene
    );
    pillar.parent = root;
    pillar.position.y = 1.9;
    pillar.material = this.scenerySecondaryMaterial;

    const sign = MeshBuilder.CreateBox(
      `neighborhood-destination-sign-${index}`,
      { width: 3.9, height: 1.52, depth: 0.22 },
      this.scene
    );
    sign.parent = root;
    sign.position.set(0, 3.2, -0.08);
    sign.material = this.sceneryAccentMaterial;

    [-0.52, 0.52].forEach((x, markIndex) => {
      const mark = MeshBuilder.CreateBox(
        `neighborhood-destination-x-${index}-${markIndex}`,
        { width: 0.22, height: 1.04, depth: 0.12 },
        this.scene
      );
      mark.parent = root;
      mark.position.set(x, 3.2, -0.22);
      mark.rotation.z = markIndex === 0 ? Math.PI / 4 : -Math.PI / 4;
      mark.material = this.sceneryFenceMaterial;
    });

    const beacon = MeshBuilder.CreateCylinder(
      `neighborhood-destination-beacon-${index}`,
      { height: 0.2, diameter: 1.2, tessellation: 16 },
      this.scene
    );
    beacon.parent = root;
    beacon.position.set(0, 0.12, -1.8);
    beacon.material = this.sceneryAccentMaterial;

    root.getChildMeshes(false).forEach(mesh => {
      mesh.isPickable = false;
    });
    this.neighborhoodFeatures.push({ root, kind: "destination" });
  }

  setEra(vehicle: VehicleConfig): void {
    this.setTheme(vehicle, terrainForEra(vehicle), "clear", "urban");
  }

  setTheme(
    vehicle: VehicleConfig,
    terrain: RouteTerrain,
    weather: WeatherCondition,
    compoundId: TireCompoundId
  ): void {
    this.terrain = terrain;
    this.weather = weather;
    this.neighborhoodFeatures.forEach(feature =>
      feature.root.setEnabled(terrain === "urban")
    );
    const palette = environmentPalette(terrain);
    const clearSky =
      vehicle.id === "fleet" || vehicle.id === "planetary"
        ? "#091222"
        : terrain === "urban"
          ? "#68C9F2"
          : "#3F91BD";
    const skyByWeather: Record<WeatherCondition, string> = {
      clear: clearSky,
      rain: "#56798D",
      heat: terrain === "urban" ? "#62BCE4" : "#3F91BD",
      dust: "#59636A",
      cold: "#7AB4D0",
      storm: "#15283A",
    };
    const sky = Color3.FromHexString(skyByWeather[weather]);
    const accent = Color3.FromHexString("#18BFEA");

    this.scene.clearColor.set(sky.r, sky.g, sky.b, 1);
    this.scene.fogColor.copyFrom(sky);
    this.scene.fogStart =
      weather === "storm" || weather === "dust"
        ? 42
        : weather === "rain"
          ? 58
          : terrain === "urban"
            ? 86
            : 68;
    this.scene.fogEnd =
      weather === "storm" || weather === "dust"
        ? 132
        : weather === "rain"
          ? 164
          : terrain === "urban"
            ? 228
            : 192;

    this.skyMaterial.emissiveColor.copyFrom(sky.scale(0.9));
    this.sceneryMaterial.diffuseColor = Color3.FromHexString(palette.scenery);
    this.scenerySecondaryMaterial.diffuseColor = Color3.FromHexString(
      palette.scenerySecondary
    );
    this.sceneryAccentMaterial.diffuseColor = accent;
    this.sceneryAccentMaterial.emissiveColor = accent.scale(
      compoundId === "planet"
        ? 0.62
        : terrain === "orbital" || terrain === "planetary"
          ? 0.46
          : 0.2
    );

    const isSevere = weather === "storm" || weather === "rain";
    this.sun.setEnabled(!isSevere && weather !== "dust");
    this.sunMaterial.emissiveColor = Color3.FromHexString(
      weather === "cold" ? "#18BFEA" : "#EDF5F6"
    );
    this.cloudMaterial.alpha =
      weather === "storm"
        ? 0.5
        : weather === "rain"
          ? 0.42
          : terrain === "urban"
            ? 0.68
            : 0.34;
    this.cloudMaterial.emissiveColor = isSevere
      ? sky.scale(0.62).add(Color3.FromHexString("#D7E2E7").scale(0.48))
      : Color3.FromHexString("#F4FBFE");

    const spaceRoute = terrain === "orbital" || terrain === "planetary";
    this.stars.forEach(star => star.setEnabled(spaceRoute && !isSevere));
    // Rota orbital/planetaria nao tem atmosfera: nuvem ali e artefato visual.
    this.cloudsVisible = !spaceRoute;
    this.clouds.forEach(cloud => cloud.setEnabled(this.cloudsVisible));
    this.configureWeatherStreaks();
    this.configureClusters();
    this.configureLights(sky, weather, terrain);
  }

  update(delta: number, speed: number): void {
    this.visualTime += delta;
    const speedFactor = Math.max(0, Math.min(1, (speed - 13) / 20));
    const atmosphereActive = this.streakMaterial.alpha > 0.001;
    if (!atmosphereActive && !this.cloudsVisible) return;
    if (atmosphereActive)
      this.streaks.forEach((streak, index) => {
        const rainFactor =
          this.weather === "rain" || this.weather === "storm" ? 1 : 0.28;
        streak.root.position.z -= delta * (24 + speed * 0.72);
        streak.root.position.y -= delta * (7 + rainFactor * 16);
        if (streak.root.position.z < -5 || streak.root.position.y < 0.2) {
          streak.root.position.z = 42 + ((index * 13) % 28);
          streak.root.position.y = 3 + ((index * 17) % 72) / 10;
        }
        const pulse =
          0.72 + Math.sin(this.visualTime * 4 + streak.phase) * 0.18;
        streak.root.scaling.z = 0.82 + speedFactor * 1.9;
        streak.root.scaling.x = pulse;
      });

    if (!this.cloudsVisible) return;
    this.clouds.forEach((cloud, index) => {
      cloud.position.x += delta * (0.32 + index * 0.045);
      if (cloud.position.x > 92) cloud.position.x = -92;
    });
  }

  dispose(): void {
    this.root.dispose(false, false);
    [...this.clusters]
      .reverse()
      .forEach(cluster => cluster.root.dispose(false, false));
    [
      this.sceneryMaterial,
      this.scenerySecondaryMaterial,
      this.sceneryAccentMaterial,
      this.sceneryFoliageMaterial,
      this.sceneryWoodMaterial,
      this.sceneryPavementMaterial,
      this.sceneryFenceMaterial,
      this.sceneryVehicleMaterial,
      this.sceneryShadowMaterial,
      this.skyMaterial,
      this.sunMaterial,
      this.cloudMaterial,
      this.streakMaterial,
      this.starMaterial,
    ].forEach(material => material.dispose());
  }

  private configureClusters(): void {
    this.clusters.forEach(cluster => {
      const parkOccupiesSide =
        this.terrain === "urban" && cluster.module.parkSide === cluster.side;
      cluster.root.setEnabled(!parkOccupiesSide);
      const size = 0.92 + cluster.variant * 0.035;
      cluster.tower.setEnabled(true);
      cluster.feature.setEnabled(true);
      cluster.crown.setEnabled(true);
      cluster.accent.setEnabled(true);
      const urbanDetails = this.terrain === "urban";
      cluster.door.setEnabled(urbanDetails);
      cluster.windowSecondary.setEnabled(urbanDetails);
      cluster.trunk.setEnabled(urbanDetails);
      cluster.planter.setEnabled(urbanDetails);
      cluster.walkway.setEnabled(urbanDetails);
      cluster.fence.setEnabled(urbanDetails);
      cluster.lampPost.setEnabled(urbanDetails);
      cluster.lampHead.setEnabled(urbanDetails);
      cluster.parkedCar.setEnabled(urbanDetails && cluster.module.garage);
      cluster.shrub.setEnabled(urbanDetails);
      cluster.root.scaling.setAll(size);
      cluster.shadow.scaling.set(1, 0.54, 1);
      cluster.tower.rotation.set(0, 0, 0);
      cluster.feature.rotation.set(0, 0, 0);
      cluster.crown.rotation.set(0, 0, 0);
      cluster.accent.rotation.set(0, 0, 0);
      cluster.door.rotation.set(0, 0, 0);
      cluster.windowSecondary.rotation.set(0, 0, 0);
      cluster.trunk.rotation.set(0, 0, 0);
      cluster.planter.rotation.set(0, 0, 0);
      cluster.walkway.rotation.set(0, 0, 0);
      cluster.fence.rotation.set(0, 0, 0);
      cluster.lampPost.rotation.set(0, 0, 0);
      cluster.lampHead.rotation.set(0, 0, 0);
      cluster.parkedCar.rotation.set(0, 0, 0);
      cluster.shrub.rotation.set(0, 0, 0);

      if (this.terrain === "urban") {
        const { lot } = cluster;
        cluster.root.position.set(
          lot.position.x,
          lot.position.y,
          lot.position.z
        );
        cluster.root.rotation.y = lot.rotationY;
        const wallHeight = lot.wallHeight;
        const wallWidth = lot.wallWidth;
        const wallDepth = lot.wallDepth;
        const facadeZ = -wallDepth / 2 - 0.085;
        const treeX = lot.treeOffsetX;
        const treeZ = lot.treeOffsetZ;

        cluster.tower.scaling.set(wallWidth, wallHeight, wallDepth);
        cluster.tower.position.set(0, wallHeight / 2 + 0.08, 0);
        cluster.feature.scaling.set(
          wallWidth * 1.1,
          lot.roofHeight,
          wallDepth * 1.1
        );
        cluster.feature.position.set(
          0,
          wallHeight + 0.08 + lot.roofHeight / 2,
          0
        );
        cluster.feature.rotation.y = Math.PI / 4;

        cluster.accent.scaling.set(0.94, 0.9, 0.1);
        cluster.accent.position.set(-1.25, 1.62, facadeZ);
        cluster.windowSecondary.scaling.set(0.94, 0.9, 0.1);
        cluster.windowSecondary.position.set(1.25, 1.62, facadeZ);
        cluster.door.scaling.set(0.76, 1.55, 0.12);
        cluster.door.position.set(0, 0.78, facadeZ - 0.015);

        cluster.trunk.scaling.set(0.34, 1.38, 0.34);
        cluster.trunk.position.set(treeX, 0.72, treeZ);
        cluster.crown.scaling.set(
          2.04 + (cluster.variant % 2) * 0.28,
          1.62 + (cluster.variant % 3) * 0.08,
          1.72
        );
        cluster.crown.position.set(treeX, 1.74, treeZ);
        cluster.planter.scaling.set(1.38, 0.3, 1.08);
        cluster.planter.position.set(treeX, 0.15, treeZ);

        cluster.walkway.scaling.set(1.15, 0.12, 2.65);
        cluster.walkway.position.set(0, 0.06, facadeZ - 1.34);
        cluster.fence.scaling.set(0.14, 0.88, wallDepth + 2.7);
        cluster.fence.position.set(
          treeX > 0 ? -wallWidth / 2 - 0.82 : wallWidth / 2 + 0.82,
          0.44,
          -0.3
        );
        const lampX = treeX > 0 ? -3.7 : 3.7;
        cluster.lampPost.scaling.set(0.16, 3.45, 0.16);
        cluster.lampPost.position.set(lampX, 1.73, facadeZ - 2.25);
        cluster.lampHead.scaling.set(0.72, 0.2, 0.46);
        cluster.lampHead.position.set(lampX, 3.5, facadeZ - 2.42);
        cluster.parkedCar.scaling.set(1.72, 0.72, 3.05);
        cluster.parkedCar.position.set(-treeX * 0.62, 0.38, facadeZ - 3.1);
        cluster.shrub.scaling.set(1.2, 0.66, 0.82);
        cluster.shrub.position.set(treeX * 0.55, 0.34, facadeZ - 1.5);

        cluster.shadow.scaling.set(1.52, 0.68, 1);

        if (cluster.module.commercial) {
          cluster.feature.rotation.y = 0;
          cluster.feature.scaling.set(wallWidth * 1.08, 0.32, wallDepth * 1.08);
          cluster.feature.position.y = wallHeight + 0.24;
          cluster.accent.scaling.set(2.45, 0.62, 0.1);
          cluster.accent.position.set(0, 2.6, facadeZ - 0.03);
        }
        if (cluster.module.destinationEmphasis > 0) {
          cluster.accent.scaling.set(1.5, 1.2, 0.12);
          cluster.accent.position.set(0, 1.86, facadeZ - 0.04);
          cluster.lampHead.scaling.set(0.9, 0.24, 0.54);
        }
      } else if (this.terrain === "highway") {
        cluster.root.rotation.y = 0;
        cluster.tower.scaling.set(0.62, 3.4 + cluster.variant * 0.22, 0.62);
        cluster.tower.position.y = cluster.tower.scaling.y / 2;
        cluster.feature.setEnabled(false);
        cluster.crown.scaling.set(4.1, 3, 3.45);
        cluster.crown.position.y = cluster.tower.scaling.y + 0.75;
        cluster.accent.setEnabled(false);
      } else if (this.terrain === "industrial") {
        cluster.root.rotation.y = 0;
        cluster.tower.scaling.set(4.2, 2.55, 3.6);
        cluster.tower.position.y = 1.15;
        cluster.feature.scaling.set(1.35, 5.8 + cluster.variant * 0.35, 1.35);
        cluster.feature.position.set(1.55, 3.05, 0.55);
        cluster.feature.rotation.y = Math.PI / 4;
        cluster.crown.setEnabled(false);
        cluster.accent.scaling.set(4.25, 0.22, 0.16);
        cluster.accent.position.set(0, 1.36, -1.86);
      } else if (this.terrain === "offroad") {
        cluster.root.rotation.y = 0;
        cluster.tower.scaling.set(3.6, 1.25 + cluster.variant * 0.13, 2.8);
        cluster.tower.position.y = 0.36;
        cluster.tower.rotation.z = 0.08 * (cluster.variant - 2);
        cluster.feature.scaling.set(2.4, 1.35, 2.1);
        cluster.feature.position.set(1.35, 0.72, 0);
        cluster.feature.rotation.y = Math.PI / 4;
        cluster.crown.scaling.set(2.8, 1.5, 2.2);
        cluster.crown.position.set(-0.85, 0.92, -0.25);
        cluster.accent.setEnabled(false);
      } else if (this.terrain === "orbital") {
        cluster.root.rotation.y = 0;
        cluster.tower.scaling.set(1.5, 6.8 + cluster.variant * 0.55, 1.5);
        cluster.tower.position.y = cluster.tower.scaling.y / 2 - 0.14;
        cluster.feature.scaling.set(4.2, 0.35, 4.2);
        cluster.feature.position.y = 4.3 + cluster.variant * 0.2;
        cluster.feature.rotation.y = Math.PI / 4;
        cluster.crown.setEnabled(false);
        cluster.accent.scaling.set(0.24, 5.6, 0.24);
        cluster.accent.position.set(0, 3.5, -0.85);
      } else {
        cluster.root.rotation.y = 0;
        cluster.tower.scaling.set(3.8, 1.15, 3.1);
        cluster.tower.position.y = 0.28;
        cluster.feature.scaling.set(2.6, 5.4 + cluster.variant * 0.5, 2.6);
        cluster.feature.position.set(0.5, 2.8, 0);
        cluster.feature.rotation.y = Math.PI / 4;
        cluster.crown.setEnabled(false);
        cluster.accent.scaling.set(0.34, 4.1, 0.34);
        cluster.accent.position.set(-1.2, 2, -0.3);
        cluster.accent.rotation.z = 0.2;
      }
    });
  }

  private configureWeatherStreaks(): void {
    const active =
      this.weather === "rain" ||
      this.weather === "storm" ||
      this.weather === "dust" ||
      this.weather === "cold";
    this.streakMaterial.alpha = active
      ? this.weather === "storm"
        ? 0.32
        : this.weather === "rain"
          ? 0.24
          : 0.13
      : 0;
    this.streakMaterial.emissiveColor = Color3.FromHexString(
      this.weather === "dust"
        ? "#8FA4AF"
        : this.weather === "cold"
          ? "#EDF5F6"
          : "#18BFEA"
    );
    const rain = this.weather === "rain" || this.weather === "storm";
    this.streaks.forEach(streak => {
      streak.root.setEnabled(active);
      streak.root.rotation.z = rain ? -0.2 : 0.12;
      streak.root.scaling.set(rain ? 0.24 : 0.7, rain ? 2.4 : 0.5, 1);
    });
  }

  private configureLights(
    sky: Color3,
    weather: WeatherCondition,
    terrain: RouteTerrain
  ): void {
    const ambient = this.scene.getLightByName("ambient");
    const sun = this.scene.getLightByName("sun");
    const rim = this.scene.getLightByName("rim-light");
    const severe = weather === "storm" || weather === "rain";
    const urbanDaylight = terrain === "urban" && !severe;
    this.scene.imageProcessingConfiguration.exposure = urbanDaylight
      ? 1.16
      : 1.04;
    this.scene.imageProcessingConfiguration.contrast = urbanDaylight
      ? 1.05
      : 1.12;
    if (ambient) {
      ambient.intensity = severe
        ? 0.66
        : terrain === "planetary"
          ? 0.72
          : urbanDaylight
            ? 1.08
            : 0.86;
      ambient.diffuse = urbanDaylight
        ? Color3.FromHexString("#F3FAFD")
        : sky.scale(0.38).add(Color3.FromHexString("#EDF5F6").scale(0.58));
    }
    if (sun) {
      sun.intensity =
        weather === "storm"
          ? 0.38
          : weather === "rain"
            ? 0.62
            : urbanDaylight
              ? 1.2
              : 1.02;
      sun.diffuse = Color3.FromHexString(
        weather === "cold" ? "#BFE9FA" : "#F7FBFF"
      );
    }
    if (rim) {
      rim.intensity =
        terrain === "orbital" || terrain === "planetary" ? 0.42 : 0.24;
      rim.diffuse = Color3.FromHexString(
        terrain === "orbital" || terrain === "planetary" ? "#18BFEA" : "#12547A"
      );
    }
  }

  private createClouds(): void {
    for (let index = 0; index < 7; index += 1) {
      const cloud = new TransformNode(`cloud-${index}`, this.scene);
      cloud.parent = this.root;
      cloud.position.set(
        -78 + index * 25,
        25 + (index % 3) * 6,
        75 + (index % 2) * 22
      );
      cloud.scaling.set(1 + (index % 2) * 0.28, 0.65, 1);
      this.clouds.push(cloud);
      [-1.7, 0, 1.55].forEach((offset, puffIndex) => {
        const puff = MeshBuilder.CreateSphere(
          `cloud-${index}-puff-${puffIndex}`,
          { diameter: 6.5 + puffIndex * 0.8, segments: 6 },
          this.scene
        );
        puff.parent = cloud;
        puff.position.set(offset * 1.75, puffIndex === 1 ? 1 : 0, 0);
        puff.scaling.y = 0.55;
        puff.material = this.cloudMaterial;
        puff.isPickable = false;
      });
    }
  }

  private createStars(): void {
    for (let index = 0; index < 18; index += 1) {
      const star = new TransformNode(`star-${index}`, this.scene);
      star.parent = this.root;
      star.position.set(
        -72 + ((index * 37) % 144),
        18 + ((index * 29) % 48),
        78 + ((index * 17) % 42)
      );
      const spark = MeshBuilder.CreateDisc(
        `star-spark-${index}`,
        { radius: 0.16 + (index % 3) * 0.08, tessellation: 8 },
        this.scene
      );
      spark.parent = star;
      spark.material = this.starMaterial;
      spark.isPickable = false;
      star.setEnabled(false);
      this.stars.push(star);
    }
  }

  private createAtmosphereStreaks(): void {
    for (let index = 0; index < 16; index += 1) {
      const root = new TransformNode(`atmosphere-streak-${index}`, this.scene);
      root.parent = this.root;
      root.position.set(
        -13 + ((index * 19) % 27),
        1.2 + ((index * 17) % 76) / 10,
        10 + ((index * 23) % 54)
      );
      const streak = MeshBuilder.CreatePlane(
        `atmosphere-particle-${index}`,
        { width: 0.05, height: 1.8 },
        this.scene
      );
      streak.parent = root;
      streak.material = this.streakMaterial;
      streak.isPickable = false;
      root.setEnabled(false);
      this.streaks.push({ root, phase: index * 0.73 });
    }
  }

  private material(
    name: string,
    color: string,
    specular = 0.2,
    emissive?: string
  ): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.ambientColor = material.diffuseColor.scale(0.32);
    material.specularColor = new Color3(specular, specular, specular);
    material.specularPower = 48;
    if (emissive) material.emissiveColor = Color3.FromHexString(emissive);
    return material;
  }

  private unlitMaterial(
    name: string,
    color: string,
    alpha: number
  ): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.disableLighting = true;
    material.diffuseColor = Color3.Black();
    material.emissiveColor = Color3.FromHexString(color);
    material.specularColor = Color3.Black();
    material.alpha = alpha;
    material.backFaceCulling = false;
    return material;
  }
}

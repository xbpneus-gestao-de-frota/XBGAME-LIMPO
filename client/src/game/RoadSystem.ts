import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { LANE_POSITIONS } from "./config";
import { deliveryStopPose } from "./deliveryExperience";
import {
  EnvironmentVisuals,
  environmentPalette,
  terrainForEra,
} from "./environmentVisuals";
import type {
  RouteTerrain,
  TireCompoundId,
  VehicleConfig,
  WeatherCondition,
} from "./types";
import { urbanRoadDecorFor } from "./urbanLayout";
import { neighborhoodCurvePose } from "./neighborhoodLayout";
import {
  advanceNeighborhoodPath,
  createNeighborhoodPathState,
  resetNeighborhoodPath,
  type NeighborhoodPathState,
} from "./neighborhoodRuntime";

type ActorKind = "cargo" | "tire" | "cone" | "pothole";

interface RoadActor {
  root: TransformNode;
  kind: ActorKind;
  laneIndex: number;
  resolved: boolean;
  collisionHalfWidth: number;
  collisionDepth: number;
  visualPhase: number;
}

interface DeliveryPersonVisual {
  root: TransformNode;
  leftArm: Mesh;
  rightArm: Mesh;
}

interface DeliveryStopVisual {
  root: TransformNode;
  courier: DeliveryPersonVisual;
  customer: DeliveryPersonVisual;
  parcel: Mesh;
  marker: Mesh;
  markerCore: Mesh;
}

const SEGMENT_LENGTH = 24;
const SEGMENT_COUNT = 9;

export class RoadSystem {
  private readonly segments: TransformNode[] = [];
  private readonly urbanDecorRoots: TransformNode[] = [];
  private readonly actors: RoadActor[] = [];
  private readonly environment: EnvironmentVisuals;
  private readonly roadMaterial: StandardMaterial;
  private readonly shoulderMaterial: StandardMaterial;
  private readonly gravelMaterial: StandardMaterial;
  private readonly roadPatchMaterial: StandardMaterial;
  private readonly lineMaterial: StandardMaterial;
  private readonly accentMaterial: StandardMaterial;
  private readonly navyMaterial: StandardMaterial;
  private readonly hazardMaterial: StandardMaterial;
  private readonly darkMaterial: StandardMaterial;
  private readonly metalMaterial: StandardMaterial;
  private readonly glowMaterial: StandardMaterial;
  private readonly shadowMaterial: StandardMaterial;
  private readonly signalMaterial: StandardMaterial;
  private readonly deliveryStop: DeliveryStopVisual;
  private spawnCursor = 150;
  private seed = 73_381;
  private visualTime = 0;
  private runProgress = 0;
  private neighborhoodUrban = true;
  private neighborhoodPath: NeighborhoodPathState = createNeighborhoodPathState(
    "default",
    true
  );

  constructor(private readonly scene: Scene) {
    this.environment = new EnvironmentVisuals(scene);
    this.roadMaterial = this.material("road", "#252B32", 0.1);
    this.shoulderMaterial = this.material("terrain", "#3E7B46", 0.03);
    this.gravelMaterial = this.material("road-sidewalk", "#C8D0D3", 0.08);
    this.roadPatchMaterial = this.material("road-patches", "#091222", 0.03);
    this.lineMaterial = this.material("road-lines", "#EDF5F6", 0.2);
    this.lineMaterial.emissiveColor = Color3.FromHexString("#12547A");
    this.accentMaterial = this.material("xb-electric-cyan", "#18BFEA", 0.38);
    this.navyMaterial = this.material("cargo-navy", "#0D1B33", 0.3);
    this.hazardMaterial = this.material("hazard-steel", "#12547A", 0.2);
    this.darkMaterial = this.material("danger-dark", "#091222", 0.05);
    this.metalMaterial = this.material("street-furniture", "#93A2A8", 0.5);
    this.glowMaterial = this.material("pickup-glow", "#18BFEA", 0.12);
    this.glowMaterial.emissiveColor = Color3.FromHexString("#12547A");
    this.shadowMaterial = this.material("actor-shadow", "#091222", 0);
    this.shadowMaterial.alpha = 0.34;
    this.shadowMaterial.disableLighting = true;
    this.signalMaterial = this.material("warning-signal", "#18BFEA", 0.24);
    this.signalMaterial.emissiveColor = Color3.FromHexString("#12547A");

    this.createRoad();
    this.deliveryStop = this.createDeliveryStop();
    this.createActors();
  }

  setEra(vehicle: VehicleConfig): void {
    const terrain = terrainForEra(vehicle);
    const palette = environmentPalette(terrain);
    this.shoulderMaterial.diffuseColor = Color3.FromHexString(palette.shoulder);
    this.gravelMaterial.diffuseColor = Color3.FromHexString(
      terrain === "urban" ? "#C8D0D3" : palette.shoulder
    )
      .scale(terrain === "urban" ? 1 : 0.7)
      .add(terrain === "urban" ? Color3.Black() : new Color3(0.05, 0.05, 0.05));
    this.metalMaterial.diffuseColor = Color3.FromHexString(
      terrain === "urban" ? "#93A2A8" : "#8FA4AF"
    );
    this.lineMaterial.emissiveColor = Color3.FromHexString(
      terrain === "urban" ? "#17374A" : "#12547A"
    );
    this.roadMaterial.diffuseColor = Color3.FromHexString(palette.road);
    this.environment.setEra(vehicle);
    this.neighborhoodUrban = terrain === "urban";
    this.neighborhoodPath = resetNeighborhoodPath(
      this.neighborhoodPath,
      this.neighborhoodPath.routeKey,
      this.neighborhoodUrban
    );
    this.setUrbanDecorEnabled(this.neighborhoodUrban);
  }

  setRouteEnvironment(
    vehicle: VehicleConfig,
    terrain: RouteTerrain,
    weather: WeatherCondition,
    compoundId: TireCompoundId
  ): void {
    const palette = environmentPalette(terrain);
    this.shoulderMaterial.diffuseColor = Color3.FromHexString(palette.shoulder);
    this.gravelMaterial.diffuseColor = Color3.FromHexString(
      terrain === "urban" ? "#C8D0D3" : palette.shoulder
    )
      .scale(terrain === "urban" ? 1 : 0.68)
      .add(terrain === "urban" ? Color3.Black() : new Color3(0.04, 0.04, 0.04));
    this.metalMaterial.diffuseColor = Color3.FromHexString(
      terrain === "urban" ? "#93A2A8" : "#8FA4AF"
    );
    this.lineMaterial.emissiveColor = Color3.FromHexString(
      terrain === "urban" ? "#17374A" : "#12547A"
    );
    this.roadMaterial.diffuseColor = Color3.FromHexString(palette.road);
    this.accentMaterial.emissiveColor = Color3.FromHexString(
      compoundId === "planet" ? "#18BFEA" : "#12547A"
    );
    this.environment.setTheme(vehicle, terrain, weather, compoundId);
    this.neighborhoodUrban = terrain === "urban";
    this.setUrbanDecorEnabled(this.neighborhoodUrban);
  }

  reset(seedKey = "default"): void {
    this.spawnCursor = 150;
    this.seed = this.hash(seedKey) || 73_381;
    this.visualTime = 0;
    this.neighborhoodPath = resetNeighborhoodPath(
      this.neighborhoodPath,
      seedKey,
      this.neighborhoodUrban
    );
    this.segments.forEach((segment, index) => {
      segment.position.z = index * SEGMENT_LENGTH;
    });
    this.setRunProgress(0);
    this.actors.forEach((actor, index) => {
      actor.root.position.z = 22 + index * 11;
      actor.root.position.y = 0;
      actor.laneIndex = ((index * 2 + 1) % 3) as 0 | 1 | 2;
      const pose = this.positionActorOnNeighborhood(actor);
      actor.root.rotation.y = pose.yaw;
      actor.resolved = false;
      actor.root.setEnabled(true);
    });
  }

  setRunProgress(progress: number, reposition = true): void {
    this.runProgress = Number.isFinite(progress)
      ? Math.min(1, Math.max(0, progress))
      : 0;
    this.neighborhoodPath = advanceNeighborhoodPath(
      this.neighborhoodPath,
      0,
      this.runProgress
    );
    // Quando update() vem logo atras, reposicionar aqui e trabalho jogado fora:
    // eram duas passadas completas de pose por passo de simulacao.
    if (!reposition) return;
    this.positionRoadSegments();
    this.actors.forEach(actor => this.positionActorOnNeighborhood(actor));
    this.updateDeliveryStop(0);
  }

  /**
   * Nos que formam a pista procedural (asfalto, faixas, bordas, guias,
   * acostamento e drenagem), ja considerando a fusao por material. A marca
   * estrutural sobrevive ao merge; o nome do mesh, nao.
   */
  roadSurfaceNodes(): AbstractMesh[] {
    const nodes: AbstractMesh[] = [];
    const collect = (root: TransformNode): void => {
      root.getChildMeshes(true).forEach(mesh => {
        const layer = (mesh.metadata as { xbLayer?: string } | null)?.xbLayer;
        if (layer === "road-surface") nodes.push(mesh);
      });
    };
    this.segments.forEach(collect);
    this.urbanDecorRoots.forEach(collect);
    return nodes;
  }

  update(
    delta: number,
    speed: number,
    playerX: number,
    playerHalfWidth: number,
    onPickup: (kind: "cargo" | "tire") => void,
    onObstacle: (kind: "cone" | "pothole") => void
  ): void {
    const movement = speed * delta;
    this.visualTime += delta;
    this.neighborhoodPath = advanceNeighborhoodPath(
      this.neighborhoodPath,
      movement,
      this.runProgress
    );
    this.environment.update(delta, speed);

    this.segments.forEach(segment => {
      segment.position.z -= movement;
      if (segment.position.z < -SEGMENT_LENGTH) {
        segment.position.z += SEGMENT_LENGTH * SEGMENT_COUNT;
      }
    });
    this.positionRoadSegments();
    this.updateDeliveryStop(delta);

    this.spawnCursor -= movement;
    this.actors.forEach(actor => {
      actor.root.position.z -= movement;
      const curvePose = this.positionActorOnNeighborhood(actor);
      if (actor.kind === "tire") {
        actor.root.rotation.y = curvePose.yaw + this.visualTime * 1.8;
        actor.root.position.y =
          0.1 + Math.sin(this.visualTime * 3.2 + actor.visualPhase) * 0.1;
      } else if (actor.kind === "cargo") {
        actor.root.rotation.y =
          curvePose.yaw +
          Math.sin(this.visualTime * 1.45 + actor.visualPhase) * 0.12;
        actor.root.position.y =
          0.06 + Math.sin(this.visualTime * 2.4 + actor.visualPhase) * 0.055;
      } else {
        actor.root.rotation.y = curvePose.yaw;
      }

      // Teste varrido: o ator atravessou a janela do jogador neste passo?
      // A versao por posicao instantanea falhava em silencio se o passo
      // crescesse (turbo, passo fixo maior) e o obstaculo pulasse a janela.
      const zNow = actor.root.position.z;
      const zPrev = zNow + movement;
      if (
        !actor.resolved &&
        zNow < actor.collisionDepth &&
        zPrev > -actor.collisionDepth &&
        Math.abs(actor.root.position.x - playerX) <
          playerHalfWidth + actor.collisionHalfWidth
      ) {
        actor.resolved = true;
        actor.root.setEnabled(false);
        if (actor.kind === "cargo" || actor.kind === "tire")
          onPickup(actor.kind);
        else onObstacle(actor.kind);
      }

      if (actor.root.position.z < -12) this.respawn(actor);
    });
  }

  private positionRoadSegments(): void {
    this.segments.forEach(segment => {
      const pose = neighborhoodCurvePose(
        this.neighborhoodPath.travelDistance + segment.position.z,
        this.neighborhoodPath.travelDistance,
        this.neighborhoodPath.progress,
        this.neighborhoodPath.urban ? this.neighborhoodPath.routePhase : 0
      );
      segment.position.x = this.neighborhoodPath.urban ? pose.offsetX : 0;
      segment.rotation.y = this.neighborhoodPath.urban ? pose.yaw : 0;
    });
  }

  private positionActorOnNeighborhood(actor: RoadActor) {
    const pose = neighborhoodCurvePose(
      this.neighborhoodPath.travelDistance + actor.root.position.z,
      this.neighborhoodPath.travelDistance,
      this.neighborhoodPath.progress,
      this.neighborhoodPath.urban ? this.neighborhoodPath.routePhase : 0
    );
    actor.root.position.x =
      (this.neighborhoodPath.urban ? pose.offsetX : 0) +
      (LANE_POSITIONS[actor.laneIndex] ?? 0);
    return this.neighborhoodPath.urban ? pose : { offsetX: 0, yaw: 0 };
  }

  getCameraCue(): { offsetX: number; yaw: number } {
    if (!this.neighborhoodPath.urban) return { offsetX: 0, yaw: 0 };
    return neighborhoodCurvePose(
      this.neighborhoodPath.travelDistance + 28,
      this.neighborhoodPath.travelDistance,
      this.neighborhoodPath.progress,
      this.neighborhoodPath.routePhase
    );
  }

  getSuggestedLane(): number {
    const ahead = this.actors
      .filter(
        actor =>
          actor.root.isEnabled() &&
          actor.root.position.z > 5 &&
          actor.root.position.z < 38
      )
      .sort((a, b) => a.root.position.z - b.root.position.z);
    const pickup = ahead.find(
      actor => actor.kind === "cargo" || actor.kind === "tire"
    );
    if (pickup) return pickup.laneIndex;

    const dangerLanes = new Set(
      ahead
        .filter(actor => actor.kind === "cone" || actor.kind === "pothole")
        .map(actor => actor.laneIndex)
    );
    return [0, 1, 2].find(lane => !dangerLanes.has(lane)) ?? 1;
  }

  dispose(): void {
    this.environment.dispose();
    this.deliveryStop.root.dispose(false, false);
    this.segments.forEach(segment => segment.dispose(false, false));
    this.actors.forEach(actor => actor.root.dispose(false, false));
    this.segments.length = 0;
    this.actors.length = 0;
    this.urbanDecorRoots.length = 0;
    [
      this.roadMaterial,
      this.shoulderMaterial,
      this.gravelMaterial,
      this.roadPatchMaterial,
      this.lineMaterial,
      this.accentMaterial,
      this.navyMaterial,
      this.hazardMaterial,
      this.darkMaterial,
      this.metalMaterial,
      this.glowMaterial,
      this.shadowMaterial,
      this.signalMaterial,
    ].forEach(material => material.dispose());
  }

  private createRoad(): void {
    for (let index = 0; index < SEGMENT_COUNT; index += 1) {
      const segment = new TransformNode(`road-segment-${index}`, this.scene);
      this.segments.push(segment);

      const terrain = MeshBuilder.CreateBox(
        `terrain-${index}`,
        { width: 72, height: 0.18, depth: SEGMENT_LENGTH },
        this.scene
      );
      terrain.parent = segment;
      terrain.position.y = -0.34;
      terrain.material = this.shoulderMaterial;
      terrain.isPickable = false;

      const road = MeshBuilder.CreateBox(
        `asphalt-${index}`,
        { width: 14.5, height: 0.3, depth: SEGMENT_LENGTH },
        this.scene
      );
      road.parent = segment;
      road.position.y = -0.1;
      road.material = this.roadMaterial;
      road.isPickable = false;

      const urbanDecor = new TransformNode(`urban-decor-${index}`, this.scene);
      urbanDecor.parent = segment;
      this.urbanDecorRoots.push(urbanDecor);
      const urbanLayout = urbanRoadDecorFor(index);

      [-7.38, 7.38].forEach(x => {
        const curb = MeshBuilder.CreateBox(
          `urban-curb-${index}-${x}`,
          { width: 0.34, height: 0.28, depth: SEGMENT_LENGTH },
          this.scene
        );
        curb.parent = urbanDecor;
        curb.position.set(x, 0.04, 0);
        curb.material = this.gravelMaterial;
        curb.isPickable = false;
      });

      if (urbanLayout.crosswalk) {
        [-2.25, -1.35, -0.45, 0.45, 1.35, 2.25].forEach((z, stripeIndex) => {
          const stripe = MeshBuilder.CreateBox(
            `urban-crosswalk-${index}-${stripeIndex}`,
            { width: 12.4, height: 0.045, depth: 0.44 },
            this.scene
          );
          stripe.parent = urbanDecor;
          stripe.position.set(0, 0.101, z);
          stripe.material = this.lineMaterial;
          stripe.isPickable = false;
        });
      }

      if (urbanLayout.sideStreetSide !== 0) {
        const side = urbanLayout.sideStreetSide;
        const sideStreet = MeshBuilder.CreateBox(
          `urban-side-street-${index}`,
          { width: 12.5, height: 0.26, depth: 7.4 },
          this.scene
        );
        sideStreet.parent = urbanDecor;
        sideStreet.position.set(side * 13.1, -0.08, 5.2);
        sideStreet.material = this.roadMaterial;
        sideStreet.isPickable = false;

        [-2.75, 2.75].forEach(zOffset => {
          const edge = MeshBuilder.CreateBox(
            `urban-side-street-edge-${index}-${zOffset}`,
            { width: 11.6, height: 0.04, depth: 0.12 },
            this.scene
          );
          edge.parent = urbanDecor;
          edge.position.set(side * 13.2, 0.065, 5.2 + zOffset);
          edge.material = this.lineMaterial;
          edge.isPickable = false;
        });
      }

      urbanLayout.streetLightOffsets.forEach((z, lightIndex) => {
        [-1, 1].forEach(side => {
          const lampPost = MeshBuilder.CreateCylinder(
            `urban-street-lamp-post-${index}-${side}-${lightIndex}`,
            { height: 4.4, diameter: 0.16, tessellation: 8 },
            this.scene
          );
          lampPost.parent = urbanDecor;
          lampPost.position.set(side * 9.7, 2.05, z);
          lampPost.material = this.metalMaterial;
          lampPost.isPickable = false;

          const lampHead = MeshBuilder.CreateBox(
            `urban-street-lamp-head-${index}-${side}-${lightIndex}`,
            { width: 0.82, height: 0.18, depth: 0.46 },
            this.scene
          );
          lampHead.parent = urbanDecor;
          lampHead.position.set(side * 9.48, 4.22, z);
          lampHead.material = this.accentMaterial;
          lampHead.isPickable = false;
        });
      });

      this.tagRoadSurface(urbanDecor);
      this.mergeByMaterial(urbanDecor, "urban-batch", index);

      [-7.55, 7.55].forEach(x => {
        const gravel = MeshBuilder.CreateBox(
          `gravel-shoulder-${index}-${x}`,
          { width: 2.3, height: 0.2, depth: SEGMENT_LENGTH },
          this.scene
        );
        gravel.parent = segment;
        gravel.position.set(x < 0 ? -8.25 : 8.25, -0.04, 0);
        gravel.material = this.gravelMaterial;
        gravel.isPickable = false;

        const drainage = MeshBuilder.CreateBox(
          `drainage-${index}-${x}`,
          { width: 0.18, height: 0.14, depth: SEGMENT_LENGTH },
          this.scene
        );
        drainage.parent = segment;
        drainage.position.set(x < 0 ? -7.15 : 7.15, 0.08, 0);
        drainage.material = this.darkMaterial;
        drainage.isPickable = false;
      });

      [-2, 2].forEach(x => {
        [-8.5, 0, 8.5].forEach(z => {
          const laneLine = MeshBuilder.CreateBox(
            `lane-${index}-${x}-${z}`,
            { width: 0.12, height: 0.04, depth: 4.8 },
            this.scene
          );
          laneLine.parent = segment;
          laneLine.position.set(x, 0.069, z);
          laneLine.material = this.lineMaterial;
          laneLine.isPickable = false;
        });
      });

      [-6.9, 6.9].forEach(x => {
        const edge = MeshBuilder.CreateBox(
          `edge-${index}-${x}`,
          { width: 0.18, height: 0.06, depth: SEGMENT_LENGTH },
          this.scene
        );
        edge.parent = segment;
        edge.position.set(x, 0.071, 0);
        edge.material = this.lineMaterial;
        edge.isPickable = false;

        const rail = MeshBuilder.CreateBox(
          `rail-${index}-${x}`,
          { width: 0.18, height: 0.18, depth: SEGMENT_LENGTH },
          this.scene
        );
        rail.parent = segment;
        rail.position.set(x < 0 ? -9.42 : 9.42, 0.03, 0);
        rail.material = this.metalMaterial;
        rail.isPickable = false;

        [-6, 6].forEach(z => {
          const post = MeshBuilder.CreateBox(
            `rail-post-${index}-${x}-${z}`,
            { width: 0.14, height: 3.8, depth: 0.14 },
            this.scene
          );
          post.parent = segment;
          post.position.set(x < 0 ? -9.55 : 9.55, 1.65, z);
          post.material = this.metalMaterial;
          post.isPickable = false;

          const reflector = MeshBuilder.CreateBox(
            `rail-reflector-${index}-${x}-${z}`,
            { width: 0.78, height: 0.18, depth: 0.3 },
            this.scene
          );
          reflector.parent = segment;
          reflector.position.set(x < 0 ? -9.18 : 9.18, 3.42, z);
          reflector.rotation.y = 0;
          reflector.material =
            index % 2 === 0 ? this.accentMaterial : this.lineMaterial;
          reflector.isPickable = false;
        });
      });

      if (index % 2 === 0) {
        [-1, 1].forEach((direction, patchIndex) => {
          const patch = MeshBuilder.CreateDisc(
            `asphalt-patch-${index}-${patchIndex}`,
            {
              radius: 0.72 + ((index + patchIndex) % 3) * 0.13,
              tessellation: 14,
            },
            this.scene
          );
          patch.parent = segment;
          patch.position.set(
            direction * (1.1 + (index % 3) * 0.7),
            0.057,
            -5 + patchIndex * 10 + (index % 2)
          );
          patch.rotation.x = Math.PI / 2;
          patch.rotation.z = index * 0.37;
          patch.scaling.y = 0.42;
          patch.material = this.roadPatchMaterial;
          patch.isPickable = false;
        });
      }

      [-2, 2].forEach(x => {
        const marker = MeshBuilder.CreateBox(
          `road-reflector-${index}-${x}`,
          { width: 0.2, height: 0.055, depth: 0.38 },
          this.scene
        );
        marker.parent = segment;
        marker.position.set(x, 0.098, index % 2 === 0 ? -5.9 : 5.9);
        marker.material = this.accentMaterial;
        marker.isPickable = false;
      });

      this.environment.registerSegment(segment, index);

      if (index % 3 === 1) {
        const side = index % 2 === 0 ? -1 : 1;
        const billboard = MeshBuilder.CreateBox(
          `billboard-${index}`,
          { width: 3.55, height: 1.58, depth: 0.16 },
          this.scene
        );
        billboard.parent = segment;
        billboard.position.set(side * 12.15, 2.3, 2.2);
        billboard.rotation.y = side < 0 ? 0.08 : -0.08;
        billboard.material = this.navyMaterial;
        billboard.isPickable = false;

        const billboardStripe = MeshBuilder.CreateBox(
          `billboard-stripe-${index}`,
          { width: 2.86, height: 0.18, depth: 0.07 },
          this.scene
        );
        billboardStripe.parent = segment;
        billboardStripe.position.set(side * 12.15, 2.34, 2.1);
        billboardStripe.rotation.z = -0.08;
        billboardStripe.material = this.accentMaterial;
        billboardStripe.isPickable = false;

        [-0.58, 0.58].forEach((angle, glyphIndex) => {
          const glyph = MeshBuilder.CreateBox(
            `billboard-x-${index}-${glyphIndex}`,
            { width: 1.34, height: 0.13, depth: 0.07 },
            this.scene
          );
          glyph.parent = segment;
          glyph.position.set(side * 12.15 - 0.72, 2.55, 2.09);
          glyph.rotation.z = angle;
          glyph.material =
            glyphIndex === 0 ? this.accentMaterial : this.lineMaterial;
          glyph.isPickable = false;
        });

        [-0.62, 0.62].forEach(offset => {
          const hub = MeshBuilder.CreateCylinder(
            `billboard-hub-${index}-${offset}`,
            { height: 0.07, diameter: 0.34, tessellation: 16 },
            this.scene
          );
          hub.parent = segment;
          hub.position.set(side * 12.15 + offset, 2.03, 2.09);
          hub.rotation.x = Math.PI / 2;
          hub.material = this.accentMaterial;
          hub.isPickable = false;

          const hubCore = MeshBuilder.CreateCylinder(
            `billboard-hub-core-${index}-${offset}`,
            { height: 0.08, diameter: 0.12, tessellation: 12 },
            this.scene
          );
          hubCore.parent = segment;
          hubCore.position.set(side * 12.15 + offset, 2.03, 2.04);
          hubCore.rotation.x = Math.PI / 2;
          hubCore.material = this.lineMaterial;
          hubCore.isPickable = false;
        });

        const post = MeshBuilder.CreateBox(
          `billboard-post-${index}`,
          { width: 0.22, height: 2.15, depth: 0.22 },
          this.scene
        );
        post.parent = segment;
        post.position.set(side * 12.15, 0.92, 2.42);
        post.material = this.metalMaterial;
        post.isPickable = false;

        const postFoot = MeshBuilder.CreateCylinder(
          `billboard-foot-${index}`,
          { height: 0.22, diameter: 0.78, tessellation: 12 },
          this.scene
        );
        postFoot.parent = segment;
        postFoot.position.set(side * 12.15, -0.07, 2.42);
        postFoot.material = this.darkMaterial;
        postFoot.isPickable = false;
      }

      // A fusao precisa acontecer com o segmento ainda na origem: MergeMeshes
      // assa a matriz de mundo e o resultado e reparentado ao segmento.
      this.tagRoadSurface(segment);
      this.mergeByMaterial(segment, "road-batch", index);
      segment.position.z = index * SEGMENT_LENGTH;
    }
  }

  private static readonly ROAD_SURFACE_PATTERN =
    /^(?:asphalt|lane|edge|urban-curb|gravel-shoulder|drainage|urban-crosswalk)-/;

  /**
   * Marca estruturalmente o que e superficie de pista. Depois da fusao os
   * nomes originais somem, entao quem precisa esconder a pista procedural
   * (o pacote de assets reais) le esta marca em vez de adivinhar por nome.
   */
  private tagRoadSurface(root: TransformNode): void {
    root.getChildMeshes(true).forEach(mesh => {
      if (!RoadSystem.ROAD_SURFACE_PATTERN.test(mesh.name || "")) return;
      mesh.metadata = { ...(mesh.metadata ?? {}), xbLayer: "road-surface" };
    });
  }

  /**
   * Funde a mobilia da pista por material para cortar centenas de draw calls.
   * So filhos DIRETOS entram: o cenario e o bairro vivem sob raizes proprias e
   * precisam continuar independentes para poderem ser ligados e desligados.
   */
  private mergeByMaterial(
    root: TransformNode,
    prefix: string,
    index: number
  ): void {
    const groups = new Map<string, Mesh[]>();
    root
      .getChildMeshes(true)
      .filter((mesh): mesh is Mesh => mesh instanceof Mesh)
      .forEach(mesh => {
        const materialId = mesh.material?.uniqueId;
        if (materialId === undefined) return;
        const layer =
          (mesh.metadata as { xbLayer?: string } | null)?.xbLayer ?? "";
        const key = `${materialId}|${layer}`;
        const group = groups.get(key) ?? [];
        group.push(mesh);
        groups.set(key, group);
      });

    groups.forEach((meshes, key) => {
      if (meshes.length < 2) return;
      meshes.forEach(mesh => mesh.computeWorldMatrix(true));
      const material = meshes[0]?.material ?? null;
      const layer =
        (meshes[0]?.metadata as { xbLayer?: string } | null)?.xbLayer ?? "";
      const merged = Mesh.MergeMeshes(
        meshes,
        true,
        true,
        undefined,
        false,
        false
      );
      if (!merged) return;
      merged.name = `${prefix}-${index}-${key.replace("|", "-")}`;
      merged.parent = root;
      merged.material = material;
      merged.isPickable = false;
      if (layer) merged.metadata = { xbLayer: layer };
    });
  }

  private setUrbanDecorEnabled(enabled: boolean): void {
    this.urbanDecorRoots.forEach(root => root.setEnabled(enabled));
  }

  private createDeliveryStop(): DeliveryStopVisual {
    const root = new TransformNode("delivery-stop-root", this.scene);
    root.position.set(12.35, 0.02, 72);
    root.rotation.y = Math.PI / 2;

    const property = MeshBuilder.CreateBox(
      "delivery-stop-property",
      { width: 9.4, height: 0.18, depth: 10.4 },
      this.scene
    );
    property.parent = root;
    property.position.set(0, -0.02, 0.15);
    property.material = this.shoulderMaterial;
    property.isPickable = false;

    const driveway = MeshBuilder.CreateBox(
      "delivery-stop-driveway",
      { width: 2.15, height: 0.12, depth: 4.6 },
      this.scene
    );
    driveway.parent = root;
    driveway.position.set(-0.85, 0.07, -3.3);
    driveway.material = this.gravelMaterial;
    driveway.isPickable = false;

    const wall = MeshBuilder.CreateBox(
      "delivery-stop-house",
      { width: 5.8, height: 3.45, depth: 4.25 },
      this.scene
    );
    wall.parent = root;
    wall.position.set(0, 1.76, 0.5);
    wall.material = this.lineMaterial;
    wall.isPickable = false;

    const roof = MeshBuilder.CreateCylinder(
      "delivery-stop-roof",
      {
        height: 1.38,
        diameterTop: 0,
        diameterBottom: 6.6,
        tessellation: 4,
      },
      this.scene
    );
    roof.parent = root;
    roof.position.set(0, 4.15, 0.5);
    roof.rotation.y = Math.PI / 4;
    roof.scaling.z = 0.76;
    roof.material = this.navyMaterial;
    roof.isPickable = false;

    const door = MeshBuilder.CreateBox(
      "delivery-stop-door",
      { width: 0.92, height: 1.9, depth: 0.14 },
      this.scene
    );
    door.parent = root;
    door.position.set(0.95, 1, -1.68);
    door.material = this.navyMaterial;
    door.isPickable = false;

    [-1.35, 1.35].forEach((x, index) => {
      const window = MeshBuilder.CreateBox(
        `delivery-stop-window-${index}`,
        { width: 1.05, height: 0.95, depth: 0.12 },
        this.scene
      );
      window.parent = root;
      window.position.set(x, 2.08, -1.7);
      window.material = this.accentMaterial;
      window.isPickable = false;
    });

    const awning = MeshBuilder.CreateBox(
      "delivery-stop-awning",
      { width: 1.7, height: 0.18, depth: 1.05 },
      this.scene
    );
    awning.parent = root;
    awning.position.set(0.95, 2.25, -2.02);
    awning.rotation.x = -0.08;
    awning.material = this.hazardMaterial;
    awning.isPickable = false;

    const sign = MeshBuilder.CreateBox(
      "delivery-stop-sign",
      { width: 2.8, height: 1.24, depth: 0.16 },
      this.scene
    );
    sign.parent = root;
    sign.position.set(-1.05, 3.15, -1.72);
    sign.material = this.navyMaterial;
    sign.isPickable = false;

    [-0.58, 0.58].forEach((rotation, index) => {
      const glyph = MeshBuilder.CreateBox(
        `delivery-stop-x-${index}`,
        { width: 1.1, height: 0.14, depth: 0.08 },
        this.scene
      );
      glyph.parent = root;
      glyph.position.set(-1.55, 3.18, -1.82);
      glyph.rotation.z = rotation;
      glyph.material = index === 0 ? this.accentMaterial : this.lineMaterial;
      glyph.isPickable = false;
    });

    const courier = this.createDeliveryPerson(
      "delivery-courier",
      root,
      this.navyMaterial,
      this.accentMaterial
    );
    courier.root.position.set(-0.95, 0.06, -4.9);

    const customer = this.createDeliveryPerson(
      "delivery-customer",
      root,
      this.hazardMaterial,
      this.lineMaterial
    );
    customer.root.position.set(0.95, 0.06, -2.08);
    customer.root.rotation.y = Math.PI;

    const parcel = MeshBuilder.CreateBox(
      "delivery-parcel",
      { width: 0.72, height: 0.62, depth: 0.6 },
      this.scene
    );
    parcel.parent = root;
    parcel.material = this.accentMaterial;
    parcel.isPickable = false;

    const marker = MeshBuilder.CreateTorus(
      "delivery-stop-marker",
      { diameter: 2.5, thickness: 0.12, tessellation: 30 },
      this.scene
    );
    marker.parent = root;
    marker.position.set(0, 5.9, -2.2);
    marker.rotation.x = Math.PI / 2;
    marker.material = this.glowMaterial;
    marker.isPickable = false;

    const markerCore = MeshBuilder.CreateCylinder(
      "delivery-stop-marker-core",
      { height: 2.8, diameter: 0.15, tessellation: 10 },
      this.scene
    );
    markerCore.parent = root;
    markerCore.position.set(0, 4.65, -2.2);
    markerCore.material = this.signalMaterial;
    markerCore.isPickable = false;

    root.setEnabled(false);
    return { root, courier, customer, parcel, marker, markerCore };
  }

  private createDeliveryPerson(
    name: string,
    parent: TransformNode,
    bodyMaterial: StandardMaterial,
    detailMaterial: StandardMaterial
  ): DeliveryPersonVisual {
    const root = new TransformNode(`${name}-root`, this.scene);
    root.parent = parent;

    const shadow = MeshBuilder.CreateDisc(
      `${name}-shadow`,
      { radius: 0.62, tessellation: 16 },
      this.scene
    );
    shadow.parent = root;
    shadow.position.y = 0.025;
    shadow.rotation.x = Math.PI / 2;
    shadow.scaling.y = 0.52;
    shadow.material = this.shadowMaterial;
    shadow.isPickable = false;

    const body = MeshBuilder.CreateCylinder(
      `${name}-body`,
      {
        height: 1.15,
        diameterTop: 0.7,
        diameterBottom: 0.92,
        tessellation: 10,
      },
      this.scene
    );
    body.parent = root;
    body.position.y = 1.28;
    body.material = bodyMaterial;
    body.isPickable = false;

    const vest = MeshBuilder.CreateBox(
      `${name}-vest`,
      { width: 0.58, height: 0.62, depth: 0.1 },
      this.scene
    );
    vest.parent = root;
    vest.position.set(0, 1.34, -0.41);
    vest.material = detailMaterial;
    vest.isPickable = false;

    const head = MeshBuilder.CreateSphere(
      `${name}-head`,
      { diameter: 0.72, segments: 8 },
      this.scene
    );
    head.parent = root;
    head.position.y = 2.2;
    head.material = this.lineMaterial;
    head.isPickable = false;

    [-0.22, 0.22].forEach((x, index) => {
      const leg = MeshBuilder.CreateBox(
        `${name}-leg-${index}`,
        { width: 0.2, height: 0.82, depth: 0.24 },
        this.scene
      );
      leg.parent = root;
      leg.position.set(x, 0.48, 0);
      leg.material = this.darkMaterial;
      leg.isPickable = false;
    });

    const leftArm = MeshBuilder.CreateBox(
      `${name}-left-arm`,
      { width: 0.2, height: 0.86, depth: 0.22 },
      this.scene
    );
    leftArm.parent = root;
    leftArm.position.set(-0.55, 1.36, 0);
    leftArm.material = bodyMaterial;
    leftArm.isPickable = false;

    const rightArm = MeshBuilder.CreateBox(
      `${name}-right-arm`,
      { width: 0.2, height: 0.86, depth: 0.22 },
      this.scene
    );
    rightArm.parent = root;
    rightArm.position.set(0.55, 1.36, 0);
    rightArm.material = bodyMaterial;
    rightArm.isPickable = false;

    return { root, leftArm, rightArm };
  }

  private updateDeliveryStop(delta: number): void {
    const pose = deliveryStopPose(this.runProgress);
    const { root, courier, customer, parcel, marker, markerCore } =
      this.deliveryStop;
    root.setEnabled(pose.visible);
    if (!pose.visible) return;

    root.position.z = pose.z;
    const curvePose = neighborhoodCurvePose(
      this.neighborhoodPath.travelDistance + pose.z,
      this.neighborhoodPath.travelDistance,
      this.neighborhoodPath.progress,
      this.neighborhoodPath.urban ? this.neighborhoodPath.routePhase : 0
    );
    root.position.x =
      12.35 + (this.neighborhoodPath.urban ? curvePose.offsetX : 0);
    root.rotation.y =
      Math.PI / 2 + (this.neighborhoodPath.urban ? curvePose.yaw : 0);
    const moving = pose.customerWalk > 0 && pose.customerReturn < 0.98;
    const walkCycle = Math.sin(this.visualTime * 10.5);
    courier.root.position.z = -4.9 + pose.customerWalk * 2.55;
    courier.root.position.y = 0.06 + (moving ? Math.abs(walkCycle) * 0.07 : 0);
    courier.leftArm.rotation.x = moving
      ? walkCycle * 0.62 * (1 - pose.parcelProgress)
      : -pose.parcelProgress * 0.75;
    courier.rightArm.rotation.x = moving
      ? -walkCycle * 0.62 * (1 - pose.parcelProgress)
      : -pose.parcelProgress * 0.75;
    customer.rightArm.rotation.x = -pose.parcelProgress * 1.05;
    customer.leftArm.rotation.x = -pose.parcelProgress * 0.45;

    const targetX = 0.78;
    const targetY = 1.48;
    const targetZ = -2.05;
    const parcelStartX = courier.root.position.x;
    const parcelStartY = courier.root.position.y + 1.45;
    const parcelStartZ = courier.root.position.z - 0.36;
    parcel.position.set(
      parcelStartX + (targetX - parcelStartX) * pose.parcelProgress,
      parcelStartY + (targetY - parcelStartY) * pose.parcelProgress,
      parcelStartZ + (targetZ - parcelStartZ) * pose.parcelProgress
    );
    parcel.rotation.y += delta * (pose.parcelProgress < 0.9 ? 0.35 : 0.08);

    const pulse = Math.max(0.64, pose.markerPulse);
    marker.scaling.setAll(pulse);
    marker.position.y = 5.9 + Math.sin(this.visualTime * 3.6) * 0.16;
    marker.rotation.z += delta * 0.45;
    markerCore.scaling.y = 0.82 + pulse * 0.2;
  }

  private createActors(): void {
    const kinds: ActorKind[] = [
      "cargo",
      "cone",
      "tire",
      "pothole",
      "cargo",
      "cone",
      "tire",
      "cargo",
      "cone",
      "pothole",
      "cargo",
      "tire",
    ];

    kinds.forEach((kind, index) => {
      const root = new TransformNode(`${kind}-${index}`, this.scene);
      const actor: RoadActor = {
        root,
        kind,
        laneIndex: (index * 2 + 1) % 3,
        resolved: false,
        collisionHalfWidth:
          kind === "pothole"
            ? 1.17
            : kind === "tire"
              ? 0.78
              : kind === "cargo"
                ? 0.72
                : 0.62,
        collisionDepth:
          kind === "pothole" ? 1.9 : kind === "cargo" ? 1.45 : 1.6,
        visualPhase: index * 0.83,
      };
      this.actors.push(actor);

      if (kind === "cargo") this.buildCargo(root);
      else if (kind === "tire") this.buildTire(root);
      else if (kind === "cone") this.buildCone(root);
      else this.buildPothole(root);

      this.mergeActorGeometry(root, index);
      root.position.set(
        LANE_POSITIONS[actor.laneIndex] ?? 0,
        0,
        22 + index * 11
      );
    });
  }

  private mergeActorGeometry(root: TransformNode, index: number): void {
    const groups = new Map<number, Mesh[]>();
    root
      .getChildMeshes(false)
      .filter((mesh): mesh is Mesh => mesh instanceof Mesh)
      .forEach(mesh => {
        const materialId = mesh.material?.uniqueId;
        if (materialId === undefined) return;
        const group = groups.get(materialId) ?? [];
        group.push(mesh);
        groups.set(materialId, group);
      });

    groups.forEach((meshes, materialId) => {
      if (meshes.length < 2) return;
      meshes.forEach(mesh => mesh.computeWorldMatrix(true));
      const material = meshes[0]?.material ?? null;
      const merged = Mesh.MergeMeshes(
        meshes,
        true,
        true,
        undefined,
        false,
        false
      );
      if (!merged) return;
      merged.name = `actor-batch-${index}-${materialId}`;
      merged.parent = root;
      merged.material = material;
      merged.isPickable = false;
    });
  }

  private buildCargo(root: TransformNode): void {
    const shadow = MeshBuilder.CreateDisc(
      "cargo-shadow",
      { radius: 1.05, tessellation: 18 },
      this.scene
    );
    shadow.parent = root;
    shadow.position.y = 0.07;
    shadow.rotation.x = Math.PI / 2;
    shadow.scaling.y = 0.55;
    shadow.material = this.shadowMaterial;
    shadow.isPickable = false;

    const pallet = MeshBuilder.CreateBox(
      "cargo-pallet",
      { width: 1.72, height: 0.18, depth: 1.55 },
      this.scene
    );
    pallet.parent = root;
    pallet.position.y = 0.3;
    pallet.rotation.y = 0.18;
    pallet.material = this.darkMaterial;
    pallet.isPickable = false;

    const box = MeshBuilder.CreateBox(
      "cargo-box",
      { width: 1.5, height: 1.42, depth: 1.42 },
      this.scene
    );
    box.parent = root;
    box.position.y = 1.05;
    box.rotation.y = 0.18;
    box.material = this.accentMaterial;
    box.isPickable = false;

    const strap = MeshBuilder.CreateBox(
      "cargo-strap",
      { width: 1.57, height: 0.2, depth: 1.49 },
      this.scene
    );
    strap.parent = root;
    strap.position.y = 1.05;
    strap.rotation.y = 0.18;
    strap.material = this.navyMaterial;
    strap.isPickable = false;

    const verticalStrap = MeshBuilder.CreateBox(
      "cargo-vertical-strap",
      { width: 0.2, height: 1.5, depth: 1.49 },
      this.scene
    );
    verticalStrap.parent = root;
    verticalStrap.position.y = 1.05;
    verticalStrap.rotation.y = 0.18;
    verticalStrap.material = this.navyMaterial;
    verticalStrap.isPickable = false;

    const label = MeshBuilder.CreateBox(
      "cargo-label",
      { width: 0.68, height: 0.42, depth: 0.04 },
      this.scene
    );
    label.parent = root;
    label.position.set(-0.13, 1.13, -0.76);
    label.rotation.y = 0.18;
    label.material = this.lineMaterial;
    label.isPickable = false;

    const halo = MeshBuilder.CreateTorus(
      "cargo-halo",
      { diameter: 2.28, thickness: 0.055, tessellation: 28 },
      this.scene
    );
    halo.parent = root;
    halo.position.y = 1.16;
    halo.material = this.glowMaterial;
    halo.isPickable = false;
  }

  private buildTire(root: TransformNode): void {
    const shadow = MeshBuilder.CreateDisc(
      "tire-shadow",
      { radius: 1.02, tessellation: 18 },
      this.scene
    );
    shadow.parent = root;
    shadow.position.y = 0.07;
    shadow.rotation.x = Math.PI / 2;
    shadow.scaling.y = 0.48;
    shadow.material = this.shadowMaterial;
    shadow.isPickable = false;

    const tire = MeshBuilder.CreateTorus(
      "tire-token",
      { diameter: 1.58, thickness: 0.44, tessellation: 30 },
      this.scene
    );
    tire.parent = root;
    tire.position.y = 1.18;
    tire.rotation.z = Math.PI / 2;
    tire.material = this.darkMaterial;
    tire.isPickable = false;

    const sidewall = MeshBuilder.CreateTorus(
      "tire-sidewall-ring",
      { diameter: 1.55, thickness: 0.07, tessellation: 30 },
      this.scene
    );
    sidewall.parent = root;
    sidewall.position.set(-0.235, 1.18, 0);
    sidewall.rotation.z = Math.PI / 2;
    sidewall.material = this.glowMaterial;
    sidewall.isPickable = false;

    const hub = MeshBuilder.CreateCylinder(
      "tire-token-hub",
      { height: 0.48, diameter: 0.72, tessellation: 20 },
      this.scene
    );
    hub.parent = root;
    hub.position.y = 1.18;
    hub.rotation.z = Math.PI / 2;
    hub.material = this.accentMaterial;
    hub.isPickable = false;

    const hubCore = MeshBuilder.CreateCylinder(
      "tire-token-core",
      { height: 0.52, diameter: 0.25, tessellation: 16 },
      this.scene
    );
    hubCore.parent = root;
    hubCore.position.y = 1.18;
    hubCore.rotation.z = Math.PI / 2;
    hubCore.material = this.navyMaterial;
    hubCore.isPickable = false;

    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const tread = MeshBuilder.CreateBox(
        `tire-token-tread-${index}`,
        { width: 0.52, height: 0.18, depth: 0.32 },
        this.scene
      );
      tread.parent = root;
      tread.position.set(
        0,
        1.18 + Math.cos(angle) * 0.79,
        Math.sin(angle) * 0.79
      );
      tread.rotation.x = -angle;
      tread.material = this.darkMaterial;
      tread.isPickable = false;
    }

    const halo = MeshBuilder.CreateTorus(
      "tire-halo",
      { diameter: 2.15, thickness: 0.08, tessellation: 32 },
      this.scene
    );
    halo.parent = root;
    halo.position.y = 1.25;
    halo.rotation.x = Math.PI / 2;
    halo.material = this.glowMaterial;
    halo.isPickable = false;
  }

  private buildCone(root: TransformNode): void {
    const shadow = MeshBuilder.CreateDisc(
      "cone-shadow",
      { radius: 0.86, tessellation: 16 },
      this.scene
    );
    shadow.parent = root;
    shadow.position.y = 0.065;
    shadow.rotation.x = Math.PI / 2;
    shadow.scaling.y = 0.56;
    shadow.material = this.shadowMaterial;
    shadow.isPickable = false;

    const cone = MeshBuilder.CreateCylinder(
      "traffic-cone",
      {
        height: 1.55,
        diameterTop: 0.12,
        diameterBottom: 1.05,
        tessellation: 18,
      },
      this.scene
    );
    cone.parent = root;
    cone.position.y = 0.78;
    cone.material = this.hazardMaterial;
    cone.isPickable = false;

    const stripe = MeshBuilder.CreateTorus(
      "cone-stripe",
      { diameter: 0.64, thickness: 0.1, tessellation: 18 },
      this.scene
    );
    stripe.parent = root;
    stripe.position.y = 0.82;
    stripe.material = this.lineMaterial;
    stripe.isPickable = false;

    const warningRing = MeshBuilder.CreateTorus(
      "cone-warning-ring",
      { diameter: 0.4, thickness: 0.065, tessellation: 16 },
      this.scene
    );
    warningRing.parent = root;
    warningRing.position.y = 1.14;
    warningRing.material = this.lineMaterial;
    warningRing.isPickable = false;

    const base = MeshBuilder.CreateBox(
      "cone-base",
      { width: 1.25, height: 0.15, depth: 1.25 },
      this.scene
    );
    base.parent = root;
    base.position.y = 0.08;
    base.material = this.darkMaterial;
    base.isPickable = false;

    const beacon = MeshBuilder.CreateSphere(
      "cone-beacon",
      { diameter: 0.15, segments: 8 },
      this.scene
    );
    beacon.parent = root;
    beacon.position.y = 1.56;
    beacon.material = this.signalMaterial;
    beacon.isPickable = false;
  }

  private buildPothole(root: TransformNode): void {
    const outerRim = MeshBuilder.CreateTorus(
      "pothole-rim",
      { diameter: 2.32, thickness: 0.15, tessellation: 22 },
      this.scene
    );
    outerRim.parent = root;
    outerRim.position.y = 0.055;
    outerRim.scaling.z = 0.72;
    outerRim.material = this.roadPatchMaterial;
    outerRim.isPickable = false;

    const pothole = MeshBuilder.CreateCylinder(
      "pothole",
      { height: 0.045, diameter: 2.35, tessellation: 24 },
      this.scene
    );
    pothole.parent = root;
    pothole.position.y = 0.045;
    pothole.scaling.z = 0.72;
    pothole.material = this.darkMaterial;
    pothole.isPickable = false;

    [-0.66, 0.58].forEach((x, index) => {
      const rubble = MeshBuilder.CreateSphere(
        `pothole-rubble-${index}`,
        { diameter: 0.34 + index * 0.08, segments: 5 },
        this.scene
      );
      rubble.parent = root;
      rubble.position.set(x, 0.12, index === 0 ? 0.54 : -0.46);
      rubble.scaling.y = 0.45;
      rubble.material = this.roadPatchMaterial;
      rubble.isPickable = false;
    });
  }

  private respawn(actor: RoadActor): void {
    const spacing = 12 + this.random() * 12;
    actor.root.position.z = Math.max(
      this.spawnCursor + spacing,
      90 + this.random() * 35
    );
    this.spawnCursor = actor.root.position.z;
    actor.laneIndex = Math.floor(this.random() * 3) as 0 | 1 | 2;
    this.positionActorOnNeighborhood(actor);
    actor.resolved = false;
    actor.root.setEnabled(true);
  }

  private random(): number {
    this.seed = (this.seed * 1_664_525 + 1_013_904_223) >>> 0;
    return this.seed / 4_294_967_296;
  }

  private hash(value: string): number {
    let result = 2_166_136_261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16_777_619);
    }
    return result >>> 0;
  }

  private material(
    name: string,
    color: string,
    specular = 0.2
  ): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.specularColor = new Color3(specular, specular, specular);
    return material;
  }
}

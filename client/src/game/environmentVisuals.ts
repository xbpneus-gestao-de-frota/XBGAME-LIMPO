import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
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
  roofGable: AbstractMesh;
  roofParapet: AbstractMesh;
  roofShed: AbstractMesh;
  roofProp: AbstractMesh;
  crown: AbstractMesh;
  crownConic: AbstractMesh;
  accent: AbstractMesh;
  door: AbstractMesh;
  windowSecondary: AbstractMesh;
  windowTertiary: AbstractMesh;
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
  style: SceneryStyle;
}

interface ScenerySources {
  tower: Mesh;
  feature: Mesh;
  roofGable: Mesh;
  roofParapet: Mesh;
  roofShed: Mesh;
  roofProp: Mesh;
  crown: Mesh;
  crownConic: Mesh;
  accent: Mesh;
  door: Mesh;
  windowSecondary: Mesh;
  windowTertiary: Mesh;
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
    road: "#3A3630",
    shoulder: "#5E8A47",
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
 * Paletas fechadas do bairro. A unica cor forte da tela continua sendo o ciano
 * XB: parede, telhado e copa ficam em tons quebrados, escolhidos a mao, que
 * nao competem com ele. Nada aqui e sorteado em tempo de execucao — a cor de
 * um lote vem de um indice estavel, entao a rua tem memoria.
 */
export const SCENERY_WALL_COLORS = [
  "#E9E0D2",
  "#DCC9AB",
  "#CBB8A2",
  "#C6D0D6",
  "#B7C3B3",
  "#E4E7E4",
  "#D3BBAA",
  "#BEC8D1",
] as const;

export const SCENERY_ROOF_COLORS = [
  "#4A555F",
  "#39424B",
  "#7E5140",
  "#525E68",
  "#61443A",
  "#414B56",
] as const;

export const SCENERY_CANOPY_COLORS = [
  "#3C6E45",
  "#4E8149",
  "#33603A",
  "#5B8C4E",
  "#456F3E",
  "#6B7F45",
] as const;

export type SceneryRoofKind = "hip" | "gable" | "parapet" | "shed";
export type SceneryCanopyKind = "round" | "conic";
export type SceneryRoofProp = "none" | "chimney" | "tank" | "aerial";
export type SceneryFenceKind = "picket" | "low-wall";

/** Tudo o que distingue um lote do vizinho, derivado so do trecho e do lado. */
export interface SceneryStyle {
  segmentIndex: number;
  side: -1 | 1;
  wallColor: string;
  roofColor: string;
  canopyColor: string;
  shrubColor: string;
  roofKind: SceneryRoofKind;
  roofQuarterTurn: boolean;
  canopyKind: SceneryCanopyKind;
  heightScale: number;
  canopyScale: number;
  canopyYaw: number;
  canopyTilt: number;
  windowCount: 2 | 3;
  windowWidth: number;
  windowHeight: number;
  windowSpread: number;
  windowLift: number;
  fenceKind: SceneryFenceKind;
  fenceHeight: number;
  fenceLength: number;
  roofProp: SceneryRoofProp;
}

// Cadencia, nao ruido: a forma do telhado e da arvore segue uma sequencia fixa
// ao longo da rua, entao o quarteirao tem ritmo em vez de virar confete.
const ROOF_CADENCE: readonly SceneryRoofKind[] = [
  "hip",
  "gable",
  "shed",
  "hip",
  "gable",
  "parapet",
  "hip",
  "shed",
  "gable",
  "hip",
  "gable",
  "shed",
];

const CANOPY_CADENCE: readonly SceneryCanopyKind[] = [
  "round",
  "round",
  "conic",
  "round",
  "conic",
  "round",
  "conic",
  "round",
];

const ROOF_PROPS: readonly SceneryRoofProp[] = [
  "none",
  "none",
  "none",
  "chimney",
  "none",
  "tank",
  "none",
  "none",
  "aerial",
  "chimney",
  "none",
  "none",
];

const wrap = (value: number, divisor: number): number =>
  ((value % divisor) + divisor) % divisor;

/**
 * Mistura inteira estavel (xorshift-multiply). O sorteio nasce do lote — trecho
 * e lado —, nunca de `uniqueId`, de `Math.random` ou do nome da malha: duas
 * cargas seguidas da mesma rota tem de dar exatamente o mesmo bairro.
 */
const styleHash = (
  segmentIndex: number,
  side: -1 | 1,
  salt: number
): number => {
  let hash = Math.imul(segmentIndex + 1, 0x2545f491);
  hash ^= Math.imul(side < 0 ? 11 : 23, 0x9e3779b1);
  hash ^= Math.imul(salt + 7, 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 15), 0x2c1b3c6d);
  hash = Math.imul(hash ^ (hash >>> 13), 0x297a2d39);
  return (hash ^ (hash >>> 16)) >>> 0;
};

/**
 * Escolha de paleta por passo primo com o tamanho da lista. Um sorteio puro
 * empilha a mesma cor em varios lotes de um quarteirao curto — nove trechos por
 * lado nao dao amostra para a media aparecer. O passo garante que as oito
 * paredes, os seis telhados e as seis copas apareçam quase o mesmo tanto, sem
 * abrir mao de ser deterministico.
 */
const strideFrom = <T>(
  list: readonly T[],
  segment: number,
  sideIndex: number,
  segmentStride: number,
  sideStride: number
): T =>
  list[
    wrap(segment * segmentStride + sideIndex * sideStride, list.length)
  ] as T;

const rangeFrom = (hash: number, min: number, max: number): number =>
  min + (hash / 0x100000000) * (max - min);

/** Estilo do lote: mesma entrada, mesma saida, em qualquer sessao. */
export function sceneryStyleFor(
  segmentIndex: number,
  side: -1 | 1
): SceneryStyle {
  const segment = Number.isFinite(segmentIndex)
    ? Math.max(0, Math.trunc(segmentIndex))
    : 0;
  const normalizedSide: -1 | 1 = side < 0 ? -1 : 1;
  const sideIndex = normalizedSide < 0 ? 0 : 1;
  const cadence = wrap(segment * 2 + sideIndex, ROOF_CADENCE.length);
  const windowCount: 2 | 3 =
    styleHash(segment, normalizedSide, 12) % 3 === 0 ? 3 : 2;

  return {
    segmentIndex: segment,
    side: normalizedSide,
    wallColor: strideFrom(SCENERY_WALL_COLORS, segment, sideIndex, 3, 5),
    roofColor: strideFrom(SCENERY_ROOF_COLORS, segment, sideIndex, 5, 2),
    canopyColor: strideFrom(SCENERY_CANOPY_COLORS, segment, sideIndex, 5, 3),
    shrubColor: strideFrom(SCENERY_CANOPY_COLORS, segment, sideIndex, 1, 4),
    roofKind: ROOF_CADENCE[cadence] as SceneryRoofKind,
    roofQuarterTurn: styleHash(segment, normalizedSide, 5) % 2 === 0,
    canopyKind: CANOPY_CADENCE[
      wrap(segment * 3 + sideIndex, CANOPY_CADENCE.length)
    ] as SceneryCanopyKind,
    heightScale: rangeFrom(styleHash(segment, normalizedSide, 6), 0.86, 1.26),
    canopyScale: rangeFrom(styleHash(segment, normalizedSide, 7), 0.78, 1.9),
    canopyYaw: rangeFrom(styleHash(segment, normalizedSide, 8), 0, Math.PI * 2),
    // +-8 graus: o suficiente para tirar a copa do prumo sem derrubar a arvore.
    canopyTilt: rangeFrom(styleHash(segment, normalizedSide, 9), -0.14, 0.14),
    windowCount,
    windowWidth: rangeFrom(styleHash(segment, normalizedSide, 10), 0.62, 1.04),
    windowHeight: rangeFrom(styleHash(segment, normalizedSide, 11), 0.58, 1.02),
    windowSpread: rangeFrom(
      styleHash(segment, normalizedSide, 13),
      windowCount === 3 ? 1.42 : 1.02,
      windowCount === 3 ? 1.78 : 1.46
    ),
    windowLift: rangeFrom(styleHash(segment, normalizedSide, 14), -0.22, 0.5),
    fenceKind:
      styleHash(segment, normalizedSide, 15) % 3 === 0 ? "low-wall" : "picket",
    fenceHeight: rangeFrom(styleHash(segment, normalizedSide, 16), 0.62, 1.12),
    fenceLength: rangeFrom(styleHash(segment, normalizedSide, 17), 1.7, 3.6),
    roofProp: ROOF_PROPS[
      wrap(segment * 5 + sideIndex * 7, ROOF_PROPS.length)
    ] as SceneryRoofProp,
  };
}

type Vec3 = readonly [number, number, number];

/** Acumulador de geometria crua: posicoes, normais e indices, nada mais. */
interface MeshDraft {
  positions: number[];
  normals: number[];
  indices: number[];
}

const emptyDraft = (): MeshDraft => ({
  positions: [],
  normals: [],
  indices: [],
});

/**
 * Empurra um poligono convexo plano. A lista chega no sentido anti-horario
 * visto de fora; o Babylon fecha o triangulo no sentido oposto ao da normal
 * (conferido contra `CreateBox`), entao o leque sai invertido de proposito.
 */
const pushFace = (draft: MeshDraft, corners: Vec3[], normal: Vec3): void => {
  const base = draft.positions.length / 3;
  corners.forEach(corner => {
    draft.positions.push(corner[0], corner[1], corner[2]);
    draft.normals.push(normal[0], normal[1], normal[2]);
  });
  for (let i = 1; i < corners.length - 1; i += 1) {
    draft.indices.push(base, base + i + 1, base + i);
  }
};

/** Caixa alinhada aos eixos, com normais duras. */
const pushBox = (
  draft: MeshDraft,
  width: number,
  height: number,
  depth: number,
  center: Vec3 = [0, 0, 0]
): void => {
  const x0 = center[0] - width / 2;
  const x1 = center[0] + width / 2;
  const y0 = center[1] - height / 2;
  const y1 = center[1] + height / 2;
  const z0 = center[2] - depth / 2;
  const z1 = center[2] + depth / 2;
  pushFace(
    draft,
    [
      [x1, y0, z0],
      [x1, y1, z0],
      [x1, y1, z1],
      [x1, y0, z1],
    ],
    [1, 0, 0]
  );
  pushFace(
    draft,
    [
      [x0, y0, z0],
      [x0, y0, z1],
      [x0, y1, z1],
      [x0, y1, z0],
    ],
    [-1, 0, 0]
  );
  pushFace(
    draft,
    [
      [x0, y1, z0],
      [x0, y1, z1],
      [x1, y1, z1],
      [x1, y1, z0],
    ],
    [0, 1, 0]
  );
  pushFace(
    draft,
    [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y0, z1],
      [x0, y0, z1],
    ],
    [0, -1, 0]
  );
  pushFace(
    draft,
    [
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z1],
    ],
    [0, 0, 1]
  );
  pushFace(
    draft,
    [
      [x0, y0, z0],
      [x0, y1, z0],
      [x1, y1, z0],
      [x1, y0, z0],
    ],
    [0, 0, -1]
  );
};

/**
 * Perfil convexo desenhado no plano XY (sentido anti-horario visto de +Z) e
 * puxado ao longo de Z. E daqui que saem as tres coberturas novas: duas aguas,
 * platibanda e meia agua, cada uma com uma unica malha de origem.
 */
const pushExtrudedSection = (
  draft: MeshDraft,
  section: readonly (readonly [number, number])[],
  depth: number
): void => {
  const half = depth / 2;
  pushFace(
    draft,
    section.map(([x, y]) => [x, y, half] as Vec3),
    [0, 0, 1]
  );
  pushFace(
    draft,
    [...section].reverse().map(([x, y]) => [x, y, -half] as Vec3),
    [0, 0, -1]
  );
  section.forEach(([px, py], index) => {
    const [qx, qy] = section[(index + 1) % section.length] as readonly [
      number,
      number,
    ];
    const dx = qx - px;
    const dy = qy - py;
    const length = Math.hypot(dx, dy) || 1;
    pushFace(
      draft,
      [
        [px, py, half],
        [px, py, -half],
        [qx, qy, -half],
        [qx, qy, half],
      ],
      [dy / length, -dx / length, 0]
    );
  });
};

/** Copia a geometria de uma esfera temporaria deslocada — vira lobo de copa. */
const pushMeshCopy = (
  draft: MeshDraft,
  source: Mesh,
  offset: Vec3,
  scale = 1
): void => {
  const positions = source.getVerticesData("position");
  const normals = source.getVerticesData("normal");
  const indices = source.getIndices();
  if (!positions || !normals || !indices) return;
  const base = draft.positions.length / 3;
  for (let i = 0; i < positions.length; i += 3) {
    draft.positions.push(
      (positions[i] as number) * scale + offset[0],
      (positions[i + 1] as number) * scale + offset[1],
      (positions[i + 2] as number) * scale + offset[2]
    );
    draft.normals.push(
      normals[i] as number,
      normals[i + 1] as number,
      normals[i + 2] as number
    );
  }
  indices.forEach(index => draft.indices.push(base + index));
};

const NEUTRAL_TINT = new Color4(1, 1, 1, 1);
const tintCache = new Map<string, Color4>();

/**
 * Cor de uma instancia. As paletas sao fechadas, entao o cache guarda no maximo
 * uma duzia de objetos e o quadro nao gera lixo.
 */
const setInstanceTint = (mesh: AbstractMesh, color: string | null): void => {
  // `new InstancedMesh` nao passa pela fabrica do Babylon, entao a instancia
  // nasce sem o mapa de buffers e o quadro quebraria ao ler a cor. Criar aqui
  // e o que casa o caminho direto com o buffer registrado na origem.
  const holder = mesh as unknown as {
    instancedBuffers?: Record<string, Color4>;
  };
  const buffers = (holder.instancedBuffers ??= {});
  if (!color) {
    buffers.color = NEUTRAL_TINT;
    return;
  }
  let tint = tintCache.get(color);
  if (!tint) {
    const rgb = Color3.FromHexString(color);
    tint = new Color4(rgb.r, rgb.g, rgb.b, 1);
    tintCache.set(color, tint);
  }
  buffers.color = tint;
};

/** Troca a geometria da malha pelo rascunho, sem criar malha nova. */
const applyDraft = (mesh: Mesh, draft: MeshDraft): void => {
  mesh.setVerticesData("position", draft.positions, false);
  mesh.setVerticesData("normal", draft.normals, false);
  mesh.setIndices(draft.indices);
  mesh.refreshBoundingInfo();
};

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
  private readonly sceneryWallMaterial: StandardMaterial;
  private readonly sceneryRoofMaterial: StandardMaterial;
  private readonly sceneryCanopyMaterial: StandardMaterial;
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
  /** Ceu pintado, no lugar da cor chapada de fundo. */
  private readonly backdrop: Mesh;
  private readonly backdropMaterial: StandardMaterial;
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
    // Parede, telhado e copa saem dos materiais compartilhados e ganham um
    // material proprio cada. E o que deixa a cor por instancia valer o tom
    // escolhido: em rota urbana a base fica branca e quem manda e a instancia;
    // fora dela a base volta a ser a cor do terreno e a instancia fica neutra.
    // O terreno inicial e urbano, entao a base ja nasce branca: quem pinta e
    // a instancia. `setTheme` devolve a cor do terreno assim que ele muda.
    this.sceneryWallMaterial = this.material("scenery-wall", "#FFFFFF", 0.12);
    this.sceneryRoofMaterial = this.material("scenery-roof", "#FFFFFF", 0.18);
    this.sceneryCanopyMaterial = this.material(
      "scenery-canopy",
      "#FFFFFF",
      0.08
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

    this.backdropMaterial = new StandardMaterial("sky-backdrop-mat", scene);
    // Ceu nao recebe luz: ele E luz. Com iluminacao ligada, o mesmo sol que
    // acende a cidade escureceria metade do horizonte.
    this.backdropMaterial.disableLighting = true;
    this.backdropMaterial.diffuseColor = Color3.Black();
    this.backdropMaterial.specularColor = Color3.Black();
    this.backdropMaterial.emissiveTexture = new Texture(
      "/assets/XB_Fundo_Cidade.webp",
      scene
    );
    this.backdropMaterial.backFaceCulling = false;
    // A esfera do ceu e vista por dentro: sem isto o Babylon a descarta
    // achando que o jogador esta olhando as costas dela.
    this.backdrop = MeshBuilder.CreateSphere(
      "sky-backdrop",
      { diameter: 460, segments: 32, sideOrientation: 1 },
      scene
    );
    this.backdrop.material = this.backdropMaterial;
    // Distancia infinita: a esfera acompanha a camera e nunca e cortada pelo
    // alcance dela, por mais longe que o jogador va na volta.
    this.backdrop.infiniteDistance = true;
    this.backdrop.applyFog = false;
    this.backdrop.isPickable = false;
    this.backdrop.renderingGroupId = 0;
    // SEM PAI. `infiniteDistance` funciona trocando a translacao da matriz de
    // mundo pela posicao da camera; com um pai, a matriz do pai entra depois e
    // desfaz a troca — a esfera fica parada no mundo, sai do alcance da camera
    // e o jogador ve a cor chapada de fundo, sem erro nenhum na tela.
    this.backdrop.setEnabled(false);

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
        roofGable: `scenery-roof-gable-${index}-${sideIndex}`,
        roofParapet: `scenery-roof-parapet-${index}-${sideIndex}`,
        roofShed: `scenery-roof-shed-${index}-${sideIndex}`,
        roofProp: `scenery-roof-prop-${index}-${sideIndex}`,
        crown: `scenery-crown-${index}-${sideIndex}`,
        crownConic: `scenery-crown-conic-${index}-${sideIndex}`,
        accent: `scenery-detail-${index}-${sideIndex}`,
        door: `scenery-door-${index}-${sideIndex}`,
        windowSecondary: `scenery-window-secondary-${index}-${sideIndex}`,
        windowTertiary: `scenery-window-tertiary-${index}-${sideIndex}`,
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
      let roofGable: AbstractMesh;
      let roofParapet: AbstractMesh;
      let roofShed: AbstractMesh;
      let roofProp: AbstractMesh;
      let crown: AbstractMesh;
      let crownConic: AbstractMesh;
      let accent: AbstractMesh;
      let door: AbstractMesh;
      let windowSecondary: AbstractMesh;
      let windowTertiary: AbstractMesh;
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
        roofGable = new InstancedMesh(names.roofGable, sources.roofGable);
        roofParapet = new InstancedMesh(names.roofParapet, sources.roofParapet);
        roofShed = new InstancedMesh(names.roofShed, sources.roofShed);
        roofProp = new InstancedMesh(names.roofProp, sources.roofProp);
        crown = new InstancedMesh(names.crown, sources.crown);
        crownConic = new InstancedMesh(names.crownConic, sources.crownConic);
        accent = new InstancedMesh(names.accent, sources.accent);
        door = new InstancedMesh(names.door, sources.door);
        windowSecondary = new InstancedMesh(
          names.windowSecondary,
          sources.windowSecondary
        );
        windowTertiary = new InstancedMesh(
          names.windowTertiary,
          sources.windowTertiary
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
        // Tres coberturas novas, cada uma com uma malha de origem so. O perfil
        // e desenhado em XY e puxado ao longo de Z: o frontao aponta para a rua.
        const roofGableSource = this.sectionMesh(names.roofGable, [
          [-0.5, -0.5],
          [0.5, -0.5],
          [0, 0.5],
        ]);
        const roofParapetSource = this.parapetRoofMesh(names.roofParapet);
        const roofShedSource = this.sectionMesh(names.roofShed, [
          [-0.5, -0.5],
          [0.5, -0.5],
          [0.5, 0.5],
          [-0.5, -0.34],
        ]);
        const roofPropSource = MeshBuilder.CreateBox(
          names.roofProp,
          { size: 1 },
          this.scene
        );
        // A copa redonda deixa de ser bola: tres lobos sobrepostos leem como
        // arvore, uma esfera de 6 gomos ampliada le como bola facetada.
        const crownSource = this.lobedCanopyMesh(names.crown);
        const crownConicSource = MeshBuilder.CreateCylinder(
          names.crownConic,
          { height: 1, diameterTop: 0, diameterBottom: 1, tessellation: 7 },
          this.scene
        );
        const accentSource = MeshBuilder.CreateBox(
          names.accent,
          { size: 1 },
          this.scene
        );
        // Porta em duas profundidades: batente saliente e folha recuada, numa
        // malha so. E o recuo do batente que faz a folha parar de parecer
        // adesivo colado na fachada.
        const doorSource = this.recessedDoorMesh(names.door);
        const windowSecondarySource = MeshBuilder.CreateBox(
          names.windowSecondary,
          { size: 1 },
          this.scene
        );
        const windowTertiarySource = MeshBuilder.CreateBox(
          names.windowTertiary,
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
        towerSource.material = this.sceneryWallMaterial;
        featureSource.material = this.sceneryRoofMaterial;
        roofGableSource.material = this.sceneryRoofMaterial;
        roofParapetSource.material = this.sceneryRoofMaterial;
        roofShedSource.material = this.sceneryRoofMaterial;
        roofPropSource.material = this.scenerySecondaryMaterial;
        crownSource.material = this.sceneryCanopyMaterial;
        crownConicSource.material = this.sceneryCanopyMaterial;
        accentSource.material = this.sceneryAccentMaterial;
        doorSource.material = this.scenerySecondaryMaterial;
        windowSecondarySource.material = this.sceneryAccentMaterial;
        windowTertiarySource.material = this.sceneryAccentMaterial;
        trunkSource.material = this.sceneryWoodMaterial;
        planterSource.material = this.sceneryMaterial;
        walkwaySource.material = this.sceneryPavementMaterial;
        fenceSource.material = this.sceneryFenceMaterial;
        lampPostSource.material = this.scenerySecondaryMaterial;
        lampHeadSource.material = this.sceneryAccentMaterial;
        parkedCarSource.material = this.sceneryVehicleMaterial;
        shrubSource.material = this.sceneryCanopyMaterial;
        // Buffer de cor por instancia: a origem registra e recebe cor tambem,
        // senao ela sai branca no meio das instancias coloridas.
        [
          towerSource,
          featureSource,
          roofGableSource,
          roofParapetSource,
          roofShedSource,
          crownSource,
          crownConicSource,
          shrubSource,
        ].forEach(source => source.registerInstancedBuffer("color", 4));
        this.scenerySources = {
          shadow: shadowSource,
          tower: towerSource,
          feature: featureSource,
          roofGable: roofGableSource,
          roofParapet: roofParapetSource,
          roofShed: roofShedSource,
          roofProp: roofPropSource,
          crown: crownSource,
          crownConic: crownConicSource,
          accent: accentSource,
          door: doorSource,
          windowSecondary: windowSecondarySource,
          windowTertiary: windowTertiarySource,
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
        roofGable = roofGableSource;
        roofParapet = roofParapetSource;
        roofShed = roofShedSource;
        roofProp = roofPropSource;
        crown = crownSource;
        crownConic = crownConicSource;
        accent = accentSource;
        door = doorSource;
        windowSecondary = windowSecondarySource;
        windowTertiary = windowTertiarySource;
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
      roofGable.parent = root;
      roofParapet.parent = root;
      roofShed.parent = root;
      roofProp.parent = root;
      crown.parent = root;
      crownConic.parent = root;
      accent.parent = root;
      door.parent = root;
      windowSecondary.parent = root;
      windowTertiary.parent = root;
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
        roofGable,
        roofParapet,
        roofShed,
        roofProp,
        crown,
        crownConic,
        accent,
        door,
        windowSecondary,
        windowTertiary,
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
        roofGable,
        roofParapet,
        roofShed,
        roofProp,
        crown,
        crownConic,
        accent,
        door,
        windowSecondary,
        windowTertiary,
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
        style: sceneryStyleFor(index, side < 0 ? -1 : 1),
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
          ? // Fim de tarde: o azul de meio-dia (#68C9F2) nao combina com a luz
            // baixa e quente do cenario. Esta cor vale por dois — e o fundo do
            // ceu E a cor da neblina, entao o fundo do bairro passa a brilhar
            // morno em vez de sumir num azul frio.
            "#F0B27A"
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
    // Onde a instancia manda na cor, a base fica branca; onde nao manda, a
    // base volta a ser a cor do terreno e o resultado e o de sempre.
    const tintedNeighborhood = terrain === "urban";
    const tintedFoliage = terrain === "urban" || terrain === "highway";
    this.sceneryWallMaterial.diffuseColor = tintedNeighborhood
      ? Color3.White()
      : Color3.FromHexString(palette.scenery);
    this.sceneryRoofMaterial.diffuseColor = tintedNeighborhood
      ? Color3.White()
      : Color3.FromHexString(palette.scenerySecondary);
    this.sceneryCanopyMaterial.diffuseColor = tintedFoliage
      ? Color3.White()
      : Color3.FromHexString("#2E6B45");
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
    // O ceu pintado so entra onde ele faz sentido: bairro, tempo bom. Chuva,
    // poeira e rota espacial continuam com o ceu de cor chapada, que e o que
    // aquelas cenas pedem.
    const ceuPintado = terrain === "urban" && !isSevere && weather !== "dust";
    this.backdrop.setEnabled(ceuPintado);
    // Com o ceu pintado, o disco de sol e as nuvens soltas sobram: o proprio
    // desenho ja tem sol e nuvem, e duas de cada uma briga com a outra.
    this.sun.setEnabled(!isSevere && weather !== "dust" && !ceuPintado);
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
    this.cloudsVisible = !spaceRoute && !ceuPintado;
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
      this.sceneryWallMaterial,
      this.sceneryRoofMaterial,
      this.sceneryCanopyMaterial,
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
    const urban = this.terrain === "urban";
    // A cor por instancia so faz sentido onde a peca e casa e arvore. Num
    // trecho orbital a mesma paleta viraria creme na lua, entao la a instancia
    // volta a ser neutra e o material carrega a cor do terreno, como antes.
    const tintBuildings = urban;
    const tintFoliage = urban || this.terrain === "highway";
    this.clusters.forEach(cluster => {
      const parkOccupiesSide =
        this.terrain === "urban" && cluster.module.parkSide === cluster.side;
      cluster.root.setEnabled(!parkOccupiesSide);
      const style = cluster.style;
      const size = 0.92 + cluster.variant * 0.035;
      const roof = this.roofFor(cluster, urban);
      cluster.tower.setEnabled(true);
      cluster.feature.setEnabled(roof === cluster.feature);
      cluster.roofGable.setEnabled(roof === cluster.roofGable);
      cluster.roofParapet.setEnabled(roof === cluster.roofParapet);
      cluster.roofShed.setEnabled(roof === cluster.roofShed);
      const conicCanopy = urban && style.canopyKind === "conic";
      cluster.crown.setEnabled(!conicCanopy);
      cluster.crownConic.setEnabled(conicCanopy);
      cluster.accent.setEnabled(true);
      const urbanDetails = this.terrain === "urban";
      cluster.roofProp.setEnabled(urbanDetails && style.roofProp !== "none");
      cluster.door.setEnabled(urbanDetails);
      cluster.windowSecondary.setEnabled(urbanDetails);
      cluster.windowTertiary.setEnabled(
        urbanDetails && style.windowCount === 3
      );
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
      [
        cluster.tower,
        cluster.feature,
        cluster.roofGable,
        cluster.roofParapet,
        cluster.roofShed,
        cluster.roofProp,
        cluster.crown,
        cluster.crownConic,
        cluster.accent,
        cluster.door,
        cluster.windowSecondary,
        cluster.windowTertiary,
        cluster.trunk,
        cluster.planter,
        cluster.walkway,
        cluster.fence,
        cluster.lampPost,
        cluster.lampHead,
        cluster.parkedCar,
        cluster.shrub,
      ].forEach(part => part.rotation.set(0, 0, 0));
      this.tintCluster(cluster, tintBuildings, tintFoliage);

      if (this.terrain === "urban") {
        const { lot } = cluster;
        cluster.root.position.set(
          lot.position.x,
          lot.position.y,
          lot.position.z
        );
        cluster.root.rotation.y = lot.rotationY;
        // A casa cresce e encolhe pelo topo: o pe fica cravado no mesmo plano,
        // senao uma variacao de altura afunda a fachada ou a poe flutuando.
        const groundY = 0.08;
        const wallHeight = lot.wallHeight * style.heightScale;
        const wallTop = groundY + wallHeight;
        const wallWidth = lot.wallWidth;
        const wallDepth = lot.wallDepth;
        const facadeZ = -wallDepth / 2 - 0.085;
        const treeX = lot.treeOffsetX;
        const treeZ = lot.treeOffsetZ;

        cluster.tower.scaling.set(wallWidth, wallHeight, wallDepth);
        cluster.tower.position.set(0, groundY + wallHeight / 2, 0);

        // Beiral: a cobertura avanca sobre a parede em vez de encostar rente.
        const eave = 0.36;
        const roofHeight =
          lot.roofHeight * (style.roofKind === "parapet" ? 0.62 : 1);
        const roofBase = wallTop - 0.07;
        const roofSpanX = wallWidth + eave;
        const roofSpanZ = wallDepth + eave;
        roof.position.set(0, roofBase + roofHeight / 2, 0);
        if (roof === cluster.feature) {
          // A piramide de 4 lados tem diagonal 1, nao lado 1: sem a raiz de
          // dois o "beiral" viraria um telhado menor que a casa.
          roof.scaling.set(
            roofSpanX * Math.SQRT2,
            roofHeight,
            roofSpanZ * Math.SQRT2
          );
          roof.rotation.y = Math.PI / 4;
        } else if (style.roofQuarterTurn) {
          roof.scaling.set(roofSpanZ, roofHeight, roofSpanX);
          roof.rotation.y = Math.PI / 2;
        } else {
          roof.scaling.set(roofSpanX, roofHeight, roofSpanZ);
        }

        // O acessorio nasce dentro da cobertura e sai por cima dela: assim ele
        // atravessa a agua do telhado em vez de pairar sobre a cumeeira.
        const propBase = roofBase + roofHeight * 0.3;
        if (style.roofProp === "chimney") {
          cluster.roofProp.scaling.set(0.3, 1.1, 0.3);
          cluster.roofProp.position.set(
            wallWidth * 0.27,
            propBase + 0.55,
            wallDepth * 0.2
          );
        } else if (style.roofProp === "tank") {
          cluster.roofProp.scaling.set(0.64, 0.72, 0.64);
          cluster.roofProp.position.set(
            wallWidth * 0.16,
            propBase + 0.36,
            -wallDepth * 0.14
          );
        } else if (style.roofProp === "aerial") {
          cluster.roofProp.scaling.set(0.07, 1.35, 0.07);
          cluster.roofProp.position.set(
            -wallWidth * 0.28,
            propBase + 0.6,
            wallDepth * 0.08
          );
        }

        // Janela deixa de ser adesivo repetido: muda quantidade, tamanho e
        // altura de casa para casa, sempre pelo mesmo indice do lote.
        const windowY = Math.min(
          Math.max(1.5 + style.windowLift, 1.12),
          wallTop - style.windowHeight / 2 - 0.28
        );
        cluster.accent.scaling.set(style.windowWidth, style.windowHeight, 0.1);
        cluster.accent.position.set(-style.windowSpread, windowY, facadeZ);
        cluster.windowSecondary.scaling.set(
          style.windowWidth,
          style.windowHeight,
          0.1
        );
        cluster.windowSecondary.position.set(
          style.windowSpread,
          windowY,
          facadeZ
        );
        cluster.windowTertiary.scaling.set(
          style.windowWidth * 0.66,
          style.windowHeight * 0.7,
          0.1
        );
        cluster.windowTertiary.position.set(
          0,
          Math.min(windowY + 0.72, wallTop - 0.3),
          facadeZ
        );

        // O batente avanca; a folha fica no fundo do vao.
        cluster.door.scaling.set(0.92, 1.62, 0.34);
        cluster.door.position.set(0, groundY + 0.79, facadeZ - 0.07);

        const trunkHeight = 1.38 * (0.72 + 0.44 * style.canopyScale);
        const trunkTop = 0.03 + trunkHeight;
        cluster.trunk.scaling.set(0.34, trunkHeight, 0.34);
        cluster.trunk.position.set(treeX, 0.03 + trunkHeight / 2, treeZ);
        const canopy = conicCanopy ? cluster.crownConic : cluster.crown;
        const canopyHeight = (conicCanopy ? 2.32 : 1.74) * style.canopyScale;
        canopy.scaling.set(
          (conicCanopy ? 1.42 : 2.04) * style.canopyScale,
          canopyHeight,
          (conicCanopy ? 1.42 : 1.78) * style.canopyScale
        );
        canopy.position.set(treeX, trunkTop + canopyHeight * 0.31, treeZ);
        canopy.rotation.y = style.canopyYaw;
        canopy.rotation.z = style.canopyTilt;
        cluster.planter.scaling.set(1.38, 0.3, 1.08);
        cluster.planter.position.set(treeX, 0.15, treeZ);

        cluster.walkway.scaling.set(1.15, 0.12, 2.65);
        cluster.walkway.position.set(0, 0.06, facadeZ - 1.34);
        const lowWall = style.fenceKind === "low-wall";
        const fenceHeight = lowWall
          ? style.fenceHeight * 0.58
          : style.fenceHeight;
        cluster.fence.scaling.set(
          lowWall ? 0.3 : 0.14,
          fenceHeight,
          wallDepth + style.fenceLength
        );
        cluster.fence.position.set(
          treeX > 0 ? -wallWidth / 2 - 0.82 : wallWidth / 2 + 0.82,
          fenceHeight / 2 + 0.02,
          -0.3
        );
        const lampX = treeX > 0 ? -3.7 : 3.7;
        cluster.lampPost.scaling.set(0.16, 3.45, 0.16);
        cluster.lampPost.position.set(lampX, 1.73, facadeZ - 2.25);
        cluster.lampHead.scaling.set(0.72, 0.2, 0.46);
        cluster.lampHead.position.set(lampX, 3.5, facadeZ - 2.42);
        cluster.parkedCar.scaling.set(1.72, 0.72, 3.05);
        cluster.parkedCar.position.set(-treeX * 0.62, 0.38, facadeZ - 3.1);
        cluster.shrub.scaling.set(
          1.02 + 0.24 * style.canopyScale,
          0.5 + 0.18 * style.canopyScale,
          0.7 + 0.16 * style.canopyScale
        );
        cluster.shrub.rotation.y = style.canopyYaw * 0.6;
        cluster.shrub.position.set(treeX * 0.55, 0.34, facadeZ - 1.5);

        cluster.shadow.scaling.set(1.52, 0.68, 1);

        if (cluster.module.commercial) {
          cluster.accent.scaling.set(2.45, 0.62, 0.1);
          cluster.accent.position.set(0, wallTop - 0.42, facadeZ - 0.03);
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
        cluster.crown.rotation.y = style.canopyYaw;
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
        cluster.crown.rotation.y = style.canopyYaw;
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

  /** Cobertura que este lote usa; fora do urbano so existe a piramide. */
  private roofFor(cluster: SceneryCluster, urban: boolean): AbstractMesh {
    if (!urban) return cluster.feature;
    // Comercio continua de laje: a platibanda faz o papel do antigo telhado
    // achatado que o modulo comercial ja pedia.
    if (cluster.module.commercial) return cluster.roofParapet;
    if (cluster.style.roofKind === "gable") return cluster.roofGable;
    if (cluster.style.roofKind === "parapet") return cluster.roofParapet;
    if (cluster.style.roofKind === "shed") return cluster.roofShed;
    return cluster.feature;
  }

  /**
   * Cor por instancia. A origem tambem recebe a sua — ela desenha junto com o
   * lote e sairia branca no meio das instancias coloridas.
   */
  private tintCluster(
    cluster: SceneryCluster,
    tintBuildings: boolean,
    tintFoliage: boolean
  ): void {
    const style = cluster.style;
    setInstanceTint(cluster.tower, tintBuildings ? style.wallColor : null);
    [
      cluster.feature,
      cluster.roofGable,
      cluster.roofParapet,
      cluster.roofShed,
    ].forEach(part =>
      setInstanceTint(part, tintBuildings ? style.roofColor : null)
    );
    [cluster.crown, cluster.crownConic].forEach(part =>
      setInstanceTint(part, tintFoliage ? style.canopyColor : null)
    );
    setInstanceTint(cluster.shrub, tintFoliage ? style.shrubColor : null);
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
    // AQUI e onde a luz do jogo e decidida de verdade. O que scene.ts monta na
    // abertura e sobrescrito por este bloco a cada rota — foi assim que um sol
    // dourado escrito la chegou branco e frio na tela, sem erro nenhum. Quem
    // quiser mudar a luz muda aqui.
    this.scene.imageProcessingConfiguration.exposure = urbanDaylight
      ? 1.12
      : 1.04;
    this.scene.imageProcessingConfiguration.contrast = urbanDaylight
      ? 1.04
      : 1.12;
    if (ambient) {
      ambient.intensity = severe
        ? 0.66
        : terrain === "planetary"
          ? 0.72
          : urbanDaylight
            ? 1.08
            : 0.86;
      // Fim de tarde: a luz que desce do ceu tambem e quente. Branco azulado
      // (#F3FAFD) deixava a cidade cinza por baixo de um ceu dourado.
      ambient.diffuse = urbanDaylight
        ? Color3.FromHexString("#F6E3C8")
        : sky.scale(0.38).add(Color3.FromHexString("#EDF5F6").scale(0.58));
    }
    if (sun) {
      sun.intensity =
        weather === "storm"
          ? 0.38
          : weather === "rain"
            ? 0.62
            : urbanDaylight
              ? 1.55
              : 1.02;
      sun.diffuse = Color3.FromHexString(
        weather === "cold" ? "#BFE9FA" : urbanDaylight ? "#FFCF96" : "#F7FBFF"
      );
    }
    if (rim) {
      // Preenchimento frio por tras, o contrario do dourado do sol. E esse par
      // quente e frio que separa o entregador do fundo sem precisar de mais luz.
      rim.intensity =
        terrain === "orbital" || terrain === "planetary" ? 0.42 : 0.4;
      rim.diffuse = Color3.FromHexString(
        terrain === "orbital" || terrain === "planetary"
          ? "#18BFEA"
          : urbanDaylight
            ? "#7FA8D8"
            : "#12547A"
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

  /** Cobertura tirada de um perfil convexo puxado ao longo de Z. */
  private sectionMesh(
    name: string,
    section: readonly (readonly [number, number])[]
  ): Mesh {
    const mesh = MeshBuilder.CreateBox(name, { size: 1 }, this.scene);
    const draft = emptyDraft();
    pushExtrudedSection(draft, section, 1);
    applyDraft(mesh, draft);
    return mesh;
  }

  /**
   * Laje com mureta em volta. Um perfil convexo unico nao consegue o vazio do
   * meio, entao a platibanda sai de cinco caixas na mesma malha: a laje recuada
   * aparece por dentro do parapeito em vez de virar um bloco macico.
   */
  private parapetRoofMesh(name: string): Mesh {
    const mesh = MeshBuilder.CreateBox(name, { size: 1 }, this.scene);
    const draft = emptyDraft();
    pushBox(draft, 1, 0.34, 1, [0, -0.33, 0]);
    pushBox(draft, 1, 0.66, 0.12, [0, 0.17, -0.44]);
    pushBox(draft, 1, 0.66, 0.12, [0, 0.17, 0.44]);
    pushBox(draft, 0.12, 0.66, 0.76, [-0.44, 0.17, 0]);
    pushBox(draft, 0.12, 0.66, 0.76, [0.44, 0.17, 0]);
    applyDraft(mesh, draft);
    return mesh;
  }

  /**
   * Copa de tres lobos. Uma esfera de 6 gomos ampliada le como bola facetada;
   * tres lobos deslocados leem como arvore neste tracado de poucos poligonos.
   */
  private lobedCanopyMesh(name: string): Mesh {
    const mesh = MeshBuilder.CreateBox(name, { size: 1 }, this.scene);
    const lobe = MeshBuilder.CreateSphere(
      `${name}-lobe`,
      { diameter: 1, segments: 5 },
      this.scene
    );
    const draft = emptyDraft();
    pushMeshCopy(draft, lobe, [0, 0.09, 0], 0.86);
    pushMeshCopy(draft, lobe, [-0.29, -0.13, 0.08], 0.62);
    pushMeshCopy(draft, lobe, [0.27, -0.16, -0.11], 0.68);
    applyDraft(mesh, draft);
    lobe.dispose();
    return mesh;
  }

  /** Batente saliente com folha recuada, numa malha unica. */
  private recessedDoorMesh(name: string): Mesh {
    const mesh = MeshBuilder.CreateBox(name, { size: 1 }, this.scene);
    const draft = emptyDraft();
    pushBox(draft, 0.16, 1, 1, [-0.42, 0, 0]);
    pushBox(draft, 0.16, 1, 1, [0.42, 0, 0]);
    pushBox(draft, 0.68, 0.16, 1, [0, 0.42, 0]);
    // A folha recua dois tercos da espessura: e a sombra do vao que aparece.
    pushBox(draft, 0.68, 0.84, 0.35, [0, -0.08, 0.325]);
    applyDraft(mesh, draft);
    return mesh;
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

import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { ISceneLoaderAsyncResult } from "@babylonjs/core/Loading/sceneLoader";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { Skeleton } from "@babylonjs/core/Bones/skeleton";
import type { Node } from "@babylonjs/core/node";
import type { Scene } from "@babylonjs/core/scene";
import "@babylonjs/loaders/glTF";
import type { GameWorld } from "./GameWorld";

const ASSET_ROOT = "/assets/glb/";
/**
 * Cruzamento, T e rotatoria tem exatamente o mesmo encaixe da reta — 8 x 8 m,
 * com o asfalto ocupando o ladrilho inteiro. Sao troca direta: entram sem
 * mexer em uma linha do sistema de pista.
 */
const ROAD_PIECES = {
  straight: "XB_Road_Straight.glb",
  cross: "XB_Road_Cross.glb",
  tee: "XB_Road_T.glb",
} as const;
type RoadPieceKey = keyof typeof ROAD_PIECES;
const SEGMENT_COUNT = 9;
/** O ladrilho tem 8 m de profundidade e o segmento do jogo tem 24 unidades. */
const PIECE_Z = [-8, 0, 8] as const;
/**
 * 1 metro do asset vale 2,3 unidades do jogo: os 6,00 m de asfalto da peça real
 * cobrem exatamente a faixa rodável de 13,8 unidades. Em Z o ladrilho fica na
 * escala nativa para encaixar três por segmento sem emenda.
 */
const ROAD_SCALE = { x: 2.3, y: 2.3, z: 1 } as const;
/** Assenta o topo do asfalto onde a pista procedural desenhava as faixas. */
const ROAD_Y = -0.08;
/** Altura desejada do entregador: 1,80 m de gente em unidades do jogo. */
const COURIER_HEIGHT = 4.14;
/**
 * Medido no jogo: na pose de pedalada a origem do modelo fica 0,48 acima dos
 * pes. Descontamos isso para as botas pousarem no pedal, a 0,64 do chao.
 */
const COURIER_MOUNT = { x: 0, y: 0.14, z: -0.15 } as const;
const PROCEDURAL_DRIVER_PATTERN =
  /^(?:xb-mascot-|driver-(?:upper-arm|forearm|hand|thigh|shin|boot|steering-wheel))/;

export interface GltfAssetHandle {
  dispose(): void;
}

interface LoadedPiece {
  root: AbstractMesh;
  prims: Mesh[];
}

/**
 * Tudo que veio de dentro dos arquivos glTF. A limpeza precisa desta lista
 * completa: malha, material e textura entram na cena juntos, e um esqueleto ou
 * um grupo de animação esquecido continua vivo mesmo sem nada para animar.
 */
interface LoadedAssets {
  nodes: TransformNode[];
  meshes: AbstractMesh[];
  skeletons: Skeleton[];
  animationGroups: AnimationGroup[];
}

async function loadPiece(
  scene: Scene,
  file: string,
  signal: AbortSignal,
  register: (result: ISceneLoaderAsyncResult) => void
): Promise<LoadedPiece> {
  const result = await SceneLoader.ImportMeshAsync("", ASSET_ROOT, file, scene);
  // Anotar antes de qualquer conferência: a partir daqui o que veio dentro do
  // arquivo já pertence à limpeza, aconteça o que acontecer nas linhas abaixo.
  register(result);
  if (signal.aborted || scene.isDisposed) {
    throw new DOMException("cancelado", "AbortError");
  }
  const root = result.meshes[0]!;
  const prims = result.meshes.filter(
    (mesh): mesh is Mesh => mesh !== root && mesh.getTotalVertices() > 0
  );
  // Ficam desligadas até virarem o primeiro ladrilho de verdade.
  prims.forEach(mesh => {
    mesh.setEnabled(false);
    mesh.isPickable = false;
  });
  root.setEnabled(false);
  return { root, prims };
}

/**
 * Qual peça vai em cada ladrilho. Determinístico de propósito: o traçado
 * precisa ser o mesmo em toda partida, e os segmentos são reciclados.
 */
function pieceFor(tile: number): { key: RoadPieceKey; flip: boolean } {
  // A rotatória saiu: o traçado atravessa o ladrilho em linha reta, então o
  // ilhéu central aparecia no meio da faixa e o jogador passava por cima dele.
  // A vaga dela virou cruzamento comum, que mantém o compasso da malha.
  if (tile % 9 === 4) return { key: "cross", flip: false };
  if (tile % 7 === 2) return { key: "tee", flip: tile % 14 >= 7 };
  return { key: "straight", flip: false };
}

/**
 * Replica as peças por instâncias em vez de malhas independentes: cada peça
 * usada custa quatro chamadas de desenho, uma por material, não importa
 * quantos ladrilhos ela ocupe.
 */
function tileRoad(
  scene: Scene,
  pieces: Record<RoadPieceKey, LoadedPiece>,
  created: TransformNode[]
): void {
  const usedAsSource = new Set<RoadPieceKey>();
  for (let segmentIndex = 0; segmentIndex < SEGMENT_COUNT; segmentIndex += 1) {
    const segment = scene.getTransformNodeByName(
      `road-segment-${segmentIndex}`
    );
    if (!segment) continue;
    PIECE_Z.forEach((z, pieceIndex) => {
      const choice = pieceFor(segmentIndex * PIECE_Z.length + pieceIndex);
      const piece = pieces[choice.key];
      const holder = new TransformNode(
        `xb-road-${segmentIndex}-${pieceIndex}-${choice.key}`,
        scene
      );
      holder.parent = segment;
      holder.position.set(0, ROAD_Y, z);
      // O T abre o braço para +x; girar meia volta manda a rua lateral para o
      // outro lado sem precisar de uma segunda peça.
      holder.rotation.y = choice.flip ? Math.PI : 0;
      holder.scaling.set(ROAD_SCALE.x, ROAD_SCALE.y, ROAD_SCALE.z);
      // O carregador de glTF envolve tudo num nó que converte o sistema de
      // coordenadas. Repetimos essa transformação aqui em vez de achatá-la.
      const oriented = new TransformNode(`${holder.name}-o`, scene);
      oriented.parent = holder;
      if (piece.root.rotationQuaternion) {
        oriented.rotationQuaternion = piece.root.rotationQuaternion.clone();
      } else {
        oriented.rotation.copyFrom(piece.root.rotation);
      }
      oriented.scaling.copyFrom(piece.root.scaling);
      // O primeiro ladrilho de cada peça usa a malha original; os demais são
      // instâncias dela. Manter a original escondida como mera fonte fazia o
      // Babylon deixá-la fora da avaliação de luz, e aí nenhuma instância
      // recebia sombra — a rua ficava sem a sombra da bicicleta.
      if (!usedAsSource.has(choice.key)) {
        usedAsSource.add(choice.key);
        piece.prims.forEach(prim => {
          prim.parent = oriented;
          prim.position.set(0, 0, 0);
          prim.rotationQuaternion = null;
          prim.rotation.set(0, 0, 0);
          prim.scaling.setAll(1);
          prim.setEnabled(true);
        });
      } else {
        piece.prims.forEach((prim, primIndex) => {
          const instance = prim.createInstance(`${holder.name}-${primIndex}`);
          instance.parent = oriented;
          instance.isPickable = false;
        });
      }
      created.push(holder);
    });
  }
}

function measuredHeight(mesh: AbstractMesh): number {
  mesh.computeWorldMatrix(true);
  const box = mesh.getHierarchyBoundingVectors(true);
  return Math.max(0.001, box.max.y - box.min.y);
}

export async function installGltfAssets(
  scene: Scene,
  world: GameWorld
): Promise<GltfAssetHandle> {
  const controller = new AbortController();
  let disposed = false;
  /** Suportes criados aqui para posicionar a rua e o entregador. */
  const createdNodes: TransformNode[] = [];
  const loaded: LoadedAssets = {
    nodes: [],
    meshes: [],
    skeletons: [],
    animationGroups: [],
  };
  let proceduralRoad: AbstractMesh[] = [];
  let observer: ReturnType<Scene["onBeforeRenderObservable"]["add"]> | null =
    null;

  const releaseAssets = (): void => {
    if (!scene.isDisposed) {
      // As animacoes continuariam mexendo no esqueleto depois que as malhas
      // sumissem, entao elas param e saem antes de tudo.
      loaded.animationGroups.forEach(group => {
        group.stop();
        group.dispose();
      });
      // O segundo argumento manda descartar tambem o material e as texturas de
      // cada peca. Eles vieram de dentro do glTF e nao servem a mais nada: sem
      // isso a rua saia da cena mas as tintas dela ficavam.
      createdNodes.forEach(node => {
        if (!node.isDisposed()) node.dispose(false, true);
      });
      loaded.nodes.forEach(node => {
        if (!node.isDisposed()) node.dispose(false, true);
      });
      loaded.meshes.forEach(mesh => {
        if (!mesh.isDisposed()) mesh.dispose(false, true);
      });
      loaded.skeletons.forEach(skeleton => skeleton.dispose());
    }
    createdNodes.length = 0;
    loaded.nodes.length = 0;
    loaded.meshes.length = 0;
    loaded.skeletons.length = 0;
    loaded.animationGroups.length = 0;
  };

  /**
   * Anota o que uma importacao acabou de trazer. Antes essa anotacao so
   * acontecia depois que os cinco arquivos tinham entrado, e bastava um deles
   * falhar para tudo o que ja havia chegado ficar preso na cena para sempre: a
   * limpeza olhava uma lista vazia. Se a cena ja tiver sido desmontada nesse
   * meio-tempo, o que chegou agora nao tem mais para onde ir e sai na hora.
   */
  const register = (result: ISceneLoaderAsyncResult): void => {
    loaded.meshes.push(...result.meshes);
    loaded.nodes.push(...result.transformNodes);
    loaded.skeletons.push(...result.skeletons);
    loaded.animationGroups.push(...result.animationGroups);
    if (disposed) releaseAssets();
  };

  const teardown = (): void => {
    if (disposed) return;
    disposed = true;
    controller.abort();
    if (observer) scene.onBeforeRenderObservable.remove(observer);
    observer = null;
    releaseAssets();
    if (!scene.isDisposed) {
      proceduralRoad.forEach(mesh => mesh.setEnabled(true));
    }
    proceduralRoad = [];
  };
  const handle: GltfAssetHandle = { dispose: teardown };

  try {
    // Em serie, nao em paralelo: duas importacoes glTF simultaneas na mesma
    // cena se atropelam e uma delas chega sem geometria nenhuma.
    const pieces = {} as Record<RoadPieceKey, LoadedPiece>;
    for (const [key, file] of Object.entries(ROAD_PIECES)) {
      pieces[key as RoadPieceKey] = await loadPiece(
        scene,
        file,
        controller.signal,
        register
      );
    }
    const courierPack = await SceneLoader.ImportMeshAsync(
      "",
      ASSET_ROOT,
      "entregador_web.glb",
      scene
    );
    register(courierPack);
    if (disposed || scene.isDisposed) {
      teardown();
      return handle;
    }

    proceduralRoad = world.roadSurfaceNodes();
    tileRoad(scene, pieces, createdNodes);

    // O no raiz do glTF carrega a conversao de sistema de coordenadas: mexer
    // na escala dele espelha o modelo e ele some por back-face culling. Por
    // isso o ajuste vai num suporte proprio, acima da raiz.
    const courierRoot = courierPack.meshes[0]!;
    const courier = new TransformNode("xb-courier", scene);
    const rawHeight = measuredHeight(courierRoot);
    courierRoot.parent = courier;
    courierRoot.position.set(0, 0, 0);
    createdNodes.push(courier);
    courierPack.meshes.forEach(mesh => {
      mesh.isPickable = false;
      // Malha com esqueleto tem caixa de contorno degenerada ate ser
      // recalculada; sem isso o descarte por frustum a some da tela.
      mesh.alwaysSelectAsActiveMesh = true;
      if (mesh.skeleton) mesh.refreshBoundingInfo({ applySkeleton: true });
    });
    const courierScale = COURIER_HEIGHT / rawHeight;
    const groups = new Map<string, AnimationGroup>();
    courierPack.animationGroups.forEach(group => {
      group.stop();
      groups.set(group.name.toLowerCase(), group);
    });
    let playing: AnimationGroup | null = null;
    const play = (name: string): void => {
      const next = groups.get(name);
      if (!next || next === playing) return;
      playing?.stop();
      next.start(true);
      playing = next;
    };

    let bikeActive: boolean | null = null;
    let mounted: Node | null = null;
    let driverRig: TransformNode | null = null;
    let proceduralDriver: AbstractMesh[] = [];
    courier.setEnabled(false);

    observer = scene.onBeforeRenderObservable.add(() => {
      const isBike = world.selectedVehicleId === "bike";

      // O entregador se prende a "player-vehicle", que vive enquanto a cena
      // existir. Preso ao "driver-rig" ele era descartado junto toda vez que
      // o veiculo era remontado, e sumia da tela sem erro nenhum.
      if (mounted === null || mounted.isDisposed()) {
        mounted = scene.getTransformNodeByName("player-vehicle");
        if (mounted) {
          courier.parent = mounted;
          courier.position.set(
            COURIER_MOUNT.x,
            COURIER_MOUNT.y,
            COURIER_MOUNT.z
          );
          courier.rotation.set(0, 0, 0);
          courier.scaling.setAll(courierScale);
        }
        bikeActive = null;
      }
      // Achar as pecas do mascote procedural custa uma varredura na cena
      // inteira, e elas so mudam quando o veiculo e remontado. O "driver-rig"
      // nasce e morre junto com o veiculo, entao guardar o proprio no responde
      // as duas perguntas de uma vez: enquanto ele estiver vivo a lista
      // continua valendo, e quando ele morre o veiculo e outro e a lista e
      // refeita. Antes a decisao era pelo tamanho da lista, e trocar a bicicleta
      // por ela mesma devolve exatamente o mesmo tamanho: a lista velha ficava
      // apontando para pecas ja descartadas e o mascote novo nascia ligado em
      // cima do entregador — dois pilotos na mesma bicicleta.
      if (driverRig === null || driverRig.isDisposed()) {
        const rig = scene.getTransformNodeByName("driver-rig");
        driverRig = rig;
        proceduralDriver = rig
          ? scene.meshes.filter(
              mesh =>
                PROCEDURAL_DRIVER_PATTERN.test(mesh.name || "") &&
                mesh.isDescendantOf(rig)
            )
          : [];
        bikeActive = null;
      }

      if (isBike !== bikeActive) {
        bikeActive = isBike;
        createdNodes.forEach(node => {
          if (node !== courier) node.setEnabled(isBike);
        });
        proceduralRoad.forEach(mesh => mesh.setEnabled(!isBike));
        proceduralDriver.forEach(mesh => mesh.setEnabled(!isBike));
        courier.setEnabled(Boolean(isBike && mounted));
        if (!isBike) {
          playing?.stop();
          playing = null;
        }
      }

      if (!isBike || !mounted) return;
      // O mesmo esqueleto traz idle, pedal e walk. Montado na bicicleta so as
      // duas primeiras fazem sentido; "walk" espera o momento em que o
      // entregador desce para entregar.
      play(world.isRunActive ? "pedal" : "idle");
    });

    document.documentElement.dataset.xbAssets = "gltf";
    return handle;
  } catch (error) {
    if (disposed) return handle;
    teardown();
    document.documentElement.dataset.xbAssets = "procedural";
    console.warn("Assets glTF nao puderam ser ativados", error);
    return handle;
  }
}

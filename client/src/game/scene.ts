import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene, ScenePerformancePriority } from "@babylonjs/core/scene";
import { GameWorld } from "./GameWorld";
import { installGltfAssets, type GltfAssetHandle } from "./GltfAssetRuntime";
import type {
  BikePartId,
  BuildingId,
  GameListener,
  GameSnapshot,
  TireCompoundId,
  TireStat,
  VehicleId,
} from "./types";
import type { StoreActionResult } from "./GameState";
import type { StartRunResult } from "./GameState";

export interface GameHandle {
  scene: Scene;
  subscribe(listener: GameListener): () => void;
  getSnapshot(): GameSnapshot;
  startRun(routeId?: string): void;
  pauseRun(): void;
  resumeRun(): void;
  abortRun(): void;
  activateTurbo(): void;
  moveLeft(): void;
  moveRight(): void;
  goBase(): void;
  goRoutes(): void;
  goGarage(): void;
  goMenu(): void;
  buyVehicle(id: VehicleId): void;
  selectVehicle(id: VehicleId): void;
  upgradeVehicle(id: VehicleId): void;
  upgradeTire(stat: TireStat): void;
  upgradeBikePart(partId: BikePartId): void;
  definirJogador(nome: string, entregadorId: string): StoreActionResult;
  esquecerJogador(): StoreActionResult;
  buyBikeUnit(): void;
  buyVehicleUnit(vehicleId: VehicleId): void;
  hireCourier(): void;
  /*
   * A CENA DA PRIMEIRA BICICLETA.
   *
   * Nao e contratacao, e por isso nao entra no `hireCourier`: nao ha preco,
   * nem escolha, nem vaga na garagem para conferir. O drone desceu, o bau
   * abriu, e quem joga deu a unica bicicleta que existia para o amigo.
   */
  entregarAPrimeiraBike(nome: string, candidatoId: string): void;
  hireOperator(vehicleId: VehicleId): void;
  maintainBike(): void;
  equipCompound(vehicleId: VehicleId, compoundId: TireCompoundId): void;
  maintainVehicleTires(vehicleId: VehicleId): void;
  upgradeBuilding(id: BuildingId): void;
  dispatchRoute(routeId: string): void;
  dispatchAutomatedRoute(routeId: string): void;
  previewRoute(routeId: string): StartRunResult;
  setGlow(enabled: boolean): void;
  setShadows(enabled: boolean): void;
  collectDelivery(instanceId: string): void;
  claimDailyMission(id: string): void;
  resetProgress(): void;
  dispose(): void;
}

export async function createGameScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  options: { glow?: boolean; shadows?: boolean } = {}
): Promise<GameHandle> {
  const scene = new Scene(engine);
  // O modo Intermediate desliga a passagem de sombra em silêncio — nada de
  // erro, a sombra simplesmente não é desenhada. Ele volta a ser usado quando
  // as sombras estão desligadas, que é o caso do preset "Desempenho".
  scene.autoClear = true;
  scene.skipPointerMovePicking = true;
  scene.constantlyUpdateMeshUnderPointer = false;
  scene.clearColor = Color4.FromHexString("#0D1B33FF");
  // Esta cor multiplica a parcela de ambiente de CADA material da cena. Ela
  // estava num azul-marinho quase preto, e era ela que puxava as casas
  // proximas para o cinza-azulado por baixo de um ceu dourado: a cidade nao
  // batia com a propria luz dela. Trocada por um marrom claro e morno, a
  // sombra das fachadas passa a ter a cor do fim de tarde.
  scene.ambientColor = Color3.FromHexString("#6B5136");
  // Sem neblina. Ela existia para esconder a borda do mundo quando a pista
  // era uma esteira de 216 unidades; com o circuito fechado nao ha borda para
  // esconder — ha cidade — e a neblina so apagava o outro lado da volta.
  // Os valores de alcance continuam sendo escritos pelo tema do ambiente, e
  // voltam a valer no dia em que o modo for religado.
  scene.fogMode = Scene.FOGMODE_NONE;
  scene.fogStart = 62;
  scene.fogEnd = 184;
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType =
    ImageProcessingConfiguration.TONEMAPPING_ACES;
  // Contraste alto compensava a falta de luz direcional; com o sol mais forte
  // ele so fechava as sombras e tirava cor das paredes claras.
  scene.imageProcessingConfiguration.exposure = 1.2;
  scene.imageProcessingConfiguration.contrast = 1.04;
  // Vinheta discreta: escurece so os cantos e puxa o olho para o meio da
  // pista. Sem ela o quadro inteiro tem o mesmo peso e a rua nao conduz o
  // olhar para lugar nenhum.
  scene.imageProcessingConfiguration.vignetteEnabled = true;
  scene.imageProcessingConfiguration.vignetteWeight = 0.9;
  scene.imageProcessingConfiguration.vignetteStretch = 0.5;
  scene.imageProcessingConfiguration.vignetteCameraFov = 0.9;
  // Vinheta morna, nao azul: a borda escura tem de ser da mesma familia do
  // fim de tarde, senao o canto do quadro puxa para a noite.
  scene.imageProcessingConfiguration.vignetteColor =
    Color4.FromHexString("#1C0C06FF");

  const camera = new FreeCamera(
    "chase-camera",
    new Vector3(0, 5.85, -12.15),
    scene
  );
  camera.fov = 0.78;
  camera.minZ = 0.1;
  camera.maxZ = 280;
  camera.setTarget(new Vector3(0, 1.35, 9.5));

  /**
   * Ceu em cima, grama embaixo. O `groundColor` era um azul quase preto: toda
   * face virada para baixo — beiral, lateral de casa na sombra, meio-fio —
   * recebia quase nada, e o bairro inteiro lia frio e sujo. Devolvendo o
   * verde do gramado como luz de retorno, a parte na sombra ganha a cor do
   * chao em vez de um cinza azulado.
   */
  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.9;
  ambient.diffuse = Color3.FromHexString("#F2D6B6");
  ambient.specular = Color3.FromHexString("#8FA4AF");
  ambient.groundColor = Color3.FromHexString("#A8804C");

  /**
   * Sol de fim de tarde: BAIXO e A FRENTE do jogador, um pouco a esquerda.
   *
   * Quase a pino, como estava antes, tudo recebia a mesma luz e nada tinha
   * silhueta: casa sem lado claro nem lado escuro, entregador chapado contra
   * o fundo. Vindo de frente e rasante, o sol contorna o entregador de luz —
   * o contraluz que separa o personagem do cenario, que e o truque mais
   * velho do desenho animado — e acende a fachada do lado de la da rua.
   */
  const sun = new DirectionalLight(
    "sun",
    new Vector3(-0.38, -0.82, 0.42),
    scene
  );
  sun.position = new Vector3(30, 40, -26);
  sun.intensity = 1.5;
  sun.diffuse = Color3.FromHexString("#FFCF96");
  sun.specular = Color3.FromHexString("#FFE0B0");

  const rim = new DirectionalLight(
    "rim-light",
    new Vector3(-0.22, -0.42, 0.88),
    scene
  );
  rim.position = new Vector3(-20, 18, 30);
  // Preenchimento frio por tras. As costas do entregador sao o que a camera
  // ve o tempo todo, e com o sol de frente elas virariam um vulto preto.
  // Frio de proposito: e o contrario do dourado do sol, e e esse par quente
  // e frio que faz a cena parecer desenho em vez de foto.
  rim.intensity = 0.4;
  rim.diffuse = Color3.FromHexString("#7FA8D8");
  rim.specular = Color3.FromHexString("#3A6C96");

  // O azul XB da bicicleta e dos coletáveis é emissivo de verdade — vem assim
  // do material original. Sem uma camada de brilho esse valor era desperdiçado.
  let glow: GlowLayer | null = null;
  // Céu, sol, nuvens e estrelas são pintados com material sem iluminação e
  // valor alto de emissão. Sem excluí-los, a camada de brilho estourava o
  // fundo inteiro em vez de destacar o azul XB.
  const GLOW_EXCLUDED = /^(?:sky-|sun-|cloud-|star-)/;
  const excludeBackground = (): void => {
    if (!glow) return;
    scene.meshes.forEach(mesh => {
      if (GLOW_EXCLUDED.test(mesh.name)) glow?.addExcludedMesh(mesh as Mesh);
    });
  };
  const setGlow = (enabled: boolean): void => {
    if (enabled && !glow) {
      glow = new GlowLayer("xb-glow", scene, { blurKernelSize: 16 });
      glow.intensity = 0.22;
      excludeBackground();
    } else if (!enabled && glow) {
      glow.dispose();
      glow = null;
    }
  };
  setGlow(options.glow !== false);

  /**
   * Nada no jogo projetava sombra: só havia discos escuros presos aos atores.
   * O jogador fica parado e o mundo passa por ele, então uma única projeção
   * ancorada na origem cobre para sempre a área que importa — e por isso o
   * mapa de sombra pode ser pequeno e nítido.
   */
  let shadows: ShadowGenerator | null = null;
  let shadowTick = 0;
  /**
   * O que projeta sombra. Ate agora era so a bicicleta, e por isso a luz nao
   * parecia luz: sol de fim de tarde sem sombra de casa no chao e apenas um
   * filtro laranja. A sombra comprida atravessando a rua e o que faz o olho
   * acreditar na hora do dia.
   *
   * O jogador fica parado na origem — quem anda e o mundo —, entao a area de
   * sombra pode ser fixa e pequena em volta do zero, e por isso ela sai
   * nitida em vez de virar borrao esticado sobre 300 m de circuito.
   */
  const CASTER_PATTERN =
    /^(?:XB_C_Casa|XB_C_Poste|XB_C_Cerca|XB_C_Arvore|XB_C_Lixeira|building-)/;
  const collectCasters = (): AbstractMesh[] => {
    const out: AbstractMesh[] = [];
    const seen = new Set<number>();
    scene.meshes.forEach(mesh => {
      if (!CASTER_PATTERN.test(mesh.name)) return;
      if (mesh.getTotalVertices() === 0) return;
      if (seen.has(mesh.uniqueId)) return;
      seen.add(mesh.uniqueId);
      out.push(mesh);
    });
    ["player-vehicle", "xb-courier"].forEach(name => {
      const root = scene.getTransformNodeByName(name);
      if (!root) return;
      root.getChildMeshes(false).forEach(mesh => {
        // O disco de sombra falso não pode virar objeto que projeta sombra.
        if (/-shadow$/.test(mesh.name)) return;
        if (mesh.getTotalVertices() === 0) return;
        // O entregador fica pendurado no veículo do jogador, então ele já veio
        // na primeira varredura: sem esta marca ele era contado duas vezes.
        if (seen.has(mesh.uniqueId)) return;
        seen.add(mesh.uniqueId);
        out.push(mesh);
      });
    });
    return out;
  };
  const refreshCasters = (): void => {
    if (!shadows) return;
    const map = shadows.getShadowMap();
    if (!map) return;
    // A lista é trocada inteira, sem tentar adivinhar se ela mudou. Toda
    // tentativa de atalho aqui já custou a sombra da bicicleta: o veículo é
    // remontado a cada corrida, o Babylon tira sozinho desta lista as peças
    // descartadas, e o conjunto novo costuma ter exatamente o mesmo tamanho do
    // antigo — uma comparação por quantidade não vê diferença nenhuma e as
    // peças novas nunca entram. Coletar tudo de novo custa 0,04 ms e acontece
    // a cada 10 quadros. A coleta já vem sem repetições, então ela pode ir
    // direto para a lista, sem passar peça por peça.
    map.renderList = collectCasters();
  };
  // A rua real chega depois da cena montada, então a lista de superfícies que
  // recebem sombra é reaplicada junto com a dos objetos que a projetam.
  // XB_Via sao as 100 pecas do circuito e circuit-ground e a grama sob ele:
  // sem os dois a sombra da bicicleta sumia justamente no mundo novo.
  const RECEIVER_PATTERN =
    /^(?:asphalt|road-batch|urban-batch|terrain|XB_Road|XB_Via|circuit-ground|XB_C_Casa|XB_C_Quintal|building-)/;
  const applyReceivers = (enabled: boolean): void => {
    scene.meshes.forEach(mesh => {
      if (RECEIVER_PATTERN.test(mesh.name)) mesh.receiveShadows = enabled;
    });
  };
  const setShadows = (enabled: boolean): void => {
    scene.performancePriority = enabled
      ? ScenePerformancePriority.BackwardCompatible
      : ScenePerformancePriority.Intermediate;
    scene.autoClear = true;
    scene.skipPointerMovePicking = true;
    if (enabled && !shadows) {
      // A area de sombra e fixa em volta da origem, entao 2048 aqui dao
      // textura de sobra: cada ponto do mapa cobre pouco mais de 2 cm.
      sun.autoUpdateExtends = false;
      sun.orthoLeft = -52;
      sun.orthoRight = 52;
      sun.orthoTop = 52;
      sun.orthoBottom = -52;
      sun.shadowMinZ = 1;
      sun.shadowMaxZ = 180;
      shadows = new ShadowGenerator(2048, sun);
      // A projeção acompanha só a bicicleta, então o mapa cobre poucos metros:
      // um desfoque grande viraria uma mancha enorme no asfalto. Filtragem
      // percentual dá contato nítido e não vaza para fora do enquadramento.
      shadows.usePercentageCloserFiltering = true;
      shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
      shadows.bias = 0.006;
      shadows.normalBias = 0.02;
      // Sombra de fim de tarde nao e buraco preto: e a cor do ceu no chao.
      shadows.darkness = 0.42;
      shadows.transparencyShadow = false;
      refreshCasters();
      applyReceivers(true);
    } else if (!enabled && shadows) {
      applyReceivers(false);
      shadows.dispose();
      shadows = null;
    }
  };
  setShadows(options.shadows !== false);

  const params = new URLSearchParams(window.location.search);
  const isDemo = params.has("demo");
  const freshCampaign = params.has("fresh");
  const screenParam = params.get("screen");
  const initialMode =
    screenParam === "menu" ||
    screenParam === "base" ||
    screenParam === "routes" ||
    screenParam === "garage" ||
    screenParam === "complete"
      ? screenParam
      : undefined;
  const world = new GameWorld(
    scene,
    camera,
    canvas,
    isDemo,
    initialMode,
    freshCampaign
  );
  // Rua e entregador reais em glTF. Os materiais vem no proprio arquivo: o
  // carregador anterior os descartava e colava o material escuro do jogo por
  // cima, e era so isso que deixava a pista preta.
  let realAssets: GltfAssetHandle | null = null;
  void installGltfAssets(scene, world).then(installed => {
    if (scene.isDisposed) {
      installed.dispose();
      return;
    }
    realAssets = installed;
  });

  // A cena só existe depois do mundo: a primeira coleta tem de ser aqui.
  refreshCasters();
  if (shadows) applyReceivers(true);

  scene.onBeforeRenderObservable.add(() => {
    world.update(engine.getDeltaTime() / 1000);
    // O veículo é remontado a cada troca e a rua real chega depois; a lista
    // precisa acompanhar. Fora da corrida a cena desenha 1 quadro por segundo,
    // então o intervalo é contado em quadros, não em tempo.
    shadowTick += 1;
    if (shadowTick % 10 === 0) {
      refreshCasters();
      if (shadows) applyReceivers(true);
      excludeBackground();
    }
  });

  return {
    scene,
    subscribe: listener => world.subscribe(listener),
    getSnapshot: () => world.getSnapshot(),
    startRun: routeId => world.startRun(routeId),
    pauseRun: () => world.pauseRun(),
    resumeRun: () => world.resumeRun(),
    abortRun: () => world.abortRun(),
    activateTurbo: () => world.activateTurbo(),
    moveLeft: () => world.moveLeft(),
    moveRight: () => world.moveRight(),
    goBase: () => world.goBase(),
    goRoutes: () => world.goRoutes(),
    goGarage: () => world.goGarage(),
    goMenu: () => world.goMenu(),
    buyVehicle: id => world.buyVehicle(id),
    selectVehicle: id => world.selectVehicle(id),
    upgradeVehicle: id => world.upgradeVehicle(id),
    upgradeTire: stat => world.upgradeTire(stat),
    upgradeBikePart: partId => world.upgradeBikePart(partId),
    definirJogador: (nome: string, entregadorId: string) =>
      world.definirJogador(nome, entregadorId),
    esquecerJogador: () => world.esquecerJogador(),
    buyBikeUnit: () => world.buyBikeUnit(),
    buyVehicleUnit: (vehicleId: VehicleId) => world.buyVehicleUnit(vehicleId),
    hireCourier: () => world.hireCourier(),
    entregarAPrimeiraBike: (nome, candidatoId) =>
      void world.entregarAPrimeiraBike(nome, candidatoId),
    hireOperator: (vehicleId: VehicleId) => world.hireOperator(vehicleId),
    maintainBike: () => world.maintainBike(),
    equipCompound: (vehicleId, compoundId) =>
      world.equipCompound(vehicleId, compoundId),
    maintainVehicleTires: vehicleId => world.maintainVehicleTires(vehicleId),
    upgradeBuilding: id => world.upgradeBuilding(id),
    dispatchRoute: routeId => world.dispatchRoute(routeId),
    dispatchAutomatedRoute: routeId => world.dispatchAutomatedRoute(routeId),
    previewRoute: routeId => world.previewRoute(routeId),
    setGlow,
    setShadows,
    collectDelivery: instanceId => world.collectDelivery(instanceId),
    claimDailyMission: id => world.claimDailyMission(id),
    resetProgress: () => world.resetProgress(),
    dispose: () => {
      shadows?.dispose();
      glow?.dispose();
      realAssets?.dispose();
      world.dispose();
      scene.dispose();
    },
  };
}

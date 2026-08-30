import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

// A versao vem do pacote: fixar o numero aqui fazia o portao reprovar a cada
// release sem nenhum defeito por tras.
const projectRoot = process.cwd();
const RELEASE = JSON.parse(
  await readFile(path.join(projectRoot, "package.json"), "utf8")
).version;
const OVERLAY_PATTERN =
  /v250-runtime|v260-pilot-fusion|v270-hud-focus|v280-neighborhood|v300-golden-route|v310-real-assets/;

const failures = [];

async function read(file) {
  try {
    return await readFile(file, "utf8");
  } catch {
    failures.push(`${file}: arquivo obrigatório ausente ou ilegível`);
    return null;
  }
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

const [
  html,
  main,
  focusLayer,
  focusStyles,
  goldenRoute,
  road,
  environment,
  scene,
  realAssets,
] = await Promise.all([
  read("client/index.html"),
  read("client/src/main.tsx"),
  read("client/src/components/PilotFocusLayer.tsx"),
  read("client/src/styles/pilot-focus.css"),
  read("client/src/game/goldenRouteLayout.ts"),
  read("client/src/game/RoadSystem.ts"),
  read("client/src/game/environmentVisuals.ts"),
  read("client/src/game/scene.ts"),
  read("client/src/game/GltfAssetRuntime.ts"),
]);

if (html !== null) {
  check(
    html.includes(`data-xb-release="${RELEASE}"`),
    `HTML fonte sem marcador ${RELEASE}`
  );
  check(
    html.includes('src="/src/main.tsx"'),
    "HTML fonte não inicia pelo React"
  );
  check(!OVERLAY_PATTERN.test(html), "HTML fonte carrega adaptador externo");
}
if (main !== null) {
  // O nome do worker sai do próprio registro, não de um literal congelado aqui:
  // o gate precisa reprovar quando o arquivo some, não quando o nome muda.
  const workerUrl = main.match(/register\("(\/[^"]+\.js)"/)?.[1] ?? null;
  check(workerUrl !== null, "Aplicação não registra service worker");
  if (workerUrl !== null) {
    const workerFile = path.join("client", "public", path.basename(workerUrl));
    check(
      (await read(workerFile)) !== null,
      `Worker registrado (${workerUrl}) não existe em client/public`
    );
  }
}
if (focusLayer !== null) {
  check(
    focusLayer.includes('data-xb-hud="golden-route"'),
    "HUD React não declara a Rota Ouro"
  );
  check(
    !/document\.|querySelector|MutationObserver|setInterval/.test(focusLayer),
    "HUD Focus lê ou observa o DOM"
  );
}
if (focusStyles !== null) {
  check(
    focusStyles.includes('[data-xb-hud="golden-route"]'),
    "CSS de baixa obstrução ausente"
  );
}
if (goldenRoute !== null) {
  check(
    goldenRoute.includes("goldenRouteCenterline"),
    "Linha central canônica ausente"
  );
  check(
    goldenRoute.includes("GOLDEN_ROUTE_MODULE_SEQUENCE"),
    "Módulos canônicos ausentes"
  );
}
if (road !== null) {
  check(road.includes("getCameraCue"), "RoadSystem não expõe cue de câmera");
  check(
    road.includes("neighborhoodCurvePose"),
    "RoadSystem não aplica a Rota Ouro"
  );
  check(
    !/getMeshByName|getTransformNodeByName/.test(road),
    "RoadSystem busca objetos por nome"
  );
}
if (environment !== null) {
  check(
    environment.includes("createCommercialFacade"),
    "Comércio nativo ausente"
  );
  check(environment.includes("createGarage"), "Garagem nativa ausente");
  check(
    environment.includes("createDestinationMarker"),
    "Destino XB nativo ausente"
  );
}
if (scene !== null) {
  // Os globais só existiam para os adaptadores lerem a cena de fora. Sem eles,
  // não há como um overlay externo voltar a se enxertar no runtime.
  check(
    !/__XB_GAME_SCENE__|__XB_GAME_WORLD__/.test(scene),
    "scene.ts publica globais de compatibilidade"
  );
  check(
    scene.includes("installGltfAssets(scene, world)"),
    "scene.ts não ativa assets reais"
  );
}
if (realAssets !== null) {
  check(
    realAssets.includes("export async function installGltfAssets"),
    "Carregador tipado de assets reais ausente"
  );
  check(
    realAssets.includes("/assets/glb/"),
    "Fonte não consome o pacote FBX convertido"
  );
  // A pista preta da 3.1 tinha uma causa só: o carregador descartava os
  // materiais que vêm no arquivo e colava o material escuro do jogo por cima.
  // Reatribuir material a uma malha carregada é proibido por regra.
  check(
    !/\.material\s*=/.test(realAssets),
    "Carregador reatribui material de malha carregada (foi o que deixou a pista preta)"
  );
  // O entregador não pode se prender a um nó que o jogo reconstrói: preso ao
  // "driver-rig" ele era descartado junto na troca de veículo e sumia da tela.
  check(
    realAssets.includes('getTransformNodeByName("player-vehicle")'),
    "Entregador não está ancorado num nó que sobrevive à troca de veículo"
  );
  check(
    !/__XB_GAME_SCENE__|__XB_GAME_WORLD__/.test(realAssets),
    "Fonte de assets reais depende de globais de compatibilidade"
  );
}

// A distribuição não pode mais conter nenhum adaptador aposentado: eles eram a
// camada que remendava o bundle 2.8 congelado e agora saíram do repositório.
async function scanForOverlays(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    failures.push(`${directory}: distribuição ausente; rode a build antes`);
    return;
  }
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await scanForOverlays(full);
      continue;
    }
    if (OVERLAY_PATTERN.test(entry.name)) {
      failures.push(`${full}: adaptador aposentado ainda distribuído`);
    }
  }
}

await scanForOverlays(path.join("dist", "public"));

if (failures.length > 0) {
  console.error("ARCHITECTURE_FAIL");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("ARCHITECTURE_OK");

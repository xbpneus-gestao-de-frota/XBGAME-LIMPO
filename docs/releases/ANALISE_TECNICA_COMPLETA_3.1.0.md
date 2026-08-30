# Análise técnica completa — XBPNEUS Racing 3.1.0

Auditoria de código integral do pacote `XBPNEUS_RACING_3.1.0_ASSETS_REAIS_COMPLETO`.
Data: 25/08/2026. Ambiente verificado: Node v22.23.2, sem `node_modules` instalado.

**Escopo lido:** 100% de `client/src` (12 componentes React, 21 módulos de jogo, ~11.900 linhas),
`server/`, `security/`, `scripts/`, `tests/` (15 arquivos), `dist/public/assets/*.js` (6 camadas
adaptadoras), 7 service workers, `.github/workflows`, `render.yaml` e toda a documentação de release.
Total: ~25.000 linhas de código-fonte + 877 arquivos de asset originais.

**Método:** leitura integral, execução real das suítes de teste e dos gates de release na máquina,
verificação empírica do servidor HTTP, comparação byte a byte de `dist/` entre as releases 2.9 / 3.0 /
3.1, e simulação da cadeia de build. Nenhum achado abaixo é especulativo — todos foram confirmados no
código ou por execução.

---

## 1. Veredito

O projeto tem um **núcleo de regras de negócio genuinamente bom** — economia, persistência, sanitização
de save e simulação em passo fixo estão entre o melhor que se vê num projeto desse porte. O problema
não é o miolo: é a **cadeia de entrega**.

Três fatos, todos verificados:

1. `pnpm verify` — o portão oficial de release, usado pelo CI e pelo deploy no Render — **é logicamente
   impossível de passar**. Não é um bug intermitente: é um deadlock estrutural.
2. O jogo que o jogador executa (`dist/`) **não é gerado por este código-fonte**. O bundle compilado tem
   hash SHA-256 idêntico nas releases 2.9.0, 3.0.0 e 3.1.0 — está congelado. As novidades de três
   releases foram reimplementadas à mão em camadas de JavaScript avulso.
3. Os adaptadores dessa distribuição dependem de variáveis globais (`__XB_GAME_SCENE__`,
   `__XB_GAME_WORLD__`) que **o próprio gate de release proíbe a fonte de publicar**. Ou seja: no dia em
   que a build real funcionar, ela quebra a distribuição.

Consequência prática: **correções feitas no código-fonte não chegam ao jogador**, e o conjunto de
verificações reporta verde enquanto 5 das 8 suítes de teste estão vermelhas no disco.

| Situação | Status verificado |
| --- | --- |
| `node --test security/*.test.mjs` | 4/4 ✅ |
| `node scripts/release-check.mjs` | ✅ "1214 arquivos, nenhum segredo detectado" |
| `node scripts/runtime-overlay-check.mjs` | ✅ `ARCHITECTURE_3_1_OK` |
| `node scripts/source-integrity-check.mjs` | ✅ `SOURCE_INTEGRITY_OK` |
| `node --test tests/game/v25-release.test.mjs` | ❌ 3 de 6 falham |
| `node --test tests/game/v26-pilot-fusion.test.mjs` | ❌ 3 de 6 falham |
| `node --test tests/game/v27-hud-focus.test.mjs` | ❌ 4 de 7 falham |
| `node --test tests/game/v24, v28, v29, v30` | ❌ abortam (`MODULE_NOT_FOUND`) |
| `node --test tests/game/v31-real-assets.test.mjs` | ✅ 3/3 |
| `pnpm verify` | ❌ impossível de passar (ver P0-1) |

---

## 2. O que o projeto é

Jogo 3D de estratégia logística para navegador, single-player, offline-first, sem backend e sem contas
de usuário.

```
React 19 (telas, HUD, acessibilidade)
   └─ GameCanvas.tsx ──► GameWorld.ts ──► CampaignStore (GameState.ts)  ← autoridade de regras
                            │                    └─ progression / operations / rewards / missions
                            └─ Babylon.js 9.20 ──► RoadSystem / PlayerVehicle / environmentVisuals
Persistência: localStorage, envelope versão 3, com migração e sanitização
Servidor: Node puro (sem Express), serve dist/public + /healthz
```

A decisão arquitetural central — **regras econômicas em módulos TypeScript puros, testáveis sem WebGL**
— está correta e é a razão de a cobertura de testes do miolo ser boa.

**Stack:** React 19.2, Babylon.js 9.20, Vite 7.3, TypeScript 5.6 (`strict: true`), Vitest 4.1, pnpm
10.15, Node 22.18 fixado. Tailwind v4 está instalado mas **não é usado** (zero utility classes em todo
`client/src`) — carrega no build apenas para fornecer o reset CSS.

---

## 3. Pontos fortes (não regredir)

Vale registrar explicitamente, porque são raros:

- **`CampaignStore` como autoridade única.** Todo o dinheiro, pré-requisito e progressão passa por uma
  classe só. Não há regra econômica duplicada na UI.
- **Retrato imutável de contrato.** O custo é reservado no despacho e o plano vira um snapshot: melhorar
  um edifício no meio de uma entrega não altera retroativamente o contrato já em voo. Isso está testado.
- **Sanitização de save excepcional.** `sanitize()` / `sanitizeDeliveries` / `sanitizePilotedPlan`
  (~500 linhas) rejeitam save adulterado com rigor real: eras não podem ser puladas (só o prefixo
  contíguo de veículos é aceito), o `conditionAtStart` do plano tem que bater com a condição atual do
  pneu, a soma do detalhamento de custo tem que fechar com o total, contratos duplicados por rota ou por
  unidade são eliminados, e o tempo decorrido de uma rota restaurada só pode aumentar. É anti-cheat de
  verdade, não decorativo.
- **Passo fixo de simulação a 60 Hz** com acumulador e clamp de delta longo — distância, pontuação e
  tempo ficam idênticos a 30, 60 ou 120 FPS. Há teste que prova isso.
- **Falha de `localStorage` nunca derruba a sessão** (modo privado, cota cheia, storage bloqueado).
- **Materiais PBR compartilhados, instanciamento de cenário e batching por material** na pista — há
  preocupação real com custo de GPU.
- **Presets gráficos desacoplados do DOM** e testáveis.
- **Nenhum segredo na árvore.** Varredura completa com padrões AWS / GCP / Slack / Stripe / GitHub /
  JWT / chave privada / URL de banco: zero achados.
- **Sem path traversal no servidor.** 17 classes de payload testadas contra o servidor rodando
  (`../`, `%2e%2e`, duplo encoding, byte nulo, separador Windows): todas contidas.
- **Acessibilidade levada a sério** onde foi feita: `role="tablist"` com navegação por setas/Home/End,
  `radiogroup` correto, armadilhas de foco em diálogos, `prefers-reduced-motion`.

---

## 4. P0 — Bloqueadores

### P0-1 · `pnpm verify` é logicamente impossível de passar

**Arquivos:** `vite.config.ts:18-19`, `package.json:14,16`, `scripts/release-check.mjs:114-145`,
`.github/workflows/ci.yml:43`, `render.yaml:6`

O deadlock, em três linhas:

- `vite build` tem `outDir: dist/public` com `emptyOutDir: true` → **apaga `dist/public` inteiro** e
  regenera `index.html` a partir de `client/index.html`.
- `release-check.mjs:119-121` **proíbe** que `client/index.html` contenha os overlays
  (`v250-runtime|v270-hud-focus|v280-neighborhood|v300-golden-route|v310-real-assets`).
- `release-check.mjs:134,137,140` **exige** que `dist/public/index.html` contenha
  `data-xb-build="compatibility-2.8-bundle-v310-real-assets"`, `/assets/v300-golden-route.js` e
  `/assets/v310-real-assets.js`.

Não existe passo de pós-processamento do HTML (`copy-standalone-server.mjs` só copia o servidor; os
plugins Vite são apenas `react()` e `tailwindcss()`). Verificado: `client/index.html` carrega
**um** script (`/src/main.tsx`); `dist/public/index.html` carrega **oito** recursos.

Pior: `v300-golden-route.js` e `.css` existem **apenas** em `dist/public/assets`, nunca em
`client/public/assets`. O build os apaga e não os regenera; `release-check.mjs:146` faz `readFile` deles
**sem try/catch**, em top-level await → `ENOENT` cru.

**Consequência:** o job `verify` do GitHub Actions e o `buildCommand` do Render falham em toda execução
limpa. Ou o CI nunca rodou verde, ou rodou sobre uma árvore em que `dist/` foi restaurado à mão depois
do build — o que significa que **o gate valida um artefato diferente do que o build produziu**.

### P0-2 · O jogo entregue não é gerado por este código-fonte

**Evidências independentes, todas verificadas:**

1. **Bundle congelado.** `index-v230bair.js`, `scene-v230bair.js`, `engine-v230bair.js` e
   `index-v230bair.css` têm SHA-256 **idêntico** em `SHA256SUMS_2.9.0.txt`, `3.0.0.txt` e `3.1.0.txt`.
   Exemplo: `index-v230bair.js` = `1bed4355…bc42` nas três. Um `vite build` real produziria hash
   variável (não há `rollupOptions.output.entryFileNames`). O sufixo `v230bair` é literal fixo da linha
   2.3.0.
2. **Contrato arquitetural invertido.** Os adaptadores leem `globalThis.__XB_GAME_SCENE__` e
   `__XB_GAME_WORLD__` (`v300-golden-route.js:421-422`, `v310-real-assets.js:275-276`). Esses globais
   existem em `scene-v230bair.js` e **não existem** em `client/src` — e
   `runtime-overlay-check.mjs:60-63` **reprova a release se a fonte publicá-los**.
3. **`dist/` está no `.gitignore`** (linha 6). O artefato que o jogador executa não tem histórico, não
   é revisável em PR, não tem rollback e não é reproduzível.

**Deriva medida.** 10 de 143 literais de interface da fonte não existem no bundle entregue — e são
justamente os que importam. `LiveMinimap.tsx` (118 linhas), `DeliverySequence.tsx` (62) e
`PilotFocusLayer.tsx` (130) **não existem no jogo entregue**: são reimplementações em JS puro dentro de
`v250-runtime.js` e `v270-hud-focus.js`. Idem o detalhamento de recompensa 2.9, a Rota Ouro 3.0 e o
`RealAssetRuntime` 3.1.

**Divergências numéricas já materializadas:**

| Comportamento | Fonte (testada) | `dist/` (executada) |
| --- | --- | --- |
| Velocímetro | `base × (1 + (nível−1)·0,05) × (0,82 + condição/100 · 0,18)` | tabela constante |
| → bicicleta nv.1, pneu 20% | **22 km/h** | 26 km/h |
| → bicicleta nv.5, pneu 100% | **31 km/h** | 26 km/h |
| Fase "approach" | 0,74 | 0,70 |
| Fase "stopping" | 0,82 | 0,80 |
| Fase "unloading" | 0,86 | 0,85 |
| Fase "handoff" | 0,91 | 0,90 |
| Troca de faixa com jogo pausado | **bloqueada** (`operations.test.ts:161`) | **aceita** (`v270:245-251`) |

O primeiro item é grave em termos de design: o laço central do jogo é *evoluir pneu → andar mais
rápido*, e **no build entregue o velocímetro não reage a nenhum upgrade**. Derivada zero, erro de até 19%.

O teste `v24-core.test.mjs:61-69` amostra as fases em 0,75 / 0,83 / 0,88 / 0,93 / 0,975 — **todos os
cinco pontos caem fora das janelas divergentes**, então o teste passa nos dois modelos e é
estruturalmente incapaz de detectar a diferença.

Sete constantes/algoritmos estão duplicados literalmente entre TypeScript e os adaptadores
(`VIRTUAL_LENGTH`, `MODULES`, `cameraScaleForAspect`, `centerline`, `XB_CITY_ROUTE`, `STAGES`,
`VEHICLE_SPEED_KMH`). **Dois dos sete já divergiram em silêncio.** Não há geração automática nem teste
de equivalência.

### P0-3 · Falso verde total no conjunto de verificação

**Execução real nesta máquina:**

| Suíte | pass | fail | Causa |
| --- | --- | --- | --- |
| `v25-release` | 3 | **3** | `pkg.version` esperado `2.8.0`, real `3.1.0` |
| `v26-pilot-fusion` | 3 | **3** | idem + `register("/sw-v280.js")` esperado |
| `v27-hud-focus` | 3 | **4** | idem + `data-xb-release="2.8.0"` esperado |
| `v24`, `v28`, `v29`, `v30` | 0 | **1 cada** | `Cannot find module '/opt/nvm/versions/node/v22.16.0/…/typescript.js'` |
| `v31-real-assets` | 3 | 0 | — |

Três mecanismos independentes produzem o falso verde:

1. **Separação de caminhos.** `verify:offline` executa apenas `v24`, `v30` e `v31` — as suítes
   atualizadas. As cinco quebradas ficaram no repositório e foram retiradas do gate.
2. **Verificação sintática travestida de semântica.** `verify-offline-release.mjs:19-44` valida os
   bundles com `node --check` — só *parsing*. As únicas checagens de conteúdo são três regexes negativas
   contra código minificado, que dependem dos **nomes de variáveis que o minificador escolheu**.
3. **Nenhuma asserção fonte↔distribuição.** Nenhum script compara `dist/` com `client/src`. Pelo
   contrário: `release-check.mjs:143-145` **reprova a release se a distribuição convergir para a fonte**.

**Cenários de falso verde alcançáveis hoje:** quebrar `GameCanvas.tsx` a ponto de a tela ficar preta
passa em tudo (`source-integrity-check.mjs:9-17` só conta ocorrências de uma linha de `useState`;
`typescript-syntax-check.mjs` só verifica sintaxe). Qualquer correção em `RoadSystem.ts` (1.442 linhas),
`environmentVisuals.ts` (1.333) ou nos componentes React (3.976) não é executada por teste nenhum.

**E a recíproca:** o gate reporta **falha** com o jogo perfeitamente funcional, porque `pnpm test` é
vermelho por causa de números de versão dentro de strings. Nenhum dos dois sinais informa nada sobre o
produto.

---

## 5. P1 — Alto

### P1-1 · O merge de geometria engole o bairro e quebra o controle de cenário
`RoadSystem.ts:659-705` · `environmentVisuals.ts:257,613-669,856-859`

`environmentVisuals.registerSegment(segment, index)` é chamado na linha 574; `mergeSegmentGeometry` na
659, **depois**. O filtro do merge exclui apenas nomes iniciados por `scenery-` e `urban-`, mas
`getChildMeshes(false)` percorre **todos os descendentes** — inclusive os `neighborhood-*` criados pelo
`environmentVisuals` sob raízes próprias. `Mesh.MergeMeshes(..., disposeSource=true)` destrói os
originais e reparenta o resultado ao **segmento**, fora da raiz `neighborhood-*`.

Verificado no parque (segmento 5): gramado + 2 copas compartilham `sceneryFoliageMaterial` (3 meshes);
2 troncos + banco compartilham `sceneryWoodMaterial` (3 meshes). Ambos os grupos são fundidos e
descartados. Sobra apenas `neighborhood-park-path-5` sob a raiz.

**Falha observável:** `setTheme` faz `feature.root.setEnabled(terrain === "urban")`, mas a raiz está
praticamente vazia. Em rota de caminhão / frota / planetária aparecem **gramado e árvores de parque
flutuando no espaço**. No segmento 2 (ponto de ônibus), idem: teto, placa e postes sem plataforma.

### P1-2 · A pista procedural não é escondida quando a rua FBX real entra
`RealAssetRuntime.ts:192-197`

A lista `legacy` é montada por regex sobre nomes
(`/^(?:asphalt|urban-curb|gravel-shoulder|drainage|lane|edge)-/`) **depois** que o merge já destruiu
esses meshes. Verificado por segmento: 6 `lane-*` + 2 `edge-*` compartilham `lineMaterial` → fundidos;
2 `gravel-shoulder-*` (gravelMaterial) → fundidos; 2 `drainage-*` (darkMaterial) → fundidos;
2 `urban-curb-*` → fundidos por `mergeUrbanDecorGeometry`. **Sobra só `asphalt-0..8`.**

**Falha observável:** bicicleta selecionada (veículo padrão, custo 0) + pacote real carregado → asfalto
e faixas FBX desenham em `y=0.055` enquanto as faixas procedurais continuam em `y=0.069` e as bordas em
`y=0.071`. **Faixas duplicadas com z-fighting e meio-fio duplicado em toda a pista**, exatamente na
experiência inicial do jogo.

### P1-3 · Carga de assets sem ciclo de vida
`scene.ts:127` · `RealAssetRuntime.ts:257-326`

`void installRealAssets(scene, world)` é fire-and-forget: sem `AbortController` nos dois `fetch`, sem
checagem de `scene.isDisposed`, e o observable da linha 272 **nunca é removido**.

**Falha:** `GameCanvas.tsx:1373-1380` derruba a engine após 12 s de timeout. Em 3G o `assets.bin` de
**4,77 MB** ainda está em voo; ao resolver, `installCourier` executa `new Mesh(...)` sobre engine
destruída → exceção engolida pelo `catch` da linha 322, e o `ArrayBuffer` de 4,77 MB permanece
alcançável no closure. Nenhum caminho de erro informa a UI.

### P1-4 · Clone JSON profundo do save no laço de render e no passo de simulação
`GameState.ts:273,329-332` · `GameWorld.ts:156-171,494,600,617` · `RealAssetRuntime.ts:272`

`CampaignStore.value` faz `JSON.parse(JSON.stringify(state))` da campanha inteira (missões, entregas
ativas, operadores, níveis, plano da rota em voo). Esse getter é chamado:

- **60×/s** pelo observable de `RealAssetRuntime` — para ler dois booleanos;
- **1× por passo de simulação** dentro de `stepRun` (60×/s, até 30 num frame de catch-up);
- em `onPickup` e `onObstacle`;
- **10×/s** por `publish()`.

**Falha:** travadas periódicas de GC durante a corrida, sem relação com a complexidade da cena. O preset
"Desempenho" não alivia — o custo é de CPU/JS, não de resolução. Além disso, `value` tem efeito
colateral (`ensureDailyMissions()` pode conceder recompensas e chamar `save()`), o que é um getter impuro
consumido durante o render do React.

No mesmo callback de 60 Hz há ainda: `scene.getTransformNodeByName("driver-rig")` (busca linear),
`scene.meshes.filter()` com **regex por mesh** sobre ~700-800 nós alocando array novo, e
`realRoad.forEach(setEnabled)` sobre 135 meshes — tudo incondicional, mesmo quando a bicicleta nunca é
usada.

### P1-5 · Escrita síncrona em `localStorage` por ação de gameplay
`GameWorld.ts:280,289,297,600,617` · `GameState.ts:2258-2270`

`store.updatePilotedRun()` chama `save()` → `localStorage.setItem(JSON.stringify(state))`, **síncrono**,
a cada troca de faixa, ativação de turbo, coleta de item e impacto — cada um seguido de um `publish()`
com novo clone profundo e re-render de toda a árvore React.

**Falha:** pegar três coletáveis em sequência = três serializações completas do save + três clones + três
re-renders, dentro do mesmo frame.

### P1-6 · Teclado preso ao canvas: os controles morrem em silêncio
`GameWorld.ts:145` · `GameCanvas.tsx:730-734,940-942`

O único `addEventListener("keydown")` está no **elemento canvas**, não em `window`. `RunningHud` foca o
canvas uma vez na montagem e nunca mais; não há handler de `blur` nem refoco.

**Falhas:**
1. Notebook com tela sensível ao toque: o jogador clica no botão DIREITA, o foco vai para o `<button>` e
   setas, A/D, ESPAÇO, P e Esc ficam mortos até ele clicar de novo na pista. Sem nenhum aviso visual.
2. Desktop: apertar Tab durante a corrida move o foco para PAUSAR; as setas passam a rolar a página.
3. **"P" pausa mas "P" não retoma.** Ao pausar, o overlay move o foco para o botão Continuar, fora do
   canvas. Só Esc retoma (tratado pelo `onKeyDown` do diálogo).

Agravante: `.hud-instruction` (o texto que ensina os controles) está `display:none !important` em
`pilot-focus.css:45-47`, e em modo teclado os botões touch também. O jogador de desktop que perde o foco
fica sem nenhuma pista na tela.

### P1-7 · Trabalho de apresentação executado dentro do passo fixo
`GameWorld.ts:544,548,584` · `RoadSystem.ts:190-263` · `environmentVisuals.ts:936-953`

- `road.setRunProgress()` já faz `positionRoadSegments()` + `actors.forEach(...)` +
  `updateDeliveryStop()`; `road.update()` **refaz exatamente as mesmas três coisas** logo depois.
- `camera.setTarget(new Vector3(...))` roda por passo: monta `Matrix.LookAtLH`, inverte a matriz e aloca
  dois `Vector3` internos. Mínimo 60×/s.
- A animação de atmosfera/nuvens roda por passo de simulação, não por frame renderizado.

**Falha:** num engasgo de 500 ms o `fixedStepBudget` libera 30 passos → **60 reposicionamentos completos
num único frame**, 30 `setTarget`, ~90 `Vector3` alocados e 29 matrizes descartadas. Espiral de morte
clássica: quanto mais lento o aparelho, mais trabalho redundante por frame.

### P1-8 · `Cache-Control: immutable, max-age=31536000` em arquivos sem hash de conteúdo
`server/standalone-server.mjs:9,83-85` · `verify-offline-release.mjs:193-202`

`HASHED_ASSET_PATTERN` é heurística sobre a *forma* do nome, não sobre endereçamento por conteúdo.
Verificado empiricamente contra o servidor rodando:

| Arquivo | Cache-Control obtido | É content-hash? |
| --- | --- | --- |
| `index-v230bair.js/.css`, `scene-v230bair.js`, `engine-v230bair.js` | `immutable, 1 ano` | **não** (literal fixo) |
| `v270-hud-focus.js/.css` | `immutable, 1 ano` | **não** (editado à mão) |
| `driver-mascot-v3.webp`, `logo-xb-mark-v3.webp`, `fleet-key-art-v3.webp` | `immutable, 1 ano` | **não** |
| `daily-missions.svg`, `tire-compounds.svg`, +4 SVGs | `immutable, 1 ano` | **não** (regenerados a cada build) |

**Falha:** altere a paleta em `generate-assets.mjs` e publique — quem já visitou continua vendo os SVGs
antigos por até **365 dias**; `immutable` suprime revalidação inclusive em reload forçado. E
`verify-offline-release.mjs:193-202` **exige** o header imutável em `index-v230bair.js`: o gate cimenta
o defeito.

### P1-9 · PWA: clientes antigos ficam presos para sempre
`sw-v250/260/270/280.js:38-47` · `dist/public/assets/v250-runtime.js`, `v270-hud-focus.js`

Os service workers 2.5-2.8 usam cache-first puro, sem revalidação e sem TTL. Seus `APP_SHELL`
pré-cacheiam `/assets/v250-runtime.js` e `/assets/v270-hud-focus.js` — e o
`navigator.serviceWorker.register()` mora **exatamente nesses dois arquivos**.

**Falha:** um cliente que instalou o PWA na 2.7 recebe o `index.html` novo (navegação é network-first),
mas cada `<script src="/assets/v250-runtime.js">` é respondido pelo cache antigo, que **re-registra
`/sw-v250.js`**. Laço de auto-perpetuação: o worker antigo serve o script antigo que reinstala o worker
antigo. O cliente **nunca** alcança o `sw-v310`. Não há `getRegistrations()` nem `.unregister()` em
lugar nenhum da árvore.

`sw-v310.js:41-57` tem a estratégia correta (`skipWaiting` + `clients.claim` + limpeza de caches
antigos) — mas ela só executa quando o v310 ativa, que é precisamente o que não acontece.

### P1-10 · HSTS ausente na produção; a suíte de segurança audita o servidor errado
`server/standalone-server.mjs:17-39` · `server/index.ts:13,37` · `security/config.test.mjs:40-67`

`server/index.ts` envia `Strict-Transport-Security` — mas **não é implantado**: `render.yaml:7` usa
`node dist/standalone-server.mjs`, que **não envia HSTS** (confirmado na resposta ao vivo). Além disso
`server/index.ts:13` ainda declara `RELEASE = "3.0.0"` e aplica `no-store` a `sw-v300.js` enquanto a
aplicação registra `sw-v310.js`.

`security/config.test.mjs` audita justamente esse arquivo morto, e apenas verifica que certas *strings*
existem — nunca parseia a CSP, nunca afirma um valor de diretiva, e **nunca toca em
`standalone-server.mjs`**. Sua asserção sobre a superfície de scripts é feita em `client/index.html`,
um HTML que nenhum jogador carrega; o `dist/public/index.html` real carrega 8 recursos e é isento de
qualquer verificação automatizada de segurança.

### P1-11 · Efeito colateral em fase de render: `previewRoute()` muta o estado do jogo
`BaseScreen.tsx:318-326` · `RoutesScreen.tsx:125-127,317` · `GameState.ts:1233,1483`

`handle.previewRoute(id)` → `prepareRoute(...)` → `refreshUnlocks()`, que faz
`unlockedRegionIds.push(region.id)`. É chamado **durante o render** — inclusive uma vez por card de
contrato renderizado. A mutação não chama `publish()` nem `save()`.

**Falha:** no Centro de Rotas, quando os requisitos de uma nova região passam a ser atendidos, os cards
daquela região já mostram "PILOTAR" habilitado enquanto o nó territorial ao lado continua desenhado como
bloqueado e o painel de requisitos continua visível. Tela autocontraditória por até 1 segundo. Sob
renderização concorrente (React 19), um render descartado ainda deixa a mutação aplicada.

### P1-12 · Zero memoização, e o snapshot torna memoização impossível
`GameCanvas.tsx:1476,1488-1492` · `GameWorld.ts:160,204-207`

Não existe **nenhum** `React.memo` no projeto. Pior: `getSnapshot()` inclui `now: Date.now()` e
`campaign` é um clone novo — **todo campo do snapshot é referencialmente novo em toda emissão**, o que
tornaria qualquer `React.memo` com comparação rasa inútil por construção. O único `useMemo` do
`RoutesScreen` (linha 92) depende de `snapshot.campaign.unlockedRegionIds` e **nunca acerta**.

Na Central com entregas ativas, o `setInterval` de 1 s faz `renderScene()` (que dispara `publish()`)
**e** um segundo `setSnapshot()` — dois clones profundos por tique, re-renderizando as ~90 variáveis
derivadas de `BaseScreen` com o jogador parado.

### P1-13 · HUD legado inteiro renderizado a 10 Hz e escondido por CSS
`GameCanvas.tsx:739,768-931` · `pilot-focus.css:34-67`

`RunningHud` define `data-pilot-focus="active"` **hardcoded**, o que aplica
`visibility:hidden !important` a `.run-context`, `.hud-left-panel`, `.hud-right-panel`, `.hud-bottom` e
`display:none !important` a `.hud-instruction` e ao `DeliverySequence` inteiro.

Ou seja: velocímetro, painel de carga, integridade, progresso da rota e **todo o componente
`DeliverySequence`** são construídos e reconciliados dez vezes por segundo sem nunca aparecer. As mesmas
grandezas são calculadas **duas vezes por frame** (em `RunningHud` e de novo em `PilotFocusLayer`),
incluindo dois `getVehicle()` e duas buscas em `ROUTES`.

**Custo de manutenção real:** um desenvolvedor corrige um valor de telemetria em `RunningHud` e nada
muda na tela, porque o que o jogador vê vem de `PilotFocusLayer`.

---

## 6. P2 — Médio

**Render / 3D**

- `RealAssetRuntime.ts:221-224,302-312` — buffer de posições **12× maior que o necessário** (3,4 MB,
  `updatable: true`) e `updateVerticesData` enviando **285 KB, 12×/s** para um mesh **desabilitado**
  quando o veículo não é a bicicleta.
- `RealAssetRuntime.ts:161-190` — **135 meshes independentes** para 4 geometrias distintas, sem
  `createInstance()` nem `Geometry` compartilhada. Contradiz o esforço de batching feito na pista.
- `RealAssetRuntime.ts:229-231` — se `clone()` retornar `null`, `tuneCourierMaterial` muta o **material
  compartilhado** `mascot-uniform`, deixando o uniforme do mascote branco em toda a frota.
- `goldenRouteLayout.ts:92-94` — o clamp `MAX_YAW = 0.12` diverge do offset lateral na curva central:
  entre 48% e 70% da rota os segmentos ficam deslocados ~3,1 m mas girados menos do que a geometria
  exige → **degraus visíveis nas juntas das placas de pista**. O offset chega a −7,5 m, mais que a
  meia-largura da pista (7,25).
- `environmentVisuals.ts:955-958` — as nuvens **nunca são desabilitadas**: rota orbital/planetária exibe
  nuvens no espaço.
- `scene.ts:62-64` — `ScenePerformancePriority.Intermediate` desliga `autoClear`, tornando
  `scene.clearColor` código morto e permitindo flicker nos primeiros frames.
- `RoadSystem.ts:248-259` — colisão por janela de posição, sem teste varrido. Seguro hoje
  (`movement ≈ 0,75` vs `collisionDepth 1,45`), mas nada amarra os dois valores: aumentar o passo fixo
  ou o multiplicador de turbo faz obstáculos atravessarem sem disparar evento.
- `neighborhoodLayout.ts:22-33` — o seed de rota (`routePhase`, FNV-1a) é calculado, propagado por
  quatro ternários e **nunca usado**. Todas as rotas têm exatamente a mesma curva.
- ~2.500 objetos/s alocados e descartados em poses de segmento e ator (`{offsetX, yaw}`, `{...state}`).
- **Nenhum tratamento de perda de contexto WebGL** em toda a árvore. Em Android, perda de contexto
  congela a canvas com o loop de rAF ainda rodando: tela preta sem mensagem nem recuperação.

**React / UI**

- `ErrorBoundary.tsx:19-21` — `state.error` nunca é lido, não há `componentDidCatch`, nenhum
  `console.error`. Um crash em produção mostra "Parada de segurança" e a stack desaparece.
- `GameCanvas.tsx:1373-1380` — o timeout de 12 s destrói o engine mas **não** remove o listener de
  `resize`, que continua apontando para o engine descartado.
- `GameCanvas.tsx:1505-1506` — `resize` sem throttle: arrastar a borda da janela dispara dezenas de
  realocações de framebuffer WebGL por segundo.
- `GameCanvas.tsx:730-734` — `requestAnimationFrame` sem `cancelAnimationFrame` no cleanup: pode roubar
  o foco do `PauseOverlay` e furar a armadilha de Tab.
- `GameCanvas.tsx:1325` — escrita em ref durante a fase de render (viola pureza exigida pelo React 19).
- `GameCanvas.tsx:1543-1544` — `aria-hidden="true"` é comitado no canvas **enquanto ele ainda detém o
  foco** → aviso do Chrome e janela de inconsistência para leitores de tela.
- `MissionPanel.tsx:87-95` — `aria-modal="true"` num painel lateral sem backdrop: o fundo continua
  clicável e tabulável. O jogador consegue clicar em "PILOTAR" atrás do painel de missões.
- **Sem tratamento de `visibilitychange`**: trocar de aba não pausa a corrida; ao voltar, até 30 passos
  de simulação são resolvidos de uma vez.
- Lógica duplicada digna de extração: `Intl.NumberFormat` declarado **5 vezes**; a armadilha de foco Tab
  copiada **4 vezes** com listas de seletores divergentes; resolução veículo/composto/previsão
  reimplementada em 3 lugares com fallbacks diferentes.

**Servidor / infra**

- `standalone-server.mjs:89-112` — `path.resolve` é léxico e `stat` segue links: **symlink dentro do
  document root escapa do root** (verificado empiricamente: `GET /etcdir/hostname` → 200 com
  `/etc/hostname`). Mitigado na prática por `release-check.mjs:46-64`, que reprova symlinks na árvore.
  Correção: `await fs.realpath(candidate)` + reverificação do prefixo.
- `standalone-server.mjs:124-142` — **`ETag` emitido mas requisições condicionais nunca honradas**
  (verificado: `If-None-Match` com o próprio ETag → 200 + 300 KB). Sem `Last-Modified`, sem
  `Accept-Ranges`. Todos os arquivos em `max-age=3600` são rebaixados integralmente a cada hora:
  ~7,4 MB/h por usuário desperdiçados, incluindo o `assets.bin` de 4,7 MB e o `entregador.png` de 2,5 MB.
- `v310-real-assets.js` / `RealAssetRuntime.ts` — o manifesto é buscado com `cache: "no-cache"` e o
  binário com `cache: "force-cache"`, **sem acoplamento de versão**. Na próxima atualização de assets, um
  cliente pode combinar manifesto novo com binário velho → `RangeError` dentro de `createMesh`, sem
  try/catch no chamador → o loader morre em silêncio com `data-xb-real-assets="loading"` travado.
  Não há validação de `offset + count*4 <= binary.byteLength` nem de alinhamento.
- A proibição de polling dos gates testa apenas `/MutationObserver|setInterval/`. Os adaptadores fazem
  polling via `requestAnimationFrame` recursivo até 900 tentativas (~15 s a 60 fps) e passam. Já o
  `v250-runtime.js:258-270` e `v270-hud-focus.js:256-266` usam `MutationObserver` **mais** `setInterval`
  — e não são verificados por ninguém.
- `release-check.mjs:22-28` — o gate de segredos é uma denylist estreita: não cobre AWS `AKIA…`, Google
  `AIza…`, Slack `xox…`, Stripe `sk_live_`, `_authToken` de `.npmrc`, `postgres://user:pass@…`, nem
  `API_KEY=valor` **sem aspas** — que é exatamente o formato de um arquivo `.env`, o mesmo tipo de
  vazamento que o `SECURITY.md` admite ter ocorrido.
- **Nenhum passo verifica `SHA256SUMS_3.1.0.txt`.** O manifesto de 150 KB com 1.170 hashes é decorativo.
- `pnpm audit --audit-level low` no caminho de build torna o deploy irreprodutível (qualquer advisory
  novo em dependência transitiva reprova um commit intocado) e exige rede em build time. Não faz parte
  de `verify`, então local e CI discordam.
- `typescript-syntax-check.mjs:11-13` faz fallback para um caminho absoluto da máquina do autor
  (`/opt/nvm/versions/node/v22.16.0/...`), fixando 22.16.0 enquanto `.node-version` fixa 22.18.0 — é a
  causa das 4 suítes que abortam. E `transpileModule` só reporta erros de **sintaxe**: `verify:offline`
  passaria com erros de tipo em toda a árvore.
- CSP: **permitiria o jogo rodar hoje** (zero `eval`/`new Function` no bundle; nenhum script inline no
  HTML). Quebra na primeira textura comprimida: `ktxTextureLoader` aponta para
  `https://cdn.babylonjs.com/babylon.ktx2Decoder.js` e `exrTextureLoader` para `https://unpkg.com/fflate`
  — ambos bloqueados por `script-src 'self'`. Latente, mas silencioso quando acontecer.
- `sw-v310.js:77-86` — `cache.put` sem try/catch: um `QuotaExceededError` faz a promise entregue a
  `event.respondWith` rejeitar → o navegador reporta **erro de rede** para o asset em vez de simplesmente
  pular a gravação. `networkFirstNavigation` cacheia cada URL distinta sem limite nem eviction.
- Tabela MIME incompleta: sem `.wasm`, `.mp3`, `.glb`, `.gltf`, `.ktx2`, `.avif`. Com `nosniff`, isso
  **bloqueia por completo** qualquer WASM futuro e qualquer elemento de áudio.
- `standalone-server.mjs:178` — decide 404-vs-SPA com `path.extname()` sobre o pathname **ainda
  percent-encoded**: `GET /foo%2Ejs` → 200 `text/html` em vez de 404.
- `dist/public` embarca **7 service workers** e 2 adaptadores mortos (`v260-pilot-fusion.js`,
  `v280-neighborhood.js`), todos servíveis. O v260 registra `/sw-v260.js` com `scope:"/"`.

**Conversor FBX (Python)**

- `convert_real_fbx_assets.py:99-101` — o skinning lê apenas `Lcl Translation/Rotation/Scaling` e ignora
  `PreRotation`, `RotationPivot`, `GeometricTranslation` etc. `PreRotation` em `LimbNode` é saída padrão
  de Maya e 3ds Max. Funciona para `A_XB_Pedal.fbx` por acaso; **corrompe silenciosamente qualquer outro
  rig** — o que é exatamente o próximo passo declarado do projeto.
- `:274` — normais assadas só do frame 0 e reutilizadas nos 12: a iluminação não acompanha a pedalada.
- `:152` — inventa nomes de material (`XB_Asfalto`, `XB_Guia`…) quando não acha conexões, e o runtime
  roteia material por regex sobre esses nomes: um nome inventado pinta asfalto como calçada, sem erro.
- `:148,247` — só a **primeira** geometria do arquivo é exportada; o resto é descartado sem aviso.
- `test_convert_real_assets.py` — **um único teste, todas as asserções de forma/limiar**. Fazer
  `normals()` retornar zeros, remover a conversão de escala `/100` (modelo 100× maior) ou transpor as
  matrizes de skinning: **todas as asserções continuam passando**.

---

## 7. P3 — Baixo

- Asset morto de **2,59 MB** distribuído: `real-v310/entregador.png` está no manifesto e não é lido por
  código nenhum.
- `SEGMENT_COUNT = 9` duplicado por cópia manual em `RoadSystem.ts:57` e `RealAssetRuntime.ts:14`;
  idem `PIECE_Z`, `LANE_MARK_X`, `ROAD_SCALE_X`.
- `RoadSystem.dispose()` não zera `segments`/`actors`/`urbanDecorRoots`;
  `EnvironmentVisuals.dispose()` nunca toca em `neighborhoodFeatures`.
- `quality.ts` — trocar de "Desempenho" para "Qualidade" em runtime reaplica o hardware scaling mas
  **nunca liga o MSAA** até um reload; `matchMedia` lido uma única vez, sem listener de `change`.
- A "aura 6x2" do turbo (~11 meshes: chassi, cabine, para-brisa, carreta, coroa, 6 rodas) é construída e
  exibida para **todos** os veículos, inclusive a bicicleta e a moto.
- `minimapRoutePath()` reconstrói a mesma string constante em toda chamada, 10×/s durante a corrida.
- `dist/public/sw-v290.js` divergente de `client/public/sw-v290.js` (8 entradas extras no `APP_SHELL`);
  nada regenera nem verifica.
- `GET //assets/index-v230bair.js` → 404 (o `//` inicial é interpretado como authority pelo WHATWG URL).
- Sem `server.maxConnections`, `maxRequestsPerSocket` nem limite por IP. Mitigado pelo proxy do Render.
- Documentação desatualizada: `STRUCTURE.md:90` diz que tudo anuncia 3.0.0 e registra `sw-v300.js`;
  `TESTING.md:111,123` ainda documenta a verificação offline "da versão 2.7"/"2.8".

**CSS** — `client/src/index.css` tem 7.372 linhas, 1.015 blocos de regra, 33 `@media` com **12 larguras
de breakpoint distintas** (1100, 1050, 900, 821, 820, 760, 700, 620, 520, 430, 420…), 31 `!important`
(mais 40 em `pilot-focus.css`). É um arquivo append-only carimbado por versão
(`/* v2.2 · ... */`, `/* v2.3 · HUD compacto */`, `/* 2.5.0 — navegação e entrega ao vivo */`): cada
release anexou um bloco no fim em vez de editar a seção do componente. Daí `.hud-right-panel` aparecer
3×, `.result-panel` 3×, `.loading-screen` 4×, e a dependência crescente de `!important`. Seletores mortos
confirmados: `.v250-runtime-stack`, `.v250-map`, `.v250-delivery`, `.v260-fusion-layer`,
`.progression-vehicles`. `prefers-reduced-motion` está fragmentado em 4 blocos separados.

---

## 8. Balanceamento — o fim de jogo é uma parede

Cálculo executado sobre as tabelas reais de `progression.ts`. `MAX_COMPANY_LEVEL = 500`, XP total
necessário = **499.000**. Para cada rota, quantas repetições são necessárias para alcançar o nível da
rota seguinte, usando a melhor rota disponível no trecho:

| Rota | Nível | XP/rota | Duração | XP faltando | Repetições | Horas |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| primeiro-pedal | 1 | 1 | 5 s | 0 | 0 | 0 |
| bairro-expresso | 1 | 2 | 8 s | 4 | 2 | 0,00 |
| mercado-pequeno | 2 | 4 | 15 s | 8 | 2 | 0,01 |
| bairro-distante | 3 | 8 | 30 s | 28 | 4 | 0,03 |
| bh-mesmo-dia | 5 | 55 | 15 s | 720 | 14 | 0,06 |
| anel-urbano | 20 | 72 | 30 s | 344 | 5 | 0,04 |
| triangulo-carga | 24 | 98 | 20 s | 2.016 | 21 | 0,12 |
| serra-segura | 40 | 118 | 24 s | 840 | 8 | 0,05 |
| eixo-sudeste | 45 | 150 | 30 s | 8.680 | 58 | 0,48 |
| rota-industrial | 80 | 178 | 36 s | 1.640 | 10 | 0,10 |
| brasil-norte-sul | 85 | 220 | 42 s | 5.520 | 26 | 0,30 |
| transamazonia-xb | 100 | 260 | 50 s | 8.760 | 34 | 0,47 |
| andes-logistica | 120 | 310 | 58 s | 35.880 | **116** | 1,87 |
| atlantic-bridge | 180 | 380 | 68 s | 31.920 | **84** | 1,59 |
| global-relay | 220 | 480 | 78 s | 83.040 | **173** | 3,75 |
| ponte-lunar | 300 | 620 | 90 s | 64.900 | **105** | 2,63 |
| corredor-ares | 350 | 820 | 110 s | 74.900 | **92** | 2,81 |
| europa-criovault | 400 | 980 | 122 s | 179.800 | **184** | 6,24 |
| **Total** | | | | | | **20,6 h** |

**Leitura:** as primeiras 8 rotas custam ~1 hora somadas — o onboarding é excelente. Depois do nível 120
a curva explode. O último trecho pede **184 repetições da mesma rota de 122 segundos** — 6,2 horas
seguidas do mesmo conteúdo — só para desbloquear o contrato final.

As missões diárias ajudam (`rewardXp = 22 + nível × 5`, 3 por dia → ~6.800 XP/dia no nível 450), mas
isso ainda são **~26 dias corridos** para o último trecho. Não há outra fonte de XP.

**O dinheiro não é o gargalo.** No nível 300 o veículo planetário custa XB$ 39.500 e as rotas daquele
patamar rendem XB$ 13.500-48.000 brutos. Reputação idem (final exige 2.200; as rotas dão 300-650).
**O único gargalo é XP**, e ele é multiplicativo enquanto a recompensa é linear.

**Sugestão:** ou reduzir `MAX_COMPANY_LEVEL` e recalibrar `companyXpRequiredForLevel` (hoje quadrática:
`(L−1)²·2 + (L−1)·2`), ou introduzir fontes de XP que escalem — contratos encadeados, bônus de rota
perfeita em XP (hoje só em créditos), missões semanais. Do jeito que está, o jogo tem ~1 h de conteúdo
novo e ~20 h de repetição.

---

## 9. Cobertura de testes

52 dos ~75 casos `.mjs` são **regex contra os próprios arquivos do repositório** — versão em
`package.json`, string em `README.md`, classe CSS, nome de função. Não executam código. Um refactor de
formatação ou uma troca de minificador quebra o teste sem quebrar o produto; e qualquer bug que não
altere o texto passa. Apenas ~14 de 52 testam comportamento real.

| Módulo | Linhas | Teste | Veredito |
| --- | ---: | --- | --- |
| `GameState.ts` (CampaignStore) | 2.267 | `CampaignStore.test.ts` (21 casos) | **bem coberto** — 23/27 métodos |
| `operations.ts` | 410 | `operations.test.ts` | **bem coberto** |
| `feedback.ts` | 410 | `feedback.test.ts` (9) | **bem coberto** |
| `quality.ts` | 255 | `quality.test.ts` (10) | **bem coberto** |
| `simulation.ts` | 61 | `operations.test.ts` | **bem coberto** (determinismo 30/60/120 FPS) |
| `routeSelection.ts` | 25 | `routeSelection.test.ts` | **bem coberto** |
| `progression.ts` | 1.019 | parcial | **razoável** — 11 de 32 exports |
| `goldenRouteLayout.ts` | 203 | `v30-golden-route` | **razoável** |
| `config.ts` | 224 | indireto | **fino** — `vehicleDisplaySpeedKmh` sem teste direto |
| `missions.ts` | 204 | indireto | **fino** — ciclo de resgate não testado |
| `GameWorld.ts` | 795 | `TurboVisual.test.ts` | **fino** — um único percurso feliz |
| `PlayerVehicle.ts` | 2.001 | `TurboVisual.test.ts` | **fino** — só contrato de turbo |
| `deliveryExperience.ts` / `minimap.ts` / `urbanLayout.ts` | 481 | `v24-core` | **fino** — real, mas cego para a divergência do `dist/` |
| `rewards.ts` / `neighborhood*` | 189 | `v29` / `v28` | **fino** — teste real em suíte morta |
| **`RoadSystem.ts`** | **1.442** | só regex | **SEM TESTE** |
| **`environmentVisuals.ts`** | **1.333** | só regex | **SEM TESTE** |
| **`TurboVisual.ts`** | **443** | nenhuma referência | **SEM TESTE** |
| **`RealAssetRuntime.ts`** | **328** | só regex (o teste funcional exercita o adaptador do `dist/`) | **SEM TESTE** |
| **`components/*.tsx`** | **3.976** | só regex | **SEM TESTE** — impossível no setup atual |

**Cobertura real da lógica de economia/save/progressão: 60-70% dos ramos que importam.** Mas essa
cobertura **vale zero para o jogador**, porque o binário entregue está congelado desde a 2.9 e nenhum
teste executa uma linha dele.

**Lacunas específicas dignas de nota:**

- 4 métodos públicos do `CampaignStore` com **zero** exercício: `selectVehicle`, `upgradeTire`,
  `claimDailyMission` (único caminho de recompensa diária, credita crédito+XP+reputação), `reset`.
- **A costura mais crítica do jogo nunca é testada:** `GameWorld.finishRun()` → `applyRunResult()`.
  `CampaignStore.test.ts:250-266` monta o argumento a partir do próprio `plan` que depois usa como
  oráculo — é tautológico. É por onde entra todo o dinheiro do jogo.
- Não há teste de renderização, integração ou E2E. Nenhum `jsdom`, `@testing-library`, Playwright ou
  Puppeteer no `package.json`: **componentes React são tecnicamente intestáveis** neste setup.
- Save hostil: cobre tipo errado, veículo inexistente, região inventada, nível fora de faixa e entrega
  duplicada (bom). **Não cobre** valor negativo explícito, `Number.MAX_VALUE`, overflow acumulado nem
  `dailyMissions` com `target: 0`. `GameState.ts:1680-1689` aplica `Math.max(0, Math.round(...))` **sem
  teto superior**: um save com `credits: 1e308` é finito e passa intacto.

---

## 10. Plano de ação — na ordem que destrava o resto

**Fase 1 — parar de mentir para si mesmo (1-2 dias)**

1. **Consertar o deadlock do build (P0-1).** Mínimo viável: versionar `v300-golden-route.js` e `.css` em
   `client/public/assets/` e mover a exigência de tags para uma verificação condicional. Enquanto isso
   não sair, CI e deploy são teatro.
2. **Excluir ou corrigir `v25`, `v26`, `v27`, `v28`, `v29`.** São 5 arquivos, ~1.100 linhas, que só
   produzem ruído vermelho. Se o valor é histórico, mover para fora do glob de teste. Um `pnpm test` em
   que ninguém confia torna todos os outros achados invisíveis.
3. **Trocar o fallback de caminho absoluto** em `typescript-syntax-check.mjs` e nos 4 testes que o usam.

**Fase 2 — reconciliar fonte e distribuição (a decisão estratégica)**

4. Rodar `pnpm install --frozen-lockfile` num ambiente com rede e produzir um `dist/` real a partir da
   fonte 3.1. **Este é o item de maior valor do documento inteiro** — sem ele, tudo o que for corrigido
   no código continua não chegando ao jogador. Os adaptadores (`v250`, `v270`, `v300`, `v310`) e o
   contrato `__XB_GAME_SCENE__` devem morrer no mesmo movimento.
5. Versionar `dist/` ou parar de chamá-lo de distribuição.
6. Enquanto os adaptadores existirem: extrair as 7 constantes duplicadas para um JSON gerado, ou no
   mínimo um teste de equivalência entre os dois lados. As divergências do velocímetro e das fases de
   entrega teriam sido pegas no dia em que surgiram.

**Fase 3 — os bugs que o jogador vê (2-3 dias)**

7. Substituir a seleção por nome no merge (P1-1) e no `RealAssetRuntime` (P1-2) por marcação
   estrutural — um `metadata.mergeGroup` atribuído na criação, e um `getLegacyRoadNodes()` no
   `RoadSystem` que devolva os nós reais pós-merge. Resolve os dois de uma vez e permite cobrir com teste.
8. Mover o teclado para `window` com guarda de `<input>` focado, e refocar o canvas ao retomar (P1-6).
   Restaurar a linha de instrução dos controles.
9. Dar ciclo de vida ao `installRealAssets`: handle com `dispose()`, `AbortController`, checagem de
   `scene.isDisposed`, observable guardado para remoção (P1-3). Colocar toda a troca real/legado e a
   animação do entregador atrás de `if (bikeActive)` — mata P1-3, P1-4 parcial e o upload de 3,4 MB/s
   para mesh invisível.

**Fase 4 — performance (2-3 dias)**

10. Trocar `CampaignStore.value` por um getter somente-leitura sem clone para consumo interno, e manter o
    clone só na fronteira com o React (P1-4). Tirar `ensureDailyMissions()` do getter.
11. Debounce do `save()` de gameplay para ~1 s (P1-5).
12. Separar `step` (física) de `render` (câmera, atmosfera, poses): remove a dupla execução
    `setRunProgress`/`update` e tira `setTarget`/`new Vector3` do laço fixo (P1-7). O pior caso de frame
    cai de 60 para 1 passagem de apresentação.
13. Estabilizar o snapshot (remover `now: Date.now()`, congelar referências que não mudaram) e aplicar
    `React.memo` nos componentes de HUD (P1-12). Remover o HUD legado escondido (P1-13).

**Fase 5 — infra e confiança (1-2 dias)**

14. Corrigir o `Cache-Control` (P1-8): `immutable` só para nomes com hash de conteúdo real. Ajustar o
    gate que hoje exige o contrário.
15. Adicionar HSTS ao `standalone-server.mjs` e apontar `security/config.test.mjs` para o servidor que
    de fato roda (P1-10). Honrar `If-None-Match`/`If-Modified-Since` e adicionar `Accept-Ranges`.
16. Publicar um service worker de resgate ou aceitar que clientes PWA anteriores à 2.9 estão perdidos
    (P1-9). No mínimo, documentar.
17. Substituir as proibições por substring (polling, segredos) por asserções de comportamento, e ligar a
    verificação de `SHA256SUMS`.
18. Adicionar `jsdom` + `@testing-library/react` e três testes de fumaça (`App` monta; `GameCanvas`
    renderiza com snapshot nulo; `ErrorBoundary` captura).
19. **Um único teste fechando a costura `GameWorld` → `applyRunResult`.** É o teste de maior retorno por
    linha em todo o projeto.

**Fase 6 — design**

20. Recalibrar a curva de XP (seção 8). Hoje o jogo tem ~1 h de conteúdo novo e ~20 h de repetição.

---

*Documento gerado por auditoria de código integral. Todos os achados foram confirmados por leitura da
fonte ou por execução na máquina; nenhum é especulativo.*

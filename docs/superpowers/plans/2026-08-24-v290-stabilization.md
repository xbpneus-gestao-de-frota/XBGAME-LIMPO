# XBPNEUS Racing 2.9.0 Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Consolidar HUD, bairro, progressão e distribuição em uma única base 2.9.0 testável, preservando o save e o pacote 2.8 original.

**Architecture:** React recebe o HUD diretamente de `GameSnapshot`; Babylon mantém o percurso dentro de `RoadSystem` e os módulos dentro de `EnvironmentVisuals`; regras comerciais ficam em módulos puros. Overlays históricos deixam de participar do boot.

**Tech Stack:** TypeScript 5.6, React 19, Babylon.js 9, Vite 7, Node test runner, service worker e servidor Node.js autônomo.

**Spec:** `docs/superpowers/specs/2026-08-24-v290-stabilization-design.md`

## Global Constraints

- Preservar o ZIP 2.8.0 original e trabalhar somente na cópia isolada.
- Não alterar `CAMPAIGN_SAVE_VERSION = 3`.
- Não importar `.uasset` para o runtime web.
- Não usar `MutationObserver`, polling de DOM ou globais de depuração para funcionalidades de produção.
- Toda mudança comportamental começa por teste que falha.
- Sem dependências novas.
- Sem alegar build limpa se o Vite não puder ser executado com as dependências reais.

---

### Task 1: Contrato offline 2.9.0

**Files:**
- Create: `tests/game/v29-stabilization.test.mjs`
- Create: `scripts/run-v29-offline-tests.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: arquivos fonte existentes e o transpilador TypeScript global usado pelos testes offline.
- Produces: comando `npm run test:v29:offline` e contrato verificável da versão.

- [x] Escrever testes que exijam versão 2.9.0, ausência dos overlays no HTML, ausência das globais, distância explícita, economia limitada, progressão canônica, mascote sem partes proibidas e cache não imutável para arquivos sem hash.
- [x] Executar o teste e confirmar falhas pelos comportamentos ainda ausentes.
- [x] Adicionar o runner offline 2.9 e o script no `package.json`.
- [x] Manter os testes vermelhos até cada tarefa correspondente ser implementada.

### Task 2: Primeiro quilômetro e economia auditável

**Files:**
- Create: `client/src/game/rewards.ts`
- Modify: `client/src/game/progression.ts`
- Modify: `client/src/game/operations.ts`
- Modify: `client/src/game/GameState.ts`
- Modify: `client/src/game/GameWorld.ts`
- Modify: `client/src/game/types.ts`
- Modify: `client/src/components/BaseScreen.tsx`
- Modify: `client/src/game/missions.ts`
- Modify: `client/src/components/GameCanvas.tsx`

**Interfaces:**
- Produces: `RouteConfig.distanceKm`, `collectibleRewardBreakdown(...)`, campos de detalhamento em `RunResult` e `RunSnapshot.laneIndex`.

- [x] Acrescentar testes puros para distância explícita e bônus de coletáveis.
- [x] Confirmar que o teste da primeira rota falha com 80 km e bônus de 95 XB.
- [x] Adicionar `distanceKm` às 19 rotas e usar o valor em `buildPlan`.
- [x] Implementar bônus por coletáveis com teto de 50% da recompensa-base.
- [x] Registrar base, coletáveis e rota perfeita separadamente no resultado.
- [x] Corrigir Central e objetivos para Pneu Urbano nível 2/XB$ 30 e Mochila nível 3/XB$ 60.
- [x] Executar testes até ficarem verdes.

### Task 3: HUD Focus React

**Files:**
- Create: `client/src/components/PilotFocusLayer.tsx`
- Create: `client/src/styles/pilot-focus.css`
- Modify: `client/src/components/GameCanvas.tsx`
- Modify: `client/src/index.css`
- Modify: `client/src/game/PlayerVehicle.ts`
- Modify: `client/src/game/GameWorld.ts`
- Modify: `client/src/game/types.ts`

**Interfaces:**
- Consumes: `GameSnapshot`, `deliveryExperience`, `vehicleDisplaySpeedKmh`.
- Produces: componente `PilotFocusLayer` sem leitura do DOM e `RunSnapshot.laneIndex` atualizado.

- [x] Escrever teste de contrato que exija o componente e proíba observer/polling no HUD.
- [x] Expor `PlayerVehicle.lane` e sincronizar `run.laneIndex` ao iniciar e mover.
- [x] Implementar `PilotFocusLayer` derivando todos os valores do snapshot.
- [x] Portar o CSS Focus para `client/src/styles` e importá-lo no bundle principal.
- [x] Renderizar o componente dentro de `RunningHud`.
- [x] Executar testes de contrato e TypeScript.

### Task 4: Curvas e bairro dentro do motor

**Files:**
- Create: `client/src/game/neighborhoodRuntime.ts`
- Modify: `client/src/game/neighborhoodLayout.ts`
- Modify: `client/src/game/RoadSystem.ts`
- Modify: `client/src/game/environmentVisuals.ts`
- Modify: `client/src/game/scene.ts`

**Interfaces:**
- Produces: `NeighborhoodPathState`, `resetNeighborhoodPath`, `advanceNeighborhoodPath`, `neighborhoodPoseAt`.
- Consumes: `neighborhoodCurvePose`, `neighborhoodModuleFor`.

- [x] Escrever testes puros de reinício, avanço, fase determinística e pose relativa.
- [x] Integrar o estado ao `RoadSystem`, aplicando pose a segmentos, atores e parada de entrega.
- [x] Criar parques e pontos de ônibus por referências diretas e instâncias em `EnvironmentVisuals`.
- [x] Remover as globais de `scene.ts`.
- [x] Confirmar ausência de busca de mesh por nome e observador extra.

### Task 5: Mascote oficial XB

**Files:**
- Modify: `client/src/game/PlayerVehicle.ts`
- Modify: `tests/game/v29-stabilization.test.mjs`

**Interfaces:**
- Produces: entregador procedural sem nariz, orelhas ou dentes.

- [x] Confirmar teste vermelho para nomes proibidos.
- [x] Remover geometrias de orelhas, nariz e dentes, mantendo olhos e boca simples.
- [x] Executar teste de contrato.

### Task 6: Boot, service worker e cache 2.9

**Files:**
- Create: `client/public/sw-v290.js`
- Modify: `client/index.html`
- Modify: `server/standalone-server.mjs`
- Modify: `scripts/copy-standalone-server.mjs`
- Modify: `scripts/verify-offline-release.mjs`
- Modify: `scripts/release-check.mjs`
- Modify: `render.yaml`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Produces: release `2.9.0`, cache `xbpneus-racing-v290`, `/healthz` 2.9.0.

- [x] Remover referências aos overlays do HTML e registrar somente `sw-v290.js` pela aplicação.
- [x] Implementar precache do shell e limpeza de caches antigos.
- [x] Restringir `immutable` a nomes com hash.
- [x] Atualizar metadados, documentação e verificadores.
- [x] Executar testes HTTP do servidor.

### Task 7: Build compatível, validação visual e pacote

**Files:**
- Modify: `dist/**` somente por build comprovada ou patch de compatibilidade claramente documentado.
- Create: `VALIDACAO_2.9.0.md`
- Create: `RELEASE_MANIFEST_2.9.0.json`
- Create: `SHA256SUMS_2.9.0.txt`

**Interfaces:**
- Produces: pacote ZIP final e evidências reproduzíveis.

- [x] Tentar instalação/build sem rede; registrar o resultado real.
- [x] Se a build limpa for possível, executar `build`, testes e playtest do `dist` novo.
- [x] Se não for possível, manter o bundle 2.8 como distribuição de compatibilidade, atualizar apenas arquivos estáticos seguros e registrar explicitamente que o fonte 2.9 exige recompilação em ambiente com dependências.
- [x] Iniciar o servidor autônomo, verificar `/healthz`, menu, rotas, pilotagem, resultado e mobile.
- [x] Executar toda a suíte offline e segurança.
- [x] Gerar manifesto, checksums e ZIP sem `node_modules`.


## Registro de execução

- Execução concluída em cópia isolada do ZIP 2.8.0; o pacote original permaneceu inalterado.
- Não houve commits porque o arquivo recebido não continha repositório Git.
- A build Vite limpa foi tentada e bloqueada por `ENOTCACHED` em `@babylonjs/core`; a limitação está documentada.
- A distribuição incluída foi mantida como compatibilidade 2.8 com reparos críticos 2.9, sem apresentá-la como build limpa.
- Verificação automatizada, servidor HTTP e playtests desktop/mobile foram concluídos.

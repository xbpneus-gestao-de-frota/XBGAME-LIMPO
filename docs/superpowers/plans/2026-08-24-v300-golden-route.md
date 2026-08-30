# XBPNEUS Racing 3.0 — Rota Ouro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a Rota Ouro urbana 3.0 com percurso canônico, cenário modular enriquecido, câmera/HUD mais legíveis e distribuição compatível verificável.

**Architecture:** Uma função pura em `goldenRouteLayout.ts` define linha central, yaw e sequência modular. Babylon consome essa autoridade em pista, atores, destino, ambiente e câmera; React continua responsável pelo HUD. A distribuição histórica recebe um adaptador v300 isolado, sem contaminar a fonte.

**Tech Stack:** TypeScript, React 19, Babylon.js 9, Vite 7, Node.js test runner, service worker e servidor HTTP Node.

**Spec:** `docs/superpowers/specs/2026-08-24-v300-golden-route-design.md`

## Global Constraints

- Preservar `primeiro-pedal` em `5 segundos`, `1 km` e `XB$ 10`.
- Não alterar o formato do save nem a progressão canônica 2.9.
- Não adicionar dependência externa.
- Não importar FBX ou `.uasset` diretamente no runtime web.
- A fonte não pode carregar `v250-runtime`, `v270-hud-focus`, `v280-neighborhood` ou `v300-golden-route`.
- O adaptador compatível não pode usar `MutationObserver` nem `setInterval`.
- Toda afirmação de funcionamento exige teste executado nesta sessão.

---

### Task 1: Contrato de testes da versão 3.0

**Files:**
- Create: `tests/game/v30-golden-route.test.mjs`
- Create: `scripts/run-v30-offline-tests.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: transpiler TypeScript offline usado por `v29-stabilization.test.mjs`.
- Produces: comando `test:v30:offline` e contrato verificável para as tarefas seguintes.

- [ ] **Step 1: Escrever testes que importam `goldenRouteLayout.ts` e verificam geometria, determinismo, módulos, integração, versão e distribuição.**
- [ ] **Step 2: Executar `node --test tests/game/v30-golden-route.test.mjs` e confirmar falha por ausência do módulo/artefatos 3.0.**
- [ ] **Step 3: Criar o runner que executa v24–v30 e segurança, sem esconder código de saída.**
- [ ] **Step 4: Registrar `test:v30:offline` no `package.json`.**
- [ ] **Step 5: Executar novamente e manter a falha esperada até a implementação das tarefas 2–7.**

### Task 2: Geometria e módulos canônicos da Rota Ouro

**Files:**
- Create: `client/src/game/goldenRouteLayout.ts`
- Modify: `client/src/game/neighborhoodLayout.ts`
- Modify: `client/src/game/neighborhoodRuntime.ts`

**Interfaces:**
- Produces: `GOLDEN_ROUTE_VIRTUAL_LENGTH`, `goldenRouteCenterline(progress)`, `goldenRoutePose(progress, relativeDistance)`, `GOLDEN_ROUTE_MODULE_SEQUENCE`, `goldenRouteModuleFor(index)`.
- Consumes: nenhum objeto Babylon; o módulo permanece puro.

- [ ] **Step 1: Executar apenas os testes de geometria e confirmar falha por módulo inexistente.**
- [ ] **Step 2: Implementar clamp, smoothstep e linha central em seis zonas com extremos aproximados `+4.5` e `-3.0`.**
- [ ] **Step 3: Derivar yaw por amostra à frente e limitá-lo a `±0.12`.**
- [ ] **Step 4: Declarar nove módulos determinísticos com residencial, ônibus, comércio, praça e destino.**
- [ ] **Step 5: Fazer `neighborhoodLayout` delegar pose e módulos à nova autoridade, preservando assinaturas existentes.**
- [ ] **Step 6: Executar os testes de geometria até ficarem verdes.**

### Task 3: Integração de pista, atores, destino e câmera

**Files:**
- Modify: `client/src/game/RoadSystem.ts`
- Modify: `client/src/game/GameWorld.ts`
- Modify: `client/src/game/PlayerVehicle.ts`
- Test: `tests/game/v30-golden-route.test.mjs`

**Interfaces:**
- Consumes: `neighborhoodCurvePose` delegado à Rota Ouro.
- Produces: `RoadSystem.getCameraCue(): { offsetX: number; yaw: number }`.

- [ ] **Step 1: Executar testes de integração e confirmar falha pela ausência de `getCameraCue`.**
- [ ] **Step 2: Expor cue de câmera calculado alguns metros à frente da posição atual.**
- [ ] **Step 3: Aplicar o cue em `GameWorld` por interpolação, mantendo o alvo central e o cue cinematográfico de entrega.**
- [ ] **Step 4: Reduzir as dimensões do baú e da faixa da bicicleta sem alterar colisão do jogador.**
- [ ] **Step 5: Executar testes de integração até ficarem verdes.**

### Task 4: Cenário modular enriquecido

**Files:**
- Modify: `client/src/game/environmentVisuals.ts`
- Modify: `client/src/game/neighborhoodLayout.ts`
- Test: `tests/game/v30-golden-route.test.mjs`

**Interfaces:**
- Consumes: campos `commercial`, `garage`, `destinationEmphasis` dos módulos.
- Produces: fachadas comerciais, garagem, sebes, placa de destino e variações por módulo, reutilizando materiais.

- [ ] **Step 1: Executar teste de módulos e confirmar ausência dos novos campos/constructors.**
- [ ] **Step 2: Adicionar volumes simples de marquise, faixa comercial, garagem e cerca viva aos clusters existentes.**
- [ ] **Step 3: Destacar o último módulo com sinalização XB sem criar atualização por frame.**
- [ ] **Step 4: Ajustar paleta diurna, asfalto/calçada e profundidade atmosférica sem novos materiais por instância.**
- [ ] **Step 5: Executar testes estáticos e de sintaxe TypeScript.**

### Task 5: HUD e proteção do playfield

**Files:**
- Modify: `client/src/components/PilotFocusLayer.tsx`
- Modify: `client/src/styles/pilot-focus.css`
- Modify: `client/src/index.css`
- Test: `tests/game/v30-golden-route.test.mjs`

**Interfaces:**
- Consumes: snapshot existente do modo piloto.
- Produces: HUD compacto com `data-xb-hud="golden-route"` e regras responsivas.

- [ ] **Step 1: Executar teste de HUD e confirmar ausência do marcador 3.0.**
- [ ] **Step 2: Marcar o HUD e reduzir a caixa central a um chip de estágio de baixa altura.**
- [ ] **Step 3: Reorganizar telemetria em desktop e mobile, mantendo controles móveis acessíveis.**
- [ ] **Step 4: Garantir que centro e parte inferior central não recebam painéis persistentes.**
- [ ] **Step 5: Executar testes estáticos e validar ausência de polling/DOM imperativo.**

### Task 6: Adaptador de distribuição compatível

**Files:**
- Create: `dist/public/assets/v300-golden-route.js`
- Create: `dist/public/assets/v300-golden-route.css`
- Modify: `dist/public/index.html`
- Test: `tests/game/v30-golden-route.test.mjs`

**Interfaces:**
- Consumes: `globalThis.__XB_GAME_SCENE__` e `globalThis.__XB_GAME_WORLD__` já expostos pelo bundle histórico.
- Produces: melhoria visual compatível, inicializada por `requestAnimationFrame`, sem observer/polling temporizado.

- [ ] **Step 1: Executar teste do adaptador e confirmar ausência dos arquivos v300.**
- [ ] **Step 2: Criar bootstrap com tentativas limitadas por frame e encerramento seguro quando a cena não existir.**
- [ ] **Step 3: Reutilizar meshes-modelo para fachadas, árvores, parada, praça, colinas e destino, parentando decorações aos segmentos.**
- [ ] **Step 4: Ajustar materiais, luz, fog, câmera e baú por acesso direto à cena; não reconstruir HUD pelo DOM.**
- [ ] **Step 5: Remover `v280-neighborhood.js` do HTML distribuído e carregar JS/CSS v300.**
- [ ] **Step 6: Executar `node --check dist/public/assets/v300-golden-route.js` e testes do adaptador.**

### Task 7: Versão, worker, servidor e documentação

**Files:**
- Modify: `package.json`
- Modify: `client/index.html`
- Modify: `client/src/main.tsx`
- Create: `client/public/sw-v300.js`
- Create: `dist/public/sw-v300.js`
- Modify: `dist/public/index.html`
- Modify: `server/standalone-server.mjs`
- Modify: `dist/standalone-server.mjs`
- Modify: `scripts/verify-offline-release.mjs`
- Modify: `scripts/runtime-overlay-check.mjs`
- Modify: `render.yaml`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Create: `VALIDACAO_3.0.0.md`
- Create: `RELEASE_MANIFEST_3.0.0.json`

**Interfaces:**
- Produces: release `3.0.0`, worker `/sw-v300.js`, marcador `VERIFICACAO_OFFLINE_3_0_OK` e arquitetura `ARCHITECTURE_3_0_OK`.

- [ ] **Step 1: Executar teste de release e confirmar que ainda encontra 2.9.0.**
- [ ] **Step 2: Atualizar todos os marcadores de release e criar worker v300 com descoberta de assets compatíveis mutáveis.**
- [ ] **Step 3: Garantir cache `no-cache, must-revalidate` para HTML, worker e arquivos v300 não hashados.**
- [ ] **Step 4: Atualizar verificadores para testar saúde, CSP, SPA, cache e worker 3.0.**
- [ ] **Step 5: Registrar limitações da build limpa e distinção entre fonte e `dist` compatível.**
- [ ] **Step 6: Executar todos os testes v24–v30 e segurança.**

### Task 8: Playtest, evidências e pacote final

**Files:**
- Create: `evidencias/playtest-v300/*.png`
- Create: `evidencias/VERIFICACAO_OFFLINE_3.0.0.log`
- Create: `SHA256SUMS_3.0.0.txt`
- Create: `/mnt/data/XBPNEUS_RACING_3.0.0_ROTA_OURO.zip`
- Create: `/mnt/data/XBPNEUS_RACING_3.0.0_ROTA_OURO.sha256.txt`

**Interfaces:**
- Consumes: servidor autônomo e distribuição compatível 3.0.
- Produces: pacote final auditável e evidências desktop/mobile, ou registro explícito do bloqueio WebGL.

- [ ] **Step 1: Iniciar servidor em porta isolada e validar `/healthz`.**
- [ ] **Step 2: Executar smoke test desktop e mobile com Chromium/Playwright e capturar menu, corrida e resultado quando WebGL iniciar.**
- [ ] **Step 3: Registrar console, erros de página, dimensões responsivas e métricas de cena disponíveis.**
- [ ] **Step 4: Executar verificação offline completa e salvar o log.**
- [ ] **Step 5: Gerar checksums internos, compactar, extrair em diretório novo e conferir todos os checksums.**
- [ ] **Step 6: Publicar ZIP, checksum e relatório com limitações observadas.**

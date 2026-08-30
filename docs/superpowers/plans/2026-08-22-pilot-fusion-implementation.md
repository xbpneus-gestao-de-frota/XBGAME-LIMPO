# XBPNEUS Racing 2.6 — Modo Piloto Fusion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um ZIP jogável no qual a campanha 2.5 usa a nova apresentação Modo Piloto Fusion sem criar outro motor, outro salvamento ou outra economia.

**Architecture:** Uma camada runtime local (`v260-pilot-fusion.js/.css`) observa o DOM do HUD original, cria somente elementos de apresentação e sincroniza seus valores com os componentes reais. O bundle React/Babylon já compilado permanece a autoridade de estado e comandos.

**Tech Stack:** React 19, TypeScript 5.6, Babylon.js 9.20, JavaScript ES2022, CSS responsivo, Node.js HTTP server, PWA.

**Spec:** `docs/superpowers/specs/2026-08-22-pilot-fusion-design.md`

## Global Constraints

- Um único Babylon Engine e um único canvas.
- Preservar o salvamento `xb-pneus-do-pedal-ao-planeta-v3`.
- Não incorporar o `CampaignStore`, economia ou `GameWorld` do Racing Atlas Fusion.
- Não adicionar dependências npm.
- Não usar ativos remotos nem caminhos privados do ambiente de autoria.
- Compatibilidade de implantação pelo `dist/standalone-server.mjs` e Render.

---

### Task 1: Contrato automatizado da versão 2.6

**Files:**
- Create: `tests/game/v26-pilot-fusion.test.mjs`
- Modify: `scripts/run-v25-offline-tests.mjs`
- Modify: `scripts/verify-offline-release.mjs`

**Interfaces:**
- Consumes: arquivos de runtime, HTML, service worker, pacote e servidor.
- Produces: verificações que falham enquanto a integração 2.6 não existir.

- [ ] **Step 1: Escrever testes que exijam versão 2.6, runtime Fusion, cache PWA e servidor 2.6.**
- [ ] **Step 2: Executar os testes e confirmar falha causada pela ausência da integração.**
- [ ] **Step 3: Manter os testes no executor offline oficial.**

### Task 2: Camada Modo Piloto Fusion

**Files:**
- Create: `client/public/assets/v260-pilot-fusion.js`
- Create: `client/public/assets/v260-pilot-fusion.css`
- Copy: `dist/public/assets/v260-pilot-fusion.js`
- Copy: `dist/public/assets/v260-pilot-fusion.css`
- Modify: `client/index.html`
- Modify: `dist/public/index.html`

**Interfaces:**
- Consumes: `.running-hud`, `.route-chip`, `.hud-score`, `.hud-left-panel`, `.hud-right-panel`, `.route-track`, `.touch-controls`, `.pause-button` e o runtime de entrega 2.5.
- Produces: `data-pilot-fusion="active"`, `.v260-fusion-layer`, `.v260-mission-card`, `.v260-telemetry-card` e sincronização visual sem alterar comandos.

- [ ] **Step 1: Implementar criação idempotente da camada visual e ativação somente em rota.**
- [ ] **Step 2: Sincronizar rota, era, pontuação, velocidade, integridade, Turbo, progresso e fase de entrega.**
- [ ] **Step 3: Encaminhar controles Fusion aos botões reais existentes.**
- [ ] **Step 4: Aplicar layout desktop, tablet, celular e preferência de movimento reduzido.**
- [ ] **Step 5: Executar sintaxe e testes específicos até ficarem verdes.**

### Task 3: Versionamento, PWA e servidor

**Files:**
- Modify: `package.json`
- Create: `client/public/sw-v260.js`
- Copy: `dist/public/sw-v260.js`
- Modify: `client/public/manifest.webmanifest`
- Copy: `dist/public/manifest.webmanifest`
- Modify: `server/standalone-server.mjs`
- Modify: `dist/standalone-server.mjs`
- Modify: `render.yaml`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Create: `VALIDACAO_2.6.0.md`

**Interfaces:**
- Consumes: novos ativos Fusion.
- Produces: release 2.6.0 autônoma, PWA versionada e endpoint `/healthz` coerente.

- [ ] **Step 1: Atualizar metadados para 2.6.0.**
- [ ] **Step 2: Atualizar cache e registro do service worker.**
- [ ] **Step 3: Ajustar cache-control para os novos arquivos.**
- [ ] **Step 4: Verificar servidor e arquivos obrigatórios via HTTP.**

### Task 4: Verificação e empacotamento

**Files:**
- Modify: `scripts/runtime-overlay-check.mjs`
- Modify: `scripts/verify-offline-release.mjs`
- Modify: `TESTING.md`
- Modify: `STRUCTURE.md`

**Interfaces:**
- Consumes: release completa 2.6.0.
- Produces: evidência de testes e ZIP final.

- [ ] **Step 1: Executar a verificação offline completa.**
- [ ] **Step 2: Executar teste HTTP adicional do servidor e dos ativos Fusion.**
- [ ] **Step 3: Conferir referências externas, credenciais e arquivos compactados aninhados.**
- [ ] **Step 4: Gerar SHA-256 e ZIP final.**

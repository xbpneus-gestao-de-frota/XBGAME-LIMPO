# Modo Piloto Gold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Entregar XBPNEUS Racing 2.4.0 com bairro urbano refinado, minimapa funcional, sequência visual de entrega, melhor HUD móvel e pacote validado.

**Architecture:** Criar módulos puros para progressão da entrega, minimapa e lotes urbanos; integrá-los ao React e Babylon.js; manter regras econômicas intactas. Como fallback de build, adicionar uma camada runtime autônoma ao `dist` existente.

**Tech Stack:** React 19.2.1, TypeScript 5.6.3, Babylon.js 9.20.0, Vite 7.3.5, Express 4.21.2, Node.js 22.x.

## Global Constraints

- Não usar amarelo na identidade XB.
- Não copiar dados ou imagens de mapas reais.
- Não alterar economia, progresso, salvamento ou recompensa das rotas.
- Preservar desempenho móvel com instâncias e geometria agrupada.
- Trabalhar somente na cópia isolada da versão 2.4.0.
- Testes de comportamento devem ser escritos e observados falhando antes da implementação.

---

### Task 1: Corrigir a integridade da base

**Files:**
- Modify: `client/src/game/environmentVisuals.ts`
- Modify: `client/src/components/GameCanvas.tsx`
- Test: `scripts/source-integrity-check.mjs`

**Interfaces:**
- Consumes: arquivos TypeScript existentes.
- Produces: verificador `node scripts/source-integrity-check.mjs` com saída não zero para duplicidades críticas.

- [x] **Step 1: Escrever o verificador que falha com as duplicidades atuais**
- [x] **Step 2: Executar e confirmar falha por declaração/configuração duplicada**
- [x] **Step 3: Remover somente as duplicidades detectadas**
- [x] **Step 4: Executar o verificador e confirmar aprovação**
- [x] **Step 5: Commit `fix: restore source integrity`**

### Task 2: Criar o núcleo testável do Modo Piloto Gold

**Files:**
- Create: `tests/game/v24-core.test.mjs`
- Create: `client/src/game/deliveryExperience.ts`
- Create: `client/src/game/minimap.ts`
- Create: `client/src/game/urbanLayout.ts`
- Create: `scripts/run-v24-offline-tests.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `deliveryExperience(progress, paused, completed)`; `minimapRouteSnapshot(progress)`; `urbanLotFor(segmentIndex, side)`.

- [x] **Step 1: Escrever testes para limites, fases, origem/destino, determinismo, implantação acima do solo e paleta sem amarelo**
- [x] **Step 2: Executar e confirmar falha porque os módulos não existem**
- [x] **Step 3: Implementar as três funções com tipos explícitos**
- [x] **Step 4: Executar `node --test tests/game/v24-core.test.mjs` e confirmar aprovação**
- [x] **Step 5: Commit `feat: add pilot gold experience core`**

### Task 3: Refinar o bairro procedural

**Files:**
- Modify: `client/src/game/environmentVisuals.ts`
- Modify: `client/src/game/RoadSystem.ts`
- Test: `tests/game/v24-core.test.mjs`

**Interfaces:**
- Consumes: `urbanLotFor(segmentIndex, side)`.
- Produces: casas estáveis, calçadas, travessias, iluminação e decoração urbana leve.

- [x] **Step 1: Ampliar testes de lotes para todos os segmentos e ambos os lados**
- [x] **Step 2: Executar e confirmar falha para os novos requisitos**
- [x] **Step 3: Integrar lotes determinísticos e adicionar decoração instanciada**
- [x] **Step 4: Adicionar meio-fio, travessias e acessos laterais agrupados por material**
- [x] **Step 5: Executar testes offline e verificação de sintaxe**
- [x] **Step 6: Commit `feat: rebuild the xb urban neighborhood`**

### Task 4: Implementar destino e animação de entrega 3D

**Files:**
- Modify: `client/src/game/RoadSystem.ts`
- Modify: `client/src/game/GameWorld.ts`
- Test: `tests/game/v24-core.test.mjs`

**Interfaces:**
- Consumes: `deliveryExperience(progress, paused, completed)`.
- Produces: `RoadSystem.setRunProgress(progress: number)` e destino animado.

- [x] **Step 1: Escrever teste para sequência e posições de aproximação**
- [x] **Step 2: Executar e confirmar falha**
- [x] **Step 3: Criar destino 3D com fachada, cliente, pacote e marcador XB**
- [x] **Step 4: Atualizar o destino a cada passo de simulação e zerá-lo no reset**
- [x] **Step 5: Executar testes e transpilação de sintaxe**
- [x] **Step 6: Commit `feat: animate the final delivery stop`**

### Task 5: Criar minimapa e sequência de entrega no HUD

**Files:**
- Create: `client/src/components/LiveMinimap.tsx`
- Create: `client/src/components/DeliverySequence.tsx`
- Modify: `client/src/components/GameCanvas.tsx`
- Modify: `client/src/index.css`

**Interfaces:**
- Consumes: `RunSnapshot.progress`, `RunSnapshot.paused`, `minimapRouteSnapshot`, `deliveryExperience`.
- Produces: componentes acessíveis e responsivos sem alterar o estado global.

- [x] **Step 1: Criar testes offline de marcação SVG e rótulos derivados**
- [x] **Step 2: Executar e confirmar falha**
- [x] **Step 3: Implementar os dois componentes**
- [x] **Step 4: Integrar ao HUD e adicionar CSS desktop/mobile/reduced-motion**
- [x] **Step 5: Executar verificação de sintaxe e teste de navegador**
- [x] **Step 6: Commit `feat: add live xb city map and delivery hud`**

### Task 6: Adicionar compatibilidade ao build compilado

**Files:**
- Create: `dist/public/assets/v240-runtime.js`
- Create: `dist/public/assets/v240-runtime.css`
- Modify: `dist/public/index.html`
- Test: `scripts/runtime-overlay-check.mjs`

**Interfaces:**
- Consumes: DOM e `aria-valuenow` do HUD 2.3.0.
- Produces: minimapa e sequência visual atualizados sem React recompilado.

- [x] **Step 1: Escrever verificador que exige assets, referências HTML e seletores resilientes**
- [x] **Step 2: Executar e confirmar falha**
- [x] **Step 3: Implementar overlay com `MutationObserver` e atualização por `requestAnimationFrame` limitada**
- [x] **Step 4: Adicionar estilos responsivos e sem amarelo**
- [x] **Step 5: Servir `dist` localmente e validar desktop e 390 × 844**
- [x] **Step 6: Commit `feat: ship the 2.4 runtime compatibility layer`**

### Task 7: Versão, documentação e pacote final

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Create: `VALIDACAO_2.4.0.md`
- Create: `docs/ARQUITETURA_MODO_PILOTO_GOLD.md`

**Interfaces:**
- Produces: versão 2.4.0 documentada, ZIP e SHA-256.

- [x] **Step 1: Atualizar versão e documentação**
- [x] **Step 2: Executar testes offline, segurança, integridade, release-check e smoke browser**
- [x] **Step 3: Registrar limitações objetivas do ambiente e evidências**
- [x] **Step 4: Gerar prévia PNG, ZIP e SHA-256**
- [x] **Step 5: Verificar conteúdo e hash do ZIP**
- [x] **Step 6: Commit `chore: release xbpneus racing 2.4.0`**


## Registro de execução

Plano executado em 16 de agosto de 2026 na cópia isolada da versão 2.4.0. Foram mantidos commits separados para integridade, núcleo Gold, bairro, entrega 3D, HUD, runtime compatível, câmera e correção móvel. A validação final está em `VALIDACAO_2.4.0.md`.

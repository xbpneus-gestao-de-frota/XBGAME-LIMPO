# XBPNEUS Racing 2.5.0 Release Completo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir um pacote autocontido, jogável e validado do XBPNEUS Racing 2.5.0.

**Architecture:** O build 3D existente permanece como núcleo estável. Uma camada runtime local e versionada corrige HUD/responsividade e acrescenta a animação de entrega. Um servidor Node sem dependências serve o SPA e os ativos com segurança.

**Tech Stack:** React 19, TypeScript, Babylon.js 9.20, JavaScript ESM, CSS, Node.js nativo.

## Global Constraints

- Paleta XB sem amarelo.
- Nenhuma publicação ou alteração em GitHub/Render.
- Nenhuma credencial ou referência obrigatória a armazenamento externo.
- O build distribuído deve iniciar sem `node_modules`.

---

### Task 1: Testes de contrato 2.5
- [ ] Criar testes que falham para versão, runtime, PWA, servidor autônomo e correção móvel.
- [ ] Executar e confirmar as falhas esperadas.

### Task 2: Runtime 2.5 e HUD móvel
- [ ] Implementar minimapa e sequência com animação visual da entrega.
- [ ] Posicionar a pilha móvel com medição real do painel direito.
- [ ] Adicionar acessibilidade e redução de movimento.
- [ ] Executar testes offline.

### Task 3: PWA e servidor autônomo
- [ ] Criar manifest e service worker.
- [ ] Criar servidor Node sem dependências e inicializadores locais.
- [ ] Atualizar HTML, pacote e Render.
- [ ] Executar smoke test HTTP.

### Task 4: Documentação e release
- [ ] Atualizar README, changelog, estrutura e validação.
- [ ] Executar verificações finais e teste visual desktop/mobile.
- [ ] Gerar ZIP e SHA-256.

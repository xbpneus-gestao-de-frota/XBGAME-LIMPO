# Validação — XBPNEUS Racing 2.4.0

## Escopo validado

Esta entrega contém o fonte completo do Modo Piloto Gold e uma camada de compatibilidade aplicada ao build 2.3.0 já compilado. O fonte inclui o novo bairro procedural, destino 3D, entregador, cliente, pacote, câmera cinematográfica, minimapa e sequência operacional. A camada de compatibilidade demonstra o novo HUD no build existente quando ainda não houve recompilação React/Babylon.

As regras econômicas, recompensas, XP, desgaste, salvamento, campanhas, veículos e Turbo Borracha XB não foram alteradas.

## Ambiente disponível

- Sistema de validação: Linux isolado.
- Node disponível: `v22.16.0`.
- Node exigido pelo projeto: `22.18.0`.
- Gerenciador fixado: pnpm `10.15.1` via Corepack.
- Dependências não estavam presentes no ZIP.

A tentativa de `corepack pnpm install --frozen-lockfile` foi executada e falhou antes da instalação porque o ambiente não resolveu `registry.npmjs.org` (`EAI_AGAIN`). Por esse motivo, este relatório não afirma execução de `pnpm verify`, build Vite/esbuild novo ou auditoria online de dependências.

## Evidências automatizadas executadas

| Verificação | Resultado |
| --- | --- |
| Núcleo offline da versão 2.4 | 8 testes aprovados, 0 falhas |
| Segurança e configuração existentes | 4 testes aprovados, 0 falhas |
| Integridade do fonte | `SOURCE_INTEGRITY_OK` |
| Compatibilidade do build existente | `RUNTIME_OVERLAY_OK` |
| Sintaxe do runtime | `node --check` aprovado |
| Tipagem estrita dos módulos puros | `deliveryExperience`, `minimap` e `urbanLayout` aprovados |
| Transpilação dos arquivos TypeScript/TSX alterados | aprovada sem diagnóstico de sintaxe |
| Espaços e conflitos de patch | `git diff --check` aprovado |
| Verificação de distribuição | 172 arquivos, 18 ativos locais, nenhum segredo detectado |
| Integridade do ZIP final extraído | 172 arquivos, teste de compactação e SHA-256 aprovados |
| Smoke HTTP estático do build compatível | `index.html`, runtime JS e runtime CSS servidos e conferidos |

## Teste de navegador do HUD compatível

O runtime foi injetado em um DOM equivalente ao HUD da corrida e executado no Chromium sem erro de página ou console.

| Tela | Resultado |
| --- | --- |
| Desktop `1440 × 900` | minimapa e sequência inteiramente dentro da tela |
| Celular `390 × 844` | painel no lado direito, sem cruzar telemetria, progresso ou controles |
| Atualização de progresso | 76% resultou em “Aproximação”; 94% resultou em “Entrega” |
| Controles móveis | esquerda, direita e Turbo permaneceram dentro da área visível |
| Movimento reduzido | animações decorativas desativadas por media query |

Dimensões observadas no celular: painel Gold `142 × 190,2 px` em `x=237,6`, `y=219,4`; controles `262 × 58 px` em `x=112`, `y=770`.

## Limite entre fonte e build compatível

O ZIP é utilizável imediatamente com o `dist` existente e seu HUD Gold compatível. Entretanto, as seguintes melhorias vivem no fonte e exigem uma build completa para aparecer no executável final:

- lotes urbanos determinísticos e novos elementos 3D;
- ruas laterais, travessias, cercas, caminhos, carros, arbustos e postes;
- destino 3D e animação do entregador com cliente e pacote;
- câmera cinematográfica progressiva;
- componentes React nativos do minimapa e das fases.

Para gerar essa build, executar em ambiente com rede e versões corretas:

```bash
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install --frozen-lockfile
pnpm verify
```

## Conclusão

A versão 2.4.0 está íntegra como pacote de fonte e possui um build de compatibilidade funcional para avaliação imediata do HUD. A validação completa de produção permanece condicionada exclusivamente à instalação das dependências e execução de `pnpm verify` em Node `22.18.0`.

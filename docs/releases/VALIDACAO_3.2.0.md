# Validação técnica — XBPNEUS Racing 3.2.0

Data da validação: 25 de agosto de 2026. Todos os comandos partem da raiz do projeto.

## Resultado executivo

A 3.2.0 fecha a lacuna que definia a 3.1: entre o código-fonte e o que era servido havia um bundle compilado 2.8 e cinco camadas manuais. Agora `dist/` é a saída direta do `vite build` sobre `client/src`, o portão `pnpm verify` roda inteiro pela primeira vez, e a distribuição é conferida hash a hash.

Classificação:

- **GO — código-fonte 3.2:** tipos, formato, testes, arquitetura, segurança e comportamento HTTP aprovados por execução real.
- **GO — distribuição incluída:** gerada da fonte nesta validação, conferida por `SHA256SUMS_3.2.0.txt`, jogada de ponta a ponta em navegador headless sem erro de console.
- **NO-GO — afirmar bicicleta, carros ou árvores reais:** continuam existindo apenas como `.uasset`.
- **NO-GO — declarar homologação móvel:** nenhum aparelho físico foi usado.

## Escopo comprovado

1. `dist/` é uma build Vite real. `dist/public/index.html` carrega `/assets/index-DE-V6CWM.js`, um bundle nomeado por hash de conteúdo, e não referencia nenhum adaptador. Até a 3.1, `dist/public/assets/index-v230bair.js` era o mesmo arquivo nas três releases: SHA-256 `1bed4355...bc42` idêntico em `SHA256SUMS_2.9.0.txt`, `SHA256SUMS_3.0.0.txt` e `SHA256SUMS_3.1.0.txt`.
2. Os adaptadores `v250-runtime`, `v260-pilot-fusion`, `v270-hud-focus`, `v280-neighborhood` e `v310-real-assets` saíram do repositório, junto com as globais `__XB_GAME_SCENE__` e `__XB_GAME_WORLD__`. `scripts/runtime-overlay-check.mjs` varre `dist/public` e reprovaria o reaparecimento de qualquer um.
3. `pnpm verify` executou inteiro, com saída 0: `lint && build && test && dist:integrity && release:check`. Na 3.1 o portão era impossível — `vite build` esvaziava `dist/public` e o `release-check` exigia ali `data-xb-build="compatibility-2.8-bundle-v310-real-assets"`, `/assets/v300-golden-route.js` e `/assets/v310-real-assets.js`, arquivos que a build acabara de apagar.
4. `server/index.ts` foi excluído. `server/standalone-server.mjs` é o único servidor; `express` e `@types/express` não constam mais de `package.json` nem de `pnpm-lock.yaml`.
5. Fusão de geometria por material passa a fundir apenas filhos diretos, e a marca `metadata.xbLayer` sobrevive ao `MergeMeshes`. `tests/game/roadSurface.test.ts` constrói a pista sobre o `NullEngine` e verifica que parques e pontos de ônibus continuam filhos do próprio segmento e que a árvore do parque viaja junto com o asfalto.
6. `RoadSystem.roadSurfaceNodes()` seleciona a pista procedural pela marca estrutural, o que permite escondê-la quando a rua FBX entra em cena.
7. O ouvinte de teclado está na janela, com guarda para campos de texto e para botões e links focados.
8. A linha de instrução dos controles voltou a aparecer no modo teclado; o `display: none !important` que a anulava foi removido de `client/src/styles/pilot-focus.css`.
9. Nuvens deixam de ser desenhadas e de ser animadas em terreno orbital e planetário.
10. Colisão de obstáculos passou a ser varrida entre o quadro anterior e o atual.
11. Perda e restauração de contexto WebGL são tratadas, e aba oculta durante a rota pausa a corrida.
12. `CampaignStore.value` reaproveita o clone; o motor lê por `CampaignStore.current`. A gravação em disco durante a corrida segue apenas o tique de meio segundo. Câmera e reposicionamento de cenário saíram do passo fixo. `React.memo` aplicado aos painéis de HUD, e o HUD legado escondido por CSS saiu do JSX.
13. Servidor: HSTS de um ano com `includeSubDomains`, cache imutável restrito a hash real dentro de `/assets/`, `304` para `If-None-Match` e `If-Modified-Since`, `Last-Modified`, `Accept-Ranges`, `206`, `416`, contenção por `realpath`, decisão 404 × SPA sobre o caminho decodificado, 13 tipos MIME novos e limites de socket.
14. `sw-v250.js` a `sw-v310.js` são lápides autodestrutivas, sem handler `fetch`; `sw-v320.js` é o worker ativo.
15. Curva de XP quadrática apenas até o nível 30. Total ao nível 500: **99.558**, contra **499.000** da curva anterior. Os níveis 1 a 30 são bit a bit os mesmos.
16. Pacote FBX atrás de `?assets=real`, com `installRealAssets` devolvendo um handle com `dispose()`.

## Limites declarados

- A bicicleta, os carros e as árvores foram enviados apenas em `.uasset`, que o navegador não carrega. Mesmo com `?assets=real`, o runtime declara `data-xb-bike-asset="procedural-fallback-no-source-fbx"`.
- O pacote em `assets/real-v310` não foi regerado nesta release e continua declarando `"release": "3.1.0"` no próprio manifesto. O carregador deixou de exigir correspondência de versão e valida apenas o formato `xb-real-assets-v1`.
- O cenário procedural é o padrão porque é o único dos dois que está completo. O pacote FBX cobre a rua e o entregador, e mais nada.
- Casas, árvores e mobiliário continuam sendo arte low-poly provisória. A 3.2 corrige a cadeia de entrega e os defeitos de runtime; não encerra a produção de arte final.
- O mascote raster da tela inicial não foi tocado nesta release.

## Verificações executadas

### Portão completo

```bash
corepack pnpm verify
```

Saída 0. Etapas e resultados observados:

| Etapa | Resultado |
| --- | --- |
| `tsc --noEmit` nos dois projetos | Aprovado |
| Prettier | Todos os arquivos verificados |
| `assets:generate` | 17 SVGs locais recriados |
| `vite build` | Build limpa em 39,43 s, saída em `dist/public` |
| `copy-standalone-server` | `dist/standalone-server.mjs` gerado |
| `dist-integrity --write` | `SHA256SUMS_3.2.0.txt` com **89 arquivos** |
| `vitest run` | **16 arquivos, 110 casos aprovados** |
| `node --test security/*.test.mjs` | **8 aprovados** |
| `dist:integrity` | `DIST_INTEGRITY_OK (89 arquivos conferidos)` |
| `release:check` | 253 arquivos varridos, 18 ativos locais, **0 segredos** |

### Portões estáticos e teste HTTP

```bash
corepack pnpm verify:offline
```

| Verificação | Resultado |
| --- | --- |
| Integridade do código-fonte | `SOURCE_INTEGRITY_OK` |
| Arquitetura sem adaptadores | `ARCHITECTURE_3_2_OK` |
| Sintaxe TypeScript/TSX | `TYPESCRIPT_SYNTAX_OK (39 arquivos)` |
| Testes de segurança | 8/8 |
| Verificação de release | 253 arquivos, 0 segredos |
| Integridade da distribuição | 89 arquivos conferidos |
| Sintaxe de worker e dos dois servidores | Aprovada |
| Servidor autônomo por HTTP | `Servidor autônomo 3.2.0: OK` |
| Marcador final | `VERIFICACAO_OFFLINE_3_2_OK` |

O teste HTTP sobe `dist/standalone-server.mjs` em porta efêmera e confere `/healthz`, HTML com `data-xb-release="3.2.0"` e bundle com hash, os nove cabeçalhos exigidos incluindo HSTS, manifesto, `sw-v320.js` com `no-store`, `sw-v310.js` ainda publicado como lápide, `Accept-Ranges`/`ETag`/`Last-Modified` no pacote binário, `304` para as duas formas condicionais, `206` com `Content-Range` e corpo de 1024 bytes, `404` para script inexistente sem cair no fallback da SPA, `404` para `/assets/nao-existe%2Ejs` e `200` com o shell para `/rota/primeiro-pedal`.

### Playtest em navegador headless

Chromium 1194 em modo headless, rasterização por SwiftShader, servindo `dist/standalone-server.mjs` em porta efêmera. Contexto confirmado: `WebGL 2.0 (OpenGL ES 3.0 Chromium)`.

**Desktop 1440 × 900 — percurso completo**

| Estado | Observado |
| --- | --- |
| Menu | `data-xb-release="3.2.0"`, `data-xb-real-assets="opt-in"` |
| Central | Carregada, sem erro |
| Rotas | 2 contratos pilotáveis disponíveis na campanha nova |
| Corrida 1 — Primeira Entrega XB | HUD ativo, corrida concluída |
| Relatório 1 | **XB$ 10** e **1 km**, como especificado |
| Save após a corrida 1 | `credits: 10`, `deliveries: 1`, `companyXp: 1`, `activePilotedRun: null` |
| Corrida 2 — Giro do Bairro | Iniciada a partir do relatório anterior |
| Teclado com foco fora do canvas | Foco posto em `.pause-button`; `←` e `→` aceitos, corrida não interrompida |
| `P` pausa | Diálogo de pausa aberto, foco em `CONTINUAR` |
| `P` retoma | Corrida retomada com o foco ainda no diálogo — o caso exato que travava na 3.1 |
| Relatório 2 | **XB$ 20** e **2 km** |
| Save após a corrida 2 | `credits: 30`, `deliveries: 2`, `companyXp: 3`, `activePilotedRun: null` |
| Recarga da página | Menu volta com `CAIXA XB$ 30`, `REPUTAÇÃO 10`, `ENTREGAS 2` |
| Erros | `console_errors`, `page_errors` e requisições falhas: **0** |

**Gravação durante a corrida.** Amostrado a cada 600 ms, `activePilotedRun.run.elapsed` no `localStorage` avançou 1,73 → 2,82 → 3,35 → 3,88 e passou a `null` depois da conclusão. A granularidade observada é compatível com o tique de meio segundo, e não com gravação por ação.

**Modo `?assets=real`.** Página carregada com o parâmetro: `data-xb-real-assets="active"`, `data-xb-asset-release="3.2.0"`, `data-xb-road-source="XB_Road_Straight.fbx"`, `data-xb-courier-source="A_XB_Pedal.fbx"`, `data-xb-bike-asset="procedural-fallback-no-source-fbx"`, zero erros de console. Sem o parâmetro, a marca permanece `opt-in` e o cenário procedural é o que aparece.

**Viewport emulada 390 × 844, com toque.** Menu, Central, Rotas, pilotagem e relatório percorridos. Em todos os estados `scrollWidth = clientWidth = 390`: nenhum estouro horizontal. Na pilotagem, `data-v270-input="touch"`, três botões de controle presentes e a linha de instrução oculta, como projetado — no toque os próprios botões ensinam a interação. Zero erros.

### Curva de XP

Números conferidos executando a própria função `companyXpRequiredForLevel` e comparando com a quadrática anterior `2(L-1)² + 2(L-1)`:

| Medida | Antes | Agora |
| --- | --- | --- |
| XP total até o nível 500 | 499.000 | **99.558** |
| XP total até o nível 300 | 179.400 | 44.331 |
| Níveis 1 a 30 | — | idênticos |

A estimativa de esforço foi calculada percorrendo os portões de nível das 19 rotas: para cada rota, o XP necessário entre o nível que a libera e o nível que libera a rota seguinte, dividido pela recompensa daquela rota, multiplicado pela sua duração.

| Medida | Antes | Agora |
| --- | --- | --- |
| Percurso até o contrato final | ~20,6 h de repetição | **~4,4 h** |
| Pior trecho | 184 repetições de `europa-criovault` (nível 400 → 500) | **37 repetições** de `global-relay` (nível 220 → 300) |

Esses dois últimos valores são uma estimativa de modelo, não uma medição de sessão real: assumem repetição da melhor rota disponível em cada trecho, sem coleta, sem bônus e sem despacho automático. O que foi medido diretamente é o XP.

## O que NÃO foi verificado

- **Nenhum teste em hardware móvel real.** A passagem em 390 × 844 é viewport emulada em Chromium desktop. Presets gráficos, vibração, áreas seguras reais e desempenho em GPU móvel continuam sem verificação executada.
- **Nenhum teste de componente React.** Não há arquivo de teste que monte um componente. O ambiente do vitest é `node`, e nem `jsdom` nem `happy-dom` nem `@testing-library` estão nas dependências. Foco, ARIA e armadilha de foco dos diálogos foram exercitados apenas no playtest manual descrito acima.
- **O conversor Python não roda neste pacote.** `scripts/tests/test_convert_real_assets.py` executa `scripts/convert_real_fbx_assets.py` contra `source-assets/original`, diretório ausente deste repositório. Nenhuma afirmação de reexecução do conversor é feita nesta entrega; o pacote já convertido continua coberto pelo lado do carregador, em `tests/game/realAssets.test.ts`.
- **A renderização foi feita por SwiftShader**, um rasterizador de software. O playtest prova que a cena inicia, roda, responde e termina sem erro; não prova desempenho nem fidelidade de imagem em GPU real.
- **Nenhuma inspeção perceptiva por olho humano.** Cor, iluminação, z-fighting residual e legibilidade do HUD continuam exigindo homologação visual no navegador de destino.
- **Nenhuma auditoria de dependências foi executada nesta validação.** `pnpm audit` não faz parte de `pnpm verify` e, na CI, passou a informar sem bloquear.

## Estado de publicação

- **GO** para publicação a partir desta build, desde que servida por HTTPS: o servidor envia HSTS em toda resposta.
- **GO** para uso de `dist/` como distribuição jogável sem instalar dependências.
- **GO** para continuidade do desenvolvimento sobre esta fonte.
- **NO-GO** para afirmar bicicleta, carros ou árvores reais enquanto permanecerem apenas em `.uasset`.
- **NO-GO** para declarar homologação móvel ou de desempenho até haver execução em aparelho físico.
- **Pendente** antes da publicação: homologação visual perceptiva no navegador de destino, e substituição do mascote raster legado da tela inicial.

## Reprodução

```bash
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install --frozen-lockfile
pnpm verify
pnpm verify:offline
```

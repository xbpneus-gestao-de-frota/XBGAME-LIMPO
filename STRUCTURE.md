# Estrutura técnica

## Arquitetura

React controla as telas, a acessibilidade e as ações de gestão. Babylon.js renderiza somente a rota 3D. As regras econômicas e de progressão ficam em módulos TypeScript independentes, o que permite testá-las sem iniciar WebGL.

| Módulo                              | Responsabilidade                                                       |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `components/GameCanvas.tsx`         | Ciclo do motor, telas, pausa, contexto WebGL, erros e taxa de render    |
| `components/PilotFocusLayer.tsx`    | HUD Focus tipado, faixa, telemetria e etapa da entrega                 |
| `components/LiveMinimap.tsx`        | Minimapa SVG da Cidade XB, rota e posição do entregador                 |
| `components/DeliverySequence.tsx`   | Etapas acessíveis da entrega e progresso operacional                    |
| `components/ExperienceSettings.tsx` | Preset gráfico e preferências opcionais de som e vibração              |
| `components/BaseScreen.tsx`         | Central, edifícios, tutorial e entregas ativas                         |
| `components/RoutesScreen.tsx`       | Mapa, requisitos, previsão e escolha entre pilotar/despachar           |
| `components/TireStrategyPanel.tsx`  | Composto, condição e manutenção por veículo                            |
| `components/MissionPanel.tsx`       | Metas diárias, progresso, coleta e bloqueio modal de fundo             |
| `components/useFocusTrap.ts`        | Armadilha de foco e `Escape` únicos para todos os diálogos             |
| `components/format.ts`              | `money` e `formatCredits`: um só formatador pt-BR para toda a interface |
| `game/scene.ts`                     | Criação da cena, contrato público `GameHandle` e opt-in de assets reais |
| `game/GameWorld.ts`                 | Modos, simulação em passo fixo, corrida, câmera, teclado e navegação    |
| `game/deliveryExperience.ts`        | Fases, poses e câmera cinematográfica da entrega final                  |
| `game/minimap.ts`                   | Malha viária fictícia e interpolação top-down da Cidade XB             |
| `game/urbanLayout.ts`               | Lotes e decoração urbana determinísticos, acima do terreno             |
| `game/GameState.ts`                 | Economia, pré-requisitos, reservas, save e migração                    |
| `game/progression.ts`               | Edifícios, territórios, rotas, curva de níveis e custos de melhoria     |
| `game/operations.ts`                | Clima, terreno, compostos, desgaste e custos operacionais              |
| `game/rewards.ts`                   | Contrato-base, coleta, teto de bônus e rota perfeita                    |
| `game/routeSelection.ts`            | Seleção segura da próxima rota pronta ou repetível                      |
| `game/missions.ts`                  | Geração determinística e progresso das missões                         |
| `game/simulation.ts`                | Passo fixo e tradução de tecla em comando de jogo                      |
| `game/PlayerVehicle.ts`             | Seis veículos PBR, mascote procedural, rodas, animação e descarte      |
| `game/TurboVisual.ts`               | Transformação Turbo, pneu vivo, energia e aura 6x2                     |
| `game/RoadSystem.ts`                | Pista reciclada, curvas, atores, props, colisão varrida e sinalização   |
| `game/goldenRouteLayout.ts`         | Linha central, zonas e módulos determinísticos da Rota Ouro             |
| `game/neighborhoodLayout.ts`        | Fachada de compatibilidade sobre o traçado da Rota Ouro                |
| `game/neighborhoodRuntime.ts`       | Compatibilidade de fase e pose com o bairro modular anterior            |
| `game/environmentVisuals.ts`        | Cenário por terreno, atmosfera, clima, instâncias e partículas         |
| `game/RealAssetRuntime.ts`          | Carregador opcional do pacote FBX, com validação e descarte            |
| `game/quality.ts`                   | Detecção, presets gráficos e escala de resolução Babylon               |
| `game/feedback.ts`                  | Áudio sintético e vibração locais, opcionais e persistentes            |

### Métodos públicos acrescentados na 3.2

| Assinatura                                       | Para quê                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `RoadSystem.roadSurfaceNodes(): AbstractMesh[]`   | Devolve os nós de superfície da pista pela marca `metadata.xbLayer`, já fundidos       |
| `RoadSystem.setRunProgress(progress, reposition)` | `reposition = false` avança a pose sem repor segmentos e atores; `update()` faz isso   |
| `CampaignStore.current: CampaignState`            | Leitura interna do motor, sem clone; quem chama não pode mutar o retorno               |
| `GameWorld.roadSurfaceNodes(): AbstractMesh[]`    | Repassa a marcação da pista para quem precisa escondê-la                              |
| `GameWorld.selectedVehicleId: VehicleId`          | Leitura barata por quadro, sem montar um `GameSnapshot`                                |
| `GameWorld.isRunActive: boolean`                  | Corrida em andamento e não pausada, também sem snapshot                                |
| `installRealAssets(scene, world): RealAssetHandle` | Handle com `dispose()`: remove as malhas criadas e religa a pista procedural           |

`CampaignStore.value` continua sendo a cópia defensiva entregue à interface, agora reaproveitada enquanto o estado não muda. `CampaignStore.current` existe para o laço do motor e nunca deve vazar para o React.

## Fluxo de uma operação

1. A interface solicita uma previsão ou início de rota.
2. `CampaignStore` valida região, sequência, nível, veículo livre, pneus e caixa.
3. A operação cria um retrato imutável de duração, recompensa bruta, custos, desgaste e condição.
4. No despacho, o veículo fica reservado até a coleta. Na pilotagem, fica reservado até conclusão ou abandono.
5. O resultado atualiza recursos, missões, condição, região e save em uma única autoridade.

O custo é reservado no início. Alterar um edifício enquanto uma entrega está em andamento não modifica retroativamente o contrato.

`previewRoute` é uma consulta pura: não destrava região, não move crédito e não reserva veículo. Ela roda durante o render do React, e destravar região ali deixava a tela contraditória até o próximo tique.

## Simulação 3D

A corrida usa passo fixo de 1/60 s e limita deltas longos. Distância, pontuação, tempo e movimento permanecem estáveis com render em 30, 45 ou 60 FPS. Fora da corrida, a cena renderiza no máximo um quadro por segundo; contratos automáticos continuam sendo atualizados. A interface entra primeiro e importa o mundo Babylon sob demanda.

Câmera e reposicionamento de cenário são apresentação, não simulação: rodam uma vez por quadro renderizado, fora do laço de passo fixo. Dentro dele, um engasgo produzia dezenas de reposicionamentos e inversões de matriz num único quadro.

A colisão de obstáculos é varrida: compara a posição do ator no quadro anterior e no atual, em vez de testar a posição instantânea. Assim um passo grande, sob Turbo ou depois de uma queda de quadro, não atravessa o obstáculo.

Os veículos expõem largura de colisão própria. Obstáculos e coletáveis também têm largura e profundidade específicas. A frota global e o transportador planetário renderizam as oito rodas declaradas no catálogo. Materiais PBR são compartilhados; somente uma variante de veículo permanece ativa, e cenários repetidos usam instâncias para reduzir meshes e custo de descarte.

Perda de contexto WebGL suspende o laço de render, mostra um aviso em português e oferece recarga; a restauração religa o laço. Quando a aba fica oculta durante uma rota, a corrida é pausada.

### Fusão de geometria e camadas

A mobília da pista é fundida por material para cortar centenas de draw calls. Duas regras tornam isso seguro:

- só filhos **diretos** de um segmento ou de uma raiz de decoração entram na fusão; cenário e bairro vivem sob raízes próprias e precisam continuar independentes para poderem ser ligados e desligados por terreno;
- o que é superfície de pista recebe `metadata.xbLayer = "road-surface"` antes da fusão, e o lote fundido herda a marca.

Sem a primeira regra, parques e pontos de ônibus eram absorvidos pelo lote da pista, saíam do controle do próprio módulo e continuavam visíveis, parados, em rotas não urbanas. Sem a segunda, o nome original desaparecia na fusão e não havia como esconder a pista procedural quando a rua FBX entrava.

## Persistência

O save atual usa um envelope de versão 3 em `localStorage`. A leitura:

- aceita o formato legado;
- ignora IDs desconhecidos;
- limita números e níveis;
- preserva apenas sequências válidas de veículos e regiões;
- elimina contratos duplicados por rota ou veículo;
- cria retratos compatíveis para entregas antigas;
- migra peças, frota de bicicletas, Pontos Operacionais e operadores com defaults seguros;
- restaura a energia e o estado do Turbo de uma rota pilotada sem cobrar novamente;
- volta a uma campanha nova quando o JSON está corrompido, ou ao save anterior válido quando ele existe.

Durante uma corrida, `updatePilotedRun` atualiza a memória a cada passo e só grava em disco quando o laço pede, no tique de meio segundo. Pausa, retomada e descarte gravam imediatamente.

Falhas de leitura, modo privado ou cota cheia não impedem uma sessão; apenas deixam a persistência indisponível naquele navegador.

## Cadeia de build

```text
pnpm build
  assets:generate            recria os 17 SVGs locais
  vite build                 client/src  ->  dist/public (bundles com hash)
  copy-standalone-server     server/standalone-server.mjs -> dist/standalone-server.mjs
  dist-integrity --write     grava SHA256SUMS_3.2.0.txt a partir do que foi gerado
```

Não há etapa manual, adaptador ou bundle congelado entre a fonte e a distribuição. `dist/` é exatamente o que essa cadeia produz.

## Portões

| Portão | Comando | O que reprova |
| --- | --- | --- |
| Tipos e formato | `pnpm lint` | `tsc --noEmit` nos dois projetos e Prettier |
| Testes | `pnpm test` | 110 casos no vitest e 8 testes de segurança no `node:test` |
| Integridade da distribuição | `pnpm dist:integrity` | Hash divergente, arquivo a mais, a menos ou entrada não regular em `dist/` |
| Verificação de release | `pnpm release:check` | Segredo em texto claro, arquivo privado, link simbólico, dependência não fixada, versão fora de 3.2.0, ativo ausente, adaptador aposentado ou lápide de worker que não se desregistra |
| Integridade do fonte | `scripts/source-integrity-check.mjs` | Regressões conhecidas de duplicação e de cenário enterrado |
| Arquitetura | `scripts/runtime-overlay-check.mjs` | Globais de compatibilidade, HUD que lê o DOM, adaptador em `dist/public`, worker errado |
| Sintaxe | `scripts/typescript-syntax-check.mjs` | Erro de sintaxe em qualquer `.ts`/`.tsx` (39 arquivos), sem checagem de tipos |
| HTTP | `pnpm verify:offline` | Cabeçalhos, cache do worker, lápides, 304, 206, 404 sobre caminho decodificado e fallback da SPA |

`pnpm verify` encadeia `lint`, `build`, `test`, `dist:integrity` e `release:check`. A ordem importa: até a 3.1 o verificador de release exigia dentro de `dist/public` arquivos que o `vite build` apagava, e o portão não tinha como passar.

`pnpm verify:offline` não compila nada e não sobe Vite: só roda os portões estáticos e sobe a distribuição já construída. Exige um `dist/` presente e o pacote `typescript` resolvível, usado pelo verificador de sintaxe.

## Cliente e servidor

Vite gera `dist/public`. O build copia `server/standalone-server.mjs` para `dist/standalone-server.mjs`. Esse servidor utiliza apenas módulos nativos do Node.js, portanto a distribuição incluída pode ser executada sem `node_modules`. Não existe segundo servidor: o Express aposentado saiu do repositório e das dependências.

O servidor expõe `/healthz`, entrega arquivos estáticos, devolve a SPA somente para rotas sem extensão e retorna 404 para ativos inexistentes. A decisão entre 404 e SPA usa o caminho já decodificado. A contenção de diretório passa por `realpath`, de modo que um link simbólico dentro da raiz não escapa dela.

Cache: somente arquivos com hash de conteúdo real dentro de `/assets/` recebem `immutable`; `index.html` e todos os service workers usam `no-store`; o manifesto revalida sempre; o resto revalida em uma hora. O servidor publica `ETag` e `Last-Modified`, responde `304` a requisições condicionais, anuncia `Accept-Ranges` e atende faixas com `206` ou `416`.

Cabeçalhos de segurança, incluindo CSP e HSTS, são aplicados em todas as respostas. Há limites de socket para conexões, cabeçalhos e requisição.

Desenvolvimento e preview ficam em loopback. O host público é definido por `HOST` e a porta por `PORT` na plataforma de deploy.

## PWA

`sw-v320.js` é o único worker ativo: pré-cacheia o shell e os caminhos estáveis, serve navegação por rede primeiro com fallback ao shell, serve demais ativos por cache primeiro e ignora requisições com `Range`.

`sw-v250.js` a `sw-v310.js` continuam publicados de propósito, como lápides. Cada um apaga os caches `xbpneus-racing-*`, se desregistra e recarrega as janelas controladas. Sem eles, um cliente PWA preso numa versão antiga jamais sairia dela: os workers originais eram cache-first sem revalidação e pré-cacheavam os próprios scripts que os re-registravam. Nenhuma lápide registra `fetch`, para que a rede volte a ser usada durante a limpeza.

## Fonte consolidada

A fonte inicia por uma única entrada React (`client/src/main.tsx`). O HUD Focus é o componente tipado `components/PilotFocusLayer.tsx`, alimentado diretamente pelo `GameSnapshot`; não consulta a própria tela e não usa `MutationObserver` nem polling.

`game/goldenRouteLayout.ts` é a autoridade geométrica da Rota Ouro. Ele declara a sequência reta inicial, curva à direita, recuperação, curva à esquerda e aproximação final, além dos módulos de residência, comércio, garagem, parque, ponto de ônibus e destino. `game/RoadSystem.ts` aplica a mesma pose à pista, faixas, atores e marco de chegada. `game/GameWorld.ts` consome a indicação de câmera do percurso. `game/environmentVisuals.ts` cria as variações de bairro a partir do mesmo catálogo determinístico.

`game/rewards.ts` separa contrato-base, bônus de coleta e bônus de rota perfeita. `RouteConfig.distanceKm` declara a distância operacional; duração de gameplay não é convertida em quilometragem. O primeiro contrato permanece em 5 segundos, 1 km e XB$ 10.

O teclado é ouvido na janela. `GameWorld.shouldIgnoreKey` devolve o controle a campos de texto e a elementos editáveis, e deixa `Espaço` e `Enter` com o botão ou link focado. Preso ao canvas, o jogo perdia os controles em silêncio ao focar qualquer botão, e `P` não conseguia retomar de uma pausa porque o diálogo levava o foco embora.

## Pacote FBX opcional

```text
client/src/game/RealAssetRuntime.ts          carregador tipado do pacote real
client/public/assets/real-v310/              manifesto, binário e textura extraída
dist/public/assets/real-v310/                mesmo pacote na distribuição
scripts/convert_real_fbx_assets.py           conversor FBX reproduzível
scripts/tests/test_convert_real_assets.py    regressão do conversor
source-assets/original/                      877 arquivos originais preservados
```

O carregador só é acionado com `?assets=real`. Ele valida tipo, alinhamento e limites de cada array do binário contra o manifesto antes de criar qualquer malha, monta o registro de limpeza antes da primeira criação e desfaz o que já entrou na cena se a validação falhar no meio. O handle devolvido descarta as malhas criadas e religa a pista procedural.

A simulação e o save continuam independentes do renderer. O pacote real apenas substitui a apresentação da rua e do entregador quando a bicicleta está selecionada. Falha de carregamento mantém o cenário procedural funcional e marca `data-xb-real-assets="fallback"`.

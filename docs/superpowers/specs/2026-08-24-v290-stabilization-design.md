# XBPNEUS Racing 2.9.0 — Design de Estabilização

## Objetivo

Transformar a versão 2.8.0 em uma base única, auditável e pronta para receber o salto visual da versão 3.0, sem reescrever o jogo nem alterar o núcleo da campanha. A versão 2.9.0 deve retirar as camadas de correção executadas por cima do jogo, corrigir as contradições do primeiro quilômetro e manter um pacote local jogável em desktop e mobile.

## Escopo aprovado

A estabilização cobre cinco frentes conectadas:

1. **Fonte única de verdade:** HUD Focus e bairro modular passam a ser componentes TypeScript/React/Babylon do projeto. Os scripts `v250-runtime.js`, `v270-hud-focus.js` e `v280-neighborhood.js` deixam de ser necessários no HTML de produção.
2. **Primeiro quilômetro coerente:** Pneu Urbano é a primeira melhoria, no nível 2 por XB$ 30; Mochila Pequena vem no nível 3 por XB$ 60. Duração de gameplay deixa de definir a distância comercial da rota.
3. **Economia explicável:** bônus de coletáveis são limitados em função da recompensa-base e aparecem separados no resultado. Uma rota anunciada como XB$ 10 não pode pagar XB$ 104 por um único volume.
4. **Cena modular sem acesso global:** curvas, módulos residenciais, parques e pontos de ônibus são controlados diretamente por `RoadSystem` e `EnvironmentVisuals`, sem `globalThis.__XB_GAME_SCENE__`, busca por nome de mesh ou observador adicional da cena.
5. **Distribuição segura:** versão, service worker e cache HTTP passam a seguir um contrato 2.9.0. Somente arquivos com hash podem receber cache imutável de um ano.

## Não objetivos

- Não adicionar novos veículos, regiões ou sistemas de progressão.
- Não importar diretamente os arquivos `.uasset` do pacote Cartoon City. Eles permanecem como biblioteca artística para uma futura conversão controlada a GLB/glTF.
- Não refazer toda a arquitetura do jogo.
- Não redesenhar todas as telas administrativas.
- Não substituir Babylon.js ou React.

## Arquitetura

### 1. HUD do modo piloto

`RunningHud` continua sendo o contêiner React oficial. Um novo `PilotFocusLayer` recebe dados tipados diretamente de `GameSnapshot` e produz objetivo, velocidade, integridade, turbo, estágio da entrega, faixa e progresso. Ele não lê texto do DOM, não cria elementos imperativamente e não usa `MutationObserver` ou `setInterval`.

A faixa atual passa a fazer parte de `RunSnapshot`. `PlayerVehicle` expõe seu índice de faixa e `GameWorld` sincroniza esse valor ao mover o jogador e ao publicar snapshots.

O CSS Focus sai de `client/public/assets` e passa para `client/src/styles/pilot-focus.css`, importado pela folha principal. O HUD existente permanece no DOM como fonte acessível e como fallback visual, mas os blocos redundantes são ocultados pelo layout Focus durante a pilotagem.

### 2. Percurso e bairro modular

`neighborhoodLayout.ts` permanece responsável apenas por dados e matemática pura. Um pequeno estado de percurso guarda `routeKey`, fase determinística, distância percorrida, progresso e ativação urbana.

`RoadSystem` controla esse estado. A cada passo da simulação:

- avança a distância visual pela mesma movimentação da pista;
- posiciona e gira cada segmento com `neighborhoodCurvePose`;
- posiciona obstáculos/coletáveis a partir de `laneIndex`, sem tentar recuperar a faixa pelo nome ou posição atual;
- mantém o centro da pista próximo ao jogador por usar deslocamento relativo;
- desativa a curva em terrenos não urbanos.

`EnvironmentVisuals` aplica `neighborhoodModuleFor(index)` no momento de registrar o segmento. Casas, árvores, parques e pontos de ônibus são filhos diretos do segmento. Peças repetidas usam as fontes instanciadas já existentes, evitando novos materiais e evitando varreduras em `scene.meshes`.

### 3. Distância e recompensa

Cada `RouteConfig` recebe `distanceKm`. O plano de rota usa esse valor explícito. `routeDistanceKm` permanece apenas como fallback de migração para registros antigos e deixa de converter segundos em dezenas de quilômetros.

Um módulo puro `rewards.ts` calcula:

- bônus por carga;
- bônus por token de pneu;
- teto total de coletáveis;
- bônus de rota perfeita.

O teto é proporcional à recompensa-base, com limites absolutos por veículo. A recompensa-base, os coletáveis e o bônus perfeito são registrados separadamente no `RunResult` e exibidos no resultado.

### 4. Mascote

A construção procedural do entregador deve respeitar o padrão oficial XB: sem orelhas, sem nariz e sem dentes. Olhos e boca continuam como formas simples. O teste de contrato impede que nomes proibidos retornem ao modelo.

### 5. PWA e cache

O HTML registra somente `/sw-v290.js`. O service worker usa cache versionado e estratégia:

- shell essencial precacheado;
- assets versionados/cache-first;
- navegação network-first com fallback para `index.html`;
- limpeza de caches antigos na ativação.

O servidor define cache imutável apenas quando o nome do arquivo contém hash. Arquivos estáveis sem hash recebem cache curto e revalidação. HTML e service worker não recebem cache imutável.

## Compatibilidade de save

`CAMPAIGN_SAVE_VERSION` permanece 3. O novo campo `laneIndex` usa valor padrão 1 quando ausente. Planos antigos sem distância explícita continuam sendo normalizados pelo fallback de migração. Nenhum crédito, veículo, missão ou progresso existente é apagado.

## Critérios de aceite

- O HTML fonte não referencia os três overlays históricos.
- Não existem `__XB_GAME_SCENE__` ou `__XB_GAME_WORLD__` no fonte.
- O HUD Focus é renderizado por React e recebe dados tipados.
- A primeira rota tem distância explícita de 1 km.
- Um volume coletado na primeira rota não eleva o pagamento bruto acima de XB$ 15.
- Pneu Urbano e Mochila Pequena aparecem na ordem e preços canônicos em progressão, objetivos e Central.
- O mascote não cria orelhas, nariz ou dentes.
- Curvas e atores são controlados por `RoadSystem`; módulos são controlados por `EnvironmentVisuals`.
- Arquivos não-hashados não recebem `immutable` por um ano.
- Testes offline 2.9.0 e testes de segurança passam.
- O servidor local responde `/healthz` com versão 2.9.0 e o fluxo principal permanece jogável.

## Limite conhecido do ambiente de execução

O pacote original não contém `node_modules`, e o ambiente de auditoria pode ficar sem acesso ao registro npm. A validação deve priorizar testes offline, TypeScript disponível globalmente, inspeção sintática e o `dist` autônomo. Uma build Vite limpa só pode ser declarada quando as dependências estiverem disponíveis; qualquer distribuição compatível baseada no bundle 2.8 deve ser rotulada explicitamente e não apresentada como recompilação integral do fonte 2.9.

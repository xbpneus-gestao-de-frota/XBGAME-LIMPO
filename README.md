# XBPNEUS Racing — Do Pedal ao Planeta

Jogo 3D de estratégia logística para navegador. A campanha começa com uma bicicleta, combina entregas pilotáveis e automáticas e evolui por cidades, estados, países e mundos.

## Início rápido — sem instalar dependências do projeto

O ZIP já inclui uma distribuição jogável em `dist/public` e um servidor feito apenas com recursos nativos do Node.js.

### Windows

1. Extraia todo o ZIP.
2. Dê dois cliques em `INICIAR_GAME_WINDOWS.bat`.
3. O navegador abrirá `http://127.0.0.1:3000`.
4. Para encerrar, feche a janela preta ou pressione `Ctrl+C`.

Também estão incluídos `INICIAR_GAME_POWERSHELL.ps1` e `iniciar-game.sh` para PowerShell, Linux e macOS.

Requisito para essa execução: Node.js 22 instalado. Não é necessário executar `pnpm install` para jogar a distribuição incluída.

## Versão 3.5.0 — Sombra e brilho

- **Sombra projetada.** A bicicleta e o entregador passam a projetar sombra no asfalto. Antes nada no jogo projetava sombra — só existiam discos escuros presos aos atores. Como o jogador fica parado e o mundo passa por ele, uma única projeção ancorada na origem cobre para sempre a área que importa, e por isso o mapa pode ser pequeno e nítido.
- **Brilho calibrado.** Céu, sol, nuvens e estrelas foram excluídos da camada de brilho e a intensidade caiu para 0,22. No preset "Qualidade", a 3.4.0 estourava o fundo inteiro.
- Ambos desligam sozinhos no preset "Desempenho".

### Duas armadilhas que valem registro

- `ScenePerformancePriority.Intermediate` **desliga a passagem de sombra em silêncio**. O modo agora acompanha o estado das sombras.
- **Malha-fonte de instância desligada não participa da avaliação de luz.** Os ladrilhos da rua eram todos instâncias de uma malha escondida, e por isso nenhum recebia sombra. O primeiro ladrilho de cada peça passou a ser a malha original, visível.

### Ainda fora

Prédios, árvores e postes não projetam sombra: incluí-los abriria muito o enquadramento da projeção e a sombra da bicicleta perderia nitidez.

## Versão 3.4.0 — Mais peças do acervo na pista

- A pista deixa de ser feita só de retas: **cruzamento, T e rotatória** entram ao lado dela. As três estavam no acervo desde sempre e têm exatamente o mesmo encaixe — 8 × 8 m com o asfalto ocupando o ladrilho inteiro — então entraram como troca direta, sem mexer no sistema de pista.
- A distribuição é determinística (`pieceFor`), para o traçado ser o mesmo em toda partida e acompanhar a reciclagem de segmentos.
- Uma **camada de brilho** passa a aproveitar o azul XB emissivo que já vinha do material original — aros, manoplas, painel do baú e coletáveis. Ela é desligada sozinha no preset "Desempenho".

### Ainda fora, e por quê

- **Ruas laterais:** entre a borda da pista e a primeira fileira de lotes sobram menos de 5 unidades, e um ladrilho tem 8 de lado.
- **Curvas reais:** o percurso é uma reta com os segmentos girados ao longo de uma linha de centro; uma peça já curvada dobraria a curvatura.
- **Praça:** 98 × 98 m — cabe como destino, mas exige repensar o ponto de entrega.

## Versão 3.3.0 — Assets reais em glTF

### O acervo entra no jogo

- O acervo original tinha **onze** peças de rua em FBX (reta, curva, duas curvas suaves, T, Y, cruzamento, rotatória, duas rampas e praça) e **quatro** arquivos de personagem. Até a 3.2 apenas a reta era usada, e por um conversor caseiro.
- A conversão passou a ser feita com Blender para glTF/GLB. O conversor caseiro (`scripts/convert_real_fbx_assets.py`) foi aposentado: ele ignorava pivôs e pre-rotation do FBX, funcionava para o entregador por acaso e deformava em silêncio qualquer outro rig.
- O pacote binário próprio (`assets/real-v310/assets.bin` + `entregador.png`, 7,36 MB) saiu. Em seu lugar entram 12 arquivos GLB somando **1,16 MB**.
- O entregador deixa de ser um blob de posições assadas de 12 quadros: agora tem **esqueleto de 24 ossos, textura recuperada e três animações** (`idle`, `pedal`, `walk`).

### Por que a pista aparecia preta

O carregador anterior descartava os quatro materiais que vêm no arquivo — `XB_Asfalto`, `XB_Guia`, `XB_Calcada`, `XB_Faixa` — e colava o material escuro do jogo por cima. Não era problema de asset. Carregando em glTF os materiais vêm junto, e `scripts/runtime-overlay-check.mjs` passou a proibir por regra que o carregador reatribua material de malha carregada.

### A bicicleta XB

A pasta `BIKE/` foi salva no Unreal 5.8 e a máquina de desenvolvimento tem o 5.7 — nenhuma versão anterior abre esse formato. A tabela de montagem foi extraída do próprio arquivo (15 peças, só translação, entre-eixos de 100 cm, topo das manoplas a 86 cm) e `PlayerVehicle.buildBike()` foi reconstruído a partir dela, com as cores reais e o azul neon emissivo. Nenhum download, nenhum Unreal.

### Escala do mundo

1 metro do asset vale **2,3 unidades** do jogo: os 6,00 m de asfalto da peça real cobrem exatamente a faixa rodável de 13,8 unidades. `tests/game/gltfAssets.test.ts` fixa essa relação.

### Detalhes que custaram caro

- Duas importações glTF simultâneas na mesma cena se atropelam e uma chega sem geometria. As cargas são sequenciais.
- Malha com esqueleto tem caixa de contorno degenerada até ser recalculada, e some por descarte de frustum. `refreshBoundingInfo({ applySkeleton: true })` resolve.
- O entregador não pode se prender ao `driver-rig`: esse nó é reconstruído a cada troca de veículo e levava o entregador junto no descarte. Ele se prende a `player-vehicle`, que vive enquanto a cena existir.
- Mexer na escala do nó raiz do glTF espelha o modelo e ele desaparece por back-face culling. O ajuste vai num suporte acima da raiz.

### Ainda fora

Os 862 arquivos `.uasset` continuam preservados em `source-assets/original` na pasta da 3.1.0. Eles abrem no Unreal 5.7, mas **nenhuma textura veio no pacote**: o kit depende de uma paleta ausente, e exportar sem resolver isso entrega modelos cinzas. Compor a Rota Ouro a partir das peças de curva é uma mudança no sistema de pista, não uma troca de arquivo, e fica para a próxima onda.

## Versão 3.2.0 — Cadeia de entrega real

### Cadeia de entrega

- `dist/` passa a ser uma build Vite gerada do código-fonte. Até a 3.1 era o bundle compilado 2.8, com hash SHA-256 idêntico nas releases 2.9, 3.0 e 3.1, remendado por camadas manuais.
- Remove os adaptadores `v250-runtime`, `v260-pilot-fusion`, `v270-hud-focus`, `v280-neighborhood` e `v310-real-assets`, junto com o contrato de variáveis globais `__XB_GAME_SCENE__` e `__XB_GAME_WORLD__`.
- `pnpm verify` volta a ser executável de ponta a ponta: `lint && build && test && dist:integrity && release:check`. Na 3.1 o portão era logicamente impossível — o `vite build` esvaziava `dist/public`, e o verificador de release exigia dentro dessa pasta os arquivos que a build acabara de apagar.
- Adiciona `scripts/dist-integrity.mjs`: a build grava `SHA256SUMS_3.2.0.txt` e o portão confere hash a hash o que está em `dist/`.
- Remove `server/index.ts`, um servidor Express que nunca foi implantado. `server/standalone-server.mjs` é o único servidor. `express` e `@types/express` saíram das dependências.

### Correções visíveis para o jogador

- A fusão de geometria por material engolia o cenário de bairro: parques e pontos de ônibus deixavam de ser filhos do próprio módulo e continuavam visíveis, parados, em rotas não urbanas. Agora só filhos diretos são fundidos e a marcação `metadata.xbLayer` sobrevive à fusão.
- A pista procedural não era escondida quando a rua FBX entrava, o que produzia faixas duplicadas com z-fighting. `RoadSystem.roadSurfaceNodes()` resolve isso estruturalmente, por marcação, e não por nome de mesh.
- O teclado estava preso ao canvas: perder o foco para qualquer botão da tela matava os controles em silêncio, e `P` pausava mas não retomava, porque o diálogo de pausa tirava o foco do canvas. O ouvinte passou para a janela, com guarda para campos de texto e para botões e links focados.
- A linha de instrução dos controles voltou a aparecer no teclado; estava anulada por `display: none !important`.
- Nuvens não são mais desenhadas em rota orbital ou planetária.
- A colisão de obstáculos passou a ser varrida entre o quadro anterior e o atual, em vez de depender da posição instantânea e, portanto, do tamanho do passo.
- Perda de contexto WebGL passou a ser tratada, com aviso e recarga; trocar de aba durante a rota pausa a corrida.

### Desempenho

- `CampaignStore.value` mantém o clone em cache e o motor lê por `CampaignStore.current`, sem clonar. Antes a campanha inteira era serializada e reanalisada a cada leitura, 60 vezes por segundo.
- A gravação em disco durante a corrida deixou de acontecer a cada ação e segue apenas o tique de meio segundo.
- Câmera e reposicionamento de cenário saíram do passo fixo de simulação. Eram passada dupla por passo e, depois de um engasgo, até 60 reposicionamentos em um único quadro.
- `React.memo` nos painéis de HUD, e o HUD legado que só estava escondido por CSS saiu do JSX.

### Servidor e cache

- HSTS de um ano com `includeSubDomains`.
- Cache imutável restrito a arquivos com hash de conteúdo real dentro de `/assets/`.
- `304` para `If-None-Match` e `If-Modified-Since`, `Last-Modified`, `Accept-Ranges`, `206` para requisições parciais e `416` para faixa impossível.
- Contenção de caminho por `realpath`, e não só lexicamente.
- A decisão entre 404 e fallback da SPA passa a usar o caminho decodificado.
- 13 tipos MIME novos e limites de socket (`maxConnections`, `headersTimeout`, `requestTimeout`).
- Os service workers `sw-v250` a `sw-v310` viraram lápides autodestrutivas: apagam os caches antigos, se desregistram e recarregam a aba, liberando clientes PWA presos numa versão antiga. O worker ativo é `sw-v320.js`.

### Testes

- As oito suítes `.test.mjs` de "regex contra arquivo" foram substituídas por 16 arquivos de teste de comportamento, com 110 casos, incluindo o teste que faltava ligando o resultado da corrida à economia da campanha e guardas de regressão para os defeitos acima.

### Equilíbrio

- A curva de XP da empresa é quadrática só até o nível 30 e cresce bem mais devagar depois. O total até o nível 500 caiu de 499.000 para 99.558 de XP. Os níveis 1 a 30 são idênticos aos de antes: a abertura do jogo não mudou, e nenhum save perde progresso.

### Assets FBX reais

- O pacote FBX passou a ser opcional, ligado por `?assets=real`. Ligado por padrão, ele substituía a pista procedural inteira por uma pista preta e o ciclista sumia da tela, porque o pacote só cobre a rua e o entregador. O cenário procedural voltou a ser o padrão. Detalhes em `ASSETS.md`.

### Limite objetivo desta integração

A bicicleta XB, carros, árvores e vários módulos de cenário foram enviados apenas como `.uasset`. O navegador não carrega esse formato do Unreal diretamente, e por isso esses itens não existem no pacote convertido. Mesmo com `?assets=real`, a bicicleta continua procedural e o runtime declara isso em `document.documentElement.dataset.xbBikeAsset` como `procedural-fallback-no-source-fbx`. Os `.uasset` permanecem preservados em `source-assets/original` até serem exportados para FBX ou GLB. Não há, na 3.2, nenhuma declaração de integração desses itens.

### Situação da distribuição incluída

`dist/` deixou de ser um pacote de compatibilidade. A pasta é a saída do `vite build` rodando sobre `client/src`, com bundles nomeados por hash de conteúdo, mais `dist/standalone-server.mjs` copiado de `server/standalone-server.mjs`. Não há adaptador histórico, bundle 2.8 nem camada manual: `scripts/runtime-overlay-check.mjs` varre a distribuição e falha se algum reaparecer.

Todo arquivo distribuído é registrado em `SHA256SUMS_3.2.0.txt` pela própria build, e `pnpm dist:integrity` confere hash a hash — divergência, arquivo a mais ou arquivo a menos reprovam o portão.

A distribuição continua jogável sem instalar dependências, agora por ser exatamente o que a fonte produz. Para regerá-la:

```bash
pnpm install --frozen-lockfile
pnpm verify
```

## Controles

- `←` / `A`: faixa à esquerda
- `→` / `D`: faixa à direita
- `P`: pausar e retomar
- `Esc`: pausar ou continuar
- `Espaço`: Turbo Borracha XB quando a energia atingir 100%
- Celular: botões de esquerda, direita, Turbo e pausa

O teclado é ouvido na janela, e não no canvas: os controles continuam válidos com o foco em qualquer parte da interface. Campos de texto ficam de fora, e `Espaço` e `Enter` continuam pertencendo ao botão ou link que estiver focado.

## Desenvolvimento no VS Code

Versões fixadas pelo projeto:

- Node.js `22.18.0`
- pnpm `10.15.1`

```bash
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install --frozen-lockfile
pnpm dev
```

O desenvolvimento fica em `http://127.0.0.1:3000`.

## Comandos

| Comando | Função |
| --- | --- |
| `node dist/standalone-server.mjs` | Abre a distribuição sem instalar dependências |
| `pnpm dev` | Desenvolvimento local com Vite |
| `pnpm build` | Gera assets, compila o cliente, copia o servidor autônomo e grava `SHA256SUMS_3.2.0.txt` |
| `pnpm check` | TypeScript estrito do cliente e dos scripts |
| `pnpm lint` | `check` mais conferência de formatação pelo Prettier |
| `pnpm format` | Reformata os arquivos cobertos pelo `lint` |
| `pnpm test` | 110 casos no vitest e 8 testes de segurança no `node:test` |
| `pnpm dist:integrity` | Confere `dist/` contra `SHA256SUMS_3.2.0.txt` |
| `pnpm release:check` | Varredura de segredos, arquivos privados, ativos e versões fixadas |
| `pnpm verify` | Portão completo: `lint`, `build`, `test`, `dist:integrity` e `release:check` |
| `pnpm verify:offline` | Portões estáticos e teste HTTP da distribuição |
| `pnpm audit` | Auditoria de dependências |
| `pnpm start` | Inicia `dist/standalone-server.mjs` |

`pnpm verify:offline` não compila nada e não sobe Vite: usa apenas o Node para rodar os portões estáticos e subir a distribuição já construída. Ele exige um `dist/` presente e o pacote `typescript` resolvível, usado pelo verificador de sintaxe.

## Modos de inspeção

| URL | Uso |
| --- | --- |
| `?fresh&screen=base` | Campanha inicial efêmera |
| `?screen=base` | Central avançada de demonstração |
| `?screen=routes` | Mapa avançado |
| `?screen=garage` | Garagem avançada |
| `?screen=complete` | Conclusão planetária |
| `?demo` | Corrida automática determinística no HUD Focus |
| `?demo&pilot=classic` | Corrida determinística com o HUD clássico para comparação |
| `?assets=real` | Liga o pacote FBX opcional de rua e entregador |

Os modos de inspeção não substituem a campanha normal. Sem `?assets=real`, o runtime marca `data-xb-real-assets="opt-in"` no elemento raiz; com o parâmetro, a marca passa a `active` ou, em caso de falha de carregamento, `fallback`.

## Produção

```bash
pnpm verify
HOST=0.0.0.0 PORT=3000 node dist/standalone-server.mjs
```

O servidor responde em `/healthz`, devolve a SPA apenas para rotas sem extensão, retorna 404 para arquivos ausentes e aplica CSP, HSTS, proteção contra enquadramento, isolamento de origem, política de permissões, tipos MIME corretos, requisições condicionais e faixas de bytes.

Consulte `VALIDACAO_3.2.0.md`, `RESUMO_ENTREGA_3.2.0.md`, `TESTING.md`, `STRUCTURE.md`, `SECURITY.md`, `ASSETS.md`, `INVENTARIO_ASSETS_ORIGINAIS_3.1.0.json` e `CHANGELOG.md`.

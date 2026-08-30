# Changelog

## 3.6.1

- A rotatória sai do meio da via. O traçado atravessa o ladrilho em linha reta, então o ilhéu central caía no meio da faixa e o jogador passava por cima dele. A vaga virou cruzamento comum, o que mantém o compasso da malha viária.
- `XB_Road_Roundabout.glb` sai do que é enviado ao jogador e fica em `assets-source/glb/`, junto com as curvas e rampas. Acervo entregue: 5 → 4 peças.

## 3.6.0

Revisão independente da 3.5.0 (quatro leituras separadas do código e uma bateria de sabotagem controlada dos testes) e correção do que ela encontrou. Sem conteúdo novo de jogo.

### Defeitos visíveis para o jogador

- Dois entregadores na mesma bicicleta a partir da primeira corrida: o boneco antigo voltava por dentro do novo (0 → 35 peças ligadas). A guarda comparava o tamanho da lista de peças, que não mudava na troca; passa a usar a identidade do esqueleto.
- A bicicleta parava de projetar sombra na primeira corrida: a lista de projetores caía de 129 para 48 peças e não voltava. A lista passa a ser refeita inteira a cada dez quadros (0,041 ms medidos).
- A tela de ajustes não aceitava clique — a camada da interface é transparente ao mouse e a tela nunca se declarou clicável. Só o teclado chegava nela.
- Esc não fechava a pausa: a tecla era lida no painel e de novo na janela, despausando e repausando no mesmo instante.
- Clicar na área escurecida com uma janela aberta soltava o foco e o Esc parava de funcionar.
- O preço de manutenção mostrado não era o cobrado (XB$ 110 no botão, XB$ 60 debitados, os dois na mesma tela): faltava aplicar o desconto das peças no painel.
- Corrida em andamento era descartada ao recarregar se o desgaste do pneu tivesse mudado por outra entrega, junto com o custo já reservado.

### Cena 3D

- Falha ao carregar o acervo deixava 14 malhas, 11 materiais e 11 geometrias órfãos numa cena viva; o desmonte também não liberava animações, esqueleto, materiais nem texturas. Cada peça passa a ser registrada no instante em que chega. Sobras medidas: 0 nos dois casos.
- Varredura da cena inteira (835 malhas, expressão de busca e duas subidas de árvore) a cada quadro: 0,3198 ms → 0,0001 ms.
- `collectCasters` contava o entregador duas vezes; a lista de projetores agora é deduplicada por identidade.

### Entrega e infraestrutura

- 26 de 232 arquivos com hash (288 KB, incluindo o único CSS do app) perdiam a marca de definitivo porque a regra não aceitava traço e os hashes do Vite têm traço em ~12% dos casos. Agora 232 de 232. A conferência que devia pegar isso testava um nome inventado sem traço; passa a percorrer a distribuição real.
- `If-Range` era ignorado e o ETag era fraco: retomada de download podia colar bytes de duas versões diferentes. ETag forte e `If-Range` honrado.
- Nome do cache do jogo instalado estava fixo em `v320` desde a 3.2.0: um aparelho com o jogo instalado guardava para sempre a primeira cópia de qualquer arquivo sem nome versionado. O nome passa a vir da versão, o cache antigo é apagado e o que não é definitivo é revalidado. Offline continua funcionando.
- A conferência de integridade da distribuição não podia reprovar (a montagem gerava a lista que a conferência comparava). Passa a comparar a distribuição contra as fontes; reprova com arquivo adulterado e com arquivo estranho plantado.
- `node --test` apontava para um padrão que não casava com nada e saía com sucesso: metade do comando de teste nunca rodou.
- A integração contínua nunca ligava o servidor distribuído. `verify` passa a terminar em `verify:offline`.
- Quatro conferências de "integridade de fonte" eram expressões de busca atrás do texto exato de bugs antigos; substituídas por verificações reais ou removidas com justificativa.
- Sete peças de rua sem uso (curvas, rampas, praça, bifurcação — 311 KB) saem do que é enviado ao jogador e ficam em `assets-source/glb/`.
- 9,5 KB de estilo morto e um componente sem referências removidos.
- `React.memo` não pulava nenhuma renderização em três de cinco componentes; um foi corrigido (0% → 100%) e dois perderam o `memo` que não podia funcionar.

### Testes

- Sabotagem controlada: 32 defeitos plantados, **7 pegos pelos testes da 3.5.0**. Os 25 restantes foram fechados com testes de comportamento, cada um provado falhando antes de passar.
- Entre os 25: coletar entrega no instante do despacho, carga acima da capacidade, Rota Perfeita sem turbo e depois de batida, turbo acima de 100%, obstáculo atravessando o jogador, piloto automático escolhendo a faixa com obstáculo, arquivo de fora da pasta servido por link simbólico (explorável de verdade) e todo pedido condicional respondido com 304.
- Três testes dependiam da data do computador; o relógio passa a ser fixado.
- 113 → 141 testes.

### Continua fora

- Prédios, árvores e postes seguem sem sombra projetada. Atacado de novo e falhou: as cópias do cenário não entram na passada de sombra, e é justamente por serem cópias que a cidade é barata de desenhar. Correção aproveitada: a folga de profundidade é medida na profundidade inteira do enquadramento — era isso que apagava a sombra da bicicleta em toda tentativa de abrir o enquadramento.

## 3.5.0

- Sombra projetada de verdade para a bicicleta e o entregador. Nada no jogo projetava sombra antes.
- Camada de brilho calibrada: céu, sol, nuvens e estrelas excluídos, intensidade de 0,42 para 0,22. No preset "Qualidade" a versão anterior estourava o fundo inteiro.
- `ScenePerformancePriority` passa a acompanhar o estado das sombras — o modo Intermediate desligava a passagem de sombra em silêncio.
- O primeiro ladrilho de cada peça de rua passa a ser a malha original, visível. Como malha-fonte escondida, ela ficava fora da avaliação de luz e nenhuma instância recebia sombra.
- `createGameScene` aceita `{ shadows }` e o handle expõe `setShadows`.

## 3.4.0

- Cruzamento, T e rotatória entram na pista ao lado da reta. As três peças estavam no acervo desde o início e têm o mesmo encaixe de 8 × 8 m, então entraram sem mexer no sistema de pista. Distribuição determinística.
- Camada de brilho para o azul XB emissivo — valor que já vinha do material original e era desperdiçado. Desligada no preset "Desempenho".
- `createGameScene` aceita `{ glow }` e o handle expõe `setGlow`.

## 3.3.0

- Assets reais em glTF/GLB, convertidos com Blender: 11 peças de rua e o entregador com esqueleto de 24 ossos, textura e três animações. Download cai de 7,36 MB para 1,16 MB.
- Aposenta o conversor FBX caseiro, que ignorava pivôs do rig e deformava em silêncio qualquer modelo que não fosse o entregador.
- Corrige a causa da pista preta: o carregador reatribuía os materiais da malha carregada. Passa a ser proibido por regra no portão de arquitetura.
- Reconstrói a bicicleta XB a partir da tabela de montagem recuperada do asset original, com medidas e cores reais.
- Prende o entregador a `player-vehicle` em vez de `driver-rig`, que é descartado a cada troca de veículo.
- Substitui as últimas asserções de "o arquivo contém este texto" por invariantes: a versão do servidor tem de bater com a do pacote, e o portão de arquitetura deixa de fixar número de release.

## 3.2.0 — 2026-08-25 — Cadeia de entrega real

### Cadeia de entrega

- Substitui a distribuição de compatibilidade por uma build Vite gerada de `client/src`; até a 3.1 `dist/public/assets/index-v230bair.js` era o mesmo bundle 2.8, com hash SHA-256 idêntico nas releases 2.9, 3.0 e 3.1.
- Remove os adaptadores `v250-runtime`, `v260-pilot-fusion`, `v270-hud-focus`, `v280-neighborhood` e `v310-real-assets`, e com eles o contrato de globais `__XB_GAME_SCENE__` e `__XB_GAME_WORLD__`.
- Corrige `pnpm verify`, que era logicamente impossível de passar: o `vite build` esvaziava `dist/public` e o verificador de release exigia ali os arquivos apagados. A ordem passou a ser `lint && build && test && dist:integrity && release:check`.
- Adiciona `scripts/dist-integrity.mjs`: a build grava `SHA256SUMS_3.2.0.txt` e o portão confere a distribuição hash a hash, reprovando divergência, sobra ou falta.
- Reescreve `scripts/runtime-overlay-check.mjs` para varrer `dist/public` e reprovar qualquer adaptador aposentado que reapareça.
- Exclui `server/index.ts`, servidor Express que nunca foi implantado, e remove `express` e `@types/express` das dependências.
- Remove os scripts `test:v24:offline` a `test:v31:offline` e `preview:offline`, junto com os oito executores correspondentes em `scripts/`.
- Retira a auditoria de dependências do caminho crítico: na CI ela informa sem bloquear, e saiu do `buildCommand` do Render. `pnpm audit` continua disponível como comando.

### Correções de jogo

- Corrige a fusão de geometria por material, que engolia o cenário de bairro: parques e pontos de ônibus deixavam de ser filhos do módulo e continuavam visíveis, parados, em rotas não urbanas. Só filhos diretos são fundidos, e a marcação `metadata.xbLayer` sobrevive ao `MergeMeshes`.
- Esconde a pista procedural quando a rua FBX entra em cena, eliminando as faixas duplicadas com z-fighting. A seleção passa por `RoadSystem.roadSurfaceNodes()`, por marcação estrutural, e não por nome de mesh.
- Move o ouvinte de teclado do canvas para a janela: perder o foco para um botão da tela desligava os controles em silêncio, e `P` pausava mas não retomava porque o diálogo de pausa tirava o foco do canvas. Campos de texto ficam de fora, e `Espaço` e `Enter` continuam pertencendo ao botão ou link focado.
- Restaura a linha de instrução dos controles no modo teclado; estava anulada por `display: none !important`.
- Deixa de desenhar nuvens em rota orbital e planetária.
- Torna varrida a colisão de obstáculos, que dependia da posição instantânea e podia ser atravessada por um passo grande.
- Trata perda e restauração de contexto WebGL, com aviso ao jogador, e pausa a corrida quando a aba fica oculta.
- Registra pilha e componente de origem no `ErrorBoundary` e mostra a mensagem da falha.
- Acrescenta bloqueio real de fundo ao quadro de missões, que declarava `aria-modal` sobre uma Central ainda clicável.
- Liga `scene.autoClear`, desativado pelo modo de desempenho `Intermediate`, que tornava o `clearColor` código morto.

### Desempenho

- `CampaignStore.value` passa a reaproveitar o clone em cache e o motor lê por `CampaignStore.current`, sem clonar. Antes a campanha inteira era serializada e reanalisada a cada leitura, 60 vezes por segundo.
- Limita a gravação em disco durante a corrida ao tique de meio segundo, em vez de gravar a cada ação.
- Tira câmera e reposicionamento de cenário do passo fixo de simulação: eram passada dupla por passo e, depois de um engasgo, até 60 reposicionamentos em um único quadro.
- Aplica `React.memo` aos painéis de HUD e remove do JSX o HUD legado que só estava escondido por CSS.
- Envia um único quadro do entregador real à GPU em vez dos doze, e troca a visibilidade do pacote real apenas quando o veículo muda.
- Reaproveita o vetor de alvo da câmera, que era alocado a cada passo fixo.

### Servidor e cache

- Adiciona `Strict-Transport-Security` de um ano com `includeSubDomains`.
- Restringe o cache imutável a arquivos com hash de conteúdo real dentro de `/assets/`.
- Responde `304` a `If-None-Match` e `If-Modified-Since`, publica `Last-Modified` e `Accept-Ranges`, atende faixas com `206` e recusa faixa impossível com `416`.
- Contém a travessia de caminho por `realpath`, e não apenas lexicamente.
- Decide entre 404 e fallback da SPA sobre o caminho já decodificado.
- Acrescenta 13 tipos MIME e limites de socket (`maxConnections`, `headersTimeout`, `requestTimeout`).
- Converte os service workers `sw-v250` a `sw-v310` em lápides autodestrutivas que apagam os caches antigos, se desregistram e recarregam a aba, liberando clientes PWA presos numa versão antiga. O worker ativo passa a ser `sw-v320.js`.

### Testes

- Substitui as oito suítes `.test.mjs` de verificação por expressão regular sobre arquivos por 16 arquivos de teste de comportamento, com 110 casos.
- Acrescenta `runToEconomy.test.ts`, o teste que faltava ligando o resultado de uma rota pilotada inteira à economia da campanha, incluindo o caso de abandono.
- Acrescenta guardas de regressão em `roadSurface.test.ts`, `progression.test.ts`, `realAssets.test.ts` e `neighborhood.test.ts`.
- Amplia os testes de segurança de 4 para 8, cobrindo HSTS e demais cabeçalhos de transporte, a política de cache imutável, a ordem do portão `verify` e a ausência de Express.
- Separa os executores: `vitest` para `tests/**/*.test.ts` e `node:test` para `security/*.test.mjs`.

### Equilíbrio

- Torna a curva de XP da empresa quadrática apenas até o nível 30, com crescimento bem mais lento depois. O total até o nível 500 cai de 499.000 para 99.558 de XP. Os níveis 1 a 30 permanecem idênticos e nenhum save perde progresso.

### Assets

- Torna o pacote FBX opcional, atrás de `?assets=real`. Ligado por padrão, ele substituía a pista procedural inteira por uma pista preta e o ciclista sumia da tela, porque o pacote cobre apenas a rua e o entregador.
- `installRealAssets` passa a devolver um handle com `dispose()`, desfaz o que criou quando a instalação falha no meio e restaura a pista procedural ao ser descartado.
- Valida offsets, alinhamento e limites do binário contra o manifesto antes de materializar qualquer malha.
- Deixa de exigir que o manifesto declare a versão da release, e clona o material do entregador sem repintar o uniforme compartilhado do mascote.

## 3.1.0 — 2026-08-25 — Integração real de FBX

- Converte `XB_Road_Straight.fbx` em quatro meshes reais de asfalto, guia, calçada e faixa para o runtime Babylon.js.
- Converte `A_XB_Pedal.fbx` em um entregador de 23.814 vértices com cores da textura e 12 quadros de pedalada a 12 FPS.
- Adiciona `RealAssetRuntime.ts` ao fonte oficial e o adaptador distribuído `v310-real-assets.js`.
- Substitui a rua e o entregador procedurais quando a bicicleta está selecionada, preservando fallback seguro caso o pacote não carregue.
- Declara explicitamente que a bicicleta permanece procedural porque seu modelo foi enviado somente em `.uasset`.
- Preserva no pacote completo os 877 assets originais, com inventário SHA-256 individual.
- Cria service worker `sw-v310.js`, atualiza servidor, inicializadores, testes, verificação HTTP e manifestos para 3.1.0.

## 3.0.0 — 2026-08-24 — Rota Ouro do Bairro XB

- Introduz uma rota padrão-ouro com reta, curva à direita, recuperação, curva à esquerda e chegada urbana destacada.
- Centraliza o percurso em `goldenRouteLayout.ts`; pista, faixas, obstáculos, coletáveis, destino e câmera passam a consumir a mesma geometria determinística.
- Amplia o bairro procedural com residências, comércio, garagem, parque, ponto de ônibus, vegetação e marco de destino.
- Reduz o baú da bicicleta, ajusta a câmera e compacta o HUD para melhorar a leitura da pista em desktop e mobile.
- Adiciona escala de antecipação de câmera por aspecto da viewport, corrigindo o enquadramento do jogador em telas verticais.
- Preserva o primeiro contrato em 5 segundos, 1 km e XB$ 10, sem alterar save, economia ou progressão.
- Adiciona o adaptador de distribuição `v300-golden-route`, sem polling ou `MutationObserver`, para manter o pacote jogável enquanto a build Vite limpa permanece indisponível.
- Atualiza PWA, servidor autônomo, manifestos, inicializadores e verificadores offline para a release 3.0.0.

## 2.9.0 — 2026-08-24 — Estabilização do Primeiro Quilômetro

- Substitui o HUD Focus externo por componente React alimentado diretamente pelo `GameSnapshot`.
- Integra curvas, parques e pontos de ônibus ao motor do cenário e remove as globais `__XB_GAME_SCENE__` e `__XB_GAME_WORLD__`.
- Adiciona distância explícita às 19 rotas; a primeira entrega passa de 80 km calculados para 1 km declarado.
- Limita o bônus total de coletáveis a 50% da recompensa-base e detalha as parcelas no relatório final.
- Unifica Pneu Urbano nível 2/XB$ 30 e Mochila Pequena nível 3/XB$ 60 em progressão, missões e Central.
- Remove nariz, orelhas e dentes do mascote procedural, preservando boca simples e identidade XB.
- Remove overlays históricos do boot do fonte, cria `sw-v290.js` e restringe cache imutável a arquivos com hash.
- Inclui testes offline específicos da 2.9 e documenta a distribuição `dist` de compatibilidade quando a build limpa não está disponível.

## 2.8.0 — 2026-08-24 — Bairro Modular

- Cria nove módulos de bairro para a primeira rota urbana.
- Adiciona curvas suaves alternadas e alinhamento progressivo da reta de entrega.
- Acrescenta pontos de ônibus e pequenos parques usando apenas a geometria procedural existente.
- Preserva casas, árvores, grama e correções de apoio no terreno.
- Não adiciona modelos de veículos nem altera a progressão da frota.
- Atualiza HTML, PWA, service worker, servidor, testes e verificação offline para 2.8.0.

## 2.7.0 — 2026-08-24 — HUD Focus e Primeiro Quilômetro

- Substitui a camada visual Fusion ativa pelo HUD Focus, mantendo um único `GameWorld`, canvas, motor Babylon, save e economia.
- Compacta o objetivo após 3,8 segundos e reduz a obstrução persistente do playfield.
- Separa modos de entrada por teclado e toque e corrige áreas seguras móveis.
- Adiciona perfis de câmera para seis categorias e velocidades exibidas coerentes.
- Prioriza o Pneu Urbano no nível 2 por XB$ 30 e move a Mochila Pequena para o nível 3 por XB$ 60.
- Atualiza HTML, PWA, service worker, servidor, inicializadores, testes e verificação offline para 2.7.0.

## 2.6.0 — 2026-08-22 — Modo Piloto Fusion

- Integra a linguagem visual do protótipo Racing Atlas ao Modo Piloto sem substituir o `GameWorld`, a economia, a progressão ou o save da versão 2.5.
- Adiciona HUD Fusion responsivo com missão, telemetria, retículo de faixa, estágio da entrega, progresso da rota e efeitos do Turbo Borracha XB.
- Reutiliza os controles reais do jogo e impede a criação de um segundo canvas, motor Babylon ou campanha paralela.
- Mantém compatibilidade com o minimapa e a sequência de entrega React e com a camada runtime distribuída 2.5.
- Adiciona retorno ao HUD clássico por `?pilot=classic` para comparação e contingência.
- Atualiza HTML, PWA, service worker, servidor autônomo, inicializadores, testes e verificação offline para a versão 2.6.0.
- Mantém todos os recursos essenciais locais e elimina dependência de arquivos externos do protótipo visual.

## 2.5.0 — 2026-08-16 — Release Completo

- Entrega uma distribuição jogável que inicia com Node.js puro, sem instalação de `node_modules`.
- Adiciona servidor autônomo com health check, SPA fallback, MIME types, cache e cabeçalhos de segurança.
- Evolui o runtime Gold com teatro visual da entrega: veículo, entregador, pacote, cliente e confirmação.
- Mede o HUD em tempo real e corrige a sobreposição entre minimapa e telemetria no celular.
- Inclui PWA versionada, manifest, service worker e ícone instalável.
- Adiciona inicializadores para Windows, PowerShell, Linux e macOS.
- Cria verificação offline consolidada de testes, sintaxe, segurança, integridade, release e servidor.
- Mantém o código-fonte 2.5 e o build jogável no mesmo pacote, sem publicar ou alterar o site existente.

## 2.4.0 — 2026-08-16 — Modo Piloto Gold

- Adiciona minimapa funcional da Cidade XB com rota fictícia, origem, destino, próximo setor e entregador interpolado.
- Implementa sete fases operacionais no HUD e uma sequência 3D de aproximação, parada, desembarque, entrega ao cliente e retorno.
- Cria destino urbano independente com casa, fachada, cliente, entregador, volume e marcador XB, sem alterar a economia da campanha.
- Reorganiza os lotes residenciais com implantação determinística acima do solo e amplia o bairro com ruas laterais, travessias, cercas, caminhos, carros estacionados, arbustos e postes.
- Adiciona câmera cinematográfica progressiva na reta final, mantendo transição suave para o enquadramento normal.
- Separa regras em módulos puros (`deliveryExperience`, `minimap` e `urbanLayout`) e cria componentes dedicados para mapa e sequência da entrega.
- Melhora HUD desktop e móvel, áreas seguras, contraste, redução de movimento e leitura operacional sem amarelo na identidade XB.
- Inclui testes offline da 2.4, verificadores de integridade do fonte e da camada runtime, além de compatibilidade visual aplicada ao build 2.3 existente.

## 2.3.0 — 2026-08-15 — Modo Piloto Bairro Vivo

- Reconstrói o cenário urbano com casas térreas, telhados orientados corretamente, duas janelas, porta, árvores com tronco e canteiro, sempre apoiadas acima do terreno.
- Troca o terreno azul por grama natural e amplia o céu claro, as nuvens e a distância de neblina.
- Converte os guard-rails urbanos em calçadas, meio-fio e postes de iluminação; reduz as placas XB para não invadir a pista e preserva as três faixas.
- Aproxima a câmera e recalibra exposição, contraste, luz ambiente e sol para leitura diurna.
- Mantém a paleta institucional sem amarelo, preserva os demais terrenos e eras e corrige o rótulo do Turbo no HUD móvel.

# Histórico de alterações

## 2.2.0 — 2026-08-15

### Operação Bairro

- Refeito o início da campanha com contratos de 5, 8, 15 e 30 segundos e economia alinhada às metas de 10, 30, 60 e 150 XB Coins.
- Adicionadas cinco famílias de peças da bicicleta: pneus, carga, corrente, freios e rodas, com efeitos determinísticos nas operações.
- Progressão ampliada até o nível 500; a frota avança nos marcos 1, 20, 40, 80, 180 e 300 sem bloquear o conteúdo intermediário.
- Incluídos Pontos Operacionais, segunda bicicleta, contratação de operador, salário e despacho automático com lucro líquido real.
- Save atualizado para v3 com migração de v1/v2, sanitização dos novos campos e restauração de rotas pilotadas.

### Turbo Borracha XB

- Implementado poder original carregado por tokens de pneu, ativável por Espaço ou toque.
- O mascote se transforma em pneu vivo com sulcos ciano, energia XB e aura translúcida de caminhão 6x2.
- Durante o Turbo, a rota acelera e obstáculos são rompidos; condução perfeita concede bônus de Rota Perfeita.
- A transformação preserva colisão, troca entre as seis categorias e descarte integral dos recursos 3D.

### Mobile, feedback e carregamento

- Adicionados presets Automático, Desempenho, Equilibrado e Qualidade, com detecção conservadora e persistência local.
- O ciclo de render respeita 30, 45 ou 60 FPS conforme o preset; a resolução pode ser ajustada sem reiniciar a campanha.
- Efeitos sonoros sintéticos e vibração são opcionais, começam desligados e respeitam pausa, aba oculta e movimento reduzido.
- O mundo 3D passou a ser carregado separadamente da interface, reduzindo o peso inicial percebido.
- Nova tela acessível de ajustes e novos indicadores de oficina, energia Turbo, equipe, OP e automação.

## 2.1.0 — 2026-08-15

### Identidade e acabamento

- Identidade visual refeita a partir das referências XB fornecidas: azul-marinho, azul aço, ciano elétrico, branco-gelo, grafite e cromo frio.
- Removidos amarelo, dourado e a antiga assinatura visual provisória de interface, veículos, cenário e artes regeneráveis.
- Adicionados marca metálica, símbolo compacto, mascote transparente e key art da frota como WebPs locais otimizados.
- Mascote oficial incorporado ao menu e à garagem, com tratamento responsivo e texto alternativo descritivo.

### Veículos e mundo 3D

- Reconstruídas as seis categorias com silhuetas, cabines, cargas, rodas, suspensões e materiais PBR próprios.
- Jogador procedural remodelado como o mascote XB cartoon realista, mantendo a mesma identidade em todas as eras.
- Cenários receberam materiais frios, sinalização ciano, iluminação volumétrica, props e evolução visual por região.
- Cena e veículos preservam descarte de recursos, simulação determinística e renderização ociosa econômica.

### Interface

- Menu, Central, Rotas, Garagem, HUD e relatórios ganharam hierarquia, profundidade, vidro técnico e estados de interação refinados.
- Paleta consolidada em tokens semânticos, sem dependência de cores provisórias nos componentes.
- Acessibilidade, foco, alvos táteis, áreas seguras, redução de movimento e operação por teclado foram preservados.

## 2.0.0 — 2026-08-15

### Segurança e distribuição

- Removidos arquivos privados, credenciais incorporadas, proxy de autoria, telemetria e dependências do ambiente original.
- Ativos de execução incorporados como SVGs locais e regeneráveis.
- Vite atualizado para `7.3.5`; dependências diretas fixadas e transitivas vulneráveis substituídas por versões corrigidas.
- Adicionados verificador de release, auditoria, CI, configuração Render, CSP, cabeçalhos de segurança, cache seguro, `/healthz` e respostas 404 reais.
- Fixados Node `22.18.0` e pnpm `10.15.1`.

### Gameplay

- Contratos vinculados a rota, clima, terreno, composto, condição do pneu e economia.
- Adicionados custos operacionais, snapshots imutáveis, reserva de veículos e bloqueios de progressão.
- Implementados pilotagem, despacho, pausa, retomada, abandono e relatório financeiro.
- Progressão ampliada para 17 rotas, incluindo Europa e contrato planetário final.
- Save migrado para versão 2 com validação e tolerância a falhas do `localStorage`.
- Simulação convertida para passo fixo, com equivalência em 30, 60 e 120 FPS.

### Interface e acessibilidade

- Central passou a ser o núcleo da campanha, com escolha explícita entre pilotar e despachar.
- HUD e relatórios usam o veículo, composto e custos reais da operação.
- Adicionados foco visível, diálogo de pausa, semântica ARIA, alvos táteis, áreas seguras, paisagem móvel e redução de movimento.
- Inicialização WebGL ganhou tempo limite e estado de falha recuperável em português.
- Renderização ociosa da cena foi reduzida para um quadro por segundo.

### Qualidade

- Adicionados 22 testes de gameplay e 4 testes de segurança/configuração.
- Removidos scaffold e documentação histórica incompatíveis com a versão entregue.
- A validação completa agora reúne release check, tipos, formatação, testes, ativos e build.

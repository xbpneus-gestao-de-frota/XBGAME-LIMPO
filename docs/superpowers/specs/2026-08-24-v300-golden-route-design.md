# XBPNEUS Racing 3.0 — Rota Ouro Design

## Objetivo

Transformar a primeira experiência pilotada do bairro em uma rota curta, legível e visualmente consistente, com curva suave à direita, trecho de recuperação, curva suave à esquerda e ponto de entrega claro. A versão 3.0 preserva integralmente economia, progressão, save e contratos da versão 2.9.

## Escopo

A entrega modifica somente os seguintes domínios:

- geometria visual e pose da pista urbana;
- sequência modular do bairro;
- fachadas, vegetação, mobiliário urbano e destino;
- enquadramento da câmera e volume visual do baú da bicicleta;
- HUD do modo piloto;
- service worker, versão e distribuição compatível;
- testes offline, validação e evidências de playtest.

Não entram nesta versão:

- novos veículos, regiões ou moedas;
- mudança de duração, distância ou recompensa da primeira missão;
- alteração do formato do save;
- importação direta dos arquivos Unreal/FBX;
- física realista, tráfego completo ou pedestres sistêmicos;
- reescrita do motor Babylon.

## Experiência-alvo

A rota deve comunicar uma pequena entrega urbana diurna. O jogador inicia em uma rua residencial, entra em uma curva suave à direita, atravessa uma zona comercial curta com ponto de ônibus, retorna por uma curva suave à esquerda, passa por uma praça e termina diante de uma residência XB claramente identificada.

A pista deve permanecer central e legível. O cenário deve criar profundidade sem transformar a corrida em um painel administrativo. O centro e a parte inferior central da tela ficam livres, exceto pelo veículo e por avisos transitórios.

## Geometria da rota

A função canônica da rota trabalha com progresso normalizado de `0` a `1` e comprimento virtual de `260` unidades. O centro da pista segue seis zonas:

1. `0.00–0.14`: saída reta;
2. `0.14–0.34`: curva suave à direita até aproximadamente `+4.5` unidades;
3. `0.34–0.48`: trecho estabilizado;
4. `0.48–0.70`: curva suave à esquerda, cruzando o centro até aproximadamente `-3.0` unidades;
5. `0.70–0.86`: recuperação gradual ao centro;
6. `0.86–1.00`: aproximação reta do destino.

Toda transição usa `smoothstep`, sem quebras de tangente visíveis. O yaw é derivado numericamente da linha central e limitado a `±0.12` radianos. Pista, obstáculos, coletáveis, destino e câmera consomem a mesma pose.

## Sequência modular

A rota usa uma sequência determinística de nove módulos:

1. residencial de entrada;
2. residencial arborizado;
3. parada de ônibus;
4. comércio de esquina;
5. residencial compacto;
6. praça;
7. residencial com garagem;
8. comércio local;
9. destino XB.

Cada módulo declara `kind`, densidade de casas, quantidade de árvores, lado do ponto de ônibus, lado da praça, presença de comércio, presença de garagem e intensidade de destaque do destino. As variações não dependem de aleatoriedade de execução.

## Direção visual

- céu azul claro com névoa atmosférica discreta;
- asfalto cinza-azulado, não preto puro;
- calçadas mais claras e bordas de pista legíveis;
- casas estilizadas com volumes simples, telhado, porta, janelas, marquise ou garagem;
- árvores com tronco e copa em duas escalas;
- praça com gramado, caminho e banco;
- ponto de ônibus com plataforma, cobertura e placa;
- comércio com marquise e faixa de fachada;
- destino XB com sinalização ciano e área de entrega destacada;
- materiais compartilhados e objetos estáticos instanciados sempre que a estrutura existente permitir.

## Câmera e veículo

A câmera mantém terceira pessoa, com leve redução do ângulo alto para valorizar o horizonte e a leitura das curvas. O destino pode elevar discretamente o alvo no final da missão. O baú da bicicleta é reduzido o suficiente para liberar a pista sem perder sua função visual.

A câmera não recebe física própria. Ela interpola a posição e o alvo usando o mesmo cue de curva da pista, evitando desalinhamento entre cenário e enquadramento.

## HUD

O HUD persistente fica limitado a:

- objetivo compacto na borda superior;
- telemetria essencial em um único agrupamento;
- estado do Turbo Borracha XB;
- controles móveis apenas quando aplicável.

Informações secundárias permanecem recolhidas. Nenhum painel persistente pode cobrir mais de aproximadamente 25% da área desktop ou ocupar o centro inferior da pista.

## Arquitetura de fonte

`goldenRouteLayout.ts` é uma função pura e a única autoridade para centro, yaw e módulos da Rota Ouro. `RoadSystem` aplica a pose aos segmentos, atores e destino. `EnvironmentVisuals` consome os módulos declarativos. `GameWorld` usa um cue de câmera exposto pelo sistema de pista. React continua responsável pelo HUD e Babylon pelo playfield.

A fonte 3.0 não usa globais de cena, `MutationObserver`, polling de DOM ou busca de meshes por nome para implementar a rota.

## Distribuição compatível

Enquanto o ambiente não puder reconstruir o bundle Vite, `dist` recebe um adaptador explícito `v300-golden-route.js` e `v300-golden-route.css`. Esse adaptador só existe para manter a distribuição jogável baseada no bundle histórico. Ele pode consumir as globais já expostas pelo bundle 2.8, mas não pode usar `MutationObserver` ou `setInterval`.

O adaptador substitui `v280-neighborhood.js`; nunca é carregado pela fonte `client/index.html`. A documentação identifica o `dist` como compatibilidade, não como build limpa da arquitetura 3.0.

## Desempenho

Critérios de projeto:

- reutilizar materiais existentes;
- preferir instâncias para decoração repetida;
- não criar atualização por frame para objetos estáticos;
- preservar 30 FPS como meta em celular intermediário;
- evitar crescimento descontrolado de meshes ativas;
- manter a geometria do cenário compatível com o descarte por segmento já existente.

## Testes

A versão precisa comprovar:

- forma canônica da rota e limites de yaw;
- determinismo e clamp de entradas inválidas;
- sequência modular contendo residencial, ônibus, comércio, praça e destino;
- integração da pose em pista, atores, destino e câmera;
- ausência de regressão na missão `primeiro-pedal` (`5 s`, `1 km`, `XB$ 10`);
- fonte sem overlays históricos;
- compatibilidade carregando somente o adaptador v300 no lugar do v280;
- runtime compatível sem `MutationObserver` e sem `setInterval`;
- versão, worker, servidor e cache em `3.0.0`;
- smoke test desktop e mobile com captura de tela, quando WebGL estiver disponível no navegador do ambiente.

## Critérios de liberação

A entrega é classificada como pacote 3.0 de fonte e compatibilidade quando:

1. os testes offline v24–v30 e segurança passam;
2. o servidor responde `/healthz` com `3.0.0`;
3. o worker `sw-v300.js` é servido sem cache imutável;
4. os assets mutáveis v300 usam revalidação, e bundles hashados permanecem imutáveis;
5. o ZIP final é extraído novamente e seus checksums são conferidos;
6. qualquer impossibilidade de build limpa ou playtest WebGL é declarada de forma explícita, sem converter ausência de evidência em aprovação.

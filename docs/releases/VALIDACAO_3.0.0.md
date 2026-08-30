# Validação XBPNEUS Racing 3.0.0 — Rota Ouro

Data da validação: 25 de agosto de 2026.

## Resultado executivo

A versão 3.0.0 cria a primeira Rota Ouro do bairro XB sobre a fonte estabilizada 2.9. O percurso urbano agora possui uma reta inicial, uma curva suave em cada direção, recuperação central e chegada destacada. Estrada, faixas, obstáculos, coletáveis, destino e câmera consomem a mesma geometria determinística.

Classificação:

- **GO — código-fonte 3.0:** arquitetura, contratos, sintaxe, segurança e comportamento offline aprovados.
- **GO COM RESSALVAS — distribuição incluída:** jogável para avaliação local e continuação do desenvolvimento, com o adaptador visual 3.0 aplicado ao bundle histórico compatível.
- **NO-GO — publicação pública definitiva:** permanece bloqueada até gerar `dist/` diretamente da fonte 3.0 com as dependências fixadas no lockfile e substituir o mascote raster legado da tela inicial.

## Escopo implementado

1. Criação de `goldenRouteLayout.ts` como autoridade única do traçado urbano.
2. Sequência modular determinística com residência, comércio, garagem, parque, ponto de ônibus e destino.
3. Curvas aplicadas à pista, atores, obstáculos, coletáveis e marco de entrega.
4. Câmera com antecipação de curva no desktop e redução proporcional em telas verticais.
5. Baú da bicicleta reduzido para preservar a leitura do jogador e da faixa.
6. HUD Focus compacto, sem polling de DOM, com centro e parte inferior do playfield protegidos.
7. Adaptador distribuído `v300-golden-route.js` sem `MutationObserver` e sem `setInterval`.
8. Service worker, servidor, inicializadores, manifestos e verificadores promovidos para 3.0.0.
9. Preservação integral da primeira entrega: **5 segundos, 1 km e XB$ 10**.
10. Nenhuma alteração em save, economia, preços, progressão ou desbloqueios.

## Defeitos encontrados durante o playtest e corrigidos

### Rotação acumulativa dos atores

O adaptador compatível somava o ângulo da curva ao ângulo já aplicado no quadro anterior. A correção passou a remover o valor anterior antes de aplicar o novo `yaw`.

Evidências TDD:

- `evidencias/validacao-v300/TDD_ACTOR_YAW_RED.log`
- `evidencias/validacao-v300/TDD_ACTOR_YAW_GREEN.log`

### Curva perdida ao pausar

A camada visual desativava o traçado quando a operação entrava em pausa. A regra foi corrigida para preservar a geometria da rota no estado pausado.

Evidências TDD:

- `evidencias/validacao-v300/TDD_PAUSED_CURVE_RED.log`
- `evidencias/validacao-v300/TDD_PAUSED_CURVE_GREEN.log`

### Jogador fora do enquadramento no celular

A antecipação de câmera foi dimensionada originalmente para paisagem. Em 390 × 844, o deslocamento lateral colocava o jogador e a pista fora da região útil. A fonte e o adaptador agora calculam um fator de câmera pelo aspecto da viewport: telas verticais recebem antecipação reduzida, enquanto desktop mantém o valor integral.

Evidências TDD:

- `evidencias/validacao-v300/TDD_MOBILE_CAMERA_RED.log`
- `evidencias/validacao-v300/TDD_MOBILE_CAMERA_GREEN.log`

## Verificação automatizada

| Verificação | Resultado |
| --- | --- |
| Testes offline do game | **17/17 aprovados** |
| Testes de segurança e configuração | **4/4 aprovados** |
| Sintaxe TypeScript/TSX | **36 arquivos aprovados** |
| Integridade do código-fonte | **Aprovada** |
| Arquitetura Rota Ouro 3.0 | **Aprovada** |
| Pesquisa de segredos | **0 encontrados** |
| Sintaxe dos bundles, worker e servidores | **Aprovada** |
| Servidor autônomo e `/healthz` | **3.0.0 aprovado** |
| PWA, CSP, MIME, SPA fallback e 404 | **Aprovados** |
| Marcador final | `VERIFICACAO_OFFLINE_3_0_OK` |

Comando consolidado:

```bash
node scripts/verify-offline-release.mjs
```

Log final:

- `evidencias/validacao-v300/VERIFICACAO_OFFLINE_3.0.0_FINAL.log`

## Playtest visual

A matriz final possui 12 capturas representativas e relatórios JSON individuais.

### Desktop — 1440 × 900

Estados validados:

- menu inicial;
- Central;
- mapa de rotas;
- primeira curva;
- segunda curva;
- aproximação da chegada;
- relatório final.

Resultados observados:

- WebGL 2 ativo durante a pilotagem;
- curva e contracurva visualmente distintas;
- estrada, obstáculos, coletáveis e destino alinhados ao mesmo percurso;
- jogador e baú legíveis;
- HUD sem bloquear o centro da pista;
- resultado final em **XB$ 10** e **1 km**;
- nenhum erro de console ou página.

Evidências principais:

- `evidencias/playtest-v300/desktop-right-curve.png`
- `evidencias/playtest-v300/desktop-left-curve.png`
- `evidencias/playtest-v300/desktop-arrival.png`
- `evidencias/playtest-v300/desktop-result.png`

### Mobile — 390 × 844

Estados validados:

- menu;
- Central;
- primeira curva;
- segunda curva;
- relatório final.

Resultados observados:

- `scrollWidth = clientWidth = 390`;
- jogador projetado dentro da viewport nas duas curvas;
- controles de esquerda, direita e Turbo visíveis;
- HUD compacto sem cobrir o jogador;
- resultado em **XB$ 10** e **1 km**;
- nenhum erro de console ou página.

Evidências principais:

- `evidencias/playtest-v300/mobile-right-curve.png`
- `evidencias/playtest-v300/mobile-left-curve.png`
- `evidencias/playtest-v300/mobile-result.png`

Relatório consolidado:

- `evidencias/playtest-v300/PLAYTEST_VISUAL_3.0.0.json`

## Build limpa

Foi executada uma tentativa real de instalação congelada:

```bash
corepack pnpm install --frozen-lockfile
```

O Corepack não conseguiu baixar o pnpm 10.15.1 porque o ambiente não resolveu `registry.npmjs.org`:

```text
getaddrinfo EAI_AGAIN registry.npmjs.org
```

Registro completo:

- `evidencias/validacao-v300/BUILD_CLEAN_ATTEMPT_3.0.0.log`

Consequência técnica:

- `client/src/**` contém a arquitetura consolidada 3.0 e é a autoridade para o desenvolvimento;
- `dist/**` permanece uma distribuição jogável de compatibilidade baseada no bundle compilado 2.8;
- o adaptador `v300-golden-route` aplica o percurso, os módulos e as correções visuais verificadas sem alterar economia ou save;
- a publicação definitiva exige uma nova build Vite gerada diretamente da fonte 3.0.

## Limitações conhecidas

1. O mascote raster da tela inicial ainda possui nariz, orelhas e dentes e não atende ao padrão oficial XB. O mascote procedural do jogo permanece corrigido; a pendência é o arquivo artístico do menu.
2. Casas, árvores e mobiliário ainda são low-poly provisórios. A 3.0 consolida a fundação visual e técnica da rota, mas não encerra a produção de arte final.
3. A distribuição incluída não é prova de uma compilação limpa da fonte 3.0.
4. A biblioteca Unreal recebida continua fora do runtime web; os ativos precisam ser convertidos e otimizados para GLB/glTF antes de uso.

## Próximo gate

Em uma estação com acesso às dependências:

```bash
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install --frozen-lockfile
pnpm verify
```

Depois:

1. substituir `dist/` pela build limpa;
2. repetir os 12 estados do playtest;
3. substituir o mascote raster legado pelo padrão oficial;
4. iniciar a produção artística final das fachadas, vegetação, iluminação e animação de entrega.

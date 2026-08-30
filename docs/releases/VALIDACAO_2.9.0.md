# Validação XBPNEUS Racing 2.9.0

Data da validação: 24 de agosto de 2026.

## Resultado executivo

A versão 2.9.0 estabiliza o primeiro quilômetro e consolida a arquitetura do código-fonte. A fonte está aprovada para recompilação limpa. A pasta `dist/` permanece uma distribuição jogável de compatibilidade baseada no bundle 2.8, com os reparos críticos da 2.9 aplicados e verificados.

Classificação:

- **GO — fonte 2.9:** pronta para `pnpm install --frozen-lockfile`, `pnpm verify` e geração de uma build limpa em ambiente com dependências.
- **GO COM RESSALVAS — distribuição incluída:** adequada para avaliação local, demonstração e continuação do desenvolvimento.
- **NO-GO — publicação pública definitiva:** bloqueada até substituir o `dist/` de compatibilidade por uma build gerada diretamente da fonte 2.9.

## Correções validadas

1. A primeira rota declara 1 km; o cronômetro de 5 segundos não é mais convertido em 80 km.
2. A primeira entrega inicia e termina em XB$ 10 quando não há bônus válido.
3. Coletáveis possuem detalhamento próprio e teto total de 50% do contrato-base no código-fonte.
4. Pneu Urbano permanece no nível 2 por XB$ 30; Mochila Pequena permanece no nível 3 por XB$ 60.
5. O HUD Focus é um componente React tipado, alimentado pelo `GameSnapshot`, sem leitura ou reconstrução do DOM.
6. Curvas e módulos do bairro pertencem ao `RoadSystem` e ao `EnvironmentVisuals`; as globais de produção foram removidas.
7. O mascote procedural não cria orelhas, nariz ou dentes.
8. `sw-v290.js` é o service worker oficial da fonte; somente ativos realmente hashados recebem cache imutável.
9. Inicializadores locais, servidores e documentação ativa anunciam a versão 2.9.0.

## Verificação automatizada

| Verificação | Resultado |
| --- | --- |
| Testes offline do núcleo Gold + estabilização 2.9 | **17/17 aprovados** |
| Testes de segurança e configuração | **4/4 aprovados** |
| Sintaxe TypeScript/TSX | **35 arquivos aprovados** |
| Integridade do código-fonte | **Aprovada** |
| Arquitetura sem overlays no boot da fonte | **Aprovada** |
| Pesquisa de segredos no release | **Nenhum segredo detectado** |
| Sintaxe dos bundles e scripts distribuídos | **Aprovada** |
| `/healthz` e versão HTTP | **2.9.0 aprovada** |
| CSP, MIME, SPA fallback e 404 de ativos | **Aprovados** |
| Cache de `v280-neighborhood.js` | **Revalidação; não imutável** |

Comando consolidado:

```bash
node scripts/verify-offline-release.mjs
```

Saída final esperada e obtida:

```text
VERIFICACAO_OFFLINE_2_9_OK
```

Log: `evidencias/VERIFICACAO_OFFLINE_2.9.0.log`.

## Playtest visual

### Desktop — 1440 × 900

Foram exercitados:

- Central inicial;
- mapa avançado de rotas;
- demonstração 3D automática em três momentos;
- primeira rota real;
- tela de resultado.

Resultados:

- um canvas Babylon ativo;
- HUD de pilotagem visível;
- nenhuma tela de erro do motor;
- nenhum erro de console;
- nenhum erro de página;
- primeira entrega concluída com **XB$ 10** e **1 km**.

Evidências principais:

- `evidencias/playtest-v290/desktop-base.png`
- `evidencias/playtest-v290/desktop-routes.png`
- `evidencias/playtest-v290/desktop-demo-pilot_4s.png`
- `evidencias/playtest-v290/first-route-pilot.png`
- `evidencias/playtest-v290/first-route-result.png`
- `evidencias/playtest-v290/first-route-report.json`

### Mobile — 390 × 844

Foram exercitados:

- menu;
- Central;
- primeira rota pilotada;
- tela de resultado.

Resultados:

- `scrollWidth = clientWidth = 390` nos quatro estados;
- controles de esquerda e direita visíveis;
- HUD de pilotagem carregado;
- nenhuma tela de erro do motor;
- nenhum erro de console ou página;
- resultado com **XB$ 10** e **1 km**.

Evidências principais:

- `evidencias/playtest-v290/mobile-menu.png`
- `evidencias/playtest-v290/mobile-base.png`
- `evidencias/playtest-v290/mobile-first-route-pilot.png`
- `evidencias/playtest-v290/mobile-first-route-result.png`
- `evidencias/playtest-v290/mobile-first-route-report.json`

## Build limpa

A tentativa de instalar dependências em modo offline falhou porque `@babylonjs/core` não estava disponível no cache local:

```text
npm error code ENOTCACHED
```

Registro completo: `evidencias/BUILD_CLEAN_ATTEMPT_2.9.0.txt`.

Consequência técnica:

- `client/src/**` contém a arquitetura consolidada 2.9;
- `dist/**` ainda utiliza o bundle compilado 2.8 como base de compatibilidade;
- o bundle distribuído recebeu apenas reparos estáticos comprováveis e necessários para continuar jogável;
- o HUD React consolidado, o detalhamento completo das parcelas do resultado e o bairro integrado ao runtime só estarão todos presentes no jogo publicado depois da build limpa.

## Pendências visuais não bloqueantes da estabilização

A distribuição de compatibilidade ainda apresenta dívidas visuais conhecidas:

- condições da rota podem aparecer concatenadas no HUD, como `ChuvaUrbanoADEQUADOCUSTO`;
- o cabeçalho da Central móvel comprime parte do nome da empresa;
- o modo piloto continua com direção artística low-poly e repetição de cenário da geração anterior;
- a produção artística de qualidade 3.0 ainda não foi iniciada sobre a nova estrutura.

Esses pontos pertencem à etapa visual posterior; não invalidam distância, recompensa, save, controles, servidor ou fluxo da entrega.

## Biblioteca Unreal recebida

`Nova pasta (2).zip` foi inventariada separadamente:

- 877 arquivos;
- 862 arquivos `.uasset`;
- 15 arquivos `.fbx`;
- aproximadamente 276 MB descompactados.

Ela não foi incorporada ao navegador. Arquivos `.uasset` não são ativos web distribuíveis; precisam ser abertos no projeto Unreal de origem, revisados, exportados para FBX/GLB e submetidos a redução de materiais, texturas, polígonos, LOD e colisões antes de entrar no game web.

## Próximo gate

Em uma estação com acesso às dependências fixadas no lockfile:

```bash
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install --frozen-lockfile
pnpm verify
```

Depois, substituir `dist/` pela build limpa, repetir o playtest desktop/mobile e somente então promover a 2.9 para publicação.

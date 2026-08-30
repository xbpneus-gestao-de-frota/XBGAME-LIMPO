# Validação técnica — XBPNEUS Racing 3.1.0

## Escopo comprovado

- Rua FBX `XB_Road_Straight.fbx` convertida em quatro materiais e repetida pelos nove segmentos da Rota Ouro.
- Entregador `A_XB_Pedal.fbx` convertido com 23.814 vértices, 119.169 índices, cores de textura e 12 quadros a 12 FPS.
- Integração tipada em `RealAssetRuntime.ts` e compatibilidade em `v310-real-assets.js`.
- Service worker 3.1 com precache do manifesto, binário e textura.
- Pacote original completo preservado: 877 arquivos, sendo 862 `.uasset` e 15 FBX.

## Limite declarado

A bicicleta, os carros, as árvores e outros objetos enviados somente em `.uasset` não são carregados pelo navegador. A bicicleta visual continua procedural. Essa condição aparece no runtime, nos testes e no manifesto como `procedural-fallback-no-source-fbx`.

## Verificações

- Testes de gameplay e assets reais executados pelo Node.
- Teste unitário do conversor executado pelo Python.
- Sintaxe de TypeScript/TSX, scripts, service worker e servidor verificada.
- Servidor real validado por HTTP, incluindo CSP, release, fallback SPA, cache e MIME `application/octet-stream` do pacote binário.
- Integridade dos assets originais registrada em `INVENTARIO_ASSETS_ORIGINAIS_3.1.0.json`.

## Evidências

- `evidencias/v310/PREVIA_TECNICA_ASSETS_FBX_3.1.0.png`
- `evidencias/v310/ENTREGADOR_PEDAL_FBX_12_FRAMES.gif`

Essas evidências são renderizações técnicas dos dados FBX convertidos. O ambiente de preparação não forneceu um playtest gráfico WebGL confiável; portanto, a homologação visual final deve ser repetida no navegador de destino.

## Estado de publicação

- GO para avaliação local e continuidade do desenvolvimento.
- GO para conversão dos demais FBX.
- NO-GO para afirmar bicicleta, carros ou árvores reais enquanto permanecerem apenas em `.uasset`.
- A publicação definitiva continua condicionada a uma build Vite limpa com dependências instaladas pelo lockfile.

## Resultado consolidado desta entrega

- 20/20 testes Node do game e dos assets reais aprovados.
- 1/1 teste Python do conversor aprovado.
- 4/4 testes de segurança aprovados.
- 37 arquivos TypeScript/TSX aprovados na verificação sintática.
- 1.214 arquivos varridos pelo gate de release, sem segredo detectado.
- Teste HTTP do servidor 3.1 aprovado.
- Marcador final: `VERIFICACAO_OFFLINE_3_1_OK`.

A tentativa de instalação limpa foi registrada em `evidencias/v310/BUILD_CLEAN_ATTEMPT_3.1.0.txt` e falhou por `EAI_AGAIN registry.npmjs.org`. Nenhuma alegação de build Vite limpa é feita nesta entrega.

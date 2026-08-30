# Resumo da entrega — XBPNEUS Racing 3.2.0

## O que mudou

A 3.2.0 é uma release corretiva. Ela resolve o problema que estava por baixo de tudo na 3.1: o que o jogador rodava não vinha do código-fonte. `dist/` era o bundle compilado 2.8 — o mesmo arquivo, com o mesmo SHA-256, nas releases 2.9, 3.0 e 3.1 — remendado por cinco camadas manuais. Corrigir o fonte não corrigia o jogo.

Principais resultados:

- `dist/` passou a ser a saída direta do `vite build` sobre `client/src`;
- os cinco adaptadores históricos e as globais `__XB_GAME_SCENE__` e `__XB_GAME_WORLD__` saíram do repositório;
- `pnpm verify` roda inteiro pela primeira vez: `lint`, `build`, `test`, `dist:integrity`, `release:check`;
- a build grava `SHA256SUMS_3.2.0.txt` e o portão confere a distribuição hash a hash;
- o servidor Express não implantado foi excluído, e `express` saiu das dependências;
- parques e pontos de ônibus pararam de ser engolidos pela fusão da pista;
- a pista procedural passou a ser escondida quando a rua FBX entra, acabando com as faixas duplicadas;
- o teclado saiu do canvas e foi para a janela: os controles não morrem mais ao perder o foco, e `P` volta a retomar;
- a linha de instrução dos controles voltou a aparecer;
- colisão varrida, nuvens fora de rota espacial, contexto WebGL tratado e pausa ao trocar de aba;
- leitura da campanha sem clonar por quadro, gravação em disco só no tique de meio segundo, câmera fora do passo fixo e `React.memo` no HUD;
- HSTS, cache imutável só para hash real, `304`, `206`, contenção por `realpath` e 13 tipos MIME novos;
- lápides autodestrutivas em `sw-v250` a `sw-v310`, liberando clientes PWA presos;
- as oito suítes de "regex contra arquivo" viraram 16 arquivos de teste de comportamento, com 110 casos;
- a curva de XP até o nível 500 caiu de 499.000 para 99.558, sem alterar os níveis 1 a 30;
- o pacote FBX passou a ser opcional, atrás de `?assets=real`.

## Situação do pacote

O ZIP contém uma camada só. Fonte e distribuição são a mesma coisa: `dist/` foi gerado desta fonte, nesta validação, e está registrado arquivo por arquivo em `SHA256SUMS_3.2.0.txt`. Não há mais "distribuição de compatibilidade", e `scripts/runtime-overlay-check.mjs` reprova o reaparecimento de qualquer adaptador.

O pacote é adequado para publicação, desde que servido por HTTPS — o servidor envia HSTS em toda resposta.

## Resultado da validação

- 110/110 casos no vitest, em 16 arquivos;
- 8/8 testes de segurança;
- 39 arquivos TypeScript/TSX aprovados na verificação sintática;
- 89 arquivos da distribuição conferidos por hash;
- 253 arquivos varridos pelo gate de release, 0 segredos;
- build Vite limpa executada, sem erro;
- servidor 3.2.0 e `/healthz` aprovados por HTTP;
- playtest em navegador headless: menu, Central, Rotas, rota pilotada e relatório, com teclado fora do canvas, pausa e retomada por `P`, persistência conferida após recarga, e **zero erros de console ou de página**;
- primeira entrega confirmada em XB$ 10 e 1 km;
- 390 × 844 emulado sem estouro horizontal em nenhum estado;
- marcador final `VERIFICACAO_OFFLINE_3_2_OK`.

## Limitações assumidas

- Nenhum teste em aparelho móvel real: a passagem em 390 × 844 é viewport emulada.
- Nenhum teste de componente React: `jsdom` não está nas dependências, e o ambiente do vitest é `node`.
- O conversor Python não roda neste pacote, porque `source-assets/original` não o acompanha.
- A renderização do playtest foi por SwiftShader; o resultado prova funcionamento, não desempenho nem fidelidade em GPU real.
- Bicicleta, carros e árvores continuam apenas em `.uasset` e seguem procedurais, inclusive com `?assets=real`.
- Cenário ainda usa arte low-poly provisória, e o mascote raster da tela inicial continua legado.

## Próxima etapa

Homologação visual no navegador de destino e em aparelho móvel real; depois, converter para FBX ou GLB a bicicleta, os carros e as árvores, que hoje são o que impede o pacote real de virar o padrão.

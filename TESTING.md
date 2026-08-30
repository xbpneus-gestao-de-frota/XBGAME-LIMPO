# Testes e validação

Registro reproduzível de como a suíte roda na versão 3.2.0. Todos os comandos partem da raiz do projeto.

## Como os testes rodam

Há dois executores, e eles não se misturam.

| Executor | Alvo | Comando |
| --- | --- | --- |
| `vitest` | `tests/**/*.test.ts` | `corepack pnpm exec vitest run` |
| `node:test` | `security/*.test.mjs` | `node --test security/*.test.mjs` |

`pnpm test` roda os dois em sequência. `vitest.config.ts` limita a coleta a `tests/**/*.test.ts` e usa o ambiente `node`: sem esse recorte, o vitest também recolhia os arquivos `.mjs` destinados ao `node:test` e reportava "No test suite found", deixando a saída vermelha sem defeito nenhum por trás.

Não há browser nem GPU envolvidos. `tests/game/harness.ts` instala um `window` mínimo — o jogo lê `localStorage`, teclado e temporizadores a partir dele — e cria uma cena Babylon completa sobre o `NullEngine`, onde geometria e grafo de cena são reais. O mesmo arquivo grava saves v3 válidos para os testes que precisam de uma campanha adiantada. `harness.ts` só contém infraestrutura: nenhum teste pode falsificar a regra que ele próprio verifica.

### Resultado atual

| Etapa | Resultado |
| --- | --- |
| `vitest run` | **16 arquivos, 110 casos aprovados** |
| `node --test security/*.test.mjs` | **8 aprovados** |

## O que cada arquivo de teste cobre

### Regras da campanha e economia

- **`tests/game/CampaignStore.test.ts`** — 29 casos, o maior arquivo da suíte. Rota inaugural subsidiada uma única vez; bloqueio de contrato duplicado e de veículo ocupado; retrato imutável de duração, recompensa, custo e desgaste; pré-requisitos de veículo e de rota anterior na região anterior; bloqueio abaixo de 15% de condição do pneu; territórios destravados como progresso de missão; vínculo entre rota pilotada, ambiente, composto e economia congelada; recursos iniciais e o primeiro contrato exato; nível 2 pelo laço curto e compra do Pneu Urbano por XB$ 30; os cinco caminhos de peça da bicicleta; segunda bike, Ponto Operacional e automação assalariada em paralelo; moto travada em 19 e comprável em 20. Persistência: envelope v3, migração de v2, contrato do Turbo, restauração de retratos em voo, restauração de rota pilotada sem cobrar duas vezes, plano persistido inválido, save legado hostil, valores negativos, `Number.MAX_VALUE`, missão diária com meta zero, JSON corrompido, armazenamento indisponível ou cheio, e queda para o save anterior válido. Ainda: troca só para veículos adquiridos, pesquisa de pneus com teto de oficina, missão diária paga uma vez, reinício de campanha e a pureza de `previewRoute`.
- **`tests/game/runToEconomy.test.ts`** — a costura mais cara do jogo, e a que faltava. Roda uma rota pilotada inteira dentro do `GameWorld` e confere a economia resultante: custo operacional reservado uma única vez, recompensa bruta fechando com base, coleta e rota perfeita, líquido igual a bruto menos custo, XP, reputação, entregas, distância, desgaste e save recarregado contando a mesma história. O segundo caso cobre o abandono: não reembolsa o custo já mobilizado nem cobra de novo, e não credita XP nem entrega.
- **`tests/game/operations.test.ts`** — abertura de 5/8/15/30 segundos e a pista longa dos demais veículos; os cinco caminhos determinísticos de peça; faixas de durabilidade normal, gasta, crítica e quebrada; lista de objetivos do começo de jogo; tetos de edifício e contrato para Europa; contagem lógica de rodas coerente com o visual de oito rodas; regra única de capacidade; teclas aceitas apenas em contexto de corrida; perfis de terreno, clima e composto; custo operacional auditável; condição ruim mais lenta e menos lucrativa; missões impossíveis filtradas no fim da campanha; e equivalência de tempo e pontuação a 30, 60 e 120 FPS.
- **`tests/game/rewards.test.ts`** — primeiro contrato pequeno e auditável, teto do bônus agregado em metade do contrato-base, crescimento com a maturidade do contrato e do veículo, neutralização de entradas hostis, pagamento só quando a rota foi elegível e ausência de valores negativos ou infinitos.
- **`tests/game/progression.test.ts`** — guarda de regressão da curva de XP. Verifica que ela é estritamente crescente nos 500 níveis, que a abertura 1..30 é idêntica à quadrática original, que a virada no nível 30 não cria degrau, que o total ao nível 500 fica abaixo de 120.000 e de um terço da curva antiga, e que `companyLevelFromXp` é consistente com `companyXpRequiredForLevel` nas bordas.
- **`tests/game/routeSelection.test.ts`** — oferece rota repetível enquanto a próxima está travada por melhoria, e avança assim que a nova fica pronta.
- **`tests/game/emergencyMaintenance.test.ts`** — mantém um contrato subsidiado disponível com zero de caixa e impede o softlock de caixa zero com condição crítica.

### Mundo 3D e apresentação

- **`tests/game/roadSurface.test.ts`** — guarda de regressão das árvores flutuantes. Constrói a pista de verdade sobre o `NullEngine` e inspeciona o grafo de cena: a marca `xbLayer` sobrevive ao `MergeMeshes`, cada um dos nove segmentos contribui com superfície, cenário e bairro não são marcados como pista, parques e pontos de ônibus continuam filhos do próprio segmento com seus componentes, e a árvore do parque viaja junto com o asfalto em vez de ficar parada com a matriz de mundo assada.
- **`tests/game/realAssets.test.ts`** — materialização dos arrays FBX em malhas Babylon, troca da pista procedural pela real com restauração completa no `dispose()`, queda para o modo procedural com manifesto desconhecido e ausência de malhas órfãs quando manifesto e binário estão fora de sincronia.
- **`tests/game/goldenRouteLayout.test.ts`** — curva à direita, curva à esquerda e chegada centralizada; antecipação de câmera para o lado correto de cada curva e reduzida em telas verticais; determinismo e proteção de entradas inválidas; catálogo de módulos cobrindo bairro, comércio, ônibus, praça e destino, com ciclo repetido e índice inválido protegido.
- **`tests/game/neighborhood.test.ts`** — curvas abrindo para os dois lados, deslocamento e guinada dentro do limite em toda a rota, intensidade só dentro do intervalo válido, catálogo com casas, praças e pontos de ônibus e sem veículos, acúmulo de distância e reinício por rota, pose plana fora do cenário urbano, distribuição de travessias, acessos e luzes, e loteamento determinístico acima do solo e sem amarelo.
- **`tests/game/deliveryExperience.test.ts`** — limite de progresso e passagem por todas as fases, avanço sem saltos, tom cinematográfico só na reta final, preservação da fase em pausa, aproximação e liberação do destino, e câmera sem saltos nem valores inválidos.
- **`tests/game/minimap.test.ts`** — origem, destino e entradas travadas; interpolação dentro da moldura e determinística; avanço monotônico; caminho SVG utilizável para rota e ruas.
- **`tests/game/TurboVisual.test.ts`** — transformação em todos os veículos sem alterar colisão nem vazar recursos, e rota acelerada com quebra de obstáculos e bônus de Rota Perfeita.

### Preferências locais

- **`tests/game/quality.test.ts`** — modo Automático inicial, valores armazenados inválidos ignorados, os quatro rótulos em português na ordem do produto, persistência, recomendações para hardware limitado, celular comum e desktop capaz, prioridade da escolha manual, resolução do modo Automático em perfil concreto, tradução do perfil persistido para o Babylon e falha segura sem armazenamento.
- **`tests/game/feedback.test.ts`** — som e vibração desligados por padrão, controles validados e dados malformados recusados, ambos os canais bloqueados em pausa ou aba oculta, vibração suprimida sob movimento reduzido sem silenciar o som, nenhum áudio criado antes do opt-in explícito, desbloqueio do Web Audio depois dele, atomicidade da preferência e fechamento do contexto sintético no descarte.

### Segurança e configuração

`security/config.test.mjs`, sob `node:test`, cobre oito contratos:

1. Node, pnpm e Vite fixados, nenhuma dependência direta com faixa ou tag, e a ordem do portão `verify` — `build` antes de `release:check` e de `dist:integrity`, com `test` presente.
2. Servidores de desenvolvimento e preview restritos ao loopback.
3. CSP restritiva: `default-src`, `frame-ancestors`, `object-src`, `base-uri`, `script-src`, `connect-src` e `form-action`, sem `unsafe-eval` em nenhuma diretiva e sem script inline.
4. Cabeçalhos de transporte e isolamento: HSTS de pelo menos um ano com `includeSubDomains`, `nosniff`, `no-referrer`, `same-origin` nas duas políticas de origem cruzada e `X-Frame-Options: DENY`.
5. O servidor em execução envia de fato todos os cabeçalhos declarados — o teste sobe o servidor numa porta efêmera e confere a resposta.
6. Cache imutável só para caminhos com hash real; `daily-missions.svg`, os WebPs, o pacote `real-v310` e caminhos fora de `/assets/` precisam revalidar; `/`, `index.html` e todos os workers usam `no-store`; o manifesto revalida sempre.
7. O servidor implantado é o autônomo, sem Express, com release 3.2.0 e limites de socket declarados.
8. A entrada do documento carrega apenas `/src/main.tsx`, sem nenhum adaptador histórico, com favicon local e sem bloquear o zoom do usuário.

## Portões estáticos e teste HTTP

```bash
node scripts/verify-offline-release.mjs
```

Executa, nesta ordem, integridade do código-fonte, arquitetura sem adaptadores, sintaxe de 39 arquivos TypeScript/TSX, os 8 testes de segurança, verificação de release, integridade da distribuição e sintaxe do worker ativo e dos dois servidores. Depois sobe `dist/standalone-server.mjs` numa porta efêmera e verifica por HTTP:

| Recurso | Resultado esperado |
| --- | --- |
| `/healthz` | `200`, JSON com `status: ok` e versão 3.2.0 |
| `/` | `200`, HTML com `data-xb-release="3.2.0"` e bundle Vite com hash |
| Cabeçalhos em `/` | CSP, HSTS, `nosniff`, `DENY`, `no-referrer`, COOP, CORP, Permissions-Policy e `X-XBPNEUS-Release` |
| `/manifest.webmanifest` | `200` com `application/manifest+json` |
| `/sw-v320.js` | `200` com `Cache-Control: no-store` |
| `/sw-v310.js` | `200` e conteúdo de lápide, com `self.registration.unregister()` |
| `/assets/real-v310/assets.bin` | `Accept-Ranges`, `ETag` e `Last-Modified` |
| `If-None-Match` e `If-Modified-Since` | `304` |
| `Range: bytes=0-1023` | `206`, `Content-Range` válido e corpo de 1024 bytes |
| `/assets/nao-existe.js` | `404` sem cair no fallback da SPA |
| `/assets/nao-existe%2Ejs` | `404`: a extensão só aparece depois de decodificar |
| `/rota/primeiro-pedal` | `200` com o shell da SPA |

Marcador final: `VERIFICACAO_OFFLINE_3_2_OK`.

Apesar do nome, esta rotina não compila nada e não sobe o Vite: ela exige um `dist/` já construído e o pacote `typescript` resolvível, usado por `scripts/typescript-syntax-check.mjs`.

## Portão completo

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm verify
```

`verify` encadeia `lint`, `build`, `test`, `dist:integrity` e `release:check`. A ordem é parte da correção: até a 3.1 o verificador de release exigia, dentro de `dist/public`, arquivos que o `vite build` apagava, e o portão não tinha como passar.

## O que continua sem cobertura automatizada

- **Componentes React.** Nenhum arquivo em `tests/` monta um componente. O ambiente do vitest é `node`, e nem `jsdom` nem `happy-dom` nem `@testing-library` estão nas dependências do projeto. Foco, ARIA, armadilha de foco dos diálogos, layout responsivo e a linha de instrução dos controles continuam dependendo de inspeção manual ou de playtest em navegador.
- **Conversor Python.** `scripts/tests/test_convert_real_assets.py` executa `scripts/convert_real_fbx_assets.py` contra `source-assets/original`. Esse diretório não acompanha este repositório, então o teste não roda aqui. O pacote já convertido em `assets/real-v310` continua coberto pelo lado do carregador, em `tests/game/realAssets.test.ts`.
- **Hardware móvel real.** Não há teste em aparelho físico. Presets gráficos, vibração, áreas seguras e desempenho em GPU móvel seguem sem verificação executada.
- **Renderização perceptiva.** O `NullEngine` valida geometria e grafo de cena, não pixels. Cor, iluminação, z-fighting residual e legibilidade do HUD continuam exigindo olho humano no navegador de destino.

## Matriz de homologação recomendada

Antes de publicar, execute `pnpm verify` no Node `22.18.0` e confira os modos de inspeção em pelo menos:

- desktop de 1440 × 900;
- celular de 390 × 844;
- celular em paisagem de 844 × 390;
- teclado, toque e preferência de movimento reduzido;
- `?assets=real` e sem o parâmetro, comparando pista e ciclista.

A CI incluída fixa Node `22.18.0`, ativa Corepack, usa o lockfile congelado e executa `pnpm verify`. A auditoria de dependências roda antes, mas não bloqueia: um aviso novo em dependência transitiva não deve travar um commit intocado.

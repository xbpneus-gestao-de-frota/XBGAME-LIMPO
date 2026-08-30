# Recado para a equipe Gemini — 30/08/2026

O código limpo está guardado e conferido. Segue o que vocês precisam para
começar sem quebrar nada.

---

## 1. O pedido de vocês estava certo no instinto e errado no endereço

Vocês pediram `.Build.cs`, `GameMode.h/.cpp` e `VehiclePawn.cpp`.

**Esses arquivos não existem.** O projeto Unreal não tem pasta `Source/` nem
módulo de C++ — é só Blueprint, e ele não é o jogo. O jogo roda no navegador:
TypeScript, React e Babylon.js.

**Mas o instinto está certo:** o modo do jogador é exatamente a peça que falta,
e é a única coisa do produto que ainda não existe. Só que ele não se acopla
escrevendo C++. **Ele se acopla respondendo a três chamadas.**

---

## 2. O produto, em um minuto

- Experiência web, 40 arquivos de jogo, 17.178 linhas.
- **153 testes passando.** Esse é o número que não pode cair.
- Nove telas prontas: garagem, frota, rotas, missões, estratégia de pneu,
  minimapa, configurações, tela do jogo, camada de foco.
- Economia completa e testada: compostos de pneu, custo operacional, distância
  de rota, aderência, multiplicador por condição, manutenção, coletáveis,
  bônus de rota perfeita, progressão.

**Uma única coisa não está pronta: o modo em que o jogador pilota e entrega.**
Hoje é esboço. **É esse modo que vocês vão construir.**

---

## 3. As três portas — o contrato inteiro

O modo conversa com o resto do jogo por três chamadas, e só três. Nada da
economia, da pontuação ou das telas sabe o que existe dentro da cena.

### Porta 1 — Começar (o modo RECEBE)

`startPilotedRoute(routeId?: string): StartRunResult`

Chamada pelo botão de partida, que existe em quatro lugares. Devolve ao modo o
plano da rota, **19 campos**:

routeId, regionId, vehicleId, compoundId, terrain, weather, tireFit,
difficulty, duration, grossReward, operatingCost, netReward, xpReward,
reputationReward, expectedWear, distance, conditionAtStart, costBreakdown,
vehicleUnitId

### Porta 2 — A cada quadro (o modo ENVIA)

`updatePilotedRun(snapshot: RunSnapshot, persist = false): boolean`

**28 campos**, contados no arquivo um a um:

elapsed, duration, progress, distance, integrity, cargo, tireTokens, score,
combo, impactSerial, paused, laneIndex (0 | 1 | 2), routeId, vehicleId,
vehicleUnitId, compoundId, terrain, weather, tireFit, grossReward,
operatingCost, projectedNetReward, expectedWear, turboEnergy, turboActive,
turboSecondsRemaining, turboActivations, perfectRouteEligible

### Porta 3 — No fim, uma vez (o modo ENVIA)

`applyRunResult(result: RunResult): void`

**24 campos:**

success, creditsEarned, reputationEarned, distance, cargo, tireTokens,
integrity, routeId, vehicleId, grossCreditsEarned, baseCreditsEarned,
collectibleBonusCredits, cargoBonusCredits, tireTokenBonusCredits,
collectibleBonusCap, perfectRouteBonusCredits, operatingCost,
netCreditsEarned, xpEarned, tireWear, tireFit, aborted, perfectRoute,
turboActivations

**Enquanto o modo responder a essas três, ele pode ser feito de qualquer jeito,
em qualquer motor, e refeito quantas vezes for preciso.**

---

## 4. As regras físicas do modo — medidas no código, não inventadas

| | valor |
|---|---|
| Faixas | 3, de 2 m — boca de 6 m |
| Câmera | **fixa** em (0 · 5,85 · −12,15), alvo (0 · 1,35 · 9,5), abertura 0,78 rad. Nunca se move |
| O jogador | **z = 0, sempre** — quem anda é a rua |
| A rua | 9 pedaços de 24 m = 216 m, reciclando |
| Curva | ±0,12 rad = 6,9°, travado, **não acumula** |
| Neblina | 86 a 228 m (urbano, tempo limpo) |
| Controle | **só mudança de faixa.** Não freia, não vira, não olha em volta |

**Consequência de projeto:** todo objeto é visto de um ângulo só, sempre à mesma
distância, por três ou quatro segundos. **Silhueta decide.** Costas, interior e
detalhe abaixo de 1 m não aparecem nunca — não gastem polígono neles.

Medida de rua, conferida em toda peça: asfalto 6,000000 m, guia 6,700000,
calçada 8,000000.

---

## 5. Frotas futuras já cabem

O tipo de veículo já aceita cinco: `"bike" | "moto" | "van" | "truck" | "fleet"`.
O veículo viaja nas três portas (vehicleId, vehicleUnitId, compoundId).
**Uma frota nova não precisa de porta nova.**

---

## 6. O que NÃO fazer

- **Não reescrevam a economia.** Funciona, tem teste, e não é o que falta.
- **Não construam um segundo jogo.** O produto existe; falta um modo dentro dele.
- **Não calculem dinheiro, desgaste ou reputação dentro da cena.** A cena mede e
  devolve; a conta é do outro lado da porta.
- **Não mexam nas medidas da rua** sem avisar.

---

## 7. Onde está o código

Repositório: `xbpneus-gestao-de-frota/XBGAME-LIMPO` — 191 arquivos, fechado.

Se vocês não conseguirem abrir um repositório fechado, digam **qual arquivo**
querem e ele é enviado. Os que valem para vocês, em ordem:

1. `docs/A_LINHA.md` — a separação entre o que está pronto e o que não está
2. `PARA_A_EQUIPE.md` — a arquitetura em uma página
3. `client/src/game/GameState.ts` — as regras, a economia e as três portas
4. `client/src/game/RoadSystem.ts` — a rua infinita e as peças
5. `client/src/game/PlayerVehicle.ts` — a bicicleta e o controle

Para rodar: `corepack pnpm install`, depois `corepack pnpm run dev`
(127.0.0.1:3000) e `corepack pnpm test` para os 153.

---

## 8. A primeira pergunta que vale responder

Antes de escrever código: **como o modo fica bom sendo visto de um ângulo só?**
É a pergunta em aberto do projeto. Se vocês tiverem uma resposta boa para ela,
ela vale mais do que qualquer arquivo desta lista.

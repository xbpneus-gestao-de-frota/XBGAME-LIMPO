# Para a equipe Gemini — o que vocês pediram e o que a gente tem

Escrito em 28/08/2026, depois de reler o pedido com o quadro completo.

---

## O pedido de vocês estava certo no instinto e errado no endereço

Vocês pediram `.Build.cs`, `GameMode.h/.cpp` e `VehiclePawn.cpp` para "acoplar o
Game Mode".

**Os arquivos não existem** — o projeto Unreal não tem pasta `Source/` nem
módulo de C++; é só Blueprint. **Mas o instinto está certo:** o Game Mode do
jogador é exatamente a peça que falta, e é a única coisa do projeto que ainda
não existe.

Só que ele não se acopla escrevendo C++ num projeto Unreal. **Ele se acopla
respondendo a três chamadas.**

---

## O jogo, em um minuto

O produto é uma experiência web: React + Babylon.js, 40 arquivos, 17.178 linhas,
**141 testes passando**. Nove telas prontas — garagem, frota, rotas, missões,
estratégia de pneu, minimapa, configurações.

**Uma única coisa não está pronta: o modo em que o jogador pilota e entrega.**
Hoje é esboço — casas de 12 triângulos, quatro das cinco peças de rua sem nada
em cima, calçada sem gente.

**É esse modo que vocês vão construir.**

---

## As três portas — o contrato inteiro

O modo conversa com o resto do jogo por três chamadas, e só três. Nada da
economia, da pontuação ou das telas sabe o que existe dentro da cena.

### 1. Começar — aqui o modo RECEBE

```ts
startPilotedRoute(routeId?: string): StartRunResult
```

Chamado pelo botão de partida, que existe em quatro lugares. Devolve ao modo
**o plano da rota (19 campos)** e **o retrato inicial**, e a partir daí o
retrato é do modo:

`routeId` `regionId` **`vehicleId`** `compoundId` `terrain` `weather` `tireFit`
`difficulty` `duration` `grossReward` `operatingCost` `netReward` `xpReward`
`reputationReward` `expectedWear` `distance` `conditionAtStart` `costBreakdown`
`vehicleUnitId`

### 2. A cada quadro — o modo ENVIA

```ts
updatePilotedRun(snapshot: RunSnapshot, persist = false): boolean
```

**28 campos** (contados no arquivo, um a um):

`elapsed` `duration` `progress` `distance` `integrity` `cargo` `tireTokens`
**`score`** `combo` `impactSerial` `paused` **`laneIndex` (0 | 1 | 2)**
`routeId` `vehicleId` `vehicleUnitId` `compoundId` `terrain` `weather`
`tireFit` `grossReward` `operatingCost` `projectedNetReward` `expectedWear`
`turboEnergy` `turboActive` `turboSecondsRemaining` `turboActivations`
`perfectRouteEligible`

### 3. No fim, uma vez — o modo ENVIA

```ts
applyRunResult(result: RunResult): void
```

**24 campos:**

`success` `creditsEarned` `reputationEarned` `distance` `cargo` `tireTokens`
`integrity` `routeId` `vehicleId` `grossCreditsEarned` `baseCreditsEarned`
`collectibleBonusCredits` `cargoBonusCredits` `tireTokenBonusCredits`
`collectibleBonusCap` `perfectRouteBonusCredits` `operatingCost`
`netCreditsEarned` `xpEarned` `tireWear` `tireFit` `aborted` `perfectRoute`
`turboActivations`

> **Correção de 28/08.** Uma versão anterior deste documento dizia 26 campos no
> retrato. **São 28.** Recontei no arquivo, campo por campo. E o sentido: os
> 28 e os 24 são o que o modo **envia**; o que ele **recebe** é o plano de 19
> campos mais o retrato inicial.

**Enquanto o modo responder a essas três, ele pode ser feito de qualquer jeito,
em qualquer motor, e refeito quantas vezes for preciso.** A economia inteira
continua funcionando e os 141 testes continuam passando.

---

## Sobre frotas terrestres e estelares — já cabe

Vocês perguntaram sobre frotas futuras. **O contrato já carrega o veículo nas
três portas** — `vehicleId`, `vehicleUnitId` e `compoundId` aparecem no plano,
no retrato e no resultado.

E o tipo de veículo já aceita cinco:

```ts
type VehicleId = "bike" | "moto" | "van" | "truck" | "fleet"
```

**Uma frota nova não precisa de porta nova.** Ela entra pelo mesmo caminho: o
plano diz qual veículo é, o modo pilota conforme a física daquele veículo, e o
resultado volta pelo mesmo lugar. A economia já sabe cobrar manutenção, calcular
desgaste e aderência por composto e ajustar receita por condição — para todos.

---

## As regras físicas do modo — medidas no código, não inventadas

| | valor |
|---|---|
| Faixas | **3, de 2 m** — boca de 6 m |
| Câmera | **fixa** em (0 · 5,85 · −12,15), alvo (0 · 1,35 · 9,5). Nunca se move |
| Abertura | 0,78 rad |
| O jogador | **z = 0, sempre** — quem anda é a rua |
| A rua | **9 pedaços de 24 m = 216 m**, reciclando |
| Curva | **±0,12 rad = 6,9°**, travado, **não acumula** |
| Neblina | 86 a **228 m** (urbano, tempo limpo) |
| Controle | **só mudança de faixa.** Não freia, não vira, não olha em volta |

**Consequência de projeto:** todo objeto é visto de um ângulo só, sempre à mesma
distância, por três ou quatro segundos. Silhueta decide; costas, interior e
detalhe abaixo de 1 m não aparecem nunca.

---

## O que a gente entrega para vocês, pronto

| | |
|---|---|
| **Repositório limpo** | 3,9 MB, 184 arquivos, sem saída de compilação |
| **16 peças 3D prontas** | 2 bairros, 6 moradores, 5 peças de rua, 1 anel de horizonte |
| **O entregador** | com esqueleto de 24 ossos e 3 animações |
| **A mascote** | com esqueleto compatível — herda as mesmas animações |
| **141 testes** | o que vocês não podem quebrar |
| **A régua de asset** | o que serve, o que não serve, e o teto de peso |

Peça de rua tem **6 metros de boca**: asfalto 6,000000, guia 6,700000, calçada
8,000000. Toda peça é conferida contra esses números.

---

## O que NÃO fazer

- **Não reescreva a economia.** Ela funciona, tem teste, e não é o que falta.
- **Não construa um segundo jogo.** O produto existe; falta um modo dentro dele.
- **Não calcule dinheiro, desgaste ou reputação dentro da cena.** A cena mede e
  devolve; a conta é do outro lado da porta.

---

## Como começar

```
corepack pnpm install
corepack pnpm run dev     # 127.0.0.1:3000
corepack pnpm test        # os 141
```

Leiam `docs/A_LINHA.md` (a separação) e `PARA_A_EQUIPE.md` (a arquitetura) antes
da primeira linha.

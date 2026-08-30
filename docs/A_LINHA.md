# A linha entre o que está pronto e o que não está

Decisão do Fernando, 28/08/2026: **separar a lógica e as telas prontas do modo
de jogo controlado pelo usuário.** O foco agora é a matemática, a pontuação e o
botão de partida. O modo pilotado ainda está sendo desenhado.

Este documento existe para que **os dois lados possam andar sem esperar um pelo
outro**.

---

## A boa notícia: a linha já existe no código

O modo pilotado conversa com o resto do jogo por **três portas, e só três**.
Nenhuma parte da economia, da pontuação ou das telas sabe o que acontece dentro
da cena 3D.

| | porta | quem chama |
|---|---|---|
| **1. Começar** | `startPilotedRoute(routeId)` | o botão, em 4 lugares |
| **2. Enquanto roda** | `updatePilotedRun(snapshot)` | o modo, a cada quadro |
| **3. Terminar** | `applyRunResult(result)` | o modo, uma vez |

**Enquanto o modo responder a essas três portas, ele pode ser refeito quantas
vezes for preciso** — em Babylon, em Unreal, em nada — sem tocar num único
número da economia.

---

## O que o modo precisa devolver

### Durante a corrida — o retrato

Distância, tempo decorrido, duração prevista, progresso, integridade, carga,
fichas de pneu, **pontuação**, combo, série de impactos, pausa, **faixa atual
(0, 1 ou 2)**, e o estado do turbo (energia, ativo, segundos restantes,
ativações).

### No fim — o resultado

Sucesso ou não, créditos, reputação, distância, carga, fichas, integridade,
desgaste do pneu, aderência do pneu, abortado, rota perfeita, ativações de
turbo, e a quebra do pagamento: bruto, base, bônus de coletáveis, bônus de
carga, bônus de fichas, bônus de rota perfeita, custo operacional, líquido.

**São 24 números no resultado e 26 no retrato.** Quem construir o modo novo
precisa saber devolver esses, e nada além disso.

---

## O lado pronto — pode andar sozinho a partir de agora

- **Nove telas**: garagem, rotas, missões, estratégia de pneu, minimapa,
  configurações, tela do jogo, camada de foco, tratamento de erro.
- **A economia**, em módulos separados que não conhecem cena 3D nenhuma:
  compostos de pneu, custo operacional, distância de rota, aderência,
  multiplicador por condição, custo de manutenção, recompensa por coletável,
  bônus de rota perfeita, progressão.
- **141 testes** cobrindo isso.

**Nada disso depende do modo pilotado estar bonito.** Pode ser afinado, testado
e publicado hoje.

---

## O lado não pronto

O modo controlado pelo usuário. Existe **o código do que vai ser** e uma cena de
caixas: as casas têm 12 triângulos, quatro das cinco peças de rua não têm nada
em cima, e a calçada não tem gente. **É esboço, e está sendo desenhado.**

---

## A regra que mantém a linha

1. **A economia nunca importa nada da cena 3D.** Se um módulo de conta precisar
   saber onde está a bicicleta, a linha foi cruzada.
2. **A cena nunca calcula dinheiro, desgaste ou reputação.** Ela mede o que
   aconteceu e devolve pelas três portas.
3. **Trocar o modo não pode quebrar teste de economia.** Se quebrar, havia
   acoplamento escondido.
4. **O botão de partida é o mesmo, sempre.** Seja qual for o modo por trás.

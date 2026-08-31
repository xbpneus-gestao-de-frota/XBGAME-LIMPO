# Onde salvar os assets — o caminho de uma peça até dentro do jogo

Escrito em 31/08/2026, com tudo medido nos arquivos, não de memória.
Vale para as peças do **modo de entrega controlado pelo jogador**, que é o que
estamos recriando.

---

## As três paradas

Uma peça passa por três lugares, e cada um tem uma função diferente.

| | pasta | para quê |
|---|---|---|
| **1. Entrega** | `MeuProjeto2/_entrega/` | onde você exporta do Unreal. Já é o que você faz — mantenha |
| **2. Original** | `assets-source/glb/` (no repositório) | o arquivo cheio, guardado e versionado. Nunca é lido em execução |
| **3. Execução** | `client/public/assets/glb/` (no repositório) | **o único lugar que o jogo lê.** Servido como `/assets/glb/` |

Repositório: `xbpneus-gestao-de-frota/XBGAME-LIMPO`.

---

## A regra que ninguém adivinha

**Salvar na pasta não coloca a peça no jogo.**

O carregador procura por **nome**, e hoje ele conhece três peças de rua e um
personagem. Uma peça nova, por mais bonita que esteja, fica invisível até o
nome dela entrar na lista do carregador — duas linhas em
`client/src/game/GltfAssetRuntime.ts`.

Nomes que o jogo procura hoje, **exatamente assim** (maiúscula conta):

```
XB_Road_Straight.glb    a reta
XB_Road_Cross.glb       o cruzamento
XB_Road_T.glb           o T
entregador_web.glb      o entregador
```

---

## O encaixe da rua — medido, não estimado

| | valor |
|---|---|
| Ladrilho | **8 × 8 m**. Três por segmento, em z = −8, 0 e +8 |
| Escala | **1 m do asset = 2,3 unidades** do jogo em x e y; em z, escala nativa |
| Altura do asfalto | topo em y = **−0,08** |
| Boca da rua | asfalto **6,000000** · guia **6,700000** · calçada **8,000000** |
| Cruzamento, T e rotatória | mesmo encaixe da reta, com o asfalto ocupando o ladrilho inteiro |

Toda peça é conferida contra esses três números antes de entrar. Peça que não
bate é devolvida — não é implicância, é o que impede a emenda aparecer.

---

## O personagem

| | valor |
|---|---|
| Altura útil | 1,80 m = **4,14 unidades**. O jogo mede e reescala sozinho |
| Onde monta | no nó `player-vehicle`, deslocado (0 · 0,14 · −0,15) |
| Animações | nome exato, minúsculo: **idle**, **pedal**, **walk** |
| Referência | o entregador atual: 13.903 triângulos, 9.468 vértices, 1 material, as três animações |

A mascote usa o mesmo esqueleto e herda as mesmas animações.

**Peso mede-se em vértice, não em triângulo.** Foi medido: a proporção real é
de 2,27 a 2,39 vértices por triângulo. Qualquer teto que eu tenha dado em
triângulo antes está errado e não vale.

---

## Formato

- **`.glb`** — binário, tudo dentro de um arquivo só.
- **Textura em webp** é aceita (`EXT_texture_webp`). O entregador e os dois
  quarteirões já usam.
- **Recorte de folha e vidro: alfa em MASK, nunca BLEND.**
- Um atlas compartilhado para folhagem e fachada, em vez de um por peça.

---

## O que já está entregue e ainda NÃO entrou no jogo

Isto é o estoque parado. Dez peças prontas e uma imagem, medidas agora:

| peça | triângulos | vértices |
|---|---|---|
| XB_Road_Bend10 | 420 | 684 |
| XB_Road_Bend25 | 700 | 1.140 |
| XB_Quarteirao_01 | 1.848 | 5.424 |
| XB_Quarteirao_02 | 2.112 | 6.216 |
| XB_Cidadao_01 a 06 | ~988 cada | ~2.260 cada |
| XB_Anel_Horizonte | imagem | — |

**Este é o trabalho mais barato que existe no projeto:** a peça já está pronta,
falta o nome entrar na lista e a posição ser definida. Antes de modelar
qualquer coisa nova, vale gastar o tempo aqui.

---

## Antes de entregar, confira

A pasta `_entrega/` já tem os conferidores:
`conferir.js`, `conferir_quarteirao.js`, `conferir_cidadao.js`, `conferir_anel.js`.

Rode o que corresponde à peça. Se ele reclamar da medida, a peça não sai da
pasta.

---

## O que não fazer

- **Não salve direto em `client/public/assets/glb/`** sem passar pelo original.
  Se a peça precisar ser refeita, o arquivo cheio é o que salva o dia.
- **Não mude as medidas da boca** sem avisar — elas estão gravadas em teste.
- **Não gaste polígono em costas, interior e detalhe abaixo de 1 m.** A câmera
  é fixa: cada objeto é visto de um ângulo só, à mesma distância, por três ou
  quatro segundos. **Silhueta decide.**

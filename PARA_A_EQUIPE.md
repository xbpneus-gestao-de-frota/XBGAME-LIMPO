# Leia isto antes de tocar no código

> **CORREÇÃO DO FERNANDO — 28/08.** Eu vinha escrevendo que "o Unreal é fábrica
> de peça". **Está errado, e é pequeno demais.** O que se constrói no Unreal é
> **o modo de jogo da entrega** — a cena inteira em que o jogador pedala e
> entrega: a rua, o bairro, as pessoas, o horizonte, o encaixe entre eles. Não
> são adereços soltos; é o modo.
>
> O jogo é o produto todo — garagem, frota, pneus, rotas, missões, economia,
> nove telas. **O modo de entrega é um modo dentro dele**, e é esse modo que
> está sendo construído no Unreal e roda no navegador.
>
> Consequência prática: esquina careca, casa de caixa e calçada sem gente **não
> são falta de enfeite. São o modo de jogo incompleto.**


Escrito para quem está chegando agora no projeto. **Um mal-entendido aqui custa
semanas**, então vale um minuto.

---

## O que este projeto é

**O jogo jogável é este, e ele roda no navegador.** TypeScript, React e Babylon.js.

| | |
|---|---|
| Código do jogo | **40 arquivos, 17.178 linhas** em `client/src/` |
| Testes | **23 arquivos, 4.312 linhas** em `tests/` |
| Peso do projeto | **3,9 MB**, 184 arquivos versionados |
| Publicação | `render.yaml` — já configurado, publica direto do repositório |

Para rodar, três comandos:

```
corepack pnpm install
corepack pnpm run dev          # abre em 127.0.0.1:3000
corepack pnpm test             # a suíte inteira
```

---

## Não existe projeto C++ de Unreal aqui

A equipe pediu três arquivos: `.Build.cs`, `GameMode.h/.cpp` e
`VehiclePawn.cpp`. **Nenhum dos três existe, e não é descuido.**

O projeto Unreal (`MeuProjeto2`) **não tem pasta `Source/`** e o `.uproject`
não declara módulo de C++ nenhum. É um projeto **só de Blueprint**, e ele não é
o jogo.

**O Unreal aqui é fábrica de peça, não motor.** Ele existe para modelar rua,
casa, cidadão e cenário, assar a textura e exportar `.glb`. O jogo carrega esses
`.glb` e roda no navegador. Foi decisão do Fernando, e é o que faz o jogo caber
no celular.

Se alguém começar a montar Game Mode em C++ no Unreal, estará **construindo um
segundo jogo diferente** — e jogando fora a bicicleta, o sistema de rua, o ciclo
de entrega e os 4.312 linhas de teste que já funcionam.

---

## O que corresponde ao que a equipe pediu

| pediram | aqui é | o que faz |
|---|---|---|
| `.Build.cs` | `package.json` + `vite.config.ts` | dependências e compilação |
| `GameMode.h/.cpp` | `client/src/game/GameState.ts` (2.308 linhas) | as regras: corrida, entrega, desgaste, dinheiro |
| | `client/src/game/missions.ts` | as missões |
| | `client/src/game/simulation.ts` | o passo de simulação |
| `VehiclePawn.cpp` | `client/src/game/PlayerVehicle.ts` (2.263 linhas) | a bicicleta e o controle |
| | `client/src/game/RoadSystem.ts` (1.458 linhas) | a rua infinita, as peças e os atores |
| a cena | `client/src/game/scene.ts` | câmera, luz, neblina |
| carregar as peças | `client/src/game/GltfAssetRuntime.ts` | lê os `.glb` que vêm do Unreal |

**Não peça para colar esses arquivos no chat.** `GameState.ts` sozinho tem 2.308
linhas. Clone o repositório.

---

## Como o jogo funciona, em um parágrafo

A bicicleta **não sai do lugar**: fica em z = 0 e a rua desliza por baixo. São
**9 pedaços de 24 metros** que reciclam — quem passa do jogador volta para o fim
da fila. A câmera é **fixa**, atrás e acima, e nunca se move. Só existe **mudança
de faixa** — não freia, não vira, não escolhe para onde olhar. A curva é feita
empurrando cada pedaço para o lado e girando um pouco, e é **travada em 6,9°**.
O jogador pega uma entrega numa loja e leva até um cidadão no portão.

Quem entender esse parágrafo entende a arquitetura inteira.

---

## O que não fazer

- **Não reescreva em outro motor.** O que existe funciona e tem teste.
- **Não guarde `dist/`.** É gerado por `pnpm run build`, e já está no `.gitignore`.
- **Não crie outra cópia da pasta para versionar.** Existiam sete. Use branch.
- **Não mexa nas medidas da rua** sem avisar: asfalto 6,000000 m, guia 6,700000,
  calçada 8,000000. Toda peça vinda do Unreal é conferida contra esses números.

## Onde está a conversa

A colaboração com o lado do Unreal fica em
`UnrealProjects/fernando rodovia/MeuProjeto2/_equipe/` — diário, acompanhamento
e o contrato de entrega das peças. **Comece pelo `O_JOGO.md`**: ele diz que tipo
de jogo é este e o que serve de asset.

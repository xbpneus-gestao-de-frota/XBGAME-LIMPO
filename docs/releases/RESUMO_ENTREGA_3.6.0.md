# Resumo da entrega 3.6.0

## O que é esta versão

A 3.5.0 foi entregue e depois submetida a uma revisão independente: quatro
leituras separadas do código, cada uma com um foco diferente, mais uma bateria
de sabotagem controlada — 32 defeitos plausíveis plantados um a um no código
para medir quantos os testes pegavam.

A revisão encontrou defeitos reais. Sete deles o jogador via na primeira
corrida. Esta versão corrige tudo que foi encontrado. **Não há conteúdo novo de
jogo.**

## Como rodar

Duplo clique em `INICIAR_GAME_WINDOWS.bat`, ou:

```
pnpm install
pnpm start
```

O jogo abre em `http://127.0.0.1:3000`. Funciona sem internet depois da primeira
abertura.

Para conferir tudo antes de publicar:

```
pnpm verify
```

Isto agora roda até o fim: formato, tipos, montagem, 141 testes, integridade da
distribuição contra as fontes, conferência de release e, no final, sobe o
servidor de verdade e bate nele. Se qualquer etapa falhar, o comando reprova.

## O que mudou, em uma linha cada

**Você vai notar**

- Um entregador na bicicleta, não dois.
- A bicicleta volta a projetar sombra em todas as corridas, não só na primeira.
- A tela de ajustes aceita clique.
- Esc fecha a pausa.
- O preço de manutenção mostrado é o preço cobrado.

**Você não vai notar, mas paga menos por isso**

- O jogo não é mais rebaixado a "baixar de novo" em 11% dos arquivos.
- Quem instalou o jogo no celular deixa de ficar preso na versão de meses atrás.
- Uma varredura inútil da cena inteira, sessenta vezes por segundo, saiu.
- 311 KB de peças de rua que ninguém carregava e 9,5 KB de estilo morto saíram
  do que é enviado.

**Confiança**

- Antes: os testes pegavam 7 de 32 defeitos plantados. Agora: 32 de 32.
- 113 → 141 testes.
- A conferência de arquivos, que na prática não podia reprovar, agora reprova.
- A integração contínua, que nunca ligava o servidor, agora liga.

## O que continua fora

Prédios, árvores e postes seguem com o disco escuro no chão em vez de sombra
projetada. Foi atacado de novo nesta versão, de cinco maneiras diferentes, e
falhou — o cenário é feito de cópias de um punhado de moldes, e é exatamente
isso que deixa a cidade barata de desenhar. Trocar cópia por peça independente
resolveria a sombra e custaria a cidade.

Ruas laterais, curvas de verdade, a praça como destino e a animação de andar a
pé continuam esperando. Os motivos estão em `VALIDACAO_3.6.0.md`.

## Onde está o detalhe

- `VALIDACAO_3.6.0.md` — o que a revisão encontrou, o que foi feito e o número
  medido antes e depois de cada correção.
- `CHANGELOG.md` — a lista completa.
- `SHA256SUMS_3.6.0.txt` — impressão digital de cada arquivo enviado.

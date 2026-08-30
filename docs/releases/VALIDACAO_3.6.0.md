# Validação 3.6.0 — revisão independente e correção do que ela encontrou

Esta versão não acrescenta conteúdo novo ao jogo. Ela existe porque a 3.5.0 foi
submetida a uma revisão independente — quatro leituras separadas do código, mais
uma bateria de sabotagem controlada dos testes — e a revisão encontrou defeitos
reais, alguns deles visíveis para o jogador na primeira corrida.

## O que a revisão encontrou e o que foi corrigido

### Defeitos que o jogador via

**Dois entregadores na mesma bicicleta.** A partir da primeira corrida, o
boneco antigo (feito de caixas) voltava a aparecer por dentro do entregador
novo. Medido: 0 → 35 peças do boneco antigo ligadas depois de `startRun()`, e
não voltava mais. A guarda que devia detectar a troca comparava o _tamanho_ da
lista de peças, e a lista tinha o mesmo tamanho antes e depois. Agora a guarda
usa a identidade do esqueleto, que morre junto com o veículo.

**A bicicleta parava de projetar sombra.** Mesmo problema, outro lugar: a lista
de quem projeta sombra era refeita só quando a _quantidade_ de peças mudava, e a
primeira peça da lista era sempre a mesma. Medido: a lista caía de 129 para 48
peças na primeira corrida e as 47 peças da bicicleta nunca voltavam. Agora a
lista é refeita inteira a cada dez quadros — custo medido: 0,041 ms.

**A tela de ajustes não aceitava clique.** A camada da interface é transparente
ao mouse por padrão e cada tela precisa se declarar clicável; a tela de ajustes
nunca se declarou. Só o teclado chegava nela. Corrigido, e o resto da interface
foi auditado atrás do mesmo defeito.

**Esc não fechava a pausa.** A tecla era lida duas vezes: a primeira despausava,
a segunda pausava de novo no mesmo instante. Agora a tecla para no painel.

**Clicar fora de uma janela soltava o foco.** Com a janela de ajustes aberta,
clicar na área escurecida jogava o foco para fora e o Esc deixava de funcionar.
Agora o foco volta sozinho para dentro da janela.

**O preço da manutenção mostrado não era o preço cobrado.** Com a bicicleta a
50% e todas as peças no nível 5, o botão dizia XB$ 110 e a loja debitava XB$ 60
— e os dois números apareciam ao mesmo tempo na mesma tela da garagem. O painel
não estava aplicando o desconto das peças. Corrigido: 110 → 60, batendo com o
debitado.

### Defeitos que o jogador não via, mas pagava

**Vazamento quando o acervo falha ao carregar.** Se qualquer peça da rua real
falhasse no meio do carregamento, tudo que já tinha entrado ficava preso na
cena: 14 malhas, 11 materiais e 11 geometrias sem dono, para sempre. E, mesmo no
caminho feliz, o desmonte não liberava animações, esqueleto, materiais nem
texturas. Agora cada peça é registrada no instante em que chega, antes de
qualquer verificação, e o desmonte devolve tudo: 0 sobras em todas as
categorias, medido nos dois casos.

**Varredura da cena inteira a cada quadro.** 835 malhas percorridas com uma
expressão de busca e duas subidas de árvore, sessenta vezes por segundo, só para
descobrir uma coisa que muda quando o veículo troca. Medido: 0,3198 ms por
quadro → 0,0001 ms.

**Corrida em andamento descartada por engano.** Se o desgaste do pneu mudasse
por causa de outra entrega enquanto uma corrida estava em andamento, ao
recarregar o jogo a corrida inteira era jogada fora junto com o custo já
reservado, sem aviso. A comparação de igualdade que causava isso foi removida.

### Entrega e infraestrutura

**11% do jogo era baixado de novo a cada visita.** A regra que marca um arquivo
como definitivo não aceitava traço, e os nomes gerados pelo empacotador têm
traço em cerca de 12% dos casos — inclusive o único arquivo de estilo do jogo.
Medido: 26 de 232 arquivos (288 KB) perdiam a marca. Agora são 232 de 232. A
conferência que devia ter pego isso testava contra um nome inventado sem traço;
agora ela percorre a distribuição de verdade.

**O cache do jogo instalado estava preso na versão 3.2.0.** O nome do cache
estava escrito à mão e não mudava de versão para versão, então um aparelho com o
jogo instalado guardava para sempre a primeira cópia de qualquer arquivo sem
nome versionado. Agora o nome vem da versão, o cache antigo é apagado sozinho, e
o que o servidor não marcou como definitivo é revalidado. Testado com a rede
desligada: o jogo instalado ainda abre.

**A conferência de arquivos nunca podia reprovar.** A montagem gerava a lista de
conferência e a conferência comparava contra a lista que ela mesma tinha acabado
de gerar. Provado: com um arquivo adulterado e um arquivo estranho plantado, ela
aprovava. Agora ela compara a distribuição contra as fontes de onde saiu, e
reprova nos dois casos.

**Metade dos testes não rodava.** O comando apontava para um padrão de arquivo
que não casava com nada, e o programa considera "nenhum arquivo" como sucesso.
Agora um padrão vazio é erro.

**A integração contínua nunca ligava o servidor.** Nenhuma verificação de
cabeçalho, de cache, de faixa de bytes ou de rota inexistente rodava
automaticamente. Agora roda.

**Quatro "conferências" que eram teatro.** Eram expressões de busca atrás do
texto exato de bugs antigos; qualquer um deles de volta com outro nome de
variável passava. Foram substituídas por verificações de verdade ou removidas
com a justificativa escrita.

**Sete peças de rua que ninguém carregava** (curvas, rampas, praça, bifurcação —
311 KB) saíram do que é enviado ao jogador e ficaram guardadas na pasta de
origem, para quando o sistema de traçado aceitar curvas.

**Faxina de tela.** O painel antigo da corrida tinha sido removido do jogo mas
suas regras de estilo continuavam sendo enviadas: 9,5 KB de estilo morto e um
componente que ninguém usava.

## Bateria de testes

A revisão plantou 32 defeitos plausíveis no código, um por vez, e mediu quantos
os testes pegavam. **Sete de 32.** Os 25 que passaram batido incluíam coisas
como: coletar uma entrega no instante em que ela é despachada (dinheiro
infinito), aceitar carga acima da capacidade do baú, o bônus de Rota Perfeita
pago sem turbo e depois de uma batida, a barra de turbo passando de 100%,
obstáculo atravessando o jogador em alta velocidade, o piloto automático
escolhendo a faixa _com_ obstáculo, o servidor entregando um arquivo de fora da
pasta por link simbólico (verificado como explorável de verdade), e todo pedido
condicional respondido com "não mudou" — o que faria o jogador ficar preso na
versão antiga depois de uma atualização.

Os 25 foram fechados com testes de comportamento. Cada teste foi provado: o
defeito foi aplicado, o teste falhou, o arquivo foi restaurado, o teste passou.

A bateria também dependia da data do computador em três lugares — se a
meia-noite caísse no meio do teste, ele quebrava sem motivo. O relógio agora é
fixado.

**113 → 141 testes.**

## Estado medido

|                                             | 3.5.0                                              | 3.6.0      |
| ------------------------------------------- | -------------------------------------------------- | ---------- |
| Testes                                      | 113                                                | 141        |
| Defeitos plantados que os testes pegam      | 7 de 32                                            | 32 de 32   |
| Arquivos com marca de definitivo            | 206 de 232                                         | 232 de 232 |
| Peças enviadas ao jogador (acervo)          | 12 (1,17 MB)                                       | 5 (859 KB) |
| Custo por quadro da varredura do entregador | 0,3198 ms                                          | 0,0001 ms  |
| Sobras na cena ao desmontar o acervo        | 15 materiais, 2 texturas, 1 esqueleto, 3 animações | 0          |
| Erros no console numa partida completa      | 0                                                  | 0          |

## O que continua fora

**Só a bicicleta e o entregador projetam sombra.** Prédios, árvores e postes
continuam com o disco escuro no chão. Isto foi atacado de novo nesta versão e
falhou: com enquadramento fixo largo, com enquadramento em cascata, com a folga
de profundidade corrigida, com o alcance limitado ao que está perto do jogador e
com o contraste no máximo, as cópias do cenário simplesmente não entram na
passada de sombra — e são cópias de um punhado de moldes, que é justamente o que
deixa a cidade barata de desenhar. Trocar cópia por peça independente resolveria
a sombra e custaria a cidade. Fica como está.

Uma correção aproveitada da tentativa: a folga de profundidade é medida na
profundidade inteira do enquadramento, então abrir o enquadramento sem baixar a
folga apaga a sombra rente ao chão. Era isso que fazia a sombra da bicicleta
sumir em todas as tentativas anteriores.

Continuam abertos, como antes: ruas laterais (não cabem — sobram menos de 5
unidades entre a borda da pista e a fila de lotes), curvas de verdade (precisa
redesenhar o sistema de traçado), a praça como destino, a animação de andar a pé
(esperando um momento em que o entregador desça da bicicleta), testes dos
componentes de tela e teste em celular real.

## Como conferir

```
pnpm install
pnpm verify          # formato, tipos, montagem, 141 testes, integridade, release, servidor real
pnpm start           # abre em http://127.0.0.1:3000
```

`pnpm verify` agora termina ligando o servidor distribuído de verdade e batendo
nele: cabeçalhos, cache, retomada de download, rota inexistente. Se qualquer uma
falhar, a verificação reprova.

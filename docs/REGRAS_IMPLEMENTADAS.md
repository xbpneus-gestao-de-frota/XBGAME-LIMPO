# Regras que o jogo aplica hoje — levantamento de 06/09/2026

Leitura do código, não dos comentários. "Ativa" = o jogo rodando executa.
"Morta" = existe no arquivo e nenhum caminho do jogo chama.

## 1. Dinheiro e frete — ATIVO

Frete = fixo + km × valor por km + itens (limitado à capacidade) × valor por item.
Tabela por classe: bicicleta 7,00 / 1,50 / 3 itens / 1,50 · moto 8,00 / 1,80 / 8 / 2,00 ·
van 45,00 / 3,20 / 60 / 1,20 · caminhão 451,84 / 3,9826 / 600 / 0,40 · carreta 657,56 /
6,6718 / 2400 / 0,20.

Nenhuma rota tem prêmio escrito à mão: o valor sai da conta. Primeira entrega paga 10;
a última rota do jogo paga 29.159.

Duração da rota: máximo entre 30 s e 5 + 1,415 × km^0,543.

Multiplicador de receita: 1 + (sede−1)×0,05 + depósito×0,08 + eficiência de pneu×0,08 +
(nível do veículo−1)×0,06. Teto real com tudo no máximo: 2,73×.

Corrida pilotada: integridade multiplica de 0,72 a 1,00; abortar paga 0; falhar paga 18%.
Coletáveis somam até 50% do contrato. Rota perfeita paga +18% (sem impacto, integridade
≥99 e ao menos um turbo).

Repasse ao condutor de 80% existe na tabela e NUNCA é usado em jogo. Só os 15% da
transportadora entram na conta.

## 2. Custo e desgaste — ATIVO

Custo por km vem da mesma tabela, dividido em combustível, mão de obra (15% do valor por
km) e reserva (pneus + manutenção + depreciação).

Terreno multiplica: fora de estrada 1,22 · industrial 1,10 · orbital 1,28.
Pedágio por km: cidade 0 · estado 0,06 · país 0,12 · mundo 0,20.
Pneu certo para o terreno: receita ×1,15, desgaste ×0,72. Pneu errado: receita ×0,88,
desgaste ×1,55.

Clima é sorteado de forma fixa pela data e pela rota — o mesmo dia dá o mesmo clima em
qualquer máquina.

Primeira entrega e a segunda rota têm custo zero. As duas seguintes custam 10% e 12%.

Condição do pneu abaixo de 70 aumenta a duração (até 1,42×) e derruba a receita.
Abaixo de 15 a rota é bloqueada. Manutenção devolve para 100.

Reparo de emergência: só bicicleta, só sem dinheiro e com condição abaixo de 15, devolve
a condição para 40 de graça.

## 3. Contratação — ATIVO NA REGRA, TRAVADO NA PRÁTICA

Preços não são escritos: saem do lucro de uma viagem típica da classe.
Primeira unidade paga e primeira contratação: bicicleta 177 / 243 · moto 975 / 1.341 ·
van 3.242 / 4.458 · caminhão 11.165 / 15.352 · frota 21.422 / 29.455.
Cada nova unidade custa 1,8× a anterior; cada nova contratação 1,65×.

Uma unidade fica sempre com o jogador — não dá para entregar a última para um contratado.

Capacidade da central começa em 5 pontos e cresce 4 por nível do Centro de Rotas.
Cada operador ocupa: bicicleta 1 · moto 1 · van 2 · caminhão 3 · frota 4 · planetário 5.

**PROBLEMA GRAVE:** o motor só reconhece UMA unidade para tudo que não é bicicleta.
Contratar um motoboy ou um motorista de van cria o operador, mas o despacho dele falha
sempre com "nenhuma unidade compatível está livre". Na prática **só dá para contratar
ciclista** — e a espinha do jogo (crescer contratando) trava no fim da fase 1.

Além disso, só existe botão para comprar bicicleta e contratar ciclista. Comprar e
contratar as outras classes existe no motor e não tem tela.

## 4. Nível e desbloqueios — ATIVO

Experiência: até o nível 30 cresce ao quadrado; depois disso a curva abre.
Nível 30 = 1.740 de experiência. Nível 500 ≈ 99.558.

Veículo libera em: moto 20 · van 40 · caminhão 80 · frota 180 · planetário 300.
Custo: moto 780 · van 2.450 · caminhão 6.800 · frota 15.800 · planetário 39.500.
Reputação exigida: 35 · 95 · 220 · 460 · 800.

Região exige cinco coisas ao mesmo tempo: a anterior liberada E com uma rota concluída,
nível, reputação, todos os veículos até o exigido comprados, e o laboratório para as
regiões de outro mundo.

Prédios: sede até 10, garagem 5, oficina 5, depósito 8, centro de rotas 5, laboratório 1
(só no nível 300). Cada nível custa 1,72× o anterior. Nenhum prédio passa da sede, e a
sede não passa de metade do nível da empresa mais um.

Peças da bicicleta: 5 peças × 5 níveis, com tetos — desgaste cai no máximo 55%, custo cai
no máximo 30%, desconto de manutenção no máximo 50%.

## 5. Rota e entrega — ATIVO COM UMA TRAVA

Entregas manuais ao mesmo tempo: 1, sobe para 2 com o Centro de Rotas nível 2 e para 3
no nível 5.

Endereços do bairro: a base é a praça; comércios e casas são numerados pela distância
andando até ela — casa 1 é a mais perto a pé. Igual em toda máquina, sem sorteio.

**PROBLEMA:** a regra de bolsa maior existe (até 6 entregas e 2 coletas por saída, um
pacote a cada 3 kg) mas ninguém informa o tamanho da bolsa ao mapa. Resultado: **toda
rota do bairro é 1 coleta + 1 entrega**, sempre. O "coleta no hospital, entrega nas casas
8, 12 e 34" está escrito e desligado.

## 6. Missões — ATIVO

Três missões por dia, sorteadas pela data (mesma data, mesmas missões).
Tipos: número de entregas, receita, uma melhoria, rotas com o pneu certo, abrir região.
Recompensa: (260 + nível × 90) × fator em dinheiro, mais experiência e reputação.
Missão completa e não coletada é paga sozinha na virada do dia.

## 7. Travas de segurança — ATIVAS

Veículo em rota não pode ser melhorado nem trocar de pneu. Uma rota não roda duas vezes
ao mesmo tempo. A entrega inaugural só acontece uma vez. O save é sanitizado: veículos e
regiões só sobrevivem como sequência contínua, então um save adulterado não pula eras.

## 8. Escrito e desligado

- **Escada da habilitação** (moto: 12 entregas e R$ 900 · van: 40 e 2.600 · caminhão: 120
  e 7.500 · carreta: 300 e 18.000). Existe inteira e nada consulta.
- **Regra de prazo da encomenda** (folga de 2,2×, 12 s parado na porta, bolinha verde/
  amarela/vermelha, devolver a mercadoria e pagar o desgaste mesmo assim): o arquivo
  inteiro está morto. A bolinha na tela do mapa é sempre "no prazo", fixa.
- **Lista dos 6 objetivos de abertura** (primeiro pedal, pneu urbano, mochila, baú,
  segunda bicicleta, primeiro operador): existe e não aparece em tela nenhuma.
- Faixas de condição do veículo (normal / gasto / crítico / quebrado): existem e o jogo
  usa os limites soltos.

## 9. Contradições encontradas

1. **O valor que o jogador vê no mapa do bairro não é o que ele recebe.** A tela mostra
   um pagamento calculado por metros percorridos; a economia paga outra conta. Duas
   moedas para a mesma corrida.
2. **Segunda bicicleta: a tela deixa ter 2, o motor deixa ter até 8.**
3. **Quatro contas diferentes para a mesma corrida de bicicleta** convivem no projeto —
   três estão mortas, mas continuam lá.
4. **Mão de obra cobrada duas vezes quando é o jogador que pilota:** o custo desconta o
   repasse ao condutor mesmo quando não há condutor contratado. O próprio código registra
   isso como decisão em aberto.
5. Preços antigos de segunda bicicleta (180) e primeiro operador (250) continuam no
   arquivo ao lado dos valores que a conta produz hoje (177 e 243).
6. A trava de nível 10 para contratar existe só no botão, não na regra: chamando o motor
   direto, contrata no nível 1.
7. A capacidade da central só é recalculada quando alguém tenta contratar — subir o
   Centro de Rotas não atualiza o número mostrado.

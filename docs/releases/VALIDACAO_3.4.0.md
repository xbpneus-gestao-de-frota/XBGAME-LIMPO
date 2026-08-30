# Validação técnica — XBPNEUS Racing 3.4.0

## Escopo comprovado

- Quatro peças de rua em uso no jogo (reta, cruzamento, T e rotatória) no lugar de uma só. As três novas têm exatamente o mesmo encaixe da reta — 8 × 8 m, asfalto ocupando o ladrilho inteiro — e por isso entraram como troca direta, sem mexer em uma linha do sistema de pista.
- Distribuição determinística: o traçado é idêntico em toda partida e acompanha a reciclagem de segmentos.
- Camada de brilho ligada ao azul XB emissivo, que vinha do material original e não era aproveitado. Desligada automaticamente no preset "Desempenho".

## Verificações executadas

- `pnpm verify`: 113 testes de comportamento, 8 de segurança, build limpa, integridade da distribuição e portão de release — todos aprovados.
- `pnpm verify:offline`: `VERIFICACAO_OFFLINE_OK`.
- Playtest em navegador: rota pilotada com as quatro peças em cena, demonstração planetária (cenário procedural volta) e garagem. **Zero erros de console.**

## Medidas

| | 3.3.0 | 3.4.0 |
| --- | ---: | ---: |
| Peças de rua em uso | 1 | 4 |
| Peças convertidas disponíveis | 11 | 11 |
| Assets embarcados | 1,16 MB | 1,16 MB |
| Chamadas de desenho da pista | 4 | 16 |

O custo de desenho sobe porque cada peça distinta é um lote próprio de instâncias. Dezesseis chamadas para a pista inteira continua sendo uma fração do que o cenário procedural já consome.

## O que ficou de fora, e por quê

- **Ruas laterais.** Entre a borda da pista (|x| 9,2) e a primeira fileira de lotes (|x| 14,2) sobram menos de 5 unidades. Um ladrilho de rua tem 8 de lado: entraria atravessando prédio.
- **Curvas reais (Bend10, Bend25, RampL, RampR).** O percurso é uma reta cujos segmentos são girados ao longo de uma linha de centro. Encaixar uma peça que já vem curvada dobraria a curvatura. Exige mudar o sistema de pista.
- **Praça (Plaza).** Mede 98 × 98 m. Cabe como praça de destino, mas exige repensar o ponto de entrega, que hoje fica à beira da pista.

# Validação técnica — XBPNEUS Racing 3.5.0

## Escopo comprovado

- **Sombra projetada de verdade.** A bicicleta e o entregador projetam sombra no asfalto. Antes nada no jogo projetava sombra: existiam apenas discos escuros presos aos atores.
- **Camada de brilho calibrada.** Céu, sol, nuvens e estrelas passaram a ser excluídos e a intensidade caiu de 0,42 para 0,22. Do jeito anterior, quem jogasse no preset "Qualidade" via o fundo inteiro estourado — defeito que existia desde a 3.4.0 e nunca tinha sido visto, porque o ambiente de teste escolhia sozinho o preset leve.

## Duas causas que custaram caro para achar

**`ScenePerformancePriority.Intermediate` desliga a passagem de sombra em silêncio.** Nenhum erro, nenhum aviso: a sombra simplesmente não é desenhada. O modo passou a ser escolhido conforme as sombras estejam ligadas ou não.

**Malha-fonte de instância desligada não participa da avaliação de luz.** Os ladrilhos da rua eram todos instâncias de uma malha escondida; por isso nenhum recebia sombra. Agora o primeiro ladrilho de cada peça é a malha original, visível, e os demais são instâncias dela.

## Como as sombras foram desenhadas

O jogador fica parado e o mundo passa por ele, então uma única projeção ancorada na origem cobre para sempre a área que importa — e por isso o mapa pode ser pequeno (1024) e nítido. Filtragem percentual em qualidade média, sem desfoque grande: numa área de poucos metros, um desfoque largo viraria mancha.

Objetos que projetam: bicicleta, veículo atual e entregador. Superfícies que recebem: asfalto procedural, lotes fundidos, terreno e as peças de rua reais.

## Verificações executadas

- `pnpm verify` e `pnpm verify:offline`: aprovados.
- Playtest nos três presets: leve (sem sombra e sem brilho), alto (com os dois) e demonstração planetária (cenário procedural volta). Rota completa, pausa e retomada pelo teclado com foco fora da tela, relatório, e recarga com progresso preservado. **Zero erros de console.**

## Limite declarado

- **Só a bicicleta e o entregador projetam sombra.** Prédios, árvores e postes não. Incluí-los exigiria abrir muito o enquadramento da projeção e a sombra da bicicleta perderia nitidez; a saída seria uma segunda projeção, com custo de mais uma passagem.
- Os obstáculos e coletáveis continuam com o disco escuro de sempre.
- Nada foi testado em aparelho móvel real.

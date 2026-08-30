# Arquitetura do Modo Piloto Gold 2.4.0

## Objetivo

A versão 2.4.0 amplia o Modo Piloto urbano sem trocar o motor React, TypeScript e Babylon.js, sem copiar mapas reais e sem modificar a economia, o save ou a progressão já existentes.

## Módulos de regra

### `client/src/game/deliveryExperience.ts`

Converte o progresso normalizado da corrida em sete fases operacionais. Também calcula a pose do destino 3D e a transição da câmera. As funções são puras, limitam valores inválidos e não acessam React, Babylon ou armazenamento.

### `client/src/game/minimap.ts`

Mantém uma malha viária fictícia da Cidade XB e interpola o entregador ao longo de uma rota top-down. O contrato já separa ruas, rota, posição, direção, setor seguinte e estado concluído, permitindo adicionar várias frotas futuramente sem reescrever o HUD.

### `client/src/game/urbanLayout.ts`

Gera lotes residenciais e decoração viária determinísticos por segmento. As coordenadas verticais nunca são negativas; as fachadas são orientadas para a via; a paleta é validada para excluir amarelo.

## Integração Babylon.js

`RoadSystem` recebe o progresso da operação por `setRunProgress`. Ele controla destino, cliente, entregador, pacote e marcador, e adiciona travessias, ruas laterais, meio-fio e postes com geometria agrupada. `environmentVisuals` usa lotes determinísticos e instâncias para caminhos, cercas, arbustos, carros e iluminação.

`GameWorld` continua como autoridade da simulação. Ele repassa apenas o progresso visual ao cenário e consome `deliveryCameraCue` para suavizar posição, alvo e campo de visão. Nenhum cálculo de recompensa, desgaste, duração ou reserva de veículo foi movido para a camada visual.

## Integração React

`LiveMinimap` e `DeliverySequence` recebem somente o snapshot corrente. Os componentes não alteram o estado global, não executam timers próprios e respeitam semântica ARIA. O CSS reduz o painel em telas estreitas e desativa movimentos decorativos quando o navegador solicita redução de movimento.

## Compatibilidade de distribuição

O fonte 2.4.0 é a implementação principal. Como o ambiente isolado pode não ter acesso à rede para instalar dependências, `dist/public/assets/v240-runtime.js` e `v240-runtime.css` enriquecem o build 2.3.0 já existente. A camada observa o progresso acessível no DOM e injeta apenas minimapa e sequência quando os componentes nativos 2.4 ainda não estão presentes.

Essa camada não substitui o novo cenário Babylon, a câmera ou a animação 3D. Esses recursos passam a integrar a build final quando `pnpm build` for executado em Node `22.18.0` com o lockfile instalado.

## Desempenho e segurança

- Cenários repetidos usam instâncias ou meshes agrupadas.
- Módulos puros não dependem do frame rate.
- O minimapa é SVG local, sem serviços externos.
- Não foram adicionadas credenciais, telemetria ou chamadas remotas.
- O runtime de compatibilidade usa `MutationObserver` e atualização limitada, e não duplica o HUD nativo.
- A versão preserva CSP, ativos locais, loopback de desenvolvimento e verificações de release existentes.

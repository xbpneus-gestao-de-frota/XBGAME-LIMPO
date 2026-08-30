# XBPNEUS Racing 2.6 — Modo Piloto Fusion

## Objetivo

Transformar a tela de execução de rota do XBPNEUS Racing 2.5 em uma experiência de jogo mais direta, cinematográfica e legível, preservando integralmente o motor Babylon.js, a campanha, o salvamento, a economia, as rotas e os comandos existentes.

## Arquitetura aprovada

A aplicação continua com um único `GameWorld`, um único canvas Babylon.js e o salvamento `xb-pneus-do-pedal-ao-planeta-v3`. A integração não importa `CampaignStore`, `GameWorld`, `PlayerBike`, `RoadSystem` nem o servidor do protótipo Racing Atlas Fusion. A contribuição do Fusion será uma camada visual runtime local, carregada pelo mesmo HTML e vinculada ao DOM já produzido pelo jogo 2.5.

A camada `v260-pilot-fusion` detectará a presença de `.running-hud`, aplicará o estado `data-pilot-fusion="active"`, acrescentará elementos decorativos e de leitura rápida e reutilizará os botões reais de direção, Turbo e pausa. Nenhuma recompensa, custo, desgaste, progressão ou estado da rota será calculado pela camada visual.

## Requisitos funcionais

- O Modo Piloto Fusion deve ser ativado automaticamente durante uma rota.
- Base, garagem, mapa, central, resultado e demais telas continuam sob o fluxo original.
- A HUD deve destacar rota, velocidade, integridade, Turbo, progresso, minimapa e fase da entrega.
- Os controles existentes continuam sendo a única autoridade para esquerda, direita, Turbo e pausa.
- A interface deve funcionar em desktop e telas móveis estreitas.
- O runtime não pode depender de URLs externas, `manus-storage`, iframe ou segundo canvas.
- A camada deve continuar compatível com o bundle compilado 2.5 e com uma futura recompilação do código-fonte.
- A PWA, o servidor autônomo, os cabeçalhos de segurança e os inicializadores locais devem continuar funcionais.

## Estrutura visual

- Topo: marca XB, identificação do Modo Piloto, contrato ativo, pontuação e pausa.
- Esquerda: cartão de missão/rota, contexto de clima-terreno-pneu e minimapa.
- Direita: telemetria compacta, integridade, Turbo e informações operacionais.
- Centro: retículo de rota e aviso contextual sem bloquear a estrada.
- Rodapé: progresso origem-destino e controles táteis.
- Aproximação final: sequência visual de parada, descarga, entrega e confirmação já presente no runtime 2.5.

## Desempenho e segurança

A camada usa apenas DOM, CSS e `requestAnimationFrame`, sem novo loop de renderização 3D. O `MutationObserver` será limitado aos atributos necessários e as atualizações serão agrupadas. Todos os ativos permanecem locais. O servidor mantém CSP, COOP, CORP, permissões restritas e tratamento seguro de caminhos.

## Critérios de aceitação

- HTML de fonte e distribuição carregam `v260-pilot-fusion.css` e `v260-pilot-fusion.js`.
- O runtime contém ativação/desativação do Fusion, sincronização de rota, telemetria, etapa de entrega e layout móvel.
- O service worker usa cache `xbpneus-racing-v260` e inclui os novos ativos.
- `/healthz` informa versão `2.6.0`.
- Os testes offline, segurança, integridade, sintaxe e servidor terminam sem falhas.
- O ZIP não contém arquivos aninhados, credenciais ou referências a armazenamento externo.

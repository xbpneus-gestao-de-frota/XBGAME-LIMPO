# Validação XBPNEUS Racing 2.8.0 — Bairro Modular

## Escopo

Atualização exclusiva do cenário urbano inicial. Nenhum novo modelo de veículo foi integrado.

## Implementado

- nove módulos repetíveis de bairro;
- curvas suaves alternadas à direita e à esquerda;
- redução progressiva das curvas nos 18% finais da rota;
- casas e árvores preservadas;
- dois pontos de ônibus procedurais;
- dois pequenos módulos de parque;
- veículos decorativos estacionados desativados;
- um único motor Babylon, canvas, save e economia.

## Evidência automatizada

- 31/31 testes offline aprovados;
- 4/4 testes de segurança aprovados;
- integridade do código-fonte aprovada;
- runtime Gold + HUD Focus + Bairro Modular aprovado;
- release, PWA, servidor e sintaxe aprovados;
- servidor autônomo responde como versão 2.8.0.

## Playtest visual

- desktop: 1440×900, WebGL 2, uma cena, um canvas, rota `primeiro-pedal`;
- mobile: 390×844, WebGL 2, controles de toque, rota `primeiro-pedal`;
- pontos de ônibus criados: 18 peças procedurais em dois módulos;
- erros de página: zero;
- falhas de recursos: zero.

## Limites desta entrega

- não usa os arquivos `.uasset/.umap` do Cartoon City;
- não adiciona GLB;
- não altera bicicleta, moto, van, caminhão ou demais veículos;
- mantém o pipeline de runtime em camadas já usado pela versão 2.7.

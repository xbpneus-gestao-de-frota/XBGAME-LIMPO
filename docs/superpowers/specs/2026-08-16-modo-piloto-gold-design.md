# XBPNEUS Racing 2.4.0 — Modo Piloto Gold

## Aprovação e objetivo

O usuário aprovou em 16 de agosto de 2026 a aplicação de todas as melhorias tecnicamente viáveis sobre a base 2.3.0. A versão 2.4.0 deve elevar o Modo Piloto sem trocar o motor atual: React, TypeScript, Babylon.js, Vite e Express.

O objetivo é tornar a rota urbana mais legível, viva e moderna, mantendo desempenho em celular, identidade XB sem amarelo e compatibilidade com o progresso existente.

## Restrições globais

- Não migrar para Unreal, Unity ou Godot.
- Não copiar mapas, ruas, imagens ou dados do Google Maps.
- A cidade é fictícia, original e preparada para expansão futura de frota.
- Paleta XB: azul-marinho, azul, ciano, branco, cinza e verde ambiental; nenhum amarelo.
- Preservar as regras econômicas, salvamento, campanhas, veículos e Turbo Borracha XB existentes.
- Casas devem ficar apoiadas no terreno, com telhados para cima e fachada voltada para a via.
- O cenário deve continuar procedural, modular e leve para GPU móvel.
- Alterações repetitivas devem usar instâncias ou geometria agrupada.
- A versão 2.3.0 permanece intacta; a 2.4.0 é produzida em cópia isolada.

## Arquitetura

A evolução será dividida em quatro unidades independentes. `deliveryExperience.ts` traduz o progresso da rota em fases de entrega. `minimap.ts` calcula uma rota fictícia top-down e a posição do entregador. `urbanLayout.ts` fornece lotes urbanos determinísticos e seguros. Componentes React consomem esses dados sem conhecer as regras internas.

O cenário Babylon permanece em `RoadSystem` e `EnvironmentVisuals`, mas passa a usar os módulos puros para posicionamento e fases. O destino final será um conjunto 3D independente, habilitado somente no trecho de aproximação, com cliente, pacote, fachada e animações simples.

## Experiência visual

O bairro urbano terá calçadas e meio-fio mais claros, travessias, acessos laterais, iluminação pública, cercas, caminhos de entrada, carros estacionados e casas com variações controladas. A implantação dos lotes será determinística e espelhada, evitando objetos enterrados ou invertidos.

A leitura visual permanece estilizada 3D casual, com iluminação diurna, céu azul e materiais simples. Detalhes pequenos não críticos serão ocultados em rotas não urbanas.

## Entrega e minimapa

A reta final terá as fases: em rota, aproximação, parada, desembarque, entrega, retorno e concluída. O HUD mostra a fase atual, texto operacional e barra da etapa. A cena 3D aproxima o destino, revela cliente e pacote e sinaliza a conclusão sem mudar o cálculo econômico.

O minimapa é um SVG funcional com malha viária fictícia, rota azul, origem, destino, entregador em movimento e marcador do próximo setor. O cálculo é puro e testável; futuramente poderá receber múltiplos veículos.

## Interface e mobile

O HUD ganha um painel lateral compacto para minimapa e sequência de entrega. Em telas estreitas, os painéis mudam de posição e tamanho sem cobrir controles de faixa ou Turbo. A interface respeita `prefers-reduced-motion`, áreas seguras e contraste.

## Compatibilidade do build existente

Caso o ambiente não consiga instalar dependências, a entrega incluirá, além do fonte completo, uma camada autônoma `v240-runtime.js/css` aplicada ao build 2.3.0 já compilado. Ela demonstra minimapa, fases de entrega e refinamentos de interface sem depender de recompilação. O documento de validação distinguirá claramente fonte atualizado de build de compatibilidade.

## Testes

Módulos puros terão testes offline executáveis com Node e TypeScript global. Também serão executados os testes de segurança nativos, o verificador de release, verificações de sintaxe/transpilação dos arquivos alterados e testes de navegador no build entregue.

Critérios de aceite:

1. Nenhuma declaração duplicada ou erro de sintaxe nos arquivos alterados.
2. Progresso 0 e 1 do minimapa coincide com origem e destino.
3. Todas as fases de entrega são determinísticas e corretamente limitadas.
4. Lotes urbanos nunca têm coordenada vertical negativa e nunca usam amarelo.
5. HUD desktop e 390 × 844 mantém controles visíveis.
6. Build entregue abre sem erro JavaScript fatal.
7. ZIP final, SHA-256, changelog e validação são gerados.

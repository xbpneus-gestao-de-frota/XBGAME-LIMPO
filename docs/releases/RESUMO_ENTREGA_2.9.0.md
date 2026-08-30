# Resumo da entrega — XBPNEUS Racing 2.9.0

## O que mudou

A versão 2.9.0 organiza o game antes do salto artístico. O foco foi impedir que novas casas, veículos e efeitos fossem adicionados sobre regras contraditórias e scripts sobrepostos.

Principais resultados:

- primeira entrega corrigida de 80 km para 1 km;
- recompensa inaugural controlada em XB$ 10;
- bônus de coletáveis limitado e auditável;
- progressão de pneu e mochila unificada;
- HUD Focus movido para React;
- bairro modular movido para o motor oficial;
- mascote corrigido para o padrão XB;
- service worker e política de cache corrigidos;
- fluxo desktop e mobile verificado.

## Situação do pacote

O ZIP contém duas camadas claramente identificadas:

1. **Fonte 2.9 consolidada:** é a base correta para as próximas alterações.
2. **Distribuição jogável de compatibilidade:** abre sem instalar dependências, mas ainda deriva visualmente do bundle 2.8.

O pacote não deve ser tratado como a build pública final. A próxima estação com acesso ao pnpm deverá gerar um novo `dist/` diretamente da fonte 2.9.

## Resultado dos testes

- 17 testes do game aprovados;
- 4 testes de segurança aprovados;
- 35 arquivos TypeScript/TSX com sintaxe aprovada;
- servidor 2.9 e `/healthz` aprovados;
- desktop e mobile sem erros de página;
- primeira rota confirmada em XB$ 10 e 1 km.

## Próxima etapa recomendada

Gerar a build limpa da fonte 2.9 e, depois dela, iniciar a versão 3.0 com uma rota visual padrão-ouro: bairro diurno, pequenas curvas reais, casas modulares, árvores, ponto de ônibus, iluminação, melhor câmera e entrega final animada.

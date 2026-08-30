# Resumo da entrega — XBPNEUS Racing 3.0.0

## O que foi entregue

A versão 3.0.0 transforma a primeira rota urbana em uma Rota Ouro técnica: o percurso deixa de ser uma reta absoluta e passa a ter curva, contracurva, recuperação e chegada, com uma única geometria compartilhada por pista, obstáculos, coletáveis, destino e câmera.

Principais resultados:

- rota urbana determinística com duas curvas suaves;
- bairro modular com residências, comércio, garagem, praça e ponto de ônibus;
- câmera adaptativa para desktop e celular;
- jogador preservado dentro do enquadramento em 390 × 844;
- baú reduzido e HUD mais leve;
- resultado inaugural preservado em XB$ 10 e 1 km;
- 17 testes do game e 4 testes de segurança aprovados;
- 12 estados visuais validados sem erros de console ou estouro horizontal.

## Situação do pacote

O ZIP contém:

1. **Fonte 3.0 consolidada:** autoridade para as próximas alterações.
2. **Distribuição jogável de compatibilidade:** abre sem instalar dependências e demonstra a Rota Ouro, mas ainda deriva do bundle compilado 2.8.
3. **Evidências técnicas:** testes vermelho–verde, verificação offline, tentativa de build e capturas desktop/mobile.

A distribuição é adequada para avaliação local e desenvolvimento. Não deve ser tratada como publicação pública definitiva até a build limpa ser gerada.

## Resultado da validação

- 17/17 testes do game;
- 4/4 testes de segurança;
- 36 arquivos TypeScript/TSX com sintaxe aprovada;
- 0 segredos encontrados;
- servidor 3.0.0 e `/healthz` aprovados;
- WebGL 2 confirmado na pilotagem;
- desktop e mobile sem erros de página;
- primeira entrega confirmada em XB$ 10 e 1 km.

## Limitações assumidas

- mascote raster da tela inicial ainda é legado e viola o padrão sem nariz, orelhas e dentes;
- cenário ainda utiliza arte low-poly provisória;
- build limpa bloqueada pela indisponibilidade do registro npm no ambiente de preparação.

## Próxima etapa

Gerar a build limpa e, em seguida, produzir o segundo salto visual: fachadas com mais acabamento, vegetação realista estilizada, iluminação diurna refinada, marco de entrega XB e animação final do entregador.

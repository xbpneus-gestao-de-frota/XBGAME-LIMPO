# Resumo da entrega — XBPNEUS Racing 3.1.0

A versão 3.1 integra no gameplay web dois assets reais enviados pelo usuário:

- `XB_Road_Straight.fbx`, convertido em asfalto, guia, calçada e faixa;
- `A_XB_Pedal.fbx`, convertido em entregador texturizado com 12 quadros de pedalada.

O carregamento existe tanto no código-fonte oficial quanto na distribuição jogável. Os 877 arquivos originais foram preservados em `source-assets/original` e inventariados por SHA-256.

A bicicleta, carros, árvores e demais itens disponíveis apenas em `.uasset` não foram declarados como integrados. A bicicleta permanece procedural até existir exportação FBX ou GLB.

A Rota Ouro, o HUD, o save, a economia e o contrato inicial de 5 segundos, 1 km e XB$ 10 foram preservados.

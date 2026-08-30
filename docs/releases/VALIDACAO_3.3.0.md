# Validação técnica — XBPNEUS Racing 3.3.0

## Escopo comprovado

- 11 peças de rua e o entregador convertidos de FBX para glTF/GLB com Blender 4.0 e carregados de verdade no Babylon, dentro de um navegador.
- Entregador com esqueleto de 24 ossos, textura WebP e três animações (`idle`, `pedal`, `walk`) reconhecidas pelo Babylon.
- Bicicleta XB reconstruída a partir da tabela de montagem extraída do asset original.
- Troca pista real ↔ pista procedural verificada nos dois sentidos: bicicleta usa a rua glTF, veículo planetário volta ao cenário procedural.

## Verificações executadas

- `pnpm verify`: 113 testes de comportamento, 8 de segurança, build limpa, integridade da distribuição e portão de release — todos aprovados.
- `pnpm verify:offline`: arquitetura sem adaptadores, integridade, sintaxe e teste HTTP do servidor real — `VERIFICACAO_OFFLINE_OK`.
- Playtest em navegador: menu, Central, rota pilotada completa, pausa e retomada pelo teclado com o foco fora da tela do jogo, relatório final, recarga com progresso preservado, demonstração planetária e garagem. **Zero erros de console.**

## Medidas

| | 3.2.0 | 3.3.0 |
| --- | ---: | ---: |
| Download de assets | 7,36 MB | 1,16 MB |
| Peças de rua disponíveis | 1 | 11 |
| Ossos do entregador | 0 | 24 |
| Animações | 1 assada | 3 |
| Chamadas de desenho da pista real | 135 malhas | 4 (instâncias) |

## Limite declarado

- Os 862 `.uasset` continuam fora do jogo. Abrem no Unreal 5.7, mas o pacote não trouxe nenhuma textura.
- A pasta `BIKE/` exige Unreal 5.8; a bicicleta no jogo é a reconstrução fiel, não o modelo exportado.
- A Rota Ouro ainda é composta por peças retas. Usar as peças de curva exige mudar o sistema de pista.
- Nada foi testado em aparelho móvel real.

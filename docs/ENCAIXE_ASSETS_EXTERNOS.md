# Encaixe dos assets externos — medido em 31/08/2026

Tudo aqui saiu de leitura direta dos arquivos `.glb` (bounding box por material,
com as transformações de nó aplicadas). Nenhum número é estimativa.

---

## A régua: as peças XB

| peça | X | Z | Y | triângulos |
|---|---|---|---|---|
| XB_Road_Straight | 8,000 | 8,000 | 0,200 | 120 |
| XB_Road_Cross | 8,000 | 8,000 | 0,200 | 168 |
| XB_Road_T | 8,000 | 8,000 | 0,200 | 180 |
| XB_Road_Curve | 8,000 | 8,000 | 0,200 | 796 |
| XB_Road_Roundabout | 8,000 | 8,000 | 0,200 | 552 |
| XB_Road_Bend10 | 8,636 | 8,655 | 0,200 | 420 |
| XB_Road_Bend25 | 11,920 | 21,063 | 0,200 | 700 |
| XB_Road_RampL / RampR | 10,929 | 12,728 | 0,200 | 520 |
| XB_Road_Y | 12,786 | 13,767 | 0,200 | 156 |
| XB_Road_Plaza | 98,000 | 98,000 | 0,200 | 3.456 |

**Cada peça XB é dividida em quatro materiais nomeados**, e é isso que o jogo lê:

| material | largura medida |
|---|---|
| XB_Asfalto | **6,0000** |
| XB_Guia | **6,7000** |
| XB_Calcada | **8,0000** |
| XB_Faixa | **0,1600** |

Referência de peso: o entregador tem 13.903 triângulos e 780 KB.

---

## Kenney — 176 peças, 7,9 MB

### A grade encaixa exato

O ladrilho da Kenney mede **1,000 × 1,000**. O ladrilho XB mede **8,000 × 8,000**.

**Fator: × 8, cravado.** Não é aproximação — é o mesmo passo de grade. E a
modularidade também bate: das 95 peças de rua, 38 são 1×1 (um ladrilho), 5 são
2×2 (dois ladrilhos = 16 m) e 2 são 3×3 (três = 24 m).

### A estrutura interna não encaixa

| | XB | Kenney |
|---|---|---|
| materiais por peça | 4, nomeados | **1, chamado `colormap`** |
| asfalto identificável | sim, 6,0000 | **não existe como malha separada** |
| guia / calçada / faixa | separados | fundidos num atlas de cor |

`RoadSystem.roadSurfaceNodes()` decide o que é pista lendo a marca estrutural
`metadata.xbLayer`. Numa peça Kenney não há o que marcar: é uma malha só.

**Conclusão: Kenney é cenário, não é pista.** A rota que o jogador pilota
continua nas peças XB, que carregam as camadas de que a física e os testes
dependem. As peças de rua Kenney servem para a cidade que se vê e não se
percorre — ruas laterais, fundo, quarteirões vizinhos.

### Os prédios entram sem conflito

Prédio não é pilotado, então nada disso se aplica a eles.

| kit | peças | triângulos (soma) | altura mediana × 8 | altura máxima × 8 |
|---|---|---|---|---|
| city-kit-commercial | 41 | 44.682 | 13,5 m | 43,8 m |
| city-kit-suburban | 40 | 30.035 | 5,9 m | 9,9 m |
| city-kit-roads | 95 | 17.146 | — | — |

Alturas realistas depois do × 8: prédio comercial mediano com 13,5 m, casa de
bairro com 5,9 m. Nada precisa ser remodelado.

A cidade inteira — 176 peças, ~92 mil triângulos — pesa **6,6 entregadores**.

---

## Poly Haven — os 4 props não servem como estão

| prop | peso |
|---|---|
| modular_chainlink_fence | 7,3 MB |
| fire_hydrant | 5,5 MB |
| metal_trash_can | 5,0 MB |
| concrete_road_barrier | 3,8 MB |

São modelos de produção com textura 1K. **Um hidrante de 5,5 MB num jogo que
inteiro tem 3,8 MB não fecha.** Ou passam por redução pesada, ou saem — os kits
da Kenney já trazem props de rua por uma fração do peso.

---

## O orçamento manda no tamanho da onda

O jogo hoje empacota **3,8 MB**. Os 81 prédios somam **6,3 MB** — entrar com
todos triplicaria o download.

Média de 78 KB por prédio: **uma primeira leva de 15 a 20 prédios custa ~1,5 MB**
e já dá variedade de sobra para o bairro. Escolher, não despejar.

---

## Ordem sugerida

1. Escolher de 15 a 20 prédios (mistura de comercial e suburbano).
2. Converter textura para WebP e reexportar — mesma receita do resto do acervo.
3. Entrar por `client/public/assets/models/city/`, com o nome na lista do
   `GltfAssetRuntime.ts` (sem isso a peça não existe).
4. Escala × 8 no nó de suporte, **nunca no `__root__` do glTF**.
5. Rua Kenney só como cenário de fundo, nunca como superfície de rota.

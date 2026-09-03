# Plano da cidade real — reanálise com orçamento de 40 a 80 MB

Escrito em 31/08/2026, depois de medir o código e o acervo. Substitui o teto
anterior de 10 MB, que estava duas ordens de grandeza abaixo do normal de
mercado (média dos 100 jogos iOS de maior receita: 465 MB).

---

## Por que a cidade parece o que parece

A cidade inteira de hoje é feita de primitivas do Babylon:

| primitiva | ocorrências |
|---|---|
| CreateBox | **86** |
| CreateCylinder | 23 |
| CreateTorus | 17 |
| CreateSphere | 13 |
| CreateDisc | 9 |

Prédio é caixa com variação de telhado (`gable`, `shed`, `conic`, `round`,
`parapet`). Árvore é cilindro com esfera. Carro estacionado é caixa. Cerca é
`picket` ou `low-wall`.

**Não é defeito de engenharia — é ausência de modelo.** O sistema que posiciona
tudo isso está pronto, testado e barato (27 ladrilhos em 4 chamadas de desenho).
Falta só trocar o que ele desenha.

---

## A troca, peça por peça

| hoje, procedural | substituto | peças | peso |
|---|---|---|---|
| prédio comercial (caixa) | `building`, `building-skyscraper` | 19 | 3,48 MB |
| — mesmo prédio ao longe | `low-detail-building` | 16 | **0,21 MB** |
| casa de bairro (caixa + telhado) | `building-type-a…u` | 21 | 2,34 MB |
| árvore (cilindro + esfera) | `tree-small`, `tree-large`, `planter` | 3 | 0,03 MB |
| cerca `picket` / `low-wall` | `fence-*` | 9 | 0,21 MB |
| calçada e acesso de garagem | `path-*`, `driveway-*` | 7 | 0,03 MB |
| poste de iluminação | `light-*` | 6 | — |
| semáforo e placa | `traffic-light-*`, `sign-highway-*` | 8 | 0,13 MB |
| poste elétrico e fiação | `electricity-*` | 8 | — |
| toldo de comércio | `detail-awning`, `-overhang`, `-parasol` | 6 | 0,05 MB |
| obra, cone, caçamba, pilar | `construction-*`, `dumpster`, `bridge-pillar` | — | 0,44 MB |
| peças de rua (só cenário de fundo) | `road-*` | 62 | 1,00 MB |

**A cidade inteira trocada: ~7 MB.** Menos de 10% do orçamento novo.

### O achado que resolve o custo de GPU

A Kenney entrega **duas versões do mesmo prédio**: detalhada e `low-detail`.
Os 16 modelos distantes somam **0,21 MB — 13 KB cada**. Isso é uma escada de
detalhe pronta: quarteirão perto usa o modelo cheio, quarteirão longe usa o
leve. O gargalo real de celular (malha viva e memória de textura) já vem
resolvido de fábrica.

---

## O estoque parado

Já pronto, medido, e **nunca entrou no jogo**:

| peça | triângulos |
|---|---|
| XB_Quarteirao_01 | 1.848 |
| XB_Quarteirao_02 | 2.112 |
| XB_Cidadao_01 a 06 | ~988 cada |
| XB_Road_Bend10 | 420 |
| XB_Road_Bend25 | 700 |
| XB_Anel_Horizonte | imagem |

Custo somado: menos de 0,5 MB. **É o trabalho mais barato do projeto** e continua
parado desde antes desta reanálise.

---

## As ondas

| onda | conteúdo | peso |
|---|---|---|
| A | cidade Kenney trocando as primitivas | ~7,0 MB |
| B | estoque parado (quarteirões, cidadãos, curvas) | ~0,5 MB |
| C | texturas reais em WebP (7 materiais ambientCG) | ~2,5 MB |
| D | veículos — **falta baixar** (Kenney car-kit) | ~1,0 MB |
| E | céu e iluminação (HDRI reduzido) | ~1,5 MB |
| | **TOTAL** | **~12,5 MB** |

Contra um teto de 40 a 80 MB, a reforma visual inteira custa **um sexto do
orçamento**. Nada precisa ser cortado. Sobra espaço para dobrar tudo depois.

---

## O que realmente custa não é byte

`GltfAssetRuntime.ts` hoje conhece **quatro nomes**. Para a onda A ele precisa de:

1. **Catálogo** em vez de lista fixa — carregar por pasta e manifesto.
2. **Instanciamento** por modelo repetido, senão 80 prédios viram 80 chamadas
   de desenho e o celular engasga.
3. **Troca em `environmentVisuals.ts`** — onde hoje há `CreateBox`, passa a
   haver escolha de modelo do catálogo, preservando o posicionamento que já
   funciona e já é testado.
4. **Escada de detalhe** ligando `low-detail-*` à distância da câmera.
5. **Escala × 8** em nó de suporte — nunca no `__root__` do glTF.

Isso é o projeto. Os 12,5 MB são o detalhe fácil.

---

## Restrições que não mudam com orçamento maior

- **Primeira tela ≤ 3 MB.** O visitante novo ainda não decidiu jogar. O resto
  entra depois, com barra de progresso, e o `sw-v320` cacheia para sempre.
- **Memória de GPU.** Textura 1024² sem compressão ocupa ~4 MB na GPU, não os
  144 KB do arquivo. Descarregar bairro fora de vista é obrigatório.
- **Rua Kenney não vira pista.** Ela não tem as camadas `XB_Asfalto` (6,0000),
  `XB_Guia` (6,7000), `XB_Calcada` (8,0000) que `RoadSystem.roadSurfaceNodes()`
  lê por `metadata.xbLayer`. Cenário sim, rota não.
- **Nada disso foi medido em celular real.** Continua sendo a pendência que vale
  mais que qualquer estimativa.

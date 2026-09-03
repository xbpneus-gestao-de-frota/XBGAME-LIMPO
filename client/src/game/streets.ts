/**
 * A malha de ruas do bairro, medida em cima do mapa 2D.
 *
 * ── DE ONDE ELA VEIO ───────────────────────────────────────────────────────
 *
 * O mapa que o Fernando entregou e um desenho, nao uma planta: nao existe
 * arquivo de vetor por tras dele, so pixels. Entao a malha foi EXTRAIDA da
 * imagem, em tres passos, e cada passo corrige o erro do anterior:
 *
 *   1. Onde ha asfalto — pela cor, crescendo a partir de um nucleo seguro
 *      para dentro da sombra das arvores (reconstrucao geodesica). Sozinho
 *      isso engole calcada, entrada de garagem e canteiro.
 *   2. Onde ha RUA — por filtro de cume (Sato) na largura de uma rua. Isso
 *      separa a fita larga e comprida (rua) do rabisco fino (calcada).
 *   3. Por onde a rua passa — cada trecho e um caminho de menor custo entre
 *      dois cruzamentos, sobre um campo onde o asfalto e barato e o verde e
 *      praticamente intransponivel. E o passo que conserta o resto: o
 *      esqueleto de pixels parte a rua onde a arvore tapa e inventa rua onde
 *      o jardim encosta no meio-fio; o roteador nao faz nem um nem outro,
 *      porque ele so anda onde a imagem mostra chao de rodar.
 *
 * A medicao inteira e refeita por `scripts/mapa/extrair_ruas.py`, e e de la
 * que este arquivo sai. Mapa novo de outra regiao roda o mesmo script.
 *
 * O que da para AFIRMAR, porque foi medido: a malha e uma peca so (da para ir
 * de qualquer canto a qualquer canto), e quase nada do traçado passa por
 * cima de grama — 0,7% em media, e o que sobra e corte de esquina, nao rua
 * inventada no meio do jardim. Os testes conferem a ligacao, e mais: coordenada dentro do mapa, trecho ligando nos que existem,
 * e nenhum trecho de comprimento zero.
 *
 * O que NAO da para afirmar: que toda area de asfalto do desenho seja rua. O
 * patio do galpao e a calcada larga da praca sao chao de rodar e entram na
 * malha. Nao e defeito de medicao — e ambiguidade do desenho, e para uma
 * bicicleta de entrega atravessar a praca ate faz sentido.
 */
import dados from "./data/ruas-bairro-xb.json";

/** Ponto em porcentagem do mapa (0-100), origem no canto superior esquerdo. */
export type PontoNoMapa = readonly [number, number];

export interface NoDaRua {
  id: string;
  em: PontoNoMapa;
  /** Quantas ruas saem daqui. 1 = ponta, 2 = curva, 3+ = cruzamento. */
  saidas: number;
}

export interface TrechoDeRua {
  de: string;
  ate: string;
  /** Comprimento no mapa, em pixels da imagem original. */
  px: number;
  /** O traçado, ponto a ponto, em porcentagem do mapa. */
  linha: readonly PontoNoMapa[];
}

/**
 * Quantos metros vale um pixel do mapa.
 *
 * ESCOLHA, e nao medida: o desenho nao tem escala. 1.448 px de largura foram
 * chamados de 1,2 km de bairro, o que deixa a malha inteira com 18,1 km de
 * rua — tamanho de bairro de verdade. Mexer aqui muda TODA distancia do mapa,
 * e portanto todo frete que a conta do freight.ts cobrar por ele.
 */
export const METROS_POR_PIXEL = dados.medida.metros_por_px;

export const MAPA = dados.mapa;

export const NOS: readonly NoDaRua[] = Object.entries(dados.nos).map(
  ([id, n]) => ({
    id,
    em: (n as { em: number[] }).em as unknown as PontoNoMapa,
    saidas: (n as { saidas: number }).saidas,
  })
);

export const TRECHOS = dados.trechos as unknown as readonly TrechoDeRua[];

/** O comprimento de um trecho em metros, na escala escolhida. */
export const metrosDoTrecho = (trecho: TrechoDeRua): number =>
  trecho.px * METROS_POR_PIXEL;

/** Onde o ponto cai na imagem, no tamanho em que ela for desenhada. */
export const emPixels = (
  ponto: PontoNoMapa,
  largura: number,
  altura: number
): { x: number; y: number } => ({
  x: (ponto[0] / 100) * largura,
  y: (ponto[1] / 100) * altura,
});

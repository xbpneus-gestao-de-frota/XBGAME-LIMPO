/**
 * O CABECA DE PREGO — o primeiro vilao, levantando peso na pracinha.
 *
 * Ordem dele, 14/09/2026, com a captura do mapa e o risco amarelo por cima:
 *
 *   "bem no ponto amarelo, crie uma animacao do primeiro vilao que
 *    apresentaremos cabeca de prego, deixe a animacao rodando neste local
 *    pintado de amarelo, redimensione, para que fique padrao de cores proximos
 *    ou iguais ao mapa"
 *
 * ── ONDE E O PONTO AMARELO ────────────────────────────────────────────────
 *
 * Nao foi estimado no olho. A captura que ele mandou e um PEDACO do mapa com
 * zoom, entao a conta foi esta: procurar aquele pedaco dentro do desenho
 * inteiro (casa ele com 96,6% de certeza, na escala 0,511), achar o risco
 * amarelo pela cor forte — ele ocupa um retangulo de 38 por 30 pixels na
 * captura — e levar o centro desse retangulo de volta para a coordenada do
 * mapa.
 *
 * Deu a beira noroeste da pracinha, no chao batido do parquinho, rente ao
 * gramado, a esquerda do primeiro balanco. E o mesmo lugar do risco dele.
 *
 * ── O TAMANHO ────────────────────────────────────────────────────────────
 *
 * "Redimensione." Ele foi escolhido com o GAROTO DA PRACA colado ao lado, no
 * desenho de verdade, em quatro tamanhos: um vilao que nao se mede contra
 * alguem do proprio jogo vira um numero solto que envelhece torto.
 *
 * O garoto tem 2,4% da altura do mapa. A 3,2% de quadro, o corpo do vilao da
 * 2,73% — um palmo mais alto que o menino, que e o que se espera de um homem
 * adulto e grande ao lado de um garoto de quinze anos. Em 2,4% de quadro ele
 * ficava MENOR que o garoto; em 3,6% a barra tomava um quarto do parquinho.
 *
 * Ele tambem e menor que o entregador, de proposito: o entregador e a unica
 * coisa que a pessoa precisa achar de longe, e essa regra nao muda porque
 * chegou um vilao.
 *
 * ── O COMPASSO ────────────────────────────────────────────────────────────
 *
 * Uma levantada de peso nao tem passo igual: quem levanta ARMA embaixo, PUXA
 * depressa, TRAVA em cima e DESCE. Passo igual vira boneco de relogio, e
 * boneco de relogio e a coisa que mais rapido denuncia que aquilo e um
 * desenho se repetindo.
 *
 * Por isso o compasso abaixo e escrito passo a passo, com a parte de cada um
 * em milesimos do giro. Ele fica quase metade do tempo parado — armando
 * embaixo e travado em cima — e cruza o meio do movimento depressa. E tambem
 * por isso que o giro inteiro dura tres segundos e meio: mais rapido, ele
 * disputa o olho com a corrida; mais lento, vira estatua.
 */

/** Em porcentagem do mapa, como todo ponto deste jogo. */
export interface PontoNoMapa {
  x: number;
  y: number;
}

/** O risco amarelo dele, virado em coordenada do mapa. */
export const ONDE_ELE_TREINA: PontoNoMapa = { x: 69.34, y: 33.45 };

/**
 * A ALTURA DO QUADRO, em porcentagem da altura do mapa.
 *
 * Atencao: e a altura do QUADRO, e nao a dele. O quadro guarda o vilao em pe
 * mais as anilhas, que encostam no chao bem mais abaixo das botas — veja
 * LINHA_DO_PE. O corpo dele e ALTURA_DO_QUADRO * LINHA_DO_PE.
 */
export const ALTURA_DO_QUADRO = 3.2;

/**
 * ONDE A SOLA DELE CAI DENTRO DO QUADRO, contada do alto.
 *
 * O garoto da praca e recortado rente ao contorno e a linha de baixo da imagem
 * E a sola do tenis — entao pendurar e so `translate(-50%, -100%)`.
 *
 * O vilao nao pode ser assim. A barra esta na FRENTE dele e, visto de cima, o
 * que esta na frente aparece MAIS EMBAIXO na tela: as anilhas encostam no chao
 * uns duzentos pixels abaixo das botas. Cortar na sola comeria as anilhas.
 *
 * Entao o quadro guarda os dois e este numero diz onde esta o pe. Quem monta a
 * tira calcula o mesmo valor, e ha um teste amarrando os dois: se um dia o
 * recorte mudar la e este numero ficar aqui, o vilao afunda no chao da
 * pracinha sem quebrar mais nada.
 */
export const LINHA_DO_PE = 0.8534;

/**
 * ONDE ACABA A CABECA DELE, contada do alto do quadro.
 *
 * O quadro tem ar em cima dele: entre o alto da cabeca, na pose em pe, e a
 * borda de cima sobram seis virgula cinco por cento. Enquanto ninguem
 * perguntava o tamanho DELE, esse ar nao custava nada.
 *
 * Passou a custar em 14/09/2026, quando ele virou a regua dos moradores:
 * "analisar moradores deixar com mesmo tamanho de cabeca de prego". Os
 * moradores sao recortados rente ao contorno — a imagem inteira e corpo. Se o
 * tamanho deles copiasse o QUADRO dele, os dezesseis sairiam um palmo mais
 * altos que o vilao; se copiasse ate a linha do pe, um dedo mais altos. Tem de
 * copiar o CORPO, que e daqui ate a sola.
 *
 * Este numero e MEDIDO no desenho, e nao calculado: ele depende de como o
 * sujeito foi desenhado dentro da pose. Quem monta a tira mede de novo a cada
 * vez e avisa se o desenho mudar.
 */
export const LINHA_DA_CABECA = 0.0656;

/**
 * QUANTO DO MAPA O CORPO DELE OCUPA, EM PE — da cabeca a sola.
 *
 * E este o numero que significa "o tamanho do Cabeca de Prego". O quadro e
 * maior que ele por dois motivos que nao sao ele: o ar em cima da cabeca e as
 * anilhas encostadas no chao, na frente das botas.
 */
export const ALTURA_DELE_EM_PE =
  ALTURA_DO_QUADRO * (LINHA_DO_PE - LINHA_DA_CABECA);

/** Quantas poses a tira tem. */
export const QUANTOS_QUADROS = 4;

/** Quanto dura um giro inteiro da levantada. */
export const O_GIRO_MS = 3500;

/**
 * UM PASSO DA LEVANTADA.
 *
 * `quadro` e a pose (0 embaixo, 3 em pe) e `parte` e quanto do giro ele
 * ocupa. As partes somam 1 — e ha um teste que confere isso, porque uma
 * soma diferente de um faz a animacao escorregar um pouco a cada volta, que e
 * um defeito que so aparece depois de dois minutos olhando.
 */
export interface Passo {
  quadro: number;
  parte: number;
  /** O que esta acontecendo — serve para quem for ler isto daqui a um ano. */
  nome: string;
}

export const O_COMPASSO: readonly Passo[] = [
  { quadro: 0, parte: 0.24, nome: "arma embaixo, com a barra no chao" },
  { quadro: 1, parte: 0.07, nome: "tira do chao" },
  { quadro: 2, parte: 0.07, nome: "meio da puxada" },
  { quadro: 3, parte: 0.34, nome: "trava em pe, e segura" },
  { quadro: 2, parte: 0.09, nome: "comeca a descer" },
  { quadro: 1, parte: 0.09, nome: "desce" },
  { quadro: 0, parte: 0.1, nome: "encosta a barra e respira" },
];

/**
 * O COMPASSO VIRADO EM QUADROS-CHAVE DE CSS.
 *
 * Devolve, para cada passo, o milesimo do giro em que ele COMECA e a posicao
 * do fundo que mostra aquela pose. E daqui que sai o `@keyframes` — escrito a
 * mao no CSS, e conferido por teste contra esta conta.
 *
 * A posicao do fundo de um quadro de tira com N poses nao e `i / N`: e
 * `i / (N - 1)`, porque `background-position` em porcentagem alinha a BORDA
 * ESQUERDA da imagem com a borda esquerda da caixa em 0% e a DIREITA com a
 * direita em 100%. Errar isto por um quadro e o tipo de engano que sai
 * parecendo que a arte veio torta.
 */
export function quadrosChave(): readonly {
  em: number;
  quadro: number;
  posicao: number;
}[] {
  const chaves: { em: number; quadro: number; posicao: number }[] = [];
  let andado = 0;
  for (const passo of O_COMPASSO) {
    chaves.push({
      em: Math.round(andado * 1000) / 10,
      quadro: passo.quadro,
      posicao: (passo.quadro / (QUANTOS_QUADROS - 1)) * 100,
    });
    andado += passo.parte;
  }
  return chaves;
}

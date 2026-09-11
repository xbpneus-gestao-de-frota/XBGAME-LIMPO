/**
 * O DRONE DA XBPNEUS — a cena que fecha a conversa de abertura.
 *
 * Ordem dele, 07/09/2026:
 *
 *   "Quando diz 'vamos resolver isso', um drone passa por nossos olhos icando a
 *   caixa, voa proximo do entregador, desce a caixa no chao e volta para frente
 *   de nossos olhos."
 *
 * ── POR QUE ELE PASSA RENTE AOS OLHOS ─────────────────────────────────────
 *
 * O drone podia simplesmente aparecer sobre o bairro e descer a caixa. Passar
 * rente a camera primeiro custa um segundo e meio e faz duas coisas que aparecer
 * nao faz.
 *
 * A primeira e de tamanho: ele enche a tela, e a pessoa ve o aparelho de perto
 * — as helices, a camera, o nome na lateral. Depois ele encolhe para o tamanho
 * de mundo, e o pontinho que sobrevoa o bairro continua sendo AQUELE aparelho, e
 * nao uma mancha. Um mesmo objeto visto de perto e depois de longe da escala ao
 * lugar inteiro.
 *
 * A segunda e de quem manda. Ele passa rente a NOSSOS olhos, nao aos olhos do
 * garoto — quem esta na central e quem chamou o drone, e a cena comeca e termina
 * do lado de ca. Por isso ele tambem VOLTA: sai do bairro e vem para a frente de
 * quem joga, que e onde ele fica esperando a proxima ordem.
 *
 * ── E POR QUE ELE CHEGA JUSTO AGORA ───────────────────────────────────────
 *
 * "Vamos resolver isso" e a primeira coisa que a pessoa decide no jogo. A
 * resposta a essa frase nao pode ser um menu: tem que ser alguma coisa
 * acontecendo no mundo. O drone e a resposta — ela falou, e a XB se mexeu.
 */

/** A passagem rente aos olhos, com a caixa embaixo. */
export const PASSAGEM_MS = 1600;
/** A ida: ele encolhe e atravessa o bairro ate o garoto. */
export const IDA_MS = 1500;
/** A descida da caixa ate o chao. */
export const DESCIDA_MS = 1500;
/** E a volta para a frente de quem joga. */
export const VOLTA_MS = 1600;

export const VOO_MS = PASSAGEM_MS + IDA_MS + DESCIDA_MS + VOLTA_MS;

/**
 * OS MARCOS DO VOO, em fracao do total.
 *
 * Sao os MESMOS numeros que o CSS usa nas paradas dos quadros-chave. Eles moram
 * aqui porque o componente precisa saber quando a caixa encostou no chao — sem
 * isso ele nao tem como avisar que a cena acabou, e o teste nao tem como
 * conferir se o desenho e o codigo contam a mesma historia.
 */
export const MARCOS = {
  /** Passou pelos olhos e comeca a encolher. */
  passou: PASSAGEM_MS / VOO_MS,
  /** Chegou em cima do garoto e para no ar. */
  chegou: (PASSAGEM_MS + IDA_MS) / VOO_MS,
  /** A caixa encostou no chao e ele sobe de volta. */
  soltou: (PASSAGEM_MS + IDA_MS + DESCIDA_MS) / VOO_MS,
} as const;

/**
 * ONDE A CAIXA ENCOSTA — ENCOSTADA NELE, ao alcance da mao.
 *
 * Ordem dele, 07/09/2026: "precisamos que a entrega da caixa seja ao lado do
 * entregador, pq senao teremos que fazer animacao para entregador chegar ate a
 * caixa."
 *
 * E a razao certa pela razao certa. A primeira versao deixava a caixa a tres
 * passos dele, e tres passos e uma caminhada — caminhada e um desenho novo, uma
 * regra nova de para onde ele olha, e um pedaco de tempo em que ninguem sabe o
 * que esta acontecendo. Encostada, a cena termina no quadro em que a caixa toca
 * o chao: ele ja esta do lado dela, e a proxima coisa que acontecer pode
 * acontecer agora.
 *
 * O garoto pisa em 48,5 / 41,4 e tem 2,4% da ALTURA do mapa — que na largura do
 * mapa da 1,8%. A caixa cai 1,2% a direita: meio corpo dele mais meia caixa,
 * mais um fio de folga. E um tico mais para ca, para ficar na frente da perna
 * dele e nao atras dela.
 *
 * Ela e pendurada pela BASE, como ele: o ponto e onde a caixa encosta no chao,
 * e nao o meio dela.
 */
export const ONDE_A_CAIXA_CAI = { x: 49.7, y: 41.9 } as const;

/** E o drone para bem em cima dela, no ar. Este ponto e o MEIO do aparelho. */
export const ONDE_O_DRONE_PARA = { x: 49.7, y: 34.0 } as const;

/** Onde a caixa fica enquanto ele a carrega: logo abaixo do aparelho. */
export const CAIXA_PENDURADA_EM = 37.3;

/**
 * OS DOIS TAMANHOS DELE, e eles obedecem a reguas diferentes.
 *
 * PERTO e tamanho de TELA: rente aos olhos ele tem que cobrir a mesma fatia da
 * tela com o bairro afastado ou aproximado — um drone que passa na frente da
 * camera nao muda de tamanho porque a pessoa aproximou o mapa. O CSS divide
 * pelo zoom cheio.
 *
 * LONGE e tamanho de MUNDO, e segue a regra do garoto: cresce com o bairro pela
 * metade (a raiz do zoom). Se seguisse o zoom inteiro, sobrevoando ele ficaria
 * do tamanho de uma casa quando a pessoa aproximasse.
 *
 * Os numeros de perto sao % da largura da TELA; os de longe, % da largura do
 * mapa.
 */
export const TAMANHOS = {
  /** Rente aos olhos ele passa maior que a tela: e o que faz ver o aparelho. */
  droneDePerto: 115,
  /** E volta um pouco maior ainda, porque a volta e chegada, e nao passagem. */
  droneNaVolta: 132,
  /** Sobrevoando, do tamanho de tres garotos: menos que isso vira mosca. */
  droneNoBairro: 5.5,
  caixaDePerto: 26,
  caixaNoBairro: 1.4,
} as const;

/** Quanto tempo a caixa fica no chao piscando de nova antes de virar cenario. */
export const BRILHO_DA_CAIXA_MS = 1200;

/**
 * QUANTO A MALA ESPERA FECHADA antes de abrir sozinha.
 *
 * Ordem dele, 07/09/2026: "apenas uma animacao simples da caixa abrindo ao lado
 * do garoto, nada de zoom da caixa."
 *
 * A espera nao e enrolacao: ela deixa o drone sair de vista primeiro. As duas
 * coisas ao mesmo tempo seriam duas coisas para olhar, e cada uma tem um recado
 * — primeiro quem trouxe, depois o que veio.
 */
export const ESPERA_PARA_ABRIR_MS = 900;

/** Quanto dura a abertura: o agacho da tampa e o salto. */
export const ABERTURA_MS = 520;

/**
 * A JANELA DO MAPA — o quanto do bairro esta na tela, e onde.
 *
 * O mapa e uma foto grande que anda e cresce dentro de uma moldura pequena. O
 * que a pessoa ve e um recorte dela, e onde esse recorte esta muda com o
 * arrasto e com o zoom.
 */
export interface JanelaDoMapa {
  /** Onde a foto comeca dentro da moldura, em pixels (pode ser negativo). */
  esquerda: number;
  topo: number;
  /** O tamanho da foto ja aproximada, em pixels. */
  largura: number;
  altura: number;
  /** E o tamanho da moldura — o que cabe na tela. */
  telaLargura: number;
  telaAltura: number;
  zoom: number;
}

/**
 * O VOO ACONTECE NA TELA, e nao no mapa — e essa conta e a ponte.
 *
 * O drone passa RENTE AOS OLHOS: ele tem que atravessar a TELA, entrando por
 * fora de uma borda e saindo pela outra. Se o voo morasse dentro da foto do
 * bairro, "atravessar a tela" viraria "atravessar o bairro" — e com o mapa
 * aproximado o aparelho comecaria e terminaria em algum lugar fora da vista,
 * porque a foto e tres vezes maior que a moldura.
 *
 * So que o ponto onde a caixa cai e do BAIRRO: e ao lado do garoto, e continua
 * ao lado dele quando a pessoa arrasta o mapa. Entao os dois pontos do bairro —
 * onde o drone para e onde a caixa encosta — sao traduzidos aqui para a regua da
 * tela, junto com os tamanhos.
 *
 * Os tamanhos de longe passam pela raiz do zoom, que e a regra do garoto: o
 * bairro cresce inteiro, as pecas crescem a metade disso.
 */
export function aReguaDoVoo(janela: JanelaDoMapa) {
  const larguraDaTela = Math.max(1, janela.telaLargura);
  const alturaDaTela = Math.max(1, janela.telaAltura);
  const emX = (p: number) =>
    ((janela.esquerda + (p / 100) * janela.largura) / larguraDaTela) * 100;
  const emY = (p: number) =>
    ((janela.topo + (p / 100) * janela.altura) / alturaDaTela) * 100;
  const tamanho = (p: number) =>
    (((p / 100) * janela.largura) /
      Math.sqrt(Math.max(0.0001, janela.zoom)) /
      larguraDaTela) *
    100;

  return {
    droneX: emX(ONDE_O_DRONE_PARA.x),
    droneY: emY(ONDE_O_DRONE_PARA.y),
    caixaX: emX(ONDE_A_CAIXA_CAI.x),
    caixaChao: emY(ONDE_A_CAIXA_CAI.y),
    caixaNoAr: emY(CAIXA_PENDURADA_EM),
    droneLonge: tamanho(TAMANHOS.droneNoBairro),
    caixaLonge: tamanho(TAMANHOS.caixaNoBairro),
  };
}

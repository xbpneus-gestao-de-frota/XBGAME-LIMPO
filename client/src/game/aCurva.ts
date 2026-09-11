/**
 * O QUE ACONTECE QUANDO ELE FAZ UMA CURVA — a inclinacao e a poeira.
 *
 * Pedido dele, 07/09/2026: "vamos adicionar animacoes ao entregador, o que voce
 * pode adicionar nas curvas? fumaca saindo dos pneus a cada curva?"
 *
 * Duas coisas foram escolhidas: ele PENDE para dentro da curva, e o pneu de tras
 * LEVANTA POEIRA — mas so nas curvas fechadas, e nao em todas.
 *
 * ── POR QUE NAO EM TODA CURVA ─────────────────────────────────────────────
 *
 * Nao e economia: e que quase toda curva do bairro nao e curva. Medido em
 * quarenta rotas, 140 mil quadros de pedalada:
 *
 *     mediana         1°/s      ele anda quase sempre reto
 *     90% abaixo de  26°/s
 *     95% abaixo de  45°/s
 *     98% abaixo de  82°/s
 *     maior         220°/s      que e o limite de guidao do proprio jogo
 *
 * Poeira a cada mudanca de rumo sairia a toda hora e viraria fumaca de carro
 * derrapando. Com o corte em 60°/s ela sai 1,9 vez por minuto — nas esquinas de
 * verdade, e nao nas ondulacoes da rua:
 *
 *     > 40°/s   2,8 por minuto
 *     > 60°/s   1,9 por minuto     <- escolhido
 *     > 80°/s   1,1 por minuto
 *     >100°/s   0,5 por minuto
 *
 * ── POR QUE A INCLINACAO SOME NO PERFIL ───────────────────────────────────
 *
 * Inclinar e girar em torno do eixo comprido da bicicleta. Visto de frente ou
 * de costas, esse giro aparece na tela como giro mesmo. Visto DE PERFIL, ele
 * aparece como a bicicleta tombando na direcao da camera — encurtamento, e nao
 * rotacao. Girar o desenho de perfil tiraria os dois pneus do chao e entortaria
 * a bicicleta, que e o defeito que este projeto ja pagou caro para nao ter.
 *
 * Entao a inclinacao e multiplicada pelo seno do rumo: cheia de frente e de
 * costas, zero no perfil. E o mesmo motivo pelo qual o sinal se inverte entre
 * as duas — quem vem para a camera pende para o lado contrario de quem vai
 * embora.
 */

/** Acima disto o pneu de tras levanta poeira. Ver a tabela acima. */
export const GIRO_DA_POEIRA = 60;

/** Espera minima entre duas poeiras, para uma curva longa nao virar fumaca. */
export const ESPERA_DA_POEIRA_MS = 1200;

/** Quanto tempo cada poeira fica na tela. Anda junto com o CSS. */
export const DURACAO_DA_POEIRA_MS = 900;

/**
 * O quanto ele pende, no maximo.
 *
 * Seis graus. Mais que isso e o desenho de tres quartos comeca a denunciar que
 * e um desenho girado: o guidao entorta e o menino descola do selim.
 */
export const INCLINACAO_MAXIMA = 6;

/** A que velocidade de giro a inclinacao ja esta cheia. */
export const GIRO_CHEIO = 90;

/** Quanto tempo a inclinacao leva para acompanhar o guidao, em segundos. */
export const MACIEZ_DA_INCLINACAO = 0.12;

/**
 * A inclinacao na tela, em graus, para uma velocidade de giro e um rumo.
 *
 * @param taxa velocidade de giro do rumo, em graus por segundo, com sinal
 *             (positivo e girar no sentido anti-horario da tela)
 * @param rumoEmGraus para onde ele aponta na tela agora
 */
export function inclinacaoDaCurva(taxa: number, rumoEmGraus: number): number {
  const quanto = Math.max(-1, Math.min(1, taxa / GIRO_CHEIO));
  const deFrenteOuDeCostas = Math.sin((rumoEmGraus * Math.PI) / 180);
  return -INCLINACAO_MAXIMA * quanto * deFrenteOuDeCostas;
}

/** Se esta velocidade de giro levanta poeira. */
export function levantaPoeira(taxa: number): boolean {
  return Math.abs(taxa) > GIRO_DA_POEIRA;
}

/** Uma poeira levantada: onde ela nasceu no mapa, e quem ela e. */
export interface Poeira {
  id: number;
  /** Em porcentagem do mapa, como todo ponto deste jogo. */
  x: number;
  y: number;
}

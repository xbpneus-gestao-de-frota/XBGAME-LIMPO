/**
 * A PEDALADA: quanto tempo custa atravessar o bairro.
 *
 * Este arquivo existe para que a resposta a "quanto demora esta entrega?" more
 * num lugar so. Ela vai ser mexida — o Fernando ja disse como: "quando
 * aplicarmos jogador testamos o que fica melhor". Entao o que importa aqui nao
 * e acertar o numero hoje, e sim deixar UM numero para mexer, com o motivo
 * escrito do lado.
 *
 * ── QUEM PEDALA ───────────────────────────────────────────────────────────
 *
 * Um garoto ou garota de 15 anos, bicicleta comum, bairro plano, com bolsa:
 *
 *   - solto, sem parar:            16 a 18 km/h
 *   - media real de entrega:       13 km/h  <- o numero de trabalho
 *   - bolsa cheia, dia ruim:       11 km/h
 *
 * A media de entrega e mais baixa que a de passeio de proposito: tem esquina,
 * faixa de pedestre, curva, parada na porta e o peso da bolsa. Quem ja andou
 * de bicicleta entregando sabe que a conta nao e a do velocimetro.
 *
 * ── O RELOGIO DO MAPA NAO E O RELOGIO DA VIDA ─────────────────────────────
 *
 * O bairro tem tamanho de bairro de verdade: quarteirao de 91 metros, 1,2 km
 * de ponta a ponta. Isso e bom e nao deve mudar — o frete e pago por
 * distancia, e distancia inventada contamina o jogo inteiro.
 *
 * Mas em tempo real a corrida tipica leva 4 minutos e meio SO DE PEDALADA.
 * Ninguem segura atencao nisso nos primeiros minutos de um jogo de celular. O
 * remedio nao e encolher o bairro: e encolher o relogio. O metro continua
 * real, para o dinheiro nao mentir; o relogio do modo mapa corre mais rapido.
 *
 * Com o fator 3, que e o palpite de partida:
 *
 *   primeira corrida (301 m)        1m23s real  ->  28s
 *   corrida tipica   (955 m)        4m24s real  ->  1m28s
 *   atravessar o bairro (1250 m)    5m46s real  ->  1m55s
 *
 * O fator FICA PARA SER TESTADO com jogador de verdade. 4 fecha mais rapido e
 * comeca a parecer moto; 2 deixa a corrida tipica acima de dois minutos.
 */
import { METROS_POR_PIXEL } from "./streets";

/** Velocidade media de entrega, em quilometros por hora. */
export const VELOCIDADE_KMH = 13;

/**
 * Quantas vezes o relogio do mapa corre mais rapido que a vida.
 *
 * 1 = tempo real. Este e o numero para mexer no teste com jogador.
 */
export const RELOGIO_DO_MAPA = 3;

/** Metros por segundo, ja convertidos — a conta que o resto do jogo usa. */
export const METROS_POR_SEGUNDO = (VELOCIDADE_KMH * 1000) / 3600;

/** Quantos segundos de tela custa pedalar uma distancia do bairro. */
export function segundosPedalando(metros: number): number {
  if (!Number.isFinite(metros) || metros <= 0) return 0;
  return metros / METROS_POR_SEGUNDO / RELOGIO_DO_MAPA;
}

/** O mesmo, em tempo de vida real — para conferir se a conta segue plausivel. */
export function segundosNaVidaReal(metros: number): number {
  if (!Number.isFinite(metros) || metros <= 0) return 0;
  return metros / METROS_POR_SEGUNDO;
}

/**
 * "1m28s". Nao existe entrega de zero segundo: a de baixo arredonda para 1s,
 * senao o jogo diria que a casa ao lado da base fica a zero minuto de
 * distancia, o que soa como defeito.
 */
export function comoRelogio(segundos: number): string {
  const s = Math.max(1, Math.round(segundos));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
}

/**
 * A regua do mapa, em metros por pixel do desenho, repetida aqui so para
 * quem vier ler este arquivo saber de onde saem os metros. Ela e uma ESCOLHA
 * e nao uma medida — mas cai num lugar honesto: quarteirao de 91 metros,
 * bairro de 1,2 km por 0,9 km, 18 km de rua somados. Bairro residencial de
 * verdade tem quarteirao de 80 a 120 metros.
 */
export const METROS_POR_PIXEL_DO_MAPA = METROS_POR_PIXEL;

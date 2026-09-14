/**
 * O CELULAR POR FORA — hora, data, sinal e bateria.
 *
 * Ordem dele, 13/09/2026: "entre XB e botao de voltar ao game, precisamos
 * aplicar icones de um celular de verdade, bateria, 9G, nivel de sinal, horas
 * real do game, com data real".
 *
 * ── POR QUE ISTO E UM ARQUIVO SO DE CONTAS ────────────────────────────────
 *
 * A barra e enfeite na tela, mas nao e enfeite na cabeca de quem joga: ela e
 * o unico lugar do aplicativo que responde "que horas sao?" sem abrir nada. E
 * a hora no jogo manda em quase tudo — o sol, o cansaco, quem esta acordado
 * para pedir. Entao a conta que transforma minuto do dia em "06:00" mora aqui,
 * longe do desenho, onde da para prender por teste.
 *
 * ── A HORA E DO JOGO; A DATA E DE VERDADE ─────────────────────────────────
 *
 * Foi o que ele pediu, e faz sentido: o dia do jogo e curto e recomeca, mas a
 * data do calendario e dele, jogando hoje. Misturar as duas seria mentir duas
 * vezes — um relogio que nao bate com o sol da tela, ou uma data que nunca
 * muda por mais que ele volte amanha.
 *
 * ── A BATERIA E DE VERDADE, E MEDE TEMPO DE JOGO ──────────────────────────
 *
 * Ordem dele, 13/09/2026: "bateria de celular deve ser real, se usuario for de
 * menor pais podem atualizar tempo de uso de jogador, deixando bateria com no
 * maximo 2 horas de uso direto, se nao bateria deve acabar em duas horas de
 * uso constante".
 *
 * Entao ela nao segue o sol do jogo: segue o relogio da parede. Duas horas de
 * jogo seguido e ela chega a zero. Nao e enfeite nem castigo — e um limite
 * visivel, que a pessoa ve descendo desde o primeiro minuto em vez de levar um
 * susto no fim. E quando quem responde pela crianca quiser um limite menor,
 * mexe num numero so: o teto de minutos.
 *
 * A conta mora aqui, sozinha e sem relogio proprio, para dar para prender por
 * teste: quem chama e que sabe quantos minutos ja rolaram.
 */

/** Quanto tempo de jogo seguido a bateria aguenta, se ninguem mudar. */
export const TETO_DE_USO_EM_MINUTOS = 120;
const CHEIA = 100;

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

/** O relogio do jogo, no formato do celular: "06:00". */
export function horaDoCelular(minutoDoDia: number): string {
  const inteiro = ((Math.floor(minutoDoDia) % 1440) + 1440) % 1440;
  const hora = Math.floor(inteiro / 60);
  const minuto = inteiro % 60;
  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
}

/** A data de verdade, curta: "sáb, 13/09". */
export function dataDoCelular(quando: Date = new Date()): string {
  const dia = String(quando.getDate()).padStart(2, "0");
  const mes = String(quando.getMonth() + 1).padStart(2, "0");
  return `${DIAS[quando.getDay()]}, ${dia}/${mes}`;
}

/**
 * Quanto sobrou de bateria, de 0 a 100, por tempo de jogo ja gasto.
 *
 * `usados` e `teto` sao minutos de relogio de parede. Teto invalido (zero ou
 * negativo, que chegaria se alguem gravasse besteira no ajuste) vale como
 * bateria vazia, e nao como bateria infinita: diante de um numero sem sentido,
 * o lado seguro e o que protege quem esta jogando.
 */
export function bateriaDoCelular(
  usados: number,
  teto: number = TETO_DE_USO_EM_MINUTOS
): number {
  if (!Number.isFinite(teto) || teto <= 0) return 0;
  if (!Number.isFinite(usados) || usados <= 0) return CHEIA;
  if (usados >= teto) return 0;
  return Math.round(CHEIA - (usados / teto) * CHEIA);
}

/** Acabou: o celular nao tem mais o que dar. */
export function bateriaAcabou(usados: number, teto?: number): boolean {
  return bateriaDoCelular(usados, teto) <= 0;
}

/**
 * Quantas barrinhas de sinal acendem, de 0 a 4.
 *
 * O bairro tem sinal bom de dia e sinal pior de madrugada — nao por fisica, e
 * sim porque a madrugada ja e a hora mais solitaria do jogo, e uma barra a
 * menos diz isso sem escrever nada.
 */
export function sinalDoCelular(minutoDoDia: number): number {
  const hora = Math.floor((((minutoDoDia % 1440) + 1440) % 1440) / 60);
  if (hora >= 6 && hora < 22) return 4;
  if (hora === 5 || hora >= 22) return 3;
  return 2;
}

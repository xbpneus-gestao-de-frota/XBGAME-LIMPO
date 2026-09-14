/**
 * A LUZ DO DIA NO BAIRRO — a primeira camada de vida do mapa.
 *
 * Da lista de quinze pontos que podem ganhar vida, esta e a primeira da ordem
 * de construcao, e por um motivo: e a unica que da vida ao bairro INTEIRO sem
 * mexer um pixel do desenho. Copa de arvore, telhado, asfalto e pedra mudam
 * juntos porque a luz que cai neles muda.
 *
 * Decisao dele, 07/09/2026, quando a pergunta foi feita: "tem hora do dia, no
 * relogio do jogo". Ou seja, a luz vira durante a corrida — nao segue o relogio
 * de quem joga, senao quem joga sempre no mesmo horario nunca veria as outras
 * luzes e metade do trabalho ficaria invisivel.
 *
 * ── NAO HA NOITE FECHADA, E ISSO E DE PROPOSITO ───────────────────────────
 *
 * O ciclo vai da manha ao entardecer e volta. Noite de verdade escureceria as
 * ruas, e a rua e onde moram a rota e os pinos — a regra do plano e clara:
 * nada pode disputar a leitura das ruas. O entardecer ja e escuro o bastante
 * para uma janela acesa fazer sentido, que e o que a lista pede mais adiante.
 *
 * ── AS CORES MORAM NO CSS ─────────────────────────────────────────────────
 *
 * Aqui ficam o tempo e os marcos do ciclo; a cor de cada marco fica na regra
 * .mapa__luz. Sao dois lugares, e ha teste amarrando os dois — repetir a mesma
 * fracao nos dois arquivos e como ela envelhece torta.
 */

import { SEGUNDOS_DO_DIA } from "./oRelogioDoBairro";

/**
 * QUANTO DURA UM DIA DO BAIRRO — agora vem do relogio do bairro.
 *
 * Ate 12/09/2026 este numero era quatro minutos, escrito aqui, e a luz rodava
 * numa animacao solta com esse tempo. Ficava bonito e era mentira: enquanto o
 * balcao vivia um dia de dez minutos, o sol nascia duas vezes e meia.
 *
 * Ordem dele, 12/09/2026: "primeiro atualize relogio um apenas". Agora quem
 * diz quanto dura um dia e `oRelogioDoBairro`, que le a medida do balcao. A luz
 * deixou de ter um dia proprio.
 *
 * O numero continua exportado daqui porque e daqui que o mapa sempre o leu —
 * quem chama nao precisa saber que ele mudou de casa.
 */
export const DIA_EM_MS = SEGUNDOS_DO_DIA * 1000;

/** Um marco do ciclo: em que ponto do dia ele acontece, e como se chama. */
export interface MarcoDoDia {
  /** Fracao do dia, de 0 a 1. */
  em: number;
  nome: "amanhecer" | "manha" | "meio-dia" | "tarde" | "entardecer";
}

/**
 * OS MARCOS DO DIA.
 *
 * O ciclo fecha: depois do entardecer vem o amanhecer de novo, sem corte.
 */
export const MARCOS: readonly MarcoDoDia[] = [
  { em: 0.0, nome: "amanhecer" },
  { em: 0.2, nome: "manha" },
  { em: 0.45, nome: "meio-dia" },
  { em: 0.7, nome: "tarde" },
  { em: 0.88, nome: "entardecer" },
];

/**
 * Em que parte do dia o bairro esta, para uma fracao de 0 a 1.
 *
 * ── POR QUE A VOLTA PARA DENTRO DE 0..1 E FEITA ASSIM ─────────────────────
 *
 * Parece igual escrever `((f % 1) + 1) % 1`, e nao e: somar 1 e tirar o resto
 * de novo ESTRAGA o numero que ja estava certo. Com 0.45 a conta devolve
 * 0.4499999999999999, e a fracao do meio-dia — que e 0.45 cravado — caia na
 * manha. O marco do meio-dia nunca acontecia na hora do meio-dia.
 *
 * Achado em 12/09/2026, ao ligar a luz no relogio do bairro. So o numero
 * negativo precisa da volta; o que ja esta dentro fica como esta.
 */
export function marcoEm(fracao: number): MarcoDoDia["nome"] {
  const resto = fracao % 1;
  const f = resto < 0 ? resto + 1 : resto;
  let atual = MARCOS[MARCOS.length - 1]!;
  for (const m of MARCOS) if (f >= m.em) atual = m;
  return atual.nome;
}

/**
 * SE E HORA DE ACENDER LUZ.
 *
 * Ainda nao ha nada aceso no mapa — coreto, vitrine e janela sao itens
 * seguintes da lista. Esta pergunta existe desde ja porque foi ela que travou
 * metade da lista ate ele decidir a hora do dia: sem entardecer, nenhum desses
 * itens tem quando acontecer.
 */
export function horaDeAcender(fracao: number): boolean {
  return marcoEm(fracao) === "entardecer";
}

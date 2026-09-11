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

/**
 * QUANTO DURA UM DIA DO BAIRRO.
 *
 * Quatro minutos. Uma corrida inteira leva de trinta segundos a um minuto de
 * tela, entao ela atravessa perto de um quarto do dia: da para ver a luz virar
 * sem que ela vire NA CARA de ninguem. Mais curto vira efeito e chama atencao;
 * mais longo e a pessoa nunca ve o entardecer.
 */
export const DIA_EM_MS = 4 * 60 * 1000;

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

/** Em que parte do dia o bairro esta, para uma fracao de 0 a 1. */
export function marcoEm(fracao: number): MarcoDoDia["nome"] {
  const f = ((fracao % 1) + 1) % 1;
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

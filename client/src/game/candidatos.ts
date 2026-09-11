/**
 * OS OITO ENTREGADORES DO BAIRRO.
 *
 * Ordem dele, 08/09/2026: "o usuario comeca proprietario de uma empresa,
 * contratando seu primeiro funcionario, sem bike, e ja teremos outros
 * contratados, alguns com bike, outros sem, porque precisamos de dinamica no
 * jogo — teremos 8 entregadores".
 *
 * ── POR QUE ISTO MUDA O JOGO ──────────────────────────────────────────────
 *
 * Ate aqui so existia um jeito de por gente na rua: comprar um veiculo e
 * contratar alguem para dirigi-lo. Caro, lento, e uma decisao so — juntar
 * dinheiro.
 *
 * Agora ha DOIS caminhos, e eles sao opostos:
 *
 *   AGREGADO   — traz o proprio veiculo. Leva 80% do frete e paga do bolso
 *                dele o combustivel, o pneu, a manutencao e a depreciacao.
 *                A empresa nao gasta com veiculo e fica com 20%.
 *
 *   FROTISTA   — dirige veiculo da XB. Leva 15%, e a empresa paga tudo o que
 *                a rodagem consome. Sobra muito mais por corrida, mas so
 *                depois de comprar o veiculo.
 *
 * A conta dos dois ja existia em `freight.ts` desde sempre; o que faltava era
 * gente para vive-la. O caminho do agregado nunca era usado por ninguem.
 *
 * ── A CONTA, SEM DESCONTO INVENTADO ───────────────────────────────────────
 *
 * O agregado nao custa menos para contratar. Ele custa menos porque NAO
 * exige comprar veiculo: um frotista sai por oito viagens de lucro (o
 * veiculo) mais onze (a contratacao); um agregado sai pelas onze. A economia
 * e real e se explica sozinha — nao precisei inventar desconto nenhum.
 */
import type { VehicleId } from "./types";

export interface Candidato {
  id: string;
  nome: string;
  /**
   * Ele tem veiculo proprio? Se tem, entra como AGREGADO e a empresa nao
   * precisa ter unidade livre na garagem.
   */
  veiculoProprio: boolean;
  /** Qual veiculo ele traz. So vale quando `veiculoProprio` e verdadeiro. */
  veiculo: VehicleId;
  /** Uma linha sobre ele, para a pessoa escolher por gente e nao por numero. */
  sobre: string;
}

/*
 * Cinco com bicicleta e tres sem, de proposito.
 *
 * Quem comeca nao tem veiculo nenhum, entao precisa haver gente com bicicleta
 * na praca — senao a empresa nasce parada e a primeira decisao vira "junte
 * dinheiro", que nao e decisao, e espera.
 *
 * E precisa haver gente SEM, senao a garagem nunca faz falta e metade do jogo
 * (comprar veiculo, subir a oficina) perde o motivo.
 */
export const CANDIDATOS: readonly Candidato[] = [
  {
    id: "cand-tiao",
    nome: "Tião",
    veiculoProprio: true,
    veiculo: "bike",
    sobre: "Bicicleta velha, conhece cada atalho do bairro",
  },
  {
    id: "cand-marlene",
    nome: "Marlene",
    veiculoProprio: true,
    veiculo: "bike",
    sobre: "Entrega desde menina, nunca perdeu um prazo",
  },
  {
    id: "cand-du",
    nome: "Du",
    veiculoProprio: true,
    veiculo: "bike",
    sobre: "Rápido demais. Já quebrou duas rodas este ano",
  },
  {
    id: "cand-preta",
    nome: "Preta",
    veiculoProprio: true,
    veiculo: "bike",
    sobre: "Bicicleta nova, cuida dela como se fosse filha",
  },
  {
    id: "cand-serginho",
    nome: "Serginho",
    veiculoProprio: true,
    veiculo: "bike",
    sobre: "Trabalhava na padaria, quer sair para a rua",
  },
  {
    id: "cand-iara",
    nome: "Iara",
    veiculoProprio: false,
    veiculo: "bike",
    sobre: "Sem veículo. Pontual, e faz conta de cabeça",
  },
  {
    id: "cand-bento",
    nome: "Bento",
    veiculoProprio: false,
    veiculo: "bike",
    sobre: "Sem veículo. Forte, aguenta carga que ninguém aguenta",
  },
  {
    id: "cand-nara",
    nome: "Nara",
    veiculoProprio: false,
    veiculo: "bike",
    sobre: "Sem veículo. Fala bem, o cliente gosta dela",
  },
];

export const candidato = (id: string): Candidato | undefined =>
  CANDIDATOS.find(c => c.id === id);

/** Os que ainda nao foram contratados. */
export function candidatosLivres(
  contratados: readonly { candidatoId?: string }[]
): readonly Candidato[] {
  const usados = new Set(contratados.map(c => c.candidatoId).filter(Boolean));
  return CANDIDATOS.filter(c => !usados.has(c.id));
}

/**
 * OS RETRATOS DOS CANDIDATOS.
 *
 * Os oito desenhos de entregador ja existiam; o que nao existia era a ligacao
 * entre eles e os oito nomes. A ordem da lista E a ordem dos desenhos, e essa
 * e a unica regra: o primeiro candidato usa o primeiro desenho.
 *
 * Ficou assim, e nao um campo `foto` em cada candidato, porque um campo daria
 * a impressao de que da para escolher — e nao da: sao oito desenhos para oito
 * pessoas. Se um dia forem doze candidatos, o desenho da volta pela lista em
 * vez de deixar quatro sem cara.
 */
export function retratoDoCandidato(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const posicao = CANDIDATOS.findIndex(c => c.id === id);
  if (posicao < 0) return undefined;
  return `/assets/XB_Entregador_${(posicao % 8) + 1}.webp`;
}

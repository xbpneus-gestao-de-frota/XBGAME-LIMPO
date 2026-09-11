/**
 * AS REGRAS DA CORRIDA — o que o jogador ganha, o que perde, e quando perde.
 *
 * Desenho do Fernando, nas palavras dele: o jogador "pode clicar para aceitar
 * varias coletas e nao conseguir completar missao e ser forcado a fazer
 * melhorias em sua bicicleta, mochila, entre outros"; o pino que falha "ganha
 * um X e fica vermelho"; quem "coletou e nao entregou no tempo tera que
 * devolver mercadoria a loja, e nao ganhara nada, mas manutencao de bicicleta
 * continuara progresso de desgaste".
 *
 * ── POR QUE ISSO E UM JOGO, E NAO UMA LISTA DE TAREFAS ─────────────────────
 *
 * Porque QUEM ESCOLHE O APERTO E O JOGADOR. Ele decide se pega uma encomenda
 * ou seis. A dificuldade deixa de ser do jogo e passa a ser dele — e por isso
 * a falha e justa. Ninguem fica bravo com uma armadilha que armou sozinho.
 *
 * E porque A CORRIDA PERDIDA NAO E NEUTRA: o desgaste corre igual. Sem isso,
 * falhar seria so "nao ganhar". Com isso, falhar CUSTA — e e esse detalhe que
 * faz a melhoria ser desejada em vez de anunciada.
 *
 * ── O PRAZO NAO E UM NUMERO INVENTADO ──────────────────────────────────────
 *
 * Um prazo escrito a mao ("90 segundos") mente em metade do bairro: e folgado
 * na casa da esquina e impossivel na ponta do mapa. Aqui o prazo NASCE DA
 * DISTANCIA: e o tempo que a pedalada honestamente leva, vezes uma folga.
 *
 * Assim so existe UM numero para ele decidir — quanta folga o entregador
 * ganha — e ele vale para o bairro inteiro, hoje e no proximo mapa.
 *
 * E o aperto aparece sozinho quando ele pega varias: os relogios correm ao
 * mesmo tempo, entao a sexta encomenda nao aperta na hora da coleta. Aperta no
 * fim, que e quando a escolha do que sacrificar tem peso.
 *
 * ── O QUE AINDA E DELE ─────────────────────────────────────────────────────
 *
 * Ele disse: "depois decidimos o tempo de cada regra". Entao os numeros abaixo
 * estao marcados A DECIDIR e moram todos juntos, num lugar so. Trocar um deles
 * e trocar uma linha — nao e reescrever a regra.
 */
import { custoDeRodar } from "./freight";
import { segundosPedalando } from "./pedalada";

/**
 * OS NUMEROS QUE ELE AINDA VAI DECIDIR.
 *
 * Estao aqui em cima, juntos e marcados, de proposito: numero de equilibrio
 * espalhado pelo codigo e numero que ninguem acha quando quer mudar.
 */
export const A_DECIDIR = {
  /**
   * Quanto tempo o entregador ganha alem da pedalada honesta ate a porta.
   * 2,2 quer dizer: da para ir com calma, ou pegar mais uma pelo caminho —
   * mas nao tres.
   */
  folgaDoPrazo: 2.2,
  /** Segundos parados na porta: descer, entregar, voltar para a bicicleta. */
  paradaNaPorta: 12,
  /**
   * O PISO DA CORRIDA PEQUENA. Uma entrega aceita e cumprida nunca pode dar
   * prejuizo — senao o jogo tem um buraco: falhou, nao ganhou, nao pode
   * melhorar, falha de novo. So a ambicao arrisca; o basico e sempre seguro.
   * E a margem minima em cima do custo de rodar.
   */
  margemDoPiso: 1.35,
  /**
   * ONDE A BOLINHA VIRA DE COR, contando o que SOBRA do prazo.
   *
   * Os tres primeiros trechos sao largos e o ultimo e curto de proposito: a
   * subida E o jogo — o jogador precisa de tempo para decidir qual entrega
   * sacrificar — e o aviso de que essa acabou precisa ser curto e
   * inconfundivel, e nao um longo lamento.
   */
  viradasDaBolinha: {
    folgaAcabando: 0.66,
    atrasando: 0.42,
    noLimite: 0.2,
  },
} as const;

/** Em que pe esta uma encomenda. */
export type EstadoDaEncomenda =
  | "aceita"
  | "coletada"
  | "entregue"
  | "estourada";

export interface Encomenda {
  id: string;
  /** Nome da loja onde se retira. */
  daLoja: string;
  /** Nome da casa onde se entrega. */
  paraCasa: string;
  /** Metros de rua da porta da loja ate a porta da casa. */
  metros: number;
  estado: EstadoDaEncomenda;
  /** Segundo do relogio do mapa em que foi coletada. */
  coletadaEm?: number;
}

/**
 * Quanto tempo esta encomenda tem, do momento da coleta.
 *
 * A pedalada honesta ate a porta, vezes a folga, mais a parada na porta.
 */
export function prazoDaEncomenda(metros: number): number {
  return (
    segundosPedalando(metros) * A_DECIDIR.folgaDoPrazo + A_DECIDIR.paradaNaPorta
  );
}

/** Segundos que ainda sobram. Negativo quando ja passou. */
export function tempoQueSobra(e: Encomenda, agora: number): number {
  if (e.coletadaEm === undefined) return prazoDaEncomenda(e.metros);
  return prazoDaEncomenda(e.metros) - (agora - e.coletadaEm);
}

/** De 1 (acabou de coletar) a 0 (estourou). Nunca passa dos limites. */
export function fracaoQueSobra(e: Encomenda, agora: number): number {
  const prazo = prazoDaEncomenda(e.metros);
  if (prazo <= 0) return 0;
  return Math.min(1, Math.max(0, tempoQueSobra(e, agora) / prazo));
}

/**
 * OS ESTAGIOS DA BOLINHA — o relogio que o jogador enxerga.
 *
 * O corpo do pino diz O QUE o lugar e e nunca muda; a bolinha diz QUANTO
 * FALTA e muda o tempo todo. Sao duas perguntas diferentes, em dois lugares
 * diferentes da mesma peca.
 */
export type EstagioDaBolinha =
  | "no-prazo"
  | "folga-acabando"
  | "atrasando"
  | "no-limite"
  | "estourou";

/** Onde cada estagio comeca, contando o que SOBRA. Vem das viradas acima. */
export const ESTAGIOS: ReadonlyArray<{
  estagio: EstagioDaBolinha;
  aPartirDe: number;
}> = [
  { estagio: "no-prazo", aPartirDe: A_DECIDIR.viradasDaBolinha.folgaAcabando },
  {
    estagio: "folga-acabando",
    aPartirDe: A_DECIDIR.viradasDaBolinha.atrasando,
  },
  { estagio: "atrasando", aPartirDe: A_DECIDIR.viradasDaBolinha.noLimite },
  { estagio: "no-limite", aPartirDe: Number.MIN_VALUE },
  { estagio: "estourou", aPartirDe: 0 },
];

export function estagioDaBolinha(fracao: number): EstagioDaBolinha {
  for (const f of ESTAGIOS) {
    if (fracao >= f.aPartirDe && f.aPartirDe > 0) return f.estagio;
  }
  return "estourou";
}

export function estagioDaEncomenda(
  e: Encomenda,
  agora: number
): EstagioDaBolinha {
  if (e.estado === "estourada") return "estourou";
  if (e.estado === "aceita") return "no-prazo";
  return estagioDaBolinha(fracaoQueSobra(e, agora));
}

/** Passou do tempo? So conta depois de coletada — o relogio comeca ali. */
export function passouDoTempo(e: Encomenda, agora: number): boolean {
  return e.estado === "coletada" && tempoQueSobra(e, agora) <= 0;
}

/**
 * O DESGASTE CORRE MESMO QUANDO A ENTREGA FALHA.
 *
 * E medido por quilometro rodado, e nao por corrida, porque o frete tambem e
 * pago por distancia: as duas contas falam a mesma lingua, e uma corrida
 * longa perdida doi exatamente o quanto deveria doer.
 */
export function desgasteDaCorrida(metros: number): number {
  const c = custoDeRodar("bicicleta", metros / 1000);
  return c.combustivel + c.pneus + c.manutencao + c.depreciacao;
}

/**
 * O PISO: uma entrega aceita e cumprida nunca da prejuizo.
 *
 * Existe para tapar o buraco do ciclo — falhou, nao ganhou, nao pode
 * melhorar, falha de novo. O basico e sempre renda; so a ambicao arrisca.
 */
export function pisoDaCorridaPequena(metros: number): number {
  return desgasteDaCorrida(metros) * A_DECIDIR.margemDoPiso;
}

export interface FechamentoDaCorrida {
  /** Quanto ele recebe pelas que entregou no tempo. */
  recebe: number;
  /** O desgaste da bicicleta, cobrado mesmo nas que falharam. */
  desgaste: number;
  /** As que ele tem que levar de volta para a loja. */
  devolver: readonly Encomenda[];
  /** Recebe menos desgaste. Pode ser negativo — e o recado do jogo. */
  sobra: number;
}

/**
 * Fecha a corrida: o que ele recebe, o que gastou, o que tem que devolver.
 *
 * O piso so vale para a corrida de UMA encomenda cumprida. Quem pegou seis e
 * derrubou cinco nao esta no basico: esta na ambicao, e a ambicao arrisca.
 */
export function fecharCorrida(
  encomendas: readonly Encomenda[],
  metrosRodados: number,
  freteDe: (e: Encomenda) => number
): FechamentoDaCorrida {
  const entregues = encomendas.filter(e => e.estado === "entregue");
  const devolver = encomendas.filter(e => e.estado === "estourada");
  let recebe = entregues.reduce((s, e) => s + freteDe(e), 0);
  const desgaste = desgasteDaCorrida(metrosRodados);
  if (encomendas.length === 1 && entregues.length === 1) {
    recebe = Math.max(recebe, pisoDaCorridaPequena(metrosRodados));
  }
  return { recebe, desgaste, devolver, sobra: recebe - desgaste };
}

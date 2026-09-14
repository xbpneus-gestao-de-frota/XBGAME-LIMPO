/**
 * O PORTAO DA INTELIGENCIA — ela so passa nos momentos extremos.
 *
 * Ordem dele, 13/09/2026: "so acionar em momentos extremos do game, nao seria
 * toda hora".
 *
 * ── POR QUE UM PORTAO E NAO UM CONTADOR ───────────────────────────────────
 *
 * Contador de mensagens corta no meio de uma conversa boa e deixa passar cem
 * conversas sem importancia. O portao pergunta outra coisa: ESTE MOMENTO
 * MERECE? A conta de gasto sai de graca como consequencia — se so os momentos
 * que importam passam, sao poucas chamadas por hora de jogo, folgadissimo
 * dentro do que a camada gratuita da.
 *
 * ── OS QUATRO MOMENTOS QUE ELE ESCOLHEU ───────────────────────────────────
 *
 * 1. A PRIMEIRA conversa com aquela pessoa — e quando ela mais precisa soar
 *    viva, porque nao existe historico nenhum para o bairro usar.
 * 2. QUANDO DEU ERRADO — entrega falhou, atrasou feio, ou a pessoa esta brava
 *    a ponto de parar de pedir. E onde a frase pronta doi mais.
 * 3. VIRADAS GRANDES do jogo — primeira contratacao, recorde, bairro novo.
 *    Poucas por partida, e as que o jogador vai lembrar.
 * 4. QUANDO O BAIRRO NAO ENTENDEU — a piada, a pergunta torta, o assunto que
 *    ninguem previu. Hoje isso morre num "nao entendi".
 *
 * Todo o resto sai das falas do bairro, de graca.
 */
import type { MemoriaDoContato } from "./memoriaDoMorador";
import { assuntoDe } from "./entender";

export type MotivoDoExtremo =
  | "primeira-conversa"
  | "deu-errado"
  | "virada-do-jogo"
  | "nao-entendeu";

export interface Momento {
  /** O que o jogador acabou de escrever. */
  frase: string;
  /** A memoria que a pessoa tem dele. */
  memoria: MemoriaDoContato;
  /** Se voces ja trocaram alguma mensagem alguma vez. */
  jaConversaram: boolean;
  /**
   * Se o jogo marcou este instante como virada — primeira contratacao,
   * recorde, abrir area. Quem marca e o jogo, nunca este arquivo.
   */
  viradaDoJogo?: boolean;
}

/** DECISAO DELE: quantas seguidas ruins ja contam como "a pessoa esta brava". */
export const SEGUIDAS_RUINS_PARA_EXTREMO = 2;

/**
 * ESTE MOMENTO MERECE A INTELIGENCIA?
 *
 * Devolve o motivo quando merece, e null quando nao merece. O motivo NAO e
 * enfeite: ele vai junto no pedido, e e metade do que a inteligencia precisa
 * saber para nao ter que deduzir nada.
 */
export function momentoExtremo(m: Momento): MotivoDoExtremo | null {
  if (m.viradaDoJogo) return "virada-do-jogo";

  if (!m.jaConversaram) return "primeira-conversa";

  if (
    m.memoria.ultima === "falhou" ||
    m.memoria.seguidasRuins >= SEGUIDAS_RUINS_PARA_EXTREMO
  ) {
    return "deu-errado";
  }

  if (assuntoDe(m.frase) === null) return "nao-entendeu";

  return null;
}

/**
 * A LINHA QUE EXPLICA O MOMENTO PARA A INTELIGENCIA.
 *
 * Repare que nenhuma delas pede para a inteligencia DECIDIR alguma coisa: ela
 * recebe o que esta acontecendo e escreve. O jogo decide o que e quando; ela
 * decide so como soa.
 */
export const EXPLICACAO: Readonly<Record<MotivoDoExtremo, string>> = {
  "primeira-conversa":
    "E a primeira vez que voces falam. Ele ainda nao te entregou nada.",
  "deu-errado":
    "A ultima entrega dele deu errado, e voce esta chateado com isso.",
  "virada-do-jogo":
    "Aconteceu uma coisa grande no trabalho dele, e voce ficou sabendo.",
  "nao-entendeu":
    "Ele escreveu uma coisa que nao tem a ver com a entrega. Responde como gente responderia.",
};

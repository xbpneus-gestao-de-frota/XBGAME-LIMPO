/**
 * Quem e o jogador: o nome dele e qual entregador ele escolheu.
 *
 * A escolha acontece uma vez, na primeira entrada, e vale para o jogo inteiro
 * — e por isso ela mora no save, e nao numa marca do navegador como a cena de
 * abertura. Abertura e uma coisa que ja aconteceu; entregador e uma coisa que
 * a pessoa E.
 *
 * O `jeito` de cada um nao e enfeite de tela: e a voz que os baloes de fala do
 * modo 2D vao usar. Escolher entre oito bonecos identicos por dentro seria
 * escolha sem consequencia; escolher entre oito jeitos muda o que o jogo diz a
 * pessoa a cada entrega. Nenhum deles pedala mais rapido que o outro — a
 * diferenca e de voz e nao de numero, porque uma tela de boas-vindas e a pior
 * hora de pedir uma decisao com vantagem escondida, que a pessoa ainda nao tem
 * como avaliar.
 */

export type EntregadorId =
  | "teo"
  | "duda"
  | "kau"
  | "rafa"
  | "nino"
  | "lia"
  | "bento"
  | "manu";

export interface Entregador {
  id: EntregadorId;
  /** Nome curto, do jeito que alguem chamaria na rua. */
  nome: string;
  /** A voz dele, numa linha. E daqui que sai o balao de fala. */
  jeito: string;
  arte: string;
}

/**
 * Os oito, na ordem em que aparecem na folha de arte.
 *
 * Os nomes sao provisorios — a marca tem familia de mascote e voz propria, e
 * batizar personagem e do Fernando. Trocar aqui troca em todo lugar.
 */
export const ENTREGADORES: readonly Entregador[] = [
  {
    id: "teo",
    nome: "Téo",
    jeito: "Fala pouco. Chega antes.",
    arte: "/assets/XB_Entregador_1.webp",
  },
  {
    id: "duda",
    nome: "Duda",
    jeito: "Ri de ladeira e de chuva.",
    arte: "/assets/XB_Entregador_2.webp",
  },
  {
    id: "kau",
    nome: "Kau",
    jeito: "Sabe o nome de todo mundo da rua.",
    arte: "/assets/XB_Entregador_3.webp",
  },
  {
    id: "rafa",
    nome: "Rafa",
    jeito: "Pedala no ritmo, nunca no relógio.",
    arte: "/assets/XB_Entregador_4.webp",
  },
  {
    id: "nino",
    nome: "Nino",
    jeito: "Já saiu antes de você terminar de falar.",
    arte: "/assets/XB_Entregador_5.webp",
  },
  {
    id: "lia",
    nome: "Lia",
    jeito: "Não sai sem capacete. E não discute.",
    arte: "/assets/XB_Entregador_6.webp",
  },
  {
    id: "bento",
    nome: "Bento",
    jeito: "Sem pressa, sem erro.",
    arte: "/assets/XB_Entregador_7.webp",
  },
  {
    id: "manu",
    nome: "Manu",
    jeito: "Comemora toda entrega como se fosse a primeira.",
    arte: "/assets/XB_Entregador_8.webp",
  },
] as const;

export const ENTREGADOR_PADRAO: EntregadorId = "teo";

/** Tamanho maximo do nome, em caracteres. */
export const LIMITE_DO_NOME = 18;
/** Menos que isto nao e nome, e engano de teclado. */
export const MINIMO_DO_NOME = 2;

export function ehEntregador(id: unknown): id is EntregadorId {
  return typeof id === "string" && ENTREGADORES.some(pessoa => pessoa.id === id);
}

export function acharEntregador(id: unknown): Entregador {
  return ENTREGADORES.find(pessoa => pessoa.id === id) ?? ENTREGADORES[0]!;
}

/**
 * Os invisiveis que vem colados quando alguem cola um nome de outro lugar.
 *
 * Eles nao aparecem na tela mas contam no tamanho: um nome feito so deles
 * passaria pela validacao e depois apareceria EM BRANCO no jogo inteiro, sem
 * erro nenhum para explicar por que. Sao os caracteres de controle, o hifen
 * suave, os zero-width, as marcas de direcao de texto e o BOM.
 */
// eslint-disable-next-line no-control-regex
const INVISIVEIS =
  /[\u0000-\u001F\u007F\u00AD\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g;

/**
 * Arruma o que a pessoa digitou: tira invisivel, junta espaco repetido, corta
 * no limite. Acento fica — e nome de gente.
 */
export function limparNome(bruto: unknown): string {
  if (typeof bruto !== "string") return "";
  return (
    bruto
      /*
       * A ORDEM AQUI IMPORTA, e um teste pegou isso.
       *
       * Quebra de linha e tabulacao sao caracteres de controle, e estavam
       * caindo no corte dos invisiveis ANTES de virarem espaco. Resultado:
       * "Ana\nPaula" colado de outro lugar virava "AnaPaula", grudado. Entao
       * primeiro todo branco vira espaco, e so depois some o que e invisivel
       * de verdade.
       */
      .replace(/\s+/g, " ")
      .replace(INVISIVEIS, "")
      // Tirar um invisivel do meio pode ter deixado dois espacos juntos.
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, LIMITE_DO_NOME)
      .trim()
  );
}

export function nomeValido(bruto: unknown): boolean {
  return limparNome(bruto).length >= MINIMO_DO_NOME;
}

/** A pessoa ainda precisa se apresentar? */
export function precisaSeApresentar(estado: {
  playerName?: string;
  playerAvatarId?: string;
}): boolean {
  return !nomeValido(estado.playerName) || !ehEntregador(estado.playerAvatarId);
}

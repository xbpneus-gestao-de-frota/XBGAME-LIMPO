/**
 * OS QUE PEDALAM NO MAPA — quem tem desenho proprio, e onde estao os desenhos.
 *
 * Ordem dele, 11/09/2026: "esta sera nossa segunda integrante da equipe
 * Lorena", "a Lorena entre no lugar da menina de rabo de cavalo" e, depois de
 * ver ela testada no mapa, "por enquanto gere mesmo formato de renan, devemos
 * ter os dois na tela coletando e entregando".
 *
 * Cada pessoa daqui tem as mesmas cinco folhas (quatro de pedalar e uma de
 * cenas na porta), passadas pelo mesmo script (scripts/entregador/grades.py).
 * O que muda de uma para a outra e so isto: o comeco do nome dos arquivos, os
 * rumos que as folhas dela deram e as medidas das cenas.
 */
import { QUEM_LIGA } from "./aChamada";
import {
  CENAS_DA_LORENA,
  CENAS_DO_RENAN,
  type ConjuntoDeCenas,
} from "./asCenasParadas";
import { DA_LORENA, DO_RENAN, type ConjuntoDeMoldes } from "./rumoDoEntregador";

export type QuemPedala = "renan" | "lorena";

export interface OsDesenhosDe {
  quem: QuemPedala;
  /** O comeco do nome de cada arquivo em client/public/assets. */
  prefixo: string;
  moldes: ConjuntoDeMoldes;
  cenas: ConjuntoDeCenas;
}

export const DESENHOS_DE: Readonly<Record<QuemPedala, OsDesenhosDe>> = {
  // O Renan continua com os nomes de sempre: nada do que ja existe muda.
  renan: {
    quem: "renan",
    prefixo: "XB_Entregador",
    moldes: DO_RENAN,
    cenas: CENAS_DO_RENAN,
  },
  lorena: {
    quem: "lorena",
    prefixo: "XB_Lorena",
    moldes: DA_LORENA,
    cenas: CENAS_DA_LORENA,
  },
};

/**
 * A LORENA NA LISTA DO BAIRRO. O id e o da vaga que ela tomou na lista de
 * candidatos (a segunda, a da menina de rabo de cavalo).
 */
export const LORENA = { id: "cand-lorena", nome: "Lorena" } as const;

/**
 * ── ELA AINDA NAO ENTRA NA EQUIPE ─────────────────────────────────────────
 *
 * Ordem dele, 13/09/2026: "ainda nao entramos na fase dos pedidos, Lorena
 * ainda nao deve aparecer na equipe".
 *
 * Ela CHEGOU a entrar junto com o Renan enquanto o passeio de teste precisava
 * de dois desenhos pedalando o bairro. Com o passeio desligado, a equipe volta
 * a contar a historia na ordem: quem entra por cena e o Renan, e a segunda
 * pessoa entra quando a historia a contratar — nao antes.
 *
 * DESLIGAR AQUI NAO APAGA NADA DELA. Os desenhos, os moldes, as cenas paradas
 * e a vaga na lista de candidatos continuam inteiros e testados. Este
 * interruptor so decide se ela ja comeca contratada; virar para `true` de
 * volta e uma linha.
 */
export const LORENA_JA_NA_EQUIPE = false;

/** Quem tem desenho proprio no mapa, pelo nome que a pessoa tem na equipe. */
export function quemPedalaPeloNome(nome: string): QuemPedala | null {
  if (nome === QUEM_LIGA.nome) return "renan";
  if (nome === LORENA.nome) return "lorena";
  return null;
}

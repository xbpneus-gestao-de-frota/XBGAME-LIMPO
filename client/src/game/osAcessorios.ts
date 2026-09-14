/**
 * OS ACESSORIOS DO ENTREGADOR — o que ele leva no corpo, e nao na bicicleta.
 *
 * Ordem dele, 13/09/2026: "acessorios podem entrar como garrafa de agua maior,
 * protetor solar, etc, isso sendo melhorado".
 *
 * ── POR QUE ESTES TRES, E NAO UMA VITRINE ─────────────────────────────────
 *
 * Porque cada um destes mexe num numero que o folego JA USA hoje:
 *
 *   · A GARRAFA muda quanto volta por segundo parado.
 *   · O PROTETOR muda quanto o sol do meio-dia pesa.
 *   · O CINTO muda quanto a bolsa cheia pesa.
 *
 * Um quarto acessorio bonito que nao mexesse em nada seria decoracao cara: a
 * pessoa gastaria dinheiro de verdade e nada mudaria na rua. Quando o
 * expediente e as paradas entrarem, nascem os acessorios deles — capa de
 * chuva, farol, marmita — e cada um com o numero dele.
 *
 * ── POR QUE TRES NIVEIS, E NAO CINCO COMO A BICICLETA ─────────────────────
 *
 * Peca de bicicleta e um caminho longo: o pneu acompanha a empresa do comeco
 * ao fim. Acessorio e um alivio pontual e barato — cinco degraus fariam a
 * pessoa passar a vida comprando garrafa. Tres degraus resolvem o assunto e
 * saem do caminho.
 *
 * ── OS ALIVIOS SAO FRACAO DO PESO, E NUNCA VIRAM VANTAGEM ─────────────────
 *
 * Protetor no ultimo nivel tira 80% do peso do sol; nao tira 100%, e em
 * nenhum caso o sol passa a AJUDAR. Isso e de proposito: acessorio que anula
 * o problema apaga a decisao de quando trabalhar, que e justamente o que a
 * saude veio criar.
 */

/** Os tres acessorios. */
export type IdDoAcessorio = "agua" | "sol" | "carga";

/** Em que nivel esta cada acessorio. Zero e "nao tem". */
export type NiveisDosAcessorios = Record<IdDoAcessorio, number>;

/** Um degrau de um acessorio. */
export interface NivelDoAcessorio {
  level: number;
  name: string;
  cost: number;
  /** Quanto folego a mais volta por segundo parado. */
  aguaPorSegundo?: number;
  /** Fracao do peso do sol que deixa de pesar, de 0 a 1. */
  alivioDoSol?: number;
  /** Fracao do peso da bolsa que deixa de pesar, de 0 a 1. */
  alivioDaCarga?: number;
}

export interface AcessorioConfig {
  id: IdDoAcessorio;
  name: string;
  shortName: string;
  description: string;
  /** Em que nivel da empresa ele aparece. */
  unlockLevel: number;
  tiers: readonly NivelDoAcessorio[];
}

export const MAX_NIVEL_DO_ACESSORIO = 3;

export const ACESSORIOS_ZERADOS: Readonly<NiveisDosAcessorios> = {
  agua: 0,
  sol: 0,
  carga: 0,
};

/*
 * OS PRECOS.
 *
 * Todos comecam abaixo do primeiro pneu (trinta), porque acessorio e o
 * primeiro gasto de quem ainda nao tem nada — e o unico alivio que cabe no
 * bolso no primeiro dia. O ultimo degrau de cada um custa perto do terceiro
 * degrau de uma peca de bicicleta: quando a pessoa chega la, ja escolhe entre
 * as duas coisas, e ai a escolha vale alguma coisa.
 */
export const ACESSORIOS: readonly AcessorioConfig[] = [
  {
    id: "agua",
    name: "Garrafa de água",
    shortName: "Água",
    description: "Parado, recupera mais depressa.",
    unlockLevel: 1,
    tiers: [
      { level: 1, name: "Squeeze de 500 ml", cost: 20, aguaPorSegundo: 0.01 },
      {
        level: 2,
        name: "Garrafa térmica de 1 litro",
        cost: 90,
        aguaPorSegundo: 0.022,
      },
      {
        level: 3,
        name: "Mochila de hidratação de 2 litros",
        cost: 260,
        aguaPorSegundo: 0.04,
      },
    ],
  },
  {
    id: "sol",
    name: "Protetor solar",
    shortName: "Sol",
    description: "O meio-dia pesa menos.",
    unlockLevel: 1,
    tiers: [
      { level: 1, name: "Protetor fator 30", cost: 15, alivioDoSol: 0.3 },
      {
        level: 2,
        name: "Fator 50 e boné de aba",
        cost: 70,
        alivioDoSol: 0.55,
      },
      {
        level: 3,
        name: "Fator 50, manguito e viseira",
        cost: 200,
        alivioDoSol: 0.8,
      },
    ],
  },
  {
    id: "carga",
    name: "Cinto de carga",
    shortName: "Cinto",
    description: "A bolsa cheia pesa menos nas costas.",
    unlockLevel: 2,
    tiers: [
      { level: 1, name: "Ombreira acolchoada", cost: 30, alivioDaCarga: 0.25 },
      { level: 2, name: "Cinto de carga", cost: 100, alivioDaCarga: 0.5 },
      {
        level: 3,
        name: "Colete que divide o peso",
        cost: 240,
        alivioDaCarga: 0.75,
      },
    ],
  },
];

export const acessorio = (id: IdDoAcessorio): AcessorioConfig =>
  ACESSORIOS.find(a => a.id === id) ?? ACESSORIOS[0]!;

/** Quanto custa subir mais um degrau. Nulo quando ja esta no topo. */
export function custoDoAcessorio(
  id: IdDoAcessorio,
  nivelAtual: number
): number | null {
  const proximo = acessorio(id).tiers.find(
    t => t.level === Math.max(0, Math.floor(nivelAtual)) + 1
  );
  return proximo?.cost ?? null;
}

/** O degrau em que este acessorio esta agora. Sem nivel, nao ha degrau. */
export function degrauDoAcessorio(
  id: IdDoAcessorio,
  nivel: number
): NivelDoAcessorio | undefined {
  return acessorio(id).tiers.find(t => t.level === Math.floor(nivel));
}

/** O que os acessorios juntos aliviam. Cada alivio para em 0,9. */
export interface AlivioDosAcessorios {
  aguaPorSegundo: number;
  alivioDoSol: number;
  alivioDaCarga: number;
}

/**
 * O ALIVIO SOMADO.
 *
 * Sao tres acessorios que nao competem entre si, entao a soma e direta: cada
 * um mexe no seu proprio numero. O teto de 0,9 existe para o caso de alguem
 * somar um quarto acessorio no mesmo alivio um dia — sem ele, dois acessorios
 * de sol poderiam zerar o meio-dia, e o meio-dia deixaria de ser uma decisao.
 */
export function alivioDosAcessorios(
  niveis: Readonly<NiveisDosAcessorios>
): AlivioDosAcessorios {
  const soma = (leia: (t: NivelDoAcessorio) => number | undefined): number =>
    ACESSORIOS.reduce((total, a) => {
      const degrau = degrauDoAcessorio(a.id, niveis[a.id] ?? 0);
      return total + (degrau ? (leia(degrau) ?? 0) : 0);
    }, 0);

  return {
    aguaPorSegundo: soma(t => t.aguaPorSegundo),
    alivioDoSol: Math.min(0.9, soma(t => t.alivioDoSol)),
    alivioDaCarga: Math.min(0.9, soma(t => t.alivioDaCarga)),
  };
}

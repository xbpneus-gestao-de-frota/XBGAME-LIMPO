/**
 * A economia da transportadora XB.
 *
 * Aqui mora a conta que faz o jogo inteiro funcionar do pedal ao planeta: o
 * frete que o cliente paga, o custo de rodar, o repasse ao condutor e o que
 * sobra para a transportadora. E a mesma formula da bicicleta ate a carreta —
 * o que muda sao os numeros, nao a regra. Por isso a carreta nao precisa de
 * uma "recompensa" escrita a mao: ela tem R$/km e capacidade maiores, e a
 * conta se vira.
 *
 * ── DE ONDE VEM CADA NUMERO ────────────────────────────────────────────────
 * Os valores marcados FONTE sao reais, levantados em setembro de 2026:
 *
 *   Piso minimo de frete — Resolucao ANTT 6.084/2026, tabela de carga geral:
 *   frete = km x CCD + CC. Toco: CCD 3,9826 e CC 451,84. Carreta de 5 eixos:
 *   CCD 6,6718 e CC 657,56.
 *
 *   Combustivel — media nacional ANP, semana de 23 a 29/08/2026: gasolina
 *   R$ 6,53/l e diesel S10 R$ 6,88/l.
 *
 *   Entrega urbana — piso iFood R$ 7,50 por entrega mais R$ 1,50/km acima de
 *   4 km; transportadoras praticam R$ 8 a 10 de saida e R$ 1,50 a 2,30/km.
 *
 *   Manutencao de caminhao — R$ 0,19/km, Norma CONAB 30.202 (metodologia
 *   oficial de custo operacional rodoviario).
 *
 *   Pneus — exemplo real de carreta: R$ 33.000 em 22 pneus por 126.000 km,
 *   ou R$ 0,36/km.
 *
 * Os valores marcados ESTIMADO nao tem fonte publicada — a depreciacao em
 * R$/km de van, caminhao e carreta simplesmente nao e publicada, e a
 * manutencao de van tambem nao. Eles estao aqui como marcador honesto, para
 * serem trocados quando a XB puser os numeros de casa. Nunca inventar um
 * numero e chama-lo de real: numero que mente calado e o pior tipo de erro.
 */

export type ClasseDeVeiculo =
  | "bicicleta"
  | "moto"
  | "van"
  | "caminhao"
  | "carreta";

/** De quem e o veiculo. Muda tudo no repasse e em quem paga o rodar. */
export type DonoDoVeiculo = "condutor" | "transportadora";

export interface CustoPorKm {
  combustivel: number;
  pneus: number;
  manutencao: number;
  depreciacao: number;
}

export interface TabelaDoVeiculo {
  classe: ClasseDeVeiculo;
  nome: string;
  /** Parte fixa do frete: a saida, a coleta, a carga e descarga. */
  freteFixo: number;
  /** Parte por quilometro rodado. */
  fretePorKm: number;
  /** Quantos volumes cabem numa saida. */
  capacidade: number;
  /** Adicional por volume entregue, alem do fixo e do km. */
  fretePorItem: number;
  custo: CustoPorKm;
  /** Quais numeros do custo ainda nao tem fonte publicada. */
  estimados: ReadonlyArray<keyof CustoPorKm>;
}

/**
 * A frota, do pedal ao planeta. Bicicleta e o unico veiculo sem fonte de
 * custo: nao ha tabela publicada de R$/km de bicicleta de carga, e os valores
 * abaixo sao o desgaste de corrente, pneu e freio dividido por quilometro.
 */
export const FROTA: Readonly<Record<ClasseDeVeiculo, TabelaDoVeiculo>> = {
  bicicleta: {
    classe: "bicicleta",
    nome: "Bike Cargo XB",
    // FONTE: piso iFood bicicleta, R$ 7,00 por entrega.
    freteFixo: 7,
    fretePorKm: 1.5,
    capacidade: 3,
    fretePorItem: 1.5,
    custo: {
      combustivel: 0,
      pneus: 0.01,
      manutencao: 0.02,
      depreciacao: 0.01,
    },
    estimados: ["pneus", "manutencao", "depreciacao"],
  },
  moto: {
    classe: "moto",
    nome: "Moto Express XB",
    // FONTE: piso iFood moto R$ 7,50; transportadoras, R$ 8 a 10 de saida.
    freteFixo: 8,
    fretePorKm: 1.8,
    capacidade: 8,
    fretePorItem: 2,
    custo: {
      // FONTE: gasolina R$ 6,53/l (ANP) a 40 km/l.
      combustivel: 0.163,
      // FONTE: par de pneus de moto, R$ 0,029 a 0,054/km.
      pneus: 0.042,
      // FONTE: R$ 1.100 a 1.400 ao ano em 15.000 km.
      manutencao: 0.07,
      // FONTE: R$ 813/mes em ~3.380 km/mes.
      depreciacao: 0.24,
    },
    estimados: [],
  },
  van: {
    classe: "van",
    nome: "Van Carga XB",
    freteFixo: 45,
    fretePorKm: 3.2,
    capacidade: 60,
    fretePorItem: 1.2,
    custo: {
      // FONTE: diesel S10 R$ 6,88/l (ANP) a 10,1 km/l na cidade.
      combustivel: 0.681,
      // FONTE: pneu 205/75 R16C, R$ 0,011 a 0,019/km por pneu, quatro rodas.
      pneus: 0.06,
      manutencao: 0.15,
      depreciacao: 0.3,
    },
    estimados: ["manutencao", "depreciacao"],
  },
  caminhao: {
    classe: "caminhao",
    nome: "Caminhao Estradeiro XB",
    // FONTE: ANTT 6.084/2026, dois eixos (toco): CC 451,84 e CCD 3,9826.
    freteFixo: 451.84,
    fretePorKm: 3.9826,
    capacidade: 600,
    fretePorItem: 0.4,
    custo: {
      // FONTE: diesel S10 R$ 6,88/l (ANP) a 5,5 a 7,0 km/l.
      combustivel: 1.1,
      pneus: 0.13,
      // FONTE: Norma CONAB 30.202.
      manutencao: 0.19,
      depreciacao: 0.35,
    },
    estimados: ["depreciacao"],
  },
  carreta: {
    classe: "carreta",
    nome: "Carreta XB",
    // FONTE: ANTT 6.084/2026, cinco eixos: CC 657,56 e CCD 6,6718.
    freteFixo: 657.56,
    fretePorKm: 6.6718,
    capacidade: 2400,
    fretePorItem: 0.2,
    custo: {
      // FONTE: diesel S10 R$ 6,88/l (ANP) a 1,8 a 2,5 km/l.
      combustivel: 3.2,
      // FONTE: R$ 33.000 em 22 pneus por 126.000 km.
      pneus: 0.36,
      // FONTE: Norma CONAB 30.202.
      manutencao: 0.195,
      depreciacao: 0.6,
    },
    estimados: ["depreciacao"],
  },
};

/**
 * A fatia do frete que fica com quem dirige.
 *
 * Escolha do Fernando, e ela e o coracao da decisao do jogador: quem poe o
 * proprio veiculo leva quase tudo, mas banca o combustivel, o pneu, a
 * manutencao e a depreciacao; quem roda com veiculo da XB leva pouco, e nao
 * gasta nada. Um ganha por corrida, o outro ganha por volume — e a XB so
 * cresce colocando muita gente na rua ao mesmo tempo.
 */
export const REPASSE: Readonly<Record<DonoDoVeiculo, number>> = {
  condutor: 0.8,
  transportadora: 0.15,
};

export interface Fechamento {
  /** O que o cliente paga. */
  frete: number;
  /** O custo de rodar a distancia, com este veiculo. */
  custoDeRodar: number;
  custoDetalhado: CustoPorKm;
  /** Quanto o condutor leva para casa, ja descontado o que ele paga. */
  ganhoDoCondutor: number;
  /** Quanto sobra para a transportadora. */
  lucroDaTransportadora: number;
}

/** O que o cliente paga por esta saida. */
export function calcularFrete(
  classe: ClasseDeVeiculo,
  km: number,
  itens: number
): number {
  const tabela = FROTA[classe];
  const distancia = Math.max(0, km);
  const volumes = Math.max(0, Math.min(itens, tabela.capacidade));
  return (
    tabela.freteFixo +
    distancia * tabela.fretePorKm +
    volumes * tabela.fretePorItem
  );
}

/** O custo de rodar esta distancia, aberto item a item. */
export function custoDeRodar(classe: ClasseDeVeiculo, km: number): CustoPorKm {
  const { custo } = FROTA[classe];
  const distancia = Math.max(0, km);
  return {
    combustivel: custo.combustivel * distancia,
    pneus: custo.pneus * distancia,
    manutencao: custo.manutencao * distancia,
    depreciacao: custo.depreciacao * distancia,
  };
}

const somar = (custo: CustoPorKm): number =>
  custo.combustivel + custo.pneus + custo.manutencao + custo.depreciacao;

/**
 * Fecha a conta de uma saida.
 *
 * Quem paga o rodar e quem e dono do veiculo — e nao ha meio termo: ou o custo
 * sai do bolso do condutor, ou sai do caixa da transportadora. Este e o ponto
 * em que o pneu deixa de ser enfeite de menu e vira margem: com veiculo da XB,
 * cada quilometro consome pneu do caixa da empresa.
 */
export function fecharConta(
  classe: ClasseDeVeiculo,
  km: number,
  itens: number,
  dono: DonoDoVeiculo
): Fechamento {
  const frete = calcularFrete(classe, km, itens);
  const detalhado = custoDeRodar(classe, km);
  const custo = somar(detalhado);
  const repasse = frete * REPASSE[dono];

  const ganhoDoCondutor = dono === "condutor" ? repasse - custo : repasse;
  const lucroDaTransportadora =
    dono === "condutor" ? frete - repasse : frete - repasse - custo;

  return {
    frete,
    custoDeRodar: custo,
    custoDetalhado: detalhado,
    ganhoDoCondutor,
    lucroDaTransportadora,
  };
}

/* ─── Habilitacao ──────────────────────────────────────────────────────────
 *
 * Ninguem sobe de veiculo so porque juntou dinheiro: precisa estar habilitado
 * para aquela funcao. As exigencias abaixo sao as de verdade (CTB art. 143 e
 * 145, Lei 12.009/2009 do moto-frete), o que da ao jogo uma escada que ja
 * existe no mundo — e que ensina algo real a quem joga.
 */

export interface Habilitacao {
  classe: ClasseDeVeiculo;
  /** Nome da categoria, como no mundo real. */
  categoria: string;
  /** O que precisa ter antes. */
  exige: ClasseDeVeiculo | null;
  /** Curso obrigatorio, quando ha. */
  curso: string | null;
  /**
   * Quanto tempo de estrada na categoria anterior. No mundo sao meses; no
   * jogo, entregas concluidas — e a moeda de tempo que o jogo tem.
   */
  entregasExigidas: number;
  /** Custo do treinamento, no dinheiro do jogo. */
  custo: number;
}

export const HABILITACOES: Readonly<Record<ClasseDeVeiculo, Habilitacao>> = {
  bicicleta: {
    classe: "bicicleta",
    categoria: "Sem habilitacao",
    exige: null,
    curso: null,
    entregasExigidas: 0,
    custo: 0,
  },
  moto: {
    classe: "moto",
    categoria: "CNH A + moto-frete",
    exige: "bicicleta",
    // Lei 12.009/2009: curso especializado obrigatorio para entrega remunerada.
    curso: "Curso de moto-frete",
    entregasExigidas: 12,
    custo: 900,
  },
  van: {
    classe: "van",
    categoria: "CNH B",
    exige: "moto",
    curso: null,
    entregasExigidas: 40,
    custo: 2_600,
  },
  caminhao: {
    classe: "caminhao",
    // CTB art. 145: um ano na categoria B, sem infracao gravissima.
    categoria: "CNH C",
    exige: "van",
    curso: "Curso de carga (10 h praticas)",
    entregasExigidas: 120,
    custo: 7_500,
  },
  carreta: {
    classe: "carreta",
    // CTB art. 145: um ano na categoria C.
    categoria: "CNH E",
    exige: "caminhao",
    curso: "Curso de combinacao de veiculos",
    entregasExigidas: 300,
    custo: 18_000,
  },
};

export interface EstadoDoCondutor {
  habilitacoes: ReadonlyArray<ClasseDeVeiculo>;
  entregas: number;
  caixa: number;
}

export type MotivoDeBloqueio =
  | "falta-habilitacao-anterior"
  | "falta-experiencia"
  | "falta-dinheiro";

export interface Elegibilidade {
  pode: boolean;
  motivo?: MotivoDeBloqueio;
  /** Quanto falta, na unidade do motivo. Zero quando nao falta nada. */
  faltam: number;
}

/**
 * Da para tirar esta habilitacao agora?
 *
 * A ordem das respostas importa: primeiro o que nao se compra (a habilitacao
 * anterior e a experiencia), depois o dinheiro. Dizer "falta dinheiro" a quem
 * nem pode fazer o curso e mandar a pessoa juntar moeda para nada.
 */
export function podeTreinar(
  classe: ClasseDeVeiculo,
  estado: EstadoDoCondutor
): Elegibilidade {
  const exigencia = HABILITACOES[classe];
  if (estado.habilitacoes.includes(classe)) return { pode: true, faltam: 0 };

  if (exigencia.exige && !estado.habilitacoes.includes(exigencia.exige)) {
    return { pode: false, motivo: "falta-habilitacao-anterior", faltam: 1 };
  }
  if (estado.entregas < exigencia.entregasExigidas) {
    return {
      pode: false,
      motivo: "falta-experiencia",
      faltam: exigencia.entregasExigidas - estado.entregas,
    };
  }
  if (estado.caixa < exigencia.custo) {
    return {
      pode: false,
      motivo: "falta-dinheiro",
      faltam: exigencia.custo - estado.caixa,
    };
  }
  return { pode: true, faltam: 0 };
}

/** Pode dirigir este veiculo hoje? */
export function podeDirigir(
  classe: ClasseDeVeiculo,
  estado: EstadoDoCondutor
): boolean {
  return classe === "bicicleta" || estado.habilitacoes.includes(classe);
}

/* ─── A ponte com a carreira ───────────────────────────────────────────────
 *
 * A campanha tem seis veiculos com nomes proprios; a conta de frete tem cinco
 * classes reais. O mapa entre os dois mora aqui, e nao espalhado por ai, para
 * a pergunta "quanto vale esta rota?" ter uma resposta so.
 */

/** Os veiculos da carreira, na ordem das eras. */
export type VeiculoDaCarreira =
  | "bike"
  | "moto"
  | "van"
  | "truck"
  | "fleet"
  | "planetary";

/**
 * De qual classe real cada veiculo da carreira se aproxima.
 *
 * O transportador planetario nao tem tabela no mundo — nao ha ANTT de Marte.
 * Ele herda a carreta por ser o veiculo mais pesado que existe de verdade, e
 * a era planetaria se distingue pela distancia, nao por uma tarifa inventada.
 */
export const CLASSE_DO_VEICULO: Readonly<
  Record<VeiculoDaCarreira, ClasseDeVeiculo>
> = {
  bike: "bicicleta",
  moto: "moto",
  van: "van",
  truck: "caminhao",
  fleet: "carreta",
  planetary: "carreta",
};

/**
 * Quanto uma rota da carreira paga, pela conta de frete de verdade.
 *
 * `volumes` e quanto o veiculo leva nesta viagem. Quando nao vier, assume a
 * carga cheia da classe: rota de carreira e contrato fechado, e ninguem manda
 * uma carreta rodar mil quilometros com meia carga.
 */
export function freteDaRotaDaCarreira(
  veiculo: VeiculoDaCarreira,
  km: number,
  volumes?: number
): number {
  const classe = CLASSE_DO_VEICULO[veiculo];
  return calcularFrete(classe, km, volumes ?? FROTA[classe].capacidade);
}

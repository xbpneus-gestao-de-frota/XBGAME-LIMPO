/**
 * A EQUAÇÃO MESTRA — o que muda quando o entregador troca de veículo.
 *
 * Ordem dele, 13/09/2026: "agora precisamos recalcular regras de itens e
 * veículos, saúde se uso de veículo X ou Y, agora precisamos de uma equação
 * mestra: se mudarmos de um veículo, o que aumenta de saúde, velocidade, tudo,
 * e tudo que afeta ao entregador e tempo de entrega e desgaste".
 *
 * ── O PROBLEMA QUE ELA RESOLVE ────────────────────────────────────────────
 *
 * Até aqui, "quanto anda" morava num lugar, "quanto cansa" morava em outro, e
 * "quanto melhora com peça nova" num terceiro. Com dois veículos dava para
 * viver assim. Com trinta (seis famílias × cinco degraus), qualquer resposta a
 * "e se ele trocar de triciclo para patinete?" exigiria abrir três tabelas e
 * torcer para que ninguém tivesse mexido em uma sem mexer nas outras.
 *
 * Aqui mora UMA tabela e UMA conta. Todo o resto pergunta.
 *
 * ── AS QUATRO COISAS QUE UM VEÍCULO É ─────────────────────────────────────
 *
 * Cada veículo do jogo é quatro números, e só:
 *
 *   1. SEGUNDOS POR KM — quanto ele demora. Menor é mais rápido.
 *   2. CANSAÇO — quanto do fôlego ele cobra por quilômetro rodado.
 *   3. BOLSA — quantas encomendas cabem de uma vez.
 *   4. DESGASTE — quanto ele se gasta por quilômetro. Maior quebra mais.
 *
 * Quatro chegam porque toda pergunta do jogo se responde com eles: tempo de
 * entrega sai de (1), saúde do entregador sai de (2), quanto serviço aceitar
 * sai de (3), e quanto custa manter sai de (4).
 *
 * ── AS TRÊS REGRAS QUE SEGURAM A TABELA ───────────────────────────────────
 *
 * Sem regra, trinta veículos viram trinta opiniões. Estas três valem para os
 * seis, e é por elas que a tabela se lê de cima a baixo:
 *
 *   CARGA BRIGA COM VELOCIDADE. Quem leva mais anda mais devagar. O triciclo
 *   de carga leva quatorze e rasteja; os patins voam e levam um. Sem essa
 *   briga, existiria um veículo melhor em tudo, e escolher deixaria de ser uma
 *   decisão.
 *
 *   O MOTOR TIRA O CANSAÇO E COBRA NO DESGASTE. Do degrau 4 para cima o fôlego
 *   despenca — e a máquina se gasta mais rápido. O elétrico não é de graça: ele
 *   troca suor por manutenção, que é a conversa que o jogo quer ter.
 *
 *   O DEGRAU 3 É SEMPRE O DE CARGA. Em toda família, o terceiro leva bem mais
 *   e perde um pouco de velocidade. Quem aprendeu isso na bicicleta já sabe ler
 *   a coluna do caiaque.
 *
 * ── POR QUE A PEÇA NOVA NÃO VALE IGUAL EM TUDO ────────────────────────────
 *
 * Pneu bom e corrente nova mudam muito uma bicicleta e quase nada um caiaque.
 * Por isso cada família tem um APROVEITAMENTO: quanto da melhoria das peças
 * ela consegue usar. Sem isso, comprar corrente melhoraria o skate — e o
 * jogador aprenderia que as peças são números soltos, e não coisas.
 */
import {
  bikePartEffects,
  EMPTY_BIKE_PART_LEVELS,
  type BikePartLevels,
} from "./asPecasDaBicicleta";
import {
  ACESSORIOS_ZERADOS,
  alivioDosAcessorios,
  type NiveisDosAcessorios,
} from "./osAcessorios";

/** As seis famílias da loja. */
export type FamiliaDeVeiculo =
  | "bicicleta"
  | "patins"
  | "triciclo"
  | "patinete"
  | "caiaque"
  | "skate";

/** Um veículo é a família mais o degrau, de 1 a 5. */
export interface Veiculo {
  familia: FamiliaDeVeiculo;
  degrau: number;
}

export interface NumerosDoVeiculo {
  segundosPorKm: number;
  cansaco: number;
  bolsa: number;
  desgaste: number;
}

/* ── A TABELA ─────────────────────────────────────────────────────────────
 *
 * Lida de cima para baixo, cada coluna conta a história da família: o que ela
 * ganha e o que ela paga a cada degrau. O anchor é a bicicleta comum — vinte
 * segundos por quilômetro, cansaço um, bolsa quatro, desgaste um. Todo o resto
 * é medido contra ela.
 */
const TABELA: Readonly<
  Record<FamiliaDeVeiculo, readonly NumerosDoVeiculo[]>
> = {
  bicicleta: [
    { segundosPorKm: 20, cansaco: 1.0, bolsa: 4, desgaste: 1.0 },
    { segundosPorKm: 18, cansaco: 0.95, bolsa: 4, desgaste: 0.95 },
    { segundosPorKm: 19, cansaco: 1.05, bolsa: 7, desgaste: 0.9 },
    { segundosPorKm: 15, cansaco: 0.7, bolsa: 6, desgaste: 1.05 },
    { segundosPorKm: 12, cansaco: 0.45, bolsa: 6, desgaste: 1.15 },
  ],
  patins: [
    { segundosPorKm: 16, cansaco: 1.3, bolsa: 1, desgaste: 1.3 },
    { segundosPorKm: 15, cansaco: 1.25, bolsa: 1, desgaste: 1.2 },
    { segundosPorKm: 13, cansaco: 1.2, bolsa: 2, desgaste: 1.15 },
    { segundosPorKm: 13, cansaco: 1.1, bolsa: 2, desgaste: 1.0 },
    { segundosPorKm: 10, cansaco: 0.6, bolsa: 2, desgaste: 1.25 },
  ],
  triciclo: [
    { segundosPorKm: 26, cansaco: 1.1, bolsa: 8, desgaste: 0.85 },
    { segundosPorKm: 25, cansaco: 1.1, bolsa: 10, desgaste: 0.85 },
    { segundosPorKm: 24, cansaco: 1.15, bolsa: 14, desgaste: 0.8 },
    { segundosPorKm: 19, cansaco: 0.75, bolsa: 13, desgaste: 0.95 },
    { segundosPorKm: 16, cansaco: 0.5, bolsa: 13, desgaste: 1.05 },
  ],
  patinete: [
    { segundosPorKm: 19, cansaco: 1.15, bolsa: 2, desgaste: 1.2 },
    { segundosPorKm: 18, cansaco: 1.1, bolsa: 2, desgaste: 1.1 },
    { segundosPorKm: 19, cansaco: 1.15, bolsa: 4, desgaste: 1.05 },
    { segundosPorKm: 14, cansaco: 0.65, bolsa: 3, desgaste: 1.15 },
    { segundosPorKm: 11, cansaco: 0.4, bolsa: 3, desgaste: 1.25 },
  ],
  caiaque: [
    { segundosPorKm: 30, cansaco: 1.25, bolsa: 6, desgaste: 0.9 },
    { segundosPorKm: 29, cansaco: 1.25, bolsa: 9, desgaste: 0.9 },
    { segundosPorKm: 28, cansaco: 1.2, bolsa: 11, desgaste: 0.8 },
    { segundosPorKm: 22, cansaco: 0.8, bolsa: 10, desgaste: 1.0 },
    { segundosPorKm: 18, cansaco: 0.55, bolsa: 10, desgaste: 1.1 },
  ],
  skate: [
    { segundosPorKm: 18, cansaco: 1.35, bolsa: 1, desgaste: 1.35 },
    { segundosPorKm: 16, cansaco: 1.25, bolsa: 2, desgaste: 1.2 },
    { segundosPorKm: 18, cansaco: 1.3, bolsa: 3, desgaste: 1.15 },
    { segundosPorKm: 13, cansaco: 0.7, bolsa: 2, desgaste: 1.2 },
    { segundosPorKm: 11, cansaco: 0.45, bolsa: 2, desgaste: 1.3 },
  ],
};

/**
 * QUANTO DA MELHORIA DAS PEÇAS CADA FAMÍLIA CONSEGUE USAR.
 *
 * Pneu bom e corrente nova mudam muito uma bicicleta; num caiaque não há onde
 * pôr corrente. O número não é castigo: é o que impede a peça de virar um
 * bônus solto que serve para qualquer coisa.
 */
const APROVEITAMENTO: Readonly<Record<FamiliaDeVeiculo, number>> = {
  bicicleta: 1,
  triciclo: 0.8,
  patinete: 0.5,
  skate: 0.4,
  patins: 0.3,
  caiaque: 0.2,
};

/* ── AS DUAS ERAS ─────────────────────────────────────────────────────────
 *
 * Ordem dele, 13/09/2026: "moto, van, ônibus, caminhão, carreta será na mudança
 * de era do jogo, jogadores fazem 18 anos e começamos uma nova era".
 *
 * Isto está escrito aqui, e não só numa conversa, por um motivo prático: sem a
 * linha abaixo, qualquer um de nós — ele, o outro time ou eu — acabaria
 * colocando uma van na loja num dia de pressa, e o jogo perderia de graça a
 * única passagem de tempo que ele tem. A criança que entrega de bicicleta e o
 * adulto que dirige carreta são dois jogos, e a ponte entre eles é a maioridade.
 *
 * A era dos pedais é a que existe. A era dos motores é uma decisão tomada e
 * ainda não construída — e nenhum veículo dela entra na loja antes da virada.
 */
export const ERA_DOS_PEDAIS: readonly FamiliaDeVeiculo[] = [
  "bicicleta",
  "patins",
  "triciclo",
  "patinete",
  "caiaque",
  "skate",
];

/** Chegam quando o jogador faz 18 anos. Nenhum deles entra na loja antes. */
export const ERA_DOS_MOTORES: readonly string[] = [
  "moto",
  "van",
  "onibus",
  "caminhao",
  "carreta",
];

/** A idade em que o jogo vira de era. */
export const IDADE_DA_VIRADA = 18;

/** O veículo de quem ainda não trocou nada. */
export const VEICULO_DE_ENTRADA: Veiculo = { familia: "bicicleta", degrau: 1 };

/** Os quatro números de um veículo. Degrau fora da escada vira o mais perto. */
export function numerosDoVeiculo(v: Veiculo): NumerosDoVeiculo {
  const escada = TABELA[v.familia] ?? TABELA.bicicleta;
  const i = Math.min(escada.length - 1, Math.max(0, Math.round(v.degrau) - 1));
  return escada[i]!;
}

/* ── A EQUAÇÃO ────────────────────────────────────────────────────────────
 *
 * Tudo o que segue é a mesma conta vista de ângulos diferentes. Os números de
 * fora — hora do dia, encomendas na bolsa, peças, acessórios — entram sempre
 * pelos mesmos lugares, e é por isso que a resposta bate em qualquer tela.
 */

/** O custo de um quilômetro em fôlego, antes de sol e carga. */
export const CUSTO_POR_KM = 11;

/** Quanto o sol do meio-dia pesa em cima do desgaste. */
export const PESO_DO_SOL = 0.35;

/** Quanto cada encomenda na bolsa pesa. */
export const PESO_DA_ENCOMENDA = 0.06;

/** O tempo parado em cada endereço: descer, entregar, subir. */
export const PARADA_S = 2;

export interface OQueOEntregadorTem {
  veiculo?: Veiculo;
  pecas?: BikePartLevels;
  acessorios?: NiveisDosAcessorios;
}

export interface OQueAEquacaoDiz {
  /** Quanto ele demora por quilômetro, já com as peças. */
  segundosPorKm: number;
  /** Quantas encomendas cabem de uma vez. */
  bolsa: number;
  /** Quanto do fôlego some a cada quilômetro, sem sol e sem carga. */
  folegoPorKm: number;
  /** Quanto o veículo se gasta por quilômetro. */
  desgastePorKm: number;
  /** Quanto de fôlego volta por segundo parado, com a água que ele leva. */
  recuperaPorSegundo: number;
}

/**
 * O QUE A EQUAÇÃO DIZ sobre este entregador, com este veículo e estas peças.
 *
 * É o único lugar que junta veículo, peça e acessório. Qualquer tela que
 * queira mostrar velocidade, bolsa, cansaço ou desgaste pergunta aqui — e por
 * isso nenhuma delas pode discordar da outra.
 */
export function aEquacao(tem: OQueOEntregadorTem = {}): OQueAEquacaoDiz {
  const veiculo = tem.veiculo ?? VEICULO_DE_ENTRADA;
  const numeros = numerosDoVeiculo(veiculo);
  const efeitos = bikePartEffects(tem.pecas ?? EMPTY_BIKE_PART_LEVELS);
  const alivio = alivioDosAcessorios(tem.acessorios ?? ACESSORIOS_ZERADOS);
  const usa = APROVEITAMENTO[veiculo.familia] ?? 1;

  /*
   * A peça entra pelo aproveitamento da família: "um pouco melhor" numa
   * bicicleta é "quase igual" num caiaque. Um mais um por cento nunca vira
   * menos que zero por cento — peça nova não pode piorar o veículo.
   */
  const comAsPecas = (ganho: number) => Math.max(0, 1 + (ganho - 1) * usa);

  const segundosPorKm = numeros.segundosPorKm / comAsPecas(efeitos.speedMultiplier);
  const bolsa = Math.max(
    1,
    Math.round(numeros.bolsa + efeitos.payloadBonusKg * usa)
  );

  return {
    segundosPorKm,
    bolsa,
    folegoPorKm: CUSTO_POR_KM * numeros.cansaco,
    desgastePorKm: numeros.desgaste * comAsPecas(efeitos.wearMultiplier),
    recuperaPorSegundo: alivio.aguaPorSegundo,
  };
}

/**
 * QUANTO TEMPO UMA ENTREGA LEVA, em segundos.
 *
 * A parada entra por endereço e não por quilômetro de propósito: sem ela,
 * aceitar dez pedidos na mesma quadra sairia de graça, e juntar serviço seria
 * sempre a resposta certa.
 */
export function tempoDaEntrega(
  km: number,
  paradas: number,
  tem: OQueOEntregadorTem = {}
): number {
  const { segundosPorKm } = aEquacao(tem);
  return Math.max(1, km * segundosPorKm + Math.max(0, paradas) * PARADA_S);
}

/** Quanto o sol pesa naquela hora, já com o protetor que ele leva. */
export function pesoDoSol(fracaoDoDia: number, alivioDoSol = 0): number {
  /* Meio-dia é o pico; de madrugada o sol não cobra nada. */
  const altura = Math.max(0, Math.sin(Math.PI * fracaoDoDia));
  return 1 + PESO_DO_SOL * altura * Math.max(0, 1 - alivioDoSol);
}

/** Quanto a bolsa cheia pesa, já com o que ele leva para aliviar. */
export function pesoDaCarga(quantas: number, alivioDaCarga = 0): number {
  return (
    1 +
    PESO_DA_ENCOMENDA * Math.max(0, quantas) * Math.max(0, 1 - alivioDaCarga)
  );
}

/**
 * QUANTO DE FÔLEGO SOME NUM SEGUNDO DE RUA.
 *
 * Esta é a conta que responde "a saúde dele muda se ele trocar de veículo?".
 * Muda por dois caminhos ao mesmo tempo: o veículo cobra menos por quilômetro
 * (cansaço), e faz o quilômetro passar mais rápido (segundos por km). Por isso
 * um elétrico não cansa "um pouco menos" — cansa muito menos.
 */
export function folegoPorSegundo(
  tem: OQueOEntregadorTem,
  fracaoDoDia: number,
  naBolsa: number
): number {
  const { segundosPorKm, folegoPorKm } = aEquacao(tem);
  const alivio = alivioDosAcessorios(tem.acessorios ?? ACESSORIOS_ZERADOS);
  const kmNesteSegundo = 1 / segundosPorKm;
  return (
    kmNesteSegundo *
    folegoPorKm *
    pesoDoSol(fracaoDoDia, alivio.alivioDoSol) *
    pesoDaCarga(naBolsa, alivio.alivioDaCarga)
  );
}

/**
 * O QUE MUDA AO TROCAR DE VEÍCULO, em fração.
 *
 * 0.2 em velocidade quer dizer "vinte por cento mais rápido"; -0.5 em cansaço,
 * "cansa metade". Existe para a tela de troca poder dizer o que muda ANTES da
 * compra — trocar às cegas e descobrir depois é o jeito mais rápido de o
 * jogador achar que o jogo mentiu.
 */
export interface OQueMudaNaTroca {
  velocidade: number;
  cansaco: number;
  bolsa: number;
  desgaste: number;
}

export function oQueMudaNaTroca(
  de: Veiculo,
  para: Veiculo,
  pecas: BikePartLevels = EMPTY_BIKE_PART_LEVELS
): OQueMudaNaTroca {
  const antes = aEquacao({ veiculo: de, pecas });
  const depois = aEquacao({ veiculo: para, pecas });
  return {
    /* Menos segundos por km é MAIS rápido: a conta inverte de propósito. */
    velocidade: antes.segundosPorKm / depois.segundosPorKm - 1,
    cansaco: depois.folegoPorKm / antes.folegoPorKm - 1,
    bolsa: depois.bolsa / antes.bolsa - 1,
    desgaste: depois.desgastePorKm / antes.desgastePorKm - 1,
  };
}

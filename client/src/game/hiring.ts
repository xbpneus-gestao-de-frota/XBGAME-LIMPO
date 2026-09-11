/**
 * Contratacao: quem a XB coloca na rua, e o que isso custa.
 *
 * O jogo comecou com uma bicicleta e um operador — e so. O Fernando descreveu
 * outra coisa: "na bicicleta poderemos contratar mais jogadores, na moto
 * contratar mais pessoas, caminhoes mesma coisa". Este arquivo e a conta
 * disso, para toda classe de veiculo.
 *
 * ── POR QUE NENHUM PRECO AQUI FOI ESCOLHIDO ────────────────────────────────
 *
 * Um preco digitado a mao funciona ate a segunda classe de veiculo. Depois
 * ninguem mais sabe dizer se contratar um carreteiro deveria custar dez ou
 * cem vezes um ciclista, e o numero escolhido no chute ou trava o jogo ou
 * quebra a economia — calado, sem erro no console. Foi exatamente o que
 * aconteceu com a tabela de rotas.
 *
 * Entao aqui tudo sai da mesma conta de frete do freight.ts, sobre uma viagem
 * de referencia de cada classe:
 *
 *   comprar um veiculo   = 8 viagens do que ele da de lucro
 *   contratar um operador = 11 viagens do que ele da de lucro
 *
 * A regra vale igual da bicicleta a carreta, e por isso a escada se sustenta
 * sozinha. Confirmacao de que a conta esta sa: ela devolve 177 para a segunda
 * bicicleta e 243 para o primeiro operador, contra os 180 e 250 que estavam
 * na mao no jogo desde o inicio. Os numeros aprovados na epoca da bicicleta
 * estavam certos — o que faltava era a regra que os explica.
 */
import type { VehicleId } from "./types";
import {
  CLASSE_DO_VEICULO,
  FROTA,
  REPASSE,
  calcularFrete,
  custoDeRodar,
  type ClasseDeVeiculo,
} from "./freight";

/**
 * A viagem de referencia de cada classe, em quilometros.
 *
 * ESTIMADO, e de proposito: e "o tipo de servico que este veiculo faz num
 * dia". Bicicleta entrega no bairro, carreta atravessa o pais. Nao existe
 * fonte para isso porque nao e um fato do mundo — e a forma da operacao da
 * XB. Mexer nestes numeros muda o preco de comprar e de contratar em bloco, e
 * e o unico lugar onde isso se faz.
 */
export const KM_DA_VIAGEM_TIPICA: Readonly<Record<ClasseDeVeiculo, number>> = {
  bicicleta: 10,
  moto: 100,
  van: 200,
  caminhao: 500,
  carreta: 1_300,
};

/** Quantas viagens o veiculo leva para se pagar. */
export const VIAGENS_PARA_PAGAR_O_VEICULO = 8;

/** Quantas viagens a contratacao leva para se pagar. */
export const VIAGENS_PARA_PAGAR_A_CONTRATACAO = 11;

/**
 * Quanto cada operador ocupa da capacidade da central.
 *
 * Nao e o salario — e a atencao que a operacao gasta com ele. Um ciclista do
 * bairro se resolve sozinho; um carreteiro na estrada consome despacho,
 * rastreamento, documento e plantao. Por isso a central segura muitos
 * ciclistas e poucos carreteiros ao mesmo tempo, o que e a propria realidade
 * de uma transportadora pequena crescendo.
 */
export const PONTOS_DO_OPERADOR: Readonly<Record<VehicleId, number>> = {
  bike: 1,
  moto: 1,
  van: 2,
  truck: 3,
  fleet: 4,
  planetary: 5,
};

/** Quanto sobra para a XB numa viagem de referencia desta classe. */
export function lucroDaViagemTipica(veiculo: VehicleId): number {
  const classe = CLASSE_DO_VEICULO[veiculo];
  const km = KM_DA_VIAGEM_TIPICA[classe];
  const frete = calcularFrete(classe, km, FROTA[classe].capacidade);
  const custo = custoDeRodar(classe, km);
  const rodar =
    custo.combustivel + custo.pneus + custo.manutencao + custo.depreciacao;
  return frete - rodar - frete * REPASSE.transportadora;
}

/**
 * O que a XB paga por viagem a quem dirige veiculo dela.
 *
 * Antes era `wageRate: 0.18`, um numero solto dentro do operador. Agora e o
 * repasse do freight.ts — a mesma fatia que a conta de frete usa em todo o
 * resto do jogo. Salario em dois lugares diferentes e como ter dois relogios:
 * nunca se sabe qual esta certo.
 */
export function salarioDaViagem(freteBruto: number): number {
  return Math.max(1, Math.round(freteBruto * REPASSE.transportadora));
}

/**
 * Quantas unidades desta classe a empresa ja pagou.
 *
 * A primeira bicicleta e presente: o jogo comeca com ela. Toda outra unidade,
 * de qualquer classe, foi comprada.
 */
const unidadesPagas = (veiculo: VehicleId, unidadesAtuais: number): number =>
  Math.max(0, Math.floor(unidadesAtuais) - (veiculo === "bike" ? 1 : 0));

/** Quanto custa a proxima unidade desta classe. */
export function custoDeUmaUnidade(
  veiculo: VehicleId,
  unidadesAtuais: number
): number {
  const base = lucroDaViagemTipica(veiculo) * VIAGENS_PARA_PAGAR_O_VEICULO;
  return Math.round(base * Math.pow(1.8, unidadesPagas(veiculo, unidadesAtuais)));
}

/** Quanto custa contratar o proximo operador desta classe. */
export function custoDeContratar(
  veiculo: VehicleId,
  jaContratados: number
): number {
  const base =
    lucroDaViagemTipica(veiculo) * VIAGENS_PARA_PAGAR_A_CONTRATACAO;
  return Math.round(
    base * Math.pow(1.65, Math.max(0, Math.floor(jaContratados)))
  );
}

/**
 * Quantos veiculos desta classe a garagem segura.
 *
 * Uma unidade quando a classe abre, e mais uma a cada cinco niveis da
 * empresa, ate oito. O teto existe para a frota nao virar um numero solto:
 * oito unidades de cada uma das seis classes ja e uma transportadora grande,
 * e passar disso so faria a tela crescer sem o jogo mudar.
 */
export const MAXIMO_POR_CLASSE = 8;

export function frotaMaxima(
  nivelDeDesbloqueio: number,
  nivelDaEmpresa: number
): number {
  if (nivelDaEmpresa < nivelDeDesbloqueio) return 0;
  const degraus = Math.floor((nivelDaEmpresa - nivelDeDesbloqueio + 1) / 5);
  return Math.min(MAXIMO_POR_CLASSE, 1 + degraus);
}

/**
 * Quanta atencao a central consegue dar, em pontos.
 *
 * Cresce com o Centro de Rotas, que e o predio que existe justamente para
 * "coordenar contratos simultaneos", e um pouco com o tamanho da empresa. A
 * capacidade nunca encolhe: o que a operacao aprendeu a tocar, ela nao
 * desaprende quando um predio e reformado.
 */
export function capacidadeOperacional(
  nivelDaEmpresa: number,
  nivelDoCentroDeRotas: number,
  capacidadeInicial: number
): number {
  return (
    capacidadeInicial +
    Math.max(0, Math.floor(nivelDoCentroDeRotas)) * 4 +
    Math.floor(Math.max(1, nivelDaEmpresa) / 10)
  );
}

export type MotivoDeNaoContratar =
  | "classe-bloqueada"
  | "sem-veiculo-livre"
  | "sem-pontos"
  | "sem-dinheiro";

export interface PedidoDeContratacao {
  /** A classe ja foi liberada para a empresa? */
  classeLiberada: boolean;
  /*
   * ELE TRAZ O PROPRIO VEICULO?
   *
   * Ordem dele, 08/09/2026. Quem traz nao precisa de unidade livre na
   * garagem — e essa e a diferenca inteira. A empresa que nao tem veiculo
   * nenhum ainda assim pode por gente na rua, contratando quem ja tem.
   *
   * Nao ha desconto no preco da contratacao, e nao precisa haver: um
   * frotista custa o veiculo MAIS a contratacao; um agregado custa so a
   * contratacao. A economia se explica sozinha.
   */
  trazVeiculo?: boolean;
  /** Quantas unidades desta classe a empresa tem. */
  unidades: number;
  /** Quantos operadores desta classe ja estao contratados. */
  operadoresDaClasse: number;
  /*
   * Quantos DESSES sao agregados. Precisa entrar na conta porque agregado
   * nao ocupa unidade da garagem: sem separar, contratar cinco agregados
   * faria o jogo achar que a frota inteira esta ocupada.
   */
  agregadosDaClasse?: number;
  /** Pontos operacionais livres. */
  pontosLivres: number;
  caixa: number;
}

export interface Elegibilidade {
  pode: boolean;
  motivo?: MotivoDeNaoContratar;
  /** Quanto falta, quando o que falta e contavel. */
  faltam?: number;
  custo: number;
}

/**
 * Da para contratar mais um desta classe?
 *
 * A ordem das checagens e proposital, e e a mesma da habilitacao no
 * freight.ts: primeiro o que nao se compra. Mandar a pessoa juntar dinheiro
 * para um operador que nao tem veiculo para dirigir e recado errado — ela
 * junta, volta, e continua barrada.
 *
 * O operador contratado ja vem habilitado: e para isso que se contrata
 * alguem. A escada de CNH do freight.ts e do JOGADOR, para ele proprio poder
 * pilotar aquela classe — sao duas coisas diferentes e nao se misturam.
 */
export function podeContratar(
  veiculo: VehicleId,
  pedido: PedidoDeContratacao
): Elegibilidade {
  const custo = custoDeContratar(veiculo, pedido.operadoresDaClasse);

  if (!pedido.classeLiberada) {
    return { pode: false, motivo: "classe-bloqueada", custo };
  }
  /*
   * Uma unidade fica sempre com o jogador — e a que ele pilota. Operador da
   * XB precisa de veiculo da empresa, senao dois sairiam na mesma.
   *
   * Quem TRAZ o proprio pula esta checagem inteira: ele chega com o veiculo
   * embaixo do braco, e a garagem da XB nao tem nada com isso.
   */
  if (!pedido.trazVeiculo) {
    const daEmpresa =
      pedido.operadoresDaClasse - (pedido.agregadosDaClasse ?? 0);
    const livres = Math.max(0, pedido.unidades - 1) - Math.max(0, daEmpresa);
    if (livres < 1) {
      return { pode: false, motivo: "sem-veiculo-livre", custo };
    }
  }
  const pontos = PONTOS_DO_OPERADOR[veiculo];
  if (pedido.pontosLivres < pontos) {
    return {
      pode: false,
      motivo: "sem-pontos",
      faltam: pontos - pedido.pontosLivres,
      custo,
    };
  }
  if (pedido.caixa < custo) {
    return {
      pode: false,
      motivo: "sem-dinheiro",
      faltam: custo - pedido.caixa,
      custo,
    };
  }
  return { pode: true, custo };
}

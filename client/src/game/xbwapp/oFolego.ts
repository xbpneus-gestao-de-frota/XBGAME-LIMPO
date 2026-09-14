/**
 * O FOLEGO DO ENTREGADOR — quanto cada corrida desgasta.
 *
 * Ordem dele, 12/09/2026: "precisamos criar as regras de saude de Renan e
 * Lorena, cada corrida quanto desgasta, tem que parar para tomar agua, periodo
 * de trabalho, almoco, tudo que possamos imaginar".
 *
 * Este arquivo e o PRIMEIRO pedaco disso, e so ele: o folego caindo. Agua,
 * almoco, fim de expediente e falta no dia seguinte vem depois, um por vez, em
 * cima deste numero. O motivo de comecar assim e poder sentir o ritmo antes de
 * construir as paradas: se o folego cair rapido ou devagar demais, todo o
 * resto nasce torto.
 *
 * ── UM NUMERO SO, E NAO QUATRO BARRAS ─────────────────────────────────────
 *
 * A tentacao e fazer barra de sede, barra de fome, barra de cansaco e barra de
 * humor. Fica bonito na tela e vira a mesma coisa no jogo: quatro barras
 * dizendo "ele precisa parar". Entao e um numero so — o folego — e o que muda
 * nao e a barra, e o tamanho da parada que devolve ele.
 *
 * ── O QUE GASTA, E POR QUE ESTES TRES ─────────────────────────────────────
 *
 * O gasto principal e a DISTANCIA. Corrida longa cansa mais que corrida curta,
 * e o bairro ja sabe medir distancia — nao ha nada novo a inventar.
 *
 * Em cima dela pesam tres coisas que o jogo JA SABE e que ate agora nao
 * serviam para nada:
 *
 *   · O SOL. A luz do bairro ja diz que horas sao; pedalar ao meio-dia custa
 *     mais do que pedalar no fim da tarde.
 *   · O PESO. Cada encomenda na bolsa pesa. Sai de `quantosNaBolsa`.
 *   · O VEICULO. Bicicleta e perna; moto e motor. Sai do mesmo lugar de onde
 *     sai a velocidade de cada um.
 *
 * A pressa (aceitar prazo apertado) tambem deveria pesar e ficou de fora de
 * proposito: ela depende do relogio do pedido, e este pedaco nao mexe em
 * pedido nenhum. Entra junto com o almoco.
 *
 * ── DE ONDE SAI O NUMERO DO DESGASTE ──────────────────────────────────────
 *
 * Nao e chute. A corrida tipica do bairro tem 0,45 km. Um dia de trabalho
 * publica algo perto de quarenta pedidos, e com dois na rua isso da umas vinte
 * corridas para cada um. Vinte corridas tipicas sao nove quilometros — entao
 * onze pontos por quilometro esvaziam o folego em exatamente um dia de
 * trabalho sem parar nenhuma vez.
 *
 * E essa a conta que faz a saude virar jogo: sem parada, o dia NAO fecha. Com
 * as paradas certas, fecha com sobra. Se fossem cinco pontos por quilometro,
 * ninguem precisaria parar e o sistema inteiro seria enfeite.
 *
 * ── NINGUEM CAI DURO ──────────────────────────────────────────────────────
 *
 * Este arquivo nao impede ninguem de nada. Ele so conta. As faixas existem
 * desde ja porque e nelas que os castigos vao se pendurar depois — primeiro
 * ficar mais devagar, depois recusar corrida nova, e so no limite faltar no
 * dia seguinte — mas nada disso acontece ainda.
 */
import { SEGUNDOS_POR_KM, quantosNaBolsa, type EmRota } from "./aRota";
import {
  numerosDoVeiculo,
  VEICULO_DE_ENTRADA,
} from "../aEquacaoMestra";
import { fracaoDoDia } from "../oRelogioDoBairro";
import {
  ACESSORIOS_ZERADOS,
  alivioDosAcessorios,
  type AlivioDosAcessorios,
  type NiveisDosAcessorios,
} from "../osAcessorios";

/** O folego de quem esta inteiro. */
export const FOLEGO_CHEIO = 100;

/**
 * DECISAO DELE: quanto um quilometro pedalado custa de folego.
 *
 * Onze — a conta esta no comentario grande la em cima: e o numero que esvazia
 * um entregador em um dia de trabalho sem parada nenhuma.
 */
export const CUSTO_POR_KM = 11;

/**
 * DECISAO DELE: quanto o sol do meio-dia pesa em cima do desgaste.
 *
 * Um terco a mais no pior momento. Menos que isso ninguem sente; mais que isso
 * o meio-dia vira uma parede e o jogo passa a ser "nao trabalhe ao meio-dia",
 * que e uma regra so, e nao uma decisao.
 */
export const PESO_DO_SOL = 0.35;

/** DECISAO DELE: quanto cada encomenda na bolsa pesa, em fracao do desgaste. */
export const PESO_DA_ENCOMENDA = 0.06;

/** DECISAO DELE: quantas encomendas ainda fazem diferenca no peso. */
export const ENCOMENDAS_QUE_PESAM = 6;

/**
 * QUANTO CADA VEICULO CANSA, em fracao do desgaste da bicicleta.
 *
 * Bicicleta e perna, moto e motor. O que sobra na moto e o corpo em cima dela
 * o dia inteiro — cansa, mas pouco.
 */
export const CANSACO_DO_VEICULO: Readonly<Record<string, number>> = {
  /* Vem da equacao mestra, pelo mesmo motivo dos segundos por km. */
  bicicleta: numerosDoVeiculo(VEICULO_DE_ENTRADA).cansaco,
  /* A moto ainda nao entrou na equacao — ver a nota em aRota. */
  moto: 0.3,
};

/**
 * DECISAO DELE: quanto folego volta por segundo parado, sem fazer nada.
 *
 * Bem pouco. Ficar parado na base NAO e descanso — e so nao estar gastando. Um
 * dia inteiro de pe devolve pouco mais de dez pontos. Se ficar parado
 * devolvesse o dia inteiro, agua, almoco e expediente nao teriam para que
 * existir.
 */
export const VOLTA_PARADO_POR_SEGUNDO = 0.02;

/** As faixas do folego, do inteiro ao acabado. */
export type FaixaDoFolego = "inteiro" | "cansado" | "no-limite" | "acabado";

/** Onde cada faixa comeca. A primeira que couber, de cima para baixo. */
export const FAIXAS_DO_FOLEGO: readonly {
  chave: FaixaDoFolego;
  de: number;
  nome: string;
}[] = [
  { chave: "inteiro", de: 70, nome: "inteiro" },
  { chave: "cansado", de: 40, nome: "cansado" },
  { chave: "no-limite", de: 15, nome: "no limite" },
  { chave: "acabado", de: 0, nome: "acabado" },
];

/** Em que faixa este folego esta. */
export function faixaDoFolego(folego: number): FaixaDoFolego {
  for (const f of FAIXAS_DO_FOLEGO) if (folego >= f.de) return f.chave;
  return "acabado";
}

/**
 * O PESO DO SOL AGORA, de 1 (cedo ou tarde) ate 1 + o peso (meio-dia).
 *
 * Sobe e desce junto com o dia em vez de ligar e desligar: o meio-dia nao
 * comeca as onze e cinquenta e nove.
 */
export function pesoDoSol(relogioDoBalcao: number, alivio = 0): number {
  /* 0.45 e a fracao do dia em que o meio-dia cai — o mesmo marco da luz. */
  const distanciaDoMeioDia = Math.abs(fracaoDoDia(relogioDoBalcao) - 0.45);
  const alturaDoSol = Math.max(0, 1 - distanciaDoMeioDia / 0.45);
  /*
   * O alivio do protetor solar entra AQUI, e nao no fim da conta: ele encolhe
   * o peso do sol, e nunca o transforma em ajuda. Com alivio 1 o meio-dia
   * custaria o mesmo que o fim da tarde — nunca menos.
   */
  const quantoResta = 1 - Math.min(1, Math.max(0, alivio));
  return 1 + PESO_DO_SOL * quantoResta * alturaDoSol;
}

/** O peso da bolsa cheia, de 1 (vazia) para cima. */
export function pesoDaCarga(quantas: number, alivio = 0): number {
  const contam = Math.min(Math.max(0, quantas), ENCOMENDAS_QUE_PESAM);
  const quantoResta = 1 - Math.min(1, Math.max(0, alivio));
  return 1 + PESO_DA_ENCOMENDA * quantoResta * contam;
}

/**
 * QUANTO ESTE SEGUNDO DE PEDALADA CUSTA DE FOLEGO.
 *
 * Devolve zero para quem nao esta na rua. O quanto ele andou neste segundo sai
 * da propria velocidade do veiculo — a mesma que o resto do jogo usa para
 * dizer quanto tempo leva ir de uma porta a outra. Uma regua so.
 */
export function custoDeUmSegundo(
  quem: EmRota,
  relogioDoBalcao: number,
  alivio: AlivioDosAcessorios = alivioDosAcessorios(ACESSORIOS_ZERADOS)
): number {
  if (quem.paradas.length === 0) return 0;
  const porKm = SEGUNDOS_POR_KM[quem.veiculo] ?? SEGUNDOS_POR_KM.bicicleta!;
  const kmNesteSegundo = 1 / porKm;
  const doVeiculo =
    CANSACO_DO_VEICULO[quem.veiculo] ?? CANSACO_DO_VEICULO.bicicleta!;
  return (
    kmNesteSegundo *
    CUSTO_POR_KM *
    doVeiculo *
    pesoDoSol(relogioDoBalcao, alivio.alivioDoSol) *
    pesoDaCarga(quantosNaBolsa(quem), alivio.alivioDaCarga)
  );
}

/**
 * O FOLEGO DESTE ENTREGADOR UM SEGUNDO DEPOIS.
 *
 * Quem esta na rua gasta; quem esta parado recupera um fio. Nunca passa de
 * cheio nem cai abaixo de zero.
 */
export function umSegundoDeFolego(
  folego: number,
  quem: EmRota,
  relogioDoBalcao: number,
  /*
   * OS ACESSORIOS ENTRAM POR AQUI, com um valor de casa que nao alivia nada.
   *
   * Quem chama sem passar acessorio nenhum — os testes antigos, o aplicativo
   * sem jogo acoplado — continua vendo exatamente o folego de antes. Assim o
   * acessorio so pode melhorar a vida de quem comprou, e nunca mudar por
   * baixo o ritmo de quem nao mexeu em nada.
   */
  niveis: Readonly<NiveisDosAcessorios> = ACESSORIOS_ZERADOS
): number {
  const alivio = alivioDosAcessorios(niveis);
  const mudanca =
    quem.paradas.length === 0
      ? VOLTA_PARADO_POR_SEGUNDO + alivio.aguaPorSegundo
      : -custoDeUmSegundo(quem, relogioDoBalcao, alivio);
  return Math.min(FOLEGO_CHEIO, Math.max(0, folego + mudanca));
}

/** O folego de quem ainda nao tem um guardado: cheio. */
export function folegoDe(
  folegos: Readonly<Record<string, number>>,
  nome: string
): number {
  return folegos[nome] ?? FOLEGO_CHEIO;
}

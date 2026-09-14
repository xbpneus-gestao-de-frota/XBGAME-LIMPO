/**
 * A ROTA DO ENTREGADOR — onde ele esta, e para onde vai em seguida.
 *
 * Ordem dele, 08/09/2026:
 *
 *   "pode aparecer varios pedidos, gere para teste 3 pedidos de coleta, ja com
 *    endereco de entrega (...) entregador sai da pizzaria que e onde ele vai
 *    estar, e vai na primeira coleta, a segunda e terceira ja comeca a contar
 *    tempo (...) se compensa mais coletar 2 fazer uma entrega, coletar mais uma
 *    e depois fazer as outras duas, faremos usuarios quebrar a cabeca, ate ele
 *    entender que precisa da melhoria, depois contratar mais um entregador, ir
 *    para moto mais rapida, e assim o game se desenvolve."
 *
 * ── POR QUE A CONTA ANTIGA NAO SERVIA ─────────────────────────────────────
 *
 * Antes, carregar duas entregas custava uma porcentagem fixa: quarenta por
 * cento a mais de tempo em cada uma. Era simples e era MENTIRA — e mentira do
 * tipo que estraga o jogo. Com penalidade fixa, pegar duas coletas na mesma
 * esquina custa igual a pegar duas em pontas opostas do bairro, e a pergunta
 * que ele quer que a pessoa se faca ("compensa juntar estas duas?") passa a
 * nao ter resposta: a resposta seria sempre "nao".
 *
 * Agora o entregador ANDA. Ele tem um lugar onde esta, uma fila de paradas e
 * uma velocidade. O tempo de cada entrega sai da distancia percorrida de
 * verdade. Juntar duas coletas vizinhas economiza caminho e sai barato; juntar
 * duas coletas longe uma da outra atrasa as duas. E a mesma conta que um
 * entregador de verdade faz na cabeca, e e o miolo do jogo que ele descreveu.
 *
 * ── COMO A ORDEM DAS PARADAS E ESCOLHIDA ──────────────────────────────────
 *
 * Pela mais perto que der para fazer agora, sempre — e uma entrega so entra na
 * conta depois que a coleta dela ja foi feita. Ninguem entrega o que nao pegou.
 *
 * Nao e a rota otima; e a rota que uma pessoa razoavel faria olhando o mapa. E
 * isso e proposital: se o jogo resolvesse a rota perfeita sozinho, a decisao
 * de QUAIS pedidos aceitar juntos — que e a decisao do jogador — perderia a
 * graca, porque o motor consertaria toda escolha ruim.
 *
 * ── A VELOCIDADE E O CAMINHO DA MELHORIA ──────────────────────────────────
 *
 * A bicicleta gasta vinte segundos por quilometro; a moto, nove. E o "ir para
 * moto mais rapida" dele, e e o unico numero que precisa mudar para a melhoria
 * aparecer no jogo inteiro de uma vez.
 */
import {
  numerosDoVeiculo,
  VEICULO_DE_ENTRADA,
} from "../aEquacaoMestra";
import { ponte } from "./ponte";
import type { IdContato } from "./tipos";

/** Onde o entregador comeca o dia. Ordem dele: na pizzaria. */
export const BASE_DO_ENTREGADOR: IdContato = "pizzaria";

/** Quantos segundos cada veiculo leva para andar um quilometro. */
export const SEGUNDOS_POR_KM: Readonly<Record<string, number>> = {
  /*
   * A BICICLETA VEM DA EQUACAO MESTRA, e nao de um numero escrito aqui.
   *
   * Ordem dele, 13/09/2026: "precisamos de uma equacao mestra". Com trinta
   * veiculos na loja, um numero solto por arquivo viraria trinta discussoes
   * sobre qual esta certo. Quem responde "quanto ele demora" e um lugar so.
   */
  bicicleta: numerosDoVeiculo(VEICULO_DE_ENTRADA).segundosPorKm,
  /*
   * A MOTO AINDA NAO ENTROU NA EQUACAO — ela nao e uma das seis familias da
   * loja, e inventar um degrau para ela seria decidir no lugar dele. Fica o
   * numero que sempre valeu, ate ele dizer onde a moto entra.
   */
  moto: 9,
};

/**
 * O tempo parado em cada endereco: descer, entregar, pegar recibo, subir.
 *
 * Existe por um motivo de jogo, e nao de realismo: sem ele, aceitar dez
 * pedidos na mesma quadra sairia de graca. Com ele, cada parada tem um custo
 * proprio, e juntar servico deixa de ser sempre a resposta certa.
 */
export const PARADA_S = 2;

/** Uma parada da rota: passar num lugar para pegar ou para entregar. */
export interface Parada {
  /** O numero do pedido — "#1002". */
  pedido: string;
  o: "coleta" | "entrega";
  lugar: IdContato;
}

/** Um entregador em rota. */
export interface EmRota {
  nome: string;
  /** O ultimo lugar onde ele parou. E de onde a proxima perna comeca. */
  em: IdContato;
  /** O que falta fazer, na ordem em que vai fazer. */
  paradas: readonly Parada[];
  /** Quantos segundos ele ja rodou na perna atual. */
  naPernaS: number;
  /** O que ele esta usando. E o que o "ir para moto" muda. */
  veiculo: string;
}

/** Um entregador novo, parado na base, sem nada para fazer. */
export function novoEmRota(nome: string, veiculo = "bicicleta"): EmRota {
  return { nome, em: BASE_DO_ENTREGADOR, paradas: [], naPernaS: 0, veiculo };
}

/** A distancia entre dois lugares do bairro, em quilometros. */
export function kmEntre(de: IdContato, para: IdContato): number {
  if (de === para) return 0;
  return ponte().kmDaEntrega(de, para);
}

/** Quantos segundos leva ir de um lugar ao outro com este veiculo. */
export function tempoDaPerna(
  de: IdContato,
  para: IdContato,
  veiculo: string
): number {
  const porKm = SEGUNDOS_POR_KM[veiculo] ?? SEGUNDOS_POR_KM.bicicleta!;
  return Math.max(1, Math.round(kmEntre(de, para) * porKm) + PARADA_S);
}

/**
 * ORDENA AS PARADAS: a mais perto que der para fazer agora, sempre.
 *
 * Entrega so entra depois da coleta do mesmo pedido — ninguem entrega o que
 * ainda nao pegou. Fora essa regra, manda a distancia.
 */
export function ordenarParadas(
  de: IdContato,
  paradas: readonly Parada[]
): readonly Parada[] {
  const restam = paradas.slice();
  const ordem: Parada[] = [];
  const jaColetou = new Set<string>();
  let onde = de;

  while (restam.length > 0) {
    let melhor = -1;
    let menor = Number.POSITIVE_INFINITY;
    for (let i = 0; i < restam.length; i += 1) {
      const p = restam[i]!;
      if (p.o === "entrega" && !jaColetou.has(p.pedido)) continue;
      const d = kmEntre(onde, p.lugar);
      if (d < menor) {
        menor = d;
        melhor = i;
      }
    }
    // Nenhuma parada possivel: sobrou entrega sem coleta. Nao deve acontecer,
    // mas se acontecer o laco para em vez de rodar para sempre.
    if (melhor < 0) break;
    const escolhida = restam.splice(melhor, 1)[0]!;
    if (escolhida.o === "coleta") jaColetou.add(escolhida.pedido);
    ordem.push(escolhida);
    onde = escolhida.lugar;
  }
  return ordem;
}

/** Poe as duas paradas de um pedido na rota e reordena tudo. */
export function pegarOPedido(
  quem: EmRota,
  pedido: string,
  coleta: IdContato,
  entrega: IdContato
): EmRota {
  const paradas = [
    ...quem.paradas,
    { pedido, o: "coleta" as const, lugar: coleta },
    { pedido, o: "entrega" as const, lugar: entrega },
  ];
  /*
   * A PERNA EM CURSO NAO E JOGADA FORA de graca: se a reordenacao mantiver o
   * mesmo proximo destino, o que ja foi rodado continua valendo. Sem isso,
   * aceitar um pedido novo faria o entregador "voltar do zero" no meio da rua
   * a cada aceite — e a pessoa seria punida por decidir rapido.
   */
  const nova = ordenarParadas(quem.em, paradas);
  const mesmoDestino =
    quem.paradas.length > 0 &&
    nova.length > 0 &&
    nova[0]!.lugar === quem.paradas[0]!.lugar;
  return {
    ...quem,
    paradas: nova,
    naPernaS: mesmoDestino ? quem.naPernaS : 0,
  };
}

/** O que aconteceu em um segundo de rota. */
export interface UmSegundoDeRota {
  quem: EmRota;
  /** Os pedidos que foram ENTREGUES neste segundo. */
  entregues: readonly string[];
  /** Os pedidos que foram COLETADOS neste segundo. */
  coletados: readonly string[];
}

/** Anda um segundo. Pode chegar em mais de uma parada quando estao coladas. */
export function andarUmSegundo(quem: EmRota): UmSegundoDeRota {
  if (quem.paradas.length === 0) {
    return { quem, entregues: [], coletados: [] };
  }
  let atual: EmRota = { ...quem, naPernaS: quem.naPernaS + 1 };
  const entregues: string[] = [];
  const coletados: string[] = [];

  // O laco tem teto: paradas na mesma porta chegam juntas, e nada mais.
  for (let volta = 0; volta < 10; volta += 1) {
    const proxima = atual.paradas[0];
    if (!proxima) break;
    const precisa = tempoDaPerna(atual.em, proxima.lugar, atual.veiculo);
    if (atual.naPernaS < precisa) break;
    if (proxima.o === "entrega") entregues.push(proxima.pedido);
    else coletados.push(proxima.pedido);
    atual = {
      ...atual,
      em: proxima.lugar,
      paradas: atual.paradas.slice(1),
      naPernaS: 0,
    };
  }
  return { quem: atual, entregues, coletados };
}

/** Quantos pedidos esta pessoa esta carregando (coletados e nao entregues). */
export function quantosNaBolsa(quem: EmRota): number {
  const coletas = new Set(
    quem.paradas.filter(p => p.o === "coleta").map(p => p.pedido)
  );
  return quem.paradas.filter(p => p.o === "entrega" && !coletas.has(p.pedido))
    .length;
}

/** Quantos pedidos esta pessoa tem em maos, pegos ou por pegar. */
export function quantosNaRota(quem: EmRota): number {
  return new Set(quem.paradas.map(p => p.pedido)).size;
}

/** O caminho inteiro que ainda falta, em quilometros. */
export function kmQueFalta(quem: EmRota): number {
  let onde = quem.em;
  let total = 0;
  for (const p of quem.paradas) {
    total += kmEntre(onde, p.lugar);
    onde = p.lugar;
  }
  return Math.round(total * 100) / 100;
}

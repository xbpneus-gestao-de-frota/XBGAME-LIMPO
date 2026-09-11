/**
 * ENTREGA RAPIDA — o balcao de pedidos da XB, e o relogio que julga cada um.
 *
 * Ordem dele, 08/09/2026:
 *
 *   "a bolinha do pino deve ser conforme relogio, abriu solicitacao tempo
 *    normal de entrega seria 10 segundos entre coleta e entrega, exemplo,
 *    entregador ganha caixinha, cliente da 5 estrelas, e assim por diante, ate
 *    atrasou muito, cliente fica com bolinha vermelha e liga reclamando na
 *    empresa, 3 reclamacoes perdemos a entrega daquela empresa por x periodo,
 *    esse e o maximo e o minimo das bolinhas."
 *
 * ── O RELOGIO E EM SEGUNDOS, E ISSO MUDA TUDO ─────────────────────────────
 *
 * O balcao nasceu medindo minutos de jogo, como o resto do aplicativo. Nao
 * serve: ele mandou dez SEGUNDOS entre coleta e entrega, e dez segundos e um
 * tempo que a pessoa SENTE — da para ver a bolinha mudar de cor sem tirar o
 * olho da tela. Por isso o balcao tem relogio proprio, em segundos, e nao usa
 * o relogio de conversa do aplicativo.
 *
 * ── A BOLINHA E O RELOGIO, E NAO A SITUACAO ───────────────────────────────
 *
 * Esta e a parte que ele mudou de ideia, e com razao. Antes a cor dizia
 * "aberto / aceito / entregue" — informacao que a propria palavra ao lado ja
 * dava. Agora a cor diz QUANTO TEMPO JA FOI: ela escorrega de verde para
 * vermelho enquanto o pedido espera, e a pessoa ve a nota do cliente caindo em
 * tempo real. E a unica coisa da tela que cobra decisao sozinha.
 *
 * ── A ESCADA, DO TOPO AO FUNDO ────────────────────────────────────────────
 *
 * Ele desenhou as duas pontas: em cima, caixinha e cinco estrelas; embaixo,
 * bolinha vermelha e telefonema de reclamacao. Os degraus do meio sao a
 * descida entre uma ponta e a outra, e estao na tabela FAIXAS logo abaixo.
 *
 * ── A TERCEIRA RECLAMACAO CUSTA O CLIENTE ─────────────────────────────────
 *
 * "3 reclamacoes perdemos a entrega daquela empresa por x periodo". A conta e
 * por CLIENTE: quem reclama tres vezes fecha a porta para a XB e para de
 * mandar servico durante um tempo. E o unico castigo do jogo que tira trabalho
 * em vez de tirar dinheiro — e por isso doi mais.
 *
 * ── NADA AQUI E SORTEIO DE VERDADE ────────────────────────────────────────
 *
 * Os pedidos parecem sortidos e nao sao: saem todos do NUMERO do pedido, por
 * conta fixa. O teste precisa poder dizer "o pedido 1007 vem da farmacia" sem
 * depender de sorte, e um save recarregado tem de reencontrar o mesmo bairro.
 */
import { LOJAS, MORADORES, nomeDe } from "./contatos";
import { ponte } from "./ponte";
import {
  BASE_DO_ENTREGADOR,
  andarUmSegundo,
  kmEntre,
  novoEmRota,
  pegarOPedido,
  quantosNaRota,
  type EmRota,
} from "./aRota";
import type { EstadoDoApp } from "./estado";
import type {
  IdContato,
  LinhaDaCarteira,
  OfertaDeEntrega,
} from "./tipos";

/* ── O RELOGIO — medida dele ─────────────────────────────────────────────*/

/**
 * O TEMPO FINAL DE UMA SOLICITACAO, em segundos. Ordem dele: vinte e cinco.
 *
 * "se uma solicitacao de coleta e entrega final e de 25 segundos em media".
 * E o tempo INTEIRO: do momento em que o cliente pede ate a mercadoria estar
 * na porta. Nao e o tempo de pedalar — o tempo parado no balcao, esperando
 * alguem decidir, conta igual.
 *
 * E o numero contra o qual toda a escada de notas e lida. Mexer aqui aperta ou
 * afrouxa o jogo inteiro de uma vez, e de proposito: e o botao de dificuldade
 * do balcao.
 */
export const SEGUNDOS_DA_SOLICITACAO = 25;

/**
 * A corrida tipica do bairro, em quilometros.
 *
 * Os vinte e cinco segundos valem para ESTA distancia. Uma corrida do dobro
 * ganha o dobro de tempo, e uma da esquina ganha menos. Sem isto, a entrega do
 * outro lado do bairro nasceria condenada e o mapa deixaria de importar.
 */
export const KM_DA_CORRIDA_TIPICA = 0.45;

/** Nenhuma solicitacao tem menos que isto, nem a da porta ao lado. */
export const PRAZO_NO_MINIMO_S = 15;

/**
 * Quanto do tempo final a PEDALADA consome, quando se carrega uma so.
 *
 * O resto e a folga de quem despacha: e o tempo que a pessoa tem para olhar,
 * comparar e decidir sem perder estrela. Aceitar na hora entrega adiantado;
 * ficar namorando a tela come a folga primeiro e a nota depois.
 */
export const PEDALAR_DO_PRAZO = 0.6;

/**
 * ── O QUE CUSTA CARREGAR DUAS AO MESMO TEMPO ─────────────────────────────
 *
 * Ordem dele: "quando entregador ou usuario aceitarem mais de uma coleta por
 * vez podem estar perdendo qualidade" e, depois, o desenho do teste: sair da
 * pizzaria, ir na primeira coleta, com a segunda e a terceira ja contando
 * tempo.
 *
 * NAO HA MAIS PENALIDADE FIXA. O custo de carregar duas sai do CAMINHO: o
 * entregador anda de verdade, parada por parada, e o tempo de cada entrega e a
 * soma das pernas ate a porta dela. Duas coletas vizinhas quase nao custam;
 * duas em pontas opostas do bairro atrasam as duas.
 *
 * E essa a conta que ele quer que o jogador faca de cabeca — e a razao de a
 * resposta certa mudar de pedido para pedido. Ver aRota.ts.
 */

/** Como o balcao chama a carga do proprio jogador, quando ninguem foi nomeado. */
export const VOCE_MESMO = "Você";

/* ── O COMPASSO DOS PEDIDOS — decisao dele ────────────────────────────────*/

/** De quantos em quantos segundos o bairro publica um pedido. */
export const INTERVALO_ENTRE_PEDIDOS_S = 14;

/** Quanto tempo depois de o balcao abrir chega o primeiro. */
export const PRIMEIRO_PEDIDO_EM_S = 4;

/**
 * Quantas ofertas abertas cabem ao mesmo tempo.
 *
 * Enquanto o balcao esta cheio, o bairro PARA de publicar. Sem teto, quem
 * deixa o jogo aberto e vai almocar volta com quarenta pedidos estourados e a
 * sensacao de ter perdido o dia sem jogar.
 */
export const OFERTAS_ABERTAS_NO_MAXIMO = 5;

/** O primeiro numero de pedido do bairro. */
export const PRIMEIRO_NUMERO = 1001;

/**
 * ── OS TRES PEDIDOS DE TESTE ─────────────────────────────────────────────
 *
 * Ordem dele, 08/09/2026: "gere para teste 3 pedidos de coleta, ja com
 * endereco de entrega, e conseguimos testar (...) entregador sai da pizzaria
 * (...) e vai na primeira coleta, a segunda e terceira ja comeca a contar
 * tempo".
 *
 * Sao TRES, saem TODOS DE UMA VEZ e sao SEMPRE OS MESMOS. Cada coisa dessas
 * tem um motivo:
 *
 *   · Tres, porque com dois nao existe a pergunta "e a terceira, espera ou
 *     nao?" — e e ela que faz a cabeca doer.
 *   · Todos de uma vez, porque o relogio dos tres comeca junto: aceitar o
 *     primeiro nao para o cronometro dos outros dois. E o coracao do teste.
 *   · Sempre os mesmos, porque teste que muda a cada partida nao compara nada.
 *
 * As lojas e os destinos foram escolhidos para nao terem resposta obvia: a
 * padaria e a lanchonete ficam perto uma da outra (juntar as duas compensa),
 * e a farmacia fica longe das duas (juntar a terceira ja e aposta).
 */
export const PEDIDOS_DE_TESTE: readonly {
  coleta: IdContato;
  entrega: IdContato;
}[] = [
  { coleta: "padaria", entrega: "casa8" },
  { coleta: "lanchonete", entrega: "casa12" },
  { coleta: "farmacia", entrega: "casa34" },
];

/* ── A CARTEIRA DE CLIENTES — ordem dele ──────────────────────────────────
 *
 * "3 reclamacoes perdemos a entrega daquela empresa por x periodo" e, no dia
 * seguinte, o tamanho do x: "ao menos uns 40 minutos, e comeca a contar
 * durante 30 dias a reputacao pode ir piorando ate nao restar mais ninguem
 * entregando frete, entao o jogo sempre vai cobrar crescimento e melhorias."
 *
 * Sao DOIS castigos encaixados, e a diferenca entre eles e o jogo inteiro:
 *
 *   · A SUSPENSAO e o susto. Tres reclamacoes e o cliente para de mandar
 *     servico por quarenta minutos. Doi, passa, e ensina.
 *   · A PERDA e o fim. Se a reputacao daquele cliente chegar a zero dentro da
 *     janela de trinta dias, ele sai da carteira e nao volta sozinho. Volta
 *     quando a XB CRESCER — e so por isso.
 *
 * E dai que vem a frase dele: o jogo sempre vai cobrar crescimento. Servir bem
 * com a equipe de hoje segura a carteira de hoje; nao aumenta nada. Quem nao
 * cresce vai perdendo cliente por cliente ate nao restar ninguem mandando
 * frete — e ai nao ha entrega para fazer, que e a unica derrota de verdade
 * deste jogo.
 */

/** Quantas reclamacoes o cliente aguenta antes de suspender a XB. */
export const RECLAMACOES_ATE_PERDER = 3;

/**
 * Quanto tempo o cliente fica sem mandar servico, em segundos.
 *
 * Quarenta minutos — medida dele. E MUITO tempo de jogo de proposito: uma
 * suspensao tem de mudar o dia de quem despacha, e nao ser um intervalo para
 * tomar agua. Com cinco clientes, perder um por quarenta minutos e perder um
 * quinto do trabalho do periodo.
 */
export const CASTIGO_DO_CLIENTE_S = 40 * 60;

/**
 * ── A ESCADA DO CASTIGO ──────────────────────────────────────────────────
 *
 * Ordem dele: "a cada 3 bloqueios o tempo de castigo vai aumentando, dentro
 * dos 30 dias pode tomar ban daquele cliente."
 *
 * A cada tres bloqueios o cliente sobe um degrau e dobra a mao: quarenta
 * minutos vira oitenta. Passando do ultimo degrau, nao ha mais suspensao — ha
 * BAN: aquele cliente sai da carteira e so volta se a XB crescer.
 *
 * A escada e lida dentro da MESMA janela de trinta dias da reputacao. Isso e
 * o que a torna justa: um mes servindo bem apaga os bloqueios velhos e devolve
 * a empresa ao primeiro degrau. Sem a janela, um tropeco no comeco da partida
 * condenaria a partida inteira.
 */
export const BLOQUEIOS_POR_DEGRAU = 3;

/** Quantos degraus existem antes do ban. Dois: quarenta e oitenta minutos. */
export const DEGRAUS_ATE_O_BAN = 2;

/** Quanto tempo dura a suspensao numero N+1, em segundos. */
export function castigoPara(bloqueiosAnteriores: number): number {
  const degrau = Math.floor(bloqueiosAnteriores / BLOQUEIOS_POR_DEGRAU);
  return CASTIGO_DO_CLIENTE_S * (degrau + 1);
}

/**
 * Quanto dura um dia do bairro, em segundos.
 *
 * Dez minutos. E a medida que faz os trinta dias dele caberem numa temporada
 * jogavel — cinco horas — e que deixa a suspensao de quarenta minutos valendo
 * quatro dias, que e o peso certo para ela.
 */
export const SEGUNDOS_POR_DIA = 10 * 60;

/** Quantos dias de historico contam para a reputacao. Ordem dele: trinta. */
export const DIAS_DE_MEMORIA = 30;

/** A reputacao de um cliente novo, sem historico nenhum. */
export const REPUTACAO_DE_PARTIDA = 70;

/**
 * QUANTO CADA NOTA MEXE NA REPUTACAO.
 *
 * A subida e lenta e a queda e rapida, e isso e escolhido: confianca se ganha
 * devagar e se perde de uma vez, na vida e aqui. Cinco estrelas sobem seis
 * pontos; uma estrela derruba quatorze. Servindo bem, um cliente machucado
 * leva uns bons dias para voltar ao normal.
 */
export const PESO_DA_NOTA: Readonly<Record<number, number>> = {
  5: 6,
  4: 2,
  3: -2,
  2: -8,
  1: -14,
};

/* ── A ESCADA DAS BOLINHAS, EM PORCENTAGEM DE ATRASO ──────────────────────*/

/** Um degrau da escada: o que o cliente sente naquele atraso. */
export interface FaixaDoRelogio {
  chave: string;
  /** A palavra que a tela mostra. */
  nome: string;
  /** Ate quantos POR CENTO de atraso este degrau vale. */
  atePorCento: number;
  /** A cor da bolinha do pino. */
  cor: string;
  estrelas: number;
  /** Quanto da caixinha, em fracao do frete. Zero e sem caixinha. */
  caixinha: number;
  /** Se neste degrau o cliente liga reclamando. */
  reclama: boolean;
  /** O que aconteceu, contado como uma pessoa contaria. */
  recado: string;
}

/**
 * OS DEGRAUS, DO TOPO AO FUNDO — a escada dele.
 *
 * "ate atrasou ate 10% verde, 25% amarela, e assim por diante". Os degraus de
 * baixo seguem o mesmo desenho, dobrando: cinquenta e cem por cento.
 *
 * Chegar SEM atraso e um degrau proprio, acima do verde, e e o unico que da
 * caixinha. Gorjeta que sai em toda entrega vira salario e para de significar
 * alguma coisa; assim ela continua sendo o premio de quem despachou na hora.
 */
export const FAIXAS: readonly FaixaDoRelogio[] = [
  {
    chave: "adiantado",
    nome: "No tempo",
    atePorCento: 0,
    cor: "#2fbf71",
    estrelas: 5,
    caixinha: 0.2,
    reclama: false,
    recado: "Caixinha do cliente e cinco estrelas",
  },
  {
    chave: "verde",
    nome: "Atrasou pouco",
    atePorCento: 10,
    cor: "#7bd88f",
    estrelas: 5,
    caixinha: 0,
    reclama: false,
    recado: "Cinco estrelas",
  },
  {
    chave: "amarela",
    nome: "Atrasado",
    atePorCento: 25,
    cor: "#e8d94a",
    estrelas: 4,
    caixinha: 0,
    reclama: false,
    recado: "Quatro estrelas",
  },
  {
    chave: "laranja",
    nome: "Atraso feio",
    atePorCento: 50,
    cor: "#f2921d",
    estrelas: 3,
    caixinha: 0,
    reclama: false,
    recado: "Três estrelas — o cliente reparou",
  },
  {
    chave: "muito-atrasado",
    nome: "Atrasou muito",
    atePorCento: 100,
    cor: "#e8743b",
    estrelas: 2,
    caixinha: 0,
    reclama: true,
    recado: "Duas estrelas e uma ligação de reclamação",
  },
  {
    chave: "perdeu",
    nome: "Perdeu o cliente",
    atePorCento: Number.POSITIVE_INFINITY,
    cor: "#d9534f",
    estrelas: 1,
    caixinha: 0,
    reclama: true,
    recado: "Uma estrela e uma ligação de reclamação",
  },
];

/** Passando deste atraso, ninguem mais quer o pedido: o cliente desiste. */
export const DESISTE_COM_ATRASO_DE = 100;

/** O degrau em que um pedido cai, dado o atraso em porcentagem. */
export function faixaDe(atrasoPorCento: number): FaixaDoRelogio {
  return (
    FAIXAS.find(f => atrasoPorCento <= f.atePorCento) ??
    FAIXAS[FAIXAS.length - 1]!
  );
}

/* ── O BAIRRO ─────────────────────────────────────────────────────────────*/

/** As lojas de portas abertas que ainda falam com a XB. */
function quemPodePublicar(estado: EstadoDoApp): readonly IdContato[] {
  return LOJAS.filter(
    l =>
      l.online &&
      !estaPerdido(estado, l.id) &&
      (estado.semPedidosAte[l.id] ?? 0) <= estado.relogioDoBalcao
  ).map(l => l.id);
}

/** Todo lugar que pode RECEBER: as casas e os proprios comercios. */
function quemPodeReceber(): readonly IdContato[] {
  return [...MORADORES.map(m => m.id), ...LOJAS.map(l => l.id)];
}

/** O tempo final desta solicitacao, em segundos. */
export function tempoDaSolicitacao(kmEntrega: number): number {
  const fatia = kmEntrega > 0 ? kmEntrega / KM_DA_CORRIDA_TIPICA : 1;
  return Math.max(
    PRAZO_NO_MINIMO_S,
    Math.round(SEGUNDOS_DA_SOLICITACAO * fatia)
  );
}

/**
 * Monta o pedido de numero N.
 *
 * Tudo sai do numero, por conta fixa: de onde vem, para onde vai, quantos
 * volumes e quanto pesa. Numero igual, pedido igual, sempre.
 */
export function pedidoDeNumero(
  numero: number,
  segundo: number,
  lojas: readonly IdContato[] = LOJAS.filter(l => l.online).map(l => l.id)
): OfertaDeEntrega {
  const destinos = quemPodeReceber();
  const coleta = lojas[numero % lojas.length] ?? "padaria";
  /*
   * O passo 3 e para o destino nao andar junto com a loja. Com passo 1, a
   * padaria cairia sempre na mesma casa e o bairro pareceria ter tres ruas.
   */
  let entrega = destinos[(numero * 3) % destinos.length] ?? "casa8";
  if (entrega === coleta) {
    entrega = destinos[(numero * 3 + 1) % destinos.length] ?? "casa8";
  }

  const volumes = 1 + (numero % 3);
  const peso = Math.round((volumes * 1.4 + (numero % 5) * 0.3) * 10) / 10;

  const p = ponte();
  const km = p.kmDaCorrida(coleta, entrega);
  const kmEntrega = p.kmDaEntrega(coleta, entrega);

  return {
    id: `#${numero}`,
    coleta,
    entrega,
    publicadaEm: segundo,
    prazoS: tempoDaSolicitacao(kmEntrega),
    km,
    kmEntrega,
    volumes,
    peso,
    frete: p.freteDaCorrida(km, volumes),
    situacao: "aberta",
  };
}

/* ── AS PERGUNTAS DA TELA ─────────────────────────────────────────────────*/

export function ofertasAbertas(
  estado: EstadoDoApp
): readonly OfertaDeEntrega[] {
  return estado.ofertas.filter(o => o.situacao === "aberta");
}

export function ofertasEmAndamento(
  estado: EstadoDoApp
): readonly OfertaDeEntrega[] {
  return estado.ofertas.filter(
    o => o.situacao === "na-fila" || o.situacao === "rodando"
  );
}

/** O que ja acabou, do mais novo para o mais velho. */
export function ofertasFechadas(
  estado: EstadoDoApp
): readonly OfertaDeEntrega[] {
  return estado.ofertas
    .filter(
      o =>
        o.situacao === "entregue" ||
        o.situacao === "perdida" ||
        o.situacao === "recusada"
    )
    .slice()
    .reverse();
}

/** Quantos segundos ja correram desde que o cliente publicou. */
export function tempoCorrido(estado: EstadoDoApp, o: OfertaDeEntrega): number {
  const ate = o.fechadaEm ?? estado.relogioDoBalcao;
  return Math.max(0, ate - o.publicadaEm);
}

/**
 * O ATRASO EM PORCENTAGEM sobre o tempo final. E o que a escada le.
 *
 * Negativo quer dizer adiantado. E de proposito que a conta e em porcentagem e
 * nao em segundos: assim a entrega curta e a longa sao cobradas pela mesma
 * regua, que foi a correcao dele.
 */
export function atrasoPorCento(
  estado: EstadoDoApp,
  o: OfertaDeEntrega
): number {
  if (o.prazoS <= 0) return 0;
  return Math.round(((tempoCorrido(estado, o) - o.prazoS) / o.prazoS) * 100);
}

/** Quantos segundos ainda sobram do tempo final. */
export function segundosQueSobram(
  estado: EstadoDoApp,
  o: OfertaDeEntrega
): number {
  return Math.round(o.prazoS - tempoCorrido(estado, o));
}

/** Quanto do tempo final ja foi, de 0 a 100. */
export function relogioConsumido(
  estado: EstadoDoApp,
  o: OfertaDeEntrega
): number {
  if (o.prazoS <= 0) return 100;
  return Math.min(
    100,
    Math.round((tempoCorrido(estado, o) / o.prazoS) * 100)
  );
}

/**
 * A FAIXA EM QUE O PEDIDO ESTA AGORA — e e dela que sai a cor da bolinha.
 *
 * Para um pedido fechado, e a faixa que ele levou. Para um pedido correndo, e
 * a que ele levaria se chegasse neste instante: e por isso que a bolinha muda
 * de cor sozinha na tela.
 */
export function faixaDaOferta(
  estado: EstadoDoApp,
  o: OfertaDeEntrega
): FaixaDoRelogio {
  return faixaDe(atrasoPorCento(estado, o));
}

/** A cor do pino deste pedido, agora. */
export function corDoPino(estado: EstadoDoApp, o: OfertaDeEntrega): string {
  // Recusado nao tem relogio: a XB fechou a porta, e isso e cinza.
  if (o.situacao === "recusada") return "#7ea6c9";
  return faixaDaOferta(estado, o).cor;
}

/** Quem esta carregando este pedido: o entregador nomeado, ou o jogador. */
export function quemCarrega(o: OfertaDeEntrega): string {
  return o.entregador ?? VOCE_MESMO;
}

/**
 * Quantos pedidos cada um esta tocando agora — pegos ou por pegar.
 *
 * Sai da ROTA de cada um, e nao da lista de ofertas: e a rota que sabe o que
 * ainda falta passar. Enquanto ninguem tem rota (nada aceito), o mapa e vazio.
 */
export function cargaDeCadaUm(
  estado: EstadoDoApp
): ReadonlyMap<string, number> {
  const carga = new Map<string, number>();
  for (const [nome, rota] of Object.entries(estado.rotas)) {
    carga.set(nome, quantosNaRota(rota));
  }
  return carga;
}

/** Quantos pedidos esta pessoa esta tocando agora. */
export function cargaDe(estado: EstadoDoApp, quem: string): number {
  return cargaDeCadaUm(estado).get(quem) ?? 0;
}

/** A rota de alguem — cria uma na base se ele ainda nao tiver saido. */
export function rotaDe(estado: EstadoDoApp, quem: string): EmRota {
  return estado.rotas[quem] ?? novoEmRota(quem);
}

/**
 * ── O AUXILIO DO COMECO ──────────────────────────────────────────────────
 *
 * Ordem dele: "entregador jogador no inicio recebera auxilio nosso se compensa
 * mais coletar 2 fazer uma entrega, coletar mais uma e depois fazer as outras
 * duas".
 *
 * A dica NAO diz o que fazer. Ela mostra os dois caminhos em quilometros e
 * deixa a conta na mao da pessoa — que e o que ele quer: "faremos usuarios
 * quebrar a cabeca". Dizer a resposta mataria a quebra de cabeca; esconder a
 * distancia tornaria a decisao um chute.
 */
export interface Auxilio {
  /** De onde o entregador sai agora. */
  saiDe: IdContato;
  /** Quanto anda pegando as duas primeiras juntas, antes de entregar. */
  kmJuntas: number;
  /** Quanto anda fazendo uma de cada vez. */
  kmSeparadas: number;
  /** Os pedidos que a conta comparou. */
  pedidos: readonly string[];
}

export function auxilioDoComeco(
  estado: EstadoDoApp,
  quem = VOCE_MESMO
): Auxilio | undefined {
  const abertas = ofertasAbertas(estado);
  if (abertas.length < 2) return undefined;
  const a = abertas[0]!;
  const b = abertas[1]!;
  const saiDe = rotaDe(estado, quem).em;

  // Juntar: pega as duas e so depois entrega as duas.
  const juntas =
    kmEntre(saiDe, a.coleta) +
    kmEntre(a.coleta, b.coleta) +
    kmEntre(b.coleta, a.entrega) +
    kmEntre(a.entrega, b.entrega);

  // Separar: fecha a primeira inteira, so entao vai buscar a segunda.
  const separadas =
    kmEntre(saiDe, a.coleta) +
    kmEntre(a.coleta, a.entrega) +
    kmEntre(a.entrega, b.coleta) +
    kmEntre(b.coleta, b.entrega);

  return {
    saiDe,
    kmJuntas: Math.round(juntas * 100) / 100,
    kmSeparadas: Math.round(separadas * 100) / 100,
    pedidos: [a.id, b.id],
  };
}

/** Quantas reclamacoes este cliente ja fez. *//** Quantas reclamacoes este cliente ja fez. */
export function reclamacoesDe(estado: EstadoDoApp, quem: IdContato): number {
  return estado.reclamacoes[quem] ?? 0;
}

/** Se este cliente esta de porta fechada para a XB agora. */
export function estaDeCastigo(estado: EstadoDoApp, quem: IdContato): boolean {
  return (estado.semPedidosAte[quem] ?? 0) > estado.relogioDoBalcao;
}

/** Quantos segundos faltam para o cliente voltar a mandar servico. */
export function faltamParaVoltar(
  estado: EstadoDoApp,
  quem: IdContato
): number {
  return Math.max(
    0,
    (estado.semPedidosAte[quem] ?? 0) - estado.relogioDoBalcao
  );
}

/** Os clientes que fecharam a porta agora. */
export function clientesDeCastigo(estado: EstadoDoApp): readonly IdContato[] {
  return LOJAS.map(l => l.id).filter(id => estaDeCastigo(estado, id));
}

/* ── A CARTEIRA, E OS TRINTA DIAS ─────────────────────────────────────────*/

/** Que dia do bairro e agora. O primeiro dia e o dia 1. */
export function diaDoBairro(estado: EstadoDoApp): number {
  return Math.floor(estado.relogioDoBalcao / SEGUNDOS_POR_DIA) + 1;
}

/** As linhas do historico que ainda contam — as dos ultimos trinta dias. */
export function historicoQueConta(
  estado: EstadoDoApp,
  quem?: IdContato
): readonly LinhaDaCarteira[] {
  const limite = diaDoBairro(estado) - DIAS_DE_MEMORIA;
  return estado.historico.filter(
    l => l.dia > limite && (quem === undefined || l.cliente === quem)
  );
}

/**
 * A REPUTACAO DA XB COM AQUELE CLIENTE, de 0 a 100.
 *
 * Sai so das linhas dos ultimos trinta dias. Isso tem duas consequencias, e as
 * duas sao dele: a reputacao PODE IR PIORANDO ao longo do periodo, entrega
 * ruim atras de entrega ruim; e ela se cura sozinha com o tempo, porque a
 * linha velha um dia sai da conta. Nao ha perdao de graca — ha esquecimento
 * demorado.
 */
export function reputacaoDoCliente(
  estado: EstadoDoApp,
  quem: IdContato
): number {
  const soma = historicoQueConta(estado, quem).reduce(
    (total, l) => total + (PESO_DA_NOTA[l.estrelas] ?? 0),
    0
  );
  return Math.max(0, Math.min(100, REPUTACAO_DE_PARTIDA + soma));
}

/** Quantos bloqueios este cliente aplicou na XB dentro dos trinta dias. */
export function bloqueiosNaJanela(
  estado: EstadoDoApp,
  quem: IdContato
): number {
  return historicoQueConta(estado, quem).filter(l => l.bloqueio).length;
}

/** Quanto vai durar a PROXIMA suspensao deste cliente, em segundos. */
export function proximoCastigoDe(
  estado: EstadoDoApp,
  quem: IdContato
): number {
  return castigoPara(bloqueiosNaJanela(estado, quem));
}

/** Se o proximo bloqueio deste cliente ja e o ban. */
export function oProximoEBan(estado: EstadoDoApp, quem: IdContato): boolean {
  return (
    bloqueiosNaJanela(estado, quem) >= BLOQUEIOS_POR_DEGRAU * DEGRAUS_ATE_O_BAN
  );
}

/** Se este cliente ja saiu da carteira da XB. */
export function estaPerdido(estado: EstadoDoApp, quem: IdContato): boolean {
  return estado.perdidos[quem] !== undefined;
}

/** Os clientes que a XB perdeu. */
export function clientesPerdidos(estado: EstadoDoApp): readonly IdContato[] {
  return LOJAS.map(l => l.id).filter(id => estaPerdido(estado, id));
}

/** Os clientes que ainda mandam servico para a XB. */
export function clientesAtivos(estado: EstadoDoApp): readonly IdContato[] {
  return LOJAS.filter(l => l.online)
    .map(l => l.id)
    .filter(id => !estaPerdido(estado, id));
}

/** Com que tamanho de equipe a XB perdeu este cliente. */
export function equipeQuandoPerdeu(
  estado: EstadoDoApp,
  quem: IdContato
): number {
  return estado.perdidos[quem] ?? 0;
}

/**
 * O CLIENTE PERDIDO VOLTA QUANDO A XB CRESCE.
 *
 * Ordem dele: "o jogo sempre vai cobrar crescimento e melhorias". Servir bem
 * com a equipe de ontem segura a carteira de ontem — nao traz ninguem de
 * volta. Quem saiu so reabre a porta quando a empresa e MAIOR do que era no
 * dia em que ele saiu.
 *
 * E o unico caminho de volta, e e proposital: sem ele, uma sequencia ruim
 * viraria uma partida morta, com o balcao vazio para sempre e nada a fazer.
 */
export function verSeAlguemVoltou(
  estado: EstadoDoApp,
  tamanhoDaEquipe: number
): EstadoDoApp {
  const voltaram = Object.entries(estado.perdidos).filter(
    ([, equipeDeEntao]) => tamanhoDaEquipe > equipeDeEntao
  );
  if (voltaram.length === 0) return estado;

  const perdidos = { ...estado.perdidos };
  const reclamacoes = { ...estado.reclamacoes };
  for (const [quem] of voltaram) {
    delete perdidos[quem];
    reclamacoes[quem] = 0;
  }
  /*
   * Quem volta chega com a ficha limpa: as linhas velhas dele saem do
   * historico. Cliente que volta cobrando o passado nao volta de verdade.
   */
  const historico = estado.historico.filter(
    l => !voltaram.some(([quem]) => quem === l.cliente)
  );
  return { ...estado, perdidos, reclamacoes, historico };
}

/* ── O QUE ACONTECE QUANDO O RELOGIO ANDA ─────────────────────────────────*/

/** O BAIRRO PUBLICA o que estava na hora de publicar. */
export function publicarPedidos(estado: EstadoDoApp): EstadoDoApp {
  let ofertas = estado.ofertas.slice();
  let proximo = estado.proximoPedidoEm;
  let numero = estado.proximoNumeroDePedido;
  let mudou = false;

  /*
   * A ABERTURA DO BALCAO: os tres pedidos de teste saem juntos, na hora do
   * primeiro. Depois disso o bairro segue no compasso normal.
   */
  if (
    numero === PRIMEIRO_NUMERO &&
    estado.relogioDoBalcao >= estado.proximoPedidoEm
  ) {
    // Cliente perdido ou suspenso nao entra nem no teste: a carteira manda.
    const abertos = new Set(quemPodePublicar(estado));
    for (const t of PEDIDOS_DE_TESTE.filter(x => abertos.has(x.coleta))) {
      const base = pedidoDeNumero(numero, proximo);
      const km = ponte().kmDaCorrida(t.coleta, t.entrega);
      const kmEntrega = ponte().kmDaEntrega(t.coleta, t.entrega);
      ofertas = [
        ...ofertas,
        {
          ...base,
          coleta: t.coleta,
          entrega: t.entrega,
          km,
          kmEntrega,
          prazoS: tempoDaSolicitacao(kmEntrega),
          frete: ponte().freteDaCorrida(km, base.volumes),
        },
      ];
      numero += 1;
    }
    proximo += INTERVALO_ENTRE_PEDIDOS_S;
    mudou = true;
  }

  // O laco tem teto para o caso de alguem empurrar o relogio horas de uma vez.
  for (let volta = 0; volta < 50; volta += 1) {
    if (estado.relogioDoBalcao < proximo) break;
    const abertas = ofertas.filter(o => o.situacao === "aberta").length;
    const lojas = quemPodePublicar(estado);
    if (abertas >= OFERTAS_ABERTAS_NO_MAXIMO || lojas.length === 0) {
      /*
       * Balcao cheio, ou todo mundo de castigo: o bairro nao publica, mas o
       * relogio do proximo pedido anda mesmo assim. Sem isto, esvaziar o
       * balcao faria os atrasados sairem todos juntos, feito enxurrada.
       */
      proximo += INTERVALO_ENTRE_PEDIDOS_S;
      mudou = true;
      continue;
    }
    ofertas = [...ofertas, pedidoDeNumero(numero, proximo, lojas)];
    numero += 1;
    proximo += INTERVALO_ENTRE_PEDIDOS_S;
    mudou = true;
  }

  if (!mudou) return estado;
  return {
    ...estado,
    ofertas,
    proximoPedidoEm: proximo,
    proximoNumeroDePedido: numero,
  };
}

/**
 * FECHA UM PEDIDO e cobra a conta: estrelas, caixinha, reclamacao e castigo.
 *
 * E o unico lugar onde a nota do cliente e escrita. Ter um lugar so importa:
 * entregar no prazo, entregar atrasado e deixar o cliente desistir tem de
 * passar pela mesma regua, senao o jogo pune diferente pelo mesmo atraso.
 */
function fechar(
  estado: EstadoDoApp,
  o: OfertaDeEntrega,
  situacao: "entregue" | "perdida",
  carga = 1
): { oferta: OfertaDeEntrega; estado: EstadoDoApp } {
  const gastou = estado.relogioDoBalcao - o.publicadaEm;
  const atraso = o.prazoS > 0 ? ((gastou - o.prazoS) / o.prazoS) * 100 : 0;
  const faixa = faixaDe(atraso);
  const estrelas = situacao === "perdida" ? 1 : faixa.estrelas;
  const oferta: OfertaDeEntrega = {
    ...o,
    situacao,
    fechadaEm: estado.relogioDoBalcao,
    estrelas,
    caixinha:
      situacao === "entregue"
        ? Math.round(o.frete * faixa.caixinha * 100) / 100
        : 0,
    reclamou: situacao === "perdida" || faixa.reclama,
    cargaNaEntrega: situacao === "entregue" ? carga : undefined,
  };

  /*
   * A LINHA DO HISTORICO. Toda entrega fechada deixa uma, com o dia — e e so
   * dessas linhas que a reputacao e lida, dentro da janela de trinta dias.
   */
  const dia = diaDoBairro(estado);
  const limite = dia - DIAS_DE_MEMORIA;
  let atual: EstadoDoApp = {
    ...estado,
    historico: [
      // A poda mora aqui: sem ela, uma partida longa junta milhares de linhas.
      ...estado.historico.filter(l => l.dia > limite),
      { dia, cliente: o.coleta, estrelas, reclamou: Boolean(oferta.reclamou) },
    ],
  };

  /*
   * A PERDA DO CLIENTE. Reputacao no chao dentro da janela e o cliente sai da
   * carteira. Guardamos o TAMANHO DA EQUIPE do dia em que ele saiu, porque e
   * esse numero que ele vai cobrar para voltar.
   */
  if (
    !estaPerdido(atual, o.coleta) &&
    reputacaoDoCliente(atual, o.coleta) <= 0
  ) {
    atual = {
      ...atual,
      perdidos: {
        ...atual.perdidos,
        [o.coleta]: atual.equipeDeAgora,
      },
    };
    return { oferta, estado: atual };
  }

  if (!oferta.reclamou) return { oferta, estado: atual };

  /*
   * O TELEFONEMA E A SUSPENSAO. Ordem dele: "cliente fica com bolinha vermelha
   * e liga reclamando na empresa, 3 reclamacoes perdemos a entrega daquela
   * empresa por x periodo" — e o periodo e de quarenta minutos.
   */
  const quantas = reclamacoesDe(atual, o.coleta) + 1;
  const reclamacoes = { ...atual.reclamacoes, [o.coleta]: quantas };
  if (quantas < RECLAMACOES_ATE_PERDER) {
    return { oferta, estado: { ...atual, reclamacoes } };
  }

  /*
   * TRES TELEFONEMAS FECHARAM UM BLOQUEIO. Agora a escada decide o que ele
   * vale: mais um castigo, cada vez mais longo, ou o ban.
   */
  if (oProximoEBan(atual, o.coleta)) {
    return {
      oferta,
      estado: {
        ...atual,
        reclamacoes: { ...reclamacoes, [o.coleta]: 0 },
        perdidos: { ...atual.perdidos, [o.coleta]: atual.equipeDeAgora },
      },
    };
  }

  const quanto = proximoCastigoDe(atual, o.coleta);
  return {
    oferta,
    estado: {
      ...atual,
      // A conta de telefonemas zera junto com a suspensao; a reputacao NAO.
      reclamacoes: { ...reclamacoes, [o.coleta]: 0 },
      semPedidosAte: {
        ...atual.semPedidosAte,
        [o.coleta]: atual.relogioDoBalcao + quanto,
      },
      // O bloqueio fica registrado com a data: e ele que sobe o degrau.
      historico: [
        ...atual.historico,
        { dia, cliente: o.coleta, estrelas: 0, reclamou: true, bloqueio: true },
      ],
    },
  };
}

/**
 * A VARREDURA: quem desistiu, quem saiu, quem chegou.
 *
 * Roda a cada segundo do balcao. E ela que faz o relogio ter consequencia —
 * sem ela, a bolinha seria um enfeite que muda de cor.
 */
export function varrerOfertas(estado: EstadoDoApp): EstadoDoApp {
  let atual = estado;
  let mudou = false;

  /*
   * ── PRIMEIRO OS ENTREGADORES ANDAM ───────────────────────────────────────
   *
   * Cada um avanca um segundo na sua rota. Quem chega numa porta de coleta
   * pega o pacote; quem chega numa porta de entrega FECHA o pedido, e a nota
   * sai da regua de sempre — o tempo total desde a publicacao.
   */
  const rotas: Record<string, EmRota> = { ...atual.rotas };
  const entreguesAgora = new Set<string>();
  const coletadosAgora = new Set<string>();
  for (const [nome, rota] of Object.entries(atual.rotas)) {
    if (rota.paradas.length === 0) continue;
    const passo = andarUmSegundo(rota);
    rotas[nome] = passo.quem;
    for (const id of passo.entregues) entreguesAgora.add(id);
    for (const id of passo.coletados) coletadosAgora.add(id);
    if (passo.entregues.length > 0 || passo.coletados.length > 0) mudou = true;
    if (passo.quem !== rota) mudou = true;
  }
  if (mudou) atual = { ...atual, rotas };

  const ofertas: OfertaDeEntrega[] = [];
  for (const o of atual.ofertas) {
    // Aberta e passou do ponto: o cliente desistiu e chamou outro.
    if (o.situacao === "aberta") {
      const gastou = atual.relogioDoBalcao - o.publicadaEm;
      const atraso = o.prazoS > 0 ? ((gastou - o.prazoS) / o.prazoS) * 100 : 0;
      if (atraso > DESISTE_COM_ATRASO_DE) {
        const r = fechar(atual, o, "perdida");
        atual = r.estado;
        ofertas.push(r.oferta);
        mudou = true;
        continue;
      }
      ofertas.push(o);
      continue;
    }

    // O entregador chegou na porta e entregou.
    if (
      (o.situacao === "rodando" || o.situacao === "na-fila") &&
      entreguesAgora.has(o.id)
    ) {
      const r = fechar(atual, o, "entregue", cargaDe(atual, quemCarrega(o)));
      atual = r.estado;
      ofertas.push(r.oferta);
      mudou = true;
      continue;
    }

    // Passou na coleta: o pacote saiu da loja e esta na bolsa.
    if (o.situacao === "na-fila" && coletadosAgora.has(o.id)) {
      ofertas.push({ ...o, situacao: "rodando" });
      mudou = true;
      continue;
    }

    ofertas.push(o);
  }

  return mudou ? { ...atual, ofertas } : estado;
}

/**
 * Anda o relogio do balcao um segundo: publica, varre e ve quem voltou.
 *
 * O TAMANHO DA EQUIPE entra aqui porque e ele que traz cliente perdido de
 * volta — e porque, guardado no estado, e o numero que o cliente vai cobrar se
 * um dia sair. Sem ele, a promessa de "crescer para recuperar" nao teria onde
 * se apoiar.
 */
export function passarUmSegundo(
  estado: EstadoDoApp,
  tamanhoDaEquipe = estado.equipeDeAgora
): EstadoDoApp {
  const comEquipe =
    tamanhoDaEquipe === estado.equipeDeAgora
      ? estado
      : { ...estado, equipeDeAgora: tamanhoDaEquipe };
  return verSeAlguemVoltou(
    varrerOfertas(
      publicarPedidos({
        ...comEquipe,
        relogioDoBalcao: comEquipe.relogioDoBalcao + 1,
      })
    ),
    tamanhoDaEquipe
  );
}

/**
 * A XB ACEITA o pedido, e escolhe quem vai.
 *
 * Aceitar sem dizer quem vai e possivel — a oferta entra na fila e espera. E o
 * que ele pediu: "aceita entrar na fila".
 */
export function aceitarOferta(
  estado: EstadoDoApp,
  id: string,
  entregador?: string
): EstadoDoApp {
  const alvo = estado.ofertas.find(o => o.id === id);
  if (!alvo || alvo.situacao !== "aberta") return estado;
  ponte().aconteceu({
    o: "coleta-aceita",
    conversa: alvo.coleta,
    pedido: alvo.id,
  });
  /*
   * O PEDIDO ENTRA NA ROTA DE ALGUEM.
   *
   * Sem entregador nomeado, quem carrega e o proprio jogador — que tambem tem
   * rota, tambem sai da pizzaria e tambem paga o caminho. Era a regra dele:
   * "entregador ou usuario aceitarem mais de uma coleta por vez".
   */
  const quem = entregador ?? VOCE_MESMO;
  const rota = pegarOPedido(
    rotaDe(estado, quem),
    alvo.id,
    alvo.coleta,
    alvo.entrega
  );

  return {
    ...estado,
    rotas: { ...estado.rotas, [quem]: rota },
    ofertas: estado.ofertas.map(o =>
      o.id === id
        ? {
            ...o,
            situacao: "na-fila" as const,
            aceitaEm: estado.relogioDoBalcao,
            entregador,
          }
        : o
    ),
  };
}

/**
 * A XB diz que hoje nao da.
 *
 * Recusar NAO rende reclamacao: dizer nao na hora e honesto, e o cliente
 * simplesmente chama outro. O que rende reclamacao e prometer e demorar.
 */
export function recusarOferta(estado: EstadoDoApp, id: string): EstadoDoApp {
  const alvo = estado.ofertas.find(o => o.id === id);
  if (!alvo || alvo.situacao !== "aberta") return estado;
  ponte().aconteceu({
    o: "coleta-recusada",
    conversa: alvo.coleta,
    pedido: alvo.id,
  });
  return {
    ...estado,
    ofertas: estado.ofertas.map(o =>
      o.id === id
        ? {
            ...o,
            situacao: "recusada" as const,
            fechadaEm: estado.relogioDoBalcao,
          }
        : o
    ),
  };
}

/* ── O QUE O DIA RENDEU ───────────────────────────────────────────────────*/

/** O caminho do pedido, escrito do jeito que a tela mostra. */
export function trajeto(o: OfertaDeEntrega): string {
  return `${nomeDe(o.coleta)} → ${nomeDe(o.entrega)}`;
}

/** O que a XB ja ganhou hoje com o balcao. */
export function ganhoDoDia(estado: EstadoDoApp): number {
  return estado.ofertas
    .filter(o => o.situacao === "entregue")
    .reduce((soma, o) => soma + o.frete, 0);
}

/** O que os entregadores ja ganharam de caixinha. */
export function caixinhaDoDia(estado: EstadoDoApp): number {
  return estado.ofertas.reduce((soma, o) => soma + (o.caixinha ?? 0), 0);
}

/** A media de estrelas do dia. Zero quando ainda nao houve nota. */
export function mediaDeEstrelas(estado: EstadoDoApp): number {
  const com = estado.ofertas.filter(o => o.estrelas !== undefined);
  if (com.length === 0) return 0;
  const soma = com.reduce((s, o) => s + (o.estrelas ?? 0), 0);
  return Math.round((soma / com.length) * 10) / 10;
}

/** O relogio do balcao escrito como cronometro: 75 vira "1:15". */
export function cronometro(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

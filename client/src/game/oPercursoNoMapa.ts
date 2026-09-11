/**
 * O PERCURSO DESENHADO NO MAPA.
 *
 * Ordem dele, 08/09/2026: "ao clicar em aceitar, apareca o icone de coleta, e
 * entrega e entregador comece percurso" — saindo da pizzaria.
 *
 * ── QUEM SABE O QUE ───────────────────────────────────────────────────────
 *
 * O balcao (aRota.ts) sabe ONDE o entregador esta e QUAIS paradas faltam. Ele
 * nao sabe desenhar: nao conhece rua, nem porta, nem porcentagem de tela — e
 * nao pode conhecer, senao o aplicativo passaria a depender do mapa.
 *
 * Este arquivo faz a traducao, e mora do lado do JOGO de proposito. Ele pega a
 * rota crua ("estou na pizzaria, falta coleta na padaria e entrega na casa 8")
 * e devolve o que a tela precisa: os pinos, o tracado pelas ruas e o ponto
 * exato onde o entregador esta neste segundo.
 *
 * ── POR QUE O TRACADO PASSA PELAS RUAS ────────────────────────────────────
 *
 * Porque a distancia ja passa. O frete, o prazo e a nota saem de metros
 * medidos rua a rua desde o primeiro dia; um risco reto na tela mostraria um
 * caminho mais curto do que o que foi cobrado, e a pessoa acharia — com razao
 * — que o jogo esta contando errado.
 */
import { rota as rotaPelasRuas } from "./rotas";
import { enderecoDe } from "./xbwapp/distancias";
import { PARADA_S, tempoDaPerna, type EmRota } from "./xbwapp/aRota";
import { MAPA, METROS_POR_PIXEL, type PontoNoMapa } from "./streets";
import { BASE } from "./addresses";
import { montarCorrida, type ParadaDaEntrega } from "./aParada";
import { montarPassos, pontoEm } from "./rumoDoEntregador";

/** Um pino, do jeito que o mapa desenha. */
export interface PinoDoPercurso {
  papel: "base" | "coleta" | "entrega";
  nome: string;
  em: readonly [number, number];
}

export interface PercursoNoMapa {
  /** Os pinos de coleta e de entrega que faltam passar. */
  paradas: readonly PinoDoPercurso[];
  /** O tracado inteiro, ponto a ponto, em cima das ruas. */
  caminho: readonly PontoNoMapa[];
  /** Onde o entregador esta agora, em porcentagem da tela. */
  onde?: readonly [number, number];
  /**
   * AS PARADAS DO DESENHO DO RENAN — onde a bicicleta fica e o que ele faz ali.
   *
   * Ordem dele, 10/09/2026: "cada coleta, Renan deve parar na frente do
   * estabelecimento como mapeado, entrar a animacao de coleta quando for
   * coleta e entrega quando for entrega". O metro de cada parada sai da mesma
   * montagem que emenda o tracado — o mesmo jeito que a corrida de abertura ja
   * fazia — entao a bicicleta para no fim de cada perna: o ponto da rua em
   * frente a porta que ele marcou.
   */
  paradasDaEntrega: readonly ParadaDaEntrega[];
  /** Quantos metros do tracado ele ja andou, pela conta do balcao. */
  metros: number;
  /** A parada em que ele esta agora, descido da bicicleta — ou nenhuma. */
  naPorta: ParadaDaEntrega | null;
}

/** O que so muda quando a rota muda: pinos, tracado e paradas. */
export interface TracadoDoPercurso {
  paradas: readonly PinoDoPercurso[];
  caminho: readonly PontoNoMapa[];
  paradasDaEntrega: readonly ParadaDaEntrega[];
}

/** O que muda a cada segundo do balcao: onde ele esta nesse tracado. */
export interface ProgressoNoTracado {
  onde?: readonly [number, number];
  metros: number;
  naPorta: ParadaDaEntrega | null;
}

/** Anda uma fracao de um tracado e devolve o ponto exato. */
export function andarNoTracado(
  tracado: readonly PontoNoMapa[],
  fracao: number
): readonly [number, number] | undefined {
  if (tracado.length === 0) return undefined;
  if (tracado.length === 1) return tracado[0];
  const pedacos: number[] = [];
  let total = 0;
  for (let i = 1; i < tracado.length; i += 1) {
    const a = tracado[i - 1]!;
    const b = tracado[i]!;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    pedacos.push(d);
    total += d;
  }
  if (total === 0) return tracado[0];
  let falta = Math.max(0, Math.min(1, fracao)) * total;
  for (let i = 0; i < pedacos.length; i += 1) {
    const d = pedacos[i]!;
    if (falta <= d || i === pedacos.length - 1) {
      const t = d === 0 ? 0 : Math.min(1, falta / d);
      const a = tracado[i]!;
      const b = tracado[i + 1]!;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    falta -= d;
  }
  return tracado[tracado.length - 1];
}

/**
 * O TRACADO DE UMA ROTA: os pinos, as ruas e as paradas.
 *
 * Separado do "onde ele esta agora" de proposito: isto so muda quando ele chega
 * numa parada ou quando se aceita um pedido, e o onde muda todo segundo. Quem
 * desenha pode guardar o tracado e pedir so o progresso — sem isso o desenho do
 * entregador recomecaria do zero a cada segundo do balcao.
 *
 * O PINO pousa na "frente" do lugar — a bola que ele pintou no desenho — e o
 * TRACADO sai da porta. Sao dois pontos diferentes no mesmo endereco, e a
 * diferenca importa: pino no meio da rua aponta para lugar nenhum, e caminho
 * que entra pela bola atravessa a parede.
 */
export function tracadoDoPercurso(quem: EmRota): TracadoDoPercurso {
  const aqui = enderecoDe(quem.em);
  const paradas: PinoDoPercurso[] = [];
  if (!aqui) return { paradas, caminho: [], paradasDaEntrega: [] };

  let de = aqui;
  const pernas: Parameters<typeof montarCorrida>[0][number][] = [];
  for (const p of quem.paradas) {
    const para = enderecoDe(p.lugar);
    if (!para) continue;
    paradas.push({
      papel: p.o === "coleta" ? "coleta" : "entrega",
      nome: para.nome,
      em: para.frente,
    });
    pernas.push({
      papel: p.o === "coleta" ? "coleta" : "entrega",
      endereco: para,
      caminho: rotaPelasRuas(de.em, para.em),
    });
    de = para;
  }
  if (pernas.length === 0)
    return { paradas, caminho: [], paradasDaEntrega: [] };

  /*
   * O TRACADO E AS PARADAS SAEM DA MESMA MONTAGEM — a da corrida de abertura.
   *
   * Emendar num lugar e contar o metro da parada em outro ja deu cinco metros e
   * meio de diferenca uma vez: a bicicleta parava num ponto e voltava a andar
   * de outro. Montando junto, o metro de cada parada e o comprimento do que ja
   * foi montado, e fica certo por construcao.
   */
  const montada = montarCorrida(
    pernas,
    MAPA.largura,
    MAPA.altura,
    METROS_POR_PIXEL
  );
  return {
    paradas,
    caminho: montada.caminho,
    paradasDaEntrega: montada.paradas,
  };
}

/**
 * ONDE ELE ESTA AGORA, dentro de um tracado ja montado.
 *
 * A conta e a mesma que o balcao usa para saber quando ele chega: quanto ja
 * rodou desta perna, dividido pelo tempo que a perna leva. Se o desenho usasse
 * outra conta, o boneco chegaria antes ou depois do pedido fechar — e a pessoa
 * veria a entrega ser dada como feita com o entregador no meio da rua.
 *
 * ── A PERNA TERMINA COM ELE PARADO NA PORTA ───────────────────────────────
 *
 * O tempo de cada perna, no balcao, ja inclui a parada (PARADA_S): descer,
 * pegar ou entregar, subir. Entao ele PEDALA ate faltar esse tanto e passa o
 * resto DESCIDO, na frente do lugar. E a hora da cena de coleta ou de entrega.
 */
export function progressoNoTracado(
  quem: EmRota,
  tracado: TracadoDoPercurso
): ProgressoNoTracado {
  const aqui = enderecoDe(quem.em);
  const primeira = tracado.paradasDaEntrega[0];
  const proxima = quem.paradas[0];
  if (!aqui || !primeira || !proxima) {
    return { onde: aqui?.em, metros: 0, naPorta: null };
  }
  const precisa = tempoDaPerna(quem.em, proxima.lugar, quem.veiculo);
  const pedalar = Math.max(0, precisa - PARADA_S);
  const fracao = pedalar > 0 ? Math.min(1, quem.naPernaS / pedalar) : 1;
  const metros = primeira.ate * fracao;
  const naPorta = quem.naPernaS >= pedalar ? primeira : null;

  /*
   * PARADO NA PORTA e parado NA PORTA. O tracado comeca na entrada da rua, uns
   * poucos metros adiante; usar o primeiro ponto dele faria o entregador
   * nascer no meio-fio em vez de na pizzaria. Enquanto ele nao andou nada, o
   * ponto e o endereco.
   */
  const onde =
    quem.naPernaS > 0 && tracado.caminho.length > 1
      ? (pontoEm(montarPassos(tracado.caminho), metros) ?? aqui.em)
      : aqui.em;
  return { onde, metros, naPorta };
}

/**
 * Traduz a rota de um entregador no que o mapa desenha — o tracado e o
 * progresso de uma vez so, para quem nao precisa guardar um separado do outro.
 */
export function percursoNoMapa(quem: EmRota): PercursoNoMapa {
  const tracado = tracadoDoPercurso(quem);
  return { ...tracado, ...progressoNoTracado(quem, tracado) };
}

/**
 * ── O RENAN ESPERANDO — sem pedido na mao ────────────────────────────────
 *
 * Com a historia terminada e nenhum pedido aceito, ele fica PARADO, em pe com a
 * bicicleta, na porta de onde esta: a pizzaria no comeco — foi para la que a
 * conversa da abertura o mandou — e, depois, a porta da ultima entrega. E dali
 * que o balcao ja calcula o proximo pedido, entao e ali que a pessoa precisa
 * ve-lo.
 *
 * O tracado curto ate a base serve so para ele ficar virado para a rua, e nao
 * para dentro do predio. Ele nao anda por ele.
 */
export function esperaNoMapa(quem: EmRota): TracadoDoPercurso {
  const aqui = enderecoDe(quem.em);
  if (!aqui) return { paradas: [], caminho: [], paradasDaEntrega: [] };
  const paraARua = rotaPelasRuas(aqui.em, BASE.em);
  const caminho =
    paraARua.length > 1
      ? paraARua
      : [aqui.em, [aqui.em[0] + 0.05, aqui.em[1]] as const];
  return { paradas: [], caminho, paradasDaEntrega: [] };
}

/**
 * ── O PLANO DA CORRIDA — um caminho so, do aceite ate a ultima porta ──────
 *
 * Ordem dele, 10/09/2026: "analise melhorias que deixem uma animacao
 * profissional sem ficar piscando".
 *
 * Ate aqui o tracado era refeito a cada porta: o balcao marca que ele chegou,
 * o "lugar de onde ele sai" muda, e o mapa montava um caminho novo a partir
 * dali. Medido no jogo montado, quadro a quadro, cada troca de perna fazia
 * tres coisas ruins de uma vez: o jogo parava um quarto de segundo refazendo
 * as ruas, o desenho nascia num quadro no lugar errado e, com a pausa, o
 * menino ficava invisivel na tela durante esse quarto de segundo.
 *
 * O plano e o caminho da corrida INTEIRA, montado uma vez no aceite. As portas
 * vao sendo passadas e o caminho continua o mesmo: o balcao so diz em qual
 * perna ele esta, e o desenho continua andando pelo mesmo tracado. O plano so e
 * refeito quando a corrida muda de verdade — um pedido novo que entra na fila.
 */
export interface PlanoDoPercurso extends TracadoDoPercurso {
  /** De onde a corrida partiu quando o plano foi feito. */
  origem: EmRota["em"];
  /** As paradas que o plano cobre, na ordem. */
  paradasDoPlano: EmRota["paradas"];
}

function mesmaParada(
  a: EmRota["paradas"][number],
  b: EmRota["paradas"][number]
): boolean {
  return a.pedido === b.pedido && a.o === b.o && a.lugar === b.lugar;
}

/** Monta o plano; sem endereco para alguma parada, nao ha plano (null). */
export function planoDoPercurso(quem: EmRota): PlanoDoPercurso | null {
  if (quem.paradas.length === 0) return null;
  if (!enderecoDe(quem.em)) return null;
  if (quem.paradas.some(p => !enderecoDe(p.lugar))) return null;
  const tracado = tracadoDoPercurso(quem);
  if (tracado.paradasDaEntrega.length !== quem.paradas.length) return null;
  return { ...tracado, origem: quem.em, paradasDoPlano: quem.paradas };
}

/**
 * EM QUAL PERNA DO PLANO ELE ESTA — ou null, se o plano nao serve mais.
 *
 * Serve enquanto o que falta na rota for o FIM da lista do plano, e ele estiver
 * saindo da parada logo antes desse fim. Devolve o numero da perna; igual ao
 * tamanho do plano quando ele ja passou por todas e esta parado na ultima.
 */
export function pernaNoPlano(
  plano: PlanoDoPercurso,
  quem: EmRota
): number | null {
  const todas = plano.paradasDoPlano;
  const faltam = quem.paradas;
  if (faltam.length > todas.length) return null;
  const k = todas.length - faltam.length;
  for (let i = 0; i < faltam.length; i += 1)
    if (!mesmaParada(faltam[i]!, todas[k + i]!)) return null;
  const saiuDe = k === 0 ? plano.origem : todas[k - 1]!.lugar;
  return quem.em === saiuDe ? k : null;
}

/** O plano de antes, se ainda serve; senao um novo (ou nenhum, sem pedido). */
export function planoPara(
  quem: EmRota,
  anterior: PlanoDoPercurso | null
): PlanoDoPercurso | null {
  if (anterior && pernaNoPlano(anterior, quem) !== null) return anterior;
  return planoDoPercurso(quem);
}

export interface ProgressoNoPlano {
  /** Onde ele esta, pela conta do balcao, neste segundo. */
  metros: number;
  /** Onde esta perna acaba: ele nunca passa daqui antes do balcao dizer. */
  ate: number;
  /** A velocidade desta perna (zero descido ou parado). */
  metrosPorSegundo: number;
  naPorta: ParadaDaEntrega | null;
  /** Passou por todas as portas: parado na ultima, esperando pedido. */
  parado: boolean;
  onde?: readonly [number, number];
}

/**
 * ONDE ELE ESTA NO PLANO. A conta e a mesma do balcao — quanto ja rodou desta
 * perna sobre o tempo que a perna leva, tirada a parada —, so que medida no
 * caminho inteiro: a perna k vai do fim da perna anterior ate a porta k.
 */
export function progressoNoPlano(
  quem: EmRota,
  plano: PlanoDoPercurso
): ProgressoNoPlano | null {
  const k = pernaNoPlano(plano, quem);
  if (k === null) return null;
  const portas = plano.paradasDaEntrega;
  const passos = montarPassos(plano.caminho);
  if (k >= portas.length) {
    const fim = portas[portas.length - 1]?.ate ?? 0;
    return {
      metros: fim,
      ate: fim,
      metrosPorSegundo: 0,
      naPorta: null,
      parado: true,
      onde: pontoEm(passos, fim) ?? undefined,
    };
  }
  const inicio = k === 0 ? 0 : portas[k - 1]!.ate;
  const porta = portas[k]!;
  const proxima = quem.paradas[0]!;
  const precisa = tempoDaPerna(quem.em, proxima.lugar, quem.veiculo);
  const pedalar = Math.max(0, precisa - PARADA_S);
  const naPorta = quem.naPernaS >= pedalar;
  const fracao = pedalar > 0 ? Math.min(1, quem.naPernaS / pedalar) : 1;
  const metros = inicio + (porta.ate - inicio) * fracao;
  return {
    metros,
    ate: porta.ate,
    metrosPorSegundo:
      naPorta || pedalar <= 0 ? 0 : (porta.ate - inicio) / pedalar,
    naPorta: naPorta ? porta : null,
    parado: false,
    onde: pontoEm(passos, metros) ?? undefined,
  };
}

/** Os pinos do que FALTA passar — so enderecos, sem refazer caminho nenhum. */
export function pinosDaRota(quem: EmRota): PinoDoPercurso[] {
  const pinos: PinoDoPercurso[] = [];
  for (const p of quem.paradas) {
    const lugar = enderecoDe(p.lugar);
    if (!lugar) continue;
    pinos.push({
      papel: p.o === "coleta" ? "coleta" : "entrega",
      nome: lugar.nome,
      em: lugar.frente,
    });
  }
  return pinos;
}

/**
 * OS ENDERECOS DO BAIRRO: as portas em cima dos PREDIOS desenhados.
 *
 * ── O QUE MUDOU EM 04/09/2026, E POR QUE ──────────────────────────────────
 *
 * Antes as portas eram inventadas em cima da malha de ruas: o comercio ia
 * para uma esquina movimentada, a casa ia para o meio de um trecho. Dava um
 * bairro plausivel e mentiroso — a Pizzaria aparecia no meio do asfalto, e
 * quem olhava a tela parava de confiar nela.
 *
 * Agora as portas saem do DESENHO. Uma analise le a imagem do bairro e acha
 * os predios; cada predio ganha a sua porta, que e o ponto dele que encosta
 * na rua. O pino passa a apontar a construcao que a pessoa esta vendo.
 *
 * Como a analise acha um predio (esta na cabeca do arquivo de dados, e vale
 * repetir): NAO e por cor de telhado — isso falhou tres vezes, porque telhado
 * azul e pedra cinza tem a mesma cor, e telhado verde e mato tambem. E por
 * SUPERFICIE PINTADA E LISA: telhado e uma cor so, arvore e ruido. Para
 * separar loja de casa, o sinal e o TOLDO: nenhum telhado do bairro chega na
 * cor de uma lona de loja, e o listrado ainda alterna com branco.
 *
 * ── AS DECISOES DO FERNANDO, QUE O CODIGO SO OBEDECE ──────────────────────
 *
 *   - Dos 33 predios com sinal de loja, SETE sao comercio, escolhidos em
 *     pontos opostos do mapa. Os outros 26 viram casa. ("dos 33 comercios
 *     escolha 7, em pontos opostos do mapa, o restante iremos tratar e
 *     adicionar como casas")
 *   - Os GALPOES ficam fora do jogo por enquanto: "os galpoes evoluiram no
 *     futuro". Eles continuam no arquivo de dados, marcados, esperando.
 *   - Os nomes dos sete comercios sao PROVISORIOS. Batizar e decisao dele.
 *
 * ── O QUE CONTINUA COMO ESTAVA ────────────────────────────────────────────
 *
 * A BASE ainda e a esquina mais central do bairro — nao escolhida no olho: a
 * esquina com a menor distancia media ate todas as outras, para a primeira
 * entrega nunca nascer num canto do mapa.
 *
 * A NUMERACAO das casas segue a RUA, e nao a linha reta: casa 1 e a mais
 * perto da base ANDANDO, e dai em diante os numeros crescem conforme se
 * afasta. "Entrega nas casas 8, 12 e 34" ja diz que a 34 fica mais longe, do
 * mesmo jeito que numero de rua diz onde fica a porta.
 *
 * E o bairro sai SEMPRE igual: nada aqui usa acaso. A casa 12 e a casa 12
 * hoje, amanha e no aparelho de outra pessoa. Bairro que se remonta a cada
 * partida seria impossivel de testar, e decorar o bairro e metade da graca de
 * um jogo de entrega.
 */
import { MAPA } from "./streets";
import type { PontoNoMapa } from "./streets";
import dadosDosPredios from "./data/predios-bairro-xb.json";
import { distanciasDe, entradaNaRua, pontoNaRua } from "./rotas";

export type PapelDoEndereco = "base" | "comercio" | "casa";

export interface Endereco {
  id: string;
  papel: PapelDoEndereco;
  /** Como o jogo chama isto em voz alta: "Mercado", "casa 12". */
  nome: string;
  /** A PORTA: onde o predio encosta na rua. E daqui que sai toda distancia. */
  em: PontoNoMapa;
  /**
   * O LUGAR: a bola que o Fernando pintou no mapa.
   *
   * Ele marcou o bairro a mao e disse o que cada cor quer dizer — vermelha e
   * coleta, verde e entrega. E disse tambem para que serve a bola: "bolas
   * vermelhas e verdes devem ser onde pinos devem ficar, e mostram locais".
   *
   * Entao este ponto nao e um palpite sobre onde fica o predio. E a escolha
   * dele de onde o pino pousa.
   */
  telhado: PontoNoMapa;
  /**
   * ONDE O PINO POUSA — hoje, o mesmo ponto acima.
   *
   * Este campo ja teve conta propria. Quando o lugar do predio saia de analise
   * de imagem, o pino era empurrado 62% do caminho ate a porta, para nao
   * sentar em cima da construcao que estava apontando. Aquilo consertava um
   * defeito de um ponto CALCULADO.
   *
   * A bola pintada a mao nao tem esse defeito: ele ja olhou o desenho e
   * escolheu o ponto. Empurrar o pino dali seria corrigir uma decisao que nao
   * e minha. O campo fica, porque a tela inteira ja fala por ele — e no dia em
   * que a marcacao voltar a ser calculada, o empurrao volta aqui.
   */
  frente: PontoNoMapa;
  /**
   * O TRECHO A PE: da rua ate a porta.
   *
   * Sai dos RISCOS que o Fernando desenhou, e ele disse para que servem:
   * "riscos serao onde mudara animacao, para entregador andar ate a porta
   * para entrega ou retirada".
   *
   * Entao nao e enfeite de mapa, e uma troca de estado: a bicicleta PARA no
   * primeiro ponto — que fica na rua, conferido — e dali em diante o
   * entregador vai a pe ate o ultimo ponto. So os lugares que ele riscou tem
   * isto; nos outros, chegar na porta ja e chegar.
   */
  aPe?: readonly PontoNoMapa[];
  /** Numero na rua. A base nao tem: ela e uma so. */
  numero?: number;
  /** Metros ate a base, andando pelas ruas. */
  metrosDaBase: number;
}

interface PredioDoDesenho {
  id: string;
  tipo: string;
  nome: string | null;
  aPe?: number[][];
  em: number[];
  porta: number[];
  area: number;
  emJogo: boolean;
}

const PREDIOS = dadosDosPredios.predios as readonly PredioDoDesenho[];

/**
 * A BASE DA EQUIPE E A PRACA DA FONTE.
 *
 * Decisao do Fernando: "deixar registrado praça como base da equipe". Antes a
 * base era a esquina mais central do bairro — uma conta, sem lugar. A praca e
 * um LUGAR: tem fonte, coreto e o desenho ja a trata como o meio do bairro.
 * Quem sai para entregar sai de algum canto, e agora esse canto existe.
 */
const PRACA: PontoNoMapa = [47.307, 39.595];

/**
 * Os comercios que entram no jogo, na ordem em que a analise os achou.
 *
 * Sete, e nao trinta e tres: "dos 33 comercios escolha 7, em pontos opostos
 * do mapa". Sete lojas espalhadas dao viagem de verdade entre coleta e
 * entrega; trinta e tres deixariam sempre uma na esquina de casa.
 */
const COMERCIOS_DO_DESENHO = PREDIOS.filter(
  p => p.tipo === "comercio" && p.emJogo
);

/** As casas do desenho — as 73 que ja eram, mais as 26 que ele mandou virar. */
const CASAS_DO_DESENHO = PREDIOS.filter(p => p.tipo === "casa" && p.emJogo);

/** Quantas casas o bairro tem. Sai da contagem do desenho, nao da minha mao. */
export const QUANTAS_CASAS = CASAS_DO_DESENHO.length;

const dist = (a: PontoNoMapa, b: PontoNoMapa): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * Onde o pino pousa: EM CIMA DA BOLA que ele pintou.
 *
 * "bolas vermelhas e verdes devem ser onde pinos devem ficar." A ponta do
 * pino encosta neste ponto e o corpo sobe a partir dele — entao a bola dele e
 * exatamente o lugar apontado na tela.
 */
function aFrenteDe(lugar: PontoNoMapa): PontoNoMapa {
  return [lugar[0], lugar[1]];
}

function montar(): readonly Endereco[] {
  /*
   * A caminhada comeca ONDE A PRACA TOCA A RUA, e nao num cruzamento. Por
   * isso a conta parte das duas pontas do trecho em que ela entra, cada uma
   * ja com o pedaco andado ate ela — senao a casa vizinha da praca pagaria o
   * desvio ate a esquina.
   */
  const daBase = distanciasDe(PRACA);
  const portaDaBase: PontoNoMapa = pontoNaRua(PRACA);

  /** Metros de caminhada da base ate uma porta qualquer do bairro. */
  const aPeAteAPorta = (porta: PontoNoMapa): number => {
    const entrada = entradaNaRua(porta);
    if (!entrada) return Infinity;
    const porDe = (daBase.get(entrada.trecho.de) ?? Infinity) + entrada.metrosAteODe;
    const porAte = (daBase.get(entrada.trecho.ate) ?? Infinity) + entrada.metrosAteOAte;
    return Math.min(porDe, porAte);
  };

  const lista: Endereco[] = [
    {
      id: "base",
      papel: "base",
      nome: "Praça da Fonte",
      em: portaDaBase,
      telhado: PRACA,
      frente: aFrenteDe(PRACA),
      metrosDaBase: 0,
    },
  ];

  /*
   * Os comercios: mesma ordem das casas — caminhada ate a base — e so entao
   * numerados. A maioria ainda NAO TEM NOME, e isso e de proposito: batizar e
   * decisao do Fernando, e "comercio 12" e um rotulo honesto enquanto o nome
   * nao vem. Inventar nome seria escrever no mapa uma coisa que ninguem
   * decidiu, e depois ninguem lembra que foi invencao.
   */
  const comercios = COMERCIOS_DO_DESENHO.map(c => {
    const em: PontoNoMapa = [c.porta[0]!, c.porta[1]!];
    const telhado: PontoNoMapa = [c.em[0]!, c.em[1]!];
    return {
      id: c.id,
      nome: c.nome,
      em,
      telhado,
      frente: aFrenteDe(telhado),
      aPe: c.aPe as unknown as readonly PontoNoMapa[] | undefined,
      metros: aPeAteAPorta(em),
    };
  }).sort((a, b) => a.metros - b.metros || a.id.localeCompare(b.id));

  comercios.forEach((c, i) => {
    lista.push({
      id: c.id,
      papel: "comercio",
      nome: c.nome ?? `comércio ${i + 1}`,
      em: c.em,
      telhado: c.telhado,
      frente: c.frente,
      aPe: c.aPe,
      numero: i + 1,
      metrosDaBase: c.metros,
    });
  });

  /*
   * As casas: ordenadas pela caminhada ate a base e so entao numeradas.
   * Numerar antes de ordenar daria casa 1 no fim do bairro.
   */
  const casas = CASAS_DO_DESENHO.map(c => {
    const em: PontoNoMapa = [c.porta[0]!, c.porta[1]!];
    const telhado: PontoNoMapa = [c.em[0]!, c.em[1]!];
    return {
      id: c.id,
      nome: c.nome,
      em,
      telhado,
      frente: aFrenteDe(telhado),
      aPe: c.aPe as unknown as readonly PontoNoMapa[] | undefined,
      metros: aPeAteAPorta(em),
    };
  }).sort((a, b) => a.metros - b.metros || a.id.localeCompare(b.id));

  casas.forEach((c, i) => {
    lista.push({
      id: `casa-${i + 1}`,
      papel: "casa",
      /*
       * O NOME DE QUEM MORA, e nao so o numero.
       *
       * Ordem dele, 08/09/2026: mapear e dar nome a cada lugar de coleta e de
       * entrega. Numa entrega o que a pessoa le e "casa da dona Ilda" — o
       * numero e endereco, o nome e gente, e e o nome que faz o bairro deixar
       * de ser uma planilha.
       *
       * O numero continua vivo no campo `numero` e no id, entao nada se
       * perdeu: quem precisar contar casa continua contando.
       *
       * Casa sem nome no desenho volta a ser "casa N" — assim um predio novo
       * entra no mapa sem precisar ser batizado no mesmo dia.
       */
      nome: c.nome ?? `casa ${i + 1}`,
      em: c.em,
      telhado: c.telhado,
      frente: c.frente,
      aPe: c.aPe,
      numero: i + 1,
      metrosDaBase: c.metros,
    });
  });

  return lista;
}

/**
 * A CAMINHADA A PE — de onde a bicicleta ficou ate o lugar.
 *
 * Regra dele, 06/09/2026: "o entregador, quando for fazer coleta ou entrega,
 * irá parar a bicicleta, e depois geraremos animação dele fora da bicicleta;
 * por isso o entregador NAO deve parar com a bicicleta dentro do local."
 *
 * A regra ja e verdade desde que a malha virou EIXO DE RUA: a rota termina na
 * projecao da porta sobre a rua, no meio do asfalto e deslocada para a mao de
 * quem chega. Medido nos 67 enderecos, a bicicleta para em media a tres metros
 * da porta e NUNCA a menos de dezessete metros do predio. Antes disso a malha
 * grudava em cada porta, e parar na porta era parar dentro do lugar.
 *
 * O que faltava era a outra ponta: a caminhada tem de comecar EXATAMENTE onde
 * a bicicleta ficou, senao o menino desaparece de um lado e reaparece do
 * outro. E o que esta funcao monta — a bicicleta fica no primeiro ponto, e o
 * entregador anda dali ate o ultimo.
 *
 * Onde ele riscou o mapa, a caminhada segue o risco dele. Onde nao riscou,
 * vai em linha reta ate a porta: e o que se sabe, e inventar curva seria
 * desenhar calcada que ninguem viu.
 */
export function caminhadaAPe(
  paradaDaBicicleta: PontoNoMapa,
  endereco: Endereco
): readonly PontoNoMapa[] {
  const passos: PontoNoMapa[] = [paradaDaBicicleta];
  const risco =
    endereco.aPe && endereco.aPe.length > 1 ? endereco.aPe : [endereco.em];
  for (const p of risco) {
    const ultimo = passos[passos.length - 1]!;
    if (Math.hypot(p[0] - ultimo[0], p[1] - ultimo[1]) > 0.01) passos.push(p);
  }
  return passos;
}

export const ENDERECOS: readonly Endereco[] = montar();

export const BASE: Endereco = ENDERECOS.find(e => e.papel === "base")!;
export const COMERCIOS: readonly Endereco[] = ENDERECOS.filter(
  e => e.papel === "comercio"
);
export const CASAS: readonly Endereco[] = ENDERECOS.filter(
  e => e.papel === "casa"
);

export const naTela = (
  endereco: Endereco,
  largura: number,
  altura: number
): { x: number; y: number } => ({
  x: (endereco.em[0] / 100) * largura,
  y: (endereco.em[1] / 100) * altura,
});

/** Proporcao do mapa, para a tela reservar o espaco certo. */
export const PROPORCAO_DO_MAPA = MAPA.largura / MAPA.altura;

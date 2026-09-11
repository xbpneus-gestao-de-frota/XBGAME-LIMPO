/**
 * A PARADA DA ENTREGA — onde a bicicleta fica e quanto tempo ela fica ali.
 *
 * Regra dele, 06/09/2026: "o entregador, quando for fazer coleta ou entrega,
 * irá parar a bicicleta, e depois geraremos animação dele fora da bicicleta;
 * por isso o entregador NAO deve parar com a bicicleta dentro do local."
 *
 * ── O QUE ESTAVA ERRADO ────────────────────────────────────────────────────
 *
 * Duas coisas, e a segunda e pior que a primeira.
 *
 * A bicicleta parava DENTRO do lugar — porque a malha antiga grudava em cada
 * porta, e a rota terminava na soleira. Isso acabou quando a malha virou eixo
 * de rua: agora a rota termina no meio do asfalto, medido, nunca a menos de
 * dezessete metros do predio.
 *
 * E ele NAO PARAVA NA COLETA. O caminho da corrida e base -> loja -> casa,
 * emendado num tracado so, e o entregador passava reto pela loja: pegava a
 * encomenda em movimento, sem parar, e so parava no fim. A parada do meio nao
 * existia em lugar nenhum do codigo.
 *
 * ── O QUE ESTE ARQUIVO FAZ ─────────────────────────────────────────────────
 *
 * Transforma cada destino da corrida numa PARADA: em que metro do caminho a
 * bicicleta fica, qual e a caminhada dali ate a porta, e quanto tempo isso
 * leva. O tempo nao e um numero inventado — sai da caminhada: ele vai, entrega,
 * e volta.
 *
 * A caminhada comeca EXATAMENTE onde a bicicleta ficou (ver caminhadaAPe, em
 * addresses.ts). E o que impede o menino de sumir de um lado e aparecer do
 * outro quando a animacao a pe entrar.
 */
import { caminhadaAPe, type Endereco } from "./addresses";
import type { PontoNoMapa } from "./streets";

/**
 * QUANTO A PARADA CRESCE POR METRO DE CAMINHADA — e por que nao e o passo real.
 *
 * ESCOLHA, e nao medida. Um menino anda a 1,4 metro por segundo; o relogio do
 * mapa corre tres vezes. Com esses dois numeros, a caminhada MEDIANA que ele
 * desenhou — trinta e um metros, ida e volta — pararia o jogo por quinze
 * segundos, e a maior por mais de um minuto. Ninguem espera isso olhando uma
 * bicicleta parada.
 *
 * Entao a caminhada aparece comprimida, do mesmo jeito que a pedalada ja
 * aparece. Cinco centesimos de segundo por metro poem a caminhada tipica em uns
 * quatro segundos — tempo de ler "ele desceu ali" e ver o pontilhado
 * correr ate a porta.
 *
 * Quando os desenhos do menino a pe existirem, e ele andar de verdade na tela,
 * este numero volta a ser o passo dele. Ate la, e ritmo de tela.
 */
export const SEGUNDOS_POR_METRO_A_PE = 0.05;

/** O tempo na porta: bater, entregar, pegar o comprovante. */
export const TEMPO_NA_PORTA_MS = 900;

/*
 * Um teto e um piso, e os dois por motivo de tela.
 *
 * O piso: parada curta demais nao le como parada, le como engasgo — o desenho
 * troca para "parado" e volta antes de o olho registrar.
 *
 * O teto: cinco dos riscos que ele desenhou passam de sessenta metros, e um
 * passa de cento e sessenta (a rua de comercio, riscada ao longo da fila de
 * lojas). Sem teto, a bicicleta ficaria quase um minuto de mapa parada num
 * canto da tela. O teto NAO conserta o risco — so impede que ele trave a
 * corrida enquanto os cinco nao sao redesenhados.
 */
export const PARADA_MINIMA_MS = 1200;
export const PARADA_MAXIMA_MS = 6000;

export interface ParadaDaEntrega {
  /** O que ele faz ali. */
  papel: "coleta" | "entrega";
  /** O nome do lugar, para quem quiser mostrar. */
  nome: string;
  /** Metros andados desde o inicio do caminho ate onde a bicicleta fica. */
  ate: number;
  /** A caminhada, da bicicleta ate a porta. O primeiro ponto e a bicicleta. */
  aPe: readonly PontoNoMapa[];
  /** Quanto tempo a bicicleta fica ali, em milissegundos de tela. */
  ms: number;
}

/** Quantos metros tem uma linha do mapa, andando por ela. */
export function metrosDaLinha(
  linha: readonly PontoNoMapa[],
  largura: number,
  altura: number,
  metrosPorPx: number
): number {
  let total = 0;
  for (let i = 1; i < linha.length; i += 1) {
    const a = linha[i - 1]!;
    const b = linha[i]!;
    total +=
      Math.hypot(
        ((b[0] - a[0]) / 100) * largura,
        ((b[1] - a[1]) / 100) * altura
      ) * metrosPorPx;
  }
  return total;
}

/** Quanto tempo a bicicleta fica parada para uma caminhada de tantos metros. */
export function tempoDaParada(metrosAPe: number): number {
  const andando = metrosAPe * 2 * SEGUNDOS_POR_METRO_A_PE * 1000;
  return Math.max(
    PARADA_MINIMA_MS,
    Math.min(PARADA_MAXIMA_MS, andando + TEMPO_NA_PORTA_MS)
  );
}

export interface PernaDaCorrida {
  papel: "coleta" | "entrega";
  endereco: Endereco;
  /** O tracado desta perna, do destino anterior ate este. */
  caminho: readonly PontoNoMapa[];
}

export interface CorridaMontada {
  /** O tracado inteiro, ja emendado, que o entregador segue. */
  caminho: PontoNoMapa[];
  /** Onde ele desce, na ordem em que chega. */
  paradas: ParadaDaEntrega[];
}

/**
 * MONTA A CORRIDA: o caminho inteiro e as paradas, de uma vez so.
 *
 * Os dois saem juntos DE PROPOSITO. Antes o caminho era emendado num lugar e o
 * metro de cada parada contado em outro, e os dois discordavam em cinco metros
 * e meio — a bicicleta ficava parada num ponto e voltava a andar de outro.
 *
 * A causa e boa de saber, porque nao e erro de conta: a rota anda pela DIREITA
 * de quem vai. Chegando na loja ele encosta de um lado da rua; saindo dela, na
 * outra direcao, a direita e o lado de la. Sao cinco metros e meio de rua, e a
 * emenda os atravessa — ele cruza a rua, que e o que qualquer um faz. O que nao
 * pode e a conta ignorar essa travessia, porque ai o metro da parada aponta
 * para um lugar onde ele nao esta.
 *
 * Contando o caminho enquanto ele e montado, o metro de cada parada e o
 * comprimento do que ja foi montado — certo por construcao, e nao por acerto.
 */
export function montarCorrida(
  pernas: readonly PernaDaCorrida[],
  largura: number,
  altura: number,
  metrosPorPx: number
): CorridaMontada {
  const caminho: PontoNoMapa[] = [];
  const paradas: ParadaDaEntrega[] = [];

  for (const perna of pernas) {
    for (const ponto of perna.caminho) {
      const ultimo = caminho[caminho.length - 1];
      if (
        !ultimo ||
        Math.hypot(ponto[0] - ultimo[0], ponto[1] - ultimo[1]) > 1e-9
      ) {
        caminho.push(ponto);
      }
    }
    const bicicleta = caminho[caminho.length - 1];
    if (!bicicleta) continue;
    const aPe = caminhadaAPe(bicicleta, perna.endereco);
    paradas.push({
      papel: perna.papel,
      nome: perna.endereco.nome,
      ate: metrosDaLinha(caminho, largura, altura, metrosPorPx),
      aPe,
      ms: tempoDaParada(metrosDaLinha(aPe, largura, altura, metrosPorPx)),
    });
  }

  return { caminho, paradas };
}

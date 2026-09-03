/**
 * A entrega, desenhada em cima do circuito de verdade.
 *
 * Uma rota e uma fila de paradas na rua: o entregador sai da Base XB, passa
 * por um ou mais comercios para coletar, e depois abre a bolsa em uma ou mais
 * residencias. Nada disto e escolhido no escuro — as distancias vem medidas do
 * proprio arquivo do mapa, entao mudar uma peca de lugar no Unreal muda o
 * percurso sozinho, sem ninguem reescrever numero nenhum.
 *
 * Casas e comercios tem numero, na ordem da rua. E o numero que permite dizer
 * "coleta no comercio 2, entrega nas casas 8, 12 e 34" — e que permite ao jogo
 * montar essa rota sozinho quando a bolsa cresce.
 *
 * A CONTA E POR DISTANCIA, NAO POR TEMPO. Um entregador de bicicleta ganha por
 * corrida rodada, nao por minuto no relogio: pagar por tempo premiaria quem
 * demora. Aqui o ganho sai dos metros percorridos mais um fixo por porta
 * aberta, e as duas coisas ficam num lugar so, com nome, para poderem ser
 * ajustadas sem cacar numero solto pelo codigo.
 *
 * O modulo e puro de proposito — sem cena, sem Babylon. Assim a regra da
 * entrega pode ser conferida em teste, que e onde ela tem de reprovar.
 */
import type { LugarNaVolta } from "./CircuitTrack";

/**
 * Espaco minimo entre a base e a primeira coleta, e entre uma parada e a
 * seguinte. Abaixo disto o jogador nem termina de sair de um ponto e ja chegou
 * no outro: nao da tempo de nada acontecer.
 */
export const MINIMO_ENTRE_PARADAS = 45;
/**
 * Espaco minimo entre a ultima coleta e a primeira entrega. Maior do que o
 * espaco comum: e o trecho em que a corrida de fato acontece, com a bolsa
 * cheia.
 */
export const MINIMO_ATE_A_ENTREGA = 60;
/**
 * Teto do trecho ate a primeira entrega. Sem ele o sorteio as vezes escolhia
 * uma casa quase uma volta inteira depois, e a corrida virava passeio. As
 * portas seguintes nao usam este teto: elas se espalham pela volta.
 */
export const MAXIMO_ATE_A_ENTREGA = 420;
/**
 * Teto de portas numa corrida so. A bolsa pode crescer mais do que isto; o
 * excedente vira a corrida seguinte. Uma volta de 800 m com mais de seis
 * paradas deixa de ser corrida e vira lista de tarefas.
 */
export const MAXIMO_DE_ENTREGAS = 6;
/**
 * Teto de coletas numa corrida so. Passar por tres comercios antes de abrir a
 * bolsa transforma a ida num recado longo demais.
 */
export const MAXIMO_DE_COLETAS = 2;

/** Peso de um pacote, em quilos. E o que traduz bolsa em numero de portas. */
export const PESO_DO_PACOTE_KG = 3;

/**
 * Quantos pacotes cabem na bolsa. Uma mochila pequena leva um; o micro-reboque
 * leva varios. O jogo ja sabe quantos quilos a bolsa aguenta — aqui so se
 * traduz peso em portas.
 */
export function pacotesNaBolsa(capacidadeKg: number): number {
  if (!Number.isFinite(capacidadeKg) || capacidadeKg <= 0) return 1;
  const cabem = 1 + Math.floor(capacidadeKg / PESO_DO_PACOTE_KG);
  return Math.max(1, Math.min(MAXIMO_DE_ENTREGAS, cabem));
}

export type TipoDeParada = "coleta" | "entrega";

export interface Parada {
  lugar: LugarNaVolta;
  tipo: TipoDeParada;
  /** Distancia desde a base ate aqui, andando no sentido da volta. */
  distancia: number;
  /** Quantos pacotes ficam na bolsa DEPOIS desta parada. */
  naBolsa: number;
}

export interface Rota {
  origem: LugarNaVolta;
  /** A fila de paradas, na ordem da rua. Coletas primeiro, depois as portas. */
  paradas: Parada[];
  /** Da base ate a ultima parada, em unidades do jogo. */
  distancia: number;
  coletas: number;
  entregas: number;
}

/** Quanto falta andar de `de` ate `para`, sempre para a frente na volta. */
export function distanciaAdiante(
  de: number,
  para: number,
  comprimento: number
): number {
  if (comprimento <= 0) return 0;
  let d = (para - de) % comprimento;
  if (d < 0) d += comprimento;
  return d;
}

const escolher = <T>(lista: readonly T[], sorteio: () => number): T =>
  lista[Math.floor(sorteio() * lista.length) % lista.length]!;

/**
 * Monta uma entrega. `sorteio` devolve de 0 a 1 e vem de fora para o teste
 * poder fixar o resultado — sorteio dentro da funcao e regra que ninguem
 * consegue conferir.
 *
 * `capacidade` e quantas portas a bolsa aguenta hoje:
 *   1  → uma coleta e uma porta, o comeco do jogo;
 *   2+ → duas portas, e as vezes duas coletas antes delas.
 *
 * Pedir mais portas do que o bairro comporta nao e erro: a rota sai com as que
 * couberam. Melhor uma corrida menor do que uma corrida impossivel.
 */
export function montarRota(
  lugares: readonly LugarNaVolta[],
  comprimento: number,
  sorteio: () => number,
  capacidade = 1
): Rota | null {
  const origem = lugares.find(lugar => lugar.papel === "base");
  const comercios = lugares.filter(lugar => lugar.papel === "comercio");
  const casas = lugares.filter(lugar => lugar.papel === "casa");
  if (!origem || comercios.length === 0 || casas.length === 0) return null;

  const portas = Math.max(
    1,
    Math.min(MAXIMO_DE_ENTREGAS, Math.floor(capacidade))
  );

  /*
   * Quantos comercios visitar antes de abrir a bolsa. Com bolsa de uma porta
   * so ha um jeito de fazer. Com bolsa maior o jogo sorteia entre uma e duas
   * coletas — e dai vem a variedade que o Fernando pediu: as vezes "coleta e
   * duas entregas", as vezes "duas coletas e duas entregas".
   */
  const coletas =
    portas === 1
      ? 1
      : Math.min(
          MAXIMO_DE_COLETAS,
          comercios.length,
          portas,
          1 + Math.floor(sorteio() * MAXIMO_DE_COLETAS)
        );

  const distDaOrigem = (lugar: LugarNaVolta) =>
    distanciaAdiante(origem.distancia, lugar.distancia, comprimento);

  const paradas: Parada[] = [];
  let cursor = 0;
  let naBolsa = 0;

  /*
   * Divide os pacotes entre as coletas: com tres portas e duas coletas, sai
   * duas na primeira e uma na segunda. Ninguem passa num comercio para nao
   * pegar nada.
   */
  const lotes = Array.from(
    { length: coletas },
    (_, i) => Math.floor(portas / coletas) + (i < portas % coletas ? 1 : 0)
  );

  for (let i = 0; i < coletas; i += 1) {
    const candidatos = comercios.filter(loja => {
      if (paradas.some(parada => parada.lugar === loja)) return false;
      return distDaOrigem(loja) >= cursor + MINIMO_ENTRE_PARADAS;
    });
    if (candidatos.length === 0) break;
    const loja = escolher(candidatos, sorteio);
    const distancia = distDaOrigem(loja);
    naBolsa += lotes[i]!;
    paradas.push({ lugar: loja, tipo: "coleta", distancia, naBolsa });
    cursor = distancia;
  }

  // Sem nenhuma coleta nao ha o que entregar: a rota nao existe.
  if (paradas.length === 0) return null;
  // Se um comercio faltou, a bolsa carrega menos portas do que o planejado.
  const aEntregar = naBolsa;

  for (let i = 0; i < aEntregar; i += 1) {
    const minimo = i === 0 ? MINIMO_ATE_A_ENTREGA : MINIMO_ENTRE_PARADAS;
    const candidatas = casas.filter(casa => {
      if (paradas.some(parada => parada.lugar === casa)) return false;
      const d = distDaOrigem(casa);
      if (d < cursor + minimo) return false;
      // O teto vale so para a primeira porta; as outras se espalham.
      if (i === 0 && d > cursor + MAXIMO_ATE_A_ENTREGA) return false;
      return d < comprimento;
    });
    if (candidatas.length === 0) break;
    const casa = escolher(candidatas, sorteio);
    const distancia = distDaOrigem(casa);
    naBolsa -= 1;
    paradas.push({ lugar: casa, tipo: "entrega", distancia, naBolsa });
    cursor = distancia;
  }

  const entregas = paradas.filter(parada => parada.tipo === "entrega").length;
  // Coletar sem ter onde entregar nao e corrida: e passeio ate a loja.
  if (entregas === 0) return null;

  /*
   * Acerta a bolsa pelo que REALMENTE coube na rua.
   *
   * O plano decide quantos pacotes pegar antes de saber quantas portas cabem
   * no bairro; quando falta casa, sobrava pacote dentro da bolsa no fim da
   * corrida — o entregador voltava para casa com encomenda de outra pessoa.
   * Aqui as coletas sao redistribuidas sobre as portas que existem de fato, e
   * as que ficariam com pacote nenhum saem da rota: comercio sem motivo e
   * parada sem motivo.
   */
  const coletasUteis = paradas
    .filter(parada => parada.tipo === "coleta")
    .slice(0, Math.min(coletas, entregas));
  const finais = paradas.filter(
    parada => parada.tipo === "entrega" || coletasUteis.includes(parada)
  );
  let carregando = 0;
  let jaColetadas = 0;
  finais.forEach(parada => {
    if (parada.tipo === "coleta") {
      const lote =
        Math.floor(entregas / coletasUteis.length) +
        (jaColetadas < entregas % coletasUteis.length ? 1 : 0);
      jaColetadas += 1;
      carregando += lote;
    } else {
      carregando -= 1;
    }
    parada.naBolsa = carregando;
  });
  paradas.length = 0;
  paradas.push(...finais);

  return {
    origem,
    paradas,
    distancia: paradas[paradas.length - 1]!.distancia,
    coletas: paradas.length - entregas,
    entregas,
  };
}

/**
 * A tabela do ganho. Os dois numeros ficam juntos e com nome porque sao o
 * botao de ajuste da economia inteira: mexer aqui muda quanto vale cada
 * corrida, sem precisar procurar conta espalhada.
 *
 * As unidades sao as do jogo (2,3 por metro do mapa). Com os valores de
 * fabrica, a corrida de uma porta rende perto de dez — o mesmo patamar da
 * primeira entrega escrita a mao, para a economia antiga e a nova se
 * encontrarem no mesmo lugar.
 */
export interface TarifaDaEntrega {
  /** Fixo por porta aberta. Paga o trabalho de parar, entregar e seguir. */
  porEntrega: number;
  /** Por unidade de distancia percorrida. Paga a perna. */
  porUnidade: number;
}

export const TARIFA_PADRAO: TarifaDaEntrega = {
  porEntrega: 4,
  /*
   * Calibrado na geometria deste bairro: a corrida tipica de uma porta roda
   * perto de 1.200 unidades, entao 0,005 por unidade fecha a conta em dez —
   * o mesmo valor da primeira entrega escrita a mao. Trocar o mapa muda a
   * distancia tipica, e este numero pede recalibragem.
   */
  porUnidade: 0.005,
};

/**
 * Quanto a rota paga. Distancia rodada mais o fixo de cada porta — nunca
 * tempo: pagar por tempo premiaria quem demora, e o jogo inteiro pede o
 * contrario.
 */
export function ganhoDaRota(
  rota: Rota,
  tarifa: TarifaDaEntrega = TARIFA_PADRAO
): number {
  const porPortas = rota.entregas * tarifa.porEntrega;
  const porPerna = rota.distancia * tarifa.porUnidade;
  return Math.round(porPortas + porPerna);
}

/** Em qual etapa o jogador esta, dado quanto ja andou desde a base. */
export type EtapaDaEntrega = "indo-coletar" | "indo-entregar" | "entregue";

export function etapaEm(rota: Rota, andado: number): EtapaDaEntrega {
  const ultimaColeta = [...rota.paradas]
    .reverse()
    .find(parada => parada.tipo === "coleta");
  if (ultimaColeta && andado < ultimaColeta.distancia) return "indo-coletar";
  if (andado < rota.distancia) return "indo-entregar";
  return "entregue";
}

/**
 * Folga de chegada, em unidades do jogo — quatro milimetros no mundo. Existe
 * por causa da conta em virgula flutuante: somar e subtrair a mesma distancia
 * nao devolve exatamente o mesmo numero, e sem esta folga uma entrega
 * exatamente na porta as vezes nao contava. Erro que so aparece de vez em
 * quando e o pior tipo de erro.
 */
const FOLGA_DE_CHEGADA = 0.01;

/** Quantas portas ja foram atendidas. */
export function entreguesAte(rota: Rota, andado: number): number {
  return rota.paradas.filter(
    parada =>
      parada.tipo === "entrega" && andado >= parada.distancia - FOLGA_DE_CHEGADA
  ).length;
}

/** Quantas coletas ja foram feitas. */
export function coletadasAte(rota: Rota, andado: number): number {
  return rota.paradas.filter(
    parada =>
      parada.tipo === "coleta" && andado >= parada.distancia - FOLGA_DE_CHEGADA
  ).length;
}

/** A proxima parada, ou nada quando a rota acabou. */
export function proximaParada(rota: Rota, andado: number): Parada | null {
  return (
    rota.paradas.find(parada => andado < parada.distancia - FOLGA_DE_CHEGADA) ??
    null
  );
}

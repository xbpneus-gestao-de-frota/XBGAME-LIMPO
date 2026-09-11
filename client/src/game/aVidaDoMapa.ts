/**
 * OS QUINZE PONTOS QUE GANHAM VIDA NO MAPA.
 *
 * O plano inteiro esta em NOTAS DE TRABALHO/planos e especificacoes/
 * VIDA_NO_MAPA.md, e a regra que resolve o conflito entre "quero o mapa vivo" e
 * "so o ponto da vez se mexe" e a divisao em tres camadas:
 *
 *   RESPIRA   lenta, continua, sem contorno proprio. O olho registra que o
 *             lugar esta vivo e nao olha para la.
 *   ENCANTA   rara e sorteada, UM LUGAR POR VEZ. E o que faz dizer "que
 *             bonitinho" sem saber o que se viu.
 *   E JOGO    so se mexe quando existe servico ali.
 *
 * Se a primeira e lenta e a segunda e rara, a corrida continua sendo a unica
 * coisa que grita. A beleza vem do contraste, e nao da quantidade.
 *
 * ── DE ONDE VEM CADA POSICAO ──────────────────────────────────────────────
 *
 * Nao foram estimadas no olho. Ele marcou os quinze pontos com bolinhas
 * numeradas por cima do desenho, e as posicoes foram LIDAS dessa imagem: acha-se
 * cada bolinha pela cor, tira-se o centro dela e converte-se para porcentagem do
 * mapa. A area do desenho naquela imagem bate exatamente com a do mapa do jogo,
 * entao a conversao e direta.
 */

export type Camada = "respira" | "encanta" | "e-jogo";

/** O que acontece no ponto. Quem nao tem efeito ainda esta esperando desenho. */
export type Efeito =
  | "agua"
  | "petalas"
  | "fumaca"
  | "passaro"
  | "acende"
  | null;

export interface PontoDeVida {
  numero: number;
  camada: Camada;
  /** Em porcentagem do mapa, como todo ponto deste jogo. */
  x: number;
  y: number;
  nome: string;
  efeito: Efeito;
  /** Por que ainda nao se mexe, quando for o caso. */
  espera?: string;
}

export const PONTOS: readonly PontoDeVida[] = [
  { numero: 1, camada: "respira", x: 10.4, y: 12.0, nome: "Mata e copas",
    efeito: null,
    espera: "a luz do dia e a sombra de nuvem ja fazem a mata respirar" },
  { numero: 2, camada: "respira", x: 46.3, y: 41.0, nome: "Fonte da praca",
    efeito: "agua" },
  { numero: 3, camada: "respira", x: 55.2, y: 43.3, nome: "Arvores floridas",
    efeito: "petalas" },
  { numero: 4, camada: "respira", x: 61.9, y: 57.3, nome: "Ilha de pedra e mato",
    efeito: null,
    espera: "capim balancando precisa mexer o desenho, e o desenho e parado" },
  { numero: 5, camada: "respira", x: 31.8, y: 23.1, nome: "Encosta de pedra",
    efeito: null, espera: "a sombra de nuvem ja passa por cima dela" },
  { numero: 6, camada: "encanta", x: 63.7, y: 40.9, nome: "Chamine do centro",
    efeito: "fumaca" },
  { numero: 7, camada: "encanta", x: 14.4, y: 85.3, nome: "Chamine do sul",
    efeito: "fumaca" },
  { numero: 8, camada: "encanta", x: 22.1, y: 88.4, nome: "Fio de energia",
    efeito: "passaro" },
  { numero: 9, camada: "encanta", x: 43.4, y: 56.4, nome: "Coreto",
    efeito: "acende" },
  { numero: 10, camada: "encanta", x: 71.8, y: 35.5, nome: "Parquinho",
    efeito: null,
    espera: "balanco e carrossel girando precisam ser desenhados a parte" },
  { numero: 11, camada: "e-jogo", x: 34.1, y: 49.2, nome: "Loja de esquina",
    efeito: null, espera: "toldo balancando e porta abrindo precisam de desenho" },
  { numero: 12, camada: "e-jogo", x: 60.8, y: 12.9, nome: "Rua do comercio",
    efeito: "acende" },
  { numero: 13, camada: "e-jogo", x: 66.3, y: 21.7, nome: "Estacionamento",
    efeito: null,
    espera: "os carros ficam PARADOS de proposito — transito rouba a leitura das ruas" },
  { numero: 14, camada: "e-jogo", x: 86.6, y: 12.9, nome: "Patio de carga",
    efeito: null,
    espera: "porta de aco, empilhadeira e faisca de solda precisam de desenho" },
  { numero: 15, camada: "e-jogo", x: 88.7, y: 88.0, nome: "Galpao sul",
    efeito: null, espera: "van saindo e pilha de caixas precisam de desenho" },
];

/**
 * OS PONTOS QUE ENTRAM NO SORTEIO DA CAMADA QUE ENCANTA.
 *
 * As luzes que acendem ao entardecer NAO entram: elas nao sao sorteadas, elas
 * dependem da hora. Sorteio e para o que aparece "do nada" — a chamine e o
 * passarinho.
 */
export const SORTEAVEIS: readonly PontoDeVida[] = PONTOS.filter(
  p => p.efeito === "fumaca" || p.efeito === "passaro"
);

/** Os que acendem quando entardece. */
export const QUE_ACENDEM: readonly PontoDeVida[] = PONTOS.filter(
  p => p.efeito === "acende"
);

/** Os que se mexem sozinhos o tempo todo, sem sorteio e sem hora. */
export const QUE_RESPIRAM: readonly PontoDeVida[] = PONTOS.filter(
  p => p.efeito === "agua" || p.efeito === "petalas"
);

/**
 * QUANTO TEMPO UM ENCANTO FICA NA TELA, e quanto tempo o mapa fica quieto
 * entre um e outro.
 *
 * Um por vez, e com bastante silencio no meio. Fumaca saindo de duas chamines
 * ao mesmo tempo nao e encanto, e enfeite; e encanto que acontece a cada tres
 * segundos vira ruido de fundo em dois minutos de jogo.
 */
export const ENCANTO_DURA_MS = 7000;
export const ENCANTO_ESPERA_MINIMA_MS = 9000;
export const ENCANTO_ESPERA_MAXIMA_MS = 20000;

/** Quanto esperar ate o proximo encanto, sorteado dentro da faixa. */
export function esperaDoProximo(sorteio = Math.random()): number {
  const faixa = ENCANTO_ESPERA_MAXIMA_MS - ENCANTO_ESPERA_MINIMA_MS;
  return ENCANTO_ESPERA_MINIMA_MS + sorteio * faixa;
}

/**
 * Qual ponto encanta agora — nunca o mesmo duas vezes seguidas.
 *
 * Sao poucos pontos sorteaveis; sem esta regra, o acaso repete o mesmo lugar
 * com frequencia alta o bastante para a pessoa perceber que ha um sorteio, e
 * perceber o sorteio e perder o encanto.
 */
export function proximoEncanto(
  anterior: number | null,
  sorteio = Math.random()
): PontoDeVida {
  const outros = SORTEAVEIS.filter(p => p.numero !== anterior);
  const lista = outros.length > 0 ? outros : SORTEAVEIS;
  return lista[Math.min(lista.length - 1, Math.floor(sorteio * lista.length))]!;
}

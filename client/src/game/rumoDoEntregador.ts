/**
 * PARA QUE LADO O ENTREGADOR ESTA INDO — e quando o desenho pode trocar.
 *
 * ── O DEFEITO QUE ESTE ARQUIVO CONSERTA ───────────────────────────────────
 *
 * O Fernando viu jogando: "temos muito lag, e mudanca de tela para jogador,
 * mudancas em milesimos de segundos sendo a mesma direcao".
 *
 * A causa nao era desenho nem maquina. O caminho que o entregador segue e o
 * tracado real das ruas, ponto a ponto, e esse tracado tem trechos curtissimos
 * — o menor do bairro tem 24 centimetros. A 10,8 m/s isso dura 22
 * milissegundos. O rumo era lido do trecho de baixo do pe, entao bastava o
 * tracado dar um tremido de meio grau perto da divisa de duas fatias para o
 * desenho ir e voltar de um quadro para o outro.
 *
 * Medido em 207 rotas por todo o bairro, 147 km simulados a 60 quadros por
 * segundo, com a regra antiga: 6.757 trocas de desenho, quarenta por cento
 * delas indo e voltando para o mesmo lugar, e a mais rapida delas em UM
 * QUADRO — 17 milissegundos.
 *
 * ── OS TRES REMEDIOS, E POR QUE TRES ──────────────────────────────────────
 *
 * OLHAR ADIANTE. O rumo deixa de ser o do trecho de baixo do pe e passa a ser
 * o da corda entre um pouco atras e um bom pedaco adiante. Tremido de tracado
 * some; curva de verdade continua aparecendo.
 *
 * FOLGA NA DIVISA. Trocar so quando o rumo passa da divisa da fatia MAIS uma
 * folga. Sem ela, andar exatamente em cima da divisa faz o desenho piscar
 * entre os dois vizinhos para sempre.
 *
 * ESPERA MINIMA. Duas trocas nunca colam: entre uma e outra ha um tempo minimo.
 * E o que garante, por construcao, que o defeito que ele viu nao volta — nao
 * depende de o tracado ser bem comportado.
 *
 * Com os tres, nas mesmas 207 rotas: 3.401 trocas em vez de 6.757, e a mais
 * rapida passa de 17 para 250 milissegundos. O preco e o desenho apontar em
 * media 3,7 graus mais torto — invisivel no tamanho em que ele aparece.
 *
 * ── E SE VIEREM MAIS DESENHOS? ────────────────────────────────────────────
 *
 * Mais desenhos NAO diminuem as trocas: aumentam. Com vinte e quatro fatias em
 * vez de oito, sao 9.969 trocas em vez de 3.401, porque ha tres vezes mais
 * divisas para cruzar. O que eles diminuem e o TAMANHO de cada troca — o
 * vai-e-vem cai de 40% para 23% e o desenho aponta mais certo. Ou seja: mais
 * desenhos deixam a troca mais macia, e sao estes tres numeros aqui que
 * impedem a troca de acontecer rapido demais. Sao remedios para doencas
 * diferentes, e um nao substitui o outro.
 */

import { MAPA, METROS_POR_PIXEL } from "./streets";
import type { PontoNoMapa } from "./streets";

import moldesDoArquivo from "./data/moldes-entregador.json";
import moldesDaLorena from "./data/moldes-lorena.json";

/**
 * OS MOLDES — um desenho por posicao do relogio, em ordem de angulo.
 *
 * Ate 06/09/2026 esta lista tinha OITO nomes de bussola escritos a mao, e as
 * fatias eram quarenta e cinco graus fixos. Duas coisas quebravam com isso:
 * acrescentar um desenho exigia mexer no codigo, e um desenho fora da grade
 * nao tinha onde entrar.
 *
 * Agora a lista SAI DA PASTA. Cada folha em assets-source/entregador se chama
 * pela hora que serve — folha_04h30.png — e o script escreve este arquivo com
 * o angulo de cada uma e os dois pontos onde as rodas encostam. Acrescentar um
 * desenho e largar o arquivo e rodar o script; o codigo nao muda.
 *
 * E o jogo deixou de trabalhar com FATIAS IGUAIS: ele escolhe o molde mais
 * perto do rumo. Com dezessete desenhos espacados de um jeito e nao de outro,
 * "o mais perto" e sempre a melhor resposta possivel, e nao ha grade para
 * respeitar.
 *
 * Medido nas 67 rotas do bairro: com oito na grade o desenho errava 12,0° na
 * media e passava de 25° em meio por cento do tempo; com estes dezessete erra
 * 5,1° e NUNCA passa de 25°.
 */
export interface Molde {
  /** O nome da posicao, que e tambem o nome do arquivo: "04h30". */
  nome: string;
  /** Para onde a bicicleta aponta na tela, em graus. 0 e para a direita. */
  graus: number;
  geometria: GeometriaDoRumo;
  /**
   * So uma roda aparece no desenho — a outra fica atras do menino (de frente e
   * de costas quase puras). As duas pegadas ficam no mesmo ponto.
   */
  umaRoda?: boolean;
  /**
   * De que lado o menino aparece: "costas" (a mochila XB virada para a camera)
   * ou "frente" (o rosto virado para a camera). Sai do nome da folha.
   */
  lado?: LadoDoMenino;
}

/** As duas metades das folhas: de costas para a camera, ou de frente. */
export type LadoDoMenino = "costas" | "frente";

/** Uma linha da lista que o script das folhas escreve. */
interface MoldeDoArquivo {
  nome: string;
  graus: number;
  frenteX: number;
  frenteY: number;
  trasX: number;
  trasY: number;
  umaRoda?: boolean;
  folha?: string;
}

const lerMoldes = (lista: ReadonlyArray<MoldeDoArquivo>): Molde[] =>
  lista.map(m => ({
  nome: m.nome,
  graus: m.graus,
  geometria: {
    frenteX: m.frenteX,
    frenteY: m.frenteY,
    trasX: m.trasX,
    trasY: m.trasY,
  },
  umaRoda: m.umaRoda === true,
  lado: m.folha?.startsWith("costas")
    ? "costas"
    : m.folha?.startsWith("frente")
      ? "frente"
      : undefined,
}));

/** Os moldes do Renan — os de sempre. */
export const MOLDES: readonly Molde[] = lerMoldes(moldesDoArquivo.moldes);

/** Os nomes, na mesma ordem — e o que vira nome de arquivo do desenho. */
export const RUMOS: readonly string[] = MOLDES.map(m => m.nome);

export type Rumo = string;

/*
 * ── CADA ENTREGADOR TEM O SEU JOGO DE MOLDES (11/09/2026) ─────────────────
 *
 * Ordem dele: "esta sera nossa segunda integrante da equipe Lorena" e "devemos
 * ter os dois na tela coletando e entregando". A Lorena chegou com as mesmas
 * cinco folhas do Renan, mas o gerador desenha cada folha do seu jeito: ela tem
 * 25 rumos e ele 26, em angulos um pouco diferentes. Emprestar a lista de um
 * para o outro seria o remendo que ja deu errado aqui (ver O ESPELHO E O
 * EMPRESTIMO, mais abaixo): o desenho apontaria para um lado e a rua para outro.
 *
 * Entao a lista vira um CONJUNTO por pessoa, e toda conta de rumo recebe o
 * conjunto de quem esta pedalando. Quem nao passa conjunto nenhum recebe o do
 * Renan — tudo o que existia continua igual.
 */
export interface ConjuntoDeMoldes {
  moldes: readonly Molde[];
  /** Os nomes na ordem dos moldes — o fim do nome de cada arquivo. */
  rumos: readonly string[];
  geometria: Readonly<Record<Rumo, GeometriaDoRumo>>;
  /** Os moldes em volta do relogio, do menor angulo ao maior. */
  noRelogio: readonly number[];
  /** Para cada molde, a sua posicao no relogio. */
  posicaoNoRelogio: readonly number[];
}

export function montarConjunto(moldes: readonly Molde[]): ConjuntoDeMoldes {
  const noRelogio = moldes
    .map((_, i) => i)
    .sort((a, b) => moldes[a]!.graus - moldes[b]!.graus);
  const posicaoNoRelogio: number[] = [];
  noRelogio.forEach((fatia, pos) => {
    posicaoNoRelogio[fatia] = pos;
  });
  return {
    moldes,
    rumos: moldes.map(m => m.nome),
    geometria: Object.fromEntries(moldes.map(m => [m.nome, m.geometria])),
    noRelogio,
    posicaoNoRelogio,
  };
}

/** Os moldes do Renan, em conjunto. E o padrao de toda conta de rumo. */
export const DO_RENAN: ConjuntoDeMoldes = montarConjunto(MOLDES);

/** Os moldes da Lorena — as cinco folhas dela, de 11/09/2026. */
export const DA_LORENA: ConjuntoDeMoldes = montarConjunto(
  lerMoldes(moldesDaLorena.moldes)
);

/*
 * ── OS TRES NUMEROS AFROUXARAM EM 06/09/2026, E POR UM BOM MOTIVO ─────────
 *
 * Eles nasceram grandes — 12 m de olhada, 10 graus de folga, 250 ms de espera —
 * porque o CAMINHO era um garrancho: cheio de bicos, e cada bico virava piscada.
 * Freio grande escondia a piscada, mas atrasava a virada de verdade: ele
 * chegava na esquina, virava, e o desenho so acompanhava um pedaco depois. E o
 * "andar de lado" que o Fernando viu.
 *
 * Com o caminho alisado na origem (ver alisar(), em rotas.ts), o freio pode ser
 * menor. Medido nas 207 rotas do bairro: com 6 / 6 / 150 sao 0,27 trocas por
 * segundo em vez de 0,20, e o desenho aponta 1,4 grau mais certo — ou seja,
 * quase a mesma calma, e a virada chega na hora.
 *
 * A ordem importa: alisar o caminho PRIMEIRO, afrouxar o freio DEPOIS. Ao
 * contrario, volta a piscar.
 */

/** Quanto se olha adiante para achar o rumo, em metros de mapa. */
export const OLHADA_METROS = 6;

/** Quanto o rumo precisa passar da divisa antes de a troca valer, em graus. */
export const FOLGA_GRAUS = 6;

/** Tempo minimo entre duas trocas de desenho, em milissegundos. */
export const ESPERA_MS = 150;

/**
 * VOLTAR PARA O DESENHO DE ONDE ACABOU DE SAIR ESPERA MAIS.
 *
 * Medido no jogo montado em 10/09/2026: em setenta e cinco segundos de corrida
 * houve dez idas-e-voltas — de um desenho para o vizinho e de volta em menos de
 * seis decimos de segundo. E rua que entorta de leve para um lado e para o
 * outro: cada entortada passa da folga e o desenho segue. Nenhuma das duas
 * trocas esta errada sozinha; as duas juntas sao um pisca.
 *
 * A regra nao atrasa virada nenhuma: seguir em frente (para o proximo desenho
 * da virada) continua valendo depois da espera normal. So VOLTAR e que precisa
 * esperar isto.
 */
export const VOLTA_MINIMA_MS = 450;

/**
 * A TROCA SO VALE SE DURAR — e o olhar adiante cresce com a velocidade.
 *
 * Com o balcao mandando, ele pedala a uns cinquenta metros de mapa por segundo
 * (a bicicleta gasta vinte segundos por quilometro), quatro vezes e meia o
 * passo que estes freios foram afinados. Nessa velocidade os seis metros de
 * olhada sao um decimo de segundo, e cada entortadinha do tracado virava troca
 * de desenho. Medido nas 207 rotas do bairro, a cinquenta metros por segundo:
 *
 *                               trocas/s   idas-e-voltas em 1 s
 *   como estava                   2,07          953
 *   olhada de 0,3 s + confirma    1,17          213
 *
 * CONFIRMAR e exigir que o desenho novo continue sendo o melhor por um
 * instante antes de trocar: entortada de rua dura menos que isso; virada de
 * esquina, nao.
 */
export const CONFIRMA_MS = 100;

/** Quanto se olha adiante nesta velocidade: 0,3 s de pedalada, no minimo 6 m. */
export function olhadaPara(metrosPorSegundo: number): number {
  return Math.min(25, Math.max(OLHADA_METROS, metrosPorSegundo * 0.3));
}

export interface TrocaPendente {
  fatia: number;
  desde: number;
}

/**
 * Decide se a troca proposta por escolherRumo vale agora, ou ainda espera.
 * Devolve a escolha que fica valendo e o que segue pendente.
 */
export function confirmarTroca(
  atual: EscolhaDeRumo,
  proposta: EscolhaDeRumo,
  pendente: TrocaPendente | null,
  agoraMs: number,
  confirma = CONFIRMA_MS
): { escolha: EscolhaDeRumo; pendente: TrocaPendente | null } {
  if (proposta === atual || proposta.fatia === atual.fatia)
    return { escolha: atual, pendente: null };
  const p =
    pendente && pendente.fatia === proposta.fatia
      ? pendente
      : { fatia: proposta.fatia, desde: agoraMs };
  if (agoraMs - p.desde < confirma) return { escolha: atual, pendente: p };
  return { escolha: { ...proposta, trocadoEmMs: agoraMs }, pendente: null };
}

/**
 * O LIMITE DE GUIDAO — quanto o rumo pode girar num segundo.
 *
 * Depois de alisar o caminho, sobrou um tremor em 21 lugares do bairro, e a
 * conta mostrou giros de ate NOVE MIL graus por segundo. Ninguem gira assim: e
 * a conta do rumo dando piao.
 *
 * A causa e a corda. O rumo sai da linha entre um ponto atras e um adiante; numa
 * curva fechada — grampo de rua sem saida, volta na esquina — esses dois pontos
 * chegam quase no mesmo lugar. Corda curta e corda barulhenta: um centimetro de
 * diferenca vira dezenas de graus.
 *
 * Sao duas travas, e as duas juntas:
 *
 * A CORDA CURTA NAO MANDA. Se a corda encolher demais, o rumo passa a sair do
 * passo imediato, que ali e mais confiavel.
 *
 * E O GUIDAO TEM LIMITE. O rumo mostrado persegue o rumo do caminho, mas nunca
 * mais rapido que isto. Um menino de bicicleta a 10,8 m/s vira uma esquina de
 * noventa graus em cerca de um segundo — 220 graus por segundo e rapido e ainda
 * assim humano. E uma trava por construcao: nao depende de o caminho ser bem
 * comportado.
 */
export const GIRO_MAXIMO_POR_SEGUNDO = 220;

export interface Passo {
  em: PontoNoMapa;
  /** Metros andados do inicio do caminho ate aqui. */
  ate: number;
}

/** O caminho com a conta de quanto se andou em cada ponto. Feita uma vez. */
export function montarPassos(caminho: readonly PontoNoMapa[]): Passo[] {
  const saida: Passo[] = [];
  let total = 0;
  for (let i = 0; i < caminho.length; i += 1) {
    if (i > 0) {
      const a = caminho[i - 1]!;
      const b = caminho[i]!;
      const dx = ((b[0] - a[0]) / 100) * MAPA.largura;
      const dy = ((b[1] - a[1]) / 100) * MAPA.altura;
      total += Math.hypot(dx, dy) * METROS_POR_PIXEL;
    }
    saida.push({ em: caminho[i]!, ate: total });
  }
  return saida;
}

/** Onde ele esta depois de andar tantos metros. */
export function pontoEm(
  passos: readonly Passo[],
  metros: number
): PontoNoMapa | null {
  if (passos.length === 0) return null;
  if (passos.length === 1) return passos[0]!.em;
  const total = passos[passos.length - 1]!.ate;
  const d = Math.max(0, Math.min(total, metros));
  let i = 1;
  while (i < passos.length - 1 && passos[i]!.ate < d) i += 1;
  const a = passos[i - 1]!;
  const b = passos[i]!;
  const vao = Math.max(1e-6, b.ate - a.ate);
  const f = Math.max(0, Math.min(1, (d - a.ate) / vao));
  return [
    a.em[0] + (b.em[0] - a.em[0]) * f,
    a.em[1] + (b.em[1] - a.em[1]) * f,
  ];
}

/**
 * O rumo NA TELA, em graus, com o norte para cima.
 *
 * O y da tela cresce para baixo; aqui o norte volta para cima, senao subir a
 * rua mostraria o desenho de quem desce.
 */
export function grausNaTela(dx: number, dy: number): number {
  return (Math.atan2(-dy, dx) * 180) / Math.PI;
}

/**
 * O RUMO SUAVIZADO: a corda de um pouco atras ate um bom pedaco adiante.
 *
 * Olhar so para tras atrasa a curva; olhar so para frente antecipa. A corda
 * pega os dois e e o que faz a curva chegar na hora.
 */
export function rumoSuavizado(
  passos: readonly Passo[],
  andado: number,
  olhada = OLHADA_METROS
): number | null {
  if (passos.length < 2) return null;
  const total = passos[passos.length - 1]!.ate;
  const adiante = pontoEm(passos, Math.min(total, andado + olhada));
  const atras = pontoEm(passos, Math.max(0, andado - olhada / 2));
  if (!adiante || !atras) return null;
  const dx = ((adiante[0] - atras[0]) / 100) * MAPA.largura;
  const dy = ((adiante[1] - atras[1]) / 100) * MAPA.altura;
  const corda = Math.hypot(dx, dy) * METROS_POR_PIXEL;

  /*
   * CORDA CURTA NAO MANDA. Em curva fechada os dois pontos se aproximam e a
   * corda encolhe; abaixo de um terco do que ela deveria medir, ela vira ruido
   * e quem manda passa a ser o passo imediato.
   */
  if (corda >= (olhada * 1.5) / 3) return grausNaTela(dx, dy);

  const perto = pontoEm(passos, Math.min(total, andado + 1.5));
  const aqui = pontoEm(passos, andado);
  if (!perto || !aqui) return null;
  const px = ((perto[0] - aqui[0]) / 100) * MAPA.largura;
  const py = ((perto[1] - aqui[1]) / 100) * MAPA.altura;
  if (Math.hypot(px, py) < 1e-9) return null;
  return grausNaTela(px, py);
}

/**
 * GIRA O RUMO NA DIRECAO DO ALVO, RESPEITANDO O LIMITE DE GUIDAO.
 *
 * Devolve o rumo novo. Quando o alvo esta perto, chega nele; quando esta longe,
 * anda o tanto que cabe no tempo passado.
 */
export function virarPara(
  atual: number | null,
  alvo: number,
  dt: number,
  limite = GIRO_MAXIMO_POR_SEGUNDO
): number {
  if (atual === null) return alvo;
  const falta = diferencaDeAngulo(alvo, atual);
  const cabe = limite * Math.max(0, dt);
  if (Math.abs(falta) <= cabe) return alvo;
  return atual + Math.sign(falta) * cabe;
}

/** A menor diferenca entre dois angulos, de -180 a 180. */
export function diferencaDeAngulo(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/**
 * QUAL MOLDE MOSTRA ESTE ANGULO — o mais perto, e so.
 *
 * Nao ha mais fatia de tamanho fixo: os desenhos nao estao espacados de igual,
 * e forcar uma grade sobre eles jogaria fora a diferenca entre um desenho a
 * tres graus e outro a vinte.
 */
export function fatiaDoAngulo(
  graus: number,
  lado?: LadoDoMenino,
  c: ConjuntoDeMoldes = DO_RENAN
): number {
  const moldes = c.moldes;
  let melhor = 0;
  let perto = Infinity;
  for (let i = 0; i < moldes.length; i += 1) {
    if (lado && moldes[i]!.lado !== lado) continue;
    const d = Math.abs(diferencaDeAngulo(moldes[i]!.graus, graus));
    if (d < perto) {
      perto = d;
      melhor = i;
    }
  }
  return melhor;
}

/** Para onde o desenho de uma fatia aponta. */
export function centroDaFatia(
  fatia: number,
  c: ConjuntoDeMoldes = DO_RENAN
): number {
  const n = c.moldes.length;
  return c.moldes[((fatia % n) + n) % n]!.graus;
}

/*
 * ── A COSTURA ENTRE AS FOLHAS DE COSTAS E AS DE FRENTE (11/09/2026) ────────
 *
 * "Apenas uma situacao que da pra ver Renan mudando de forma." Era esta. As
 * folhas novas vem em duas metades: nas de costas a mochila XB esta virada
 * para a camera, nas de frente e o rosto. As duas metades se encontram quando
 * ele anda de lado — para a direita, entre 03h08 (de frente) e 02h59 (de
 * costas), a quatro graus e meio uma da outra; para a esquerda, entre 09h12 e
 * 08h34. Quatro graus de rumo nao sao nada, mas o desenho vira do avesso: o
 * rosto some, a mochila aparece. Numa rua que ondula perto do horizontal, o
 * menino trocava de avesso a cada ondinha.
 *
 * A regra: para passar de uma metade para a outra, o molde do outro lado tem
 * de estar melhor que o melhor do lado atual por mais que a costura. Enquanto
 * nao estiver, ele segue do lado em que estava — com o molde desse lado mais
 * perto do rumo, que ainda troca normalmente. Ele so vira do avesso quando a
 * rua vira de verdade para longe ou para perto da camera.
 */

/** Quanto o outro lado tem de ganhar, em graus, para o menino virar do avesso. */
export const COSTURA_GRAUS = 14;

/**
 * Se a troca proposta cruza a costura sem ganhar o bastante, devolve o melhor
 * molde do lado atual no lugar dela.
 */
export function ficarDoMesmoLado(
  atual: number,
  proposta: number,
  graus: number,
  costura = COSTURA_GRAUS,
  c: ConjuntoDeMoldes = DO_RENAN
): number {
  const ladoAtual = c.moldes[atual]?.lado;
  const ladoNovo = c.moldes[proposta]?.lado;
  if (!ladoAtual || !ladoNovo || ladoAtual === ladoNovo) return proposta;
  const mesmoLado = fatiaDoAngulo(graus, ladoAtual, c);
  const fica = Math.abs(diferencaDeAngulo(centroDaFatia(mesmoLado, c), graus));
  const vai = Math.abs(diferencaDeAngulo(centroDaFatia(proposta, c), graus));
  return fica - vai > costura ? proposta : mesmoLado;
}

/*
 * ── O GIRO PELOS DESENHOS (11/09/2026) ────────────────────────────────────
 *
 * Medido no PC dele, na janela do jogo: de 67 trocas de desenho numa corrida,
 * 19 pulavam 45 graus ou mais de uma vez — ate 137 e 180 graus na saida de uma
 * porta. Um desenho de costas que vira de frente de um quadro para o outro nao
 * le como curva: le como o menino MUDANDO DE FORMA.
 *
 * O desenho escolhido continua sendo decidido pelas regras de cima (espera,
 * folga, confirmacao). O que muda e o caminho ate ele: quando o escolhido esta
 * a dois desenhos ou mais do que esta na tela, a tela passa pelos do meio, um
 * a cada PASSO_DO_GIRO_MS, sempre pelo lado mais curto do relogio. E o que o
 * olho le como "ele virou". Vizinho com vizinho continua trocando na hora.
 */

/** Quanto cada desenho do meio fica na tela durante um giro, em ms. */
export const PASSO_DO_GIRO_MS = 60;

/**
 * Quantos desenhos ha entre dois, pelo lado mais curto do relogio. Positivo e
 * no sentido do angulo crescente. (A ordem em volta do relogio mora no
 * conjunto de cada entregador: ver montarConjunto.)
 */
export function desenhosAte(
  de: number,
  para: number,
  c: ConjuntoDeMoldes = DO_RENAN
): number {
  const n = c.noRelogio.length;
  let d = (c.posicaoNoRelogio[para]! - c.posicaoNoRelogio[de]!) % n;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

/** O proximo desenho da tela a caminho do escolhido. */
export function proximoNoGiro(
  mostrada: number,
  alvo: number,
  c: ConjuntoDeMoldes = DO_RENAN
): number {
  const falta = desenhosAte(mostrada, alvo, c);
  if (Math.abs(falta) <= 1) return alvo;
  const n = c.noRelogio.length;
  const pos = (c.posicaoNoRelogio[mostrada]! + Math.sign(falta) + n) % n;
  return c.noRelogio[pos]!;
}

export interface EscolhaDeRumo {
  /** A fatia que o desenho esta mostrando. */
  fatia: number;
  /** Quando foi a ultima troca, no relogio de quadros. */
  trocadoEmMs: number;
  /** A fatia de antes da ultima troca — voltar para ela espera mais. */
  vinhaDe?: number;
}

/**
 * DECIDE SE O DESENHO TROCA AGORA.
 *
 * A regra mudou de forma junto com a lista. Antes era "o rumo saiu da minha
 * fatia mais uma folga" — o que so faz sentido com fatias iguais. Agora e:
 * TROCA SE OUTRO MOLDE ESTIVER MELHOR QUE O MEU POR MAIS QUE A FOLGA.
 *
 * A folga e a mesma ideia de antes e serve para a mesma coisa: sem ela, andar
 * exatamente no meio de dois desenhos faz o menino piscar entre os dois para
 * sempre. E a espera minima continua sendo a trava por construcao — duas
 * trocas nunca colam, por pior que o caminho seja.
 *
 * Devolve a escolha nova — a mesma de antes quando nada muda, para quem chama
 * poder comparar por identidade e nem tocar no DOM.
 */
export function escolherRumo(
  anterior: EscolhaDeRumo | null,
  graus: number,
  agoraMs: number,
  folga = FOLGA_GRAUS,
  espera = ESPERA_MS,
  costura = COSTURA_GRAUS,
  c: ConjuntoDeMoldes = DO_RENAN
): EscolhaDeRumo {
  if (!anterior) {
    return { fatia: fatiaDoAngulo(graus, undefined, c), trocadoEmMs: agoraMs };
  }
  if (agoraMs - anterior.trocadoEmMs < espera) return anterior;

  const nova = ficarDoMesmoLado(
    anterior.fatia,
    fatiaDoAngulo(graus, undefined, c),
    graus,
    costura,
    c
  );
  if (nova === anterior.fatia) return anterior;

  const agora = Math.abs(
    diferencaDeAngulo(centroDaFatia(anterior.fatia, c), graus)
  );
  const candidato = Math.abs(diferencaDeAngulo(centroDaFatia(nova, c), graus));
  if (agora - candidato <= folga) return anterior;

  if (
    nova === anterior.vinhaDe &&
    agoraMs - anterior.trocadoEmMs < VOLTA_MINIMA_MS
  )
    return anterior;

  return { fatia: nova, trocadoEmMs: agoraMs, vinhaDe: anterior.fatia };
}


/**
 * A GEOMETRIA DE CADA FOLHA — medida, uma por uma.
 *
 * Ate 06/09/2026 havia uma folha so, entao um par de numeros servia para todas.
 * Com folhas de verdade em cada rumo isso acabou: a bicicleta vista de lado
 * encosta em dois pontos bem separados; vista de frente, os dois quase se
 * juntam. Onde a roda toca o chao MUDA com o rumo, e com ela mudam a sombra, o
 * ponto que pousa no mapa e a linha do corte.
 *
 * Estes numeros nao foram estimados: cada folha foi lida pixel a pixel,
 * achando o ponto mais baixo de cada lado da bicicleta. Sao porcentagens da
 * moldura, que agora e QUADRADA e igual para todos os rumos — e por isso o
 * menino tem o mesmo tamanho em qualquer direcao.
 *
 * Quando chegarem as folhas que faltam (norte e nordeste), e so trocar a linha.
 *
 * ── E A MOLDURA MUDOU DE REGUA EM 06/09/2026 ──────────────────────────────
 *
 * Ate aqui cada folha era encaixada na moldura pela LARGURA do desenho, e isso
 * fazia o menino MUDAR DE TAMANHO ao virar a esquina: de lado a bicicleta e
 * comprida e o encaixe encolhia o menino, de frente e curta e o encaixe
 * esticava. Medido nas proprias folhas: 70% da altura da moldura indo para
 * leste contra 89,5% indo para o sul — vinte e oito por cento, so de virar.
 *
 * Agora a regua e a ALTURA, igual para os oito: 88% da moldura, com o pneu
 * mais baixo em 97%. Oitenta e oito porque e onde ja estavam o sul e o
 * sudeste, que sao os rumos da primeira corrida — o tamanho que ele aprovou
 * na tela nao muda, e os outros param de encolher.
 *
 * Estes numeros saem de scripts/entregador/igualar_o_tamanho.py, que mede o
 * ponto mais baixo de cada metade do desenho. A mesma regua vale para as doze
 * folhas novas, em scripts/entregador/doze_horas.py.
 */
export interface GeometriaDoRumo {
  /** Onde a roda da frente encosta, em % da moldura. */
  frenteX: number;
  frenteY: number;
  /** Onde a roda de tras encosta. */
  trasX: number;
  trasY: number;
}

/** A geometria do Renan (a de cada pessoa mora no conjunto dela). */
export const GEOMETRIA: Readonly<Record<Rumo, GeometriaDoRumo>> =
  DO_RENAN.geometria;

/*
 * ── O ESPELHO E O EMPRESTIMO ACABARAM EM 06/09/2026 ───────────────────────
 *
 * Moravam aqui duas listas: os rumos sem folha propria, que pintavam a folha de
 * outro, e os rumos espelhados, que pintavam uma folha virada na horizontal.
 * As duas eram remendo, e as duas cobraram.
 *
 * O emprestimo deu "entregador esta andando de lado": o norte usava a folha do
 * leste, noventa graus errado, e nada no codigo reclamava — a conta do rumo
 * estava certa e o desenho e que mentia.
 *
 * O espelho deu "analise onde esta sombra e faca pneus estarem naquele lugar":
 * virar o desenho vira tambem o lado em que a roda encosta, e a sombra saia a
 * meia bicicleta do pneu. E deu pior: o noroeste usava o espelho de uma folha
 * de FRENTE, entao o menino subia a tela mostrando o rosto.
 *
 * Hoje cada molde tem folha propria, e nao ha lista de remendo nenhuma. Ele
 * decidiu assim, com todas as letras: "sem espelho, sem gambiarra". Quando
 * faltar uma direcao, a resposta e desenhar ela — nao emprestar nem virar a do
 * lado. O buraco fica visivel na conta dos vaos, que o script imprime, e vaga
 * ate o desenho chegar. (Isto valeu inteiro ate 12/09/2026 — ver a secao
 * seguinte, em que ele mandou fechar o maior buraco com espelho de gerador.)
 *
 * ── O ESPELHO VOLTOU EM 12/09/2026, COM DUAS TRAVAS ───────────────────────
 *
 * Ordem dele: "PRIMEIRO APLIQUE O QUE TEMOS SEM TRAVAR CAMERA EM
 * ENTREGADORES". O que temos e o buraco da frente: entre 06h00 e 04h34 o
 * relogio do Renan passava 43,1 graus sem desenho nenhum (o da Lorena, 46,1
 * graus), e e esse buraco que da o tranco quando o entregador cruza a tela por
 * baixo, vindo para a camera.
 *
 * O ESPELHO QUE VOLTOU NAO E O DE ANTES. O de antes virava o desenho na hora
 * de pintar e deixava as pegadas no lugar velho — dai a sombra a meia
 * bicicleta do pneu. Agora quem vira e o GERADOR: o script grava um arquivo
 * novo, com os pixels ao contrario E as pegadas ao contrario (x vira 100 - x),
 * e o jogo pinta esse arquivo como pinta qualquer outro. Nada vira na tela.
 *
 * Duas travas, em scripts/entregador/grades.py:
 *
 *   1. o espelho e 180 - graus, entao a altura do rumo nao muda: quem vai para
 *      o fundo continua de costas, quem vem continua de frente. Foi exatamente
 *      aqui que o espelho antigo estragou (o noroeste mostrando o rosto), e o
 *      script para sozinho se um dia isso deixar de valer.
 *   2. so entra onde o buraco passa de 38 graus, e so no meio dele — nunca
 *      colado num desenho que ja existe.
 *
 * Com isso o maior salto do relogio cai de 43,1 para 30,2 graus no Renan e de
 * 46,1 para 37,4 na Lorena. O buraco continua aparecendo na conta dos vaos que
 * o script imprime, e quando o desenho de verdade chegar ele toma o lugar do
 * espelho sem ninguem mexer em codigo.
 */

/** O nome do rumo de uma fatia. */
export function rumoDaFatia(
  fatia: number,
  c: ConjuntoDeMoldes = DO_RENAN
): Rumo {
  const n = c.rumos.length;
  return c.rumos[((fatia % n) + n) % n]!;
}

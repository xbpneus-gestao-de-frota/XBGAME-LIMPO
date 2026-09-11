/**
 * O CAMINHO PELAS RUAS.
 *
 * Ate agora o bairro sabia dizer QUANTO se anda de um lugar a outro. Isto aqui
 * sabe dizer POR ONDE — e por onde e o que o entregador precisa para sair da
 * base e chegar na porta sem cortar quarteirao.
 *
 * ── POR QUE UM ARQUIVO SO PARA ISTO ───────────────────────────────────────
 *
 * A conta de projetar um ponto na rua mais perto ja existia dentro dos
 * enderecos, escondida. Ela e a mesma para tres perguntas diferentes: onde
 * fica a porta de um predio, quanto se anda ate ela, e por onde se vai. Tres
 * copias da mesma conta seriam tres lugares para ela envelhecer diferente.
 *
 * ── O QUE E UMA ENTRADA NA MALHA ──────────────────────────────────────────
 *
 * Uma porta nao fica num cruzamento: fica no meio de um quarteirao. Entao o
 * ponto e projetado no tracado da rua mais perto, e a conta guarda quanto
 * falta ate cada ponta do trecho. Sem isso a caminhada teria de saltar ate a
 * esquina, e a casa vizinha da base pareceria tao longe quanto a esquina.
 */
import { MAPA, METROS_POR_PIXEL, TRECHOS } from "./streets";
import type { PontoNoMapa, TrechoDeRua } from "./streets";

/** Onde um ponto qualquer entra na malha de ruas. */
export interface EntradaNaRua {
  trecho: TrechoDeRua;
  /** O ponto ja em cima da rua, em porcentagem do mapa. */
  em: PontoNoMapa;
  /** Quantos metros dali ate a ponta "de" do trecho, andando pelo tracado. */
  metrosAteODe: number;
  /** E ate a ponta "ate". */
  metrosAteOAte: number;
  /** Quanto do trecho ja foi andado quando se chega neste ponto, em metros. */
  andadoNoTrecho: number;
}

const emPx = (p: PontoNoMapa): [number, number] => [
  (p[0] / 100) * MAPA.largura,
  (p[1] / 100) * MAPA.altura,
];
const emPorcento = (x: number, y: number): PontoNoMapa => [
  (x / MAPA.largura) * 100,
  (y / MAPA.altura) * 100,
];

/**
 * A entrada na malha mais perto de um ponto.
 *
 * Mede ate a LINHA da rua, e nao ate os pontos guardados dela: numa reta longa
 * o tracado guarda so as duas pontas, e medir ate os pontos jogaria uma porta
 * do meio da quadra para a esquina.
 */
export function entradaNaRua(p: PontoNoMapa): EntradaNaRua | null {
  const alvo = emPx(p);
  let melhor: EntradaNaRua | null = null;
  let melhorDistancia = Infinity;

  for (const t of TRECHOS) {
    const pontos = t.linha.map(emPx);
    let andado = 0;
    let total = 0;
    let aqui = Infinity;
    let andadoNoMelhor = 0;
    let pontoNoMelhor: [number, number] = alvo;

    for (let i = 1; i < pontos.length; i += 1) {
      const a = pontos[i - 1]!;
      const b = pontos[i]!;
      const vx = b[0] - a[0];
      const vy = b[1] - a[1];
      const comprimento = Math.hypot(vx, vy);
      total += comprimento;
      if (comprimento === 0) continue;
      let f =
        ((alvo[0] - a[0]) * vx + (alvo[1] - a[1]) * vy) /
        (comprimento * comprimento);
      f = Math.max(0, Math.min(1, f));
      const qx = a[0] + vx * f;
      const qy = a[1] + vy * f;
      const d = Math.hypot(alvo[0] - qx, alvo[1] - qy);
      if (d < aqui) {
        aqui = d;
        andadoNoMelhor = andado + comprimento * f;
        pontoNoMelhor = [qx, qy];
      }
      andado += comprimento;
    }

    if (aqui < melhorDistancia) {
      melhorDistancia = aqui;
      melhor = {
        trecho: t,
        em: emPorcento(pontoNoMelhor[0], pontoNoMelhor[1]),
        metrosAteODe: andadoNoMelhor * METROS_POR_PIXEL,
        metrosAteOAte: Math.max(0, total - andadoNoMelhor) * METROS_POR_PIXEL,
        andadoNoTrecho: andadoNoMelhor,
      };
    }
  }
  return melhor;
}

/** O ponto da rua mais perto — a porta de um predio. */
export function pontoNaRua(p: PontoNoMapa): PontoNoMapa {
  return entradaNaRua(p)?.em ?? p;
}

interface Vizinho {
  para: string;
  metros: number;
  trecho: TrechoDeRua;
}

let vizinhosCache: Map<string, Vizinho[]> | null = null;
function vizinhos(): Map<string, Vizinho[]> {
  if (vizinhosCache) return vizinhosCache;
  const m = new Map<string, Vizinho[]>();
  for (const t of TRECHOS) {
    const metros = t.px * METROS_POR_PIXEL;
    if (!m.has(t.de)) m.set(t.de, []);
    if (!m.has(t.ate)) m.set(t.ate, []);
    m.get(t.de)!.push({ para: t.ate, metros, trecho: t });
    m.get(t.ate)!.push({ para: t.de, metros, trecho: t });
  }
  vizinhosCache = m;
  return m;
}

/**
 * Menor caminho a pe a partir de um conjunto de esquinas ja com custo.
 *
 * Fila simples por menor custo. A malha tem pouco mais de cem esquinas: nao
 * vale a complicacao de uma fila de prioridade de verdade, e assim da para ler
 * o que faz.
 */
function menorCaminho(
  partida: ReadonlyMap<string, number>
): { custo: Map<string, number>; veio: Map<string, { de: string; trecho: TrechoDeRua }> } {
  const custo = new Map<string, number>(partida);
  const veio = new Map<string, { de: string; trecho: TrechoDeRua }>();
  const pendentes = new Set<string>(partida.keys());
  const viz = vizinhos();

  while (pendentes.size > 0) {
    let atual = "";
    let menor = Infinity;
    for (const id of pendentes) {
      const d = custo.get(id) ?? Infinity;
      if (d < menor) {
        menor = d;
        atual = id;
      }
    }
    pendentes.delete(atual);
    for (const v of viz.get(atual) ?? []) {
      const candidata = menor + v.metros;
      if (candidata < (custo.get(v.para) ?? Infinity)) {
        custo.set(v.para, candidata);
        veio.set(v.para, { de: atual, trecho: v.trecho });
        pendentes.add(v.para);
      }
    }
  }
  return { custo, veio };
}

/** Distancia a pe de um ponto qualquer ate cada esquina do bairro. */
export function distanciasDe(p: PontoNoMapa): Map<string, number> {
  const entrada = entradaNaRua(p);
  const partida = new Map<string, number>();
  if (entrada) {
    partida.set(entrada.trecho.de, entrada.metrosAteODe);
    partida.set(entrada.trecho.ate, entrada.metrosAteOAte);
  }
  return menorCaminho(partida).custo;
}

/** Quantos metros se anda de um ponto ao outro, pelas ruas. */
export function metrosAPe(de: PontoNoMapa, para: PontoNoMapa): number {
  const chegada = entradaNaRua(para);
  if (!chegada) return Infinity;
  const custo = distanciasDe(de);
  return Math.min(
    (custo.get(chegada.trecho.de) ?? Infinity) + chegada.metrosAteODe,
    (custo.get(chegada.trecho.ate) ?? Infinity) + chegada.metrosAteOAte
  );
}

/** Um pedaco do tracado de um trecho, do metro X ao metro Y, na ordem pedida. */
function pedacoDoTrecho(
  t: TrechoDeRua,
  dePx: number,
  atePx: number
): PontoNoMapa[] {
  const pontos = t.linha.map(emPx);
  const inicio = Math.min(dePx, atePx);
  const fim = Math.max(dePx, atePx);
  const saida: [number, number][] = [];
  let andado = 0;

  const noAndar = (alvo: number): [number, number] | null => {
    let acumulado = 0;
    for (let i = 1; i < pontos.length; i += 1) {
      const a = pontos[i - 1]!;
      const b = pontos[i]!;
      const c = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acumulado + c >= alvo) {
        const f = c === 0 ? 0 : (alvo - acumulado) / c;
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      }
      acumulado += c;
    }
    return pontos[pontos.length - 1] ?? null;
  };

  const primeiro = noAndar(inicio);
  if (primeiro) saida.push(primeiro);
  for (let i = 1; i < pontos.length; i += 1) {
    const a = pontos[i - 1]!;
    const b = pontos[i]!;
    andado += Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (andado > inicio && andado < fim) saida.push(b);
  }
  const ultimo = noAndar(fim);
  if (ultimo) saida.push(ultimo);

  if (dePx > atePx) saida.reverse();
  return saida.map(([x, y]) => emPorcento(x, y));
}

/** O comprimento total do tracado de um trecho, em pixels do desenho. */
function comprimentoEmPx(t: TrechoDeRua): number {
  const pontos = t.linha.map(emPx);
  let c = 0;
  for (let i = 1; i < pontos.length; i += 1) {
    c += Math.hypot(
      pontos[i]![0] - pontos[i - 1]![0],
      pontos[i]![1] - pontos[i - 1]![1]
    );
  }
  return c;
}

/**
 * O CAMINHO, ponto a ponto, de um lugar a outro pelas ruas.
 *
 * Devolve o tracado inteiro em porcentagem do mapa: comeca na porta de saida,
 * anda pelo asfalto e termina na porta de chegada. E este desenho que o
 * entregador segue — ele nunca corta quarteirao porque nunca ha um ponto fora
 * da rua no meio da lista.
 */
/**
 * A RUA TEM DUAS MAOS, E ELE ANDA NA DELE.
 *
 * O tracado do bairro e UM traco por rua: o eixo do asfalto, no meio. Andar em
 * cima dele poe o entregador na faixa dividida — vindo e indo pelo mesmo lugar,
 * que e o que faz duas entregas seguidas parecerem a mesma. O Fernando pediu os
 * dois tracados: "devemos ter 2 tracados, a rua e mao dupla".
 *
 * Em vez de guardar duas linhas para cada rua — que dobraria a malha, os
 * cruzamentos e a chance de erro — o segundo traco NASCE do primeiro: o caminho
 * e empurrado para a DIREITA de quem anda. Ida e volta pela mesma rua saem
 * automaticamente em faixas opostas, porque a direita de quem vai e a esquerda
 * de quem volta.
 *
 * A rua do jogo tem 13,8 m. Duas faixas de 6,9 m poem o meio de cada uma a
 * 3,45 m do eixo. Ficou em 2,8: o alisamento das esquinas ja corta caminho para
 * fora, e a soma das duas coisas e que nao pode passar do meio-fio.
 *
 * NA TELA O Y CRESCE PARA BAIXO. Por isso a direita de quem anda em (dx, dy) e
 * (-dy, dx), e nao (dy, -dx): quem vai para o leste tem o sul a direita, e o sul
 * e para baixo.
 */
export const MAO_DA_RUA_METROS = 2.8;

/**
 * ALISAR O CAMINHO — o conserto do "andar de lado".
 *
 * O tracado da rua ja esta reto. O CAMINHO, nao: ele e costurado de pedacos de
 * trecho, e em cada emenda — cada esquina, cada entrada de rua — dois pedacos se
 * encontram num angulo vivo. O entregador virava naquele bico de uma vez, e como
 * o desenho dele so tem oito rumos, ele passava um pedaco andando de lado: o
 * corpo apontando para um lugar e o caminho indo para outro.
 *
 * Adiantava pouco frear a troca de desenho, que foi o que eu fiz antes: isso
 * esconde o piscar, mas atrasa a virada e piora justamente o andar de lado. O
 * remedio certo e mais atras — e tirar o bico do caminho.
 *
 * O metodo e o de Chaikin, que e o mais simples que existe: em vez de passar
 * pelo bico, o caminho passa por dois pontos, um a um quarto e outro a tres
 * quartos de cada lado dele. Repetido duas vezes, o bico vira curva. E o que um
 * ciclista de verdade faz numa esquina: ninguem para, gira e sai.
 *
 * As PONTAS ficam presas: o primeiro e o ultimo ponto nao se mexem, senao a
 * rota deixaria de comecar na base e de terminar na porta.
 */
const VOLTAS_DE_ALISAMENTO = 4;

/**
 * O QUANTO CADA VOLTA CORTA O BICO.
 *
 * Chaikin classico corta em um quarto. Um quarto por volta arredonda rapido,
 * mas afasta o caminho do eixo da rua — e a rua tem largura limitada. Com um
 * quinto e mais voltas, a curva sai igualmente lisa e o caminho fica mais perto
 * do asfalto. Ha teste guardando essa distancia.
 */
const CORTE_DO_BICO = 0.2;

/**
 * ATE ONDE A CURVA PODE SE AFASTAR DO CAMINHO ORIGINAL.
 *
 * Alisar corta caminho por fora da esquina — e uma esquina fechada corta muito.
 * Somado aos 2,8 m da mao da rua, isso pode jogar o entregador para cima do
 * meio-fio. Entao a curva alisada e AMARRADA: nenhum ponto dela pode ficar a
 * mais de 2,2 m do caminho de onde saiu. Onde a esquina e mansa, a amarra nao
 * encosta; onde e fechada, ela segura.
 *
 * 2,8 da mao + 2,2 da amarra = 5,0 m do eixo, e a meia-largura da rua e 6,9.
 */
const AMARRA_METROS = 2.2;

/** A distancia de um ponto a um caminho, em pixels do mapa. */
function distanciaAoCaminho(q: [number, number], caminho: [number, number][]): number {
  let menor = Infinity;
  for (let i = 1; i < caminho.length; i += 1) {
    const a = caminho[i - 1]!;
    const b = caminho[i]!;
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const L2 = vx * vx + vy * vy;
    const f =
      L2 < 1e-12
        ? 0
        : Math.max(0, Math.min(1, ((q[0] - a[0]) * vx + (q[1] - a[1]) * vy) / L2));
    const d = Math.hypot(q[0] - (a[0] + vx * f), q[1] - (a[1] + vy * f));
    if (d < menor) menor = d;
  }
  return menor;
}

/** O ponto do caminho mais proximo de q, em pixels do mapa. */
function pontoMaisProximo(q: [number, number], caminho: [number, number][]): [number, number] {
  let melhor: [number, number] = caminho[0]!;
  let menor = Infinity;
  for (let i = 1; i < caminho.length; i += 1) {
    const a = caminho[i - 1]!;
    const b = caminho[i]!;
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const L2 = vx * vx + vy * vy;
    const f =
      L2 < 1e-12
        ? 0
        : Math.max(0, Math.min(1, ((q[0] - a[0]) * vx + (q[1] - a[1]) * vy) / L2));
    const p: [number, number] = [a[0] + vx * f, a[1] + vy * f];
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < menor) {
      menor = d;
      melhor = p;
    }
  }
  return melhor;
}

/**
 * PASSO PAREJO ANTES DE ALISAR — o que faltava.
 *
 * Alisar so funciona bem se os pontos estiverem mais ou menos igualmente
 * espacados. O caminho nao estava: ele mistura pontos de tracado de rua com os
 * pontos de encosto das portas, e havia vizinhos a 24 centimetros um do outro.
 * Onde os pontos se amontoam, o alisamento quase nao mexe — e a esquina fica
 * com o bico igual, no meio de um caminho liso.
 *
 * Era o que sobrava do tremor: 18 lugares no bairro onde o rumo girava ate
 * 4.000 graus por segundo, sempre em cima de um amontoado desses.
 *
 * Entao o caminho e redesenhado com passo parejo primeiro. As pontas e o
 * comprimento nao mudam; so a distribuicao.
 */
const PASSO_METROS = 2;

function passoParejo(caminho: PontoNoMapa[]): PontoNoMapa[] {
  if (caminho.length < 2) return caminho;
  const px = caminho.map(emPx);
  const somas: number[] = [0];
  for (let i = 1; i < px.length; i += 1) {
    somas.push(
      somas[i - 1]! + Math.hypot(px[i]![0] - px[i - 1]![0], px[i]![1] - px[i - 1]![1])
    );
  }
  const total = somas[somas.length - 1]!;
  if (total <= 0) return caminho;
  const passo = PASSO_METROS / METROS_POR_PIXEL;
  const quantos = Math.max(2, Math.round(total / passo));
  const saida: PontoNoMapa[] = [];
  let j = 1;
  for (let k = 0; k <= quantos; k += 1) {
    const alvo = (total * k) / quantos;
    while (j < somas.length - 1 && somas[j]! < alvo) j += 1;
    const a = px[j - 1]!;
    const b = px[j]!;
    const vao = Math.max(1e-9, somas[j]! - somas[j - 1]!);
    const f = Math.max(0, Math.min(1, (alvo - somas[j - 1]!) / vao));
    saida.push(emPorcento(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f));
  }
  return saida;
}

function alisar(entrada: PontoNoMapa[]): PontoNoMapa[] {
  const caminho = passoParejo(entrada);
  const referencia = caminho.map(emPx);
  const amarra = AMARRA_METROS / METROS_POR_PIXEL;
  let atual = caminho;
  for (let volta = 0; volta < VOLTAS_DE_ALISAMENTO; volta += 1) {
    if (atual.length < 3) return atual;
    const saida: PontoNoMapa[] = [atual[0]!];
    for (let i = 0; i < atual.length - 1; i += 1) {
      const a = atual[i]!;
      const b = atual[i + 1]!;
      const f = CORTE_DO_BICO;
      saida.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      saida.push([a[0] + (b[0] - a[0]) * (1 - f), a[1] + (b[1] - a[1]) * (1 - f)]);
    }
    saida.push(atual[atual.length - 1]!);
    // A AMARRA: quem se afastou demais volta para perto do caminho original.
    atual = saida.map((p, i) => {
      if (i === 0 || i === saida.length - 1) return p;
      const q = emPx(p);
      const d = distanciaAoCaminho(q, referencia);
      if (d <= amarra) return p;
      const perto = pontoMaisProximo(q, referencia);
      const f = amarra / d;
      return emPorcento(
        perto[0] + (q[0] - perto[0]) * f,
        perto[1] + (q[1] - perto[1]) * f
      );
    });
  }
  return atual;
}

function pelaDireita(caminho: PontoNoMapa[]): PontoNoMapa[] {
  if (caminho.length < 2) return caminho;
  const px = caminho.map(emPx);
  const desvio = MAO_DA_RUA_METROS / METROS_POR_PIXEL;
  const normais: [number, number][] = px.map((_, i) => {
    const a = px[Math.max(0, i - 1)]!;
    const b = px[Math.min(px.length - 1, i + 1)]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const n = Math.hypot(dx, dy);
    // A direita de quem anda, com o y da tela crescendo para baixo.
    return n < 1e-9 ? [0, 0] : [-dy / n, dx / n];
  });
  return px.map((q, i) => {
    const [nx, ny] = normais[i]!;
    return emPorcento(q[0] + nx * desvio, q[1] + ny * desvio);
  });
}

/**
 * O CAMINHO ENTRE DOIS PONTOS NAO MUDA DURANTE O JOGO — entao e feito uma vez so.
 *
 * Medido em 10/09/2026, no jogo montado, quadro a quadro: o bairro engasgava um
 * quinto de segundo UMA VEZ POR SEGUNDO. Era o relogio do balcao perguntando
 * quanto falta ate a proxima porta, e cada pergunta refazia este caminho inteiro
 * — busca pelas ruas e alisamento das curvas — para dar a mesma resposta de um
 * segundo antes. Com o jogo parado nesse quinto de segundo, o Renan andava aos
 * trancos e, quando a troca de desenho caia dentro do engasgo, sumia da tela.
 *
 * As ruas e as portas sao fixas, entao a resposta tambem e: fica guardada pela
 * dupla de pontos. Quem recebe ganha uma copia, para ninguem mexer na guardada.
 */
const caminhosFeitos = new Map<string, PontoNoMapa[]>();

export function rota(de: PontoNoMapa, para: PontoNoMapa): PontoNoMapa[] {
  const chave = `${de[0]},${de[1]}>${para[0]},${para[1]}`;
  let feito = caminhosFeitos.get(chave);
  if (!feito) {
    feito = fazerRota(de, para);
    caminhosFeitos.set(chave, feito);
  }
  return feito.slice();
}

function fazerRota(de: PontoNoMapa, para: PontoNoMapa): PontoNoMapa[] {
  const saida = entradaNaRua(de);
  const chegada = entradaNaRua(para);
  if (!saida || !chegada) return [de, para];

  // Mesmo trecho: e so o pedaco entre os dois, sem passar por esquina nenhuma.
  if (saida.trecho === chegada.trecho) {
    return alisar(
      pelaDireita(
          pedacoDoTrecho(
          saida.trecho,
          saida.andadoNoTrecho,
          chegada.andadoNoTrecho
        )
      )
    );
  }

  const partida = new Map<string, number>([
    [saida.trecho.de, saida.metrosAteODe],
    [saida.trecho.ate, saida.metrosAteOAte],
  ]);
  const { custo, veio } = menorCaminho(partida);

  const fim = [
    { no: chegada.trecho.de, extra: chegada.metrosAteODe },
    { no: chegada.trecho.ate, extra: chegada.metrosAteOAte },
  ]
    .map(o => ({ ...o, total: (custo.get(o.no) ?? Infinity) + o.extra }))
    .sort((a, b) => a.total - b.total)[0]!;
  if (!Number.isFinite(fim.total)) return [de, para];

  // De tras para frente ate uma das pontas do trecho de saida.
  const caminho: Array<{ no: string; trecho: TrechoDeRua | null }> = [];
  let atual: string | undefined = fim.no;
  while (atual !== undefined) {
    const passo: { de: string; trecho: TrechoDeRua } | undefined = veio.get(atual);
    caminho.push({ no: atual, trecho: passo?.trecho ?? null });
    atual = passo?.de;
  }
  caminho.reverse();

  const pontos: PontoNoMapa[] = [];
  const primeiroNo = caminho[0]!.no;

  // O pedaco do trecho de saida, da porta ate a esquina por onde se sai.
  const compSaida = comprimentoEmPx(saida.trecho);
  pontos.push(
    ...pedacoDoTrecho(
      saida.trecho,
      saida.andadoNoTrecho,
      primeiroNo === saida.trecho.de ? 0 : compSaida
    )
  );

  // Os trechos inteiros do meio, cada um na ordem em que e percorrido.
  for (let i = 1; i < caminho.length; i += 1) {
    const t = caminho[i]!.trecho;
    if (!t) continue;
    const veioDe = caminho[i - 1]!.no;
    const comp = comprimentoEmPx(t);
    const pedaco =
      veioDe === t.de
        ? pedacoDoTrecho(t, 0, comp)
        : pedacoDoTrecho(t, comp, 0);
    pontos.push(...pedaco);
  }

  // E o pedaco do trecho de chegada, da esquina ate a porta.
  const compChegada = comprimentoEmPx(chegada.trecho);
  pontos.push(
    ...pedacoDoTrecho(
      chegada.trecho,
      fim.no === chegada.trecho.de ? 0 : compChegada,
      chegada.andadoNoTrecho
    )
  );

  // Tira pontos repetidos nas emendas — dois iguais seguidos fazem o
  // entregador "parar" um quadro em cada esquina.
  const limpo: PontoNoMapa[] = [];
  for (const p of pontos) {
    const ultimo = limpo[limpo.length - 1];
    if (!ultimo || Math.hypot(ultimo[0] - p[0], ultimo[1] - p[1]) > 0.01) {
      limpo.push(p);
    }
  }
  return alisar(pelaDireita(limpo));
}

/** O comprimento de um caminho, em metros. */
export function metrosDaRota(caminho: readonly PontoNoMapa[]): number {
  let px = 0;
  for (let i = 1; i < caminho.length; i += 1) {
    const a = emPx(caminho[i - 1]!);
    const b = emPx(caminho[i]!);
    px += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return px * METROS_POR_PIXEL;
}

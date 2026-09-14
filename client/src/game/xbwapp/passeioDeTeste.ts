/**
 * O PASSEIO DE TESTE — os entregadores pedalando o bairro inteiro.
 *
 * Ordem dele, 11/09/2026: "precisamos testar por enquanto apenas usuarios
 * pedalando por todo o mapa".
 *
 * ── O QUE ISTO FAZ, E POR QUE E UM INTERRUPTOR ────────────────────────────
 *
 * Com o passeio LIGADO, quem esta na equipe nunca fica parado esperando
 * pedido: assim que a rota dele esvazia, o bairro inteiro entra na fila de
 * paradas, uma porta atras da outra. E o balcao fica quieto — nenhum pedido e
 * publicado, nada estoura, ninguem perde estrela. O teste e so a pedalada.
 *
 * Isto NAO e jogo: e bancada de prova. Por isso mora sozinho num arquivo, se
 * liga e desliga numa linha, e nada mais do jogo sabe que ele existe. Com o
 * interruptor desligado o arquivo inteiro vira letra morta e o balcao volta a
 * mandar pedido como sempre.
 *
 * ── POR QUE AS PARADAS SAO SEIS DE CADA VEZ ───────────────────────────────
 *
 * Cada parada da rota vira um pino no mapa. Despejar as vinte e quatro portas
 * de uma vez encheria a tela de pino e esconderia o que se quer olhar — os
 * dois pedalando. Seis pinos e o que cabe sem sujar; quando a sexta acaba, as
 * seis seguintes entram, e o passeio segue sem fim.
 *
 * ── E POR QUE A ORDEM CRUZA O BAIRRO ──────────────────────────────────────
 *
 * Um passeio pela porta mais perto ficaria girando no mesmo quarteirao, e o
 * teste quer o mapa INTEIRO: rua diagonal, curva, subida, o outro lado. Entao
 * a lista alterna pontas — a primeira porta de um canto, a seguinte do canto
 * oposto —, e quem vem depois anda a mesma lista ao contrario, para os dois
 * nao virarem comboio.
 */
import { LOJAS, MORADORES } from "./contatos";
import { enderecoDe } from "./distancias";
import { novoEmRota, type EmRota, type Parada } from "./aRota";
import type { EstadoDoApp } from "./estado";
import type { IdContato } from "./tipos";

/**
 * O INTERRUPTOR — DESLIGADO EM 13/09/2026.
 *
 * Ordem dele: "desligue modo teste, e vamos ver estado real do game ate agora".
 * A bancada de prova cumpriu o que tinha de cumprir: a pedalada foi vista no
 * mapa inteiro, em rua reta, curva e diagonal.
 *
 * Desligado, quem manda nas rotas volta a ser o balcao de pedidos — que e o
 * jogo de verdade. O arquivo fica inteiro e vira letra morta: religar e trocar
 * esta linha, e nao remontar nada.
 */
export const PASSEIO_DE_TESTE = false;

/** Quantas portas entram na rota de cada vez (e, portanto, quantos pinos). */
export const PORTAS_POR_VEZ = 6;

/**
 * TODAS AS PORTAS QUE O APLICATIVO CONHECE, na ordem que cruza o bairro.
 *
 * Sao as lojas e as casas que tem endereco no desenho — quem nao tem porta no
 * mapa nao entra, senao o traçado nao teria para onde ir.
 */
function portasDoBairro(): readonly IdContato[] {
  const comPorta = [...LOJAS, ...MORADORES]
    .map(c => ({ id: c.id, onde: enderecoDe(c.id)?.em }))
    .filter((c): c is { id: IdContato; onde: readonly [number, number] } =>
      Boolean(c.onde)
    );
  // Fila do canto de cima para o de baixo; a diagonal e a rua do bairro.
  const emFila = comPorta.sort(
    (a, b) => a.onde[0] + a.onde[1] - (b.onde[0] + b.onde[1])
  );
  // Alterna as pontas: primeira de cima, primeira de baixo, e assim por diante.
  const cruzando: IdContato[] = [];
  let inicio = 0;
  let fim = emFila.length - 1;
  while (inicio <= fim) {
    cruzando.push(emFila[inicio]!.id);
    if (inicio !== fim) cruzando.push(emFila[fim]!.id);
    inicio += 1;
    fim -= 1;
  }
  return cruzando;
}

/**
 * As proximas portas de quem esta em `de`.
 *
 * Sai de onde a pessoa parou e segue a lista em roda, sem fim. Uma parada e
 * coleta, a outra e entrega, alternando: as duas cenas paradas aparecem no
 * teste, que e metade do que se quer olhar.
 */
export function paradasDoPasseio(
  de: IdContato,
  aoContrario = false,
  quantas = PORTAS_POR_VEZ
): readonly Parada[] {
  const portas = aoContrario
    ? [...portasDoBairro()].reverse()
    : portasDoBairro();
  if (portas.length === 0) return [];
  const onde = portas.indexOf(de);
  const saida: Parada[] = [];
  for (let k = 1; k <= Math.min(quantas, portas.length); k += 1) {
    const posicao = (Math.max(0, onde) + k) % portas.length;
    saida.push({
      pedido: `#passeio-${posicao}`,
      o: k % 2 === 1 ? "coleta" : "entrega",
      lugar: portas[posicao]!,
    });
  }
  return saida;
}

/**
 * PoE quem esta sem rota para passear, e cala o balcao.
 *
 * Devolve o mesmo estado quando nao ha o que mudar — o React so repinta
 * quando alguma coisa andou de verdade.
 */
export function passearPeloBairro(
  estado: EstadoDoApp,
  nomes: readonly string[],
  /*
   * O INTERRUPTOR ENTRA POR AQUI, e nao e lido de dentro.
   *
   * O jogo nao passa nada e a chave de cima manda, como sempre. Quem passa e a
   * bancada: com a chave desligada, a prova do passeio nao teria como se
   * exercitar, e a peca ficaria no arquivo sem ninguem conferindo se ainda
   * funciona no dia em que ele mandar religar.
   */
  ligado: boolean = PASSEIO_DE_TESTE
): EstadoDoApp {
  if (!ligado) return estado;
  const rotas: Record<string, EmRota> = { ...estado.rotas };
  let mudou = false;
  nomes.forEach((nome, posicao) => {
    const atual = rotas[nome] ?? novoEmRota(nome);
    if (atual.paradas.length > 0) return;
    const paradas = paradasDoPasseio(atual.em, posicao % 2 === 1);
    if (paradas.length === 0) return;
    rotas[nome] = { ...atual, paradas, naPernaS: 0 };
    mudou = true;
  });
  // No passeio o balcao fica quieto: nada de pedido, nada de prazo correndo.
  const tinhaOferta = estado.ofertas.length > 0;
  if (!mudou && !tinhaOferta) return estado;
  return {
    ...estado,
    rotas: mudou ? rotas : estado.rotas,
    ofertas: tinhaOferta ? [] : estado.ofertas,
  };
}

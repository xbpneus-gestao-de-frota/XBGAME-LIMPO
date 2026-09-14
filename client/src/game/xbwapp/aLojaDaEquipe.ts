/**
 * A LOJA DA EQUIPE — o que dá para andar, além da bicicleta de sempre.
 *
 * Ordem dele, 13/09/2026: "ao clicar em bicicleta devemos ter duas caixas
 * apenas loja, upgrade, se clicar em loja iremos para loja, nesta loja teremos
 * bicicleta, patins, triciclo, patinete, caiaque, skate, ao clicar em cada
 * item abrir telas ainda vazias mas com veiculos do nv 1 ao 5 da bicicleta
 * normal a eletrica, siga mesmo exemplo para todos".
 *
 * ── O QUE ESTE ARQUIVO E, E O QUE ELE AINDA NAO E ─────────────────────────
 *
 * Ele é a PRATELEIRA: os seis jeitos de andar e os cinco degraus de cada um,
 * do mais simples ao elétrico. Nada aqui tem preço, efeito ou dono — e isso é
 * de propósito, porque foi o que ele pediu ("telas ainda vazias").
 *
 * O motivo de existir mesmo vazio: a forma da loja é uma decisão de jogo, e
 * decisão de jogo escrita num só lugar não se perde. Quando os preços chegarem,
 * eles entram aqui e aparecem em todas as telas de uma vez — em vez de nascerem
 * espalhados por seis telas que alguém teria de manter iguais.
 *
 * ── POR QUE CINCO DEGRAUS, E SEMPRE OS MESMOS CINCO ───────────────────────
 *
 * "Do normal ao elétrico" é a régua dele, e vale para os seis. Isso deixa a
 * loja legível de primeira: quem entendeu a coluna da bicicleta já sabe ler a
 * do caiaque. Se cada item tivesse a própria escada, a pessoa teria de aprender
 * seis lojas.
 *
 * O último degrau de todos é elétrico de propósito — é o fim da linha de quem
 * pedala, e o começo da conversa sobre frota, que é o assunto do jogo.
 */

export type IdDaLoja =
  | "bicicleta"
  | "patins"
  | "triciclo"
  | "patinete"
  | "caiaque"
  | "skate";

export interface DegrauDaLoja {
  /** De 1 a 5, do mais simples ao elétrico. */
  nivel: number;
  nome: string;
}

export interface ItemDaLoja {
  id: IdDaLoja;
  nome: string;
  /** Uma linha dizendo para que serve. Sem número: número ainda não existe. */
  sobre: string;
  degraus: readonly DegrauDaLoja[];
  /** O desenho dele, que ele mandou em 14/09/2026. */
  desenho: string;
  /*
   * ── O QUE O RENAN PODE ANDAR HOJE ───────────────────────────────────────
   *
   * Ordem dele, 14/09/2026: "tela de loja deve ter essas caixas para seleção,
   * mas Renan só deve mostrar por enquanto bicicleta".
   *
   * Os seis continuam na prateleira, e continuam com o desenho e os cinco
   * degraus. O que muda é que só a bicicleta ABRE — os outros cinco aparecem
   * apagados, com a frase dizendo que ainda não.
   *
   * Apagado e não escondido, de propósito: uma prateleira com um item só faz a
   * pessoa achar que o jogo acabou ali. Com os seis à vista, ela vê para onde
   * o jogo vai — que é exatamente o que uma loja serve para fazer.
   */
  disponivel: boolean;
}

/** A pasta dos desenhos da loja. */
const DESENHO = "/assets/xbwapp/XBW_loja_";

/** Todo item da loja tem os mesmos cinco degraus. */
export const DEGRAUS_POR_ITEM = 5;

function escada(nomes: readonly string[]): readonly DegrauDaLoja[] {
  return nomes.map((nome, i) => ({ nivel: i + 1, nome }));
}

export const LOJA_DA_EQUIPE: readonly ItemDaLoja[] = [
  {
    id: "bicicleta",
    nome: "Bicicleta",
    sobre: "O jeito de sempre, do quadro simples ao motor",
    degraus: escada([
      "Bicicleta comum",
      "Bicicleta com marchas",
      "Bicicleta de carga",
      "Bicicleta assistida",
      "Bicicleta elétrica",
    ]),
    desenho: `${DESENHO}bicicleta.webp`,
    disponivel: true,
  },
  {
    id: "patins",
    nome: "Patins",
    sobre: "Leve e rápido no curto, sem lugar para carga",
    degraus: escada([
      "Patins comum",
      "Patins com rolamento bom",
      "Patins de velocidade",
      "Patins com freio de disco",
      "Patins elétrico",
    ]),
    desenho: `${DESENHO}patins.webp`,
    disponivel: false,
  },
  {
    id: "triciclo",
    nome: "Triciclo",
    sobre: "Devagar e firme, feito para levar peso",
    degraus: escada([
      "Triciclo comum",
      "Triciclo com caçamba",
      "Triciclo de carga",
      "Triciclo assistido",
      "Triciclo elétrico",
    ]),
    desenho: `${DESENHO}triciclo.webp`,
    disponivel: false,
  },
  {
    id: "patinete",
    nome: "Patinete",
    sobre: "Cabe em qualquer lugar e sobe pouco",
    degraus: escada([
      "Patinete comum",
      "Patinete de roda grande",
      "Patinete de carga",
      "Patinete assistido",
      "Patinete elétrico",
    ]),
    desenho: `${DESENHO}patinete.webp`,
    disponivel: false,
  },
  {
    id: "caiaque",
    nome: "Caiaque",
    sobre: "Para o trecho de água, quando houver",
    degraus: escada([
      "Caiaque comum",
      "Caiaque com porta-carga",
      "Caiaque de casco duplo",
      "Caiaque com motor de apoio",
      "Caiaque elétrico",
    ]),
    desenho: `${DESENHO}caiaque.webp`,
    disponivel: false,
  },
  {
    id: "skate",
    nome: "Skate",
    sobre: "Barato de começar, difícil de carregar",
    degraus: escada([
      "Skate comum",
      "Skate longboard",
      "Skate de carga",
      "Skate assistido",
      "Skate elétrico",
    ]),
    desenho: `${DESENHO}skate.webp`,
    disponivel: false,
  },
];

/** Um item da loja pelo nome de dentro. O primeiro, se o nome nao existir. */
export const itemDaLoja = (id: IdDaLoja): ItemDaLoja =>
  LOJA_DA_EQUIPE.find(i => i.id === id) ?? LOJA_DA_EQUIPE[0]!;

/**
 * A frase que a tela de um item mostra no lugar do preço.
 *
 * Ela existe para que a tela vazia DIGA que está vazia. Uma lista de cinco
 * nomes sem aviso nenhum parece uma loja quebrada; com a frase, parece o que é:
 * o lugar pronto, esperando os números.
 */
export const AINDA_SEM_PRECO = "ainda sem preço";

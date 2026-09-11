/**
 * A LOJA DENTRO DO APLICATIVO — catalogo, carrinho e pedido.
 *
 * Ordem dele, 07/09/2026: o aplicativo tem que ter "funcoes loja, tudo que o
 * whats app tem". No aplicativo de verdade a parte comercial e isto: cada loja
 * mostra um catalogo, o cliente junta itens num carrinho e manda o pedido pela
 * propria conversa. Aqui e igual — com uma diferenca que muda o jogo inteiro.
 *
 * ── A DIFERENCA: QUEM MONTA O PEDIDO DESCOBRE O PESO ──────────────────────
 *
 * Num aplicativo comum o carrinho e do cliente. Aqui o carrinho tambem serve
 * ao ENTREGADOR, porque cada produto tem PESO, e peso e o que enche a mochila.
 * A pessoa deixa de aceitar "uma entrega" e passa a aceitar "quatro quilos de
 * pao mais um vaso de flor" — que e uma decisao de verdade, com a mochila dela
 * na frente.
 *
 * ── O PRECO DA CORRIDA NAO E INVENTADO ────────────────────────────────────
 *
 * Ordem antiga dele, e ela continua valendo: o pagamento e CALCULO DE FRETE —
 * parte fixa, parte por quilometro, parte por item. Este arquivo nao inventa
 * premio nenhum; ele chama a conta que o jogo ja tem e passa a distancia real
 * ate a porta. Loja nova, produto novo, nada disso mexe na conta.
 *
 * ── OS PRECOS DOS PRODUTOS SAO PROVISORIOS ────────────────────────────────
 *
 * Sao precos de bairro, redondos, para a tela ficar plausivel. Tabelar preco e
 * decisao dele; mexer aqui nao quebra nada em lugar nenhum.
 */
import { calcularFrete } from "../freight";
import type { IdContato, ItemDoCarrinho, Pedido, Produto } from "./tipos";

/** Quanto peso cabe na mochila, por nivel dela. O nivel 1 e o do comeco. */
export const MOCHILA_POR_NIVEL: readonly number[] = [4, 8, 14, 22];

/** O catalogo, loja por loja. */
export const PRODUTOS: readonly Produto[] = [
  /*
   * Pizzaria — a base do entregador, e por isso tambem uma loja de verdade.
   * Toda loja do aplicativo precisa de catalogo: loja sem catalogo abre uma
   * tela vazia quando alguem toca no perfil dela.
   */
  {
    id: "pizza-mussarela",
    loja: "pizzaria",
    nome: "Pizza de mussarela",
    preco: 45,
    peso: 1.1,
    descricao: "Grande, forno a lenha",
  },
  {
    id: "pizza-calabresa",
    loja: "pizzaria",
    nome: "Pizza de calabresa",
    preco: 49,
    peso: 1.2,
    descricao: "Grande, com cebola",
  },
  {
    id: "esfiha",
    loja: "pizzaria",
    nome: "Esfihas (6)",
    preco: 24,
    peso: 0.7,
    descricao: "Carne e queijo",
  },
  {
    id: "refri-pizzaria",
    loja: "pizzaria",
    nome: "Refrigerante 2L",
    preco: 12,
    peso: 2.1,
    descricao: "Gelado",
  },

  // Padaria
  {
    id: "pao",
    loja: "padaria",
    nome: "Pão francês (10)",
    preco: 9,
    peso: 0.8,
    descricao: "Saco quente, sai do forno às 6h",
  },
  {
    id: "bolo",
    loja: "padaria",
    nome: "Bolo de fubá",
    preco: 22,
    peso: 1.2,
    descricao: "Inteiro, na forma de papel",
  },
  {
    id: "leite",
    loja: "padaria",
    nome: "Leite (6 caixas)",
    preco: 34,
    peso: 6,
    descricao: "Pesado — cuidado com a mochila",
  },
  {
    id: "cafe",
    loja: "padaria",
    nome: "Café moído 500g",
    preco: 18,
    peso: 0.5,
    descricao: "Torra média",
  },

  // Lanchonete
  {
    id: "xis",
    loja: "lanchonete",
    nome: "Lanche completo",
    preco: 28,
    peso: 0.6,
    descricao: "Vai esfriando — prazo curto",
  },
  {
    id: "refri",
    loja: "lanchonete",
    nome: "Refrigerante 2L",
    preco: 12,
    peso: 2.1,
    descricao: "Não deitar na mochila",
  },
  {
    id: "porcao",
    loja: "lanchonete",
    nome: "Porção de batata",
    preco: 32,
    peso: 0.9,
    descricao: "Embalagem que amassa fácil",
  },

  // Farmacia
  {
    id: "remedio",
    loja: "farmacia",
    nome: "Receita de uso contínuo",
    preco: 76,
    peso: 0.2,
    descricao: "Urgente, e sempre é",
  },
  {
    id: "fralda",
    loja: "farmacia",
    nome: "Fralda pacote grande",
    preco: 68,
    peso: 3.4,
    descricao: "Volumoso, leve para o peso",
  },
  {
    id: "termometro",
    loja: "farmacia",
    nome: "Termômetro",
    preco: 39,
    peso: 0.1,
    descricao: "Frágil",
  },

  // Floricultura
  {
    id: "buque",
    loja: "floricultura",
    nome: "Buquê de rosas",
    preco: 89,
    peso: 1.1,
    descricao: "Não pode virar de lado",
  },
  {
    id: "vaso",
    loja: "floricultura",
    nome: "Vaso com orquídea",
    preco: 145,
    peso: 3.8,
    descricao: "Frágil e desequilibra a mochila",
  },

  // Papelaria
  {
    id: "caderno",
    loja: "papelaria",
    nome: "Kit escolar",
    preco: 64,
    peso: 2.2,
    descricao: "Caixa fechada",
  },
  {
    id: "resma",
    loja: "papelaria",
    nome: "Resma de papel",
    preco: 29,
    peso: 2.5,
    descricao: "Peso concentrado",
  },
  {
    id: "tinta",
    loja: "papelaria",
    nome: "Cartucho de tinta",
    preco: 118,
    peso: 0.3,
    descricao: "Caro — some fácil",
  },
];

const POR_ID: ReadonlyMap<string, Produto> = new Map(
  PRODUTOS.map(p => [p.id, p] as const)
);

export function produto(id: string): Produto | undefined {
  return POR_ID.get(id);
}

/** O catalogo de uma loja. */
export function catalogoDa(loja: IdContato): readonly Produto[] {
  return PRODUTOS.filter(p => p.loja === loja);
}

/** Quanto o carrinho custa em mercadoria — sem frete. */
export function valorDoCarrinho(itens: readonly ItemDoCarrinho[]): number {
  return itens.reduce(
    (soma, i) => soma + (produto(i.produto)?.preco ?? 0) * i.quantidade,
    0
  );
}

/** Quanto o carrinho PESA. E este numero que briga com a mochila. */
export function pesoDoCarrinho(itens: readonly ItemDoCarrinho[]): number {
  return itens.reduce(
    (soma, i) => soma + (produto(i.produto)?.peso ?? 0) * i.quantidade,
    0
  );
}

/** Quantos volumes sao, no total — o que a conta de frete chama de itens. */
export function volumesDoCarrinho(itens: readonly ItemDoCarrinho[]): number {
  return itens.reduce((soma, i) => soma + i.quantidade, 0);
}

/** Se cabe na mochila daquele nivel. */
export function cabeNaMochila(
  itens: readonly ItemDoCarrinho[],
  nivelDaMochila: number
): boolean {
  const limite =
    MOCHILA_POR_NIVEL[
      Math.max(0, Math.min(nivelDaMochila - 1, MOCHILA_POR_NIVEL.length - 1))
    ] ?? MOCHILA_POR_NIVEL[0]!;
  return pesoDoCarrinho(itens) <= limite;
}

/**
 * O FRETE DESTA CORRIDA.
 *
 * Chama a conta do jogo, com a classe bicicleta e a distancia real. Nao ha
 * numero de premio escrito em lugar nenhum — nem aqui, nem nas telas.
 */
export function freteDoPedido(
  itens: readonly ItemDoCarrinho[],
  km: number
): number {
  return calcularFrete("bicicleta", km, volumesDoCarrinho(itens));
}

/** Junta ou soma um item no carrinho, sem repetir linha. */
export function somarAoCarrinho(
  carrinho: readonly ItemDoCarrinho[],
  produtoId: string,
  quantidade = 1
): readonly ItemDoCarrinho[] {
  const achou = carrinho.find(i => i.produto === produtoId);
  if (!achou) {
    return quantidade > 0
      ? [...carrinho, { produto: produtoId, quantidade }]
      : carrinho;
  }
  const nova = achou.quantidade + quantidade;
  if (nova <= 0) return carrinho.filter(i => i.produto !== produtoId);
  return carrinho.map(i =>
    i.produto === produtoId ? { ...i, quantidade: nova } : i
  );
}

let contador = 0;

/** Abre um pedido novo. O numero e curto de proposito — cabe num balao. */
export function abrirPedido(dados: {
  loja: IdContato;
  cliente: IdContato;
  itens: readonly ItemDoCarrinho[];
  km: number;
  minuto: number;
  prazoMin: number;
}): Pedido {
  contador += 1;
  return {
    numero: `#${String(1000 + contador)}`,
    loja: dados.loja,
    cliente: dados.cliente,
    itens: dados.itens,
    estado: "novo",
    minuto: dados.minuto,
    prazoMin: dados.prazoMin,
    frete: freteDoPedido(dados.itens, dados.km),
    gorjeta: 0,
  };
}

/** Zera o contador de pedidos. So os testes usam, para nao dependerem de ordem. */
export function reiniciarNumeracao(): void {
  contador = 0;
}

/** Dinheiro do jeito que a tela mostra. */
export function emReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

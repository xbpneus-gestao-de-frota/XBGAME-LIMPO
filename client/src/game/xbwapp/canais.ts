/**
 * OS CANAIS — um fala, muitos seguem, ninguem responde.
 *
 * Ordem dele, 07/09/2026: "ATUALIZAÇÕES MOSTRAR STATUS, E CANAIS TAMBEM, REAL,
 * COM TODAS FUNÇÕES REAIS DO WHATS APP".
 *
 * ── POR QUE CANAL NAO E CONVERSA ─────────────────────────────────────────
 *
 * Se as publicacoes entrassem em `mensagens`, todo canal viraria uma linha na
 * lista de conversas, e a lista de conversas do jogador — que e onde mora o
 * trabalho dele — encheria de propaganda. No aplicativo de verdade e igual:
 * canal fica em Atualizacoes, nunca em Conversas.
 *
 * ── E POR QUE OS CANAIS JA EXISTEM, SE NADA MAIS EXISTE ──────────────────
 *
 * A ordem dele foi que nada aparece sozinho nas CONVERSAS: ninguem escreve
 * para o jogador antes de ele falar. Canal e outra coisa: canal e do mundo, do
 * mesmo jeito que a padaria existe no bairro sem o jogador ter feito nada. O
 * que e escolha dele e SEGUIR — e ele comeca sem seguir nenhum.
 */
import type { Canal, PublicacaoDeCanal } from "./tipos";
import type { EstadoDoApp } from "./estado";

/** As carinhas que dao para deixar numa publicacao. */
export const REACOES_DE_CANAL = ["👍", "❤️", "😂", "😮", "🙏", "🚲"] as const;

export const CANAIS: readonly Canal[] = [
  {
    id: "canal-xb",
    nome: "XB Technology",
    descricao: "Avisos do sistema, novidades e melhorias",
    cor: "#12547a",
    seguidores: 12840,
    verificado: true,
  },
  {
    id: "canal-bairro",
    nome: "Avisos do Bairro",
    descricao: "Rua interditada, obra, feira e o que atrapalha a entrega",
    cor: "#7a5a12",
    seguidores: 3120,
  },
  {
    id: "canal-entregadores",
    nome: "Entregadores XB",
    descricao: "Dicas de rota, manutenção da bicicleta e segurança",
    cor: "#12747a",
    seguidores: 1965,
  },
  {
    id: "canal-ofertas",
    nome: "Ofertas do Comércio",
    descricao: "O que as lojas do bairro estão anunciando hoje",
    cor: "#7a1250",
    seguidores: 8430,
  },
];

export const PUBLICACOES: readonly PublicacaoDeCanal[] = [
  {
    id: "p1",
    canal: "canal-xb",
    texto: "Pagamento pelo aplicativo liberado para todas as lojas do bairro.",
    minuto: 8 * 60 + 10,
    reacoes: { "👍": 412, "🙏": 88 },
  },
  {
    id: "p2",
    canal: "canal-bairro",
    texto: "Rua da Praça interditada até as 14h por causa da feira.",
    minuto: 7 * 60 + 40,
    reacoes: { "😮": 61, "👍": 24 },
  },
  {
    id: "p3",
    canal: "canal-entregadores",
    texto:
      "Corrente seca é 15% a mais de esforço. Lubrifique a cada 200 km e o pedal fica leve.",
    minuto: 6 * 60 + 55,
    reacoes: { "👍": 233, "🚲": 140 },
  },
  {
    id: "p4",
    canal: "canal-ofertas",
    texto: "Padaria: pão saindo do forno de hora em hora até as 20h.",
    minuto: 6 * 60 + 30,
    reacoes: { "❤️": 96 },
  },
];

/** O canal, pelo id. */
export function canal(estado: EstadoDoApp, id: string): Canal | undefined {
  return estado.canais.find(c => c.id === id);
}

export function segue(estado: EstadoDoApp, id: string): boolean {
  return estado.seguindo.includes(id);
}

export function seguir(estado: EstadoDoApp, id: string): EstadoDoApp {
  if (!canal(estado, id) || segue(estado, id)) return estado;
  return { ...estado, seguindo: [...estado.seguindo, id] };
}

export function deixarDeSeguir(estado: EstadoDoApp, id: string): EstadoDoApp {
  if (!segue(estado, id)) return estado;
  return { ...estado, seguindo: estado.seguindo.filter(x => x !== id) };
}

/** Quantos seguem, contando o jogador quando ele segue. */
export function quantosSeguem(estado: EstadoDoApp, id: string): number {
  const c = canal(estado, id);
  if (!c) return 0;
  return c.seguidores + (segue(estado, id) ? 1 : 0);
}

/** As publicacoes de um canal, da mais nova para a mais velha. */
export function publicacoesDe(
  estado: EstadoDoApp,
  id: string
): readonly PublicacaoDeCanal[] {
  return estado.publicacoes
    .filter(p => p.canal === id)
    .slice()
    .sort((a, b) => b.minuto - a.minuto);
}

/** A ultima publicacao de um canal — a que aparece na lista. */
export function ultimaDoCanal(
  estado: EstadoDoApp,
  id: string
): PublicacaoDeCanal | undefined {
  return publicacoesDe(estado, id)[0];
}

/** Os canais que ele segue, o mais movimentado primeiro. */
export function canaisQueSigo(estado: EstadoDoApp): readonly Canal[] {
  return estado.canais
    .filter(c => segue(estado, c.id))
    .slice()
    .sort(
      (a, b) =>
        (ultimaDoCanal(estado, b.id)?.minuto ?? 0) -
        (ultimaDoCanal(estado, a.id)?.minuto ?? 0)
    );
}

/** Os canais que ele ainda nao segue — a parte de "descobrir". */
export function canaisParaDescobrir(estado: EstadoDoApp): readonly Canal[] {
  return estado.canais
    .filter(c => !segue(estado, c.id))
    .slice()
    .sort((a, b) => b.seguidores - a.seguidores);
}

/**
 * REAGIR — a unica coisa que quem segue pode fazer.
 *
 * Uma carinha por pessoa por publicacao: tocar de novo na mesma tira, tocar em
 * outra troca. E o mesmo comportamento das reacoes na conversa, e por isso a
 * pessoa nao precisa aprender duas regras.
 */
export function reagirNaPublicacao(
  estado: EstadoDoApp,
  publicacao: string,
  carinha: string
): EstadoDoApp {
  return {
    ...estado,
    publicacoes: estado.publicacoes.map(p =>
      p.id !== publicacao
        ? p
        : { ...p, minhaReacao: p.minhaReacao === carinha ? undefined : carinha }
    ),
  };
}

/** Quantas carinhas daquele tipo a publicacao tem, contando a do jogador. */
export function contarReacao(p: PublicacaoDeCanal, carinha: string): number {
  return (p.reacoes[carinha] ?? 0) + (p.minhaReacao === carinha ? 1 : 0);
}

/** O total de carinhas de uma publicacao. */
export function totalDeReacoes(p: PublicacaoDeCanal): number {
  const soma = Object.values(p.reacoes).reduce((a, b) => a + b, 0);
  return soma + (p.minhaReacao ? 1 : 0);
}

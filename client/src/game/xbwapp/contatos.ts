/**
 * QUEM EXISTE DENTRO DO XBWAPP.
 *
 * O elenco do aplicativo: o amigo que abre o jogo, o sistema que orienta, as
 * lojas que despacham, os moradores que recebem e a roda dos entregadores.
 *
 * ── OS NOMES SAO PROVISORIOS, E ISSO ESTA DITO DE PROPOSITO ───────────────
 *
 * Batizar personagem e decisao dele — ja foi dito para os oito entregadores e
 * para os comercios. Os nomes daqui seguem a mesma regra: servem para o jogo
 * rodar e para ele ver a cara da coisa, e trocam no dia em que ele quiser.
 * Trocar um nome mexe SO nesta lista.
 *
 * ── AS CINCO LOJAS SAO AS DO MAPA, E NAO INVENTADAS ───────────────────────
 *
 * Padaria, Lanchonete, Farmacia, Floricultura e Papelaria sao os comercios que
 * ja tem nome no desenho do bairro. Loja de aplicativo que nao existe no mapa
 * seria uma coleta em lugar nenhum.
 *
 * ── QUEM NAO TEM RETRATO APARECE COM AS INICIAIS ──────────────────────────
 *
 * Os oito entregadores tem desenho; o Renan tem desenho. Moradores e lojas
 * nao — e inventar dezenas de rostos seria inventar dezenas de arquivos. A
 * roda com as iniciais e o que todo aplicativo de mensagem faz, cabe em CSS e
 * nunca fica desatualizada.
 */
import { GAME_ASSETS } from "../assets";
import type { Contato, IdContato } from "./tipos";

/** O jogador. O aplicativo e dele; este e o perfil que os outros veem. */
export const VOCE = {
  id: "voce" as const,
  sobre: "Entregador XB · disponível",
} as const;

/** As cores das rodas de inicial. Sao escolhidas, nao sorteadas. */
/**
 * A PASTA DOS RETRATOS DOS MORADORES.
 *
 * Os oito primeiros chegaram desenhados em 08/09/2026, numa folha so; os oito
 * seguintes em 09/09/2026, na mesma folha unica. Cada um foi recortado, o
 * fundo desfocado e o anel branco aplicados — o mesmo acabamento do retrato do
 * Renan, para a lista de contatos nao virar uma colcha de retalhos.
 *
 * A segunda folha veio SEM fundo (recorte transparente), entao o fundo marrom
 * foi pintado aqui, com a mesma tonalidade da primeira. Sem isso metade da
 * agenda teria retrato com fundo e metade sem.
 */
const M = "/assets/moradores/XB_morador_";

const COR = {
  pao: "#b4712f",
  lanche: "#c0492f",
  remedio: "#1f7a5a",
  flor: "#a4407a",
  papel: "#3a5fa8",
  casa: "#2f6f7a",
  grupo: "#5a4b9a",
  sistema: "#0f5c8c",
} as const;

/**
 * AS LOJAS.
 *
 * Toda loja tem horario e endereco porque o perfil comercial do aplicativo
 * mostra isso — e porque o jogador precisa saber se a loja esta ABERTA antes
 * de aceitar a coleta. Loja fechada e uma corrida perdida.
 */
export const LOJAS: readonly Contato[] = [
  {
    /*
     * A PIZZARIA E A BASE DO ENTREGADOR.
     *
     * Ordem dele, 08/09/2026: "entregador sai da pizzaria que e onde ele vai
     * estar". Por isso ela entrou na lista: e de onde toda corrida comeca, e o
     * ponto que decide se pegar duas coletas juntas compensa ou nao.
     *
     * O nome e IGUAL ao do desenho do bairro de proposito — e assim que o
     * aplicativo acha a porta dela no mapa. Mudar o nome aqui sem mudar la faz
     * a corrida sair de lugar nenhum.
     */
    id: "pizzaria",
    nome: "Pizzaria Forno de Pedra",
    tipo: "loja",
    cor: COR.lanche,
    sobre: "Forno a lenha · ponto de apoio dos entregadores XB",
    horario: "18:00 às 00:00",
    endereco: "Comércio no mapa do bairro",
    online: true,
  },
  {
    id: "padaria",
    nome: "Padaria",
    tipo: "loja",
    cor: COR.pao,
    sobre: "Pão quente das 6 às 20 · encomendas pelo XBWAPP",
    horario: "06:00 às 20:00",
    endereco: "Comércio no mapa do bairro",
    online: true,
  },
  {
    id: "lanchonete",
    nome: "Lanchonete",
    tipo: "loja",
    cor: COR.lanche,
    sobre: "Lanche na hora · entrega no bairro todo",
    horario: "10:00 às 23:00",
    endereco: "Comércio no mapa do bairro",
    online: true,
  },
  {
    id: "farmacia",
    nome: "Farmácia",
    tipo: "loja",
    cor: COR.remedio,
    sobre: "Medicamentos e urgências · 24 horas",
    horario: "24 horas",
    endereco: "Comércio no mapa do bairro",
    online: true,
  },
  {
    id: "floricultura",
    nome: "Floricultura",
    tipo: "loja",
    cor: COR.flor,
    sobre: "Buquês e arranjos · entrega com cuidado",
    horario: "08:00 às 18:00",
    endereco: "Comércio no mapa do bairro",
    online: false,
  },
  {
    id: "papelaria",
    nome: "Papelaria",
    tipo: "loja",
    cor: COR.papel,
    sobre: "Material escolar e escritório",
    horario: "08:00 às 19:00",
    endereco: "Comércio no mapa do bairro",
    online: false,
  },
];

/**
 * OS MORADORES.
 *
 * Cada um mora numa casa NUMERADA — os mesmos numeros que o jogo ja usa para
 * dizer "entrega na casa 8, 12, 34". O numero e o endereco: por isso ele
 * aparece embaixo do nome na lista, e nao so no perfil.
 */
export const MORADORES: readonly Contato[] = [
  {
    id: "casa1",
    nome: "Cláudia",
    tipo: "pessoa",
    foto: `${M}claudia.webp`,
    sobre: "casa 1 · mãe de gêmeos, pede sempre em dobro",
    endereco: "casa 1",
    online: true,
  },
  {
    id: "casa2",
    nome: "Seu Genaro",
    tipo: "pessoa",
    foto: `${M}genaro.webp`,
    sobre: "casa 2 · acorda às 5h, reclama de entrega depois das 20h",
    endereco: "casa 2",
    online: true,
  },
  {
    id: "casa3",
    nome: "Seu Aparecido",
    tipo: "pessoa",
    foto: `${M}aparecido.webp`,
    sobre: "casa 3 · mecânico, pede para deixar no banco da varanda",
    endereco: "casa 3",
    online: true,
  },
  {
    id: "casa4",
    nome: "Dona Sebastiana",
    tipo: "pessoa",
    foto: `${M}sebastiana.webp`,
    sobre: "casa 4 · faz bolo toda quarta",
    endereco: "casa 4",
    online: true,
  },
  {
    id: "casa5",
    nome: "Waldir",
    tipo: "pessoa",
    foto: `${M}waldir.webp`,
    sobre: "casa 5 · trabalha de madrugada, só recebe à tarde",
    endereco: "casa 5",
    online: false,
  },
  {
    id: "casa6",
    nome: "Dona Marlene",
    tipo: "pessoa",
    foto: `${M}marlene.webp`,
    sobre: "casa 6 · costureira, sempre dá caixinha",
    endereco: "casa 6",
    online: true,
  },
  {
    id: "casa7",
    nome: "Dona Zica",
    tipo: "pessoa",
    foto: `${M}zica.webp`,
    sobre: "casa 7 · a mais antiga da rua, conhece todo mundo",
    endereco: "casa 7",
    online: true,
  },
  {
    id: "casa8",
    nome: "Dona Divina",
    tipo: "pessoa",
    foto: `${M}divina.webp`,
    sobre: "casa 8 · rega as plantas às 7h, atende na calçada",
    endereco: "casa 8",
    online: true,
  },
  /*
   * ── A SEGUNDA FOLHA DE MORADORES ─────────────────────────────────────────
   *
   * Chegou desenhada em 09/09/2026, com oito rostos: Rogerio, Lourdes,
   * Terezinha, Cida, Vera, Ilda, Adriano e Silvana. Sao EXATAMENTE as casas 9
   * a 16 da lista de moradores do bairro — mesma idade, mesma mania — entao
   * cada retrato entrou na casa que ja era dele, e nao numa casa qualquer.
   *
   * A Cida ja estava aqui de roda de inicial. Agora tem cara: a linha da `cor`
   * virou linha de `foto`, que era exatamente o combinado.
   */
  {
    id: "casa9",
    nome: "Rogério Martins",
    tipo: "pessoa",
    foto: `${M}rogerio.webp`,
    sobre: "casa 9 · bebê dormindo: não toque a campainha, bata palma",
    endereco: "casa 9",
    online: true,
  },
  {
    id: "casa10",
    nome: "Dona Lourdes",
    tipo: "pessoa",
    foto: `${M}lourdes.webp`,
    sobre: "casa 10 · faz quitanda para fora, manda mais do que recebe",
    endereco: "casa 10",
    online: true,
  },
  {
    id: "casa11",
    nome: "Dona Terezinha",
    tipo: "pessoa",
    foto: `${M}terezinha.webp`,
    sobre: "casa 11 · portão encostado, manda deixar na mesa da cozinha",
    endereco: "casa 11",
    online: true,
  },
  {
    id: "casa12",
    nome: "Dona Cida",
    tipo: "pessoa",
    foto: `${M}cida.webp`,
    sobre: "casa 12 · cuida de três netos, pedido grande e sempre com refrigerante",
    endereco: "casa 12",
    online: true,
  },
  {
    id: "casa13",
    nome: "Vera Siqueira",
    tipo: "pessoa",
    foto: `${M}vera.webp`,
    sobre: "casa 13 · professora, pede papelaria em semana de prova",
    endereco: "casa 13",
    online: true,
  },
  {
    id: "casa14",
    nome: "Dona Ilda",
    tipo: "pessoa",
    foto: `${M}ilda.webp`,
    sobre: "casa 14 · de manhã está em casa; à tarde joga baralho na casa da Zica",
    endereco: "casa 14",
    online: true,
  },
  {
    id: "casa15",
    nome: "Adriano Rocha",
    tipo: "pessoa",
    foto: `${M}adriano.webp`,
    sobre: "casa 15 · trabalha em casa, recebe a qualquer hora mas demora a descer",
    endereco: "casa 15",
    online: true,
  },
  {
    id: "casa16",
    nome: "Silvana Almeida",
    tipo: "pessoa",
    foto: `${M}silvana.webp`,
    sobre: "casa 16 · cachorro grande no quintal, deixar no portãozinho lateral",
    endereco: "casa 16",
    online: false,
  },
  /*
   * ── OS DOIS QUE AINDA ESPERAM DESENHO ────────────────────────────────────
   *
   * Ficam aqui porque o balcao ja entrega nestes enderecos e porque a roda com
   * as iniciais nao mente: e o que todo aplicativo de mensagem faz com quem
   * ainda nao tem foto. Quando os desenhos deles chegarem, e so trocar a linha
   * da `cor` por uma linha de `foto` — foi o que acabou de acontecer com a
   * Cida.
   */
  {
    id: "casa21",
    nome: "Seu Nivaldo",
    tipo: "pessoa",
    cor: COR.casa,
    sobre: "casa 21 · em dia de jogo não atende",
    endereco: "casa 21",
    online: true,
  },
  {
    id: "casa34",
    nome: "Seu Orlando",
    tipo: "pessoa",
    cor: COR.casa,
    sobre: "casa 34 · sai cedo, pede para deixar com a vizinha",
    endereco: "casa 34",
    online: false,
  },
];

/** Os oito entregadores — os mesmos da tela do portao, com os mesmos desenhos. */
export const ENTREGADORES: readonly Contato[] = [
  {
    id: "teo",
    nome: "Téo",
    tipo: "pessoa",
    foto: "/assets/XB_Entregador_1.webp",
    sobre: "Rodando desde cedo",
    online: true,
  },
  {
    id: "duda",
    nome: "Duda",
    tipo: "pessoa",
    foto: "/assets/XB_Entregador_2.webp",
    sobre: "Bateria fraca sempre",
    online: true,
  },
  {
    id: "kau",
    nome: "Kau",
    tipo: "pessoa",
    foto: "/assets/XB_Entregador_3.webp",
    sobre: "Só aceito rota curta",
    online: false,
  },
  {
    id: "rafa",
    nome: "Rafa",
    tipo: "pessoa",
    foto: "/assets/XB_Entregador_4.webp",
    sobre: "Ocupada",
    online: false,
  },
  {
    id: "nino",
    nome: "Nino",
    tipo: "pessoa",
    foto: "/assets/XB_Entregador_5.webp",
    sobre: "Bora que hoje rende",
    online: true,
  },
  {
    id: "lia",
    nome: "Lia",
    tipo: "pessoa",
    foto: "/assets/XB_Entregador_6.webp",
    sobre: "Conheço todo atalho",
    online: false,
  },
  {
    id: "bento",
    nome: "Bento",
    tipo: "pessoa",
    foto: "/assets/XB_Entregador_7.webp",
    sobre: "Pneu novo, vida nova",
    online: false,
  },
  {
    id: "manu",
    nome: "Manu",
    tipo: "pessoa",
    foto: "/assets/XB_Entregador_8.webp",
    sobre: "Chego já",
    online: true,
  },
];

/** O amigo que liga na abertura, e o sistema da historia. */
export const RENAN: Contato = {
  id: "renan",
  nome: "Renan",
  tipo: "pessoa",
  foto: GAME_ASSETS.renanAvatar,
  sobre: "Gente fina",
  online: true,
};

/**
 * O RENAN DEPOIS DO EQUIPAMENTO.
 *
 * Ordem dele, 08/09/2026: "renan so muda de desenho no aplicativo, apos
 * receber equipamentos".
 *
 * SAO DUAS COISAS DIFERENTES, e ele separou de proposito: uma e o acordo
 * (ele topou trabalhar), outra e o equipamento chegar na mao dele. O retrato
 * muda na SEGUNDA. Faz sentido em qualquer empresa: o contrato nao muda a
 * roupa de ninguem; a caixa com o uniforme, a luva e a bicicleta muda.
 *
 * Hoje as duas coisas acontecem quase juntas — a caixa do drone traz a
 * bicicleta e ele entra na frota no mesmo instante. Ainda assim ficam
 * separadas aqui, porque no dia em que contratar e equipar deixarem de
 * coincidir (e vao, quando houver oito entregadores), nada precisa ser
 * reescrito.
 *
 * ── POR QUE A TROCA E FEITA AQUI, E NAO EM CADA TELA ──────────────────────
 *
 * O retrato do Renan aparece na lista, no alto da conversa, no perfil, no
 * grupo, na tela de chamadas e nas cobrancas — seis lugares. Bastaria
 * esquecer um para o jogo mostrar duas caras da mesma pessoa na mesma sessao.
 * Aqui e um lugar so, e todas as telas leem daqui.
 *
 * O NOME NAO MUDA, e o id tambem nao.
 */
let renanContratado = false;
let renanEquipado = false;

/** Marca que o Renan topou o trabalho. Nao mexe no retrato. */
export function oRenanFoiContratado(sim = true): void {
  renanContratado = sim;
}

/** Se o Renan ja e da casa. */
export function renanJaEhDaCasa(): boolean {
  return renanContratado;
}

/** O equipamento chegou: e AQUI que o retrato dele muda no aplicativo. */
export function oRenanRecebeuEquipamento(sim = true): void {
  renanEquipado = sim;
  RENAN.foto = sim ? GAME_ASSETS.renanEquipado : GAME_ASSETS.renanAvatar;
}

/** Se ele ja esta de uniforme. */
export function renanJaEstaEquipado(): boolean {
  return renanEquipado;
}

export const XB_TECHNOLOGY: Contato = {
  id: "xb",
  nome: "XB Technology",
  tipo: "sistema",
  cor: COR.sistema,
  sobre: "Sistema oficial · avisos e melhorias",
  online: true,
};

/** A roda dos entregadores — o grupo do bairro. */
export const GRUPO_ENTREGADORES: Contato = {
  id: "grupo-bairro",
  nome: "Entregadores do Bairro",
  tipo: "grupo",
  cor: COR.grupo,
  sobre: "Grupo · 9 participantes",
  membros: ["voce", ...ENTREGADORES.map(e => e.id)],
};

/** Todo mundo, numa lista so. */
export const CONTATOS: readonly Contato[] = [
  RENAN,
  XB_TECHNOLOGY,
  GRUPO_ENTREGADORES,
  ...LOJAS,
  ...MORADORES,
  ...ENTREGADORES,
];

const POR_ID: ReadonlyMap<IdContato, Contato> = new Map(
  CONTATOS.map(c => [c.id, c] as const)
);

/** Acha um contato pelo id. Devolve undefined quando o id nao existe. */
export function contato(id: IdContato): Contato | undefined {
  return POR_ID.get(id);
}

/** O nome que aparece na tela, com um recuo honesto quando o id e desconhecido. */
export function nomeDe(id: IdContato | "voce"): string {
  if (id === "voce") return "Você";
  return POR_ID.get(id)?.nome ?? id;
}

/** As duas letras da roda de inicial: "Dona Ilda" vira "DI", "Padaria" vira "PA". */
export function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return (partes[0]![0]! + partes[partes.length - 1]![0]!).toUpperCase();
}

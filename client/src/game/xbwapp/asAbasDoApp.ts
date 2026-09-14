/**
 * AS ABAS DO RODAPE — quais existem, e quais estao no ar hoje.
 *
 * Ordem dele, 13/09/2026: "retire do app por enquanto recibo, ligacoes,
 * atualizacoes, vamos aumentar mais os icones ate onde der".
 *
 * ── POR QUE UM INTERRUPTOR, E NAO APAGAR ──────────────────────────────────
 *
 * "Por enquanto" e a palavra que decide. As tres telas existem, tem desenho
 * proprio e vao voltar; apagar o codigo delas transformaria um ajuste de
 * rodape num trabalho de reconstrucao quando ele quisesse de volta.
 *
 * Entao a lista abaixo e a barra INTEIRA, na ordem de sempre, e `NO_AR` diz
 * quais aparecem. Trazer uma de volta e tirar o nome dela de `ESCONDIDAS` —
 * uma linha, e a aba volta com o desenho certo e no lugar certo.
 *
 * ── E POR QUE A LISTA MORA AQUI, E NAO NA TELA ────────────────────────────
 *
 * Porque o desenho de cada aba estava preso a POSICAO dela na barra: a
 * primeira usava o desenho de conversas, a segunda o de atualizacoes, e assim
 * por diante. Tirar tres abas teria trocado todos os desenhos de lugar sem
 * nenhum erro aparecer — o rodape ficaria com os icones errados e pronto.
 *
 * Com a lista aqui e cada aba carregando o proprio nome na tela, o desenho
 * passa a seguir o NOME. A ordem pode mudar quantas vezes ele quiser.
 */

/** Todas as abas que a barra conhece, na ordem em que aparecem. */
export type NomeDaAba =
  | "conversas"
  | "contatos"
  | "pedidos"
  | "atualizacoes"
  | "ligacoes"
  | "ferramentas"
  | "entregaRapida"
  | "recibo";

export interface AbaDoApp {
  nome: NomeDaAba;
  rotulo: string;
}

export const ABAS_DO_APP: readonly AbaDoApp[] = [
  { nome: "conversas", rotulo: "Conversas" },
  /*
   * CONTATOS entrou em 13/09/2026, ordem dele: "ficou faltando". Fica logo
   * depois de Conversas porque as duas respondem a mesma pergunta em ordens
   * opostas — "o que me disseram" e "com quem eu falo" — e quem nao acha um
   * nome na primeira procura na segunda.
   */
  { nome: "contatos", rotulo: "Contatos" },
  /*
   * PEDIDOS entrou em 14/09/2026, ordem dele: "vamos substituir icones
   * inferiores nas telas onde devem aparecer no game, adicionando icone que
   * liga a tela de pedidos".
   *
   * O balcao de pedidos ja existia — mas so se chegava nele por dentro da
   * ficha de um entregador, tres toques adiante. Trabalho que acontece o dia
   * inteiro nao pode morar no terceiro degrau de outra coisa.
   *
   * Fica no MEIO da barra, e nao no fim: e o polegar que decide a ordem, e o
   * meio da barra e onde ele cai parado.
   */
  { nome: "pedidos", rotulo: "Pedidos" },
  { nome: "atualizacoes", rotulo: "Atualizações" },
  { nome: "ligacoes", rotulo: "Ligações" },
  { nome: "ferramentas", rotulo: "Ferramentas" },
  /*
   * "Equipe", e nao "Entrega Rápida" — ordem dele, 13/09/2026: "vamos deixar o
   * nome como equipe por enquanto". Com quatro desenhos grandes no rodapé, o
   * nome comprido era cortado ("Entrega Rá..."), e um nome cortado nao ensina
   * nada. O NOME INTERNO da aba continua o mesmo de proposito: trocar so a
   * palavra que aparece nao mexe em nenhuma outra parte do jogo.
   */
  { nome: "entregaRapida", rotulo: "Equipe" },
  { nome: "recibo", rotulo: "Recibo" },
];

/**
 * AS QUE ESTAO FORA DO AR HOJE. Decisao dele, 13/09/2026.
 *
 * Tirar um nome daqui devolve a aba inteira: desenho, rotulo e tela.
 */
export const ESCONDIDAS: ReadonlySet<NomeDaAba> = new Set<NomeDaAba>([
  "atualizacoes",
  "ligacoes",
  "recibo",
]);

/** As abas que aparecem no rodape agora. */
export const NO_AR: readonly AbaDoApp[] = ABAS_DO_APP.filter(
  a => !ESCONDIDAS.has(a.nome)
);

/** Esta aba pode ser aberta agora? */
export const estaNoAr = (nome: NomeDaAba): boolean => !ESCONDIDAS.has(nome);

/**
 * PARA ONDE IR quando a aba pedida esta fora do ar.
 *
 * Existe porque o jogo pode mandar abrir o aplicativo direto numa aba — e se
 * essa aba estiver escondida, a pessoa cairia num aplicativo sem tela
 * nenhuma, com a barra apontando para um lugar que nao existe.
 */
export const abaValida = (nome: NomeDaAba | undefined): NomeDaAba =>
  nome && estaNoAr(nome) ? nome : (NO_AR[0]?.nome ?? "conversas");

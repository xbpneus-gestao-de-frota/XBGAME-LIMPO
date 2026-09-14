/**
 * A CENA DA CHAMADA — o que acontece DEPOIS de atender o Renan.
 *
 * Ordem dele, 12/09/2026: "aplicar a chamada de Renan na cut cine".
 *
 * ── O QUE FALTAVA ─────────────────────────────────────────────────────────
 *
 * A ligacao ja existia inteira: o telefone toca, treme, tem retrato, recusar e
 * atender. So que atender caia DIRETO na conversa escrita — o Renan nunca
 * aparecia. A pessoa aceitava uma chamada de video e nunca via video nenhum.
 *
 * ── POR QUE A LIGACAO CAI ─────────────────────────────────────────────────
 *
 * Nao ha voz gravada do Renan nem desenho dele falando: so retratos parados.
 * Fingir uma conversa de video com boneco parado por quinze segundos e pior do
 * que nao ter cena.
 *
 * Entao a ligacao CAI. E nao e desculpa: e o motivo de os dois irem para o
 * texto. A pessoa ve o Renan, a linha morre, e a conversa escrita — que ja
 * estava toda escrita — comeca com o "Bom dia!!" dele, que agora soa como
 * alguem recomecando por escrito o que a linha nao deixou falar.
 *
 * Nenhuma palavra da historia precisou mudar por causa desta cena.
 *
 * ── OS TEMPOS ─────────────────────────────────────────────────────────────
 *
 * Sete segundos no total, e o botao de desligar funciona desde o primeiro. A
 * mesma regra da abertura: quem ja viu nao pode ficar preso.
 */

/**
 * O NOME DA CENA DA ABERTURA.
 *
 * O aplicativo nao sabe desenhar cena nenhuma: ele so CARREGA este nome junto
 * da chamada e devolve "atendeu". Quem ve o nome e toca a cena e o jogo. Por
 * isso ele e um texto, e nao uma funcao — cena nova e um nome novo, e o
 * aplicativo nao muda.
 */
export const CENA_DA_ABERTURA = "renan-abertura";

/**
 * A SEGUNDA CHAMADA DELE — a da pizza.
 *
 * Ordem dele, 13/09/2026: "vamos para uma nova chamada de video de Renan, apos
 * ele dizer 'comi todas as pizzas', manda a imagem, dai dizemos 'tudo bem
 * quando estiver melhor me avisa por favor'".
 *
 * ── POR QUE ELA EXISTE, E NAO E SO UMA PIADA ──────────────────────────────
 *
 * A abertura termina com quem joga mandando o Renan ir comer a pizza dele. Sem
 * esta chamada, o proximo passo do jogo seria trabalho — e o menino que acabou
 * de virar entregador some da historia entre uma coisa e outra.
 *
 * Ela tambem EXPLICA a espera. O jogo ainda nao tem balcao aberto para quem
 * joga: a chamada diz, na voz do personagem, por que ninguem esta na rua
 * agora. "Quando estiver melhor me avisa" e a pessoa aceitando esperar — e e
 * dai que o proximo pedaco do jogo comeca.
 *
 * A cena e a MESMA da abertura, com as falas trocadas: mesmo desenho, mesmos
 * tempos, mesma queda de linha. Chamada nova nao e tela nova.
 */
export const CENA_DA_PIZZA = "renan-pizza";

/** Os quatro momentos da cena, na ordem. */
export type MomentoDaCena = "conectando" | "no-ar" | "caindo" | "fim";

/** DECISAO DELE: quanto tempo cada momento dura, em milissegundos. */
export const TEMPOS_DA_CENA = {
  conectando: 900,
  noAr: 3600,
  caindo: 1700,
  fim: 900,
} as const;

/** A cena inteira, do zero ate cair na conversa. */
export const DURACAO_DA_CENA_MS =
  TEMPOS_DA_CENA.conectando +
  TEMPOS_DA_CENA.noAr +
  TEMPOS_DA_CENA.caindo +
  TEMPOS_DA_CENA.fim;

/**
 * AS FALAS DELE NA LINHA, em legenda.
 *
 * Sao curtas e quebradas de proposito: e alguem tentando falar numa ligacao
 * que ja esta ruim. Elas NAO repetem nada da conversa escrita — quem escreve o
 * "Bom dia!!" e o roteiro, depois, e por isso ele funciona la.
 */
export const FALAS_NA_LINHA: readonly { aos: number; texto: string }[] = [
  { aos: 1300, texto: "Alô?" },
  { aos: 2600, texto: "Tá me ouvindo?" },
  { aos: 4100, texto: "Ô… tá cort…" },
];

/**
 * AS FALAS DA SEGUNDA CHAMADA, a da pizza.
 *
 * Mesma regra da primeira: elas NAO repetem a conversa escrita. "Comi todas as
 * pizzas" e a foto sao dele NO APLICATIVO, depois — aqui e so o comeco da
 * frase, que a linha nao deixa terminar.
 *
 * A ultima e o que a resposta dele pede: quem joga responde "quando estiver
 * melhor me avisa", e isso so faz sentido se a pessoa OUVIU que ele nao esta
 * bem. Sem esta legenda, a resposta viria do nada.
 */
export const FALAS_DA_PIZZA: readonly { aos: number; texto: string }[] = [
  { aos: 1300, texto: "Ôôô…" },
  { aos: 2600, texto: "Eu não tô bem…" },
  { aos: 4100, texto: "Cara, a pizz… cort…" },
];

/**
 * AS FALAS DE CADA CENA, pelo nome dela.
 *
 * O jogo carrega o NOME da cena e nada mais — era assim antes de existir a
 * segunda. Entao quem sabe qual fala e de qual chamada e este arquivo, e nao a
 * tela: cena nova continua sendo um nome novo aqui, e nenhuma tela muda.
 */
export function falasDaCena(
  cena: string
): readonly { aos: number; texto: string }[] {
  return cena === CENA_DA_PIZZA ? FALAS_DA_PIZZA : FALAS_NA_LINHA;
}

/** Em que momento a cena esta, dado quanto tempo ja correu. */
export function momentoDaCena(passadoMs: number): MomentoDaCena {
  const t = TEMPOS_DA_CENA;
  if (passadoMs < t.conectando) return "conectando";
  if (passadoMs < t.conectando + t.noAr) return "no-ar";
  if (passadoMs < t.conectando + t.noAr + t.caindo) return "caindo";
  return "fim";
}

/**
 * Ha quantos segundos a ligacao esta no ar — o relogio que aparece em cima.
 *
 * Conta do momento em que a imagem entrou, e nao do toque: ninguem cronometra
 * o telefone chamando. Antes de conectar e zero.
 */
export function segundosNoAr(passadoMs: number): number {
  const desde = passadoMs - TEMPOS_DA_CENA.conectando;
  return desde <= 0 ? 0 : Math.floor(desde / 1000);
}

/**
 * A legenda que esta na tela agora, se houver.
 *
 * As falas entram por fora para a mesma cena servir as duas chamadas. Sem
 * dizer nada, valem as da abertura — que era o unico caso quando isto nasceu.
 */
export function legendaAgora(
  passadoMs: number,
  falas: readonly { aos: number; texto: string }[] = FALAS_NA_LINHA
): string | undefined {
  if (momentoDaCena(passadoMs) === "fim") return undefined;
  let atual: string | undefined;
  for (const fala of falas) if (passadoMs >= fala.aos) atual = fala.texto;
  return atual;
}

/**
 * A FORCA DO SINAL, de tres a zero barrinhas.
 *
 * Cai junto com a ligacao. E o unico aviso que a pessoa tem antes de a imagem
 * morrer — sem ele a queda parece defeito do jogo, e nao da linha.
 */
export function barrasDeSinal(passadoMs: number): number {
  const momento = momentoDaCena(passadoMs);
  if (momento === "conectando") return 3;
  if (momento === "no-ar")
    return passadoMs > TEMPOS_DA_CENA.conectando + 2600 ? 2 : 3;
  if (momento === "caindo") {
    const dentro = passadoMs - TEMPOS_DA_CENA.conectando - TEMPOS_DA_CENA.noAr;
    return dentro > TEMPOS_DA_CENA.caindo / 2 ? 0 : 1;
  }
  return 0;
}

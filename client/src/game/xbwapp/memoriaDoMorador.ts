/**
 * A MEMORIA PEQUENA DE CADA MORADOR.
 *
 * Ideia dele, 13/09/2026: "podemos criar pequena memoria de cada usuario,
 * sendo tambem uma forma de IA ja saber o que dizer e quando e como dizer".
 *
 * ── O PULO DO GATO, E E DELE ──────────────────────────────────────────────
 *
 * A memoria nao serve so para lembrar: ela ENTREGA A RESPOSTA PRONTA. A IA
 * deixa de ter que inventar quem e a pessoa e o que esta acontecendo — recebe
 * isso mastigado e so escolhe as palavras.
 *
 * E a mesma regra do dinheiro, esticada. Ja valia "a IA escreve as palavras, o
 * jogo decide os numeros". Agora vale: O JOGO DECIDE O QUE E QUANDO, A IA
 * DECIDE SO COMO SOA.
 *
 * Consequencia pratica grande: um modelo pequeno e GRATUITO passa a bastar,
 * porque quem pensou foi o jogo.
 *
 * ── POR QUE A MEMORIA TEM QUE DESBOTAR ────────────────────────────────────
 *
 * Nao e por espaco. E porque UMA ENTREGA RUIM NAO PODE ENVENENAR UM MORADOR
 * PARA SEMPRE. Rancor eterno transforma o jogo em castigo: o jogador erra uma
 * vez na casa 12 e a dona Cida fica azeda pelo resto da partida, sem caminho
 * de volta. Fato velho perde peso e sai.
 *
 * A regra: poucos fatos por pessoa, os recentes mandam, o velho apaga.
 */

/** Como terminou a ultima entrega para aquela pessoa. */
export type ComoFoi = "no-prazo" | "atrasada" | "falhou";

/**
 * Uma coisa que aconteceu entre voces. Curta de proposito: e uma lembranca,
 * nao um relatorio.
 */
export interface Fato {
  /** A lembranca em uma frase, do ponto de vista da PESSOA. */
  o: string;
  /** Em qual entrega isso aconteceu — e o relogio que faz o fato desbotar. */
  naEntrega: number;
}

export interface MemoriaDoContato {
  /** Quantas entregas voce ja fez para essa pessoa. */
  entregas: number;
  /** Como foi a ultima. */
  ultima?: ComoFoi;
  /** Quantas seguidas deram errado — o que justifica alguem ficar bravo. */
  seguidasRuins: number;
  /** As lembrancas vivas. */
  fatos: readonly Fato[];
  /**
   * Se a pessoa ja te explicou a mania dela.
   *
   * Sem isto o Rogerio repetiria "bate palma, nao toca a campainha" TODA vez.
   * Gente fala isso uma vez e depois diz "voce lembra, ne?". E este campo que
   * faz a relacao ANDAR em vez de recomecar do zero.
   */
  maniaJaDita: boolean;
}

export type MemoriaDoBairro = Readonly<Record<string, MemoriaDoContato>>;

/** DECISAO DELE: quantas lembrancas cada pessoa guarda ao mesmo tempo. */
export const FATOS_GUARDADOS = 4;

/** DECISAO DELE: depois de quantas entregas uma lembranca desbota e sai. */
export const FATO_DESBOTA_EM = 6;

/** DECISAO DELE: a partir de quantas entregas a pessoa te trata como de casa. */
export const ENTREGAS_PARA_SER_DE_CASA = 8;

/** DECISAO DELE: a partir de quantas entregas a pessoa deixa de te estranhar. */
export const ENTREGAS_PARA_SER_CONHECIDO = 3;

export const MEMORIA_NOVA: MemoriaDoContato = {
  entregas: 0,
  seguidasRuins: 0,
  fatos: [],
  maniaJaDita: false,
};

export function memoriaDe(
  bairro: MemoriaDoBairro,
  id: string
): MemoriaDoContato {
  return bairro[id] ?? MEMORIA_NOVA;
}

/** Tira as lembrancas que ja desbotaram. Chamado a cada entrega nova. */
function sohAsVivas(
  fatos: readonly Fato[],
  entregaAtual: number
): readonly Fato[] {
  return fatos
    .filter(f => entregaAtual - f.naEntrega < FATO_DESBOTA_EM)
    .slice(-FATOS_GUARDADOS);
}

/**
 * REGISTRA UMA ENTREGA.
 *
 * O contador de seguidas ruins ZERA numa entrega boa — de proposito. E o
 * caminho de volta: quem errou tem como consertar, e nao fica marcado.
 */
export function registrarEntrega(
  bairro: MemoriaDoBairro,
  id: string,
  comoFoi: ComoFoi,
  lembranca?: string
): MemoriaDoBairro {
  const antes = memoriaDe(bairro, id);
  const entregas = antes.entregas + 1;

  const fatos = lembranca
    ? sohAsVivas([...antes.fatos, { o: lembranca, naEntrega: entregas }], entregas)
    : sohAsVivas(antes.fatos, entregas);

  return {
    ...bairro,
    [id]: {
      entregas,
      ultima: comoFoi,
      seguidasRuins: comoFoi === "no-prazo" ? 0 : antes.seguidasRuins + 1,
      fatos,
      maniaJaDita: antes.maniaJaDita,
    },
  };
}

/** Guarda que a pessoa ja explicou a mania dela. */
export function maniaFoiDita(
  bairro: MemoriaDoBairro,
  id: string
): MemoriaDoBairro {
  const antes = memoriaDe(bairro, id);
  if (antes.maniaJaDita) return bairro;
  return { ...bairro, [id]: { ...antes, maniaJaDita: true } };
}

/** Guarda uma lembranca solta, sem ser numa entrega. */
export function lembrar(
  bairro: MemoriaDoBairro,
  id: string,
  lembranca: string
): MemoriaDoBairro {
  const antes = memoriaDe(bairro, id);
  return {
    ...bairro,
    [id]: {
      ...antes,
      fatos: sohAsVivas(
        [...antes.fatos, { o: lembranca, naEntrega: antes.entregas }],
        antes.entregas
      ),
    },
  };
}

/** Em que pe esta a relacao — e a palavra que troca a prateleira da fala. */
export type Intimidade = "estranho" | "conhecido" | "de-casa";

export function intimidade(m: MemoriaDoContato): Intimidade {
  if (m.entregas >= ENTREGAS_PARA_SER_DE_CASA) return "de-casa";
  if (m.entregas >= ENTREGAS_PARA_SER_CONHECIDO) return "conhecido";
  return "estranho";
}

/**
 * O RESUMO — a carteirinha que a IA le.
 *
 * Tres linhas, no maximo. Nao e um relatorio: e o que a PESSOA tem na cabeca
 * na hora de responder. Se a IA receber isto, ela nao precisa deduzir nada.
 */
export function resumoPara(m: MemoriaDoContato): string {
  if (m.entregas === 0) return "Nunca recebeu uma entrega dele.";

  const linhas: string[] = [];
  const vez = m.entregas === 1 ? "uma vez" : `${m.entregas} vezes`;

  const comoTrata =
    intimidade(m) === "de-casa"
      ? "Ja e de casa"
      : intimidade(m) === "conhecido"
        ? "Ja conhece"
        : "Mal conhece";
  linhas.push(`${comoTrata}: ele ja entregou ${vez}.`);

  if (m.ultima === "atrasada") linhas.push("A ultima atrasou.");
  if (m.ultima === "falhou") linhas.push("A ultima nem chegou.");
  if (m.seguidasRuins >= 2)
    linhas.push(`Foram ${m.seguidasRuins} seguidas dando errado.`);

  for (const f of m.fatos.slice(-2)) linhas.push(f.o);

  return linhas.join(" ");
}

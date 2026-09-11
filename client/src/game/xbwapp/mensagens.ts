/**
 * O QUE SE FAZ COM UMA MENSAGEM.
 *
 * Responder, encaminhar, reagir, favoritar, editar, apagar, fixar, copiar. Sao
 * as oito coisas que qualquer aplicativo de mensagem oferece quando a pessoa
 * segura o dedo em cima de um balao — e sao a diferenca entre uma tela de
 * conversa e um aplicativo de mensagem.
 *
 * Todas moram aqui, todas sao puras, e nenhuma depende de tela. Isso e o que
 * permite testar "apagar para todos" sem abrir navegador.
 */
import type { EstadoDoApp } from "./estado";
import type { IdContato, Mensagem, TipoDeMensagem } from "./tipos";

/** Troca uma mensagem no lugar, sem mexer nas outras. */
function trocar(
  estado: EstadoDoApp,
  id: string,
  como: (m: Mensagem) => Mensagem
): EstadoDoApp {
  return {
    ...estado,
    mensagens: estado.mensagens.map(m => (m.id === id ? como(m) : m)),
  };
}

export function mensagem(
  estado: EstadoDoApp,
  id: string
): Mensagem | undefined {
  return estado.mensagens.find(m => m.id === id);
}

/**
 * REAGIR.
 *
 * Tocar de novo no mesmo emoji tira a reacao — e como funciona em todo lugar,
 * e evita a pergunta "como eu desfaco isso".
 *
 * Uma pessoa so tem UMA reacao por mensagem: reagir com outro emoji troca, nao
 * soma. Mensagem com cinco emojis do mesmo sujeito seria ruido.
 */
export function reagir(
  estado: EstadoDoApp,
  id: string,
  emoji: string,
  quem: IdContato = "voce"
): EstadoDoApp {
  return trocar(estado, id, m => {
    const antes = m.reacoes ?? {};
    const jaEsse = (antes[emoji] ?? []).includes(quem);
    const limpo: Record<string, readonly IdContato[]> = {};
    for (const [chave, gente] of Object.entries(antes)) {
      const sem = gente.filter(p => p !== quem);
      if (sem.length > 0) limpo[chave] = sem;
    }
    if (!jaEsse) limpo[emoji] = [...(limpo[emoji] ?? []), quem];
    return { ...m, reacoes: limpo };
  });
}

/** Quantas reacoes uma mensagem tem, no total. */
export function quantasReacoes(m: Mensagem): number {
  return Object.values(m.reacoes ?? {}).reduce((s, g) => s + g.length, 0);
}

/**
 * EDITAR.
 *
 * A mensagem guarda a marca de editada para sempre. Editar sem deixar marca
 * seria reescrever o passado da conversa — e a pessoa do outro lado leria uma
 * frase que nunca foi dita.
 *
 * So se edita o que e seu, e so texto.
 */
export function editar(
  estado: EstadoDoApp,
  id: string,
  texto: string
): EstadoDoApp {
  const m = mensagem(estado, id);
  if (!m || m.de !== "voce" || m.tipo !== "texto" || m.apagada) return estado;
  const limpo = texto.trim();
  if (!limpo) return estado;
  return trocar(estado, id, antiga => ({
    ...antiga,
    texto: limpo,
    editada: true,
  }));
}

/**
 * APAGAR.
 *
 * "Para mim" some da minha tela; "para todos" deixa o rastro dos dois lados.
 * Sumir de vez com o balao abriria um buraco na conversa que ninguem explica —
 * e o rastro e o que todo aplicativo faz, por isso mesmo.
 *
 * So da para apagar para todos o que e seu.
 */
export function apagarParaMim(estado: EstadoDoApp, id: string): EstadoDoApp {
  return trocar(estado, id, m => ({ ...m, apagada: "mim" }));
}

export function apagarParaTodos(estado: EstadoDoApp, id: string): EstadoDoApp {
  const m = mensagem(estado, id);
  if (!m || m.de !== "voce") return estado;
  return trocar(estado, id, antiga => ({
    ...antiga,
    apagada: "todos",
    reacoes: {},
  }));
}

/** O que a tela mostra no lugar de uma mensagem apagada. */
export function textoDeApagada(m: Mensagem): string {
  return m.de === "voce"
    ? "Você apagou esta mensagem"
    : "Esta mensagem foi apagada";
}

/** As mensagens que a tela deve desenhar: as apagadas so para mim somem. */
export function mensagensVisiveis(
  estado: EstadoDoApp,
  conversa: IdContato
): readonly Mensagem[] {
  return estado.mensagens.filter(
    m => m.conversa === conversa && m.apagada !== "mim"
  );
}

let contadorDeCopia = 0;

/**
 * ENCAMINHAR.
 *
 * A copia nasce SUA, mesmo que a original fosse de outra pessoa — porque quem
 * mandou aquilo para a nova conversa foi voce. E nasce com a marca de
 * encaminhada, que e o aviso honesto de que aquilo nao foi escrito ali.
 *
 * O que nao viaja junto: as reacoes, a resposta a que ela respondia e a marca
 * de editada. Nada disso faz sentido na conversa nova.
 */
export function encaminhar(
  estado: EstadoDoApp,
  id: string,
  paraConversas: readonly IdContato[],
  minuto: number
): EstadoDoApp {
  const original = mensagem(estado, id);
  if (!original || original.apagada) return estado;

  const copias: Mensagem[] = paraConversas.map(conversa => {
    contadorDeCopia += 1;
    return {
      ...original,
      id: `e${contadorDeCopia}-${id}`,
      conversa,
      de: "voce",
      minuto,
      estado: "entregue",
      encaminhada: true,
      reacoes: {},
      respondendo: undefined,
      editada: undefined,
      apagada: undefined,
    };
  });

  return { ...estado, mensagens: [...estado.mensagens, ...copias] };
}

/** Zera a numeracao das copias. So os testes usam. */
export function reiniciarNumeracaoDeCopias(): void {
  contadorDeCopia = 0;
}

/**
 * FIXAR UMA MENSAGEM NO ALTO DA CONVERSA.
 *
 * Uma por conversa, como em todo lugar. Fixar a segunda solta a primeira —
 * sem isso o alto da conversa vira um mural e deixa de ser um destaque.
 */
export function fixarMensagem(
  estado: EstadoDoApp,
  conversa: IdContato,
  id: string
): EstadoDoApp {
  const jaEssa = estado.fixadaNaConversa[conversa] === id;
  const nova = { ...estado.fixadaNaConversa };
  if (jaEssa) delete nova[conversa];
  else nova[conversa] = id;
  return { ...estado, fixadaNaConversa: nova };
}

/**
 * PROCURAR DENTRO DA CONVERSA.
 *
 * Sem acento e sem maiuscula: quem procura "atrasei" tem que achar "Atrasei".
 */
export function procurarNaConversa(
  estado: EstadoDoApp,
  conversa: IdContato,
  termo: string
): readonly Mensagem[] {
  const limpo = termo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (!limpo) return [];
  return mensagensVisiveis(estado, conversa).filter(m =>
    m.texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .includes(limpo)
  );
}

/** As favoritas, de todas as conversas, da mais nova para a mais velha. */
export function favoritas(estado: EstadoDoApp): readonly Mensagem[] {
  return estado.mensagens
    .filter(m => estado.favoritas.includes(m.id) && m.apagada !== "mim")
    .sort((a, b) => b.minuto - a.minuto);
}

/** A galeria da conversa: o que tem foto, documento ou link. */
export function midiaDa(
  estado: EstadoDoApp,
  conversa: IdContato
): readonly Mensagem[] {
  const guardar: readonly TipoDeMensagem[] = [
    "foto",
    "documento",
    "audio",
    "figurinha",
  ];
  return mensagensVisiveis(estado, conversa).filter(m =>
    guardar.includes(m.tipo)
  );
}

/**
 * GRUPOS, COMUNIDADES E LISTAS DE TRANSMISSAO.
 *
 * As tres coisas parecem a mesma e sao diferentes por um detalhe que muda tudo:
 *
 *   - GRUPO: todo mundo se ve e todo mundo se fala.
 *   - COMUNIDADE: varios grupos com um aviso comum em cima. Serve para juntar
 *     gente que NAO precisa conversar junta o tempo todo.
 *   - TRANSMISSAO: a mesma mensagem sai para varios, mas cada um recebe na
 *     conversa dele e ninguem ve os outros. E o oposto do grupo.
 *
 * Guardar as tres como pecas separadas evita a tentacao de fazer uma so com um
 * interruptor — que e como se chega num aplicativo onde ninguem sabe quem esta
 * vendo o que.
 */
import type { EstadoDoApp } from "./estado";
import type { Comunidade, Grupo, IdContato, ListaDeTransmissao } from "./tipos";

let contador = 0;

export function reiniciarNumeracaoDeGrupos(): void {
  contador = 0;
}

/** As cores que um grupo novo pode ter. Escolhidas, nao sorteadas. */
const CORES = ["#5a4b9a", "#2f6f7a", "#a4407a", "#b4712f", "#1f7a5a"] as const;

/**
 * CRIAR UM GRUPO.
 *
 * Quem cria e dono. Grupo sem dono e grupo que ninguem consegue arrumar depois
 * — e o jogador precisa poder tirar alguem, trocar o nome e sair.
 */
export function criarGrupo(
  estado: EstadoDoApp,
  nome: string,
  membros: readonly IdContato[],
  descricao = ""
): EstadoDoApp {
  const limpo = nome.trim();
  if (!limpo || membros.length === 0) return estado;
  contador += 1;
  const grupo: Grupo = {
    id: `grupo-${contador}`,
    nome: limpo,
    cor: CORES[contador % CORES.length],
    descricao: descricao.trim(),
    membros: ["voce", ...membros.filter(m => m !== "voce")],
    donos: ["voce"],
    criadoEm: estado.minuto,
  };
  return { ...estado, grupos: [...estado.grupos, grupo] };
}

export function grupo(estado: EstadoDoApp, id: IdContato): Grupo | undefined {
  return estado.grupos.find(g => g.id === id);
}

function mexerNoGrupo(
  estado: EstadoDoApp,
  id: IdContato,
  como: (g: Grupo) => Grupo
): EstadoDoApp {
  return {
    ...estado,
    grupos: estado.grupos.map(g => (g.id === id ? como(g) : g)),
  };
}

/** So dono mexe: e a unica regra que impede o grupo de virar terra de ninguem. */
function ehDono(g: Grupo): boolean {
  return g.donos.includes("voce");
}

export function porNoGrupo(
  estado: EstadoDoApp,
  id: IdContato,
  quem: IdContato
): EstadoDoApp {
  const g = grupo(estado, id);
  if (!g || !ehDono(g) || g.membros.includes(quem)) return estado;
  return mexerNoGrupo(estado, id, atual => ({
    ...atual,
    membros: [...atual.membros, quem],
  }));
}

export function tirarDoGrupo(
  estado: EstadoDoApp,
  id: IdContato,
  quem: IdContato
): EstadoDoApp {
  const g = grupo(estado, id);
  if (!g || !ehDono(g) || quem === "voce") return estado;
  return mexerNoGrupo(estado, id, atual => ({
    ...atual,
    membros: atual.membros.filter(m => m !== quem),
    donos: atual.donos.filter(m => m !== quem),
  }));
}

/** Promover alguem a dono — e o jeito de sair sem deixar o grupo orfao. */
export function darODoGrupo(
  estado: EstadoDoApp,
  id: IdContato,
  quem: IdContato
): EstadoDoApp {
  const g = grupo(estado, id);
  if (!g || !ehDono(g) || !g.membros.includes(quem) || g.donos.includes(quem)) {
    return estado;
  }
  return mexerNoGrupo(estado, id, atual => ({
    ...atual,
    donos: [...atual.donos, quem],
  }));
}

export function renomearGrupo(
  estado: EstadoDoApp,
  id: IdContato,
  nome: string,
  descricao?: string
): EstadoDoApp {
  const g = grupo(estado, id);
  const limpo = nome.trim();
  if (!g || !ehDono(g) || !limpo) return estado;
  return mexerNoGrupo(estado, id, atual => ({
    ...atual,
    nome: limpo,
    descricao: descricao?.trim() ?? atual.descricao,
  }));
}

/**
 * SAIR DO GRUPO.
 *
 * Sair nao apaga o grupo para os outros — apaga so a sua parte nele. E se voce
 * era o unico dono, o grupo fica sem dono: e o preco de sair, e e o que faz a
 * tela oferecer "passar o comando" antes.
 */
export function sairDoGrupo(estado: EstadoDoApp, id: IdContato): EstadoDoApp {
  const g = grupo(estado, id);
  if (!g) return estado;
  return mexerNoGrupo(estado, id, atual => ({
    ...atual,
    membros: atual.membros.filter(m => m !== "voce"),
    donos: atual.donos.filter(m => m !== "voce"),
  }));
}

/** Os grupos em que voce ainda esta. */
export function meusGrupos(estado: EstadoDoApp): readonly Grupo[] {
  return estado.grupos.filter(g => g.membros.includes("voce"));
}

/** ── COMUNIDADES ────────────────────────────────────────────────────────── */

export function criarComunidade(
  estado: EstadoDoApp,
  nome: string,
  descricao = ""
): EstadoDoApp {
  const limpo = nome.trim();
  if (!limpo) return estado;
  contador += 1;
  const comunidade: Comunidade = {
    id: `com-${contador}`,
    nome: limpo,
    descricao: descricao.trim(),
    cor: CORES[contador % CORES.length],
    grupos: [],
  };
  return { ...estado, comunidades: [...estado.comunidades, comunidade] };
}

/** Um grupo entra na comunidade. Ele continua sendo um grupo normal. */
export function porGrupoNaComunidade(
  estado: EstadoDoApp,
  comunidade: string,
  id: IdContato
): EstadoDoApp {
  const existe = estado.comunidades.some(c => c.id === comunidade);
  if (!existe || !grupo(estado, id)) return estado;
  return {
    ...estado,
    comunidades: estado.comunidades.map(c =>
      c.id === comunidade && !c.grupos.includes(id)
        ? { ...c, grupos: [...c.grupos, id] }
        : c
    ),
    grupos: estado.grupos.map(g => (g.id === id ? { ...g, comunidade } : g)),
  };
}

/** ── LISTAS DE TRANSMISSAO ──────────────────────────────────────────────── */

export function criarTransmissao(
  estado: EstadoDoApp,
  nome: string,
  destinos: readonly IdContato[]
): EstadoDoApp {
  const limpo = nome.trim();
  if (!limpo || destinos.length === 0) return estado;
  contador += 1;
  const lista: ListaDeTransmissao = {
    id: `lista-${contador}`,
    nome: limpo,
    destinos: [...destinos],
  };
  return { ...estado, transmissoes: [...estado.transmissoes, lista] };
}

export function apagarTransmissao(
  estado: EstadoDoApp,
  id: string
): EstadoDoApp {
  return {
    ...estado,
    transmissoes: estado.transmissoes.filter(l => l.id !== id),
  };
}

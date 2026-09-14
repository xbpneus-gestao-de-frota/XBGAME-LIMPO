/**
 * O TEMPO DE JOGO DO DIA — o relogio que faz a bateria descer.
 *
 * Ordem dele, 13/09/2026: "bateria de celular deve ser real (...) no maximo 2
 * horas de uso direto (...) se nao bateria deve acabar em duas horas de uso
 * constante".
 *
 * ── O QUE CONTA COMO USO ──────────────────────────────────────────────────
 *
 * So conta o tempo com o jogo NA FRENTE. Aba escondida, computador dormindo ou
 * o jogo minimizado nao gastam bateria — se contassem, quem deixa a janela
 * aberta enquanto almoca voltaria com o celular morto sem ter jogado nada, e o
 * limite deixaria de significar tempo de tela.
 *
 * ── POR QUE ELE SOBREVIVE A UM RECARREGAR ─────────────────────────────────
 *
 * Um limite que zera quando a pessoa fecha e abre de novo nao e limite nenhum:
 * seria so um numero descendo na tela. O total do dia fica guardado na propria
 * maquina, com a data junto — vira o dia, o dia comeca do zero.
 *
 * Guardar aqui, e nao no jogo salvo, tambem tem motivo: o jogo salvo e o
 * progresso do bairro, e tempo de tela nao e progresso. Misturar os dois faria
 * apagar o jogo virar um jeito de ganhar mais duas horas.
 *
 * ── O TETO, E QUEM MEXE NELE ──────────────────────────────────────────────
 *
 * O teto e um numero de minutos. Duas horas e o que vem de fabrica; quem
 * responde pela crianca pode deixar menor. Um teto gravado errado (zero,
 * negativo, texto) e tratado como "sem tempo", e nunca como "tempo infinito".
 */
import { TETO_DE_USO_EM_MINUTOS } from "./oCelular";

const CHAVE_USO = "xbw.tempoDeUso";
const CHAVE_TETO = "xbw.tetoDeUso";

type Guardado = { dia: string; minutos: number };

/** O dia de hoje, no formato que serve de chave: "2026-09-13". */
function diaDeHoje(quando: Date = new Date()): string {
  const mes = String(quando.getMonth() + 1).padStart(2, "0");
  const dia = String(quando.getDate()).padStart(2, "0");
  return `${quando.getFullYear()}-${mes}-${dia}`;
}

function caixa(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    /* Navegador com armazenamento trancado: o jogo continua, sem memoria. */
    return null;
  }
}

function ler(quando: Date = new Date()): Guardado {
  const hoje = diaDeHoje(quando);
  const c = caixa();
  if (!c) return { dia: hoje, minutos: 0 };
  try {
    const cru = c.getItem(CHAVE_USO);
    if (!cru) return { dia: hoje, minutos: 0 };
    const lido = JSON.parse(cru) as Partial<Guardado>;
    if (lido?.dia !== hoje) return { dia: hoje, minutos: 0 };
    const minutos = Number(lido.minutos);
    return { dia: hoje, minutos: Number.isFinite(minutos) ? minutos : 0 };
  } catch {
    return { dia: hoje, minutos: 0 };
  }
}

function gravar(g: Guardado): void {
  const c = caixa();
  if (!c) return;
  try {
    c.setItem(CHAVE_USO, JSON.stringify(g));
  } catch {
    /* Sem espaco ou sem permissao: perder o registro e melhor que travar. */
  }
}

/** Quantos minutos de jogo ja rolaram hoje. */
export function minutosDeUsoHoje(quando: Date = new Date()): number {
  return ler(quando).minutos;
}

/** Soma mais um pedaco de jogo e devolve o total do dia. */
export function somarUso(segundos: number, quando: Date = new Date()): number {
  if (!Number.isFinite(segundos) || segundos <= 0) return minutosDeUsoHoje(quando);
  const atual = ler(quando);
  const somado = { dia: atual.dia, minutos: atual.minutos + segundos / 60 };
  gravar(somado);
  return somado.minutos;
}

/** O teto de hoje, em minutos. Duas horas, se ninguem tiver mudado. */
export function tetoDeUso(): number {
  const c = caixa();
  if (!c) return TETO_DE_USO_EM_MINUTOS;
  try {
    const cru = c.getItem(CHAVE_TETO);
    if (cru === null) return TETO_DE_USO_EM_MINUTOS;
    const teto = Number(cru);
    /* Numero sem sentido vale como "sem tempo", nunca como "tempo infinito". */
    return Number.isFinite(teto) ? teto : 0;
  } catch {
    return TETO_DE_USO_EM_MINUTOS;
  }
}

/** Quem responde pela crianca escolhe outro teto. */
export function definirTetoDeUso(minutos: number): void {
  const c = caixa();
  if (!c) return;
  try {
    c.setItem(CHAVE_TETO, String(minutos));
  } catch {
    /* idem */
  }
}

/** So para os testes: comeca o dia do zero. */
export function esquecerUso(): void {
  const c = caixa();
  if (!c) return;
  try {
    c.removeItem(CHAVE_USO);
    c.removeItem(CHAVE_TETO);
    c.removeItem("xbw.descanso");
    c.removeItem("xbw.descansarAte");
    c.removeItem("xbw.senhaDosPais");
  } catch {
    /* idem */
  }
}

/* ══════════════════════════════════════════════════════════════════════════
 * O DESCANSO — "vamos recarregar o celular e já voltamos"
 *
 * Ordem dele, 13/09/2026: "app salva jogo atual, aparece uma tela que vamos
 * recarregar celular e ja voltamos, deve ser periodo de 10 a 30 minutos
 * podendo ser configurado pelos pais".
 *
 * O descanso e a outra metade da bateria: sem ele, bateria zerada seria so um
 * desenho vazio e a pessoa continuaria jogando. Com ele, o jogo grava, para, e
 * volta inteiro depois — e o celular volta carregado, que e o unico jeito de a
 * bateria significar alguma coisa no dia seguinte.
 *
 * Os limites sao dele: nunca menos de dez minutos (descanso curto demais nao
 * descansa nada) nem mais de trinta (parar meia hora ja e muito para quem so
 * queria terminar uma entrega).
 * ══════════════════════════════════════════════════════════════════════════ */

export const DESCANSO_MINIMO = 10;
export const DESCANSO_MAXIMO = 30;
export const DESCANSO_DE_FABRICA = 15;

const CHAVE_DESCANSO = "xbw.descanso";
const CHAVE_ATE = "xbw.descansarAte";
const CHAVE_SENHA = "xbw.senhaDosPais";

/** Quanto dura o descanso, em minutos, dentro dos limites dele. */
export function descansoEmMinutos(): number {
  const c = caixa();
  if (!c) return DESCANSO_DE_FABRICA;
  try {
    const cru = c.getItem(CHAVE_DESCANSO);
    if (cru === null) return DESCANSO_DE_FABRICA;
    return apararDescanso(Number(cru));
  } catch {
    return DESCANSO_DE_FABRICA;
  }
}

/** Guarda o descanso escolhido, sempre dentro de dez a trinta minutos. */
export function definirDescanso(minutos: number): void {
  const c = caixa();
  if (!c) return;
  try {
    c.setItem(CHAVE_DESCANSO, String(apararDescanso(minutos)));
  } catch {
    /* idem */
  }
}

/** Numero de fora vira numero de dentro: nunca abaixo de 10 nem acima de 30. */
export function apararDescanso(minutos: number): number {
  if (!Number.isFinite(minutos)) return DESCANSO_DE_FABRICA;
  return Math.min(DESCANSO_MAXIMO, Math.max(DESCANSO_MINIMO, Math.round(minutos)));
}

/** Comeca o descanso agora. Devolve o instante em que ele acaba. */
export function comecarDescanso(agora: number = Date.now()): number {
  const ate = agora + descansoEmMinutos() * 60_000;
  const c = caixa();
  if (c) {
    try {
      c.setItem(CHAVE_ATE, String(ate));
    } catch {
      /* idem */
    }
  }
  return ate;
}

/** Quantos segundos faltam do descanso. Zero quando nao ha descanso em pe. */
export function faltaDoDescanso(agora: number = Date.now()): number {
  const c = caixa();
  if (!c) return 0;
  try {
    const cru = c.getItem(CHAVE_ATE);
    if (!cru) return 0;
    const ate = Number(cru);
    if (!Number.isFinite(ate)) return 0;
    /*
     * Relogio adiantado nao vale como descanso cumprido: se o fim esta longe
     * demais para caber no maior descanso possivel, alguem mexeu na hora da
     * maquina — e a resposta segura e cobrar o descanso inteiro de novo.
     */
    const teto = agora + DESCANSO_MAXIMO * 60_000;
    if (ate > teto) {
      const refeito = comecarDescanso(agora);
      return Math.max(0, Math.ceil((refeito - agora) / 1000));
    }
    return Math.max(0, Math.ceil((ate - agora) / 1000));
  } catch {
    return 0;
  }
}

/** Acabou o descanso: o celular volta carregado e o dia de jogo recomeca. */
export function terminarDescanso(): void {
  const c = caixa();
  if (!c) return;
  try {
    c.removeItem(CHAVE_ATE);
    c.removeItem(CHAVE_USO);
  } catch {
    /* idem */
  }
}

/* ── A SENHA DOS PAIS ──────────────────────────────────────────────────────
 *
 * Isto e uma TRANCA DE CRIANCA, e nao segurança: guarda um resumo do que foi
 * digitado para a senha nao ficar escrita por ai, mas quem sabe mexer no
 * navegador passa por ela sem esforço. A tela diz isso com todas as letras —
 * prometer proteção que nao existe seria pior que nao ter tranca nenhuma.
 */

function resumo(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Ja existe uma senha guardada? */
export function temSenhaDosPais(): boolean {
  const c = caixa();
  if (!c) return false;
  try {
    return Boolean(c.getItem(CHAVE_SENHA));
  } catch {
    return false;
  }
}

/** Guarda a senha (o resumo dela). Texto vazio apaga a tranca. */
export function definirSenhaDosPais(senha: string): void {
  const c = caixa();
  if (!c) return;
  try {
    if (!senha) c.removeItem(CHAVE_SENHA);
    else c.setItem(CHAVE_SENHA, resumo(senha));
  } catch {
    /* idem */
  }
}

/** Confere a senha digitada. Sem tranca posta, qualquer um entra. */
export function senhaDosPaisConfere(senha: string): boolean {
  const c = caixa();
  if (!c) return true;
  try {
    const guardado = c.getItem(CHAVE_SENHA);
    if (!guardado) return true;
    return resumo(senha) === guardado;
  } catch {
    return true;
  }
}

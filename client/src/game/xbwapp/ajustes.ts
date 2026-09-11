/**
 * PRIVACIDADE, APARENCIA E AS FERRAMENTAS DE TRABALHO.
 *
 * Bloquear, quem ve o que, papel de parede, tema, mensagens temporarias,
 * etiquetas e respostas guardadas. Sao as coisas que um aplicativo de mensagem
 * tem e que ninguem lembra de listar — ate faltar uma.
 */
import type { EstadoDoApp } from "./estado";
import type {
  IdContato,
  Privacidade,
  QuemPodeVer,
  TempoTemporario,
} from "./tipos";

/** ── BLOQUEAR ───────────────────────────────────────────────────────────── */

/**
 * BLOQUEAR NAO APAGA A CONVERSA.
 *
 * O historico fica; o que para e o que vem de fora. Apagar junto seria decidir
 * pela pessoa que ela quer esquecer — e ela pode estar bloqueando justamente
 * para GUARDAR o que foi dito.
 */
export function bloquear(estado: EstadoDoApp, quem: IdContato): EstadoDoApp {
  if (estado.bloqueados.includes(quem)) return estado;
  return { ...estado, bloqueados: [...estado.bloqueados, quem] };
}

export function desbloquear(estado: EstadoDoApp, quem: IdContato): EstadoDoApp {
  return { ...estado, bloqueados: estado.bloqueados.filter(b => b !== quem) };
}

export function estaBloqueado(estado: EstadoDoApp, quem: IdContato): boolean {
  return estado.bloqueados.includes(quem);
}

/** ── PRIVACIDADE ────────────────────────────────────────────────────────── */

export function mudarPrivacidade(
  estado: EstadoDoApp,
  o: keyof Privacidade,
  valor: QuemPodeVer | boolean
): EstadoDoApp {
  return { ...estado, privacidade: { ...estado.privacidade, [o]: valor } };
}

/**
 * OS RECIBOS DE LEITURA VALEM PARA OS DOIS LADOS.
 *
 * Quem desliga para de mandar o tique azul E para de receber. E assim em todo
 * aplicativo, e a razao e justa: nao da para esconder o seu e continuar vendo
 * o dos outros.
 */
export function mostraTiqueAzul(estado: EstadoDoApp): boolean {
  return estado.privacidade.recibos;
}

/** ── APARENCIA ──────────────────────────────────────────────────────────── */

/** Os papeis de parede que o aplicativo traz. */
/**
 * Os papeis de parede que o aplicativo traz — na paleta do XB.
 *
 * Ordem dele, 07/09/2026: "ao inves do verde o azul xb".
 */
export const PAPEIS = [
  { id: "rabiscos", nome: "Rabiscos XB", fundo: "#0d1b33", desenho: true },
  { id: "liso", nome: "Azul liso", fundo: "#0d1b33", desenho: false },
  { id: "noite", nome: "Meia-noite", fundo: "#091222", desenho: false },
  { id: "aco", nome: "Aço", fundo: "#12547a", desenho: false },
  { id: "grafite", nome: "Grafite", fundo: "#20272d", desenho: false },
  { id: "gelo", nome: "Gelo", fundo: "#edf5f6", desenho: false },
] as const;

export function trocarTema(
  estado: EstadoDoApp,
  tema: "escuro" | "claro"
): EstadoDoApp {
  return { ...estado, aparencia: { ...estado.aparencia, tema } };
}

/**
 * PAPEL DE PAREDE: um padrao, e o de cada conversa que quiser o seu.
 *
 * Poder trocar so numa conversa nao e enfeite — e o jeito mais rapido de saber
 * em qual conversa voce esta sem ler o nome.
 */
export function trocarPapel(
  estado: EstadoDoApp,
  papel: string,
  conversa?: IdContato
): EstadoDoApp {
  if (!conversa) {
    return { ...estado, aparencia: { ...estado.aparencia, papel } };
  }
  return {
    ...estado,
    aparencia: {
      ...estado.aparencia,
      papelPorConversa: {
        ...estado.aparencia.papelPorConversa,
        [conversa]: papel,
      },
    },
  };
}

export function papelDa(estado: EstadoDoApp, conversa: IdContato): string {
  return estado.aparencia.papelPorConversa[conversa] ?? estado.aparencia.papel;
}

/** ── MENSAGENS TEMPORARIAS ──────────────────────────────────────────────── */

/** DECISAO DELE: os tempos oferecidos, em minutos. Zero e "nao somem". */
export const TEMPOS: readonly { valor: TempoTemporario; nome: string }[] = [
  { valor: 0, nome: "Desligado" },
  { valor: 1440, nome: "24 horas" },
  { valor: 10080, nome: "7 dias" },
  { valor: 129600, nome: "90 dias" },
];

export function mudarTemporarias(
  estado: EstadoDoApp,
  conversa: IdContato,
  tempo: TempoTemporario
): EstadoDoApp {
  const novo = { ...estado.temporarias };
  if (tempo === 0) delete novo[conversa];
  else novo[conversa] = tempo;
  return { ...estado, temporarias: novo };
}

/**
 * LIMPA O QUE JA PASSOU DA HORA.
 *
 * A mensagem some de verdade, e nao vira "apagada": a promessa das temporarias
 * e que nao sobra rastro. Rastro seria quebrar exatamente o que a pessoa ligou.
 */
export function varrerTemporarias(estado: EstadoDoApp): EstadoDoApp {
  const conversas = Object.keys(estado.temporarias);
  if (conversas.length === 0) return estado;
  return {
    ...estado,
    mensagens: estado.mensagens.filter(m => {
      const tempo = estado.temporarias[m.conversa];
      if (!tempo) return true;
      return estado.minuto - m.minuto < tempo;
    }),
  };
}

/** ── ETIQUETAS (a parte de trabalho) ────────────────────────────────────── */

/** DECISAO DELE: as etiquetas que o aplicativo ja traz. */
export const ETIQUETAS = [
  { id: "novo", nome: "Pedido novo", cor: "#18bfea" },
  { id: "coletado", nome: "Coletado", cor: "#3a5fa8" },
  { id: "entregue", nome: "Entregue", cor: "#7fd8f0" },
  { id: "pago", nome: "Pago", cor: "#b4712f" },
  { id: "problema", nome: "Problema", cor: "#c0492f" },
] as const;

export function etiquetar(
  estado: EstadoDoApp,
  conversa: IdContato,
  etiqueta: string
): EstadoDoApp {
  const atuais = estado.etiquetas[conversa] ?? [];
  const novas = atuais.includes(etiqueta)
    ? atuais.filter(e => e !== etiqueta)
    : [...atuais, etiqueta];
  const todas = { ...estado.etiquetas };
  if (novas.length === 0) delete todas[conversa];
  else todas[conversa] = novas;
  return { ...estado, etiquetas: todas };
}

export function conversasComEtiqueta(
  estado: EstadoDoApp,
  etiqueta: string
): readonly IdContato[] {
  return Object.entries(estado.etiquetas)
    .filter(([, lista]) => lista.includes(etiqueta))
    .map(([conversa]) => conversa);
}

/** ── RESPOSTAS GUARDADAS ────────────────────────────────────────────────── */

export function guardarResposta(
  estado: EstadoDoApp,
  atalho: string,
  texto: string
): EstadoDoApp {
  const a = atalho.trim();
  const t = texto.trim();
  if (!a || !t) return estado;
  const sem = estado.respostasRapidas.filter(r => r.atalho !== a);
  return { ...estado, respostasRapidas: [...sem, { atalho: a, texto: t }] };
}

export function esquecerResposta(
  estado: EstadoDoApp,
  atalho: string
): EstadoDoApp {
  return {
    ...estado,
    respostasRapidas: estado.respostasRapidas.filter(r => r.atalho !== atalho),
  };
}

/**
 * O ATALHO VIRA A FRASE ENQUANTO A PESSOA DIGITA.
 *
 * Digitar "/atraso" e ver a frase inteira aparecer e o que faz a resposta
 * guardada valer a pena. Sem isso ela e so uma lista que ninguem abre.
 */
export function frasePeloAtalho(
  estado: EstadoDoApp,
  escrito: string
): string | undefined {
  const chave = escrito.trim().toLowerCase();
  if (!chave.startsWith("/")) return undefined;
  return estado.respostasRapidas.find(r => r.atalho.toLowerCase() === chave)
    ?.texto;
}

/** As respostas guardadas que combinam com o que ja foi escrito. */
export function atalhosQueCombinam(
  estado: EstadoDoApp,
  escrito: string
): readonly { atalho: string; texto: string }[] {
  const chave = escrito.trim().toLowerCase();
  if (!chave.startsWith("/")) return [];
  return estado.respostasRapidas.filter(r =>
    r.atalho.toLowerCase().startsWith(chave)
  );
}

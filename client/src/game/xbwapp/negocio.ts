/**
 * O LADO COMERCIAL — o que o WhatsApp Business tem e o comum nao.
 *
 * Ordem dele, 07/09/2026: "POR ULTIMO FERRAMENTAS, PRECISO DE GERENCIAR
 * ANUNCIOS COMPLETO, GUIA DE NEGOCIOS, PERFIL. CATALOGO, ANUNCIOS, GUIA DE
 * NEGOCIOS, COBRANÇA, MENSAGEM DE AUSENCIA TODAS ESSA FUNCIONALIDADES REAIS,
 * DENTRO DO GAME NADA DE PLACEBORD".
 *
 * "Nada de placebord" e a parte que manda: cada tela aqui MEXE no estado de
 * verdade. Anuncio criado gasta dinheiro e rende alcance; cobranca enviada
 * aparece na conversa e pode ser paga; mensagem de ausencia responde sozinha
 * quando a pessoa escreve fora do horario. Nada e desenho.
 *
 * ── A REGRA QUE VALE PARA TUDO AQUI ──────────────────────────────────────
 *
 * O TEXTO E DE QUEM ESCREVE, O NUMERO E DO JOGO. Vale para o anuncio como ja
 * valia para a conversa com a IA: quem escreve o anuncio nao decide quanta
 * gente viu. Alcance e conversas saem do DINHEIRO e do TEMPO, por conta feita
 * aqui, e as contas moram todas neste arquivo, marcadas como decisao dele.
 */
import { CONTATOS, contato, nomeDe } from "./contatos";
import { simplificar } from "./entender";
import type {
  Anuncio,
  Cobranca,
  Contato,
  DestinoDoAnuncio,
  IdContato,
  MensagensAutomaticas,
  PerfilComercial,
  SituacaoDoAnuncio,
} from "./tipos";
import type { EstadoDoApp } from "./estado";

/* ── AS CONTAS DO ANUNCIO — decisao dele ─────────────────────────────────
 *
 * Sao poucas de proposito. Anuncio que rende demais faz o jogador parar de
 * pedalar, e o jogo e de pedalar.
 */

/** Quanta gente um real por dia alcanca. */
export const ALCANCE_POR_REAL = 34;
/** De cada cem que veem, quantos abrem conversa. */
export const CONVERSAS_POR_CEM = 3;
/** O menor e o maior investimento por dia, em centavos. */
export const MENOR_POR_DIA = 200;
export const MAIOR_POR_DIA = 5000;
/** O menor e o maior tempo de um anuncio, em dias. */
export const MENOS_DIAS = 1;
export const MAIS_DIAS = 30;

/** Os publicos que o guia do bairro sabe alcancar, e o quanto cada um rende. */
export const PUBLICOS = [
  { id: "bairro", nome: "O bairro todo", peso: 1 },
  { id: "perto", nome: "Perto de você (1 km)", peso: 0.55 },
  { id: "lojas", nome: "Só comércios", peso: 0.3 },
  { id: "moradores", nome: "Só moradores", peso: 0.75 },
] as const;

export const DESTINOS: readonly {
  id: DestinoDoAnuncio;
  nome: string;
}[] = [
  { id: "conversa", nome: "Abrir conversa comigo" },
  { id: "catalogo", nome: "Ver meu catálogo" },
  { id: "site", nome: "Abrir meu site" },
];

function pesoDoPublico(publico: string): number {
  return PUBLICOS.find(p => p.id === publico)?.peso ?? 1;
}

export function entre(valor: number, menor: number, maior: number): number {
  return Math.max(menor, Math.min(maior, Math.round(valor)));
}

/** Quantos dias do anuncio ja correram, ate o total contratado. */
export function diasCorridos(estado: EstadoDoApp, a: Anuncio): number {
  if (a.comecouEm === undefined) return 0;
  const passados = Math.max(0, estado.minuto - a.comecouEm) / (24 * 60);
  return Math.min(a.dias, passados);
}

/** O que o anuncio rendeu ate agora. Conta do jogo, nao do texto. */
export function resultadoDoAnuncio(
  estado: EstadoDoApp,
  a: Anuncio
): { alcance: number; conversas: number; gasto: number } {
  const dias = diasCorridos(estado, a);
  const reaisGastos = (a.porDia / 100) * dias;
  const alcance = Math.round(
    reaisGastos * ALCANCE_POR_REAL * pesoDoPublico(a.publico)
  );
  return {
    alcance,
    conversas: Math.floor((alcance * CONVERSAS_POR_CEM) / 100),
    gasto: Math.round(a.porDia * dias),
  };
}

/** Em reais, para a tela mostrar. */
export function emReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/* ── PERFIL COMERCIAL ────────────────────────────────────────────────────── */

export const CATEGORIAS = [
  "Entrega e transporte",
  "Alimentação",
  "Comércio local",
  "Serviços",
  "Saúde",
  "Educação",
] as const;

export function mudarPerfil(
  estado: EstadoDoApp,
  mudanca: Partial<PerfilComercial>
): EstadoDoApp {
  return { ...estado, perfil: { ...estado.perfil, ...mudanca } };
}

/** Quanto do perfil ja esta preenchido, de 0 a 100. */
export function perfilCompleto(perfil: PerfilComercial): number {
  const campos = Object.values(perfil);
  const cheios = campos.filter(c => c.trim().length > 0).length;
  return Math.round((cheios / campos.length) * 100);
}

/* ── ANUNCIOS ────────────────────────────────────────────────────────────── */

export function criarAnuncio(
  estado: EstadoDoApp,
  pedido: {
    titulo: string;
    texto: string;
    destino: DestinoDoAnuncio;
    publico: string;
    porDia: number;
    dias: number;
  }
): EstadoDoApp {
  const titulo = pedido.titulo.trim();
  if (!titulo) return estado;
  const anuncio: Anuncio = {
    id: `an-${estado.anuncios.length + 1}-${estado.minuto}`,
    titulo,
    texto: pedido.texto.trim(),
    destino: pedido.destino,
    publico: pedido.publico,
    porDia: entre(pedido.porDia, MENOR_POR_DIA, MAIOR_POR_DIA),
    dias: entre(pedido.dias, MENOS_DIAS, MAIS_DIAS),
    criadoEm: estado.minuto,
    situacao: "rascunho",
    alcance: 0,
    conversas: 0,
    gasto: 0,
  };
  return { ...estado, anuncios: [anuncio, ...estado.anuncios] };
}

function mudarAnuncio(
  estado: EstadoDoApp,
  id: string,
  como: (a: Anuncio) => Anuncio
): EstadoDoApp {
  return {
    ...estado,
    anuncios: estado.anuncios.map(a => (a.id === id ? como(a) : a)),
  };
}

/** Botar no ar. Um rascunho vira anuncio, e e agora que o relogio comeca. */
export function publicarAnuncio(estado: EstadoDoApp, id: string): EstadoDoApp {
  return mudarAnuncio(estado, id, a =>
    a.situacao === "no-ar"
      ? a
      : { ...a, situacao: "no-ar", comecouEm: a.comecouEm ?? estado.minuto }
  );
}

export function pausarAnuncio(estado: EstadoDoApp, id: string): EstadoDoApp {
  return mudarAnuncio(estado, id, a =>
    a.situacao === "no-ar" ? { ...a, situacao: "pausado" } : a
  );
}

export function encerrarAnuncio(estado: EstadoDoApp, id: string): EstadoDoApp {
  return mudarAnuncio(estado, id, a => ({ ...a, situacao: "terminado" }));
}

export function apagarAnuncio(estado: EstadoDoApp, id: string): EstadoDoApp {
  return { ...estado, anuncios: estado.anuncios.filter(a => a.id !== id) };
}

export function editarAnuncio(
  estado: EstadoDoApp,
  id: string,
  mudanca: Partial<
    Pick<
      Anuncio,
      "titulo" | "texto" | "destino" | "publico" | "porDia" | "dias"
    >
  >
): EstadoDoApp {
  return mudarAnuncio(estado, id, a => ({
    ...a,
    ...mudanca,
    porDia: entre(mudanca.porDia ?? a.porDia, MENOR_POR_DIA, MAIOR_POR_DIA),
    dias: entre(mudanca.dias ?? a.dias, MENOS_DIAS, MAIS_DIAS),
  }));
}

/** O total investido em tudo que esta no ar ou ja terminou. */
export function gastoTotal(estado: EstadoDoApp): number {
  return estado.anuncios.reduce(
    (soma, a) => soma + resultadoDoAnuncio(estado, a).gasto,
    0
  );
}

export function comoEstaOAnuncio(s: SituacaoDoAnuncio): string {
  return s === "no-ar"
    ? "No ar"
    : s === "pausado"
      ? "Pausado"
      : s === "terminado"
        ? "Encerrado"
        : "Rascunho";
}

/* ── GUIA DE NEGOCIOS ────────────────────────────────────────────────────── */

/** A categoria de cada comercio do bairro, para o guia poder separar. */
export const CATEGORIA_DA_LOJA: Readonly<Record<string, string>> = {
  padaria: "Alimentação",
  lanchonete: "Alimentação",
  farmacia: "Saúde",
  floricultura: "Comércio local",
  papelaria: "Comércio local",
};

export function categoriaDe(id: IdContato): string {
  return CATEGORIA_DA_LOJA[id] ?? "Comércio local";
}

/** Os comercios do bairro — o guia inteiro. */
export function empresasDoGuia(): readonly Contato[] {
  return CONTATOS.filter(c => c.tipo === "loja");
}

/** As categorias que existem de fato, sem repetir. */
export function categoriasDoGuia(): readonly string[] {
  const vistas = new Set(empresasDoGuia().map(c => categoriaDe(c.id)));
  return [...vistas].sort();
}

/** Procurar no guia por nome, pelo que a loja faz, ou pela categoria. */
export function procurarNoGuia(
  texto: string,
  categoria?: string
): readonly Contato[] {
  const busca = simplificar(texto.trim());
  return empresasDoGuia().filter(c => {
    if (categoria && categoriaDe(c.id) !== categoria) return false;
    if (!busca) return true;
    return (
      simplificar(c.nome).includes(busca) ||
      simplificar(c.sobre).includes(busca) ||
      simplificar(categoriaDe(c.id)).includes(busca)
    );
  });
}

/* ── COBRANCA ────────────────────────────────────────────────────────────── */

/**
 * A cobranca nasce aqui e VAI PARA A CONVERSA.
 *
 * Ela nao pode viver so numa lista de Ferramentas: quem paga e o cliente, e o
 * cliente so olha a conversa. Por isso quem chama esta funcao recebe a
 * cobranca e manda o balao — os dois lados ficam apontando para o mesmo id.
 */
export function criarCobranca(
  estado: EstadoDoApp,
  para: IdContato,
  descricao: string,
  centavos: number,
  pedido?: string
): { estado: EstadoDoApp; cobranca: Cobranca } | null {
  if (!contato(para) || centavos <= 0) return null;
  const cobranca: Cobranca = {
    id: `cob-${estado.cobrancas.length + 1}-${estado.minuto}`,
    para,
    descricao: descricao.trim() || `Cobrança para ${nomeDe(para)}`,
    centavos: Math.round(centavos),
    minuto: estado.minuto,
    situacao: "enviada",
    pedido,
  };
  return {
    estado: { ...estado, cobrancas: [cobranca, ...estado.cobrancas] },
    cobranca,
  };
}

export function marcarCobrancaPaga(
  estado: EstadoDoApp,
  id: string
): EstadoDoApp {
  return {
    ...estado,
    cobrancas: estado.cobrancas.map(c =>
      c.id === id && c.situacao === "enviada" ? { ...c, situacao: "paga" } : c
    ),
  };
}

export function cancelarCobranca(estado: EstadoDoApp, id: string): EstadoDoApp {
  return {
    ...estado,
    cobrancas: estado.cobrancas.map(c =>
      c.id === id && c.situacao === "enviada"
        ? { ...c, situacao: "cancelada" }
        : c
    ),
  };
}

/** Quanto ainda esta em aberto, em centavos. */
export function aReceber(estado: EstadoDoApp): number {
  return estado.cobrancas
    .filter(c => c.situacao === "enviada")
    .reduce((soma, c) => soma + c.centavos, 0);
}

/** Quanto ja entrou, em centavos. */
export function recebido(estado: EstadoDoApp): number {
  return estado.cobrancas
    .filter(c => c.situacao === "paga")
    .reduce((soma, c) => soma + c.centavos, 0);
}

/* ── MENSAGENS AUTOMATICAS ───────────────────────────────────────────────── */

export function mudarAutomaticas(
  estado: EstadoDoApp,
  mudanca: {
    saudacao?: Partial<MensagensAutomaticas["saudacao"]>;
    ausencia?: Partial<MensagensAutomaticas["ausencia"]>;
  }
): EstadoDoApp {
  return {
    ...estado,
    automaticas: {
      saudacao: { ...estado.automaticas.saudacao, ...mudanca.saudacao },
      ausencia: { ...estado.automaticas.ausencia, ...mudanca.ausencia },
    },
  };
}

/**
 * ESTOU AUSENTE AGORA?
 *
 * "Fora do horario" pergunta ao PERFIL, e nao a um horario escrito duas vezes:
 * se a pessoa mudar o horario da loja no perfil, a ausencia acompanha sozinha.
 * Sem horario escrito no perfil, "fora do horario" nunca vale — melhor nao
 * responder do que responder errado.
 */
export function estaAusente(estado: EstadoDoApp): boolean {
  const a = estado.automaticas.ausencia;
  if (!a.ligada) return false;
  if (a.quando === "sempre") return true;
  if (a.quando === "escolhido")
    return dentroDoIntervalo(estado.minuto, a.de, a.ate);
  const janela = horarioDoPerfil(estado.perfil.horario);
  if (!janela) return false;
  return !dentroDoIntervalo(estado.minuto, janela.de, janela.ate);
}

/** Um intervalo pode virar a noite: das 18h as 8h passa pela meia-noite. */
export function dentroDoIntervalo(
  minuto: number,
  de: number,
  ate: number
): boolean {
  return de <= ate
    ? minuto >= de && minuto < ate
    : minuto >= de || minuto < ate;
}

/** Le "8h às 18h", "08:00 - 18:00" e parecidos. Sem entender, devolve nada. */
export function horarioDoPerfil(
  texto: string
): { de: number; ate: number } | null {
  const numeros = texto.match(/(\d{1,2})(?::(\d{2}))?/g);
  if (!numeros || numeros.length < 2) return null;
  const emMinutos = (t: string) => {
    const [h, m] = t.split(":");
    const hora = Number(h);
    if (!Number.isFinite(hora) || hora > 23) return null;
    return hora * 60 + (m ? Number(m) : 0);
  };
  const de = emMinutos(numeros[0]!);
  const ate = emMinutos(numeros[1]!);
  if (de === null || ate === null) return null;
  return { de, ate };
}

/** A frase que sai sozinha quando alguem escreve, ou nada. */
export function respostaAutomatica(
  estado: EstadoDoApp,
  conversa: IdContato
): string | null {
  if (estaAusente(estado))
    return estado.automaticas.ausencia.texto.trim() || null;
  const s = estado.automaticas.saudacao;
  if (!s.ligada) return null;
  if (s.para === "todos") return s.texto.trim() || null;
  const jaFalou = estado.mensagens.some(
    m => m.conversa === conversa && m.de === "voce"
  );
  return jaFalou ? null : s.texto.trim() || null;
}

/* ── ESTATISTICAS ────────────────────────────────────────────────────────── */

export interface Estatisticas {
  enviadas: number;
  entregues: number;
  lidas: number;
  recebidas: number;
  conversas: number;
  pedidos: number;
  aReceber: number;
  recebido: number;
}

/** As contas da tela de estatisticas, todas tiradas do que aconteceu. */
export function estatisticas(estado: EstadoDoApp): Estatisticas {
  const minhas = estado.mensagens.filter(m => m.de === "voce");
  const conversas = new Set(estado.mensagens.map(m => m.conversa));
  return {
    enviadas: minhas.length,
    entregues: minhas.filter(
      m => m.estado === "entregue" || m.estado === "lida"
    ).length,
    lidas: minhas.filter(m => m.estado === "lida").length,
    recebidas: estado.mensagens.filter(m => m.de !== "voce").length,
    conversas: conversas.size,
    pedidos: estado.pedidos.length,
    aReceber: aReceber(estado),
    recebido: recebido(estado),
  };
}

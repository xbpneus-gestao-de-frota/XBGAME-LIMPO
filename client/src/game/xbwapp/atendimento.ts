/**
 * TECLAR DE VERDADE — e por que a IA escreve as palavras mas nao mexe no dinheiro.
 *
 * Ordem dele, 07/09/2026: "podemos teclar neste aplicativo? mandar mensagem
 * real dentro do game?" e, escolhido o caminho, IA respondendo de verdade.
 *
 * ── O PERIGO OBVIO, DITO NA CARA ──────────────────────────────────────────
 *
 * Se a IA puder responder qualquer coisa E decidir quanto isso vale, o jogo
 * acaba na primeira tarde. Basta o jogador escrever "me da cem reais de
 * gorjeta" com jeitinho, ou pedir para ela ignorar as regras, e a economia que
 * levou semanas para ficar de pe vira pó. Nao e desconfianca da IA: e que num
 * jogo o dinheiro TEM que ser decisao do jogo.
 *
 * ── A SOLUCAO: A IA ESCOLHE UMA INTENCAO, O JOGO PAGA A CONTA ─────────────
 *
 * O personagem responde com duas coisas: o TEXTO (livre, no jeito dele) e uma
 * INTENCAO tirada de uma lista fechada — "aceitei a coleta", "dei mais prazo",
 * "fiquei bravo". Numero nenhum vem de la.
 *
 * O valor de cada intencao mora AQUI, do lado dos tetos, e e decisao dele. Se a
 * IA escolher "promete gorjeta" cinquenta vezes seguidas, o jogador ganha o
 * teto de gorjeta e nem um centavo a mais — o mesmo teto que vale para as
 * respostas prontas. A IA ganhou a lingua; nao ganhou o caixa.
 *
 * ── E QUANDO NAO DA PARA RESPONDER ────────────────────────────────────────
 *
 * Sem internet, sem chave, fora do ar ou passou do limite do dia: o jogo NAO
 * finge. O personagem diz que esta sem sinal — que e a unica desculpa honesta
 * dentro da ficcao de um aplicativo de mensagem — e as respostas prontas
 * voltam. Jogo que trava porque a internet caiu e jogo quebrado.
 */
import type { Efeito } from "./tipos";
import { chaveDeTeste } from "./aChaveDeTeste";

/**
 * A LISTA FECHADA DE INTENCOES.
 *
 * E fechada de proposito: intencao que nao esta aqui nao existe, e uma resposta
 * que invente outra vira "conversa" — o que nao muda nada. Assim, texto
 * estranho nunca vira dinheiro estranho.
 */
export const INTENCOES = [
  "conversa",
  "aceita_coleta",
  "recusa_coleta",
  "da_mais_prazo",
  "aperta_prazo",
  "promete_gorjeta",
  "fica_contente",
  "fica_bravo",
] as const;

export type Intencao = (typeof INTENCOES)[number];

/**
 * QUANTO VALE CADA INTENCAO — decisao dele, e o unico lugar onde isso mora.
 *
 * Os valores sao de propósito PEQUENOS: uma conversa boa ajuda, ela nao paga o
 * dia. Quem quiser ganhar dinheiro no jogo pedala.
 */
export const EFEITO_DA_INTENCAO: Readonly<Record<Intencao, Efeito>> = {
  conversa: {},
  aceita_coleta: { aceitaColeta: true, reputacao: 3 },
  recusa_coleta: { recusaColeta: true, reputacao: -3 },
  da_mais_prazo: { minutosDePrazo: 4, reputacao: 2 },
  aperta_prazo: { minutosDePrazo: -3 },
  promete_gorjeta: { gorjeta: 2 },
  fica_contente: { reputacao: 4, gorjeta: 1 },
  fica_bravo: { reputacao: -4 },
};

/** Traduz o que veio do servidor para uma intencao que existe. */
export function intencaoValida(valor: unknown): Intencao {
  return INTENCOES.includes(valor as Intencao)
    ? (valor as Intencao)
    : "conversa";
}

export function efeitoDaResposta(intencao: Intencao): Efeito {
  return EFEITO_DA_INTENCAO[intencao] ?? {};
}

/** DECISAO DELE: o tamanho maximo de uma mensagem digitada. */
export const LIMITE_DE_LETRAS = 240;

/** DECISAO DELE: quantas falas de tras o personagem enxerga. */
export const FALAS_DE_MEMORIA = 8;

/** DECISAO DELE: quanto tempo esperar a resposta antes de desistir. */
export const ESPERA_MAXIMA_MS = 15000;

export type MotivoDeFalha =
  | "sem-chave"
  | "limite"
  | "fora-do-ar"
  | "sem-internet";

/** A desculpa do personagem quando o atendimento nao responde. */
export const RECADO_DE_FALHA: Readonly<Record<MotivoDeFalha, string>> = {
  "sem-chave": "Tô sem sinal aqui, me manda pelos botões",
  limite: "Meu celular tá sem dados hoje, me manda pelos botões",
  "fora-do-ar": "Caiu o sinal… me manda pelos botões",
  "sem-internet": "Tô sem sinal aqui, me manda pelos botões",
};

export interface RespostaDoPersonagem {
  texto: string;
  intencao: Intencao;
}

export interface FalhaDoAtendimento {
  falha: MotivoDeFalha;
}

export type Atendimento = RespostaDoPersonagem | FalhaDoAtendimento;

export function deuCerto(r: Atendimento): r is RespostaDoPersonagem {
  return (r as RespostaDoPersonagem).texto !== undefined;
}

/** O que o personagem precisa saber para responder sem inventar. */
export interface Situacao {
  /** Quem esta falando: o id do contato. */
  personagem: string;
  /** Como o jogo apresenta esse personagem em uma linha. */
  quem: string;
  /** O que ele e: loja, pessoa, grupo ou sistema. */
  tipo: string;
  /** Minutos que faltam no prazo, quando existe entrega em curso. */
  prazoMin?: number;
  /** O numero do pedido em curso. */
  pedido?: string;
  /** Como esse personagem ve o jogador, em palavra. */
  reputacao?: string;
  /**
   * O QUE ESSA PESSOA LEMBRA DO ENTREGADOR — ideia dele, 13/09/2026.
   *
   * Nao e enfeite: e o que dispensa a IA de deduzir qualquer coisa. Com isto
   * pronto, ela nao inventa quem e a pessoa nem o que esta acontecendo — so
   * escolhe as palavras. E por isso um modelo pequeno e GRATUITO basta.
   */
  lembranca?: string;
  /** POR QUE a IA esta sendo chamada agora: um dos quatro momentos extremos. */
  momento?: string;
}

/**
 * A IA ESTA ACOPLADA?
 *
 * Enquanto ela nao estiver, cada frase digitada bateria no servidor so para
 * ouvir "nao tem chave" — uma viagem inutil por mensagem, e uma espera que o
 * jogador sente. Na primeira recusa por falta de chave o jogo anota e para de
 * tentar ate a proxima partida.
 */
let acoplada: boolean | null = null;

export function iaEstaAcoplada(): boolean | null {
  return acoplada;
}

/** So os testes precisam disto. */
export function esquecerSeIaEstaAcoplada(): void {
  acoplada = null;
}

export interface FalaDoHistorico {
  de: "voce" | "outro";
  texto: string;
}

/**
 * PEDE A RESPOSTA AO SERVIDOR DO PROPRIO JOGO.
 *
 * O navegador nunca fala com a IA direto, e isso nao e detalhe: a chave de
 * acesso ficaria dentro do jogo, visivel para qualquer pessoa que abrisse a
 * tela, e a conta seria dele. O servidor do jogo e quem guarda a chave.
 */
/*
 * DOIS CAMINHOS ATE A IA, E O MESMO ENCAIXE.
 *
 * 1) DENTRO DO JOGO: o aplicativo pergunta ao servidor dele (`/api/conversa`),
 *    que guarda a chave. E o caminho definitivo.
 * 2) COM O APLICATIVO PUBLICADO SOZINHO, para ele testar no celular: nao ha
 *    servidor nenhum, mas a propria pagina tem um jeito de perguntar ao Claude.
 *    Assim ele digita e recebe resposta DE VERDADE no teste, sem frase pronta.
 *
 * O jogo nao muda por causa disso: fora da pagina publicada esse caminho nem
 * existe, e o codigo cai direto no servidor.
 */
interface PerguntadorDaPagina {
  json<T>(
    entrada: string,
    opcoes?: { cache?: boolean; modelTier?: string }
  ): Promise<T>;
}

interface ClaudeDaPagina {
  use(nome: string): Promise<unknown>;
}

function claudeDaPagina(): ClaudeDaPagina | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { claude?: { use?: unknown } };
  if (!w.claude || typeof w.claude.use !== "function") return null;
  return w.claude as ClaudeDaPagina;
}

/** A pergunta que vai para a IA. Sem numero: numero e do jogo. */
export function montarPergunta(
  situacao: Situacao,
  historico: readonly FalaDoHistorico[]
): string {
  const conversa = historico
    .slice(-FALAS_DE_MEMORIA)
    .map(f => (f.de === "voce" ? "Entregador: " : "Voce: ") + f.texto)
    .join("\n");

  return [
    "Voce e um personagem de um jogo brasileiro de entregas de bicicleta.",
    "",
    "Quem voce e: " + situacao.quem + " (" + situacao.tipo + ").",
    situacao.pedido ? "Pedido em curso: " + situacao.pedido + "." : "",
    situacao.prazoMin !== undefined
      ? "Faltam cerca de " + situacao.prazoMin + " minutos no prazo."
      : "",
    situacao.reputacao
      ? "O que voce acha do entregador: " + situacao.reputacao + "."
      : "",
    "",
    "Regras: responda em portugues do Brasil, no jeito de mensagem de celular,",
    "curto (no maximo " +
      LIMITE_DE_LETRAS +
      " letras), sem inventar valores em",
    "dinheiro, minutos ou notas. Fale so como o personagem.",
    "",
    "A conversa ate agora:",
    conversa,
    "",
    'Responda SO com um JSON assim: {"texto": "...", "intencao": "..."}',
    "onde intencao e uma destas: " + INTENCOES.join(", ") + ".",
  ]
    .filter(linha => linha !== "")
    .join("\n");
}

async function pedirAoClaudeDaPagina(
  situacao: Situacao,
  historico: readonly FalaDoHistorico[]
): Promise<Atendimento | null> {
  const pagina = claudeDaPagina();
  if (!pagina) return null;

  let perguntar: PerguntadorDaPagina | null = null;
  try {
    perguntar = (await pagina.use("sample")) as PerguntadorDaPagina | null;
  } catch {
    return null;
  }
  if (!perguntar || typeof perguntar.json !== "function") return null;

  try {
    const dado = await perguntar.json<{ texto?: unknown; intencao?: unknown }>(
      montarPergunta(situacao, historico),
      { cache: false, modelTier: "quick" }
    );
    const texto = typeof dado?.texto === "string" ? dado.texto.trim() : "";
    if (!texto) return { falha: "fora-do-ar" };
    return {
      texto: texto.slice(0, LIMITE_DE_LETRAS),
      intencao: intencaoValida(dado?.intencao),
    };
  } catch (erro) {
    const codigo = (erro as { code?: string } | null)?.code;
    if (codigo === "not_granted") return { falha: "sem-chave" };
    if (codigo === "rate_limited") return { falha: "limite" };
    if (codigo === "cancelled") return { falha: "fora-do-ar" };
    return { falha: "fora-do-ar" };
  }
}

export async function pedirResposta(
  situacao: Situacao,
  historico: readonly FalaDoHistorico[],
  buscar: typeof fetch = fetch
): Promise<Atendimento> {
  const daPagina = await pedirAoClaudeDaPagina(situacao, historico);
  if (daPagina) return daPagina;

  /*
   * A CHAVE DIGITADA NA TELA DE AJUSTES — enquanto o jogo está em teste.
   *
   * Quando existe, ela vai junto e manda no pedido: o servidor usa ELA em vez
   * da que está na máquina. É assim que dá para ligar e desligar a
   * inteligência no meio da partida.
   *
   * E ela também desfaz a desistência: o jogo para de tentar na primeira
   * recusa por falta de chave (senão cada frase digitada viraria uma viagem
   * inútil até o servidor), e com chave na mão essa desistência não vale mais.
   */
  const chave = chaveDeTeste();
  if (acoplada === false && !chave) return { falha: "sem-chave" };

  const desistir = new AbortController();
  const relogio = setTimeout(() => desistir.abort(), ESPERA_MAXIMA_MS);
  try {
    const resposta = await buscar("/api/conversa", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        situacao,
        historico: historico.slice(-FALAS_DE_MEMORIA),
        // Vai só quando existe: sem isto o pedido é exatamente o de antes.
        ...(chave ? { chave } : {}),
      }),
      signal: desistir.signal,
    });

    if (resposta.status === 429) return { falha: "limite" };
    if (resposta.status === 503) {
      acoplada = false;
      return { falha: "sem-chave" };
    }
    if (!resposta.ok) return { falha: "fora-do-ar" };

    const corpo = (await resposta.json()) as {
      texto?: unknown;
      intencao?: unknown;
    };
    const texto = typeof corpo.texto === "string" ? corpo.texto.trim() : "";
    if (!texto) return { falha: "fora-do-ar" };
    acoplada = true;
    return { texto, intencao: intencaoValida(corpo.intencao) };
  } catch {
    return { falha: "sem-internet" };
  } finally {
    clearTimeout(relogio);
  }
}

/**
 * QUEM RESPONDE AO QUE FOI DIGITADO — a decisao inteira, num lugar so.
 *
 * A tela da conversa nao devia precisar saber nada disto. Ela pergunta "o que
 * essa pessoa responde?" e recebe a resposta pronta. Toda a regra mora aqui,
 * onde da para provar com teste — tela nao se testa direito, e regra escondida
 * dentro de tela e regra que ninguem conserta.
 *
 * ── A ORDEM DE QUEM RESPONDE ──────────────────────────────────────────────
 *
 * 1. A INTELIGENCIA, e SO nos quatro momentos extremos que ele escolheu
 *    (`momentoExtremo.ts`). Fora deles ela nem e chamada.
 * 2. AS FALAS DO BAIRRO, que respondem o resto: instantaneas, sem internet e
 *    sem custo.
 * 3. E, se a pessoa ja falou demais, a DESPEDIDA — porque ela tem o que fazer.
 *
 * ── NENHUM CAMPO NOVO FOI INVENTADO ───────────────────────────────────────
 *
 * A memoria de cada morador nao virou estado novo: ela e LIDA do historico da
 * carteira, que ja existe e ja guarda cada entrega fechada com nota e dia. Um
 * campo a mais no estado seria um campo a mais para salvar, migrar e quebrar.
 */
import type { Intencao } from "./atendimento";
import type { Boca } from "./entender";
import type { Ficha } from "./fichas";
import { fichaDe } from "./fichas";
import type { Situacao } from "./falasDoBairro";
import { deveSair, falaDeSaida, montarFala } from "./falasDoBairro";
import type { ComoFoi, MemoriaDoContato } from "./memoriaDoMorador";
import { MEMORIA_NOVA, resumoPara } from "./memoriaDoMorador";
import type { MotivoDoExtremo } from "./momentoExtremo";
import { EXPLICACAO, momentoExtremo } from "./momentoExtremo";
import { PIADA_DO_PADRINHO, perguntaDoPadrinho } from "./oPadrinho";

/**
 * SO O QUE ESTE ARQUIVO PRECISA SABER DO ESTADO.
 *
 * De proposito nao e o `EstadoDoApp` inteiro: assim o teste monta um estado de
 * quatro campos em vez de arrastar o aplicativo todo para dentro dele.
 */
export interface OQueOJogoSabe {
  /** O minuto do dia do jogo, agora. */
  minuto: number;
  /** Cada entrega fechada, com o dia e a nota. */
  historico: readonly {
    dia: number;
    cliente: string;
    estrelas: number;
    reclamou: boolean;
    bloqueio?: boolean;
  }[];
  /** Os pedidos em curso — e de onde sai o prazo que esta correndo. */
  pedidos: readonly {
    numero: string;
    loja: string;
    cliente: string;
    minuto: number;
    prazoMin: number;
    estado: string;
  }[];
  /** Se esta chovendo no bairro agora. */
  chovendo?: boolean;
}

/** Uma mensagem da conversa, reduzida ao que importa aqui. */
export interface FalaNaTela {
  de: string;
  texto: string;
}

export interface AConversa {
  jogo: OQueOJogoSabe;
  /** O id do contato — e a chave da ficha e do historico. */
  contato: string;
  boca: Boca;
  /** O que o jogador acabou de escrever. */
  frase: string;
  /** As mensagens que ja estao na tela, da mais velha para a mais nova. */
  mensagens: readonly FalaNaTela[];
  /** O jogo pode marcar este instante como virada. */
  viradaDoJogo?: boolean;
  sorteio?: () => number;
}

/** DECISAO DELE: de quantas estrelas para baixo a entrega conta como atrasada. */
export const ESTRELAS_DE_ATRASO = 3;

/** DECISAO DELE: de quantas estrelas para baixo a entrega conta como falha. */
export const ESTRELAS_DE_FALHA = 1;

function comoFoi(estrelas: number): ComoFoi {
  if (estrelas <= ESTRELAS_DE_FALHA) return "falhou";
  if (estrelas <= ESTRELAS_DE_ATRASO) return "atrasada";
  return "no-prazo";
}

/**
 * A MEMORIA DAQUELA PESSOA, LIDA DO HISTORICO.
 *
 * O historico ja e podado para trinta dias pelo proprio jogo, entao a memoria
 * DESBOTA de graca: a entrega ruim de um mes atras simplesmente nao esta mais
 * na lista. E era essa a exigencia — uma entrega ruim nao pode envenenar um
 * morador para sempre, senao o jogo vira castigo sem caminho de volta.
 */
export function memoriaDoContato(
  jogo: OQueOJogoSabe,
  contato: string
): MemoriaDoContato {
  const linhas = jogo.historico.filter(
    l => l.cliente === contato && !l.bloqueio
  );
  if (linhas.length === 0) return MEMORIA_NOVA;

  const ultima = comoFoi(linhas[linhas.length - 1].estrelas);

  let seguidasRuins = 0;
  for (let i = linhas.length - 1; i >= 0; i--) {
    if (comoFoi(linhas[i].estrelas) === "no-prazo") break;
    seguidasRuins++;
  }

  // A unica lembranca que a carteira consegue contar: o telefonema.
  const reclamou = linhas.slice(-3).some(l => l.reclamou);

  return {
    entregas: linhas.length,
    ultima,
    seguidasRuins,
    fatos: reclamou
      ? [
          {
            o: "Voce ja reclamou de uma entrega dele.",
            naEntrega: linhas.length,
          },
        ]
      : [],
    // Depois da primeira entrega a pessoa ja te explicou a mania dela.
    maniaJaDita: linhas.length > 0,
  };
}

/** O prazo que esta correndo para aquele contato, quando existe. */
export function minutosDePrazo(
  jogo: OQueOJogoSabe,
  contato: string
): number | undefined {
  const pedido = jogo.pedidos.find(
    p =>
      (p.cliente === contato || p.loja === contato) &&
      p.estado !== "entregue" &&
      p.estado !== "perdido"
  );
  if (!pedido) return undefined;
  return Math.max(0, pedido.minuto + pedido.prazoMin - jogo.minuto);
}

export function situacaoDaConversa(
  jogo: OQueOJogoSabe,
  contato: string
): Situacao {
  return {
    prazoMin: minutosDePrazo(jogo, contato),
    chovendo: jogo.chovendo,
    hora: Math.floor(jogo.minuto / 60) % 24,
  };
}

/**
 * QUANTAS IDAS E VINDAS SEGUIDAS O JOGADOR JA PUXOU.
 *
 * Conta de tras para frente e para na primeira entrega fechada — porque uma
 * conversa que termina e comeca de novo nao herda o cansaco da anterior.
 */
export function trocasSeguidas(mensagens: readonly FalaNaTela[]): number {
  let trocas = 0;
  for (let i = mensagens.length - 1; i >= 0; i--) {
    if (mensagens[i].de === "voce") trocas++;
    if (trocas >= 12) break;
  }
  return trocas;
}

/** As tres ultimas coisas que ESTA pessoa disse. REGRA 2. */
export function ultimasFalasDele(
  mensagens: readonly FalaNaTela[]
): readonly string[] {
  return mensagens
    .filter(m => m.de !== "voce")
    .slice(-3)
    .map(m => m.texto);
}

export interface Resposta {
  texto: string;
  intencao: Intencao;
  /**
   * A despedida, quando a pessoa ja falou demais. Vem SEPARADA de proposito:
   * na tela ela e um segundo balao, depois de um instante — e assim que gente
   * se despede, e nao emendado na mesma frase.
   */
  despedida?: string;
  /** De onde saiu a resposta. So para depurar e para os testes. */
  veioDe: "falas-do-bairro" | "inteligencia";
}

/**
 * ESTE MOMENTO MERECE A INTELIGENCIA?
 *
 * A tela pergunta isto ANTES de gastar uma chamada. Quando devolve null,
 * ninguem liga para lugar nenhum.
 */
export function precisaDaInteligencia(c: AConversa): MotivoDoExtremo | null {
  /*
   * A PERGUNTA DO PADRINHO NUNCA CHEGA NA INTELIGENCIA.
   *
   * Nem para "responder melhor". O segredo do jogo nao pode depender de um
   * modelo lembrar de uma instrucao — e um jogador que pergunta dez vezes
   * seguidas esta testando exatamente isso. Aqui o portao fecha antes.
   */
  if (respostaTravada(c)) return null;

  return momentoExtremo({
    frase: c.frase,
    memoria: memoriaDoContato(c.jogo, c.contato),
    jaConversaram: c.mensagens.some(m => m.de !== "voce"),
    viradaDoJogo: c.viradaDoJogo,
  });
}

/** A ficha de quem esta falando. */
export function fichaDaConversa(c: AConversa): Ficha {
  return fichaDe(c.contato);
}

/**
 * A CARTEIRINHA QUE VAI JUNTO PARA A INTELIGENCIA.
 *
 * Ideia dele: a memoria nao serve so para lembrar, ela ENTREGA A RESPOSTA
 * PRONTA. Com estas duas linhas a inteligencia nao precisa deduzir quem e a
 * pessoa nem por que ela esta falando — so escolhe as palavras.
 *
 * E por isso que um modelo pequeno e gratuito basta: quem pensou foi o jogo.
 */
export function carteirinhaParaAInteligencia(
  c: AConversa,
  motivo: MotivoDoExtremo
): { lembranca: string; momento: string } {
  const ficha = fichaDaConversa(c);
  const memoria = memoriaDoContato(c.jogo, c.contato);

  const quemEla = [
    ficha.nome ? `Voce e ${ficha.nome}` : "",
    ficha.casa ? `da casa ${ficha.casa}` : "",
    ficha.jeito.join(", "),
    ficha.mania,
  ]
    .filter(Boolean)
    .join(" · ");

  /*
   * O BRIEFING DA FICHA, quando ela tem um.
   *
   * As 48 casas nao tem: para elas, "quem e voce" em uma linha mais o que a
   * pessoa lembra do entregador ja basta. O Renan e a Lorena tem, porque ele
   * escreveu memoria de personagem para os dois — e ali ha coisas que nenhuma
   * linha derivada do jogo diria: a avo com o hortifrua, o bale, a Maya, o
   * primo que nao e primo.
   *
   * Sao POUCAS LINHAS, e nao o documento inteiro. Modelo pequeno se perde em
   * instrucao longa; isto aqui ja nos ensinou isso uma vez.
   */
  const doDocumento = ficha.briefing ?? [];

  return {
    lembranca: [quemEla, ...doDocumento, resumoPara(memoria)]
      .filter(Boolean)
      .join(". "),
    momento: EXPLICACAO[motivo],
  };
}

/**
 * A RESPOSTA DAS FALAS DO BAIRRO — a que nao custa nada.
 *
 * Usada sempre que a inteligencia nao foi chamada, e tambem quando ela foi
 * chamada e nao respondeu. Por isso o teto da camada gratuita nunca quebra o
 * jogo: ele so devolve o jogo ao estado gratuito.
 */
/**
 * A RESPOSTA QUE NAO SE DISCUTE — hoje, so a piada do Padrinho.
 *
 * Devolve a fala pronta quando a pergunta tem resposta travada, e null quando
 * nao tem. Fica antes de tudo: antes do portao da inteligencia e antes das
 * falas do bairro.
 */
export function respostaTravada(c: AConversa): string | null {
  const ficha = fichaDe(c.contato);
  if (!ficha.sabeDoPadrinho) return null;
  return perguntaDoPadrinho(c.frase) ? PIADA_DO_PADRINHO : null;
}

export function respostaDoBairro(c: AConversa): Resposta {
  const ficha = fichaDaConversa(c);

  const travada = respostaTravada(c);
  if (travada) {
    return {
      texto: travada,
      intencao: "conversa",
      despedida: undefined,
      veioDe: "falas-do-bairro",
    };
  }

  const memoria = memoriaDoContato(c.jogo, c.contato);
  const situacao = situacaoDaConversa(c.jogo, c.contato);

  const fala = montarFala({
    frase: c.frase,
    boca: c.boca,
    ficha,
    memoria,
    situacao,
    ultimas: ultimasFalasDele(c.mensagens),
    sorteio: c.sorteio,
  });

  return {
    texto: fala.texto,
    intencao: fala.intencao,
    despedida: despedidaSeForAHora(c, ficha),
    veioDe: "falas-do-bairro",
  };
}

/** Veste a resposta que veio da inteligencia com a mesma despedida. */
export function vestirRespostaDaInteligencia(
  c: AConversa,
  texto: string,
  intencao: Intencao
): Resposta {
  return {
    texto,
    intencao,
    despedida: despedidaSeForAHora(c, fichaDaConversa(c)),
    veioDe: "inteligencia",
  };
}

/**
 * A DESPEDIDA — ideia dele, e a peca que segura o gasto sem parecer que segura.
 *
 * "se jogador prolongar conversa IA ja da um jeito de sair pq tem compromisso
 * com alguma coisa". Nao ha aviso de limite: ha uma pessoa com vida propria.
 *
 * E com entrega correndo ela corta mais cedo, o que e bom duas vezes: e em
 * personagem, e empurra o jogador de volta ao trabalho.
 */
function despedidaSeForAHora(c: AConversa, ficha: Ficha): string | undefined {
  const correndo = minutosDePrazo(c.jogo, c.contato) !== undefined;
  const trocas = trocasSeguidas([
    ...c.mensagens,
    { de: "voce", texto: c.frase },
  ]);
  if (!deveSair(trocas, ficha, correndo)) return undefined;
  return falaDeSaida(ficha, correndo, c.sorteio ?? Math.random);
}

/**
 * ENTENDER O QUE O JOGADOR DIGITOU — sem internet, sem chave, sem custo.
 *
 * Ordem dele, 07/09/2026: "sim teremos uma ia respondendo, mas depois
 * acoplamos essa ia".
 *
 * ── POR QUE ISTO EXISTE, JA QUE A IA VEM DEPOIS ───────────────────────────
 *
 * Porque "depois" nao pode significar teclado morto agora. Um campo que aceita
 * texto e responde "estou sem sinal" toda vez e o mesmo campo de enfeite de
 * antes, so que com uma desculpa. Entao o jogo aprende a entender as sete ou
 * oito coisas que um entregador REALMENTE escreve para uma loja ou um cliente:
 * "to indo", "vou atrasar", "quanto paga", "onde e", "nao vai dar", "valeu".
 *
 * Isso cobre a conversa de trabalho inteira. O que a IA vai somar depois nao e
 * a conversa util — e a conversa SOLTA, a piada, a pergunta torta, o assunto
 * que ninguem previu. Ate la, o teclado ja funciona.
 *
 * ── A ORDEM DE QUEM RESPONDE ──────────────────────────────────────────────
 *
 * 1. A IA, quando estiver acoplada e no ar.
 * 2. Isto aqui, que nunca falha e nao custa nada.
 * 3. Uma frase honesta de quem nao entendeu — e nunca uma resposta chutada.
 *
 * Chutar e o pior dos tres: o personagem responde qualquer coisa, o jogador
 * acha que foi entendido, e a conversa quebra duas falas depois.
 */
import type { Intencao } from "./atendimento";

/** Tira acento, ponto e maiuscula: "Tô indo!" e "to indo" sao a mesma coisa. */
export function simplificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** O que o jogador quis dizer. */
export type Assunto =
  | "indo"
  | "atraso"
  | "aceita"
  | "recusa"
  | "pagamento"
  | "endereco"
  | "agradece"
  | "cumprimenta";

/**
 * AS PALAVRAS DE CADA ASSUNTO.
 *
 * Sao pedacos de palavra, e nao palavras inteiras, porque brasileiro escreve
 * "atrasando", "atrasei", "atrasado" e "vou atrasar" na mesma conversa. O
 * pedaço "atras" pega os quatro.
 *
 * A ORDEM DESTA LISTA IMPORTA: quem vem antes ganha. "Nao vai dar, to atrasado"
 * e recusa, e nao aviso de atraso — e por isso recusa vem antes.
 */
const PALAVRAS: ReadonlyArray<readonly [Assunto, readonly string[]]> = [
  [
    "recusa",
    [
      "nao vai dar",
      "nao consigo",
      "nao posso",
      "cancel",
      "recus",
      "outro dia",
      "hoje nao",
    ],
  ],
  [
    "atraso",
    [
      "atras",
      "demor",
      "furou",
      "furei",
      "pneu",
      "transito",
      "chuva",
      "vou levar mais",
    ],
  ],
  [
    "indo",
    [
      "to indo",
      "tou indo",
      "estou indo",
      "ja vou",
      "chegando",
      "saindo",
      "a caminho",
      "peguei",
      "cheguei",
      "to perto",
    ],
  ],
  [
    "aceita",
    [
      "aceito",
      "pode deixar",
      "fechado",
      "vou buscar",
      "topo",
      "bora",
      "pode contar",
      "tamo junto",
    ],
  ],
  [
    "pagamento",
    ["quanto", "paga", "valor", "frete", "preco", "quanto e", "gorjeta"],
  ],
  [
    "endereco",
    [
      "onde",
      "endereco",
      "referencia",
      "qual a rua",
      "numero",
      "que casa",
      "como chego",
    ],
  ],
  ["agradece", ["obrigad", "valeu", "vlw", "brigad", "agradec", "gratidao"]],
  [
    "cumprimenta",
    ["bom dia", "boa tarde", "boa noite", "oi", "ola", "opa", "e ai", "fala"],
  ],
];

/** Descobre o assunto de uma frase. Devolve null quando nao reconhece nada. */
export function assuntoDe(frase: string): Assunto | null {
  const limpa = simplificar(frase);
  if (!limpa) return null;
  for (const [assunto, pedacos] of PALAVRAS) {
    for (const pedaco of pedacos) {
      // Cumprimento curto so vale se a frase for curta: "oi" dentro de
      // "coisa" nao e cumprimento, e "moito obrigado" nao e "oi".
      if (assunto === "cumprimenta" && pedaco.length <= 3) {
        if (limpa === pedaco || limpa.startsWith(`${pedaco} `)) return assunto;
        continue;
      }
      if (limpa.includes(pedaco)) return assunto;
    }
  }
  return null;
}

/** O tipo de contato muda a boca que responde. */
export type Boca = "loja" | "pessoa" | "grupo" | "sistema";

interface Fala {
  texto: string;
  intencao: Intencao;
}

/**
 * AS RESPOSTAS.
 *
 * Cada assunto tem uma fala por tipo de contato, porque a padaria e a dona
 * Ilda nao falam igual — e o jogo perde a graca no instante em que todo mundo
 * responde a mesma frase.
 *
 * A intencao ao lado e o que o assunto VALE. Quem avisa que vai atrasar ganha
 * prazo do cliente; quem so promete que esta chegando, nao. E assim na rua.
 */
const RESPOSTAS: Readonly<Record<Assunto, Readonly<Record<Boca, Fala>>>> = {
  indo: {
    loja: {
      texto: "Beleza! Tá na sacola aqui esperando",
      intencao: "conversa",
    },
    pessoa: {
      texto: "Que ótimo, vou já ficar de olho no portão 😊",
      intencao: "fica_contente",
    },
    grupo: { texto: "Boa! Tá rendendo hoje", intencao: "conversa" },
    sistema: { texto: "Rota registrada. Bom trabalho.", intencao: "conversa" },
  },
  atraso: {
    loja: {
      texto: "Sem problema, avisa o cliente que eu seguro aqui",
      intencao: "da_mais_prazo",
    },
    pessoa: {
      texto:
        "Ah, obrigada por avisar! Prefiro que chegue inteiro do que rápido",
      intencao: "da_mais_prazo",
    },
    grupo: { texto: "Acontece, parceiro. Vai com calma", intencao: "conversa" },
    sistema: {
      texto: "Atraso anotado. O prazo foi esticado desta vez.",
      intencao: "da_mais_prazo",
    },
  },
  aceita: {
    loja: {
      texto: "Show! Já deixo separado no balcão",
      intencao: "aceita_coleta",
    },
    pessoa: {
      texto: "Obrigada, meu filho! Fico esperando",
      intencao: "aceita_coleta",
    },
    grupo: { texto: "Bora! 🚲", intencao: "conversa" },
    sistema: { texto: "Coleta aceita.", intencao: "aceita_coleta" },
  },
  recusa: {
    loja: {
      texto: "Tranquilo. Vou ver com outro entregador",
      intencao: "recusa_coleta",
    },
    pessoa: {
      texto: "Poxa… tudo bem, eu espero o próximo",
      intencao: "recusa_coleta",
    },
    grupo: {
      texto: "Tranquilo, dia difícil pra todo mundo",
      intencao: "conversa",
    },
    sistema: {
      texto: "Corrida recusada. Sem penalidade.",
      intencao: "recusa_coleta",
    },
  },
  pagamento: {
    loja: {
      texto: "A corrida paga uma parte fixa mais o quilômetro. Sem pegadinha",
      intencao: "conversa",
    },
    pessoa: {
      texto: "Eu já paguei na loja, mas sempre deixo um trocado pra vocês",
      intencao: "promete_gorjeta",
    },
    grupo: {
      texto: "Depende da distância, mano. Rota longa rende mais",
      intencao: "conversa",
    },
    sistema: {
      texto: "O frete é calculado por distância e volume, não por tempo.",
      intencao: "conversa",
    },
  },
  endereco: {
    loja: {
      texto: "O endereço tá no pedido, aparece no seu mapa",
      intencao: "conversa",
    },
    pessoa: {
      texto: "É na minha casa mesmo, o número tá no pedido. Toca a campainha!",
      intencao: "conversa",
    },
    grupo: { texto: "Olha no mapa que o pino aparece", intencao: "conversa" },
    sistema: {
      texto: "O endereço está no pino do mapa.",
      intencao: "conversa",
    },
  },
  agradece: {
    loja: {
      texto: "Nós que agradecemos! Volta sempre",
      intencao: "fica_contente",
    },
    pessoa: {
      texto: "Imagina, querido! Deus te abençoe 🙏",
      intencao: "fica_contente",
    },
    grupo: { texto: "Tamo junto! 💪", intencao: "conversa" },
    sistema: { texto: "De nada. Bom trabalho.", intencao: "conversa" },
  },
  cumprimenta: {
    loja: {
      texto: "Bom dia! Tem pedido pronto aqui quando você puder",
      intencao: "conversa",
    },
    pessoa: { texto: "Oi! Tudo bem? Tô esperando aqui", intencao: "conversa" },
    grupo: { texto: "Bom dia! 🌞", intencao: "conversa" },
    sistema: {
      texto: "Olá. Sistema XB Technology à disposição.",
      intencao: "conversa",
    },
  },
};

/**
 * QUANDO NAO ENTENDEU.
 *
 * A frase precisa fazer duas coisas: dizer a verdade (nao entendi) sem sair da
 * ficcao, e mostrar a saida (os botoes). Personagem que responde "desculpe,
 * nao compreendi sua solicitacao" e um formulario disfarcado de gente.
 */
const NAO_ENTENDI: Readonly<Record<Boca, string>> = {
  loja: "Não entendi bem… me fala pelos botões que é mais rápido",
  pessoa: "Como assim, meu filho? Não entendi 😅",
  grupo: "Não entendi, mano 😅",
  sistema: "Não reconheci esse pedido. Use as opções abaixo.",
};

/** A resposta do personagem para o que o jogador digitou. */
export function responderPorPalavra(frase: string, boca: Boca): Fala {
  const assunto = assuntoDe(frase);
  if (!assunto) return { texto: NAO_ENTENDI[boca], intencao: "conversa" };
  return RESPOSTAS[assunto][boca];
}

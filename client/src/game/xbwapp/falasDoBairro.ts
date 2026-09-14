/**
 * AS FALAS DO BAIRRO — a frase e MONTADA, nao escrita.
 *
 * Pergunta dele, 13/09/2026: "podemos gerar um pequeno motor de conversas
 * curtas? mas nao tao repetitivas?"
 *
 * ── ISTO NAO CUSTA NADA ───────────────────────────────────────────────────
 *
 * Roda aqui dentro, no aparelho do jogador, sem internet e sem conta em lugar
 * nenhum. Zero por mensagem, hoje e sempre. Ele chegou a entender o contrario
 * uma vez: quem custa e a IA, que e outra coisa e entra so nos momentos
 * extremos (ver `momentoExtremo.ts`).
 *
 * ── POR QUE O JOGO REPETIA ────────────────────────────────────────────────
 *
 * O jeito antigo (`entender.ts`) tem uma frase guardada por assunto e por tipo
 * de contato: 36 frases no total, e a mesma sempre. Em dez minutos o jogador
 * viu o repertorio inteiro. Escrever cinco versoes de cada seria cinco vezes o
 * trabalho e continuaria repetindo, so que mais tarde.
 *
 * ── O CONSERTO: QUATRO ENCAIXES ───────────────────────────────────────────
 *
 *   abertura (pode faltar) · MIOLO (sempre) · tempero (pode faltar) · fecho
 *
 * Cem pedacinhos de duas a quatro palavras, escritos uma vez, dao dezenas de
 * milhares de mensagens. E tres regras impedem que vire sopa:
 *
 *   REGRA 1 — o JEITO filtra os pedacos. Quem e seco nunca recebe abertura
 *   educada nem fecho; quem so fala de trabalho nunca recebe tempero.
 *
 *   REGRA 2 — nunca repetir as tres ultimas. Sozinha, mata quase toda a
 *   sensacao de "ja vi isso".
 *
 *   REGRA 3 — a SITUACAO troca o miolo. E a mais importante das tres:
 *   VARIEDADE QUE VEM DE SORTEIO PARECE ALEATORIA; VARIEDADE QUE VEM DA
 *   SITUACAO PARECE GENTE.
 */
import type { Intencao } from "./atendimento";
import type { Assunto, Boca } from "./entender";
import { assuntoDe } from "./entender";
import type { Ficha } from "./fichas";
import { FICHA_PADRAO } from "./fichas";
import type { MemoriaDoContato } from "./memoriaDoMorador";
import { MEMORIA_NOVA, intimidade } from "./memoriaDoMorador";

/**
 * A PRATELEIRA DE MIOLO — a Regra 3 em forma de palavra.
 *
 * Tudo isto o jogo JA SABE sem escrever nada novo: o prazo sai do relogio da
 * entrega, a chuva do tempo, a intimidade da memoria, o "deu errado" da ultima
 * entrega. Nenhum campo novo precisou ser inventado.
 */
export type Prateleira =
  | "base"
  | "apertado"
  | "chuva"
  | "de-casa"
  | "deu-errado";

export interface Situacao {
  /** Minutos que faltam no prazo. Ausente quando nao ha entrega em curso. */
  prazoMin?: number;
  chovendo?: boolean;
  /** A hora do dia, 0 a 23 — muda cumprimento e desculpa. */
  hora?: number;
}

/** DECISAO DELE: abaixo de quantos minutos o prazo conta como apertado. */
export const PRAZO_APERTADO_MIN = 6;

/**
 * A ORDEM DE ESCOLHA DA PRATELEIRA IMPORTA.
 *
 * "Deu errado" ganha de tudo: quem foi deixado na mao da ultima vez fala disso
 * antes de falar do tempo. Depois vem o prazo apertado, porque e o que esta
 * acontecendo agora. A chuva e a intimidade sao tempero de fundo.
 */
export function prateleiraDe(s: Situacao, m: MemoriaDoContato): Prateleira {
  if (m.ultima === "atrasada" || m.ultima === "falhou") return "deu-errado";
  if (s.prazoMin !== undefined && s.prazoMin <= PRAZO_APERTADO_MIN)
    return "apertado";
  if (s.chovendo) return "chuva";
  if (intimidade(m) === "de-casa") return "de-casa";
  return "base";
}

type Prateleiras = Partial<Record<Prateleira, readonly string[]>> & {
  base: readonly string[];
};

/**
 * OS MIOLOS.
 *
 * Um miolo NAO traz cumprimento nem despedida — esses sao encaixes proprios,
 * senao a Regra 1 nao consegue tirar a educacao de quem e seco.
 */
const MIOLOS: Readonly<Record<Boca, Readonly<Record<Assunto, Prateleiras>>>> = {
  pessoa: {
    indo: {
      base: [
        "fico de olho no portão",
        "já vou ficar esperando",
        "tô em casa",
        "pode vir que eu tô aqui",
        "fico esperando então",
      ],
      apertado: [
        "vem que eu tô na porta",
        "já desço",
        "tô te esperando aqui embaixo",
        "corre que eu já desci",
      ],
      chuva: [
        "vem com cuidado",
        "não corre nessa chuva",
        "devagar que a rua tá escorregando",
      ],
      "de-casa": [
        "pode vir que você já sabe",
        "tô aqui, como sempre",
        "já sei, já vou descendo",
      ],
      "deu-errado": [
        "dessa vez eu fico esperando na porta",
        "hoje eu não saio daqui até você chegar",
      ],
    },
    atraso: {
      base: [
        "pode vir com calma",
        "prefiro que chegue inteiro do que rápido",
        "sem correria",
        "tudo bem, não tem pressa",
        "obrigad{a/o} por avisar",
      ],
      apertado: [
        "poxa… mas tudo bem",
        "ah não, sério?",
        "e demora muito?",
        "eu preciso sair daqui a pouco",
        "quanto tempo?",
      ],
      chuva: [
        "nem se apresse com essa chuva",
        "com chuva ninguém corre",
        "melhor atrasar do que cair",
      ],
      "de-casa": [
        "você nunca me deixou na mão, vai devagar",
        "imagina, já te conheço",
        "tranquilo, você sempre chega",
      ],
      "deu-errado": [
        "da última vez também apertou, né?",
        "de novo?",
        "tá virando costume",
        "assim eu já fico sem saber",
      ],
    },
    aceita: {
      base: ["fico esperando", "combinado"],
      apertado: ["então vem logo", "corre que dá tempo"],
      "de-casa": ["nem precisava perguntar"],
      "deu-errado": ["dessa vez dá certo, né?"],
    },
    recusa: {
      base: ["tudo bem, eu espero o próximo", "poxa… tudo bem"],
      apertado: ["e agora, como é que fica?"],
      chuva: ["com essa chuva eu entendo"],
      "de-casa": ["tranquilo, você já fez muito por mim"],
      "deu-errado": ["a segunda vez seguida, hein"],
    },
    pagamento: {
      base: [
        "eu já paguei na loja, mas sempre deixo um trocado",
        "o pagamento tá na loja",
      ],
      "de-casa": ["você sabe que eu sempre deixo um agrado"],
      chuva: ["com chuva eu deixo um a mais"],
    },
    endereco: {
      base: ["o número tá no pedido", "é na minha casa mesmo"],
      apertado: ["olha o mapa que é mais rápido"],
      "de-casa": ["você já veio aqui, lembra?"],
    },
    agradece: {
      base: ["imagina!", "nós que agradecemos", "de nada"],
      "de-casa": ["você é de casa já"],
      chuva: ["você que veio nessa chuva, obrigad{a/o}"],
    },
    cumprimenta: {
      base: ["tudo bem?", "tô esperando aqui"],
      apertado: ["e aí, tá vindo?"],
      "de-casa": ["e aí, tudo certo por aí?"],
      "deu-errado": ["hoje dá certo?"],
    },
  },
  loja: {
    indo: {
      base: ["tá na sacola esperando", "já deixo no balcão"],
      apertado: ["corre que tá esfriando", "vem que tá pronto"],
      "de-casa": ["já separei igual sempre"],
      "deu-errado": ["hoje eu deixo separado antes"],
    },
    atraso: {
      base: ["sem problema, eu seguro aqui", "avisa o cliente que eu espero"],
      apertado: ["vai esfriar, mas tudo bem"],
      chuva: ["com essa chuva todo mundo atrasa"],
      "deu-errado": ["de novo hein, presta atenção"],
    },
    aceita: {
      base: ["já deixo separado no balcão", "fechado"],
      apertado: ["corre que já tá na sacola"],
      "de-casa": ["do jeito que você gosta"],
    },
    recusa: {
      base: ["tranquilo, vou ver com outro"],
      apertado: ["preciso de alguém agora"],
      "deu-errado": ["assim fica difícil"],
    },
    pagamento: {
      base: ["a corrida paga a parte fixa mais o quilômetro"],
      "de-casa": ["você já sabe como é"],
    },
    endereco: {
      base: ["o endereço tá no pedido", "aparece no seu mapa"],
      apertado: ["olha no mapa, é rápido"],
    },
    agradece: {
      base: ["nós que agradecemos", "volta sempre"],
      "de-casa": ["sempre bom trabalhar com você"],
    },
    cumprimenta: {
      base: ["tem pedido pronto aqui quando puder"],
      apertado: ["tem pedido saindo agora"],
      "de-casa": ["e aí, tudo certo?"],
    },
  },
  grupo: {
    indo: { base: ["boa, tá rendendo hoje", "bora"] },
    atraso: {
      base: ["acontece, parceiro", "vai com calma"],
      chuva: ["com essa chuva ninguém tá rendendo"],
    },
    aceita: { base: ["bora!"] },
    recusa: { base: ["tranquilo, dia difícil pra todo mundo"] },
    pagamento: {
      base: ["depende da distância, rota longa rende mais"],
    },
    endereco: { base: ["olha no mapa que o pino aparece"] },
    agradece: { base: ["tamo junto"] },
    cumprimenta: { base: ["e aí, como tá a rua hoje?"] },
  },
  sistema: {
    indo: { base: ["Rota registrada."] },
    atraso: {
      base: ["Atraso anotado. O prazo foi esticado desta vez."],
      "deu-errado": ["Segundo atraso seguido neste endereço."],
    },
    aceita: { base: ["Coleta aceita."] },
    recusa: { base: ["Corrida recusada. Sem penalidade."] },
    pagamento: {
      base: ["O frete é calculado por distância e volume, não por tempo."],
    },
    endereco: { base: ["O endereço está no pino do mapa."] },
    agradece: { base: ["De nada. Bom trabalho."] },
    cumprimenta: { base: ["Sistema XB Technology à disposição."] },
  },
};

/** REGRA 1: so quem tem educacao cumprimenta. */
const ABERTURAS: Readonly<Record<string, readonly string[]>> = {
  formal: ["Ah", "Olha", "Ô moço", "Que bom"],
  normal: ["Oi", "Opa", "Ô", "Beleza"],
  seco: [],
};

/** REGRA 1: so quem tem educacao se despede. */
const FECHOS: Readonly<Record<string, readonly string[]>> = {
  formal: ["viu?", "tá bom?", "obrigad{a/o}!", "Deus te abençoe"],
  normal: ["beleza?", "valeu", "tá?"],
  seco: [],
};

/**
 * TEMPEROS DE FUNDO — o que qualquer um pode dizer.
 *
 * O tempero EXCLUSIVO de cada pessoa e o compromisso dela, que ninguem mais no
 * bairro pode dizer. Estes aqui sao o resto do tabuleiro.
 */
const TEMPEROS_DE_FUNDO: Readonly<Record<Prateleira, readonly string[]>> = {
  base: ["tá corrido hoje", "o dia tá calmo aqui"],
  apertado: ["o relógio tá correndo", "tô de olho na hora"],
  chuva: ["essa chuva não para", "tá caindo um toró"],
  "de-casa": ["como sempre", "você já conhece"],
  "deu-errado": ["depois da última, fiquei em dúvida"],
};

function sortear<T>(lista: readonly T[], sorteio: () => number): T | undefined {
  if (lista.length === 0) return undefined;
  return lista[Math.floor(sorteio() * lista.length) % lista.length];
}

function talvez(chance: number, sorteio: () => number): boolean {
  return sorteio() < chance;
}

/** A chance de cada encaixe aparecer, por jeito de prosa. REGRA 1. */
const CHANCE: Readonly<
  Record<string, { abertura: number; tempero: number; fecho: number }>
> = {
  trabalho: { abertura: 0.25, tempero: 0, fecho: 0.1 },
  papo: { abertura: 0.6, tempero: 0.35, fecho: 0.45 },
  tagarela: { abertura: 0.85, tempero: 0.8, fecho: 0.8 },
};

/**
 * A CONCORDANCIA — "obrigad{a/o}" vira obrigada ou obrigado.
 *
 * Sem isto o Seu Genaro agradecia no feminino. Nada denuncia mais depressa que
 * a fala e de maquina do que uma palavra no genero errado, e era a MESMA lista
 * de pedacos servindo homem e mulher. A flexao fica na propria fala, entre
 * chaves, entao acrescentar uma fala nova nao exige mexer em codigo nenhum.
 */
export function flexionar(texto: string, ela: boolean): string {
  return texto.replace(/\{([^}/]*)\/([^}]*)\}/g, (_, dela, dele) =>
    ela ? dela : dele
  );
}

function juntar(pedacos: readonly (string | undefined)[]): string {
  const vivos = pedacos.filter((p): p is string => !!p && p.trim() !== "");
  if (vivos.length === 0) return "";
  const texto = vivos.join(", ").replace(/\s+/g, " ").trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export interface FalaMontada {
  texto: string;
  intencao: Intencao;
  /** Qual prateleira produziu a fala — util para teste e para depurar. */
  prateleira: Prateleira;
}

/** O que cada assunto VALE. Igual ao que ja valia; a fala e que mudou. */
const INTENCAO_DO_ASSUNTO: Readonly<Record<Assunto, Intencao>> = {
  indo: "conversa",
  atraso: "da_mais_prazo",
  aceita: "aceita_coleta",
  recusa: "recusa_coleta",
  pagamento: "conversa",
  endereco: "conversa",
  agradece: "fica_contente",
  cumprimenta: "conversa",
};

/** Quando o assunto vale menos vindo de uma loja ou do sistema. */
function intencaoDe(assunto: Assunto, boca: Boca): Intencao {
  if (boca === "grupo") return "conversa";
  if (assunto === "pagamento" && boca === "pessoa") return "promete_gorjeta";
  return INTENCAO_DO_ASSUNTO[assunto];
}

export interface PedidoDeFala {
  frase: string;
  boca: Boca;
  ficha?: Ficha;
  memoria?: MemoriaDoContato;
  situacao?: Situacao;
  /** REGRA 2: as tres ultimas coisas que esta pessoa disse. */
  ultimas?: readonly string[];
  sorteio?: () => number;
}

/** DECISAO DELE: quantas falas de tras nao podem se repetir. */
export const NAO_REPETIR_AS_ULTIMAS = 3;

/** Quantas vezes tentar de novo antes de aceitar uma repetida. */
const TENTATIVAS = 8;

/**
 * QUANDO NAO ENTENDEU.
 *
 * A frase precisa dizer a verdade (nao entendi) sem sair da ficcao, e mostrar
 * a saida. Personagem que diz "nao compreendi sua solicitacao" e um formulario
 * disfarcado de gente.
 */
const NAO_ENTENDI: Readonly<Record<Boca, readonly string[]>> = {
  pessoa: [
    "Como assim? Não entendi 😅",
    "Ué, não entendi bem",
    "Não peguei o que você quis dizer",
  ],
  loja: [
    "Não entendi bem… me fala pelos botões que é mais rápido",
    "Como é que é? Não peguei",
  ],
  grupo: ["Não entendi, mano 😅", "Como assim?"],
  sistema: ["Não reconheci esse pedido. Use as opções abaixo."],
};

function montarUmaVez(
  p: Required<Omit<PedidoDeFala, "sorteio">>,
  sorteio: () => number
): FalaMontada | null {
  const assunto = assuntoDe(p.frase);
  const prateleira = prateleiraDe(p.situacao, p.memoria);

  if (!assunto) {
    const texto = sortear(NAO_ENTENDI[p.boca], sorteio);
    return texto
      ? {
          texto: flexionar(texto, p.ficha.ela === true),
          intencao: "conversa",
          prateleira,
        }
      : null;
  }

  const prateleiras = MIOLOS[p.boca][assunto];
  const daPrateleira = prateleiras[prateleira];
  /*
   * A FRASE DE ASSINATURA CONCORRE, NAO MANDA.
   *
   * As frases canonicas do Renan e da Lorena ("No ultimo minuto do segundo
   * tempo", "Ja to indo, na pontinha do pe") entram na sacola da prateleira
   * junto com as outras, em vez de substitui-las.
   *
   * Fazer o contrario seria tentador e estaria errado: frase que sai SEMPRE
   * vira bordao, e bordao denuncia a maquina tao rapido quanto repetir a
   * mesma resposta. Concorrendo, ela aparece bastante, soa dela, e a regra de
   * nao repetir as tres ultimas ainda a segura.
   */
  const assinatura = p.ficha.assinatura?.[assunto]?.[prateleira] ?? [];
  const sacola = [...assinatura, ...(daPrateleira ?? [])];
  const miolo = sortear(sacola, sorteio) ?? sortear(prateleiras.base, sorteio);
  if (!miolo) return null;

  const [, educacao, prosa] = p.ficha.jeito;
  const chance = CHANCE[prosa];

  // O sistema nao cumprimenta, nao tempera e nao se despede: e uma maquina,
  // e fingir o contrario seria a unica mentira deste arquivo.
  const ehGente = p.boca !== "sistema";

  const abertura =
    ehGente && talvez(chance.abertura, sorteio)
      ? sortear(ABERTURAS[educacao], sorteio)
      : undefined;

  // O tempero exclusivo da pessoa e o compromisso dela; o de fundo entra
  // quando ela nao tem um proprio.
  /*
   * O tempero proprio da pessoa e o compromisso dela MAIS a vida dela — o
   * futebol do Renan, o bale e a Maya da Lorena. Falas fechadas, escritas uma
   * vez: a vida aparece e nunca acontece nada que o jogo nao saiba.
   */
  const proprios = [
    ...(p.ficha.compromisso ? [p.ficha.compromisso] : []),
    ...(p.ficha.vida ?? []),
  ];
  /*
   * O TEMPERO NAO PODE REPETIR O QUE O MIOLO JA DISSE.
   *
   * "To aqui, como sempre" + o tempero "como sempre" saía na tela como
   * "To aqui, como sempre, como sempre" — e nada denuncia mais depressa que a
   * frase e montada por maquina do que um pedaco dito duas vezes seguidas.
   *
   * Achado em 13/09/2026 medindo as 650 falas do arquivo do elenco: quatro
   * saíram assim, todas na mesma colisao. Tirar o pedaco repetido da sacola
   * ANTES do sorteio custa uma linha e resolve a familia inteira de casos.
   */
  const jaDito = miolo.toLowerCase();
  const poolTempero = [...proprios, ...TEMPEROS_DE_FUNDO[prateleira]].filter(
    pedaco => !jaDito.includes(pedaco.toLowerCase())
  );
  const tempero =
    ehGente && poolTempero.length > 0 && talvez(chance.tempero, sorteio)
      ? sortear(poolTempero, sorteio)
      : undefined;

  const fecho =
    ehGente && talvez(chance.fecho, sorteio)
      ? sortear(FECHOS[educacao], sorteio)
      : undefined;

  const texto = flexionar(
    juntar([abertura, miolo, tempero, fecho]),
    p.ficha.ela === true
  );
  if (!texto) return null;

  return { texto, intencao: intencaoDe(assunto, p.boca), prateleira };
}

/**
 * MONTA A RESPOSTA DO MORADOR.
 *
 * REGRA 2 mora aqui: se o sorteio cair numa das tres ultimas falas daquela
 * pessoa, sorteia de novo. Depois de algumas tentativas aceita a repetida —
 * melhor repetir do que travar.
 */
export function montarFala(pedido: PedidoDeFala): FalaMontada {
  const sorteio = pedido.sorteio ?? Math.random;
  const completo = {
    frase: pedido.frase,
    boca: pedido.boca,
    ficha: pedido.ficha ?? FICHA_PADRAO,
    memoria: pedido.memoria ?? MEMORIA_NOVA,
    situacao: pedido.situacao ?? {},
    ultimas: pedido.ultimas ?? [],
  };

  const proibidas = new Set(completo.ultimas.slice(-NAO_REPETIR_AS_ULTIMAS));

  let ultima: FalaMontada | null = null;
  for (let i = 0; i < TENTATIVAS; i++) {
    const tentativa = montarUmaVez(completo, sorteio);
    if (!tentativa) continue;
    ultima = tentativa;
    if (!proibidas.has(tentativa.texto)) return tentativa;
  }

  return (
    ultima ?? {
      texto: NAO_ENTENDI[completo.boca][0],
      intencao: "conversa",
      prateleira: "base",
    }
  );
}

/* ───────────────────────────────────────────────────────────────────────────
 * A SAIDA DA CONVERSA — ideia dele, e a melhor peca do conjunto.
 *
 * "se jogador prolongar conversa IA ja da um jeito de sair pq tem compromisso
 * com alguma coisa"
 *
 * Por que isto e grande: e um TETO DE GASTO QUE NAO PARECE TETO. Nao ha aviso
 * de limite nem mensagem de sistema — ha uma pessoa com vida propria. E e
 * verdade: ninguem fica batendo papo com o entregador.
 *
 * E tem um segundo servico, que nao e sobre dinheiro: a saida EMPURRA O
 * JOGADOR DE VOLTA AO TRABALHO. Se ha entrega correndo, o morador dizer "vai
 * que ta tarde" e ao mesmo tempo em personagem e bom para o jogo. O bairro
 * cobrando voce de volta e melhor que qualquer aviso na tela.
 * ────────────────────────────────────────────────────────────────────────── */

/** DECISAO DELE: quantas idas e vindas cada jeito aguenta. */
export const TROCAS_ATE_SAIR: Readonly<Record<string, number>> = {
  trabalho: 2,
  papo: 3,
  tagarela: 5,
};

export function deveSair(
  trocas: number,
  ficha: Ficha,
  temEntregaCorrendo: boolean
): boolean {
  const [, , prosa] = ficha.jeito;
  const teto = TROCAS_ATE_SAIR[prosa] ?? 3;
  // Com entrega correndo a pessoa corta mais cedo — e o empurrao de volta.
  return trocas >= (temEntregaCorrendo ? Math.max(1, teto - 1) : teto);
}

export function falaDeSaida(
  ficha: Ficha,
  temEntregaCorrendo: boolean,
  sorteio: () => number = Math.random
): string {
  const [, educacao] = ficha.jeito;

  const desculpa = ficha.compromisso || "tenho que resolver uma coisa aqui";
  const empurrao = temEntregaCorrendo
    ? sortear(
        [
          "vai que tá tarde",
          "corre que o relógio não espera",
          "vai lá, some daqui",
        ],
        sorteio
      )
    : undefined;
  const depois = sortear(
    ["depois a gente conversa", "falo com você depois", "depois você me conta"],
    sorteio
  );

  if (educacao === "seco") {
    return flexionar(juntar([desculpa, empurrao]), ficha.ela === true);
  }
  return flexionar(juntar([desculpa, empurrao, depois]), ficha.ela === true);
}

/**
 * A FICHA DE CADA MORADOR — quem ele e, em tres palavras.
 *
 * Ordem dele, 13/09/2026: comecar pelo JEITO de cada morador, e batizar todos.
 *
 * ── POR QUE TRES PALAVRAS E NAO UM PERSONAGEM ESCRITO ─────────────────────
 *
 * Escrever personagem custa caro: rosto, historia, coerencia entre conversas,
 * e uma pilha de dialogo que envelhece. Jeito e receita. Tres eixos com tres
 * valores cada dao VINTE E SETE jeitos diferentes, e o mesmo punhado de
 * pedacinhos de frase produz uma pessoa diferente em cada ficha.
 *
 * E a mesma ideia das 67 portas do bairro: nao batizar, COMBINAR.
 *
 * ── AS DUAS COISAS QUE O JOGO JA SABE E NAO PRECISAM ESTAR AQUI ───────────
 *
 * A confianca que a pessoa tem em voce vem da reputacao, que ja existe e ja
 * anda sozinha. O que ela costuma pedir vem da loja mais perto da casa dela,
 * que ja esta medida. Ficha nenhuma repete isso.
 *
 * ── O COMPROMISSO E A PECA MAIS IMPORTANTE DESTE ARQUIVO ──────────────────
 *
 * Ideia dele: se o jogador prolongar a conversa, a pessoa SAI porque tem o que
 * fazer. O compromisso e essa desculpa, e ela nao foi inventada — e a mania da
 * propria pessoa. A Dona Sebastiana tem bolo no forno; o bebe do Rogerio
 * acordou.
 *
 * Isso e um teto de gasto que o jogador nunca enxerga como teto: nao ha aviso
 * de limite, ha uma pessoa com vida propria. E e verdade — ninguem fica
 * batendo papo com o entregador.
 */

import type { Assunto } from "./entender";
import type { Prateleira } from "./falasDoBairro";

/** Quanto a pessoa aperta quando voce demora. */
export type Pressa = "calmo" | "normal" | "apressado";

/** Se ela cumprimenta e se despede, ou vai direto ao ponto. */
export type Educacao = "formal" | "normal" | "seco";

/** Se ela responde e para, ou puxa assunto. */
export type Prosa = "trabalho" | "papo" | "tagarela";

export interface Ficha {
  /** O nome que aparece na conversa. */
  nome: string;
  /**
   * Se e mulher. Serve para UMA coisa so: a concordancia das falas.
   *
   * Sem isto o Seu Genaro dizia "obrigada por avisar" — e nada denuncia mais
   * depressa que a fala e de maquina do que uma palavra no genero errado.
   * As falas gravam a flexao entre chaves, assim: "obrigad{a/o}".
   */
  ela?: boolean;
  /** O numero da casa — continua sendo o ENDERECO, mesmo com nome. */
  casa?: number;
  /**
   * A IDADE, quando ela existe.
   *
   * Nao e enfeite de ficha: e o que explica a mania. A dona Zica conhece todo
   * mundo porque tem 79 anos na mesma rua; o Tulio so recebe depois das 19h
   * porque tem 33 e trabalha fora. Quem le a lista entende a pessoa numa
   * olhada, e quem escreve fala nova acerta o tom sem precisar perguntar.
   *
   * Sai da FOLHA DE 08/09/2026 (`NOTAS DE TRABALHO/MORADORES_BAIRRO_XB.md`),
   * que e dele. Loja e sistema nao tem idade, e por isso o campo e opcional.
   */
  idade?: number;
  jeito: readonly [Pressa, Educacao, Prosa];
  /**
   * A mania: a coisa que so esta pessoa pode dizer. Vira o "tempero" das
   * falas, e e o que faz cada morador soar como ele mesmo.
   */
  mania: string;
  /**
   * A desculpa honesta para sair da conversa. Sai da mania — nunca e um aviso
   * de sistema disfarcado.
   */
  compromisso: string;
  /**
   * AS FRASES QUE SO ESTA PESSOA DIZ, na prateleira onde elas cabem.
   *
   * Vieram dos documentos que ele escreveu do Renan e da Lorena (14/09/2026):
   * "Deixa que eu cobro essa", "No ultimo minuto do segundo tempo", "Ja to
   * indo, na pontinha do pe". Sao frases canonicas — dele, nao minhas.
   *
   * Elas nao substituem a prateleira: entram NA SACOLA junto com as outras e
   * concorrem no sorteio. Assim a frase de assinatura aparece com frequencia
   * sem virar bordao — e a regra de nao repetir as tres ultimas continua
   * valendo para ela como para qualquer outra.
   *
   * A chave e ASSUNTO e depois PRATELEIRA, na mesma ordem em que as falas do
   * bairro sao guardadas — e por um motivo pratico: "No ultimo minuto do
   * segundo tempo" e uma resposta boa para "to indo" com o prazo apertado, e
   * uma resposta sem sentido para "quanto paga". Guardar so por prateleira
   * deixaria a frase aparecer no lugar errado.
   */
  assinatura?: Partial<
    Record<Assunto, Partial<Record<Prateleira, readonly string[]>>>
  >;
  /**
   * A VIDA DELA, EM FALAS FECHADAS — e nunca como assunto livre.
   *
   * O documento da Lorena avisa, com razao: "nunca inventar que a Maya fez
   * alguma coisa especifica". E exatamente o erro que um modelo pequeno
   * comete — peca "fale da sua cachorra as vezes" e em duas semanas a Maya
   * fugiu, adoeceu e teve filhotes, e o jogador vai lembrar.
   *
   * Entao a vida de cada um entra como TEMPERO fechado: cinco ou seis frases
   * escritas uma vez. A Maya aparece, o bale aparece, o futebol aparece — e
   * nunca acontece nada que o jogo nao saiba.
   */
  vida?: readonly string[];
  /**
   * AS LINHAS QUE VAO PARA A INTELIGENCIA nos momentos extremos.
   *
   * Nao e o documento inteiro: sao as poucas linhas que ela precisa para nao
   * deduzir nada. Modelo pequeno se perde em instrucao longa — ja aprendemos
   * isso aqui, quando o bloco do JSON teve de virar a ultima coisa que ele le.
   */
  briefing?: readonly string[];
  /**
   * SABE QUEM E O PADRINHO — e nunca conta.
   *
   * Quem tem isto responde a piada dele, travada, sem passar pela
   * inteligencia. Ver `oPadrinho.ts`: o que nao pode falhar nao pode ser
   * pedido, tem de ser codigo.
   */
  sabeDoPadrinho?: boolean;
}

/**
 * AS CASAS — AS QUARENTA E OITO, E OS NOMES SAO OS DO DESENHO.
 *
 * ── O CONSERTO DE 13/09/2026, E POR QUE ELE ERA NECESSARIO ────────────────
 *
 * As 18 primeiras ja existiam no aplicativo com nome e mania; aqui elas
 * ganharam so o jeito, escolhido para combinar com a mania que ja era delas —
 * nada foi sorteado.
 *
 * As outras eu tinha BATIZADO. Estava errado, e de um jeito que o proprio
 * arquivo do bairro avisa: "inventar nome seria escrever no mapa uma coisa que
 * ninguem decidiu, e depois ninguem lembra que foi invencao". Cada casa do
 * desenho JA TINHA DONO desde o dia em que o bairro foi batizado — "casa da
 * dona Alzira", "casa do seu Elpidio" —, entao a casa 20 tinha dois nomes ao
 * mesmo tempo: um no mapa e outro na agenda. O jogador veria os dois.
 *
 * Agora o nome vem SEMPRE do desenho. Onde o desenho diz "casa da familia X",
 * a pessoa ganhou um primeiro nome — que e o mesmo que ja se fazia com o
 * Rogerio Martins e a Vera Siqueira —, e o sobrenome e o do mapa. O teste
 * `osMoradores` nao deixa mais isso se separar de novo.
 *
 * E SAO 48, nao 47: quem conta as casas e o desenho (`QUANTAS_CASAS`), nao a
 * minha mao.
 *
 * A NUMERACAO SEGUE A RUA: casa 1 e a mais perto da base andando, casa 48 a
 * mais longe. Por isso as manias das casas altas falam de subida, de espera e
 * de vizinha — nao por capricho, e o que a medicao do bairro mostrou.
 *
 * TROCAR UM NOME MEXE NUMA LINHA SO — aqui e no desenho, que e quem manda.
 */
export const CASAS: Readonly<Record<number, Ficha>> = {
  1: {
    nome: "Cláudia Prado",
    ela: true,
    idade: 41,
    jeito: ["apressado", "normal", "papo"],
    mania: "mãe de gêmeos, pede sempre em dobro",
    compromisso: "os gêmeos estão me chamando",
  },
  2: {
    nome: "Seu Genaro",
    idade: 68,
    jeito: ["normal", "seco", "trabalho"],
    mania: "acorda às 5h, não gosta de entrega depois das 20h",
    compromisso: "vou dormir que acordo às cinco",
  },
  3: {
    nome: "Seu Aparecido",
    idade: 57,
    jeito: ["calmo", "normal", "papo"],
    mania: "mecânico, pede para deixar no banco da varanda",
    compromisso: "tenho um carro na rampa aqui",
  },
  4: {
    nome: "Dona Sebastiana",
    ela: true,
    idade: 74,
    jeito: ["calmo", "formal", "tagarela"],
    mania: "faz bolo toda quarta",
    compromisso: "o bolo tá no forno",
  },
  5: {
    nome: "Waldir",
    idade: 52,
    jeito: ["normal", "seco", "trabalho"],
    mania: "trabalha de madrugada, só recebe à tarde",
    compromisso: "vou deitar que hoje eu viro a noite",
  },
  6: {
    nome: "Dona Marlene",
    ela: true,
    idade: 63,
    jeito: ["calmo", "formal", "papo"],
    mania: "costureira, sempre dá caixinha",
    compromisso: "tenho um vestido pra entregar hoje",
  },
  7: {
    nome: "Dona Zica",
    ela: true,
    idade: 79,
    jeito: ["calmo", "normal", "tagarela"],
    mania: "a mais antiga da rua, conhece todo mundo",
    compromisso: "a vizinha tá me chamando no portão",
  },
  8: {
    nome: "Dona Divina",
    ela: true,
    idade: 66,
    jeito: ["calmo", "formal", "papo"],
    mania: "rega as plantas às 7h, atende na calçada",
    compromisso: "deixa eu fechar a mangueira aqui",
  },
  9: {
    nome: "Rogério Martins",
    idade: 38,
    jeito: ["apressado", "normal", "trabalho"],
    mania: "bebê dormindo: não toque a campainha, bata palma",
    compromisso: "o bebê acordou",
  },
  10: {
    nome: "Dona Lourdes",
    ela: true,
    idade: 71,
    jeito: ["normal", "formal", "tagarela"],
    mania: "faz quitanda para fora, manda mais do que recebe",
    compromisso: "tenho encomenda pra fechar",
  },
  11: {
    nome: "Dona Terezinha",
    ela: true,
    idade: 69,
    jeito: ["calmo", "normal", "trabalho"],
    mania: "portão encostado, manda deixar na mesa da cozinha",
    compromisso: "vou pôr a panela no fogo",
  },
  12: {
    nome: "Dona Cida",
    ela: true,
    idade: 58,
    jeito: ["apressado", "normal", "tagarela"],
    mania: "cuida de três netos, pedido grande e sempre com refrigerante",
    compromisso: "os meninos tão brigando aqui",
  },
  13: {
    nome: "Vera Siqueira",
    ela: true,
    idade: 44,
    jeito: ["normal", "formal", "trabalho"],
    mania: "professora, pede papelaria em semana de prova",
    compromisso: "tenho prova pra corrigir",
  },
  14: {
    nome: "Dona Ilda",
    ela: true,
    idade: 77,
    jeito: ["calmo", "normal", "tagarela"],
    mania: "de manhã está em casa; à tarde joga baralho na casa da Zica",
    compromisso: "o baralho tá começando lá na Zica",
  },
  15: {
    nome: "Adriano Rocha",
    idade: 35,
    jeito: ["calmo", "seco", "trabalho"],
    mania: "trabalha em casa, recebe a qualquer hora mas demora a descer",
    compromisso: "tô numa reunião",
  },
  16: {
    nome: "Silvana Almeida",
    ela: true,
    idade: 47,
    jeito: ["normal", "normal", "papo"],
    mania: "cachorro grande no quintal, deixar no portãozinho lateral",
    compromisso: "o cachorro tá latindo, já volto",
  },
  17: {
    nome: "Marcos Toledo",
    idade: 50,
    jeito: ["apressado", "normal", "papo"],
    mania: "churrasco todo domingo; pedido de domingo é sempre urgente",
    compromisso: "a carne já tá na brasa",
  },
  18: {
    nome: "Seu Elpídio",
    idade: 81,
    jeito: ["calmo", "formal", "trabalho"],
    mania: "só paga em dinheiro, deixa o troco separado num envelope",
    compromisso: "vou separar o troco aqui",
  },
  19: {
    nome: "Bianca Fontes",
    ela: true,
    idade: 29,
    jeito: ["normal", "normal", "papo"],
    mania: "recém-chegada; ainda erra o número da própria casa no aplicativo",
    compromisso: "deixa eu conferir o número aqui",
  },
  20: {
    nome: "Dona Alzira",
    ela: true,
    idade: 72,
    jeito: ["calmo", "formal", "tagarela"],
    mania: "faz doce de leite; encomenda açúcar em saco de cinco quilos",
    compromisso: "o doce tá no fogo",
  },
  21: {
    nome: "Seu Nivaldo",
    idade: 60,
    jeito: ["normal", "seco", "papo"],
    mania: "torcedor doente; em dia de jogo não atende de jeito nenhum",
    compromisso: "o jogo tá começando",
  },
  22: {
    nome: "Heitor Pontes",
    idade: 42,
    jeito: ["apressado", "normal", "trabalho"],
    mania: "dois adolescentes em casa; o lanche some antes de esfriar",
    compromisso: "os meninos tão me chamando",
  },
  23: {
    nome: "Regina Beltrão",
    ela: true,
    idade: 55,
    jeito: ["normal", "formal", "trabalho"],
    mania: "recebe pela janela da frente; nunca abre o portão para estranho",
    compromisso: "vou fechar a janela aqui",
  },
  24: {
    nome: "Seu Deusdete",
    idade: 64,
    jeito: ["calmo", "normal", "papo"],
    mania: "pescador; some na sexta e volta domingo à noite",
    compromisso: "tô arrumando a vara pra amanhã",
  },
  25: {
    nome: "Seu Vandir",
    idade: 49,
    jeito: ["normal", "normal", "trabalho"],
    mania:
      "motorista; a caminhonete na garagem quer dizer que ele está em casa",
    compromisso: "me chamaram uma viagem",
  },
  26: {
    nome: "Seu Benedito",
    idade: 83,
    jeito: ["calmo", "formal", "tagarela"],
    mania:
      "o mais velho do bairro; gosta de conversa, a entrega ali demora cinco minutos a mais",
    compromisso: "deixa eu sentar aqui um pouco",
  },
  27: {
    nome: "Dona Iracema",
    ela: true,
    idade: 67,
    jeito: ["normal", "normal", "papo"],
    mania: "manicure em casa; sempre tem alguém na sala esperando",
    compromisso: "tenho cliente na cadeira",
  },
  28: {
    nome: "Seu Firmino",
    idade: 59,
    jeito: ["normal", "seco", "trabalho"],
    mania: "marceneiro; barulho de serra o dia inteiro, melhor bater no portão",
    compromisso: "tô no meio de uma peça",
  },
  29: {
    nome: "Dona Neusa",
    ela: true,
    idade: 61,
    jeito: ["normal", "formal", "trabalho"],
    mania: "confere a nota antes de assinar; erro de item volta na hora",
    compromisso: "deixa eu conferir isso direito",
  },
  30: {
    nome: "Dona Aparecida",
    ela: true,
    idade: 70,
    jeito: ["calmo", "formal", "papo"],
    mania: "faz o café das sete; entregador que chega cedo sai com um copo",
    compromisso: "o café tá passando",
  },
  31: {
    nome: "Paulo Camargo",
    idade: 46,
    jeito: ["normal", "normal", "trabalho"],
    mania: "casa de esquina, dois portões; atende sempre o da rua de baixo",
    compromisso: "vou descer pro outro portão",
  },
  32: {
    nome: "Seu Nilton",
    idade: 53,
    jeito: ["calmo", "normal", "tagarela"],
    mania: "primo do Tonho da barbearia; manda entregar direto lá",
    compromisso: "tô indo pra barbearia",
  },
  33: {
    nome: "Seu Percival",
    idade: 75,
    jeito: ["calmo", "formal", "trabalho"],
    mania: "colecionador de rádio antigo; encomenda peça pequena e frágil",
    compromisso: "tô no meio de uma solda",
  },
  34: {
    nome: "Seu Orlando",
    idade: 48,
    jeito: ["apressado", "seco", "trabalho"],
    mania: "sai cedo e volta tarde; pede para deixar com a vizinha da 35",
    compromisso: "tô saindo",
  },
  35: {
    nome: "Dona Ercília",
    ela: true,
    idade: 73,
    jeito: ["calmo", "normal", "papo"],
    mania: "guarda encomenda dos vizinhos; meia rua passa por ali",
    compromisso: "chegou gente aqui pra buscar",
  },
  36: {
    nome: "Sandra Quirino",
    ela: true,
    idade: 39,
    jeito: ["apressado", "normal", "tagarela"],
    mania: "aniversário de alguém quase todo mês; bolo e flor com hora marcada",
    compromisso: "tô no meio da festa",
  },
  37: {
    nome: "Seu Osvaldo",
    idade: 66,
    jeito: ["calmo", "formal", "papo"],
    mania: "horta na frente; troca verdura por desconto se deixarem",
    compromisso: "vou molhar a horta",
  },
  38: {
    nome: "Seu Anselmo",
    idade: 62,
    jeito: ["apressado", "formal", "trabalho"],
    mania: "muito pontual; se o prazo é vinte minutos, ele conta no relógio",
    compromisso: "tô de olho no relógio",
  },
  39: {
    nome: "Túlio Nogueira",
    idade: 33,
    jeito: ["normal", "seco", "trabalho"],
    mania: "casal jovem, os dois trabalham fora; só recebem depois das 19h",
    compromisso: "tô saindo pro trabalho",
  },
  40: {
    nome: "Dona Julieta",
    ela: true,
    idade: 68,
    jeito: ["calmo", "formal", "tagarela"],
    mania: "adora flor; encomenda buquê sem motivo nenhum",
    compromisso: "vou pôr essas flores na água",
  },
  41: {
    nome: "Marisa Braga",
    ela: true,
    idade: 51,
    jeito: ["normal", "normal", "tagarela"],
    mania: "casa cheia de neto; pedido nunca é pequeno",
    compromisso: "os netos tão me chamando",
  },
  42: {
    nome: "Otávio Vilela",
    idade: 45,
    jeito: ["normal", "normal", "papo"],
    mania: "portão automático que trava; às vezes é preciso esperar",
    compromisso: "vou ver esse portão aqui",
  },
  43: {
    nome: "Seu Belmiro",
    idade: 70,
    jeito: ["calmo", "normal", "tagarela"],
    mania: "cadeira na calçada todo fim de tarde; vê tudo que passa na rua",
    compromisso: "o pessoal chegou aqui na calçada",
  },
  44: {
    nome: "Célia Assunção",
    ela: true,
    idade: 40,
    jeito: ["apressado", "seco", "trabalho"],
    mania: "faz marmita para fora; manda mais entrega que qualquer comércio",
    compromisso: "tô no meio das marmitas",
  },
  45: {
    nome: "Dona Odete",
    ela: true,
    idade: 76,
    jeito: ["normal", "seco", "papo"],
    mania: "só atende se chamarem pelo nome; campainha ela ignora",
    compromisso: "deixa eu atender aqui",
  },
  46: {
    nome: "Seu Sebastião",
    idade: 65,
    jeito: ["normal", "normal", "trabalho"],
    mania: "zelador da praça; de manhã não está em casa, está na fonte",
    compromisso: "tenho que voltar pra praça",
  },
  47: {
    nome: "Seu Anacleto",
    idade: 78,
    jeito: ["calmo", "formal", "papo"],
    mania: "anota tudo num caderninho; sabe de cor o que pediu no mês passado",
    compromisso: "vou anotar isso no caderno",
  },
  48: {
    nome: "Dona Guiomar",
    ela: true,
    idade: 74,
    jeito: ["calmo", "normal", "tagarela"],
    mania: "a casa mais longe da base; paga a mais para compensar o caminho",
    compromisso: "vou trancar tudo aqui",
  },
};

/**
 * AS LOJAS.
 *
 * Loja fala diferente de morador: e trabalho dos dois lados. Por isso o jeito
 * delas puxa para "trabalho" — e as que puxam papo sao as que tem balcao com
 * fila, onde conversa faz parte do servico.
 */
export const LOJAS: Readonly<Record<string, Ficha>> = {
  padaria: {
    nome: "Padaria",
    jeito: ["apressado", "normal", "papo"],
    mania: "o pão sai do forno às 7h e às 16h",
    compromisso: "o forno tá apitando",
  },
  lanchonete: {
    nome: "Lanchonete",
    jeito: ["apressado", "seco", "trabalho"],
    mania: "na hora do almoço não dá para conversar",
    compromisso: "tá cheio aqui",
  },
  farmacia: {
    nome: "Farmácia",
    jeito: ["normal", "formal", "trabalho"],
    mania: "guarda encomenda de quem não estava em casa",
    compromisso: "tem cliente no balcão",
  },
  floricultura: {
    nome: "Floricultura",
    jeito: ["calmo", "formal", "papo"],
    mania: "flor não pode ir deitada na mochila",
    compromisso: "tenho um arranjo pra montar",
  },
  papelaria: {
    nome: "Papelaria",
    jeito: ["calmo", "normal", "papo"],
    mania: "em semana de prova a fila dobra",
    compromisso: "a fila tá crescendo aqui",
  },
  pizzaria: {
    nome: "Pizzaria",
    jeito: ["apressado", "normal", "trabalho"],
    mania: "pizza esfria rápido, é a corrida mais apertada do bairro",
    compromisso: "saiu outra do forno",
  },
};

/**
 * A EQUIPE, O SISTEMA E O GRUPO.
 *
 * Faltavam. Sem ficha eles caem no jeito neutro: respondem, mas sem mania e
 * sem desculpa propria para sair — e a conversa com o colega de trabalho fica
 * mais sem graca que a com o morador, o que e o contrario do que devia ser.
 *
 * Os oito entregadores ja se diferenciavam so pelo JEITO DE FALAR (decisao
 * dele: nunca por velocidade). A ficha e exatamente isso, entao aqui o jeito
 * deles finalmente aparece na conversa.
 */
export const EQUIPE: Readonly<Record<string, Ficha>> = {
  /*
   * ── O RENAN E A LORENA, PELO DOCUMENTO DELE (14/09/2026) ─────────────────
   *
   * Ele escreveu uma memoria de personagem para cada um — 24 secoes do Renan,
   * 32 da Lorena. A maior parte delas entra AQUI, em dado fixo, e nao na
   * instrucao da inteligencia: dado fixo e gratis, instantaneo e garantido.
   *
   * O PAR E O QUE IMPORTA. A secao 29 do documento dela nao descreve a Lorena,
   * descreve um sistema: ela olha primeiro para a possibilidade, ele olha
   * primeiro para o risco. E o jogo ja sabia fazer isso sem inteligencia
   * nenhuma — e o eixo de pressa da ficha:
   *
   *     Lorena  apressado  →  "bora testar"
   *     Renan   calmo      →  "calma, Lo Lo"
   *
   * Um eixo que ja existia entrega a secao inteira de graca.
   */
  renan: {
    nome: "Renan",
    idade: 16,
    /*
     * Era "normal, normal, papo". O documento diz outra coisa, em tres lugares
     * diferentes: "nao fala acelerado", "nao dramatiza problemas pequenos",
     * "antes de tomar risco, prefere observar". Isso e CALMO.
     */
    jeito: ["calmo", "normal", "papo"],
    mania: "joga bola e vive de olho na bicicleta",
    /* Frase-assinatura dele, do documento: a saida. */
    compromisso: "já tô na rua",
    sabeDoPadrinho: true,
    assinatura: {
      indo: {
        base: ["deixa que eu cobro essa"],
        apertado: ["no último minuto do segundo tempo"],
      },
      aceita: { base: ["deixa que eu cobro essa", "já tô na rua"] },
    },
    /*
     * A vida dele, fechada: futebol e bicicleta, que sao as duas coisas que o
     * documento manda aparecer "naturalmente, sem transformar toda fala em
     * futebol". Cinco frases resolvem isso melhor que qualquer instrucao.
     */
    vida: [
      "ontem o jogo foi bom",
      "a corrente tá pedindo óleo",
      "depois eu tenho uma pelada",
      "troquei o pneu de trás semana passada",
      "hoje o sol tá doido",
    ],
    briefing: [
      "Você tem 16 anos, estuda e trabalha com entregas.",
      "Sua avó Zildinha tem o hortifrúti; sua mãe trabalha lá; seu pai é engenheiro.",
      "Você é calmo e cauteloso: antes de gastar, pensa se precisa mesmo.",
      "A Lorena é praticamente sua prima. Você a chama de Lo Lo.",
      "Você sonha em ter o próprio negócio um dia, mas não fala disso toda hora.",
      "Nunca invente um acontecimento para responder melhor. Se não souber, diga que não sabe.",
    ],
  },
  /*
   * A LORENA ENTRA NA AGENDA (14/09/2026).
   *
   * Ela ja existia no bairro — anda no mapa, cansa no folego, tem desenho
   * proprio e aparece na praca para contratar. So nao era CONTATO, e sem isso
   * sete secoes do documento dela nao tinham onde acontecer: a relacao com o
   * jogador, a memoria, o grupo, defender o Renan, a competicao, os conselhos
   * e a escola. Nao por serem dificeis — por nao haver com quem conversar.
   */
  lorena: {
    nome: "Lorena",
    ela: true,
    idade: 16,
    /* "Acelerada", "rapida de raciocinio", "empolgada": o oposto dele. */
    jeito: ["apressado", "normal", "tagarela"],
    mania: "bailarina, e nos patins ela tem controle que ninguém tem",
    /* Frase-assinatura dela: o trocadilho do giro de bale com a volta no bairro. */
    compromisso: "vou dar uma girada",
    sabeDoPadrinho: true,
    assinatura: {
      indo: {
        base: ["já tô indo, na pontinha do pé"],
        apertado: ["já tô indo, na pontinha do pé"],
      },
      aceita: { base: ["já tô indo, na pontinha do pé"] },
      agradece: { base: ["chegou inteirinho"] },
    },
    /*
     * A vida dela, fechada — e esta lista existe por causa de um aviso que o
     * proprio documento dela da: "nunca inventar que a Maya fez alguma coisa
     * especifica". E exatamente o erro que um modelo pequeno comete. Com falas
     * prontas, a Maya aparece e nunca acontece nada com ela que o jogo nao
     * saiba.
     */
    vida: [
      "a Maya não me deixou dormir direito 😂",
      "vim direto do balé",
      "tô morta, treinei natação hoje",
      "as meninas não param de me chamar",
      "vi umas rodas lindas ontem 😳",
    ],
    briefing: [
      "Você tem 16 anos, estuda, trabalha de patins e tem vida social movimentada.",
      "Você é acelerada e cheia de ideias: vê a possibilidade antes do risco.",
      "O Renan é praticamente seu primo. Ele é o cauteloso; você é a do 'bora testar'.",
      "Você faz balé e natação, e tem uma golden chamada Maya.",
      "Você sonha em ser empresária, mas fala como uma garota de 16 anos, nunca como executiva.",
      "Nunca invente um acontecimento para responder melhor. Se não souber, diga que não sabe.",
    ],
  },
  teo: {
    nome: "Téo",
    jeito: ["calmo", "normal", "tagarela"],
    mania: "o mais antigo da roda, conhece atalho que ninguém usa",
    compromisso: "peguei três de uma vez, tô morto",
  },
  duda: {
    nome: "Duda",
    ela: true,
    jeito: ["apressado", "normal", "papo"],
    mania: "não para quieta, faz duas corridas enquanto os outros fazem uma",
    compromisso: "tô no meio de uma entrega",
  },
  kau: {
    nome: "Kau",
    jeito: ["normal", "seco", "trabalho"],
    mania: "fala pouco e nunca erra endereço",
    compromisso: "tô na rua",
  },
  rafa: {
    nome: "Rafa",
    jeito: ["calmo", "normal", "papo"],
    mania: "conhece cada buraco do bairro de cor",
    compromisso: "vou dar uma olhada na roda aqui",
  },
  nino: {
    nome: "Nino",
    jeito: ["apressado", "seco", "trabalho"],
    mania: "o mais novo, ainda tem medo de ladeira",
    compromisso: "me chamaram aqui",
  },
  lia: {
    nome: "Lia",
    ela: true,
    jeito: ["normal", "formal", "papo"],
    mania: "anota tudo num caderninho, nunca perde pedido",
    compromisso: "vou anotar isso antes que eu esqueça",
  },
  bento: {
    nome: "Bento",
    jeito: ["calmo", "formal", "tagarela"],
    mania: "o mais velho da equipe, conversa com todo cliente",
    compromisso: "tô conversando com um cliente aqui",
  },
  manu: {
    nome: "Manu",
    ela: true,
    jeito: ["normal", "normal", "tagarela"],
    mania: "leva lanche extra na mochila e divide com quem estiver na rua",
    compromisso: "vou comer alguma coisa",
  },
};

/**
 * O GRUPO E O SISTEMA.
 *
 * O sistema NAO ganha compromisso: maquina nao tem o que fazer depois, e
 * inventar desculpa para ela seria a unica mentira do arquivo. O grupo tambem
 * nao sai — grupo nao se despede, so para de falar.
 */
export const OUTROS: Readonly<Record<string, Ficha>> = {
  "grupo-bairro": {
    nome: "Entregadores do bairro",
    jeito: ["normal", "normal", "papo"],
    mania: "a roda inteira falando ao mesmo tempo",
    compromisso: "",
  },
  xb: {
    nome: "XB Technology",
    jeito: ["normal", "formal", "trabalho"],
    mania: "",
    compromisso: "",
  },
};

/** Junta tudo num lugar so, com a chave que o aplicativo ja usa. */
export const FICHAS: Readonly<Record<string, Ficha>> = {
  ...Object.fromEntries(
    Object.entries(CASAS).map(([numero, ficha]) => [
      `casa${numero}`,
      { ...ficha, casa: Number(numero) },
    ])
  ),
  ...LOJAS,
  ...EQUIPE,
  ...OUTROS,
};

/**
 * A FICHA DE QUEM NAO TEM FICHA.
 *
 * Grupo, sistema e contato novo caem aqui em vez de quebrar. Jeito neutro,
 * sem mania e sem compromisso: quem nao tem vida propria escrita nao inventa
 * desculpa para sair.
 */
export const FICHA_PADRAO: Ficha = {
  nome: "",
  jeito: ["normal", "normal", "trabalho"],
  mania: "",
  compromisso: "",
};

export function fichaDe(id: string): Ficha {
  return FICHAS[id] ?? FICHA_PADRAO;
}

export function temFicha(id: string): boolean {
  return id in FICHAS;
}

/** Quantos jeitos diferentes existem de fato no elenco. Usado pelos testes. */
export function jeitosDistintos(): number {
  const vistos = new Set<string>();
  for (const f of Object.values(FICHAS)) vistos.add(f.jeito.join("·"));
  return vistos.size;
}

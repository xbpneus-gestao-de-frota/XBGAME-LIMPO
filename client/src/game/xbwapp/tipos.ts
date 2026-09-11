/**
 * XBWAPP — AS FORMAS DO APLICATIVO.
 *
 * Ordem dele, 07/09/2026: "sua funcao sera criar o app apenas, completo, com
 * funcoes loja, tudo que o whats app tem" — e, sobre o peso da conversa no
 * jogo, "mexe em tudo".
 *
 * ── POR QUE ISTO E UM ARQUIVO SO DE FORMAS ────────────────────────────────
 *
 * O aplicativo tem muita peca: contato, mensagem, conversa, recado, chamada,
 * produto, carrinho, pedido. Se cada tela inventar a sua propria versao de
 * "mensagem", duas telas discordam sobre o que e uma mensagem e o erro so
 * aparece na terceira. Aqui as formas sao ditas UMA vez, e todo o resto do
 * aplicativo fala esta lingua.
 *
 * Nada aqui executa nada. Sao so os moldes.
 */

/** Quem e quem dentro do aplicativo. O jogador e sempre "voce". */
export type IdContato = string;

export type TipoDeContato = "pessoa" | "loja" | "grupo" | "sistema";

export interface Contato {
  id: IdContato;
  nome: string;
  /**
   * O retrato redondo, quando existe desenho. Quem nao tem desenho aparece
   * com as INICIAIS numa roda de cor — que e o que todo aplicativo de
   * mensagem faz, e evita inventar rosto para dezenas de moradores.
   */
  foto?: string;
  /** A cor da roda das iniciais, para o contato sem retrato. */
  cor?: string;
  tipo: TipoDeContato;
  /** A frase do perfil — o "recado" que fica embaixo do nome. */
  sobre: string;
  /** So loja tem: o horario que aparece no perfil comercial. */
  horario?: string;
  /** So loja tem: o endereco, para o jogador saber onde coletar. */
  endereco?: string;
  /** So grupo tem: quem esta dentro. */
  membros?: readonly IdContato[];
  /** Se o contato esta com o aplicativo aberto agora. */
  online?: boolean;
}

/**
 * OS DOIS TIQUINHOS.
 *
 * Enviada e um tique; entregue sao dois cinzas; lida sao dois azuis. Parece
 * detalhe e nao e: e por eles que a pessoa sabe se o cliente VIU o aviso de
 * atraso. Um aviso nao lido nao serve de desculpa.
 */
export type EstadoDaMensagem = "enviando" | "enviada" | "entregue" | "lida";

export type TipoDeMensagem =
  | "texto"
  | "foto"
  | "audio"
  | "local"
  | "pedido"
  | "aviso"
  | "documento"
  | "contato"
  | "figurinha"
  | "enquete"
  | "pagamento"
  | "chamada";

export type TipoDeArquivo =
  | "pdf"
  | "planilha"
  | "apresentacao"
  | "compactado"
  | "texto"
  | "outro";

export interface Documento {
  nome: string;
  tipo: TipoDeArquivo;
  tamanhoKb: number;
}

export interface Enquete {
  pergunta: string;
  opcoes: readonly string[];
  votos: Readonly<Record<number, readonly IdContato[]>>;
  varias: boolean;
}

export type EstadoDoPagamento = "pedido" | "pago" | "recusado";

export interface Pagamento {
  valor: number;
  estado: EstadoDoPagamento;
  cobranca: boolean;
}

export interface Mensagem {
  id: string;
  /** Em qual conversa ela mora. */
  conversa: IdContato;
  /** Quem escreveu. */
  de: IdContato | "voce";
  tipo: TipoDeMensagem;
  texto: string;
  /** O minuto do dia do jogo em que ela entrou. O relogio e o do jogo. */
  minuto: number;
  estado: EstadoDaMensagem;
  /** Foto: o desenho que vai no balao. */
  imagem?: string;
  /** Audio: quantos segundos, para desenhar a barrinha. */
  segundos?: number;
  /** Pedido: o numero do pedido que este balao carrega. */
  pedido?: string;
  /** Local: o nome do ponto no mapa. */
  lugar?: string;
  /** Se e resposta a outra mensagem, o id dela. */
  respondendo?: string;

  documento?: Documento;
  cartao?: IdContato;
  enquete?: Enquete;
  pagamento?: Pagamento;
  aoVivo?: boolean;
  reacoes?: Readonly<Record<string, readonly IdContato[]>>;
  editada?: boolean;
  encaminhada?: boolean;
  apagada?: "mim" | "todos";
  chamada?: { tipo: TipoDeChamada; rumo: RumoDaChamada; segundos: number };
}

/**
 * O QUE UMA RESPOSTA MUDA NO JOGO.
 *
 * Ele escolheu "mexe em tudo": prazo, pagamento, gorjeta e reputacao saem da
 * conversa. Entao a conversa precisa de um jeito HONESTO de mexer — e este e
 * o jeito. Todo efeito e um numero pequeno e declarado; nenhuma tela mexe em
 * dinheiro por conta propria.
 */
export interface Efeito {
  /** Minutos somados ao prazo. Positivo estica, negativo aperta. */
  minutosDePrazo?: number;
  /** Reais somados a gorjeta daquela entrega. */
  gorjeta?: number;
  /** Pontos de reputacao com aquele contato. Positivo e negativo. */
  reputacao?: number;
  /** Pontos percentuais somados a fatia do entregador naquele frete. */
  parteDoFrete?: number;
  /** Se esta resposta aceita a coleta. */
  aceitaColeta?: boolean;
  /** Se esta resposta recusa a coleta. */
  recusaColeta?: boolean;
}

/** Uma das respostas prontas que aparecem no lugar do teclado. */
export interface Resposta {
  texto: string;
  /**
   * OS BALOES QUE SAEM LOGO DEPOIS, na mesma resposta.
   *
   * Ninguem escreve "nao posso sair de casa, mas queria ver meus amigos. onde
   * voce vai?" numa mensagem so — manda uma, depois a outra. Uma escolha, dois
   * baloes: e como a conversa de verdade sai, e evita ter que inventar uma fala
   * do outro lado so para separar duas frases da pessoa.
   */
  emSeguida?: readonly string[];
  efeito?: Efeito;
  /** O passo do roteiro para onde a conversa vai depois desta resposta. */
  vaiPara?: string;
}

/** Uma fala do outro lado, ja com o tipo dela. */
export interface Fala {
  texto: string;
  tipo?: TipoDeMensagem;
  imagem?: string;
  segundos?: number;
  /*
   * Quanto esperar antes DESTA fala entrar, quando o tempo importa para a
   * cena. Sem isto vale o compasso normal da conversa.
   *
   * Existe por causa da selfie do Renan: a ordem dele foi "depois de 2
   * segundos o Renan manda a selfie". Dois segundos e uma pausa de gente —
   * o tempo de tirar a foto e mandar — e nao o compasso de quem so digita.
   */
  esperaMs?: number;
  pedido?: string;
  lugar?: string;
  /** Quem fala, quando a conversa e de grupo. Sem isto, fala o dono da conversa. */
  de?: IdContato;
}

/**
 * UM PASSO DA CONVERSA: o que o outro manda, e o que voce pode responder.
 *
 * Sem respostas, o passo e o fim daquele ramo — o outro falou e a conversa
 * descansa, como conversa de verdade faz.
 */
export interface Passo {
  falas: readonly Fala[];
  respostas?: readonly Resposta[];
}

export interface Roteiro {
  conversa: IdContato;
  inicio: string;
  passos: Readonly<Record<string, Passo>>;
}

/** ── A LOJA ─────────────────────────────────────────────────────────────── */

export interface Produto {
  id: string;
  loja: IdContato;
  nome: string;
  /** Em reais. */
  preco: number;
  /** Em quilos — e o peso que enche a mochila. */
  peso: number;
  descricao: string;
}

export interface ItemDoCarrinho {
  produto: string;
  quantidade: number;
}

export type EstadoDoPedido =
  | "novo"
  | "aceito"
  | "coletado"
  | "entregue"
  | "atrasado"
  | "devolvido"
  | "cancelado";

export interface Pedido {
  numero: string;
  loja: IdContato;
  cliente: IdContato;
  itens: readonly ItemDoCarrinho[];
  estado: EstadoDoPedido;
  /** Minuto do dia do jogo em que o pedido entrou. */
  minuto: number;
  /** Quantos minutos o entregador tem, contados do aceite. */
  prazoMin: number;
  /** O frete calculado — quanto a corrida paga. */
  frete: number;
  /** A gorjeta ja conquistada na conversa. */
  gorjeta: number;
}

/** ── RECADOS E CHAMADAS ─────────────────────────────────────────────────── */

export interface Recado {
  id: string;
  dono: IdContato;
  texto: string;
  /** O desenho de fundo do recado, quando houver. */
  imagem?: string;
  /** A cor de fundo do recado escrito, quando nao ha desenho. */
  cor?: string;
  minuto: number;
  visto: boolean;
  /** Quem ja viu ESTE recado — so aparece nos recados do proprio jogador. */
  vistoPor?: readonly IdContato[];
}

export type TipoDeChamada = "voz" | "video";
export type RumoDaChamada = "recebida" | "feita" | "perdida";

export interface Chamada {
  id: string;
  contato: IdContato;
  tipo: TipoDeChamada;
  rumo: RumoDaChamada;
  minuto: number;
  /** Duracao em segundos. Zero quando foi perdida. */
  segundos: number;
}

/** ── GRUPOS, COMUNIDADES E LISTAS ───────────────────────────────────────── */

export interface Grupo {
  id: IdContato;
  nome: string;
  cor?: string;
  foto?: string;
  descricao: string;
  membros: readonly IdContato[];
  /** Quem pode mexer no grupo. O jogador e sempre dono do que ele cria. */
  donos: readonly IdContato[];
  /** Se o grupo pertence a uma comunidade. */
  comunidade?: string;
  criadoEm: number;
}

export interface Comunidade {
  id: string;
  nome: string;
  descricao: string;
  cor?: string;
  /** Os grupos que moram dentro dela. */
  grupos: readonly IdContato[];
}

/**
 * LISTA DE TRANSMISSAO.
 *
 * A mesma mensagem sai para varias pessoas, mas cada uma recebe na conversa
 * DELA e nao ve as outras. E o oposto do grupo: no grupo todo mundo se ve; na
 * transmissao ninguem se ve.
 */
export interface ListaDeTransmissao {
  id: string;
  nome: string;
  destinos: readonly IdContato[];
}

/** ── PRIVACIDADE E APARENCIA ────────────────────────────────────────────── */

export type QuemPodeVer = "todos" | "meus-contatos" | "ninguem";

export interface Privacidade {
  visto: QuemPodeVer;
  foto: QuemPodeVer;
  recado: QuemPodeVer;
  /** Confirmacao de leitura: desligar tira o tique azul dos DOIS lados. */
  recibos: boolean;
}

/** Quanto tempo uma mensagem dura antes de sumir. Zero e "nao some". */
export type TempoTemporario = 0 | 1440 | 10080 | 129600;

export interface Aparencia {
  tema: "escuro" | "claro";
  /** O papel de parede padrao, e o de cada conversa que tiver o seu. */
  papel: string;
  papelPorConversa: Readonly<Record<IdContato, string>>;
}

/** ── CANAIS ──────────────────────────────────────────────────────────────
 *
 * Canal nao e grupo e nao e conversa: UM fala, muitos seguem, e ninguem
 * responde. A unica coisa que quem segue pode fazer e REAGIR. Por isso o canal
 * mora fora de `mensagens` — se ele entrasse ali, a lista de conversas
 * encheria de coisa que nao e conversa.
 */
export interface Canal {
  id: string;
  nome: string;
  descricao: string;
  foto?: string;
  cor?: string;
  /** Quantos seguem, sem contar o jogador. */
  seguidores: number;
  verificado?: boolean;
}

export interface PublicacaoDeCanal {
  id: string;
  canal: string;
  texto: string;
  imagem?: string;
  minuto: number;
  /** Quantas reacoes de cada carinha, sem contar a do jogador. */
  reacoes: Readonly<Record<string, number>>;
  /** A carinha que o jogador deixou, se deixou. */
  minhaReacao?: string;
}

/** ── O LADO COMERCIAL ────────────────────────────────────────────────────
 *
 * E o que o WhatsApp Business tem e o WhatsApp comum nao: o perfil da empresa,
 * o catalogo, os anuncios, o guia, a cobranca e as mensagens automaticas.
 */
export interface PerfilComercial {
  nome: string;
  categoria: string;
  descricao: string;
  endereco: string;
  horario: string;
  email: string;
  site: string;
}

export type SituacaoDoAnuncio = "rascunho" | "no-ar" | "pausado" | "terminado";

/** Para onde o anuncio leva quem toca nele. */
export type DestinoDoAnuncio = "conversa" | "catalogo" | "site";

export interface Anuncio {
  id: string;
  titulo: string;
  texto: string;
  destino: DestinoDoAnuncio;
  /** O publico, do jeito que o guia do bairro entende. */
  publico: string;
  /** Quanto o anuncio gasta por dia, em centavos. */
  porDia: number;
  dias: number;
  criadoEm: number;
  comecouEm?: number;
  situacao: SituacaoDoAnuncio;
  /*
   * O RESULTADO E CONTA DO JOGO, NUNCA DA IA E NUNCA DO TEXTO.
   *
   * Quem escreve o anuncio nao decide quanta gente viu. Alcance, conversas e
   * gasto sao calculados a partir do dinheiro e do tempo — do mesmo jeito que
   * o frete sai da distancia, e nao da conversa.
   */
  alcance: number;
  conversas: number;
  gasto: number;
}

export type SituacaoDaCobranca = "enviada" | "paga" | "cancelada";

export interface Cobranca {
  id: string;
  para: IdContato;
  descricao: string;
  centavos: number;
  minuto: number;
  situacao: SituacaoDaCobranca;
  /** O pedido a que ela se refere, quando nasce de um pedido. */
  pedido?: string;
}

export interface MensagemAutomatica {
  ligada: boolean;
  texto: string;
}

export interface MensagemDeAusencia extends MensagemAutomatica {
  /** Sempre, so fora do horario da loja, ou num intervalo escolhido. */
  quando: "sempre" | "fora-do-horario" | "escolhido";
  /** Minutos do dia, quando o horario e escolhido. */
  de: number;
  ate: number;
}

export interface MensagensAutomaticas {
  saudacao: MensagemAutomatica & { para: "todos" | "novos" };
  ausencia: MensagemDeAusencia;
}

/* ── ENTREGA RAPIDA ───────────────────────────────────────────────────────
 *
 * Ordem dele, 08/09/2026, ja corrigida por ele mesmo:
 *
 *   "o correto e % do tempo. se uma solicitacao de coleta e entrega final e de
 *    25 segundos em media, ate atrasou ate 10% verde, 25% amarela, e assim por
 *    diante. quando entregador ou usuario aceitarem mais de uma coleta por vez
 *    podem estar perdendo qualidade."
 *
 * Tres coisas saem dai, e mandam no arquivo inteiro:
 *
 *   1. CADA SOLICITACAO TEM UM TEMPO FINAL — vinte e cinco segundos em media,
 *      da hora do pedido ate a entrega na porta.
 *   2. A NOTA E O ATRASO EM PORCENTAGEM sobre esse tempo, e nao um numero de
 *      segundos. Dez por cento ainda e verde; vinte e cinco ja e amarelo.
 *      Assim a entrega curta e a longa sao cobradas com a mesma regua.
 *   3. CARREGAR DUAS DE UMA VEZ CUSTA. Quem pega mais de uma coleta ao mesmo
 *      tempo entrega todas mais devagar — e o atraso aparece sozinho na nota,
 *      sem castigo inventado.
 */

/**
 * Por onde um pedido passa.
 *
 * `aberta`  — o cliente publicou e ninguem pegou. O relogio ja corre.
 * `na-fila` — a XB aceitou e o pedido espera o entregador sair.
 * `rodando` — tem gente na rua com ele.
 * `entregue`— chegou. A nota que ele levou esta no proprio pedido.
 * `recusada`— a XB disse que hoje nao dava.
 * `perdida` — ninguem entregou a tempo e o cliente desistiu. Rende reclamacao.
 */
export type SituacaoDaOferta =
  | "aberta"
  | "na-fila"
  | "rodando"
  | "entregue"
  | "recusada"
  | "perdida";

/** Um pedido de coleta e entrega, do jeito que a tela mostra. */
export interface OfertaDeEntrega {
  /** O numero do pedido, do jeito que o cliente fala dele: "#1014". */
  id: string;
  /** De onde coleta. E tambem QUEM PEDIU — e quem reclama, se demorar. */
  coleta: IdContato;
  /** Onde entrega. Pode ser casa OU outro comercio — regra dele. */
  entrega: IdContato;
  /** O segundo do balcao em que o cliente publicou. O relogio comeca AQUI. */
  publicadaEm: number;
  /**
   * O TEMPO FINAL desta solicitacao, em segundos — do pedido ate a porta.
   *
   * Vinte e cinco segundos e a media que ele deu, para a corrida tipica do
   * bairro. Corrida mais longa ganha mais tempo; mais curta, menos. Toda a
   * escada de notas e lida como PORCENTAGEM DE ATRASO sobre este numero, e por
   * isso a entrega do outro lado do bairro nao nasce condenada.
   */
  prazoS: number;
  /** A corrida inteira: base, coleta, entrega. E o que o entregador pedala. */
  km: number;
  /** So o trecho da entrega — e o que o cliente ve. */
  kmEntrega: number;
  volumes: number;
  /** Em quilos. */
  peso: number;
  /** O que o cliente paga, em reais. */
  frete: number;
  situacao: SituacaoDaOferta;
  /** Em que segundo a XB aceitou. */
  aceitaEm?: number;
  /** Quem ficou com ela. Vazio quer dizer que quem carrega e o proprio jogador. */
  entregador?: string;
  /**
   * Quanto desta corrida ja foi pedalado, em segundos de pedal.
   *
   * NAO e o relogio de parede. Quem carrega duas entregas ao mesmo tempo
   * avanca menos de um segundo de pedal por segundo de relogio em cada uma —
   * e e exatamente ai que mora a perda de qualidade que ele apontou.
   */
  rodadoS?: number;
  /** Em que segundo acabou — entregue, recusada ou perdida. */
  fechadaEm?: number;
  /** As estrelas que o cliente deu, de 1 a 5. So depois de fechada. */
  estrelas?: number;
  /** A caixinha do entregador, em reais. Zero quando nao houve. */
  caixinha?: number;
  /** Se este pedido rendeu telefonema de reclamacao. */
  reclamou?: boolean;
  /** Quantas entregas o mesmo entregador carregava junto com esta. */
  cargaNaEntrega?: number;
}

/**
 * UMA LINHA DO HISTORICO DA CARTEIRA.
 *
 * Ordem dele, 08/09/2026: "ao menos uns 40 minutos, e comeca a contar durante
 * 30 dias a reputacao pode ir piorando ate nao restar mais ninguem entregando
 * frete, entao o jogo sempre vai cobrar crescimento e melhorias."
 *
 * Cada entrega fechada deixa uma linha aqui, com o DIA em que aconteceu. A
 * reputacao de cada cliente e lida so das linhas dos ultimos trinta dias — e
 * por isso ela pode piorar semana apos semana, e por isso tambem ela volta ao
 * normal sozinha quando o servico melhora e as linhas velhas caem fora.
 *
 * O historico e podado na propria varredura: sem poda, uma partida longa
 * carregaria milhares de linhas que ninguem le mais.
 */
export interface LinhaDaCarteira {
  /** O dia do bairro em que aconteceu. */
  dia: number;
  /** De quem e o servico — e de quem e a reputacao que esta sendo cobrada. */
  cliente: IdContato;
  /** De 1 a 5. Pedido perdido conta como 1. */
  estrelas: number;
  /** Se rendeu telefonema. */
  reclamou: boolean;
  /**
   * Se esta linha e um BLOQUEIO, e nao uma entrega.
   *
   * Ordem dele, 08/09/2026: "a cada 3 bloqueios o tempo de castigo vai
   * aumentando, dentro dos 30 dias pode tomar ban daquele cliente". Para o
   * castigo saber que degrau aplicar, os bloqueios precisam ficar guardados
   * COM A DATA, na mesma janela de trinta dias — assim a escada tambem
   * esquece: quem passou um mes servindo bem volta ao primeiro degrau.
   *
   * Linha de bloqueio nao tem nota, e por isso nao mexe na reputacao duas
   * vezes: quem derrubou a reputacao foram as entregas ruins que levaram ate
   * ele.
   */
  bloqueio?: boolean;
}

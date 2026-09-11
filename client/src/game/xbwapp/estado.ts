/**
 * O ESTADO DO APLICATIVO — e as unicas operacoes que mexem nele.
 *
 * ── POR QUE ISTO NAO MORA DENTRO DA TELA ──────────────────────────────────
 *
 * Porque conversa vira dinheiro. Se "marcar como lida", "somar gorjeta" e
 * "mudar o pedido para coletado" ficarem espalhados dentro dos componentes, o
 * dia em que dois lugares somarem a mesma gorjeta ninguem vai achar o segundo.
 * Aqui as operacoes sao poucas, tem nome, e sao TESTAVEIS sem abrir navegador
 * — que e como o resto deste projeto ja trabalha.
 *
 * Tudo aqui e puro: entra um estado, sai um estado novo. Nada muda no lugar.
 */
import {
  ACUMULADO_ZERADO,
  REPUTACAO_INICIAL,
  somarEfeito,
  somarReputacao,
  type Acumulado,
} from "./efeitos";
import { abrirPedido, somarAoCarrinho } from "./catalogo";
import { CONTATOS } from "./contatos";
import { roteiroDe } from "./roteiros";
import { CANAIS, PUBLICACOES } from "./canais";
/*
 * As duas medidas do balcao de Entrega Rapida. Elas moram la, junto com o
 * resto das regras do balcao, e nao aqui: quem for mexer no compasso dos
 * pedidos tem de achar tudo num arquivo so.
 */
import { PRIMEIRO_NUMERO, PRIMEIRO_PEDIDO_EM_S } from "./entregaRapida";
import type { EmRota } from "./aRota";
import type { ChamadaChegando } from "./chamadas";
import type {
  Aparencia,
  Chamada,
  Comunidade,
  Efeito,
  EstadoDoPedido,
  Fala,
  Grupo,
  IdContato,
  ItemDoCarrinho,
  ListaDeTransmissao,
  Mensagem,
  Pedido,
  Privacidade,
  Recado,
  Resposta,
  TempoTemporario,
  TipoDeChamada,
  Canal,
  PublicacaoDeCanal,
  PerfilComercial,
  Anuncio,
  Cobranca,
  MensagensAutomaticas,
  LinhaDaCarteira,
  OfertaDeEntrega,
} from "./tipos";

export interface EstadoDoApp {
  /** O relogio do jogo, em minutos do dia. */
  minuto: number;
  mensagens: readonly Mensagem[];
  /** Onde o roteiro de cada conversa parou. */
  passo: Readonly<Record<IdContato, string>>;
  /**
   * Quantas falas DO PASSO ATUAL ja entraram na tela de cada conversa.
   *
   * Isto mora no estado, e nao dentro da tela, por um motivo pratico: o
   * aplicativo nasce com a primeira fala de cada conversa ja esperando, nao
   * lida. Se a contagem fosse da tela, ao abrir a conversa ela entregaria a
   * primeira fala DE NOVO, e a pessoa veria a mesma frase duas vezes.
   */
  entregues: Readonly<Record<IdContato, number>>;
  naoLidas: Readonly<Record<IdContato, number>>;
  fixadas: readonly IdContato[];
  arquivadas: readonly IdContato[];
  silenciadas: readonly IdContato[];
  /** Ids das mensagens marcadas com estrela. */
  favoritas: readonly string[];
  reputacao: Readonly<Record<IdContato, number>>;
  /** O que a conversa ja rendeu para a entrega em curso. */
  acumulado: Acumulado;
  carrinho: readonly ItemDoCarrinho[];
  lojaDoCarrinho?: IdContato;
  pedidos: readonly Pedido[];
  recados: readonly Recado[];
  chamadas: readonly Chamada[];

  /** Quem esta bloqueado: nao manda mensagem, nao liga, nao ve o recado. */
  bloqueados: readonly IdContato[];
  /** Os grupos criados dentro do aplicativo, alem do grupo do bairro. */
  grupos: readonly Grupo[];
  comunidades: readonly Comunidade[];
  transmissoes: readonly ListaDeTransmissao[];
  privacidade: Privacidade;
  aparencia: Aparencia;
  /** Quanto tempo as mensagens duram em cada conversa. Zero e "nao somem". */
  temporarias: Readonly<Record<IdContato, TempoTemporario>>;
  /** A mensagem fixada no alto de cada conversa. */
  fixadaNaConversa: Readonly<Record<IdContato, string>>;
  /** As etiquetas de trabalho de cada conversa (a parte comercial). */
  etiquetas: Readonly<Record<IdContato, readonly string[]>>;
  /** As respostas guardadas, do jeito que uma loja guarda. */
  respostasRapidas: readonly { atalho: string; texto: string }[];
  /** ── O QUE O WHATSAPP BUSINESS TEM ─────────────────────────────────── */

  /** Os canais que existem no bairro. */
  canais: readonly Canal[];
  /** As publicacoes de todos os canais, do mais novo para o mais velho. */
  publicacoes: readonly PublicacaoDeCanal[];
  /** Os canais que o jogador segue. */
  seguindo: readonly string[];
  /** O perfil comercial do jogador — o que o cliente ve antes de escrever. */
  perfil: PerfilComercial;
  anuncios: readonly Anuncio[];
  cobrancas: readonly Cobranca[];
  automaticas: MensagensAutomaticas;

  /**
   * O TELEFONE TOCANDO AGORA, se estiver.
   *
   * E separado de `chamadaEmCurso` de proposito: uma coisa e o telefone
   * chamando (da para atender ou recusar), outra e a ligacao ja correndo. Se
   * fossem o mesmo campo, atender e recusar mexeriam no mesmo lugar e a tela
   * nao saberia qual dos dois desenhar.
   */
  chamandoAgora?: ChamadaChegando;

  /* ── O BALCAO DE ENTREGA RAPIDA ──────────────────────────────────────
   *
   * Os pedidos moram no estado do aplicativo, e nao dentro da tela, pelo mesmo
   * motivo das conversas: fechar o aplicativo nao pode apagar o pedido. O
   * relogio de cada um corre desde a publicacao — inclusive com o aplicativo
   * fechado, que e a regra dele.
   */
  ofertas: readonly OfertaDeEntrega[];
  /**
   * O RELOGIO DO BALCAO, EM SEGUNDOS.
   *
   * E separado do `minuto` de proposito. O `minuto` e o relogio de conversa —
   * "12:30" no alto da mensagem, mensagem temporaria que some em 24 horas. O
   * balcao mede em SEGUNDOS porque foi a medida que ele deu: dez segundos
   * entre coleta e entrega. Misturar os dois faria um deles mentir.
   */
  relogioDoBalcao: number;
  /** Em que segundo o bairro publica o proximo pedido. */
  proximoPedidoEm: number;
  /** O numero do proximo pedido. E o "#1014" que o cliente fala. */
  proximoNumeroDePedido: number;
  /** Quantas vezes cada cliente ja ligou reclamando da XB. */
  reclamacoes: Readonly<Record<IdContato, number>>;
  /** Ate que segundo cada cliente esta sem mandar servico para a XB. */
  semPedidosAte: Readonly<Record<IdContato, number>>;
  /**
   * O HISTORICO DA CARTEIRA — uma linha por entrega fechada, com o dia.
   *
   * A reputacao de cada cliente sai daqui, olhando so os ultimos trinta dias.
   * A lista e podada na propria varredura para nao crescer sem fim.
   */
  historico: readonly LinhaDaCarteira[];
  /**
   * Os clientes que a XB PERDEU, e o tamanho que a equipe tinha no dia.
   *
   * O numero guardado nao e enfeite: e o que aquele cliente vai cobrar para
   * voltar. Cliente perdido so reabre a porta quando a empresa fica maior do
   * que era quando ele saiu.
   */
  perdidos: Readonly<Record<IdContato, number>>;
  /**
   * Quantos entregadores a XB tem agora.
   *
   * Mora no estado do aplicativo porque o balcao precisa dele mesmo com o
   * aplicativo fechado — e quem decide se um cliente perdido volta.
   */
  equipeDeAgora: number;
  /**
   * A ROTA DE CADA ENTREGADOR — onde ele esta e o que falta passar.
   *
   * A chave e o NOME de quem carrega; o jogador entra aqui pelo nome dele. Isto
   * mora no estado do aplicativo porque a rota corre com o aplicativo fechado:
   * o entregador nao para de pedalar porque alguem trocou de tela.
   */
  rotas: Readonly<Record<string, EmRota>>;

  /** A chamada acontecendo agora, se houver. */
  chamadaEmCurso?: {
    contato: IdContato;
    tipo: TipoDeChamada;
    comecouEm: number;
  };
}

let contadorDeMensagem = 0;
function novoId(): string {
  contadorDeMensagem += 1;
  return `m${contadorDeMensagem}`;
}

/** Zera a numeracao das mensagens. So os testes usam. */
export function reiniciarNumeracaoDeMensagens(): void {
  contadorDeMensagem = 0;
}

/** O relogio como a tela mostra: 750 vira "12:30". */
export function hora(minuto: number): string {
  const m = ((Math.round(minuto) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * O APLICATIVO NAO NASCE VAZIO.
 *
 * Aplicativo de mensagem vazio nao ensina nada e nao convida a abrir. Ele
 * nasce com a primeira fala de cada conversa ja esperando, nao lida — que e
 * como um telefone de verdade esta quando a pessoa acorda.
 */
export function estadoInicial(minuto = 9 * 60): EstadoDoApp {
  const reputacao: Record<IdContato, number> = {};
  for (const c of CONTATOS) reputacao[c.id] = REPUTACAO_INICIAL;

  return {
    minuto,
    mensagens: [],
    passo: {},
    entregues: {},
    naoLidas: {},
    fixadas: ["renan"],
    arquivadas: [],
    silenciadas: [],
    favoritas: [],
    reputacao,
    acumulado: { ...ACUMULADO_ZERADO },
    carrinho: [],
    pedidos: [],
    /*
     * VAZIO DE PROPOSITO. Ordem dele, 07/09/2026: "SEM MENSAGENS AUTOMATICAS".
     *
     * Havia tres recados e uma chamada ja no ar quando o aplicativo abria, para
     * as telas nao nascerem vazias. Nao ha mais: o aplicativo comeca limpo e so
     * mostra o que aconteceu de verdade.
     */
    recados: [],
    chamadas: [],

    /*
     * O BALCAO NASCE VAZIO, e o primeiro pedido chega tres minutos depois. O
     * jogo nao abre com trabalho acumulado: a primeira coisa que a pessoa ve
     * e o bairro, e o primeiro pedido e um acontecimento, nao um estoque.
     */
    ofertas: [],
    relogioDoBalcao: 0,
    proximoPedidoEm: PRIMEIRO_PEDIDO_EM_S,
    proximoNumeroDePedido: PRIMEIRO_NUMERO,
    reclamacoes: {},
    semPedidosAte: {},
    historico: [],
    perdidos: {},
    equipeDeAgora: 0,
    rotas: {},

    bloqueados: [],
    grupos: [],
    comunidades: [],
    transmissoes: [],
    privacidade: {
      visto: "meus-contatos",
      foto: "todos",
      recado: "meus-contatos",
      recibos: true,
    },
    aparencia: {
      tema: "escuro",
      papel: "rabiscos",
      papelPorConversa: {},
    },
    temporarias: {},
    fixadaNaConversa: {},
    etiquetas: {},
    /*
     * AS RESPOSTAS GUARDADAS ja vem com as que todo entregador escreve dez
     * vezes por dia. Aplicativo comercial que nasce com a lista vazia e uma
     * lista que ninguem preenche.
     */
    respostasRapidas: [
      { atalho: "/indo", texto: "Tô saindo agora, chego em uns minutos" },
      { atalho: "/atraso", texto: "Vou me atrasar um pouco, mas tô a caminho" },
      { atalho: "/cheguei", texto: "Cheguei! Tô na porta" },
      { atalho: "/obrigado", texto: "Obrigado! Qualquer coisa é só chamar" },
    ],

    /*
     * O LADO COMERCIAL COMECA VAZIO, MENOS OS CANAIS.
     *
     * Anuncio, cobranca e mensagem automatica so existem depois que a pessoa
     * cria — ninguem anuncia sozinho. Ja os CANAIS sao do mundo: eles existem
     * no bairro quer o jogador siga ou nao, do mesmo jeito que as lojas
     * existem. Seguir e que e escolha dele, e ele comeca sem seguir nenhum.
     */
    canais: CANAIS,
    publicacoes: PUBLICACOES,
    seguindo: [],
    perfil: {
      nome: "",
      categoria: "Entrega e transporte",
      descricao: "",
      endereco: "",
      horario: "",
      email: "",
      site: "",
    },
    anuncios: [],
    cobrancas: [],
    automaticas: {
      saudacao: {
        ligada: false,
        texto: "Oi! Sou entregador aqui do bairro. Como posso ajudar?",
        para: "novos",
      },
      ausencia: {
        ligada: false,
        texto: "Tô em rota agora. Respondo assim que parar a bicicleta.",
        quando: "fora-do-horario",
        de: 18 * 60,
        ate: 8 * 60,
      },
    },
  };
}

/**
 * O APLICATIVO ACORDA COM RECADO ESPERANDO.
 *
 * A primeira fala de cada conversa ja entra, nao lida, antes de a pessoa abrir
 * o aplicativo. E o que um telefone de verdade faz enquanto a gente dorme — e
 * e o que da a lista alguma coisa para mostrar no primeiro segundo.
 */
export function semear(
  estado: EstadoDoApp,
  conversas: readonly IdContato[]
): EstadoDoApp {
  let atual = estado;
  for (const id of conversas) {
    const roteiro = roteiroDe(id);
    const primeira = roteiro?.passos[roteiro.inicio]?.falas[0];
    if (!primeira) continue;
    atual = receber(atual, id, primeira, false);
  }
  return atual;
}

/** As mensagens de uma conversa, na ordem em que entraram. */
export function mensagensDa(
  estado: EstadoDoApp,
  conversa: IdContato
): readonly Mensagem[] {
  return estado.mensagens.filter(m => m.conversa === conversa);
}

/** A ultima mensagem de uma conversa — a que a lista mostra embaixo do nome. */
export function ultimaDe(
  estado: EstadoDoApp,
  conversa: IdContato
): Mensagem | undefined {
  const todas = mensagensDa(estado, conversa);
  return todas[todas.length - 1];
}

/** Uma fala do outro lado entra na conversa. */
export function receber(
  estado: EstadoDoApp,
  conversa: IdContato,
  fala: Fala,
  aberta: boolean
): EstadoDoApp {
  const mensagem: Mensagem = {
    id: novoId(),
    conversa,
    de: fala.de ?? conversa,
    tipo: fala.tipo ?? "texto",
    texto: fala.texto,
    minuto: estado.minuto,
    estado: "lida",
    imagem: fala.imagem,
    segundos: fala.segundos,
    pedido: fala.pedido,
    lugar: fala.lugar,
  };
  return {
    ...estado,
    mensagens: [...estado.mensagens, mensagem],
    entregues: {
      ...estado.entregues,
      [conversa]: (estado.entregues[conversa] ?? 0) + 1,
    },
    naoLidas: aberta
      ? estado.naoLidas
      : {
          ...estado.naoLidas,
          [conversa]: (estado.naoLidas[conversa] ?? 0) + 1,
        },
  };
}

/** Uma fala sua entra na conversa. Nasce entregue; vira lida logo depois. */
export function enviar(
  estado: EstadoDoApp,
  conversa: IdContato,
  texto: string
): EstadoDoApp {
  const mensagem: Mensagem = {
    id: novoId(),
    conversa,
    de: "voce",
    tipo: "texto",
    texto,
    minuto: estado.minuto,
    estado: "entregue",
  };
  return { ...estado, mensagens: [...estado.mensagens, mensagem] };
}

/** Os dois tiques ficam azuis. */
export function marcarComoLida(estado: EstadoDoApp, id: string): EstadoDoApp {
  return {
    ...estado,
    mensagens: estado.mensagens.map(m =>
      m.id === id ? { ...m, estado: "lida" } : m
    ),
  };
}

/**
 * VOCE ESCOLHEU UMA RESPOSTA.
 *
 * Tres coisas acontecem de uma vez, e nesta ordem: a sua fala entra na
 * conversa, o efeito dela e somado (com os tetos), e o roteiro anda. Fazer as
 * tres juntas e o que impede o estado de ficar meio andado se algo falhar no
 * meio.
 */
/**
 * SOMA UM EFEITO SEM CRIAR MENSAGEM.
 *
 * A conversa digitada precisa disto: a fala do jogador ja entrou quando ele
 * apertou enviar, e o efeito so se conhece depois, quando o personagem
 * responde.
 */
export function aplicarEfeito(
  estado: EstadoDoApp,
  conversa: IdContato,
  efeito: Efeito | undefined
): EstadoDoApp {
  if (!efeito) return estado;
  return {
    ...estado,
    acumulado: somarEfeito(estado.acumulado, efeito),
    reputacao: {
      ...estado.reputacao,
      [conversa]: somarReputacao(
        estado.reputacao[conversa] ?? REPUTACAO_INICIAL,
        efeito
      ),
    },
  };
}

export function responder(
  estado: EstadoDoApp,
  conversa: IdContato,
  resposta: Resposta
): EstadoDoApp {
  let comFala = enviar(estado, conversa, resposta.texto);
  // Uma escolha pode sair em mais de um balao, como gente manda mesmo.
  for (const outra of resposta.emSeguida ?? []) {
    comFala = enviar(comFala, conversa, outra);
  }
  return {
    ...comFala,
    acumulado: somarEfeito(comFala.acumulado, resposta.efeito),
    reputacao: {
      ...comFala.reputacao,
      [conversa]: somarReputacao(
        comFala.reputacao[conversa] ?? REPUTACAO_INICIAL,
        resposta.efeito
      ),
    },
    passo: resposta.vaiPara
      ? { ...comFala.passo, [conversa]: resposta.vaiPara }
      : comFala.passo,
    // Passo novo, contagem nova: as falas do passo seguinte comecam do zero.
    entregues: { ...comFala.entregues, [conversa]: 0 },
  };
}

/** O passo em que a conversa esta agora — o comeco do roteiro, se ainda nao andou. */
export function passoAtual(
  estado: EstadoDoApp,
  conversa: IdContato
): string | undefined {
  const roteiro = roteiroDe(conversa);
  if (!roteiro) return undefined;
  return estado.passo[conversa] ?? roteiro.inicio;
}

/** Abrir a conversa zera o contador de nao lidas. */
/**
 * MANDA UMA CONVERSA COMECAR NOUTRO PASSO.
 *
 * Serve ao caminho de quem ignorou o telefone duas vezes: a conversa do Renan
 * abre pela cobranca brincando em vez do bom dia. O jogo escolhe a porta; o
 * roteiro continua sendo do roteiro.
 */
export function irParaOPasso(
  estado: EstadoDoApp,
  conversa: IdContato,
  passo: string
): EstadoDoApp {
  return {
    ...estado,
    passo: { ...estado.passo, [conversa]: passo },
    // Passo novo, contagem nova: as falas dele comecam do zero.
    entregues: { ...estado.entregues, [conversa]: 0 },
  };
}

export function abrirConversa(
  estado: EstadoDoApp,
  conversa: IdContato
): EstadoDoApp {
  if (!estado.naoLidas[conversa]) return estado;
  const naoLidas = { ...estado.naoLidas };
  delete naoLidas[conversa];
  return { ...estado, naoLidas };
}

function alternar(
  lista: readonly IdContato[],
  id: IdContato
): readonly IdContato[] {
  return lista.includes(id) ? lista.filter(x => x !== id) : [...lista, id];
}

export function fixar(estado: EstadoDoApp, conversa: IdContato): EstadoDoApp {
  return { ...estado, fixadas: alternar(estado.fixadas, conversa) };
}

export function arquivar(
  estado: EstadoDoApp,
  conversa: IdContato
): EstadoDoApp {
  return { ...estado, arquivadas: alternar(estado.arquivadas, conversa) };
}

export function silenciar(
  estado: EstadoDoApp,
  conversa: IdContato
): EstadoDoApp {
  return { ...estado, silenciadas: alternar(estado.silenciadas, conversa) };
}

export function favoritar(estado: EstadoDoApp, mensagem: string): EstadoDoApp {
  const tem = estado.favoritas.includes(mensagem);
  return {
    ...estado,
    favoritas: tem
      ? estado.favoritas.filter(x => x !== mensagem)
      : [...estado.favoritas, mensagem],
  };
}

/**
 * APAGAR NAO SOME COM A LINHA — ela vira "Mensagem apagada".
 *
 * Aplicativo de mensagem faz assim, e faz por um bom motivo: some com o balao
 * e a conversa fica com um buraco que ninguem explica. O rastro e honesto.
 */
export function apagar(estado: EstadoDoApp, mensagem: string): EstadoDoApp {
  return {
    ...estado,
    mensagens: estado.mensagens.map(m =>
      m.id === mensagem ? { ...m, tipo: "aviso", texto: "Mensagem apagada" } : m
    ),
  };
}

/** Limpa uma conversa inteira. */
export function limparConversa(
  estado: EstadoDoApp,
  conversa: IdContato
): EstadoDoApp {
  return {
    ...estado,
    mensagens: estado.mensagens.filter(m => m.conversa !== conversa),
  };
}

/**
 * A ORDEM DA LISTA: fixadas em cima, depois a conversa mais recente.
 *
 * Conversa sem mensagem nenhuma nao aparece — lista cheia de nome sem assunto
 * e o jeito mais rapido de a pessoa parar de ler a lista.
 */
export function conversasOrdenadas(
  estado: EstadoDoApp,
  arquivadas = false
): readonly IdContato[] {
  const vistas = new Set(estado.mensagens.map(m => m.conversa));
  return [...vistas]
    .filter(id => estado.arquivadas.includes(id) === arquivadas)
    .sort((a, b) => {
      const fa = estado.fixadas.includes(a) ? 1 : 0;
      const fb = estado.fixadas.includes(b) ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return (
        (ultimaDe(estado, b)?.minuto ?? 0) - (ultimaDe(estado, a)?.minuto ?? 0)
      );
    });
}

/** Quantas mensagens nao lidas ha no aplicativo inteiro — o aviso do mapa. */
export function totalNaoLidas(estado: EstadoDoApp): number {
  return Object.values(estado.naoLidas).reduce((s, n) => s + n, 0);
}

/** ── A LOJA ─────────────────────────────────────────────────────────────── */

/**
 * O CARRINHO E DE UMA LOJA SO.
 *
 * Misturar pao com remedio num pedido so seria mentira: sao duas coletas, em
 * dois lugares. Trocar de loja limpa o carrinho, e isso e dito na tela antes
 * de acontecer.
 */
export function porNoCarrinho(
  estado: EstadoDoApp,
  loja: IdContato,
  produto: string,
  quantidade = 1
): EstadoDoApp {
  const mesmaLoja = estado.lojaDoCarrinho === loja;
  const base = mesmaLoja ? estado.carrinho : [];
  return {
    ...estado,
    lojaDoCarrinho: loja,
    carrinho: somarAoCarrinho(base, produto, quantidade),
  };
}

export function esvaziarCarrinho(estado: EstadoDoApp): EstadoDoApp {
  return { ...estado, carrinho: [], lojaDoCarrinho: undefined };
}

/** Fecha o carrinho num pedido e manda o balao de pedido na conversa da loja. */
export function fecharPedido(
  estado: EstadoDoApp,
  dados: { cliente: IdContato; km: number; prazoMin: number; aberta: boolean }
): EstadoDoApp {
  const loja = estado.lojaDoCarrinho;
  if (!loja || estado.carrinho.length === 0) return estado;

  const pedido = abrirPedido({
    loja,
    cliente: dados.cliente,
    itens: estado.carrinho,
    km: dados.km,
    minuto: estado.minuto,
    prazoMin: dados.prazoMin,
  });

  const comPedido: EstadoDoApp = {
    ...estado,
    pedidos: [...estado.pedidos, pedido],
    carrinho: [],
    lojaDoCarrinho: undefined,
  };

  return receber(
    comPedido,
    loja,
    {
      texto: `Pedido ${pedido.numero} recebido · ${pedido.itens.length} item(ns)`,
      tipo: "pedido",
      pedido: pedido.numero,
    },
    dados.aberta
  );
}

export function mudarPedido(
  estado: EstadoDoApp,
  numero: string,
  para: EstadoDoPedido
): EstadoDoApp {
  return {
    ...estado,
    pedidos: estado.pedidos.map(p =>
      p.numero === numero ? { ...p, estado: para } : p
    ),
  };
}

/** Os pedidos que ainda estao na mao do entregador. */
export function pedidosAbertos(estado: EstadoDoApp): readonly Pedido[] {
  return estado.pedidos.filter(
    p => p.estado === "novo" || p.estado === "aceito" || p.estado === "coletado"
  );
}

/** ── RECADOS ────────────────────────────────────────────────────────────── */

export function verRecado(estado: EstadoDoApp, id: string): EstadoDoApp {
  return {
    ...estado,
    recados: estado.recados.map(r => (r.id === id ? { ...r, visto: true } : r)),
  };
}

export function recadosNaoVistos(estado: EstadoDoApp): readonly Recado[] {
  return estado.recados.filter(r => !r.visto);
}

/** Registra uma chamada no historico. */
export function registrarChamada(
  estado: EstadoDoApp,
  chamada: Omit<Chamada, "id">
): EstadoDoApp {
  return {
    ...estado,
    chamadas: [
      { ...chamada, id: `ch${estado.chamadas.length + 1}` },
      ...estado.chamadas,
    ],
  };
}

/** O relogio do jogo andou. */
export function avancarRelogio(
  estado: EstadoDoApp,
  minutos: number
): EstadoDoApp {
  return { ...estado, minuto: estado.minuto + minutos };
}

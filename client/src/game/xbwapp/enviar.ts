/**
 * MANDAR CADA TIPO DE MENSAGEM.
 *
 * Um aplicativo de mensagem nao manda "texto": manda foto com legenda, audio
 * com duracao, documento com nome, cartao de contato, localizacao parada ou ao
 * vivo, enquete, figurinha e cobranca. Cada um tem o seu balao e as suas
 * regras, e todos nascem aqui — em funcoes puras, sem tela.
 *
 * Por que num arquivo so: porque a parte dificil de mandar uma mensagem nao e o
 * tipo dela, e o que TODA mensagem precisa (id, hora, estado, conversa). Isso
 * fica dito uma vez, na fabrica ali embaixo, e cada tipo so acrescenta o que e
 * seu.
 */
import type { EstadoDoApp } from "./estado";
import type {
  Documento,
  IdContato,
  Mensagem,
  Pagamento,
  TipoDeArquivo,
  TipoDeMensagem,
} from "./tipos";

let contador = 0;

/** Zera a numeracao. So os testes usam, para nao dependerem de ordem. */
export function reiniciarNumeracaoDeEnvio(): void {
  contador = 0;
}

/**
 * A FABRICA.
 *
 * Toda mensagem que sai daqui nasce igual no que e igual: minha, entregue,
 * com hora e com id proprio. O resto e o que cada tipo acrescenta.
 */
function nova(
  estado: EstadoDoApp,
  conversa: IdContato,
  tipo: TipoDeMensagem,
  texto: string,
  extra: Partial<Mensagem> = {}
): EstadoDoApp {
  contador += 1;
  const mensagem: Mensagem = {
    id: `s${contador}`,
    conversa,
    de: "voce",
    tipo,
    texto,
    minuto: estado.minuto,
    estado: "entregue",
    ...extra,
  };
  return { ...estado, mensagens: [...estado.mensagens, mensagem] };
}

/** Texto, com a opcao de estar respondendo outra mensagem. */
export function mandarTexto(
  estado: EstadoDoApp,
  conversa: IdContato,
  texto: string,
  respondendo?: string
): EstadoDoApp {
  const limpo = texto.trim();
  if (!limpo) return estado;
  return nova(estado, conversa, "texto", limpo, { respondendo });
}

/** Foto, com legenda opcional. A legenda vive no texto do balao. */
export function mandarFoto(
  estado: EstadoDoApp,
  conversa: IdContato,
  imagem: string,
  legenda = ""
): EstadoDoApp {
  return nova(estado, conversa, "foto", legenda, { imagem });
}

/**
 * AUDIO.
 *
 * A duracao e o que a tela desenha na onda — audio sem duracao vira uma barra
 * sem tamanho, e a pessoa nao sabe se vai ouvir tres segundos ou tres minutos.
 */
export function mandarAudio(
  estado: EstadoDoApp,
  conversa: IdContato,
  segundos: number
): EstadoDoApp {
  const tempo = Math.max(1, Math.round(segundos));
  return nova(estado, conversa, "audio", "Mensagem de voz", {
    segundos: tempo,
  });
}

/** Documento. O tipo escolhe a etiqueta colorida do balao. */
export function mandarDocumento(
  estado: EstadoDoApp,
  conversa: IdContato,
  documento: Documento
): EstadoDoApp {
  return nova(estado, conversa, "documento", documento.nome, { documento });
}

/** Descobre o tipo do arquivo pelo fim do nome. */
export function tipoDoArquivo(nome: string): TipoDeArquivo {
  const fim = nome.slice(nome.lastIndexOf(".") + 1).toLowerCase();
  if (fim === "pdf") return "pdf";
  if (["xls", "xlsx", "csv"].includes(fim)) return "planilha";
  if (["ppt", "pptx"].includes(fim)) return "apresentacao";
  if (["zip", "rar", "7z"].includes(fim)) return "compactado";
  if (["txt", "md", "doc", "docx"].includes(fim)) return "texto";
  return "outro";
}

/** Cartao de contato: manda alguem do aplicativo para outra conversa. */
export function mandarCartao(
  estado: EstadoDoApp,
  conversa: IdContato,
  cartao: IdContato,
  nome: string
): EstadoDoApp {
  return nova(estado, conversa, "contato", nome, { cartao });
}

/**
 * LOCALIZACAO.
 *
 * Parada e um ponto; ao vivo e um ponto que continua andando. A diferenca
 * importa num jogo de entrega: mandar ao vivo e dizer "pode acompanhar", e e
 * o gesto que compra paciencia de cliente.
 */
export function mandarLocal(
  estado: EstadoDoApp,
  conversa: IdContato,
  lugar: string,
  aoVivo = false
): EstadoDoApp {
  return nova(
    estado,
    conversa,
    "local",
    aoVivo ? "Localização em tempo real" : lugar,
    { lugar, aoVivo }
  );
}

/** Figurinha. O texto guarda o emoji, que e a figurinha desenhada em letra. */
export function mandarFigurinha(
  estado: EstadoDoApp,
  conversa: IdContato,
  figurinha: string
): EstadoDoApp {
  return nova(estado, conversa, "figurinha", figurinha);
}

/** Enquete. Nasce sem voto nenhum. */
export function mandarEnquete(
  estado: EstadoDoApp,
  conversa: IdContato,
  pergunta: string,
  opcoes: readonly string[],
  varias = false
): EstadoDoApp {
  const limpas = opcoes.map(o => o.trim()).filter(Boolean);
  if (!pergunta.trim() || limpas.length < 2) return estado;
  return nova(estado, conversa, "enquete", pergunta.trim(), {
    enquete: { pergunta: pergunta.trim(), opcoes: limpas, votos: {}, varias },
  });
}

/**
 * VOTAR.
 *
 * Numa enquete de escolha unica, votar de novo TROCA o voto em vez de somar —
 * senao a pessoa vota duas vezes sem querer e a conta fica errada. Na de
 * escolha multipla, tocar de novo tira aquele voto.
 */
export function votar(
  estado: EstadoDoApp,
  id: string,
  opcao: number,
  quem: IdContato = "voce"
): EstadoDoApp {
  return {
    ...estado,
    mensagens: estado.mensagens.map(m => {
      if (m.id !== id || !m.enquete) return m;
      const antes = m.enquete.votos;
      const jaVotou = (antes[opcao] ?? []).includes(quem);
      const votos: Record<number, readonly IdContato[]> = {};

      for (const [chave, gente] of Object.entries(antes)) {
        const indice = Number(chave);
        const manter = m.enquete!.varias && indice !== opcao;
        votos[indice] = manter ? gente : gente.filter(p => p !== quem);
      }
      if (!jaVotou) votos[opcao] = [...(votos[opcao] ?? []), quem];

      return { ...m, enquete: { ...m.enquete, votos } };
    }),
  };
}

/** Quantos votaram em cada opcao. */
export function contarVotos(m: Mensagem): readonly number[] {
  if (!m.enquete) return [];
  return m.enquete.opcoes.map((_, i) => (m.enquete!.votos[i] ?? []).length);
}

/**
 * PAGAMENTO.
 *
 * Duas caras do mesmo balao: mandar dinheiro e COBRAR dinheiro. Num jogo de
 * entrega as duas acontecem — o cliente paga a corrida, e o entregador cobra
 * quando o cliente esqueceu.
 */
export function mandarPagamento(
  estado: EstadoDoApp,
  conversa: IdContato,
  valor: number,
  cobranca = false
): EstadoDoApp {
  if (!(valor > 0)) return estado;
  const pagamento: Pagamento = {
    valor,
    estado: cobranca ? "pedido" : "pago",
    cobranca,
  };
  return nova(
    estado,
    conversa,
    "pagamento",
    cobranca ? "Cobrança enviada" : "Pagamento enviado",
    { pagamento }
  );
}

/** Aceita ou recusa uma cobranca. */
export function responderCobranca(
  estado: EstadoDoApp,
  id: string,
  pagou: boolean
): EstadoDoApp {
  return {
    ...estado,
    mensagens: estado.mensagens.map(m =>
      m.id === id && m.pagamento && m.pagamento.estado === "pedido"
        ? {
            ...m,
            pagamento: { ...m.pagamento, estado: pagou ? "pago" : "recusado" },
          }
        : m
    ),
  };
}

/**
 * A MENSAGEM DE CHAMADA.
 *
 * Toda ligacao deixa um balao na conversa, como em qualquer aplicativo. Sem
 * ele, a ligacao acontece e a conversa nao lembra — e ligacao perdida vira uma
 * coisa que so existe numa aba que ninguem abre.
 */
export function registrarChamadaNaConversa(
  estado: EstadoDoApp,
  conversa: IdContato,
  chamada: {
    tipo: "voz" | "video";
    rumo: "recebida" | "feita" | "perdida";
    segundos: number;
  }
): EstadoDoApp {
  const texto =
    chamada.rumo === "perdida"
      ? chamada.tipo === "video"
        ? "Chamada de vídeo perdida"
        : "Chamada de voz perdida"
      : chamada.tipo === "video"
        ? "Chamada de vídeo"
        : "Chamada de voz";
  return nova(estado, conversa, "chamada", texto, {
    de: chamada.rumo === "feita" ? "voce" : conversa,
    chamada,
  });
}

/**
 * MANDAR PARA VARIAS CONVERSAS DE UMA VEZ (lista de transmissao).
 *
 * Cada uma recebe na conversa DELA e nao ve as outras. E o oposto do grupo, e e
 * por isso que existe: dizer a mesma coisa para dez clientes sem apresenta-los
 * uns aos outros.
 */
export function transmitir(
  estado: EstadoDoApp,
  destinos: readonly IdContato[],
  texto: string
): EstadoDoApp {
  let atual = estado;
  for (const destino of destinos) atual = mandarTexto(atual, destino, texto);
  return atual;
}

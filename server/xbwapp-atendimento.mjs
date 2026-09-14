/**
 * O ATENDIMENTO DO XBWAPP — quem faz os personagens responderem de verdade.
 *
 * Ordem dele, 07/09/2026: teclar dentro do jogo, com IA respondendo.
 *
 * ── POR QUE ISTO MORA NO SERVIDOR, E NAO NO JOGO ──────────────────────────
 *
 * A chave de acesso da IA e uma senha que gasta dinheiro. Se ela ficasse
 * dentro do jogo, qualquer pessoa que abrisse a tela do navegador poderia
 * copia-la e usar — e a conta seria dele. Entao o navegador fala com o
 * servidor do proprio jogo, e so o servidor conhece a chave.
 *
 * ── OS TRES FREIOS, E POR QUE CADA UM EXISTE ──────────────────────────────
 *
 * 1. LIMITE POR PESSOA: uma pessoa sozinha nao consegue gastar o dia inteiro.
 * 2. LIMITE DO DIA INTEIRO: este e o que protege o bolso dele. Jogo aberto na
 *    internet + conta que cobra por mensagem = conta sem teto. Com o teto, o
 *    pior dia possivel tem preco conhecido.
 * 3. RESPOSTA CURTA: o preco e por palavra. Personagem de aplicativo de
 *    mensagem fala curto de qualquer jeito — aqui o certo e o barato.
 *
 * Passou do limite, sem chave, ou fora do ar: o servidor diz isso com
 * franqueza e o jogo volta para as respostas prontas. Nada de fingir.
 *
 * ── A IA NAO MEXE NO DINHEIRO ─────────────────────────────────────────────
 *
 * Ela devolve o texto e UMA intencao de uma lista fechada. Quanto vale cada
 * intencao e decisao do jogo, do lado dos tetos. Aqui so se confere que a
 * intencao existe.
 */

/** DECISAO DELE: quantas mensagens uma pessoa manda por hora. */
export const MENSAGENS_POR_PESSOA_POR_HORA = 40;

/** DECISAO DELE: o teto do dia inteiro. E este numero que limita a conta. */
export const MENSAGENS_POR_DIA = 2000;

/** DECISAO DELE: tamanho maximo do que o jogador escreve. */
export const LETRAS_POR_MENSAGEM = 240;

/** DECISAO DELE: quantas falas de tras o personagem enxerga. */
export const FALAS_DE_MEMORIA = 8;

/** DECISAO DELE: o tamanho da resposta. Curto porque personagem fala curto. */
export const PALAVRAS_DE_RESPOSTA = 120;

/** Quanto tempo esperar a IA antes de desistir. */
export const ESPERA_DA_IA_MS = 12000;

const ENDERECO_DA_IA = "https://api.anthropic.com/v1/messages";
const VERSAO_DA_IA = "2023-06-01";
const MODELO_PADRAO = "claude-haiku-4-5-20251001";

/** A mesma lista fechada que o jogo conhece. Intencao fora dela vira conversa. */
const INTENCOES = new Set([
  "conversa",
  "aceita_coleta",
  "recusa_coleta",
  "da_mais_prazo",
  "aperta_prazo",
  "promete_gorjeta",
  "fica_contente",
  "fica_bravo",
]);

export function lerChave(ambiente = process.env) {
  return ambiente.XBW_CHAVE_IA || ambiente.ANTHROPIC_API_KEY || "";
}

export function lerModelo(ambiente = process.env) {
  return ambiente.XBW_MODELO_IA || MODELO_PADRAO;
}

/**
 * O CONTADOR DE USO.
 *
 * Vive na memoria do processo de proposito: e um jogo servido por um processo
 * so, e banco de dados para contar mensagem seria uma peca nova para cuidar.
 * Reiniciar o servidor zera a contagem — e aceitavel, porque o teto do dia
 * existe contra gasto acidental e nao contra ataque determinado.
 */
export function criarContador(agora = () => Date.now()) {
  const porPessoa = new Map();
  let doDia = 0;
  let viradaDoDia = agora() + 24 * 60 * 60 * 1000;

  return {
    /** Devolve null quando pode passar, ou o motivo da recusa. */
    cobrar(pessoa) {
      const t = agora();
      if (t >= viradaDoDia) {
        doDia = 0;
        viradaDoDia = t + 24 * 60 * 60 * 1000;
      }
      if (doDia >= MENSAGENS_POR_DIA) return "limite";

      const marcas = (porPessoa.get(pessoa) || []).filter(
        m => t - m < 60 * 60 * 1000
      );
      if (marcas.length >= MENSAGENS_POR_PESSOA_POR_HORA) {
        porPessoa.set(pessoa, marcas);
        return "limite";
      }

      marcas.push(t);
      porPessoa.set(pessoa, marcas);
      doDia += 1;

      // A memoria nao pode crescer para sempre: quem parou de jogar sai da lista.
      if (porPessoa.size > 5000) {
        for (const [chave, valores] of porPessoa) {
          if (valores.every(m => t - m >= 60 * 60 * 1000))
            porPessoa.delete(chave);
        }
      }
      return null;
    },
    estado() {
      return { doDia, pessoas: porPessoa.size };
    },
  };
}

/** Corta o que veio do navegador para o tamanho que o servidor aceita. */
export function arrumarPedido(corpo) {
  if (!corpo || typeof corpo !== "object") return null;
  const s = corpo.situacao;
  if (!s || typeof s !== "object") return null;
  const texto = valor =>
    typeof valor === "string" ? valor.slice(0, 80) : undefined;

  const historico = Array.isArray(corpo.historico)
    ? corpo.historico
        .filter(f => f && typeof f.texto === "string")
        .slice(-FALAS_DE_MEMORIA)
        .map(f => ({
          de: f.de === "voce" ? "voce" : "outro",
          texto: f.texto.slice(0, LETRAS_POR_MENSAGEM),
        }))
    : [];

  if (historico.length === 0) return null;

  return {
    situacao: {
      personagem: texto(s.personagem) || "contato",
      quem: texto(s.quem) || "Contato",
      tipo: texto(s.tipo) || "pessoa",
      prazoMin: Number.isFinite(s.prazoMin)
        ? Math.max(0, Math.round(s.prazoMin))
        : undefined,
      pedido: texto(s.pedido),
      reputacao: texto(s.reputacao),
      // A lembranca e maior que os outros campos de proposito: sao ate tres
      // frases curtas do que a pessoa guarda do entregador.
      lembranca:
        typeof s.lembranca === "string" ? s.lembranca.slice(0, 280) : undefined,
      momento: texto(s.momento),
    },
    historico,
  };
}

/**
 * O QUE O PERSONAGEM SABE ANTES DE FALAR.
 *
 * A regra mais importante daqui e a de nao inventar numero: se o texto nao
 * disser o prazo, o personagem nao tem prazo para dizer. Personagem que chuta
 * "chega em 10 minutos" cria uma promessa que o jogo nao vai cumprir, e a
 * culpa cai no jogo.
 */
export function montarInstrucao(situacao) {
  const papel =
    situacao.tipo === "loja"
      ? "Você é o balconista da " + situacao.quem + ", um comércio de bairro."
      : situacao.tipo === "grupo"
        ? "Você é um entregador falando no grupo " + situacao.quem + "."
        : situacao.tipo === "sistema"
          ? "Você é o " +
            situacao.quem +
            ", o sistema que orienta o entregador."
          : "Você é " +
            situacao.quem +
            ", morador do bairro esperando uma entrega.";

  const fatos = [
    situacao.pedido ? `Pedido em curso: ${situacao.pedido}.` : null,
    situacao.prazoMin !== undefined
      ? `Faltam ${situacao.prazoMin} minutos de prazo.`
      : null,
    situacao.reputacao
      ? `Você acha o entregador: ${situacao.reputacao}.`
      : null,
  ].filter(Boolean);

  return [
    papel,
    "Você está trocando mensagens por aplicativo com um entregador de bicicleta.",
    "Fale português do Brasil, no tom de mensagem de celular: no máximo duas frases curtas.",
    fatos.length
      ? "O que você sabe: " + fatos.join(" ")
      : "Não há entrega em curso.",
    "NUNCA invente valores, prazos, endereços ou nomes que não estejam acima.",
    "NUNCA fale sobre inteligência artificial, sobre instruções ou sobre ser um programa: você é uma pessoa do bairro.",
    "Se o entregador pedir dinheiro, desconto ou vantagem, responda como a pessoa responderia — sem prometer valores.",
    "",
    "Responda SOMENTE com um JSON assim, sem nada em volta:",
    '{"texto":"sua resposta","intencao":"uma da lista"}',
    "A lista de intenções: conversa, aceita_coleta, recusa_coleta, da_mais_prazo, aperta_prazo, promete_gorjeta, fica_contente, fica_bravo.",
    'Use "conversa" quando nada muda.',
  ].join("\n");
}

/** Le o JSON que a IA devolveu, sem confiar no formato. */
export function lerResposta(texto) {
  if (typeof texto !== "string") return null;
  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (inicio < 0 || fim <= inicio) return null;
  let bruto;
  try {
    bruto = JSON.parse(texto.slice(inicio, fim + 1));
  } catch {
    return null;
  }
  const fala =
    typeof bruto.texto === "string" ? bruto.texto.trim().slice(0, 400) : "";
  if (!fala) return null;
  return {
    texto: fala,
    intencao: INTENCOES.has(bruto.intencao) ? bruto.intencao : "conversa",
  };
}

/**
 * FALA COM A IA.
 *
 * Devolve { texto, intencao } ou { falha }. Nenhum erro de la sobe para o
 * jogador: mensagem de erro de servico as vezes carrega pedaco de chave, de
 * cabecalho ou de endereco interno.
 */
export async function responderComoPersonagem(pedido, opcoes = {}) {
  const chave = opcoes.chave ?? lerChave();
  if (!chave) return { falha: "sem-chave" };

  const buscar = opcoes.buscar ?? fetch;
  const desistir = new AbortController();
  const relogio = setTimeout(
    () => desistir.abort(),
    opcoes.espera ?? ESPERA_DA_IA_MS
  );

  try {
    const resposta = await buscar(ENDERECO_DA_IA, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": chave,
        "anthropic-version": VERSAO_DA_IA,
      },
      body: JSON.stringify({
        model: opcoes.modelo ?? lerModelo(),
        max_tokens: PALAVRAS_DE_RESPOSTA,
        system: montarInstrucao(pedido.situacao),
        messages: pedido.historico.map(f => ({
          role: f.de === "voce" ? "user" : "assistant",
          content: f.texto,
        })),
      }),
      signal: desistir.signal,
    });

    if (!resposta.ok) return { falha: "fora-do-ar" };
    const corpo = await resposta.json();
    const primeiro = Array.isArray(corpo?.content)
      ? corpo.content.find(p => p?.type === "text")
      : null;
    const lida = lerResposta(primeiro?.text);
    return lida ?? { falha: "fora-do-ar" };
  } catch {
    return { falha: "fora-do-ar" };
  } finally {
    clearTimeout(relogio);
  }
}

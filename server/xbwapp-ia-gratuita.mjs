/**
 * A INTELIGENCIA GRATUITA — o caminho que nao cobra por mensagem.
 *
 * Ordem dele, 13/09/2026: "existe alguma inteligencia artificial que possa ser
 * ligada sem custo?" — e, antes disso, "custo e alto" para a paga.
 *
 * ── POR QUE A GROQ E NAO A DO GOOGLE ──────────────────────────────────────
 *
 * A camada gratuita do Google e a mais generosa e e justamente a que NAO serve
 * aqui. Nos termos dela esta escrito que o conteudo enviado e usado para
 * melhorar os produtos deles, que revisores HUMANOS podem ler, e que nao se
 * deve enviar informacao pessoal. Este jogo tem crianca digitando mensagem.
 * Isso nao se desfaz depois.
 *
 * A Groq nao treina com o que passa por ela, permite uso comercial, e da mil
 * mensagens por dia sem cobrar. O modelo aberto escreve portugues do Brasil
 * curto com qualidade suficiente para uma fala de vizinho de uma linha.
 *
 * ── POR QUE UM MODELO GRATUITO BASTA AQUI ─────────────────────────────────
 *
 * Porque quem pensa e o jogo. A memoria do morador chega pronta na instrucao:
 * quem e a pessoa, o que ela lembra de voce, e POR QUE ela esta sendo chamada
 * agora. Sobra escrever uma linha — e para isso a gratuita da conta.
 *
 * Regra que continua valendo, intacta: A IA ESCREVE AS PALAVRAS, O JOGO DECIDE
 * OS NUMEROS. E agora tambem: o jogo decide O QUE e QUANDO; ela decide so
 * COMO SOA.
 *
 * ── ESTE ARQUIVO NAO SUBSTITUI NADA ───────────────────────────────────────
 *
 * Ele fica ao lado de `xbwapp-atendimento.mjs` e reaproveita o que ja estava
 * provado ali: como arrumar o pedido, como montar a instrucao e como ler a
 * resposta sem confiar no formato. So o caminho ate o fornecedor e novo.
 */
import {
  montarInstrucao,
  lerResposta,
  PALAVRAS_DE_RESPOSTA,
  ESPERA_DA_IA_MS,
} from "./xbwapp-atendimento.mjs";

const ENDERECO_GROQ = "https://api.groq.com/openai/v1/chat/completions";
const MODELO_GROQ_PADRAO = "llama-3.3-70b-versatile";

export function lerChaveGratuita(ambiente = process.env) {
  return ambiente.XBW_CHAVE_GROQ || "";
}

export function lerModeloGratuito(ambiente = process.env) {
  return ambiente.XBW_MODELO_GROQ || MODELO_GROQ_PADRAO;
}

/** Acima disto nao e chave: e texto colado por acidente. */
export const LETRAS_MAXIMAS_DA_CHAVE = 200;

/**
 * A CHAVE QUE VEIO DO NAVEGADOR — so enquanto o jogo esta em teste.
 *
 * Ordem dele, 13/09/2026: um campo na tela de ajustes para colar a chave sem
 * fechar o jogo. Quem digita e ele; este arquivo so confere o FORMATO.
 *
 * ── POR QUE CONFERIR O FORMATO E OBRIGATORIO ──────────────────────────────
 *
 * Esta chave vira um cabecalho no pedido ao fornecedor. Cabecalho aceita
 * quebra de linha — entao um texto com "\n" dentro, mandado no lugar da
 * chave, poderia acrescentar cabecalhos que ninguem pediu. Aceitar apenas
 * letra, numero, traco e sublinhado fecha isso numa linha.
 *
 * E ela NAO E GUARDADA em lugar nenhum aqui: e usada no pedido e esquecida.
 * Nao vai para arquivo, nao vai para variavel de ambiente, nao vai para log —
 * mensagem de erro as vezes carrega pedaco de chave, e por isso nenhum erro
 * do fornecedor sobe para o jogador.
 */
export function chaveDoPedido(corpo) {
  const crua = corpo && typeof corpo === "object" ? corpo.chave : undefined;
  if (typeof crua !== "string") return "";
  const limpa = crua.trim();
  if (!limpa || limpa.length > LETRAS_MAXIMAS_DA_CHAVE) return "";
  if (!/^[A-Za-z0-9_-]+$/.test(limpa)) return "";
  return limpa;
}

/**
 * QUAL CAMINHO USAR.
 *
 * A gratuita ganha quando existe. Se ele um dia ligar a paga, basta ter a
 * chave dela e tirar a da gratuita — nenhuma linha do jogo muda.
 */
export function escolherFornecedor(ambiente = process.env) {
  if (lerChaveGratuita(ambiente)) return "gratuita";
  if (ambiente.XBW_CHAVE_IA || ambiente.ANTHROPIC_API_KEY) return "paga";
  return "nenhum";
}

/**
 * AS DUAS LINHAS QUE A MEMORIA ACRESCENTA.
 *
 * `lembranca` e o resumo do que aquela pessoa guarda do entregador.
 * `momento` e POR QUE a inteligencia foi chamada agora — e sempre um dos
 * quatro momentos extremos que ele escolheu.
 *
 * Repare que nenhuma das duas pede para a inteligencia DECIDIR coisa alguma.
 */
export function instrucaoComMemoria(situacao, lembranca, momento) {
  const base = montarInstrucao(situacao);
  const extras = [
    lembranca ? "O que você lembra dele: " + lembranca : null,
    momento ? "Por que você está falando agora: " + momento : null,
    lembranca || momento
      ? "Responda coerente com isso. Não repita o que já foi dito antes."
      : null,
  ].filter(Boolean);

  if (extras.length === 0) return base;

  // As linhas novas entram ANTES do bloco do JSON, senao o modelo pequeno se
  // perde e devolve texto solto. O bloco do JSON tem de ser a ultima coisa
  // que ele le — isto foi a diferenca entre funcionar e nao funcionar.
  const corte = base.indexOf("Responda SOMENTE");
  if (corte < 0) return [base, ...extras].join("\n");
  return [
    base.slice(0, corte).trimEnd(),
    ...extras,
    "",
    base.slice(corte),
  ].join("\n");
}

/**
 * FALA COM A INTELIGENCIA GRATUITA.
 *
 * Devolve { texto, intencao } ou { falha }. Nenhum erro de la sobe para o
 * jogador: mensagem de erro de servico as vezes carrega pedaco de chave.
 *
 * Os motivos de falha sao os MESMOS que o jogo ja sabe tratar, de proposito —
 * o morador diz que esta sem sinal e as falas do bairro assumem. Por isso o
 * teto da camada gratuita nunca quebra o jogo: ele so devolve o jogo ao
 * estado gratuito.
 */
export async function responderComGratuita(pedido, opcoes = {}) {
  const chave = opcoes.chave ?? lerChaveGratuita();
  if (!chave) return { falha: "sem-chave" };

  const buscar = opcoes.buscar ?? fetch;
  const desistir = new AbortController();
  const relogio = setTimeout(
    () => desistir.abort(),
    opcoes.espera ?? ESPERA_DA_IA_MS
  );

  try {
    const resposta = await buscar(ENDERECO_GROQ, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + chave,
      },
      body: JSON.stringify({
        model: opcoes.modelo ?? lerModeloGratuito(),
        max_tokens: PALAVRAS_DE_RESPOSTA,
        temperature: 0.8,
        messages: [
          {
            role: "system",
            /*
             * A LEMBRANCA VEM DE DENTRO DE `situacao`.
             *
             * `arrumarPedido` guarda `lembranca` e `momento` dentro de
             * `situacao`, e aqui se lia `pedido.lembranca` — que nunca
             * existiu. Resultado: a memoria do morador, que e justamente o
             * que dispensa a inteligencia de deduzir qualquer coisa, nunca
             * chegava nela. Achado em 13/09/2026, com o campo da chave.
             */
            content: instrucaoComMemoria(
              pedido.situacao,
              pedido.lembranca ?? pedido.situacao?.lembranca,
              pedido.momento ?? pedido.situacao?.momento
            ),
          },
          ...pedido.historico.map(f => ({
            role: f.de === "voce" ? "user" : "assistant",
            content: f.texto,
          })),
        ],
      }),
      signal: desistir.signal,
    });

    // 429 e o teto do dia batendo. O jogo ja sabe o que fazer com "limite".
    if (resposta.status === 429) return { falha: "limite" };
    if (!resposta.ok) return { falha: "fora-do-ar" };

    const corpo = await resposta.json();
    const texto = corpo?.choices?.[0]?.message?.content;
    const lida = lerResposta(texto);
    return lida ?? { falha: "fora-do-ar" };
  } catch {
    return { falha: "fora-do-ar" };
  } finally {
    clearTimeout(relogio);
  }
}

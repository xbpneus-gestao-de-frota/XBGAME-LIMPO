/**
 * O PADRINHO — a pergunta que tem resposta travada, e nunca passa pela IA.
 *
 * Dos documentos que ele escreveu do Renan e da Lorena, 14/09/2026:
 *
 *   "Renan e Lorena possuem o mesmo padrinho de batizado. Eles sabem quem ele
 *    é e sabem a verdade sobre sua relação com a criação do jogo. Entretanto,
 *    jamais revelam sua identidade."
 *
 * ── POR QUE ISTO E CODIGO, E NAO UMA INSTRUCAO PARA A INTELIGENCIA ────────
 *
 * Porque o que nao pode falhar nao pode ser pedido.
 *
 * Uma instrucao é obedecida quarenta e nove vezes e escorrega na quinquagesima
 * — e basta escorregar UMA para o segredo do jogo vazar dentro de uma conversa
 * qualquer, sem ninguem perceber que vazou. Um jogador que insista dez vezes
 * seguidas esta justamente testando esse limite.
 *
 * Travada aqui, a piada:
 *
 *   · nunca escorrega, porque nao ha modelo nenhum decidindo;
 *   · responde na hora, sem viagem ate servidor;
 *   · nao custa nada;
 *   · e funciona sem internet, como o resto do bairro.
 *
 * ── E PRECISA SER SO DE QUEM SABE ─────────────────────────────────────────
 *
 * Quem responde a piada e quem tem `sabeDoPadrinho` na ficha. Perguntar do
 * Padrinho para a Dona Sebastiana nao pode devolver piada de dentro: ela nao
 * faz ideia do que voce esta falando, e essa e a resposta honesta.
 */

/**
 * A PIADA, escrita por ele, letra por letra.
 *
 * Nao e para melhorar, nao e para variar e nao e para dar continuidade: a
 * graca esta em ser sempre a mesma, e em nunca vir explicacao atras.
 */
export const PIADA_DO_PADRINHO = "Você não conhece O Padrinho? Kkkkkk 😂😂";

/**
 * AS MANEIRAS DE PERGUNTAR A MESMA COISA.
 *
 * Ele listou cinco no documento; aqui estao elas e as variacoes que qualquer
 * um digita sem pensar. Vale para quem escreve com acento e para quem nao
 * escreve, porque o jogador digitando no celular nao acentua.
 */
const JEITOS_DE_PERGUNTAR: readonly RegExp[] = [
  /\bpadrinho\b/,
  /\bquem\s+(criou|fez|inventou)\b.*\b(jogo|game|xb)\b/,
  /\b(jogo|game)\b.*\bquem\s+(criou|fez|inventou)\b/,
  /\bdono\s+do\s+(jogo|game)\b/,
  /\bcriador\s+do\s+(jogo|game)\b/,
];

/** Tira acento e caixa, para "Padrinho" e "padrinho" caírem no mesmo lugar. */
function simplificar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** A pessoa está perguntando do Padrinho, de qualquer um dos jeitos? */
export function perguntaDoPadrinho(frase: string): boolean {
  const limpa = simplificar(frase);
  return JEITOS_DE_PERGUNTAR.some(jeito => jeito.test(limpa));
}

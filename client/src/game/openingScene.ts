/**
 * A cena de abertura — o filme curto que roda uma vez so.
 *
 * A regra e simples de dizer e facil de errar: quem entra pela primeira vez
 * assiste; da segunda em diante, nunca mais. Ela mora aqui, sozinha e sem
 * cena nem React, porque e assim que da para conferir em teste que "uma vez"
 * e mesmo uma vez.
 *
 * O que fica guardado e uma marca, nao um numero de vezes: nao interessa
 * quantas vezes a pessoa abriu, so se ja assistiu.
 */

export const CHAVE_ABERTURA = "xbpneus-racing:abertura-vista";
const MARCA = "1";

/** O aparelho pode recusar o armazenamento (aba anonima, cookie bloqueado). */
const armazenamentoDoNavegador = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/**
 * Deve rodar o filme agora?
 *
 * Sem armazenamento a resposta e sim. Foi escolha, nao descuido: sem onde
 * anotar, ou a pessoa assiste toda vez ou nao assiste nunca. Assistir toda vez
 * incomoda, mas o botao PULAR esta la desde o primeiro segundo; nao assistir
 * nunca tira a abertura de quem so navega em aba anonima.
 */
export function deveRodarAbertura(
  armazenamento: Storage | null = armazenamentoDoNavegador()
): boolean {
  if (!armazenamento) return true;
  try {
    return armazenamento.getItem(CHAVE_ABERTURA) !== MARCA;
  } catch {
    return true;
  }
}

/**
 * Anota que ja foi assistida. Devolve se conseguiu anotar — quem chama nao
 * precisa fazer nada com isso, mas o teste precisa.
 */
export function marcarAberturaVista(
  armazenamento: Storage | null = armazenamentoDoNavegador()
): boolean {
  if (!armazenamento) return false;
  try {
    armazenamento.setItem(CHAVE_ABERTURA, MARCA);
    return true;
  } catch {
    return false;
  }
}

/**
 * Volta a mostrar a abertura na proxima vez. Nao ha botao para isto no jogo;
 * existe para o time poder rever o filme sem limpar o navegador inteiro, e
 * para o teste ter como voltar ao comeco.
 */
export function esquecerAbertura(
  armazenamento: Storage | null = armazenamentoDoNavegador()
): void {
  if (!armazenamento) return;
  try {
    armazenamento.removeItem(CHAVE_ABERTURA);
  } catch {
    /* aparelho sem onde guardar: nada a esquecer */
  }
}

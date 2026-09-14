/**
 * A CHAVE DIGITADA NA TELA — só enquanto o jogo está em teste.
 *
 * Ordem dele, 13/09/2026: "COMO O GAME AINDA ESTA EM TESTE, CRIE UM CAMPO
 * NESSA PAGINA PARA INSERIR CHAVE".
 *
 * ── POR QUE ISTO EXISTE, JÁ QUE O .BAT JÁ PERGUNTA ────────────────────────
 *
 * A janela preta pergunta a chave UMA vez, antes de o jogo subir. Quem está
 * testando quer ligar e desligar a inteligência no meio da partida, ver a
 * diferença entre a fala do bairro e a fala da inteligência na mesma conversa,
 * e trocar de chave sem fechar nada. Pela janela preta isso custa fechar o
 * jogo, responder de novo e recomeçar a partida.
 *
 * ── ONDE A CHAVE FICA, E ONDE ELA NÃO FICA ────────────────────────────────
 *
 * Fica no NAVEGADOR, nesta máquina, e em mais lugar nenhum:
 *
 *   · não é gravada em arquivo nenhum do projeto;
 *   · não entra no repositório;
 *   · não viaja para servidor nenhum além do próprio jogo, que roda no mesmo
 *     computador;
 *   · nunca aparece inteira na tela depois de guardada — só os quatro últimos
 *     caracteres, o bastante para conferir que é a chave certa.
 *
 * Quem digita é ele. Nenhuma parte do jogo escreve chave nenhuma sozinha.
 *
 * ── E QUANDO O JOGO SAIR DO TESTE ─────────────────────────────────────────
 *
 * Aí a chave passa a morar no servidor da XB e este arquivo sai inteiro — é
 * por isso que ele não se enfia em lugar nenhum: uma tela, um pedido, e pronto.
 * Guardar chave no navegador é aceitável numa máquina de teste e não é
 * aceitável num jogo publicado.
 */

/** A gaveta do navegador onde a chave de teste fica. */
const ONDE = "xbw.chave-de-teste";

/** Toda chave da Groq começa assim. Serve para pegar cola errada na hora. */
export const COMECO_DA_CHAVE = "gsk_";

/** Abaixo disto não é chave, é engano — um pedaço colado pela metade. */
export const LETRAS_MINIMAS = 20;

/** Acima disto também não é chave: é texto colado por acidente. */
export const LETRAS_MAXIMAS = 200;

/**
 * SÓ LETRAS, NÚMEROS, TRAÇO E SUBLINHADO.
 *
 * Não é frescura de formato: esta chave vai virar um cabeçalho de pedido, e
 * cabeçalho aceita quebra de linha. Uma "chave" com quebra de linha dentro
 * poderia acrescentar cabeçalhos que ninguém pediu. Recusar aqui é uma linha;
 * consertar depois é um buraco.
 */
const SO_O_QUE_CHAVE_TEM = /^[A-Za-z0-9_-]+$/;

export function pareceChave(valor: string): boolean {
  const limpa = valor.trim();
  return (
    limpa.length >= LETRAS_MINIMAS &&
    limpa.length <= LETRAS_MAXIMAS &&
    SO_O_QUE_CHAVE_TEM.test(limpa) &&
    limpa.startsWith(COMECO_DA_CHAVE)
  );
}

/**
 * A gaveta do navegador, quando existe.
 *
 * Nos testes e no servidor ela não existe, e isso não pode derrubar nada: sem
 * gaveta, simplesmente não há chave guardada.
 */
function gaveta(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** A chave guardada, ou "" quando não há nenhuma. */
export function chaveDeTeste(): string {
  try {
    const guardada = gaveta()?.getItem(ONDE) ?? "";
    return pareceChave(guardada) ? guardada.trim() : "";
  } catch {
    return "";
  }
}

/** Guarda a chave. Devolve false quando o que foi colado não é uma chave. */
export function guardarChaveDeTeste(valor: string): boolean {
  const limpa = valor.trim();
  if (!pareceChave(limpa)) return false;
  try {
    gaveta()?.setItem(ONDE, limpa);
  } catch {
    return false;
  }
  return true;
}

/** Tira a chave desta máquina. */
export function esquecerChaveDeTeste(): void {
  try {
    gaveta()?.removeItem(ONDE);
  } catch {
    /* gaveta trancada: não havia o que tirar */
  }
}

/**
 * O FIM DA CHAVE — os quatro últimos, e só.
 *
 * É o que os bancos e os aplicativos sérios mostram, pelo mesmo motivo: dá
 * para conferir QUAL chave está ligada sem deixar a chave na tela, onde uma
 * gravação de tela ou alguém passando atrás levaria ela inteira.
 */
export function fimDaChave(valor: string = chaveDeTeste()): string {
  const limpa = valor.trim();
  return limpa ? "••••" + limpa.slice(-4) : "";
}

/**
 * A LIGACAO DE ABERTURA — e a regra de atender ou nao.
 *
 * Ordem dele, 07/09/2026:
 *
 *   "Usuario deve ter a possibilidade de nao querer atender tambem, mas se
 *   atender ir para tela de mensagens. Se usuario tem a possibilidade de nao
 *   atender por duas vezes, na terceira ja abre com a mensagem de Renan, 'Fala
 *   comigo gente fina!!!!!!'."
 *
 * E depois, o que mudou o resto:
 *
 *   "Apos atender chamada, iremos conectar whats app app real dentro do game
 *   para comunicacao real entre npcs. Entenda que sera um whats app, mas so
 *   dentro do game."
 *
 * ── AS FALAS NAO MORAM MAIS AQUI ──────────────────────────────────────────
 *
 * Moravam. Havia uma tela de mensagens so da abertura, com as falas escritas
 * dentro dela, e o aplicativo do jogo tinha OUTRA conversa com o Renan
 * comecando pelo mesmo bom dia. Duas telas parecidas, dois lugares para mexer,
 * e a certeza de que um dia elas iam discordar uma da outra.
 *
 * Agora a ligacao cai DENTRO do aplicativo, na conversa dele — e as falas
 * moram onde moram as de todo mundo, no roteiro. Este arquivo ficou com o que
 * e mesmo do TELEFONE: quantas vezes da para nao atender, quanto ele espera
 * para ligar de novo, e por quais portas a conversa comeca.
 *
 * ── POR QUE PODER NAO ATENDER IMPORTA ─────────────────────────────────────
 *
 * Uma abertura em que so existe um botao nao e uma escolha, e um corredor com
 * uma porta. Deixar recusar custa quase nada e muda o que a pessoa sente: ela
 * entrou num jogo em que as coisas acontecem COM ela, e nao PARA ela.
 *
 * E o jogo nao castiga quem recusa — ele insiste, que e o que um amigo faz. Na
 * terceira o Renan desiste do telefone e manda mensagem, que e exatamente o que
 * qualquer um faz depois de duas ligacoes ignoradas. A brincadeira "fala comigo
 * gente fina" so funciona porque a pessoa sabe que ignorou duas vezes.
 *
 * Ou seja: recusar nao e um caminho morto. E o caminho que tem a melhor piada.
 */

/** Depois de quantas recusas ele desiste do telefone e manda mensagem. */
export const RECUSAS_ATE_A_MENSAGEM = 2;

/** Quanto tempo ate o telefone tocar de novo depois de uma recusa. */
export const ESPERA_PARA_LIGAR_DE_NOVO_MS = 11000;

/**
 * AS DUAS PORTAS DA MESMA CONVERSA.
 *
 * Quem atendeu entra pela porta de sempre, que o roteiro ja abre sozinho. Quem
 * ignorou duas ligacoes entra pela cobranca brincando — e "eu conheco esse",
 * a fala seguinte, muda de sentido conforme o que a pessoa fez.
 */
export const PASSO_DA_COBRANCA = "cobranca";

/**
 * E O PASSO QUE DIZ QUE ELA JA DECIDIU.
 *
 * A conversa chega aqui quando a pessoa manda "vamos resolver isso". O jogo
 * escuta esse passo para soltar o drone: nao ha aviso especial ligando a tela
 * de mensagens a cena do bairro — a conversa faz o que uma conversa faz, e o
 * jogo repara no que ela virou.
 */
export const PASSO_DEPOIS_DE_RESOLVER = "comeco";

/**
 * QUANTO A ULTIMA FALA FICA NA TELA antes de o telefone sair da frente.
 *
 * "Vamos resolver isso" precisa POUSAR na conversa antes de a tela mudar. Sem
 * essa pausa a cena do drone comecaria no mesmo quadro em que a pessoa toca no
 * botao, e o botao pareceria fechar o aplicativo — em vez de a frase dela fazer
 * alguma coisa acontecer no bairro.
 */
export const ESPERA_DEPOIS_DA_ULTIMA_MS = 1500;

/**
 * A ULTIMA FRASE DA ABERTURA — a que fecha o aplicativo sozinho.
 *
 * Ordem dele, 08/09/2026: "apos finalizar conversa renan nao deve mais estar na
 * praca, e app fecha sozinho".
 *
 * A frase esta escrita aqui, e nao lida do roteiro, pelo mesmo motivo da
 * primeira fala depois do bau: o jogo precisa reconhecer o FIM sem abrir o
 * roteiro e sem inventar um sinal novo entre a conversa e o bairro. Se ela
 * mudar no roteiro, muda aqui junto.
 */
export const ULTIMA_FALA_DA_ABERTURA =
  "Mas primeiro vai buscar e comer sua pizza. À tarde nós falamos";

/**
 * QUANTO A DESPEDIDA FICA NA TELA antes de o aplicativo se fechar.
 *
 * Mais que a pausa do drone, de proposito: aquela era uma frase no meio da
 * conversa e esta e a ultima. Fechar rapido demais faz a pessoa sentir que
 * perdeu alguma coisa que ainda estava sendo dita.
 */
export const ESPERA_PARA_FECHAR_SOZINHO_MS = 2600;

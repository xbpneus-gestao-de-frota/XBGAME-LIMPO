/**
 * O TOQUE DE MENSAGEM NOVA.
 *
 * Ordem dele, 08/09/2026: "PRECISAMOS GERAR UM TOQUE CADA VEZ QUE RECEBERMOS
 * NOTIFICACOES."
 *
 * ── POR QUE NAO E O TOQUE DA LIGACAO ──────────────────────────────────────
 *
 * O toque de aChamada.ts e um telefone chamando: repete sem parar ate alguem
 * atender, porque uma ligacao ESPERA resposta. Uma mensagem nao espera nada —
 * ela avisa e sai. Usar o mesmo som nos dois faria a pessoa correr para atender
 * uma ligacao que nao existe, e o pior: o toque de chamada nao para sozinho.
 *
 * Este e curto e sobe de nota (dois sinos, do grave para o agudo). Subir e o
 * que o ouvido le como "chegou"; descer e o que ele le como "acabou" ou "deu
 * errado". Sao 260 milissegundos: menos que isso vira um clique, mais que isso
 * atrapalha quem esta jogando.
 *
 * ── O SOM E FEITO NA HORA ─────────────────────────────────────────────────
 *
 * Nao ha arquivo de audio, pelo mesmo motivo do toque da chamada: som gravado
 * seria mais um download antes de jogar, e este cabe em vinte linhas. O
 * interruptor de som do jogo manda aqui tambem — o jogo nao faz barulho para
 * quem desligou o som.
 */

/** O tremidinho do aparelho quando chega mensagem. Curto, nao e chamada. */
export const TREMOR_DO_AVISO: readonly number[] = [18, 40, 18];

interface FabricaDeAudio {
  new (): AudioContext;
}

/**
 * Toca UMA vez o sinal de mensagem nova.
 *
 * Nao devolve nada para parar porque nao ha o que parar: quando a funcao
 * termina, o som ja tem hora marcada para acabar sozinho.
 */
export function tocarAvisoDeMensagem(
  comSom: boolean,
  janela: (Window & typeof globalThis) | undefined = typeof window ===
  "undefined"
    ? undefined
    : window,
): void {
  // O tremidinho vale mesmo no silencioso: quem joga sem som ainda sente.
  const vibrar = janela?.navigator?.vibrate?.bind(janela.navigator);
  if (vibrar) vibrar([...TREMOR_DO_AVISO]);

  if (!comSom || !janela) return;

  const Fabrica =
    (janela as unknown as { AudioContext?: FabricaDeAudio }).AudioContext ??
    (janela as unknown as { webkitAudioContext?: FabricaDeAudio })
      .webkitAudioContext;
  if (!Fabrica) return;

  let ctx: AudioContext;
  try {
    ctx = new Fabrica();
  } catch {
    return;
  }

  /*
   * ACORDAR O SOM — a mesma armadilha do toque da chamada. O navegador nasce
   * com o som suspenso ate a pessoa tocar em alguma coisa, e a mensagem chega
   * muito depois do clique de entrar. Sem este pedido o toque roda calado, e o
   * defeito nao aparece em teste nenhum: so no ouvido.
   */
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);

  /** Um sino: a nota e a oitava dela juntas, que e o que da brilho de sino. */
  const sino = (hz: number, quando: number, duracao: number, forca: number) => {
    for (const [f, peso] of [
      [hz, 1],
      [hz * 2, 0.45],
    ] as const) {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      // Sobe num piscar e cai devagar — o desenho de qualquer coisa batida.
      vol.gain.setValueAtTime(0, quando);
      vol.gain.linearRampToValueAtTime(forca * peso, quando + 0.008);
      vol.gain.exponentialRampToValueAtTime(0.0001, quando + duracao);
      osc.connect(vol).connect(ctx.destination);
      osc.start(quando);
      osc.stop(quando + duracao + 0.02);
    }
  };

  const agora = ctx.currentTime;
  sino(1174.7, agora, 0.18, 0.07); // ré
  sino(1568.0, agora + 0.09, 0.26, 0.06); // sol — a subida

  // Fecha a torneira sozinho, senao cada mensagem deixa um canal aberto atras.
  janela.setTimeout(() => void ctx.close().catch(() => undefined), 900);
}

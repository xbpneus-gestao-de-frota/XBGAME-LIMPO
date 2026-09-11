/**
 * A CHAMADA QUE COMECA O JOGO.
 *
 * Ordem dele, 07/09/2026: "primeiro passo, apos 7 segundos de tela devemos
 * aplicar um toque de celular e entrar essa tela, ficar tremendo bem pouquinho
 * parecendo que e o celular que treme."
 *
 * ── POR QUE UMA LIGACAO, E NAO UM TEXTO DE TUTORIAL ───────────────────────
 *
 * O jogador deste jogo nao pedala: ele despacha, contrata, cuida do dinheiro e
 * da manutencao. Isso e dificil de explicar e facil de errar — a maioria dos
 * jogos assim comeca com um texto que ninguem le. Uma ligacao pedindo ajuda diz
 * a mesma coisa em quinze segundos, e a pessoa entende o proprio papel
 * ACEITANDO, e nao lendo.
 *
 * ── OS SETE SEGUNDOS ──────────────────────────────────────────────────────
 *
 * Nao e enrolacao: e o tempo de a pessoa olhar o bairro antes de alguem falar
 * com ela. Se a ligacao entrasse junto com o mapa, ela nunca teria visto o lugar
 * onde a historia acontece.
 */

/** Quanto tempo o mapa fica sozinho antes de o telefone tocar. */
export const ESPERA_DA_CHAMADA_MS = 7000;

/** Quem esta ligando. */
export const QUEM_LIGA = {
  /*
   * QUEM LIGA E UM CONTATO DO APLICATIVO, e nao um personagem so desta tela.
   *
   * Atender cai dentro da conversa dele no XBWAPP, entao o id precisa ser o
   * mesmo da lista de contatos. Sem isto, a ligacao e a conversa seriam duas
   * pessoas com o mesmo nome.
   */
  id: "renan",
  nome: "Renan",
  aplicativo: "XBWAPP",
  lema: "TALK · CONNECT · BE CLOSER",
  rodape: ["BOAS PESSOAS", "MAIS PRÓXIMAS SEMPRE"],
  chamada: "Ligação de vídeo…",
} as const;

/**
 * O TOQUE DO CELULAR.
 *
 * Feito na hora, com dois tons curtos e uma pausa — o desenho de toque de
 * telefone que todo mundo reconhece. Nao ha arquivo de som: som gravado seria
 * mais um download antes de jogar, e este cabe em vinte linhas.
 *
 * Ele respeita o interruptor de som do jogo. Sem isso, a primeira coisa que o
 * jogo faz com quem desligou o som e fazer barulho.
 */
export interface Toque {
  parar: () => void;
}

/** O padrao de vibracao do aparelho, quando houver. Toca junto com o som. */
export const TREMOR_DO_APARELHO: readonly number[] = [400, 200, 400, 1200];

interface FabricaDeAudio {
  new (): AudioContext;
}

export function tocarOCelular(
  comSom: boolean,
  janela: (Window & typeof globalThis) | undefined = typeof window ===
  "undefined"
    ? undefined
    : window,
): Toque {
  const paradas: Array<() => void> = [];

  // O tremor do aparelho vale mesmo sem som: quem joga no silencioso sente.
  const vibrar = janela?.navigator?.vibrate?.bind(janela.navigator);
  if (vibrar) {
    const relogio = janela!.setInterval(
      () => vibrar([...TREMOR_DO_APARELHO]),
      TREMOR_DO_APARELHO.reduce((a, b) => a + b, 0),
    );
    vibrar([...TREMOR_DO_APARELHO]);
    paradas.push(() => {
      janela!.clearInterval(relogio);
      vibrar(0);
    });
  }

  if (!comSom || !janela) return { parar: () => paradas.forEach((p) => p()) };

  const Fabrica =
    (janela as unknown as { AudioContext?: FabricaDeAudio }).AudioContext ??
    (janela as unknown as { webkitAudioContext?: FabricaDeAudio })
      .webkitAudioContext;
  if (!Fabrica) return { parar: () => paradas.forEach((p) => p()) };

  let ctx: AudioContext;
  try {
    ctx = new Fabrica();
  } catch {
    return { parar: () => paradas.forEach((p) => p()) };
  }

  /*
   * ACORDAR O SOM — o passo que faz a diferenca entre tocar e nao tocar.
   *
   * O navegador nasce com o som SUSPENSO ate a pessoa tocar em alguma coisa, e
   * so acorda sozinho quando o som e criado no mesmo instante do toque. Aqui
   * nao e: entre o clique de entrar e o telefone tocar passam o filme inteiro e
   * mais sete segundos. Sem este pedido, o toque existe, roda, e sai calado —
   * e o defeito nao aparece em teste nenhum, so no ouvido.
   */
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);

  /** Um bipe: dois tons juntos, que e o que da a cor de telefone. */
  const bipe = (quando: number, duracao: number) => {
    for (const hz of [480, 620]) {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = hz;
      vol.gain.setValueAtTime(0, quando);
      vol.gain.linearRampToValueAtTime(0.05, quando + 0.02);
      vol.gain.setValueAtTime(0.05, quando + duracao - 0.03);
      vol.gain.linearRampToValueAtTime(0, quando + duracao);
      osc.connect(vol).connect(ctx.destination);
      osc.start(quando);
      osc.stop(quando + duracao);
    }
  };

  /*
   * O DESENHO DO TOQUE: trim-trim, pausa. Dois bipes curtos colados e um
   * silencio maior que os dois juntos — e essa pausa que faz o ouvido dizer
   * "telefone" em vez de "alarme".
   */
  const CICLO = 2.4;
  const tocarCiclo = () => {
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    const agora = ctx.currentTime;
    bipe(agora, 0.4);
    bipe(agora + 0.6, 0.4);
  };
  tocarCiclo();
  const relogio = janela.setInterval(tocarCiclo, CICLO * 1000);
  paradas.push(() => {
    janela.clearInterval(relogio);
    void ctx.close().catch(() => undefined);
  });

  return { parar: () => paradas.forEach((p) => p()) };
}

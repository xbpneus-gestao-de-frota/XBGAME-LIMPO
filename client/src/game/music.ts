/**
 * A trilha do jogo.
 *
 * Um arquivo so, tocando em volta, com o volume subindo e descendo devagar em
 * vez de cortar seco. Duas regras nascem do navegador, nao de gosto:
 *
 * 1. Nenhum navegador deixa um site comecar a tocar som antes de a pessoa
 *    tocar na tela. A tentativa e feita mesmo assim e, se ela for recusada,
 *    fica um gatilho armado no primeiro clique ou tecla — e ai a musica entra
 *    sozinha, sem a pessoa precisar apertar nada de novo.
 * 2. Com a aba escondida o som continuaria tocando no bolso de quem trocou de
 *    aplicativo. Some enquanto a aba estiver fora e volta quando ela voltar.
 *
 * O modulo nao decide se deve haver musica: quem decide e o interruptor de som
 * dos ajustes, la em GameCanvas. Aqui so se obedece.
 */

const CAMINHO = "/assets/XB_Trilha_Abertura.mp3";
/** Volume de cruzeiro. Trilha de fundo nao disputa com o jogo. */
const VOLUME_CHEIO = 0.42;
const PASSO_DA_SUBIDA = 0.02;
const INTERVALO_DA_SUBIDA_MS = 60;

export interface TrilhaSonora {
  /** Liga ou desliga conforme o interruptor de som dos ajustes. */
  definirLigada(ligada: boolean): void;
  /** Solta o audio e os gatilhos. Chamado quando a tela do jogo morre. */
  encerrar(): void;
}

interface Janela {
  addEventListener(tipo: string, ouvinte: () => void, opcoes?: unknown): void;
  removeEventListener(tipo: string, ouvinte: () => void): void;
  setInterval(acao: () => void, ms: number): number;
  clearInterval(id: number): void;
}

interface Documento {
  hidden: boolean;
  addEventListener(tipo: string, ouvinte: () => void): void;
  removeEventListener(tipo: string, ouvinte: () => void): void;
}

/**
 * `criarAudio` entra por fora para o teste poder passar um audio de mentira:
 * sem isso nao daria para conferir a regra do gesto sem um navegador de
 * verdade, e e justamente ela que costuma quebrar calada.
 */
export function criarTrilhaSonora({
  criarAudio,
  janela,
  documento,
  caminho = CAMINHO,
}: {
  criarAudio(caminho: string): HTMLAudioElement;
  janela: Janela;
  documento: Documento;
  caminho?: string;
}): TrilhaSonora {
  const audio = criarAudio(caminho);
  audio.loop = true;
  /*
   * "none" de proposito: a trilha pesa alguns megabytes e quem nunca liga o som
   * nao deveria pagar por ela no plano de dados. O arquivo so comeca a baixar
   * quando o som e ligado — a subida lenta de volume cobre a espera.
   */
  audio.preload = "none";
  audio.volume = 0;

  let ligada = false;
  let encerrada = false;
  let subida: number | null = null;
  let esperandoGesto = false;

  const pararSubida = () => {
    if (subida === null) return;
    janela.clearInterval(subida);
    subida = null;
  };

  const irPara = (alvo: number, aoChegar?: () => void) => {
    pararSubida();
    subida = janela.setInterval(() => {
      const distancia = alvo - audio.volume;
      if (Math.abs(distancia) <= PASSO_DA_SUBIDA) {
        audio.volume = alvo;
        pararSubida();
        aoChegar?.();
        return;
      }
      audio.volume += Math.sign(distancia) * PASSO_DA_SUBIDA;
    }, INTERVALO_DA_SUBIDA_MS);
  };

  const noGesto = () => {
    esperandoGesto = false;
    janela.removeEventListener("pointerdown", noGesto);
    janela.removeEventListener("keydown", noGesto);
    if (ligada && !encerrada) tocar();
  };

  const armarGesto = () => {
    if (esperandoGesto || encerrada) return;
    esperandoGesto = true;
    janela.addEventListener("pointerdown", noGesto, { once: true });
    janela.addEventListener("keydown", noGesto, { once: true });
  };

  function tocar(): void {
    if (encerrada || !ligada || documento.hidden) return;
    const promessa: unknown = audio.play();
    if (promessa && typeof (promessa as Promise<void>).catch === "function") {
      // Recusa aqui quer dizer "ainda nao houve gesto", nao defeito: espera o
      // primeiro toque em vez de reclamar no console.
      void (promessa as Promise<void>).catch(() => armarGesto());
    }
    irPara(VOLUME_CHEIO);
  }

  const calar = () => {
    irPara(0, () => audio.pause());
  };

  const naTrocaDeAba = () => {
    if (!ligada || encerrada) return;
    if (documento.hidden) {
      pararSubida();
      audio.volume = 0;
      audio.pause();
      return;
    }
    tocar();
  };
  documento.addEventListener("visibilitychange", naTrocaDeAba);

  return {
    definirLigada(proxima: boolean) {
      if (encerrada || proxima === ligada) return;
      ligada = proxima;
      if (ligada) tocar();
      else calar();
    },
    encerrar() {
      encerrada = true;
      ligada = false;
      pararSubida();
      audio.pause();
      documento.removeEventListener("visibilitychange", naTrocaDeAba);
      janela.removeEventListener("pointerdown", noGesto);
      janela.removeEventListener("keydown", noGesto);
    },
  };
}

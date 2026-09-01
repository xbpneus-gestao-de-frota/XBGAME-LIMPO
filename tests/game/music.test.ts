/**
 * Guarda da trilha sonora. O que se confere aqui nao e "toca musica" — e o
 * comportamento que o navegador impoe e que quebra calado:
 *
 * - som so pode comecar depois de um gesto da pessoa;
 * - com a aba escondida o som tem de sumir;
 * - mexer no interruptor nao pode recomecar a musica do zero.
 */
import { describe, expect, it, vi } from "vitest";
import { criarTrilhaSonora } from "../../client/src/game/music";

function bancada({ recusaOPrimeiroPlay = false } = {}) {
  let recusar = recusaOPrimeiroPlay;
  const audio = {
    loop: false,
    preload: "",
    volume: 1,
    src: "",
    tocadas: 0,
    pausas: 0,
    play: vi.fn(() => {
      if (recusar) {
        recusar = false;
        return Promise.reject(new Error("gesto ausente"));
      }
      audio.tocadas += 1;
      return Promise.resolve();
    }),
    pause: vi.fn(() => {
      audio.pausas += 1;
    }),
  };

  const ouvintesJanela = new Map<string, Array<() => void>>();
  const ouvintesDoc = new Map<string, Array<() => void>>();
  const tarefas = new Map<number, () => void>();
  let proximaTarefa = 1;

  const janela = {
    addEventListener(tipo: string, ouvinte: () => void) {
      ouvintesJanela.set(tipo, [...(ouvintesJanela.get(tipo) ?? []), ouvinte]);
    },
    removeEventListener(tipo: string, ouvinte: () => void) {
      ouvintesJanela.set(
        tipo,
        (ouvintesJanela.get(tipo) ?? []).filter(atual => atual !== ouvinte)
      );
    },
    setInterval(acao: () => void) {
      const id = proximaTarefa;
      proximaTarefa += 1;
      tarefas.set(id, acao);
      return id;
    },
    clearInterval(id: number) {
      tarefas.delete(id);
    },
  };

  const documento = {
    hidden: false,
    addEventListener(tipo: string, ouvinte: () => void) {
      ouvintesDoc.set(tipo, [...(ouvintesDoc.get(tipo) ?? []), ouvinte]);
    },
    removeEventListener(tipo: string, ouvinte: () => void) {
      ouvintesDoc.set(
        tipo,
        (ouvintesDoc.get(tipo) ?? []).filter(atual => atual !== ouvinte)
      );
    },
  };

  const trilha = criarTrilhaSonora({
    criarAudio: () => audio as unknown as HTMLAudioElement,
    janela,
    documento,
  });

  return {
    trilha,
    audio,
    documento,
    disparar: (tipo: string) =>
      [...(ouvintesJanela.get(tipo) ?? [])].forEach(ouvinte => ouvinte()),
    trocarDeAba: (escondida: boolean) => {
      documento.hidden = escondida;
      [...(ouvintesDoc.get("visibilitychange") ?? [])].forEach(o => o());
    },
    girarVolume: (voltas = 60) => {
      for (let i = 0; i < voltas; i += 1)
        [...tarefas.values()].forEach(acao => acao());
    },
    esperandoGesto: () => (ouvintesJanela.get("pointerdown") ?? []).length > 0,
  };
}

describe("a trilha do jogo", () => {
  it("nasce calada e so toca quando o som e ligado", () => {
    const b = bancada();
    expect(b.audio.play).not.toHaveBeenCalled();
    b.trilha.definirLigada(true);
    expect(b.audio.play).toHaveBeenCalledTimes(1);
    expect(b.audio.loop).toBe(true);
  });

  it("sobe o volume devagar em vez de entrar seco", () => {
    const b = bancada();
    b.trilha.definirLigada(true);
    expect(b.audio.volume).toBe(0);
    b.girarVolume(3);
    const noMeio = b.audio.volume;
    expect(noMeio).toBeGreaterThan(0);
    expect(noMeio).toBeLessThan(0.42);
    b.girarVolume();
    expect(b.audio.volume).toBeCloseTo(0.42, 5);
  });

  it("espera o primeiro toque quando o navegador recusa o som", async () => {
    const b = bancada({ recusaOPrimeiroPlay: true });
    b.trilha.definirLigada(true);
    await Promise.resolve();
    await Promise.resolve();
    // Recusa nao e defeito: fica um gatilho armado, e nada tocou ainda.
    expect(b.audio.tocadas).toBe(0);
    expect(b.esperandoGesto()).toBe(true);
    b.disparar("pointerdown");
    expect(b.audio.tocadas).toBe(1);
  });

  it("some com a aba escondida e volta quando ela volta", () => {
    const b = bancada();
    b.trilha.definirLigada(true);
    b.girarVolume();
    b.trocarDeAba(true);
    expect(b.audio.volume).toBe(0);
    expect(b.audio.pause).toHaveBeenCalled();
    b.trocarDeAba(false);
    b.girarVolume();
    expect(b.audio.volume).toBeCloseTo(0.42, 5);
  });

  it("nao recomeca a musica quando o interruptor e mexido no mesmo estado", () => {
    const b = bancada();
    b.trilha.definirLigada(true);
    b.trilha.definirLigada(true);
    b.trilha.definirLigada(true);
    expect(b.audio.tocadas).toBe(1);
  });

  it("desce o volume antes de pausar, e nao corta seco", () => {
    const b = bancada();
    b.trilha.definirLigada(true);
    b.girarVolume();
    b.trilha.definirLigada(false);
    expect(b.audio.pause).not.toHaveBeenCalled();
    b.girarVolume();
    expect(b.audio.volume).toBe(0);
    expect(b.audio.pause).toHaveBeenCalledTimes(1);
  });

  it("larga tudo ao encerrar", () => {
    const b = bancada();
    b.trilha.definirLigada(true);
    b.trilha.encerrar();
    expect(b.audio.pause).toHaveBeenCalled();
    b.trilha.definirLigada(true);
    expect(b.audio.tocadas).toBe(1);
  });
});

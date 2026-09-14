/**
 * Guarda da abertura. O pedido do Fernando foi exato: "usuario vera essa
 * apenas uma vez, na segunda conexao nao vera mais". "Uma vez" e o tipo de
 * regra que passa despercebida quando quebra — ninguem repara que o filme
 * voltou a aparecer ate um cliente reclamar —, entao ela e conferida aqui.
 */
import { describe, expect, it } from "vitest";
import {
  CHAVE_ABERTURA,
  deveRodarAbertura,
  esquecerAbertura,
  marcarAberturaVista,
} from "../../client/src/game/openingScene";

class MemoriaDeMentira implements Storage {
  private dados = new Map<string, string>();

  get length(): number {
    return this.dados.size;
  }
  clear(): void {
    this.dados.clear();
  }
  getItem(chave: string): string | null {
    return this.dados.get(chave) ?? null;
  }
  key(indice: number): string | null {
    return [...this.dados.keys()][indice] ?? null;
  }
  removeItem(chave: string): void {
    this.dados.delete(chave);
  }
  setItem(chave: string, valor: string): void {
    this.dados.set(chave, valor);
  }
}

/** Aba anonima: existe, responde, e recusa tudo. */
class MemoriaTrancada implements Storage {
  readonly length = 0;
  clear(): void {
    throw new Error("bloqueado");
  }
  getItem(): string | null {
    throw new Error("bloqueado");
  }
  key(): string | null {
    throw new Error("bloqueado");
  }
  removeItem(): void {
    throw new Error("bloqueado");
  }
  setItem(): void {
    throw new Error("bloqueado");
  }
}

describe("a cena de abertura", () => {
  it("roda na primeira vez e nunca mais", () => {
    const memoria = new MemoriaDeMentira();
    expect(deveRodarAbertura(memoria)).toBe(true);
    expect(marcarAberturaVista(memoria)).toBe(true);
    expect(deveRodarAbertura(memoria)).toBe(false);
    // Terceira, decima, centesima abertura: continua nao.
    for (let i = 0; i < 10; i += 1) {
      expect(deveRodarAbertura(memoria)).toBe(false);
    }
  });

  it("marcar de novo nao desfaz nem duplica nada", () => {
    const memoria = new MemoriaDeMentira();
    marcarAberturaVista(memoria);
    marcarAberturaVista(memoria);
    expect(deveRodarAbertura(memoria)).toBe(false);
    expect(memoria.length).toBe(1);
  });

  it("volta a rodar depois de esquecer", () => {
    const memoria = new MemoriaDeMentira();
    marcarAberturaVista(memoria);
    esquecerAbertura(memoria);
    expect(deveRodarAbertura(memoria)).toBe(true);
  });

  it("marca estranha guardada por outro programa nao vale como vista", () => {
    const memoria = new MemoriaDeMentira();
    memoria.setItem(CHAVE_ABERTURA, "talvez");
    expect(deveRodarAbertura(memoria)).toBe(true);
  });

  it("sem lugar para guardar, o filme roda — e nao explode", () => {
    expect(deveRodarAbertura(null)).toBe(true);
    expect(marcarAberturaVista(null)).toBe(false);
    expect(() => esquecerAbertura(null)).not.toThrow();

    const trancada = new MemoriaTrancada();
    expect(deveRodarAbertura(trancada)).toBe(true);
    expect(marcarAberturaVista(trancada)).toBe(false);
    expect(() => esquecerAbertura(trancada)).not.toThrow();
  });

  it("nao mexe em nada que nao seja a propria marca", () => {
    const memoria = new MemoriaDeMentira();
    memoria.setItem("xbpneus-racing:feedback-preferences", "guardado");
    marcarAberturaVista(memoria);
    esquecerAbertura(memoria);
    expect(memoria.getItem("xbpneus-racing:feedback-preferences")).toBe(
      "guardado"
    );
  });
});

/**
 * O BOTAO PULAR COBRE A MARCA D'AGUA DO FILME.
 *
 * Ordem dele, 13/09/2026: "no video imagem 3 mostra uma pequena estrela do
 * Gemini, deixe o botao pular sobre ela". A estrelinha esta QUEIMADA no video —
 * nao ha o que apagar, so o que cobrir.
 *
 * Isto quebra calado de tres jeitos, e os tres estao presos aqui:
 *   · alguem devolve o botao para o canto da janela, e ele sai de cima da marca
 *     em toda tela que nao seja 9 por 16;
 *   · alguem tira o palco, e a porcentagem passa a medir a JANELA;
 *   · alguem enxuga o botao, e as pontas da estrela aparecem em volta dele.
 */
import { readFileSync } from "node:fs";

const CSS_DA_ABERTURA = readFileSync("client/src/index.css", "utf8");
const TELA = readFileSync("client/src/components/GameCanvas.tsx", "utf8");

describe("o botao PULAR e a marca d'agua", () => {
  const bloco = (nome: string): string =>
    CSS_DA_ABERTURA.split(`\n${nome} {`)[1]!.split("\n}")[0]!;

  it("o palco tem a forma do filme, e nao a da janela", () => {
    const palco = bloco(".abertura__palco");
    expect(palco).toContain("aspect-ratio: 720 / 1280");
    expect(palco).toContain("max-width: 100%");
    expect(palco).toContain("max-height: 100%");
  });

  it("o botao esta dentro do palco, junto do filme", () => {
    const palco = TELA.indexOf('className="abertura__palco"');
    const filme = TELA.indexOf('className="abertura__filme"');
    const pular = TELA.indexOf('className="abertura__pular"');
    expect(palco).toBeGreaterThan(0);
    expect(palco).toBeLessThan(filme);
    expect(palco).toBeLessThan(pular);
  });

  it("o botao pousa no ponto medido da marca, e nao num canto", () => {
    const pular = bloco(".abertura__pular");
    expect(pular).toContain("left: 83.4%");
    expect(pular).toContain("top: 90.5%");
    expect(pular).toContain("translate(-50%, -50%)");
    expect(pular).not.toMatch(/\n\s*(right|bottom):/);
  });

  it("o botao e grande o bastante para cobrir a estrela inteira", () => {
    /*
     * A estrela mede 65 por 75 pontos num filme de 720 por 1280 — 9,0% da
     * largura e 5,9% da altura DA CENA. O botao e medido na mesma regua, e nao
     * em pontos de tela: em aparelho menor o filme encolhe e a estrela encolhe
     * junto, e um botao em pontos ficaria certo numa tela so.
     *
     * E o fundo precisa ser quase opaco, senao a estrela aparece POR DENTRO do
     * botao — o mesmo defeito com uma etapa a mais.
     */
    const pular = bloco(".abertura__pular");
    const largura = Number(/\n  width: ([\d.]+)%/.exec(pular)![1]);
    const altura = Number(/\n  height: ([\d.]+)%/.exec(pular)![1]);
    expect(largura).toBeGreaterThanOrEqual(9.1);
    expect(altura).toBeGreaterThanOrEqual(6);
    const opacidade = Number(
      /background: rgb\(4 10 18 \/ (\d+)%\)/.exec(pular)![1],
    );
    expect(opacidade).toBeGreaterThanOrEqual(90);
  });
});

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

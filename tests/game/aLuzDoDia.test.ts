import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DIA_EM_MS,
  MARCOS,
  horaDeAcender,
  marcoEm,
} from "../../client/src/game/aLuzDoDia";

const CSS = readFileSync("client/src/index.css", "utf8");
const MAPA = readFileSync("client/src/components/MapaDoBairro.tsx", "utf8");

/**
 * A LUZ DO DIA — a primeira das quinze coisas que podem ganhar vida no mapa.
 *
 * Decisao dele: "tem hora do dia, no relogio do jogo". Era ela que travava
 * metade da lista — coreto, vitrine e janela acesa so existem se houver
 * entardecer.
 */
describe("a luz do dia", () => {
  it("o dia inteiro cabe numa corrida sem virar efeito", () => {
    /*
     * Uma corrida leva de trinta segundos a um minuto de tela. Com o dia em
     * quatro minutos ela atravessa perto de um quarto do ciclo: da para ver a
     * luz virar sem que ela vire na cara de ninguem. Um dia de trinta segundos
     * seria efeito; um de meia hora nunca mostraria o entardecer.
     */
    expect(DIA_EM_MS).toBeGreaterThanOrEqual(2 * 60 * 1000);
    expect(DIA_EM_MS).toBeLessThanOrEqual(10 * 60 * 1000);
    expect(MAPA).toContain('"--dia": `${DIA_EM_MS}ms`');
  });

  it("o ciclo fecha, e nao tem noite fechada", () => {
    /*
     * Noite de verdade escureceria as ruas, e a rua e onde moram a rota e os
     * pinos. O ciclo vai do amanhecer ao entardecer e volta.
     */
    expect(MARCOS.map(m => m.nome)).toEqual([
      "amanhecer",
      "manha",
      "meio-dia",
      "tarde",
      "entardecer",
    ]);
    expect(marcoEm(0)).toBe("amanhecer");
    expect(marcoEm(1)).toBe("amanhecer"); // fecha sem corte
    expect(marcoEm(2.5)).toBe(marcoEm(0.5));
    expect(marcoEm(-0.05)).toBe("entardecer"); // antes do zero e o fim do dia
  });

  it("ha uma hora de acender, senao metade da lista nao existe", () => {
    /*
     * Coreto, vitrine e janela acesa dependem de haver entardecer. Foi essa
     * pergunta que travou a lista ate ele decidir.
     */
    expect(horaDeAcender(0.9)).toBe(true);
    expect(horaDeAcender(0.5)).toBe(false);
    expect(MARCOS.some(m => m.nome === "entardecer")).toBe(true);
  });

  it("os marcos do codigo e os do desenho sao os mesmos", () => {
    /*
     * O tempo mora no codigo e a cor mora no CSS. Sao dois lugares, e fracao
     * repetida em dois lugares e fracao que envelhece torta — entao o teste
     * amarra os dois.
     */
    const bloco = CSS.split("@keyframes luz-do-dia {")[1]!.split("\n}")[0]!;
    const noCss = [...bloco.matchAll(/^\s*(\d+)% \{/gm)].map(m => Number(m[1]));
    const noCodigo = MARCOS.map(m => Math.round(m.em * 100));
    expect(noCss).toEqual([...noCodigo, 100]);
  });

  it("a luz fica entre o desenho e os pinos", () => {
    /*
     * O menino e o bairro recebem a mesma luz, senao ele parece recortado e
     * colado. O pino fica por cima e nao entardece: pino e recado.
     */
    const ordem = ["mapa__foto", "mapa__luz", "mapa__nuvens"];
    let onde = -1;
    for (const classe of ordem) {
      const i = MAPA.indexOf(classe);
      expect(i).toBeGreaterThan(onde);
      onde = i;
    }
    expect(MAPA.indexOf("mapa__nuvens")).toBeLessThan(MAPA.indexOf("O PINO RENDERIZADO"));
  });

  it("quem pediu menos movimento fica com o bairro parado", () => {
    /*
     * As duas regras aparecem duas vezes no desenho: a de verdade, e a de
     * quem pediu menos movimento. O que separa uma da outra e estar DENTRO do
     * bloco — por isso o teste procura o texto ja indentado e confere que ha um
     * bloco de menos movimento aberto antes dele.
     */
    for (const regra of [
      "  .mapa__luz {\n    animation: none;",
      "  .mapa__nuvens {\n    animation: none;",
    ]) {
      const onde = CSS.indexOf(regra);
      expect(onde).toBeGreaterThan(-1);
      const abertura = CSS.lastIndexOf(
        "@media (prefers-reduced-motion: reduce) {",
        onde
      );
      expect(abertura).toBeGreaterThan(-1);
      // e nao ha nenhuma outra regra de topo entre a abertura e ela
      expect(CSS.slice(abertura, onde)).not.toMatch(/\n\.[a-z]/);
    }
  });
});

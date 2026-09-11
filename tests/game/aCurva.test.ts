import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GIRO_CHEIO,
  GIRO_DA_POEIRA,
  INCLINACAO_MAXIMA,
  inclinacaoDaCurva,
  levantaPoeira,
} from "../../client/src/game/aCurva";

const COMPONENTE = readFileSync("client/src/components/Entregador.tsx", "utf8");
const MAPA = readFileSync("client/src/components/MapaDoBairro.tsx", "utf8");
const CSS = readFileSync("client/src/index.css", "utf8");

/**
 * A CURVA — ele pende para dentro, e o pneu de tras levanta poeira.
 *
 * "Vamos adicionar animacoes ao entregador. O que voce pode adicionar nas
 * curvas? Fumaca saindo dos pneus a cada curva?"
 */
describe("a curva", () => {
  it("na reta ele nao pende nem levanta poeira", () => {
    /*
     * A mediana da velocidade de giro nas rotas do bairro e UM grau por
     * segundo: ele anda quase sempre reto. Se a reta tivesse enfeite, o enfeite
     * seria o estado normal e nao diria mais nada.
     */
    expect(inclinacaoDaCurva(0, 90)).toBeCloseTo(0, 10);
    expect(Math.abs(inclinacaoDaCurva(1, 90))).toBeLessThan(0.1);
    expect(levantaPoeira(0)).toBe(false);
    expect(levantaPoeira(26)).toBe(false); // 90% do tempo fica abaixo disto
  });

  it("a poeira sai so nas curvas fechadas", () => {
    /*
     * Medido em quarenta rotas, com a espera de 1,2 s entre uma poeira e outra:
     *
     *     > 40°/s   2,8 por minuto
     *     > 60°/s   1,9 por minuto   <- escolhido
     *     > 80°/s   1,1 por minuto
     *
     * "Fumaca a cada curva" sairia a toda hora e viraria carro derrapando.
     */
    expect(GIRO_DA_POEIRA).toBe(60);
    expect(levantaPoeira(GIRO_DA_POEIRA + 1)).toBe(true);
    expect(levantaPoeira(-(GIRO_DA_POEIRA + 1))).toBe(true); // dos dois lados
    expect(levantaPoeira(GIRO_DA_POEIRA - 1)).toBe(false);
  });

  it("ele pende para dentro, e nao para fora", () => {
    /*
     * De costas para a camera (12h00, 90° na tela), girar no sentido
     * anti-horario e virar para a esquerda dele. Quem vira para a esquerda pende
     * para a esquerda, e na tela isso e o topo do desenho indo para a esquerda —
     * giro anti-horario, que em CSS e negativo.
     */
    expect(inclinacaoDaCurva(GIRO_CHEIO, 90)).toBeCloseTo(-INCLINACAO_MAXIMA, 5);
    expect(inclinacaoDaCurva(-GIRO_CHEIO, 90)).toBeCloseTo(INCLINACAO_MAXIMA, 5);
  });

  it("vindo para a camera, ele pende para o outro lado", () => {
    /*
     * E o mesmo corpo pendendo para o mesmo lado — o que muda e de onde se
     * olha. De frente (06h00, 270° na tela), a esquerda dele e a direita de quem
     * ve. Sem esta troca de sinal, ele penderia para FORA da curva metade do
     * tempo, que e a cara de quem vai cair.
     */
    expect(inclinacaoDaCurva(GIRO_CHEIO, 270)).toBeCloseTo(INCLINACAO_MAXIMA, 5);
    expect(inclinacaoDaCurva(GIRO_CHEIO, 90)).toBeCloseTo(-INCLINACAO_MAXIMA, 5);
  });

  it("de perfil ele nao pende", () => {
    /*
     * Inclinar e girar em torno do eixo comprido da bicicleta. Visto de perfil
     * (03h00 e 09h00), esse giro aparece como a bicicleta tombando na direcao
     * da camera — encurtamento, e nao rotacao. Girar o desenho ali tiraria os
     * dois pneus do chao e entortaria a bicicleta.
     */
    expect(Math.abs(inclinacaoDaCurva(GIRO_CHEIO, 0))).toBeLessThan(1e-9);
    expect(Math.abs(inclinacaoDaCurva(GIRO_CHEIO, 180))).toBeLessThan(1e-9);
  });

  it("mais rapido que o cheio nao pende mais", () => {
    // o limite de guidao do jogo e 220°/s; sem teto, uma esquina fechada
    // deitaria o menino no chao
    expect(inclinacaoDaCurva(220, 90)).toBeCloseTo(-INCLINACAO_MAXIMA, 5);
    expect(INCLINACAO_MAXIMA).toBeLessThanOrEqual(8);
  });

  it("o corte do chao nao pende junto com ele", () => {
    /*
     * O DEFEITO QUE ESTA SEPARACAO EVITA.
     *
     * O corte guarda o que esta acima da linha do chao, e a inclinacao gira a
     * imagem. Enquanto os dois estavam na mesma peca, o corte girava junto: a
     * seis graus a linha do chao pende tambem, come uns cinco por cento da
     * moldura de um lado e deixa o pneu do outro lado pendurado no ar.
     */
    expect(CSS).toMatch(/\.entregador__camada\s*\{[^}]*clip-path:\s*var\(--corte\)/);
    const bloco = CSS.split("\n.entregador__desenho {")[1]!.split("}")[0]!;
    expect(bloco).not.toContain("clip-path");
    expect(bloco).toContain("transform-origin");
    expect(bloco).toContain("--giro-x");
  });

  it("a poeira fica no chao, e nao anda com ele", () => {
    /*
     * Poeira que viaja junto com quem a levantou nao e poeira. Por isso ela e
     * avisada para fora e pintada pelo MAPA, no ponto em que nasceu.
     */
    expect(COMPONENTE).toContain("aoLevantarPoeira");
    expect(COMPONENTE).toContain("poeirar.current({");
    expect(MAPA).toContain('className="mapa__poeira"');
    expect(MAPA).toContain("setPoeiras");
    expect(CSS).toContain(".mapa__poeira");
    expect(CSS).toContain("@keyframes poeira-sobe");
  });

  it("quem pediu menos movimento nao pende nem levanta poeira", () => {
    const menos = CSS.split("@media (prefers-reduced-motion: reduce) {")
      .find(b => b.includes(".mapa__poeira"))!;
    expect(menos).toContain("transform: none");
    expect(menos).toMatch(/\.mapa__poeira\s*\{\s*display:\s*none/);
  });
});

/**
 * UM RELOGIO SO NO BAIRRO.
 *
 * Ordem dele, 12/09/2026: "primeiro atualize relogio um apenas".
 *
 * O jogo tinha tres dias correndo juntos: a luz fechava um ciclo a cada quatro
 * minutos, o balcao a cada dez, e o relogio da conversa somava um minuto a cada
 * minuto de verdade. Enquanto o balcao vivia um dia, o sol nascia duas vezes e
 * meia e a conversa andava dez minutos.
 *
 * O que estes testes seguram e exatamente o que se perde sem ninguem ver:
 *
 *   · alguem escrever de novo um "quanto dura um dia" solto em qualquer folha
 *   · a luz voltar a correr numa animacao propria, sem olhar para o jogo
 *   · o relogio da conversa voltar a somar sozinho
 *
 * Nenhuma dessas tres quebra o jogo na hora. Todas voltam a separar os dias.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  COMECA_AS,
  MINUTOS_POR_DIA,
  SEGUNDOS_DO_DIA,
  TERMINA_AS,
  diaDoBairro,
  fracaoDoDia,
  minutoDoDia,
} from "@/game/oRelogioDoBairro";
import { DIA_EM_MS, MARCOS, marcoEm } from "@/game/aLuzDoDia";
import { SEGUNDOS_POR_DIA } from "@/game/xbwapp/entregaRapida";
import { estadoInicial, hora } from "@/game/xbwapp/estado";

const CSS = readFileSync("client/src/index.css", "utf8");
const TELA = readFileSync("client/src/components/GameCanvas.tsx", "utf8");
const MAPA = readFileSync("client/src/components/MapaDoBairro.tsx", "utf8");

describe("o relogio do bairro e um so", () => {
  it("o dia da luz e o dia do balcao sao o mesmo dia", () => {
    /* Era aqui que os tres se separavam: a luz tinha um dia proprio. */
    expect(SEGUNDOS_DO_DIA).toBe(SEGUNDOS_POR_DIA);
    expect(DIA_EM_MS).toBe(SEGUNDOS_POR_DIA * 1000);
  });

  it("o dia e um numero de verdade, e nao um buraco", () => {
    /*
     * ISTO JA ACONTECEU, e nao fez barulho nenhum.
     *
     * Quando este arquivo lia o dia do balcao, os dois se procuravam em roda —
     * o balcao pedia o estado, o estado pedia o relogio, o relogio pedia o
     * balcao. Numa das voltas o numero chegava antes de existir: o dia virava
     * vazio, a hora do bairro virava NaN, o carimbo das mensagens saia em
     * branco e os recados sumiam da tela. Nada quebrou com estrondo.
     *
     * Por isso este teste olha para o valor, e nao para o desenho: um numero
     * que nao e numero e o unico jeito de o relogio inteiro morrer calado.
     */
    expect(Number.isFinite(SEGUNDOS_DO_DIA)).toBe(true);
    expect(SEGUNDOS_DO_DIA).toBeGreaterThan(0);
    for (const s of [0, 1, 123, SEGUNDOS_DO_DIA, SEGUNDOS_DO_DIA * 3 + 7]) {
      expect(Number.isFinite(fracaoDoDia(s))).toBe(true);
      expect(Number.isFinite(minutoDoDia(s))).toBe(true);
      expect(Number.isInteger(diaDoBairro(s))).toBe(true);
    }
    expect(Number.isFinite(estadoInicial().minuto)).toBe(true);
  });

  it("o dia comeca no amanhecer e termina no escuro, sem madrugada", () => {
    expect(COMECA_AS).toBeLessThan(TERMINA_AS);
    expect(MINUTOS_POR_DIA).toBe(TERMINA_AS - COMECA_AS);
    /* Nada de dia de vinte e quatro horas: nao ha noite fechada no bairro. */
    expect(MINUTOS_POR_DIA).toBeLessThan(24 * 60);
  });

  it("a fracao anda de zero a um e volta, sem buraco na virada", () => {
    expect(fracaoDoDia(0)).toBe(0);
    expect(fracaoDoDia(SEGUNDOS_DO_DIA / 2)).toBeCloseTo(0.5, 5);
    expect(fracaoDoDia(SEGUNDOS_DO_DIA)).toBe(0);
    expect(fracaoDoDia(SEGUNDOS_DO_DIA + 1)).toBeCloseTo(
      fracaoDoDia(1),
      5
    );
  });

  it("a hora do bairro sai da fracao, e nao de um contador", () => {
    expect(minutoDoDia(0)).toBe(COMECA_AS);
    expect(minutoDoDia(SEGUNDOS_DO_DIA - 1)).toBeLessThan(TERMINA_AS);
    /* O dia seguinte recomeca no amanhecer, e nao onde o anterior parou. */
    expect(minutoDoDia(SEGUNDOS_DO_DIA)).toBe(COMECA_AS);
  });

  it("o meio-dia da luz cai perto do meio-dia do relogio", () => {
    /*
     * Nao e enfeite: se os marcos da luz nao caem na hora que o relogio diz, o
     * almoco do entregador vai acontecer com o sol no lugar errado.
     */
    const meio = MARCOS.find(m => m.nome === "meio-dia")!;
    const quando = minutoDoDia(meio.em * SEGUNDOS_DO_DIA);
    expect(quando).toBeGreaterThanOrEqual(11 * 60);
    expect(quando).toBeLessThanOrEqual(13 * 60);
    expect(marcoEm(meio.em)).toBe("meio-dia");
  });

  it("os dias sao contados do primeiro", () => {
    expect(diaDoBairro(0)).toBe(1);
    expect(diaDoBairro(SEGUNDOS_DO_DIA - 1)).toBe(1);
    expect(diaDoBairro(SEGUNDOS_DO_DIA)).toBe(2);
  });

  it("o aplicativo abre na mesma hora em que o bairro amanhece", () => {
    /* Abria as nove com o bairro amanhecendo: duas horas diferentes na mesma tela. */
    expect(estadoInicial().minuto).toBe(minutoDoDia(0));
    expect(hora(estadoInicial().minuto)).toBe(hora(COMECA_AS));
  });
});

describe("ninguem volta a ter um dia proprio", () => {
  it("a luz do mapa esta parada e obedece a hora que o jogo manda", () => {
    /*
     * Uma animacao infinita SEM pausa aqui e uma luz correndo sozinha de novo.
     * O atraso negativo em cima de um ciclo de um segundo e o que poe o desenho
     * no instante certo do dia.
     */
    const bloco = CSS.slice(CSS.indexOf(".mapa__luz {"));
    const regra = bloco.slice(0, bloco.indexOf("}"));
    expect(regra).toContain("paused");
    expect(regra).toContain("--luz-em");
  });

  it("as luzes do entardecer leem a mesma hora que a luz do dia", () => {
    const bloco = CSS.slice(CSS.indexOf(".vida__acende {"));
    const regra = bloco.slice(0, bloco.indexOf("}"));
    expect(regra).toContain("paused");
    expect(regra).toContain("--luz-em");
  });

  it("nenhuma folha guarda mais um tempo de dia proprio", () => {
    /* `--dia` era o tempo solto que a luz usava. Ele nao volta. */
    expect(CSS).not.toContain("var(--dia");
  });

  it("o mapa recebe a hora de fora, e nao inventa a sua", () => {
    expect(MAPA).toContain("fracaoDoDia");
    expect(TELA).toContain("relogioDoBalcao={estadoDoApp.relogioDoBalcao}");
  });

  it("o relogio da conversa e calculado, e nao somado de um em um", () => {
    expect(TELA).toContain("minuto: minutoDoDia(");
    expect(TELA).not.toContain("minuto: comPasseio.minuto + 1");
  });
});

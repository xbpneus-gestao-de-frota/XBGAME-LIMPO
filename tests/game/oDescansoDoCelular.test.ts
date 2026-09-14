/**
 * O DESCANSO DO CELULAR, E A TELA DOS PAIS.
 *
 * Ordem dele, 13/09/2026: "app salva jogo atual, aparece uma tela que vamos
 * recarregar celular e ja voltamos, deve ser periodo de 10 a 30 minutos
 * podendo ser configurado pelos pais" e "dentro de ferramentas, devemos ter a
 * tela explicando aos pais, e pode ser salva com senha dos pais e regulagem de
 * tempo".
 *
 * O que estes testes guardam e a parte que nao pode falhar sem ninguem ver: o
 * descanso que realmente para, o tempo que nao volta sozinho, e a honestidade
 * do que a tela promete ao adulto.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { bateriaDoCelular } from "@/game/xbwapp/oCelular";
import {
  DESCANSO_DE_FABRICA,
  DESCANSO_MAXIMO,
  DESCANSO_MINIMO,
  apararDescanso,
  comecarDescanso,
  definirDescanso,
  definirSenhaDosPais,
  descansoEmMinutos,
  esquecerUso,
  faltaDoDescanso,
  minutosDeUsoHoje,
  senhaDosPaisConfere,
  somarUso,
  temSenhaDosPais,
  terminarDescanso,
} from "@/game/xbwapp/oTempoDeUso";

beforeEach(() => {
  const caixa = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => caixa.get(k) ?? null,
    setItem: (k: string, v: string) => void caixa.set(k, v),
    removeItem: (k: string) => void caixa.delete(k),
    clear: () => caixa.clear(),
    key: (i: number) => [...caixa.keys()][i] ?? null,
    get length() {
      return caixa.size;
    },
  };
  esquecerUso();
});

describe("quanto dura o descanso", () => {
  it("vem de fabrica em quinze minutos", () => {
    expect(descansoEmMinutos()).toBe(DESCANSO_DE_FABRICA);
    expect(DESCANSO_MINIMO).toBe(10);
    expect(DESCANSO_MAXIMO).toBe(30);
  });

  /* Numero de fora vira numero de dentro, sem sermao e sem recusa. */
  it("nunca sai dos dez aos trinta minutos", () => {
    expect(apararDescanso(3)).toBe(DESCANSO_MINIMO);
    expect(apararDescanso(99)).toBe(DESCANSO_MAXIMO);
    expect(apararDescanso(Number.NaN)).toBe(DESCANSO_DE_FABRICA);

    definirDescanso(2);
    expect(descansoEmMinutos()).toBe(DESCANSO_MINIMO);
    definirDescanso(45);
    expect(descansoEmMinutos()).toBe(DESCANSO_MAXIMO);
    definirDescanso(20);
    expect(descansoEmMinutos()).toBe(20);
  });
});

describe("o descanso em pe", () => {
  it("sem descanso, nao falta nada", () => {
    expect(faltaDoDescanso()).toBe(0);
  });

  it("comecou: falta o tempo escolhido", () => {
    definirDescanso(10);
    const agora = 1_000_000;
    comecarDescanso(agora);
    expect(faltaDoDescanso(agora)).toBe(600);
    expect(faltaDoDescanso(agora + 599_000)).toBe(1);
    expect(faltaDoDescanso(agora + 600_000)).toBe(0);
  });

  /*
   * Adiantar o relogio da maquina nao pode virar atalho: um fim guardado
   * alem do maior descanso possivel so pode ter vindo de hora mexida.
   */
  it("relogio mexido cobra o descanso de novo", () => {
    definirDescanso(10);
    comecarDescanso(5_000_000);
    /* A pessoa "volta no tempo": o fim guardado fica longe demais. */
    expect(faltaDoDescanso(1_000)).toBe(600);
  });

  it("no fim, o celular volta carregado e o dia zera", () => {
    somarUso(3600);
    expect(minutosDeUsoHoje()).toBeCloseTo(60, 5);
    comecarDescanso();
    terminarDescanso();
    expect(faltaDoDescanso()).toBe(0);
    expect(minutosDeUsoHoje()).toBe(0);
    expect(bateriaDoCelular(minutosDeUsoHoje())).toBe(100);
  });
});

describe("a senha dos pais", () => {
  it("sem senha posta, a tela abre para quem chegar", () => {
    expect(temSenhaDosPais()).toBe(false);
    expect(senhaDosPaisConfere("")).toBe(true);
  });

  it("com senha posta, so a certa entra", () => {
    definirSenhaDosPais("laranja");
    expect(temSenhaDosPais()).toBe(true);
    expect(senhaDosPaisConfere("laranja")).toBe(true);
    expect(senhaDosPaisConfere("Laranja")).toBe(false);
    expect(senhaDosPaisConfere("")).toBe(false);
  });

  /* A palavra digitada nao pode ficar escrita por ai. */
  it("guarda um resumo, e nao a palavra", () => {
    definirSenhaDosPais("laranja");
    const guardado = localStorage.getItem("xbw.senhaDosPais");
    expect(guardado).not.toBe("laranja");
    expect(guardado).toBeTruthy();
  });

  it("senha em branco tira a tranca", () => {
    definirSenhaDosPais("laranja");
    definirSenhaDosPais("");
    expect(temSenhaDosPais()).toBe(false);
  });
});

describe("a tela de recarga", () => {
  const TELA = readFileSync("client/src/components/TelaDeRecarga.tsx", "utf8");
  const APP = readFileSync("client/src/App.tsx", "utf8");

  /*
   * Dentro do aplicativo bastaria voltar ao mapa para continuar jogando com a
   * bateria morta — e o limite deixaria de ser limite.
   */
  it("cobre o jogo inteiro, e nao so o aplicativo", () => {
    expect(APP).toContain("<TelaDeRecarga />");
    expect(TELA).toContain('className="recarga"');
  });

  it("manda gravar o jogo antes de parar", () => {
    expect(TELA).toContain("ponte().salvarTudo()");
    expect(TELA).toContain("comecarDescanso()");
  });

  /* Botao de pular transformaria o descanso em aviso, e aviso nao descansa. */
  it("nao tem saida, nem pular", () => {
    /* Nenhum botao na tela inteira: nada para clicar e sair antes da hora. */
    expect(TELA).not.toContain("<button");
    expect(TELA).not.toContain("onClick");
  });

  it("diz o que ele mandou dizer", () => {
    expect(TELA).toContain("Vamos recarregar o celular");
    expect(TELA).toContain("Já voltamos.");
  });
});

describe("a tela para os pais", () => {
  const PAIS = readFileSync(
    "client/src/components/xbwapp/TelaParaOsPais.tsx",
    "utf8"
  );
  const FERRAMENTAS = readFileSync(
    "client/src/components/xbwapp/TelaFerramentas.tsx",
    "utf8"
  );

  it("mora dentro de Ferramentas, a vista", () => {
    expect(FERRAMENTAS).toContain('titulo="Para os pais"');
    expect(FERRAMENTAS).toContain('aoAbrir("pais")');
  });

  it("explica antes de oferecer botao", () => {
    const texto = PAIS.indexOf("xbw-pais__texto");
    const ajustes = PAIS.indexOf("xbw-pais__ajustes");
    expect(texto).toBeGreaterThan(-1);
    expect(ajustes).toBeGreaterThan(texto);
  });

  it("regula os dois tempos", () => {
    expect(PAIS).toContain("definirTetoDeUso");
    expect(PAIS).toContain("definirDescanso");
    expect(PAIS).toContain("definirSenhaDosPais");
  });

  /*
   * A regra da casa: o app nunca promete proteção que nao tem. Esta senha e
   * uma tranca de criança, e a tela precisa dizer isso ao adulto.
   */
  it("nao promete segurança que nao tem", () => {
    expect(PAIS).toContain("tranca de");
    expect(PAIS).toContain("não segurança");
    expect(PAIS).not.toMatch(/criptograf/i);
  });
});

/**
 * O CELULAR POR FORA.
 *
 * Ordem dele, 13/09/2026: "icones de um celular de verdade, bateria, 9G, nivel
 * de sinal, horas real do game, com data real".
 *
 * O que estes testes guardam nao e o desenho — e a honestidade da barra: a
 * hora tem de ser a do jogo, a data tem de ser a de verdade, e a bateria tem
 * de descer com o dia sem nunca apagar o aparelho.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  bateriaAcabou,
  bateriaDoCelular,
  dataDoCelular,
  horaDoCelular,
  sinalDoCelular,
  TETO_DE_USO_EM_MINUTOS,
} from "@/game/xbwapp/oCelular";
import {
  definirTetoDeUso,
  esquecerUso,
  minutosDeUsoHoje,
  somarUso,
  tetoDeUso,
} from "@/game/xbwapp/oTempoDeUso";

describe("a hora do celular", () => {
  it("mostra o relogio do jogo com dois digitos", () => {
    expect(horaDoCelular(6 * 60)).toBe("06:00");
    expect(horaDoCelular(9 * 60 + 5)).toBe("09:05");
    expect(horaDoCelular(23 * 60 + 59)).toBe("23:59");
  });

  it("vira o dia sem quebrar", () => {
    expect(horaDoCelular(0)).toBe("00:00");
    expect(horaDoCelular(1440)).toBe("00:00");
    expect(horaDoCelular(1500)).toBe("01:00");
    expect(horaDoCelular(-60)).toBe("23:00");
  });
});

describe("a data do celular", () => {
  it("e a de verdade, curta, com o dia da semana", () => {
    expect(dataDoCelular(new Date(2026, 8, 13))).toBe("dom, 13/09");
    expect(dataDoCelular(new Date(2026, 0, 1))).toBe("qui, 01/01");
  });
});

/**
 * A BATERIA MEDE TEMPO DE TELA, E NAO A HORA DO JOGO.
 *
 * Ordem dele, 13/09/2026: "bateria de celular deve ser real (...) no maximo 2
 * horas de uso direto (...) se nao bateria deve acabar em duas horas de uso
 * constante".
 */
describe("a bateria", () => {
  it("comeca cheia e zera no teto", () => {
    expect(bateriaDoCelular(0)).toBe(100);
    expect(bateriaDoCelular(60)).toBe(50);
    expect(bateriaDoCelular(120)).toBe(0);
    expect(bateriaAcabou(120)).toBe(true);
  });

  it("duas horas e o teto de fabrica", () => {
    expect(TETO_DE_USO_EM_MINUTOS).toBe(120);
  });

  it("quem responde pela crianca pode apertar o teto", () => {
    expect(bateriaDoCelular(30, 60)).toBe(50);
    expect(bateriaDoCelular(60, 60)).toBe(0);
    expect(bateriaAcabou(45, 30)).toBe(true);
  });

  /*
   * Diante de um numero sem sentido gravado no ajuste, o lado seguro e o que
   * protege quem joga: sem tempo, e nao tempo infinito.
   */
  it("teto quebrado vale como sem tempo", () => {
    expect(bateriaDoCelular(0, 0)).toBe(0);
    expect(bateriaDoCelular(0, -10)).toBe(0);
    expect(bateriaDoCelular(0, Number.NaN)).toBe(0);
  });

  it("nunca passa de cheia nem cai abaixo de vazia", () => {
    expect(bateriaDoCelular(-5)).toBe(100);
    expect(bateriaDoCelular(9999)).toBe(0);
  });
});

/**
 * O CONTADOR DE TEMPO DE TELA.
 *
 * O que ele guarda e o total do DIA, com a data junto — um limite que zera ao
 * fechar e abrir de novo nao limitaria nada.
 */
describe("o tempo de jogo do dia", () => {
  /*
   * Os testes rodam sem navegador, e o contador guarda o total na maquina de
   * quem joga. Uma caixa de brinquedo aqui resolve: mesmo contrato, na memoria.
   */
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

  it("comeca zerado e soma o que passou", () => {
    expect(minutosDeUsoHoje()).toBe(0);
    somarUso(60);
    expect(minutosDeUsoHoje()).toBeCloseTo(1, 5);
    somarUso(30);
    expect(minutosDeUsoHoje()).toBeCloseTo(1.5, 5);
  });

  it("nao soma pedaco negativo nem sem sentido", () => {
    somarUso(-10);
    somarUso(Number.NaN);
    expect(minutosDeUsoHoje()).toBe(0);
  });

  it("vira o dia e o dia comeca do zero", () => {
    const hoje = new Date(2026, 8, 13, 20, 0, 0);
    const amanha = new Date(2026, 8, 14, 8, 0, 0);
    somarUso(600, hoje);
    expect(minutosDeUsoHoje(hoje)).toBeCloseTo(10, 5);
    expect(minutosDeUsoHoje(amanha)).toBe(0);
  });

  it("o teto sai de fabrica em duas horas e pode ser apertado", () => {
    expect(tetoDeUso()).toBe(TETO_DE_USO_EM_MINUTOS);
    definirTetoDeUso(45);
    expect(tetoDeUso()).toBe(45);
  });
});

describe("o sinal", () => {
  it("e cheio no horario de trabalho e cai de madrugada", () => {
    expect(sinalDoCelular(9 * 60)).toBe(4);
    expect(sinalDoCelular(18 * 60)).toBe(4);
    expect(sinalDoCelular(23 * 60)).toBe(3);
    expect(sinalDoCelular(2 * 60)).toBe(2);
  });
});

/**
 * A BARRA NA TELA.
 *
 * Guarda o lugar dela — a linha de baixo da faixa — e que ela le a hora pela
 * mesma ponte do resto do aplicativo, em vez de arranjar um relogio proprio.
 */
describe("a barra na faixa de cima", () => {
  const BARRA = readFileSync(
    "client/src/components/xbwapp/BarraDoCelular.tsx",
    "utf8"
  );
  const APP = readFileSync(
    "client/src/components/xbwapp/XBWApp.tsx",
    "utf8"
  );
  const FOLHA = readFileSync("client/src/styles/xbwapp.css", "utf8");

  it("mora na faixa de cima, junto do nome, da moeda e do selo", () => {
    const canto = APP.slice(APP.indexOf('className="xbw__canto"'));
    expect(canto.slice(0, canto.indexOf("</div>"))).toContain(
      "<BarraDoCelular />"
    );
  });

  it("ocupa a linha inteira debaixo, e nao o buraco do meio", () => {
    const status = FOLHA.slice(FOLHA.indexOf(".xbw__status {"));
    expect(status).toContain("flex: 0 0 100%");
    expect(status).toContain("order: 2");
    expect(FOLHA).toContain("flex-wrap: wrap");
  });

  it("le a hora pela ponte do jogo, e nao por um relogio proprio", () => {
    expect(BARRA).toContain("ponte().minutoDoDia()");
  });

  /*
   * Aba escondida nao gasta bateria: quem deixa a janela aberta durante o
   * almoco nao pode voltar com o celular morto sem ter jogado nada.
   */
  it("so gasta bateria com o jogo na frente", () => {
    expect(BARRA).toContain("visibilityState");
    expect(BARRA).toContain("somarUso");
    expect(BARRA).toContain("tetoDeUso()");
  });

  it("mostra as cinco coisas que ele pediu", () => {
    expect(BARRA).toContain("horaDoCelular");
    expect(BARRA).toContain("dataDoCelular");
    expect(BARRA).toContain("sinalDoCelular");
    expect(BARRA).toContain("bateriaDoCelular");
    expect(BARRA).toContain("9G");
  });
});

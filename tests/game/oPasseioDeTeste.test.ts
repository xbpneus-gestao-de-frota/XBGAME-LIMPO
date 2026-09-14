/**
 * O PASSEIO DE TESTE.
 *
 * Ordem dele, 11/09/2026: "precisamos testar por enquanto apenas usuarios
 * pedalando por todo o mapa". O que estes testes guardam: que o passeio leva
 * os dois por TODAS as portas do bairro, que cada porta existe no desenho,
 * que os dois nao viram comboio, e que o balcao fica quieto enquanto isso.
 */
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { calcularFrete } from "@/game/freight";
import {
  kmDaCorrida,
  kmDaEntrega,
  prazoEmMinutos,
} from "@/game/xbwapp/distancias";
import { acoplar, soltarAPonte } from "@/game/xbwapp/ponte";
import { estadoInicial } from "@/game/xbwapp/estado";
import { passarUmSegundo, rotaDe } from "@/game/xbwapp/entregaRapida";
import { BASE_DO_ENTREGADOR, novoEmRota } from "@/game/xbwapp/aRota";
import { enderecoDe } from "@/game/xbwapp/distancias";
import {
  PASSEIO_DE_TESTE,
  PORTAS_POR_VEZ,
  paradasDoPasseio,
  passearPeloBairro,
} from "@/game/xbwapp/passeioDeTeste";
import { LOJAS, MORADORES } from "@/game/xbwapp/contatos";
import type { EstadoDoApp } from "@/game/xbwapp/estado";

const JOGO = readFileSync("client/src/components/GameCanvas.tsx", "utf8");

const OS_DOIS = ["Renan", "Lorena"];

function oBairroDeVerdade() {
  acoplar({
    kmDaCorrida,
    kmDaEntrega,
    prazoEmMinutos,
    freteDaCorrida: (km, volumes) => calcularFrete("bicicleta", km, volumes),
  });
}

/** Um estado com os dois na rua, parados na base. */
function comOsDois(): EstadoDoApp {
  const base = estadoInicial();
  return {
    ...base,
    rotas: {
      ...base.rotas,
      Renan: novoEmRota("Renan"),
      Lorena: novoEmRota("Lorena"),
    },
  };
}

/*
 * A BANCADA LIGA O PASSEIO POR FORA.
 *
 * A chave de cima esta DESLIGADA desde 13/09/2026 — o jogo voltou ao balcao. A
 * prova continua ligando o passeio na mao, senao a peca ficaria no arquivo sem
 * ninguem conferindo se ainda funciona no dia em que ele mandar religar.
 */
const LIGADO = true;

describe("o passeio de teste", () => {
  beforeEach(() => {
    soltarAPonte();
    oBairroDeVerdade();
  });

  it("e um interruptor, e o jogo chama o passeio a cada segundo", () => {
    expect(typeof PASSEIO_DE_TESTE).toBe("boolean");
    expect(JOGO).toContain("passearPeloBairro(comBalcao");
  });

  it("toda porta do passeio existe no desenho do bairro", () => {
    const paradas = paradasDoPasseio(BASE_DO_ENTREGADOR, false, 50);
    expect(paradas.length).toBeGreaterThan(0);
    for (const p of paradas) expect(enderecoDe(p.lugar)).toBeDefined();
  });

  it("da seis portas de cada vez, para o mapa nao encher de pino", () => {
    const paradas = paradasDoPasseio(BASE_DO_ENTREGADOR);
    expect(paradas).toHaveLength(PORTAS_POR_VEZ);
    // uma coleta, uma entrega: as duas cenas paradas entram no teste
    expect(paradas.filter(p => p.o === "coleta").length).toBeGreaterThan(0);
    expect(paradas.filter(p => p.o === "entrega").length).toBeGreaterThan(0);
  });

  it("quem esta sem rota ganha portas; os dois nao viram comboio", () => {
    const e = passearPeloBairro(comOsDois(), OS_DOIS, LIGADO);
    const renan = rotaDe(e, "Renan");
    const lorena = rotaDe(e, "Lorena");
    expect(renan.paradas).toHaveLength(PORTAS_POR_VEZ);
    expect(lorena.paradas).toHaveLength(PORTAS_POR_VEZ);
    expect(renan.paradas[0]!.lugar).not.toBe(lorena.paradas[0]!.lugar);
  });

  it("com a chave desligada, o passeio nao encosta em nada", () => {
    /*
     * E o estado de hoje: o jogo de verdade e o balcao. Se um dia esta linha
     * quebrar, e porque o bairro voltou a passear sozinho sem ninguem pedir.
     */
    const antes = comOsDois();
    expect(passearPeloBairro(antes, OS_DOIS, false)).toBe(antes);
    expect(PASSEIO_DE_TESTE).toBe(false);
  });

  it("quem ja tem rota nao e mexido", () => {
    const antes = comOsDois();
    const comRota: EstadoDoApp = {
      ...antes,
      rotas: {
        ...antes.rotas,
        Renan: {
          ...novoEmRota("Renan"),
          paradas: [{ pedido: "#1001", o: "coleta", lugar: "padaria" }],
        },
      },
    };
    const e = passearPeloBairro(comRota, OS_DOIS, LIGADO);
    expect(rotaDe(e, "Renan").paradas).toHaveLength(1);
    expect(rotaDe(e, "Renan").paradas[0]!.pedido).toBe("#1001");
  });

  it("o balcao fica quieto: nenhum pedido sobra para estourar", () => {
    let e = comOsDois();
    for (let i = 0; i < 120; i += 1)
      e = passearPeloBairro(passarUmSegundo(e), OS_DOIS, LIGADO);
    expect(e.ofertas).toHaveLength(0);
  });

  it(
    "andando bastante, ele passa por TODAS as portas do bairro",
    { timeout: 30000 },
    () => {
      let e = comOsDois();
      const passou = new Set<string>();
      for (let i = 0; i < 1500; i += 1) {
        e = passearPeloBairro(passarUmSegundo(e), OS_DOIS, LIGADO);
        passou.add(rotaDe(e, "Renan").em);
      }
      const portas = [...LOJAS, ...MORADORES]
        .map(c => c.id)
        .filter(id => enderecoDe(id));
      for (const porta of portas) expect([...passou]).toContain(porta);
    }
  );

  it(
    "o passeio nunca acaba: a rota se enche de novo sozinha",
    { timeout: 30000 },
    () => {
      let e = comOsDois();
      for (let i = 0; i < 1500; i += 1)
        e = passearPeloBairro(passarUmSegundo(e), OS_DOIS, LIGADO);
      expect(rotaDe(e, "Renan").paradas.length).toBeGreaterThan(0);
      expect(rotaDe(e, "Lorena").paradas.length).toBeGreaterThan(0);
    }
  );
});

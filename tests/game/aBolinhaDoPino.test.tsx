/**
 * A BOLINHA DO PINO MUDA DE COR CONFORME O ATRASO.
 *
 * Ordem dele, 12/09/2026: "precisamos colocar bolinhas de pinos para mudarem de
 * cor conforme atraso de entrega".
 *
 * A escada de cores JA EXISTIA e ja funcionava no cartao do pedido, dentro do
 * aplicativo. O que nao existia era a ligacao com o mapa: `pinosDaRota` montava
 * o pino sem degrau nenhum, e a tela caia no padrao — todo pino nascia azul de
 * "no prazo" e morria azul, com o relogio correndo do lado.
 *
 * Estes testes seguram a ligacao inteira, dos dois lados:
 *
 *   · O NUMERO DO PEDIDO ACHA O DEGRAU. O mapa so tem o numero ("#1002"); e por
 *     ele que a cor e encontrada.
 *   · O PINO CARREGA O DEGRAU. Se `pinosDaRota` voltar a montar pino sem
 *     degrau, a bolinha volta a ser sempre a mesma e ninguem percebe.
 *   · TODO DEGRAU TEM COR NA FOLHA. O tipo e fechado no codigo; se alguem
 *     acrescentar um degrau e esquecer a regra de estilo, a bolinha sai sem
 *     cor. Este teste compara as duas listas.
 *   · PEDIDO RECUSADO NAO TEM RELOGIO. Porta fechada nao atrasa.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import MapaDoBairro from "@/components/MapaDoBairro";

import { estadoInicial } from "@/game/xbwapp/estado";
import type { EstadoDoApp } from "@/game/xbwapp/estado";
import { acoplar, soltarAPonte } from "@/game/xbwapp/ponte";
import {
  FAIXAS,
  faixaDoPedido,
  pedidoDeNumero,
  passarUmSegundo,
  PRIMEIRO_NUMERO,
} from "@/game/xbwapp/entregaRapida";
import { pinosDaRota } from "@/game/oPercursoNoMapa";
import { novoEmRota } from "@/game/xbwapp/aRota";

const FOLHA = readFileSync("client/src/index.css", "utf8");

function bairroDeMentira() {
  acoplar({
    kmDaCorrida: () => 1,
    kmDaEntrega: () => 1,
    freteDaCorrida: k => 7 + k * 1.5,
  });
}

/** Anda o relogio do balcao. */
function andar(estado: EstadoDoApp, segundos: number): EstadoDoApp {
  let e = estado;
  for (let i = 0; i < segundos; i += 1) e = passarUmSegundo(e);
  return e;
}

/** Um estado com UM pedido publicado agora, e nada mais. */
function comUmPedido(): { estado: EstadoDoApp; numero: string } {
  const pedido = pedidoDeNumero(PRIMEIRO_NUMERO, 0);
  return {
    estado: { ...estadoInicial(), ofertas: [pedido] },
    numero: pedido.id,
  };
}

describe("a bolinha do pino muda de cor conforme o atraso", () => {
  beforeEach(() => {
    bairroDeMentira();
    return () => soltarAPonte();
  });

  it("o numero do pedido acha o degrau, e ele desce com o relogio", () => {
    const { estado, numero } = comUmPedido();
    const prazo = estado.ofertas[0]!.prazoS;
    expect(faixaDoPedido(estado, numero)).toBe("adiantado");
    /* Meio prazo ainda e "no tempo": o atraso so comeca depois do fim. */
    expect(faixaDoPedido(andar(estado, Math.floor(prazo / 2)), numero)).toBe(
      "adiantado"
    );
    /* Passou 10% do prazo: primeiro degrau de atraso. */
    expect(faixaDoPedido(andar(estado, Math.ceil(prazo * 1.08)), numero)).toBe(
      "verde"
    );
    /* Passou 20%: amarela. */
    expect(faixaDoPedido(andar(estado, Math.ceil(prazo * 1.2)), numero)).toBe(
      "amarela"
    );
    /* Dobrou o prazo: o cliente foi embora. */
    expect(faixaDoPedido(andar(estado, Math.ceil(prazo * 2.5)), numero)).toBe(
      "perdeu"
    );
  });

  it("pedido que nao existe, ou recusado, fica sem degrau", () => {
    const { estado, numero } = comUmPedido();
    expect(faixaDoPedido(estado, "#0000")).toBeUndefined();
    const recusado: EstadoDoApp = {
      ...estado,
      ofertas: [{ ...estado.ofertas[0]!, situacao: "recusada" }],
    };
    expect(faixaDoPedido(recusado, numero)).toBeUndefined();
  });

  it("o pino carrega o degrau do pedido dele", () => {
    const { estado, numero } = comUmPedido();
    const oferta = estado.ofertas[0]!;
    const rota = {
      ...novoEmRota("Renan"),
      paradas: [
        { pedido: numero, o: "coleta" as const, lugar: oferta.coleta },
        { pedido: numero, o: "entrega" as const, lugar: oferta.entrega },
      ],
    };
    const semDegrau = pinosDaRota(rota);
    expect(semDegrau.every(p => p.bolinha === undefined)).toBe(true);

    const atrasado = andar(estado, Math.ceil(oferta.prazoS * 1.2));
    const comDegrau = pinosDaRota(rota, n => faixaDoPedido(atrasado, n));
    expect(comDegrau.length).toBe(2);
    expect(comDegrau.every(p => p.bolinha === "amarela")).toBe(true);
  });

  it("todo degrau tem cor na folha de estilo", () => {
    for (const f of FAIXAS) {
      const regra = `.mapa__pino[data-bolinha="${f.chave}"]`;
      expect(FOLHA, `sem cor para o degrau ${f.chave}`).toContain(regra);
    }
    /* O pino sem relogio (a base, ou pedido ja fechado) tambem precisa de cor. */
    expect(FOLHA).toContain('.mapa__pino[data-bolinha="sem-relogio"]');
  });

  it("nenhuma cor da folha ficou orfa de degrau", () => {
    const naFolha = new Set(
      [...FOLHA.matchAll(/\.mapa__pino\[data-bolinha="([^"]+)"\]/g)].map(
        m => m[1]!
      )
    );
    const validas = new Set<string>([
      "sem-relogio",
      ...FAIXAS.map(f => f.chave),
    ]);
    for (const c of naFolha) {
      expect(validas.has(c), `a folha pinta "${c}", que nao e degrau`).toBe(
        true
      );
    }
  });

  it("os degraus quentes pulsam: cor nao carrega o recado sozinha", () => {
    for (const chave of ["amarela", "laranja", "muito-atrasado", "perdeu"]) {
      const trecho = FOLHA.slice(
        FOLHA.indexOf(`.mapa__pino[data-bolinha="${chave}"] .mapa__bolinha`)
      ).slice(0, 400);
      expect(trecho, `o degrau ${chave} nao pulsa`).toContain("mapa-pulso");
    }
  });

  it("a bolinha tem aro, senao some dentro do pino laranja", () => {
    const bloco = FOLHA.slice(
      FOLHA.indexOf(".mapa__bolinha {"),
      FOLHA.indexOf(".mapa__bolinha {") + 1400
    );
    expect(bloco).toContain("box-shadow");
  });

  /*
   * A ULTIMA PONTE: o degrau sai do pino e vira atributo na tela. Sem isto, a
   * cor podia estar certa no calculo e errada no desenho, e nenhum teste veria.
   */
  it("o mapa leva o degrau para o atributo do pino", () => {
    const html = renderToStaticMarkup(
      <MapaDoBairro
        nomeDoJogador="Teste"
        paradas={[
          {
            papel: "coleta",
            nome: "Padaria",
            em: [40, 40],
            bolinha: "amarela",
          },
          { papel: "entrega", nome: "Casa 8", em: [60, 60] },
        ]}
        caminho={[]}
      />
    );
    expect(html).toContain('data-bolinha="amarela"');
    /* Sem degrau, o pino fica neutro — e nao num degrau qualquer. */
    expect(html).toContain('data-bolinha="sem-relogio"');
  });
});

/**
 * O PERCURSO DESENHADO NO MAPA.
 *
 * Ordem dele, 08/09/2026: "ao clicar em aceitar, apareca o icone de coleta, e
 * entrega e entregador comece percurso", saindo da pizzaria.
 *
 * O que estes testes seguram:
 *
 *   · O entregador COMECA NA PIZZARIA. Era a ordem, e e o ponto que decide se
 *     juntar duas coletas compensa — mudar isso muda o jogo inteiro.
 *   · APARECEM OS DOIS ICONES, coleta e entrega, na ordem em que ele vai
 *     passar. Um pedido aceito que nao aparece no mapa e um pedido que a
 *     pessoa nao consegue acompanhar.
 *   · O TRACADO PASSA PELAS RUAS. O frete e o prazo saem de metros medidos rua
 *     a rua; um risco reto na tela mostraria caminho mais curto do que o que
 *     foi cobrado.
 *   · O MARCADOR ANDA, e chega junto com o pedido — nao antes, nao depois.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { estadoInicial } from "@/game/xbwapp/estado";
import { acoplar, soltarAPonte } from "@/game/xbwapp/ponte";
import {
  kmDaCorrida,
  kmDaEntrega,
  prazoEmMinutos,
} from "@/game/xbwapp/distancias";
import { calcularFrete } from "@/game/freight";
import {
  aceitarOferta,
  ofertasAbertas,
  passarUmSegundo,
  rotaDe,
} from "@/game/xbwapp/entregaRapida";
import { BASE_DO_ENTREGADOR } from "@/game/xbwapp/aRota";
import { andarNoTracado, percursoNoMapa } from "@/game/oPercursoNoMapa";
import { enderecoDe } from "@/game/xbwapp/distancias";
import type { EstadoDoApp } from "@/game/xbwapp/estado";

/** O bairro de verdade, do jeito que o jogo acopla. */
function oBairroDeVerdade() {
  acoplar({
    kmDaCorrida,
    kmDaEntrega,
    prazoEmMinutos,
    freteDaCorrida: (km, volumes) => calcularFrete("bicicleta", km, volumes),
  });
}

function andar(estado: EstadoDoApp, segundos: number): EstadoDoApp {
  let e = estado;
  for (let i = 0; i < segundos; i += 1) e = passarUmSegundo(e);
  return e;
}

describe("o percurso no mapa", () => {
  beforeEach(() => {
    soltarAPonte();
    oBairroDeVerdade();
  });

  it("a pizzaria existe no desenho do bairro", () => {
    const casa = enderecoDe(BASE_DO_ENTREGADOR);
    expect(casa).toBeDefined();
    expect(casa!.nome.toLowerCase()).toContain("pizzaria");
  });

  it("sem nada aceito, nao ha percurso para desenhar", () => {
    const e = andar(estadoInicial(), 6);
    const p = percursoNoMapa(rotaDe(e, "Você"));
    expect(p.paradas).toHaveLength(0);
    expect(p.caminho).toHaveLength(0);
  });

  it("aceitar poe os dois icones no mapa, na ordem do percurso", () => {
    let e = andar(estadoInicial(), 6);
    const o = ofertasAbertas(e)[0]!;
    e = aceitarOferta(e, o.id, "Renan");
    const p = percursoNoMapa(rotaDe(e, "Renan"));

    expect(p.paradas.map(x => x.papel)).toEqual(["coleta", "entrega"]);
    expect(p.paradas[0]!.nome).toBe(enderecoDe(o.coleta)!.nome);
    expect(p.paradas[1]!.nome).toBe(enderecoDe(o.entrega)!.nome);
  });

  it("o entregador sai da pizzaria — ordem dele", () => {
    let e = andar(estadoInicial(), 6);
    const o = ofertasAbertas(e)[0]!;
    e = aceitarOferta(e, o.id, "Renan");
    const p = percursoNoMapa(rotaDe(e, "Renan"));
    const pizzaria = enderecoDe(BASE_DO_ENTREGADOR)!;
    expect(p.onde![0]).toBeCloseTo(pizzaria.em[0], 3);
    expect(p.onde![1]).toBeCloseTo(pizzaria.em[1], 3);
  });

  it("o tracado passa pelas ruas, e nao em linha reta", () => {
    let e = andar(estadoInicial(), 6);
    const o = ofertasAbertas(e)[0]!;
    e = aceitarOferta(e, o.id, "Renan");
    const p = percursoNoMapa(rotaDe(e, "Renan"));
    // Linha reta seriam dois pontos por perna. Rua tem esquina.
    expect(p.caminho.length).toBeGreaterThan(4);
  });

  /*
   * OS DOIS TESTES ABAIXO GANHAM MAIS TEMPO DE PROPOSITO.
   *
   * Eles rodam ate quinhentos segundos de jogo, e cada segundo pede rota pelas
   * ruas. Numa maquina rapida sobra tempo; numa lenta (a nossa de conferencia,
   * por exemplo) o padrao de cinco segundos estoura ANTES de a regra falhar —
   * e teste que reprova por causa do computador nao diz nada sobre o jogo.
   *
   * O que eles verificam nao mudou uma linha: so o relogio da paciencia.
   */
  const PACIENCIA_MS = 30_000;

  it("o marcador anda, e chega junto com o pedido", () => {
    let e = andar(estadoInicial(), 6);
    const o = ofertasAbertas(e)[0]!;
    e = aceitarOferta(e, o.id, "Renan");
    const comeco = percursoNoMapa(rotaDe(e, "Renan")).onde!;

    e = andar(e, 3);
    const depois = percursoNoMapa(rotaDe(e, "Renan")).onde!;
    expect(Math.hypot(depois[0] - comeco[0], depois[1] - comeco[1])).toBeGreaterThan(0);

    // Anda ate a entrega fechar; nesse instante nao sobra parada nenhuma.
    let voltas = 0;
    while (
      e.ofertas.find(x => x.id === o.id)!.situacao !== "entregue" &&
      voltas < 500
    ) {
      e = passarUmSegundo(e);
      voltas += 1;
    }
    expect(rotaDe(e, "Renan").paradas).toHaveLength(0);
    expect(rotaDe(e, "Renan").em).toBe(o.entrega);
  }, PACIENCIA_MS);

  it("passar a coleta tira o icone de coleta do mapa", () => {
    let e = andar(estadoInicial(), 6);
    const o = ofertasAbertas(e)[0]!;
    e = aceitarOferta(e, o.id, "Renan");

    /*
     * A varredura anda pela ROTA, que e barata, e so monta o desenho quando
     * sobra uma parada — montar o tracado a cada segundo custa uma busca de
     * ruas por segundo, e o teste passaria a medir a paciencia do computador
     * em vez da regra.
     */
    let voltas = 0;
    while (rotaDe(e, "Renan").paradas.length > 1 && voltas < 500) {
      e = passarUmSegundo(e);
      voltas += 1;
    }
    expect(rotaDe(e, "Renan").paradas).toHaveLength(1);
    const p = percursoNoMapa(rotaDe(e, "Renan"));
    expect(p.paradas.map(x => x.papel)).toEqual(["entrega"]);
    expect(e.ofertas.find(x => x.id === o.id)!.situacao).toBe("rodando");
  }, PACIENCIA_MS);

  it("andar no tracado devolve as duas pontas e o meio", () => {
    const t = [
      [0, 0],
      [10, 0],
    ] as const;
    expect(andarNoTracado(t, 0)).toEqual([0, 0]);
    expect(andarNoTracado(t, 0.5)).toEqual([5, 0]);
    expect(andarNoTracado(t, 1)).toEqual([10, 0]);
    expect(andarNoTracado([], 0.5)).toBeUndefined();
  });
});

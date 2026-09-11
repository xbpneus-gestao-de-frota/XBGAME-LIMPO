/**
 * O RENAN E O ENTREGADOR DO MAPA — um so, com o relogio do balcao.
 *
 * Ordem dele, 10/09/2026: "retire a bola azul do game, a bola azul deve ser
 * Renan coletando e entregando, e retire tambem as lupas" — e, antes: "cada
 * coleta, Renan deve parar na frente do estabelecimento como mapeado, entrar
 * a animacao de coleta quando for coleta e entrega quando for entrega".
 *
 * O que estes testes seguram:
 *
 *   · SEM PEDIDO, ELE ESPERA NA PIZZARIA — em pe com a bicicleta, sem parada
 *     nenhuma pela frente.
 *   · ELE DESCE NA COLETA pelo tempo de parada do balcao, e exatamente no
 *     metro onde a rua encosta no lugar que o Fernando marcou. Nem antes, nem
 *     depois, nem andando para tras.
 *   · DEPOIS DA COLETA, A DESCIDA E A ENTREGA — e o desenho certo e o de
 *     entrega.
 *   · O TRACADO NAO MUDA ENQUANTO A PERNA NAO MUDA. Se mudasse a cada segundo,
 *     o menino voltaria ao comeco do caminho uma vez por segundo.
 *   · A BOLA AZUL E AS LUPAS SAIRAM DA TELA, mas ficaram guardadas atras de
 *     chave — regra da casa: o que ele tira fica desligado, nao apagado.
 *   · NA HISTORIA NAO HA RENAN DE BICICLETA. O Renan da abertura e o menino
 *     sem uniforme ao lado da fonte.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { estadoInicial } from "@/game/xbwapp/estado";
import { acoplar, soltarAPonte } from "@/game/xbwapp/ponte";
import {
  enderecoDe,
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
import { BASE_DO_ENTREGADOR, PARADA_S } from "@/game/xbwapp/aRota";
import {
  esperaNoMapa,
  pinosDaRota,
  planoPara,
  progressoNoPlano,
  progressoNoTracado,
  tracadoDoPercurso,
} from "@/game/oPercursoNoMapa";
import { rota } from "@/game/rotas";
import type { EstadoDoApp } from "@/game/xbwapp/estado";

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

function fonte(caminho: string): string {
  return readFileSync(resolve(caminho), "utf8");
}

/** Eles rodam centenas de segundos de jogo; maquina lenta nao reprova regra. */
const PACIENCIA_MS = 30_000;

describe("o Renan no mapa", () => {
  beforeEach(() => {
    soltarAPonte();
    oBairroDeVerdade();
  });

  it("sem pedido, ele espera na porta da pizzaria", () => {
    const r = rotaDe(andar(estadoInicial(), 6), "Renan");
    expect(r.paradas).toHaveLength(0);
    const t = esperaNoMapa(r);
    expect(t.paradasDaEntrega).toHaveLength(0);
    expect(t.paradas).toHaveLength(0);
    // Dois pontos no minimo: e deles que sai para que lado ele esta virado.
    expect(t.caminho.length).toBeGreaterThan(1);
    const pizzaria = enderecoDe(BASE_DO_ENTREGADOR)!;
    const primeiro = t.caminho[0]!;
    expect(
      Math.hypot(primeiro[0] - pizzaria.em[0], primeiro[1] - pizzaria.em[1])
    ).toBeLessThan(2);
    // Parado: o balcao nao manda ele andar.
    const p = progressoNoTracado(r, t);
    expect(p.metros).toBe(0);
    expect(p.naPorta).toBeNull();
  });

  it(
    "desce na coleta pelo tempo de parada do balcao, no metro marcado",
    () => {
      let e = andar(estadoInicial(), 6);
      const o = ofertasAbertas(e)[0]!;
      e = aceitarOferta(e, o.id, "Renan");
      const tracado = tracadoDoPercurso(rotaDe(e, "Renan"));
      expect(tracado.paradasDaEntrega.map(p => p.papel)).toEqual([
        "coleta",
        "entrega",
      ]);
      const coleta = tracado.paradasDaEntrega[0]!;

      let antes = -1;
      let segundosNaPorta = 0;
      let voltas = 0;
      while (
        rotaDe(e, "Renan").em === BASE_DO_ENTREGADOR &&
        rotaDe(e, "Renan").paradas.length === 2 &&
        voltas < 500
      ) {
        const p = progressoNoTracado(rotaDe(e, "Renan"), tracado);
        // Nunca anda para tras, nunca passa do ponto da coleta.
        expect(p.metros).toBeGreaterThanOrEqual(antes);
        expect(p.metros).toBeLessThanOrEqual(coleta.ate + 1e-9);
        antes = p.metros;
        if (p.naPorta) {
          segundosNaPorta += 1;
          expect(p.naPorta.papel).toBe("coleta");
          // Descido EXATAMENTE onde a bicicleta fica.
          expect(p.metros).toBeCloseTo(coleta.ate, 6);
        }
        e = passarUmSegundo(e);
        voltas += 1;
      }
      expect(segundosNaPorta).toBe(PARADA_S);
      expect(rotaDe(e, "Renan").em).toBe(o.coleta);
    },
    PACIENCIA_MS
  );

  it(
    "o tracado da perna e o mesmo do comeco ao fim dela",
    () => {
      let e = andar(estadoInicial(), 6);
      const o = ofertasAbertas(e)[0]!;
      e = aceitarOferta(e, o.id, "Renan");
      const comeco = tracadoDoPercurso(rotaDe(e, "Renan"));
      e = andar(e, 3);
      expect(rotaDe(e, "Renan").paradas).toHaveLength(2);
      expect(tracadoDoPercurso(rotaDe(e, "Renan"))).toEqual(comeco);
    },
    PACIENCIA_MS
  );

  it(
    "depois da coleta, a proxima descida e a entrega",
    () => {
      let e = andar(estadoInicial(), 6);
      const o = ofertasAbertas(e)[0]!;
      e = aceitarOferta(e, o.id, "Renan");
      let voltas = 0;
      while (rotaDe(e, "Renan").paradas.length > 1 && voltas < 500) {
        e = passarUmSegundo(e);
        voltas += 1;
      }
      const tracado = tracadoDoPercurso(rotaDe(e, "Renan"));
      expect(tracado.paradasDaEntrega.map(p => p.papel)).toEqual(["entrega"]);
      let desceu = null as ReturnType<typeof progressoNoTracado>["naPorta"];
      voltas = 0;
      while (!desceu && voltas < 500) {
        desceu = progressoNoTracado(rotaDe(e, "Renan"), tracado).naPorta;
        e = passarUmSegundo(e);
        voltas += 1;
      }
      expect(desceu?.papel).toBe("entrega");
      expect(desceu?.nome).toBe(enderecoDe(o.entrega)!.nome);
    },
    PACIENCIA_MS
  );

  it(
    "a corrida inteira usa UM caminho so, do aceite ate a ultima porta",
    () => {
      /*
       * Medido no jogo montado em 10/09/2026: refazer o caminho a cada porta
       * parava o jogo um quarto de segundo e deixava o Renan sumido nesse
       * tempo. O plano e feito no aceite e so muda com pedido novo na fila.
       */
      let e = andar(estadoInicial(), 6);
      const o = ofertasAbertas(e)[0]!;
      e = aceitarOferta(e, o.id, "Renan");
      const plano = planoPara(rotaDe(e, "Renan"), null)!;
      expect(plano).not.toBeNull();
      let voltas = 0;
      let antes = -1;
      let descidas = 0;
      let naPortaAntes = false;
      while (voltas < 600) {
        const r = rotaDe(e, "Renan");
        // o mesmo plano, objeto por objeto: nada foi refeito
        expect(planoPara(r, plano)).toBe(plano);
        const p = progressoNoPlano(r, plano)!;
        expect(p).not.toBeNull();
        // anda sempre para a frente, pela corrida inteira, e nunca passa do
        // fim da perna em que esta
        expect(p.metros).toBeGreaterThanOrEqual(antes - 1e-9);
        expect(p.metros).toBeLessThanOrEqual(p.ate + 1e-9);
        antes = p.metros;
        if (p.naPorta && !naPortaAntes) descidas += 1;
        naPortaAntes = p.naPorta !== null;
        if (p.parado) break;
        e = passarUmSegundo(e);
        voltas += 1;
      }
      // desceu na coleta e na entrega, e terminou parado na ultima porta
      expect(descidas).toBe(2);
      const fim = progressoNoPlano(rotaDe(e, "Renan"), plano)!;
      expect(fim.parado).toBe(true);
      expect(fim.metros).toBeCloseTo(
        plano.paradasDaEntrega[plano.paradasDaEntrega.length - 1]!.ate,
        6
      );
      // os pinos so mostram o que falta
      expect(pinosDaRota(rotaDe(e, "Renan"))).toHaveLength(0);
    },
    PACIENCIA_MS
  );

  it("pedido novo na fila refaz o plano; so passar de porta, nao", () => {
    let e = andar(estadoInicial(), 6);
    const [a, b] = ofertasAbertas(e);
    e = aceitarOferta(e, a!.id, "Renan");
    const plano = planoPara(rotaDe(e, "Renan"), null)!;
    e = aceitarOferta(e, b!.id, "Renan");
    const outro = planoPara(rotaDe(e, "Renan"), plano);
    expect(outro).not.toBe(plano);
    expect(outro!.paradasDoPlano).toHaveLength(4);
  });

  it("o caminho pelas ruas e feito uma vez so, e cada um recebe a sua copia", () => {
    /*
     * O balcao perguntava a mesma distancia a cada segundo e cada pergunta
     * refazia o caminho inteiro — o engasgo de um quinto de segundo por
     * segundo medido em 10/09/2026.
     */
    const de: readonly [number, number] = [30, 40];
    const para: readonly [number, number] = [60, 70];
    const um = rota(de, para);
    const dois = rota(de, para);
    expect(dois).toEqual(um);
    expect(dois).not.toBe(um);
  });

  it("a bola azul e as lupas sairam da tela, guardadas atras de chave", () => {
    const mapa = fonte("client/src/components/MapaDoBairro.tsx");
    expect(mapa).toContain("const BOLA_AZUL = false;");
    expect(mapa).toContain("const LUPAS_VISIVEIS = false;");
    expect(mapa).toContain("{BOLA_AZUL && entregadorEm && (");
    expect(mapa).toContain("{LUPAS_VISIVEIS && (");
    // O desenho do Renan recebe a ordem do balcao.
    expect(mapa).toContain("comando={comandoDoEntregador}");
  });

  it("na historia nao ha Renan de bicicleta no mapa", () => {
    const jogo = fonte("client/src/components/GameCanvas.tsx");
    expect(jogo).toContain("caminho={pracaLimpa ? tracado.caminho : []}");
    expect(jogo).toContain("comandoDoEntregador={comandoDoEntregador}");
  });
});

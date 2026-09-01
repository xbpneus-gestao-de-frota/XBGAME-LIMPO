/**
 * Guarda da regra da entrega. Ela e pura de proposito: a escolha do comercio e
 * da casa tem de poder ser conferida sem cena, sem GPU e sem sorte.
 *
 * As distancias abaixo sao as reais, medidas no circuito vestido: Mercado no
 * metro 71, Base no 341, Hospital no 566 e Pizzaria no 786 de uma volta de
 * 799,2 m — em unidades do jogo, tudo isso vezes 2,3.
 */
import { describe, expect, it } from "vitest";
import type { LugarNaVolta } from "../../client/src/game/CircuitTrack";
import {
  MAXIMO_ATE_A_ENTREGA,
  MINIMO_ATE_A_ENTREGA,
  distanciaAdiante,
  etapaEm,
  montarRota,
} from "../../client/src/game/deliveryRoute";

const ESCALA = 2.3;
const VOLTA = 799.2 * ESCALA;

const lugar = (
  nome: string,
  papel: LugarNaVolta["papel"],
  metros: number,
  lado: 1 | -1 = -1
): LugarNaVolta => ({
  chave: nome,
  nome,
  papel,
  distancia: metros * ESCALA,
  lado,
  local: { x: 0, z: 0 },
});

const BAIRRO: LugarNaVolta[] = [
  lugar("Mercado XB", "comercio", 71),
  lugar("Base XB", "base", 341),
  lugar("Hospital", "comercio", 566),
  lugar("Pizzaria", "comercio", 786),
  // 61 casas espalhadas, uma a cada ~13 m, como no mapa de verdade.
  ...Array.from({ length: 61 }, (_, i) =>
    lugar(`Residencia ${i + 1}`, "casa", 8.5 + i * 12.7, i % 2 === 0 ? 1 : -1)
  ),
];

describe("a entrega em cima do circuito", () => {
  it("mede a distancia sempre para a frente, dando a volta quando precisa", () => {
    expect(distanciaAdiante(10, 90, 100)).toBe(80);
    // De 90 para 10 nao volta 80 para tras: anda 20 para a frente e fecha a
    // volta. Sem isto, uma entrega logo depois da linha viraria numero negativo.
    expect(distanciaAdiante(90, 10, 100)).toBe(20);
    expect(distanciaAdiante(50, 50, 100)).toBe(0);
  });

  it("sai da base, coleta num comercio e entrega numa residencia", () => {
    const rota = montarRota(BAIRRO, VOLTA, () => 0.5);
    expect(rota).not.toBeNull();
    expect(rota!.origem.papel).toBe("base");
    expect(rota!.coleta.papel).toBe("comercio");
    expect(rota!.entrega.papel).toBe("casa");
  });

  it("nunca entrega colado no comercio nem do outro lado do mundo", () => {
    // Varre o sorteio inteiro em vez de confiar num valor: a regra tem de
    // valer para toda escolha possivel, nao para a que eu escolhi testar.
    for (let i = 0; i < 200; i += 1) {
      const passo = i / 200;
      const rota = montarRota(BAIRRO, VOLTA, () => passo);
      expect(rota).not.toBeNull();
      expect(rota!.ateEntrega).toBeGreaterThanOrEqual(MINIMO_ATE_A_ENTREGA);
      expect(rota!.ateEntrega).toBeLessThanOrEqual(MAXIMO_ATE_A_ENTREGA);
    }
  });

  it("usa os tres comercios, e nao sempre o mesmo", () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 60; i += 1) {
      const rota = montarRota(BAIRRO, VOLTA, () => i / 60);
      if (rota) vistos.add(rota.coleta.nome);
    }
    expect(vistos.size).toBe(3);
    expect(vistos.has("Base XB")).toBe(false);
  });

  it("diz em que etapa o jogador esta", () => {
    const rota = montarRota(BAIRRO, VOLTA, () => 0.2)!;
    expect(etapaEm(rota, 0)).toBe("indo-coletar");
    expect(etapaEm(rota, rota.ateColeta - 1)).toBe("indo-coletar");
    expect(etapaEm(rota, rota.ateColeta)).toBe("indo-entregar");
    expect(etapaEm(rota, rota.total - 1)).toBe("indo-entregar");
    expect(etapaEm(rota, rota.total)).toBe("entregue");
  });

  it("devolve nada quando falta base, comercio ou casa", () => {
    expect(montarRota([], VOLTA, () => 0.5)).toBeNull();
    const semCasa = BAIRRO.filter(l => l.papel !== "casa");
    expect(montarRota(semCasa, VOLTA, () => 0.5)).toBeNull();
    const semBase = BAIRRO.filter(l => l.papel !== "base");
    expect(montarRota(semBase, VOLTA, () => 0.5)).toBeNull();
  });
});

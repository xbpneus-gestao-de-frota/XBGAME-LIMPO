/**
 * Guarda da economia da transportadora.
 *
 * Aqui e o lugar onde um erro custa caro e nao aparece: uma conta de frete
 * torta nao quebra a tela, nao gera erro no console e nao trava o jogo — ela
 * so deixa o jogo rico ou pobre demais, e ninguem descobre por que. Por isso
 * cada regra tem teste, e os numeros com fonte estao presos por teste.
 */
import { describe, expect, it } from "vitest";
import {
  FROTA,
  HABILITACOES,
  REPASSE,
  calcularFrete,
  custoDeRodar,
  fecharConta,
  podeDirigir,
  podeTreinar,
  type ClasseDeVeiculo,
  type EstadoDoCondutor,
} from "../../client/src/game/freight";

const CLASSES: ClasseDeVeiculo[] = [
  "bicicleta",
  "moto",
  "van",
  "caminhao",
  "carreta",
];

describe("a conta do frete", () => {
  it("cobra fixo, distancia e volume", () => {
    const tabela = FROTA.moto;
    const frete = calcularFrete("moto", 10, 3);
    expect(frete).toBeCloseTo(
      tabela.freteFixo + 10 * tabela.fretePorKm + 3 * tabela.fretePorItem,
      6
    );
  });

  it("mantem o piso da ANTT para caminhao e carreta", () => {
    /*
     * Resolucao ANTT 6.084/2026, carga geral: frete = km x CCD + CC. Estes
     * numeros sao lei, nao gosto — se alguem mexer neles sem querer, este
     * teste avisa antes de o jogo pagar abaixo do piso.
     */
    expect(FROTA.caminhao.fretePorKm).toBeCloseTo(3.9826, 4);
    expect(FROTA.caminhao.freteFixo).toBeCloseTo(451.84, 2);
    expect(FROTA.carreta.fretePorKm).toBeCloseTo(6.6718, 4);
    expect(FROTA.carreta.freteFixo).toBeCloseTo(657.56, 2);

    // 300 km de carreta, sem volume: exatamente o piso.
    expect(calcularFrete("carreta", 300, 0)).toBeCloseTo(
      657.56 + 300 * 6.6718,
      2
    );
  });

  it("nao cobra por volume alem do que cabe no veiculo", () => {
    const cheio = calcularFrete("bicicleta", 5, FROTA.bicicleta.capacidade);
    const impossivel = calcularFrete("bicicleta", 5, 999);
    // Cobrar por carga que nao cabe seria vender o que nao se entrega.
    expect(impossivel).toBe(cheio);
  });

  it("nao aceita distancia negativa", () => {
    expect(calcularFrete("moto", -50, 1)).toBe(calcularFrete("moto", 0, 1));
  });

  it("frete e custo crescem do pedal a carreta", () => {
    // A escada do jogo tem de existir na conta, e nao so no nome do veiculo.
    const fretes = CLASSES.map(classe => calcularFrete(classe, 100, 1));
    const custos = CLASSES.map(classe =>
      Object.values(custoDeRodar(classe, 100)).reduce((a, b) => a + b, 0)
    );
    for (let i = 1; i < CLASSES.length; i += 1) {
      expect(fretes[i]!).toBeGreaterThan(fretes[i - 1]!);
      expect(custos[i]!).toBeGreaterThan(custos[i - 1]!);
    }
  });
});

describe("o repasse ao condutor", () => {
  it("quem poe o proprio veiculo leva 80% e paga o rodar", () => {
    const conta = fecharConta("moto", 40, 5, "condutor");
    expect(conta.ganhoDoCondutor).toBeCloseTo(
      conta.frete * REPASSE.condutor - conta.custoDeRodar,
      6
    );
    // A transportadora nao paga nada do rodar: fica com os 20% limpos.
    expect(conta.lucroDaTransportadora).toBeCloseTo(conta.frete * 0.2, 6);
  });

  it("quem roda com veiculo da XB leva 15% e nao gasta nada", () => {
    const conta = fecharConta("moto", 40, 5, "transportadora");
    expect(conta.ganhoDoCondutor).toBeCloseTo(conta.frete * 0.15, 6);
    // Aqui o custo cai no caixa da empresa — e por isto o pneu vira margem.
    expect(conta.lucroDaTransportadora).toBeCloseTo(
      conta.frete * 0.85 - conta.custoDeRodar,
      6
    );
  });

  it("o mesmo servico paga mais a quem tem veiculo proprio", () => {
    // E a regra que o Fernando pediu com todas as letras.
    CLASSES.forEach(classe => {
      const proprio = fecharConta(classe, 60, 2, "condutor");
      const daEmpresa = fecharConta(classe, 60, 2, "transportadora");
      expect(proprio.ganhoDoCondutor).toBeGreaterThan(
        daEmpresa.ganhoDoCondutor
      );
    });
  });

  it("o frete inteiro se divide, sem sumir nem sobrar dinheiro", () => {
    CLASSES.forEach(classe => {
      (["condutor", "transportadora"] as const).forEach(dono => {
        const c = fecharConta(classe, 120, 3, dono);
        // Tudo o que o cliente pagou vira ganho, lucro ou custo. Dinheiro que
        // some numa conta e o erro que ninguem enxerga.
        expect(
          c.ganhoDoCondutor + c.lucroDaTransportadora + c.custoDeRodar
        ).toBeCloseTo(c.frete, 6);
      });
    });
  });

  it("o custo detalhado soma o custo total", () => {
    const c = fecharConta("carreta", 500, 100, "transportadora");
    const soma = Object.values(c.custoDetalhado).reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(c.custoDeRodar, 6);
    // O pneu tem de aparecer separado: e a peca que a XB vende.
    expect(c.custoDetalhado.pneus).toBeCloseTo(500 * 0.36, 6);
  });

  it("corrida curta demais com veiculo proprio pode dar prejuizo", () => {
    /*
     * Nao e defeito: e a vida real do agregado. O jogo precisa saber
     * representar isso, senao "ter o proprio veiculo" viraria escolha sem
     * risco — e a decisao deixaria de ser decisao.
     */
    const conta = fecharConta("carreta", 1, 0, "condutor");
    expect(conta.ganhoDoCondutor).toBeLessThan(conta.frete);
    expect(Number.isFinite(conta.ganhoDoCondutor)).toBe(true);
  });
});

describe("a habilitacao", () => {
  const novato: EstadoDoCondutor = {
    habilitacoes: ["bicicleta"],
    entregas: 0,
    caixa: 0,
  };

  it("bicicleta nao exige nada, e o resto exige", () => {
    expect(podeDirigir("bicicleta", novato)).toBe(true);
    expect(podeDirigir("moto", novato)).toBe(false);
    expect(podeDirigir("carreta", novato)).toBe(false);
  });

  it("cobra a escada de verdade: uma categoria puxa a anterior", () => {
    // CTB art. 145: C exige B, E exige C. A escada do jogo e a do mundo.
    expect(HABILITACOES.caminhao.exige).toBe("van");
    expect(HABILITACOES.carreta.exige).toBe("caminhao");

    const comMoto: EstadoDoCondutor = {
      habilitacoes: ["bicicleta", "moto"],
      entregas: 9_999,
      caixa: 9_999_999,
    };
    // Tem dinheiro e experiencia de sobra, mas pulou a van.
    const salto = podeTreinar("caminhao", comMoto);
    expect(salto.pode).toBe(false);
    expect(salto.motivo).toBe("falta-habilitacao-anterior");
  });

  it("diz o que falta, e na ordem certa", () => {
    const semNada = podeTreinar("moto", novato);
    expect(semNada.pode).toBe(false);
    // Primeiro o que nao se compra: mandar juntar dinheiro para um curso que
    // a pessoa ainda nao pode fazer e recado errado.
    expect(semNada.motivo).toBe("falta-experiencia");
    expect(semNada.faltam).toBe(HABILITACOES.moto.entregasExigidas);

    const rodado: EstadoDoCondutor = {
      ...novato,
      entregas: HABILITACOES.moto.entregasExigidas,
    };
    const semDinheiro = podeTreinar("moto", rodado);
    expect(semDinheiro.motivo).toBe("falta-dinheiro");
    expect(semDinheiro.faltam).toBe(HABILITACOES.moto.custo);

    const pronto: EstadoDoCondutor = {
      ...rodado,
      caixa: HABILITACOES.moto.custo,
    };
    expect(podeTreinar("moto", pronto).pode).toBe(true);
  });

  it("quem ja tem a habilitacao nao precisa tirar de novo", () => {
    const habilitado: EstadoDoCondutor = {
      habilitacoes: ["bicicleta", "moto"],
      entregas: 0,
      caixa: 0,
    };
    expect(podeTreinar("moto", habilitado).pode).toBe(true);
    expect(podeDirigir("moto", habilitado)).toBe(true);
  });

  it("cada degrau custa mais caro e pede mais estrada", () => {
    const escada: ClasseDeVeiculo[] = ["moto", "van", "caminhao", "carreta"];
    for (let i = 1; i < escada.length; i += 1) {
      const antes = HABILITACOES[escada[i - 1]!];
      const agora = HABILITACOES[escada[i]!];
      expect(agora.custo).toBeGreaterThan(antes.custo);
      expect(agora.entregasExigidas).toBeGreaterThan(antes.entregasExigidas);
    }
  });
});

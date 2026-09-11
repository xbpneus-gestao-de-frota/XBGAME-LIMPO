/**
 * O AGREGADO — quem traz o proprio veiculo.
 *
 * Ordem dele, 08/09/2026: "o usuario comeca proprietario de uma empresa,
 * contratando seu primeiro funcionario, sem bike, e ja teremos outros
 * contratados, alguns com bike, outros sem (...) teremos 8 entregadores".
 *
 * A conta dos dois modelos ja existia no freight.ts desde sempre — 80% para
 * quem poe o proprio veiculo e paga a rodagem, 15% para quem dirige o da XB e
 * nao paga nada. O que faltava era gente para viver o primeiro caminho: sem
 * candidato com bicicleta, aquele ramo do codigo nunca rodava.
 */
import { describe, expect, it } from "vitest";
import { CANDIDATOS, candidatosLivres } from "../../client/src/game/candidatos";
import { podeContratar } from "../../client/src/game/hiring";
import { fecharConta, REPASSE } from "../../client/src/game/freight";
import { CampaignStore } from "../../client/src/game/GameState";

describe("os oito entregadores do bairro", () => {
  it("sao oito, e ha gente com e sem veiculo", () => {
    /*
     * Os dois lados precisam existir. So com bicicleta, a garagem nunca faz
     * falta e metade do jogo perde o motivo. So sem, a empresa nasce parada
     * e a primeira decisao vira "junte dinheiro" — que e espera, nao decisao.
     */
    expect(CANDIDATOS).toHaveLength(8);
    const comVeiculo = CANDIDATOS.filter(c => c.veiculoProprio);
    expect(comVeiculo.length).toBeGreaterThan(0);
    expect(comVeiculo.length).toBeLessThan(CANDIDATOS.length);
  });

  it("cada um tem nome e uma linha sobre ele", () => {
    // Escolher gente por numero e escolher planilha. Cada um precisa de cara.
    for (const c of CANDIDATOS) {
      expect(c.nome.trim().length).toBeGreaterThan(1);
      expect(c.sobre.trim().length).toBeGreaterThan(8);
    }
    expect(new Set(CANDIDATOS.map(c => c.id)).size).toBe(CANDIDATOS.length);
  });

  it("quem ja foi contratado sai do quadro", () => {
    const livres = candidatosLivres([{ candidatoId: CANDIDATOS[0]!.id }]);
    expect(livres).toHaveLength(CANDIDATOS.length - 1);
    expect(livres.some(c => c.id === CANDIDATOS[0]!.id)).toBe(false);
  });
});

describe("contratar sem ter veiculo nenhum", () => {
  const semNada = {
    classeLiberada: true,
    unidades: 0,
    operadoresDaClasse: 0,
    agregadosDaClasse: 0,
    pontosLivres: 10,
    caixa: 1_000_000,
  };

  it("empresa sem garagem NAO contrata quem nao tem veiculo", () => {
    const r = podeContratar("bike", { ...semNada, trazVeiculo: false });
    expect(r.pode).toBe(false);
    expect(r.motivo).toBe("sem-veiculo-livre");
  });

  it("mas contrata quem traz a propria bicicleta", () => {
    /*
     * E a abertura que ele desenhou: a pessoa nao tem veiculo, e mesmo assim
     * poe alguem na rua no primeiro dia — contratando quem ja tem.
     */
    const r = podeContratar("bike", { ...semNada, trazVeiculo: true });
    expect(r.pode).toBe(true);
  });

  it("agregado nao ocupa vaga da garagem", () => {
    /*
     * Sem separar agregado de frotista, cinco agregados fariam o jogo achar
     * que a frota inteira esta ocupada — e a empresa deixaria de poder
     * contratar alguem para o veiculo que esta parado na garagem.
     */
    const comFrota = {
      ...semNada,
      unidades: 3, // a do jogador mais duas livres
      operadoresDaClasse: 4,
      agregadosDaClasse: 4,
    };
    expect(podeContratar("bike", { ...comFrota, trazVeiculo: false }).pode).toBe(
      true,
    );
  });
});

describe("a primeira bicicleta vai para o amigo", () => {
  it("a empresa nasce sem bicicleta nenhuma", () => {
    /*
     * Ordem dele, 08/09/2026. A cena de abertura ja contava isso: o drone
     * desce, o bau abre, e dentro esta uma bicicleta. Se a empresa ja
     * tivesse uma na garagem, aquela caixa nao seria nada — e "nao vou te
     * dar o peixe, vou te ensinar a pescar" perderia o sentido, porque o
     * peixe ja estaria dado.
     */
    const store = new CampaignStore();
    expect(store.value.vehicleFleet.bike).toBe(0);
    expect(store.value.bikeFleetSize).toBe(0);
    expect(store.value.hiredCouriers).toHaveLength(0);
  });

  it("entregar a bicicleta poe a primeira na frota e o amigo na rua", () => {
    const store = new CampaignStore();
    const r = store.entregarAPrimeiraBike("Renan", "renan");
    expect(r.ok).toBe(true);
    expect(store.value.vehicleFleet.bike).toBe(1);

    const [primeiro] = store.value.hiredCouriers;
    expect(primeiro?.name).toBe("Renan");
    /*
     * Ele e FROTISTA, e nao agregado: nao trouxe veiculo nenhum, recebeu o
     * nosso. Por isso leva a fatia menor e a XB paga a rodagem dele.
     */
    expect(primeiro?.veiculoProprio).toBe(false);
    expect(primeiro?.wageRate).toBe(REPASSE.transportadora);
  });

  it("nao cobra nada, porque nao e contratacao: e uma cena", () => {
    const store = new CampaignStore();
    const antes = store.value.credits;
    store.entregarAPrimeiraBike("Renan", "renan");
    expect(store.value.credits).toBe(antes);
  });

  it("acontece uma vez so", () => {
    /*
     * A cena pode ser reencenada por engano — um save recarregado, a
     * conversa reaberta. O bairro nao pode encher de bicicleta por isso.
     */
    const store = new CampaignStore();
    store.entregarAPrimeiraBike("Renan", "renan");
    const segunda = store.entregarAPrimeiraBike("Renan", "renan");
    expect(segunda.ok).toBe(false);
    expect(store.value.vehicleFleet.bike).toBe(1);
    expect(store.value.hiredCouriers).toHaveLength(1);
  });
});

describe("a conta dos dois modelos", () => {
  it("o agregado leva mais e paga a rodagem; a XB fica com pouco e nao gasta", () => {
    const agregado = fecharConta("bicicleta", 12, 6, "condutor");
    const frotista = fecharConta("bicicleta", 12, 6, "transportadora");

    // o mesmo frete nos dois: quem muda e a divisao, e nao o preco ao cliente
    expect(agregado.frete).toBe(frotista.frete);

    // ele leva mais para casa
    expect(agregado.ganhoDoCondutor).toBeGreaterThan(frotista.ganhoDoCondutor);

    // e a empresa fica com menos
    expect(agregado.lucroDaTransportadora).toBeLessThan(
      frotista.lucroDaTransportadora,
    );

    /*
     * O ponto que faz o modelo valer a pena mesmo assim: com agregado a
     * empresa NAO paga a rodagem. O lucro dela e o frete menos o repasse, e
     * mais nada — nenhum centavo de combustivel, pneu ou manutencao.
     */
    expect(agregado.lucroDaTransportadora).toBeCloseTo(
      agregado.frete * (1 - REPASSE.condutor),
      5,
    );
  });
});

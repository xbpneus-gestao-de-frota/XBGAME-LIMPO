/**
 * A EQUIPE TEM DE SOBREVIVER A UM F5.
 *
 * Achado medido na bancada em 11/09/2026: depois de recarregar a pagina, o
 * balcao nao tinha NINGUEM para mandar. O save guardava o Renan e a Lorena
 * direitinho, e a leitura do save jogava os dois fora — a regra que dizia "a
 * unidade 1 nunca e de operador" era de antes de 08/09, quando o jogador
 * ainda pilotava uma bicicleta. Desde a cena da caixa, a unidade 1 e do
 * Renan.
 *
 * O efeito colateral era pior que a falta: a cena da abertura roda de novo a
 * cada recarga, e como o Renan tinha sumido do save ela entregava OUTRA
 * bicicleta. A garagem enchia sozinha.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  CAMPAIGN_STORAGE_KEY,
  CampaignStore,
} from "../../client/src/game/GameState";
import { LORENA } from "../../client/src/game/osQuePedalam";
import { REPASSE } from "../../client/src/game/freight";

class Memoria implements Storage {
  private dados = new Map<string, string>();
  get length(): number {
    return this.dados.size;
  }
  clear(): void {
    this.dados.clear();
  }
  getItem(chave: string): string | null {
    return this.dados.has(chave) ? this.dados.get(chave)! : null;
  }
  key(indice: number): string | null {
    return [...this.dados.keys()][indice] ?? null;
  }
  removeItem(chave: string): void {
    this.dados.delete(chave);
  }
  setItem(chave: string, valor: string): void {
    this.dados.set(chave, String(valor));
  }
}

/** O que a cena da abertura faz, na ordem em que o jogo faz. */
const aCenaDaAbertura = (store: CampaignStore): void => {
  store.entregarAPrimeiraBike("Renan", "renan");
  store.chegarNaEquipe(LORENA.id);
};

const equipe = (store: CampaignStore) =>
  store.value.hiredCouriers.map(c => ({
    nome: c.name,
    unidade: c.vehicleUnitId,
    veio: c.candidatoId,
    proprio: Boolean(c.veiculoProprio),
    fatia: c.wageRate,
  }));

let memoria: Memoria;

beforeEach(() => {
  memoria = new Memoria();
  (globalThis as unknown as { window?: unknown }).window = {
    localStorage: memoria,
  };
});

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe("o save guarda a equipe", () => {
  it("os dois voltam inteiros depois de recarregar", () => {
    aCenaDaAbertura(new CampaignStore());

    const depois = new CampaignStore();
    expect(equipe(depois)).toEqual([
      {
        nome: "Renan",
        unidade: "bike-1",
        veio: "renan",
        proprio: false,
        fatia: REPASSE.transportadora,
      },
      {
        nome: "Lorena",
        unidade: "bike-2",
        veio: LORENA.id,
        proprio: false,
        fatia: REPASSE.transportadora,
      },
    ]);
    expect(depois.value.vehicleFleet.bike).toBe(2);
  });

  it("recarregar tres vezes nao enche a garagem de bicicleta", () => {
    aCenaDaAbertura(new CampaignStore());
    for (let volta = 0; volta < 3; volta += 1) {
      // A abertura roda de novo a cada recarga: a conversa nao fica salva.
      aCenaDaAbertura(new CampaignStore());
    }
    const fim = new CampaignStore();
    expect(fim.value.vehicleFleet.bike).toBe(2);
    expect(fim.value.hiredCouriers).toHaveLength(2);
  });

  it("uma bicicleta orfa na garagem e reaproveitada, nao duplicada", () => {
    /*
     * Save de quem jogou antes do conserto: a bicicleta ficou na garagem e o
     * Renan sumiu. Quando a cena roda de novo, ele volta PARA A MESMA
     * bicicleta.
     */
    const antes = new CampaignStore();
    aCenaDaAbertura(antes);
    const cru = JSON.parse(memoria.getItem(CAMPAIGN_STORAGE_KEY)!) as {
      state: { hiredCouriers: unknown[] };
    };
    cru.state.hiredCouriers = [];
    memoria.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(cru));

    const depois = new CampaignStore();
    expect(depois.value.hiredCouriers).toHaveLength(0);
    aCenaDaAbertura(depois);
    expect(depois.value.vehicleFleet.bike).toBe(2);
    expect(equipe(depois).map(c => c.unidade)).toEqual(["bike-1", "bike-2"]);
  });

  it("save velho com a Lorena de bicicleta propria: ela volta com a da XB", () => {
    /*
     * Ordem dele, 11/09/2026: "bicicleta e minha ainda". Quem estava gravado
     * como agregada nao pode continuar levando a fatia de quem tem veiculo —
     * a vaga dela na lista do bairro diz que ela nao traz nenhum.
     */
    memoria.setItem(
      CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        savedAt: Date.now(),
        state: {
          vehicleFleet: { bike: 1 },
          hiredCouriers: [
            {
              id: "courier-1",
              name: "Renan",
              hiredAt: 1,
              vehicleId: "bike",
              vehicleUnitId: "bike-1",
              operationalPoints: 1,
              wageRate: REPASSE.transportadora,
              veiculoProprio: false,
              candidatoId: "renan",
            },
            {
              id: "courier-2",
              name: "Lorena",
              hiredAt: 2,
              vehicleId: "bike",
              vehicleUnitId: `proprio-${LORENA.id}`,
              operationalPoints: 1,
              wageRate: REPASSE.condutor,
              veiculoProprio: true,
              candidatoId: LORENA.id,
            },
          ],
        },
      })
    );

    const store = new CampaignStore();
    expect(equipe(store)).toEqual([
      {
        nome: "Renan",
        unidade: "bike-1",
        veio: "renan",
        proprio: false,
        fatia: REPASSE.transportadora,
      },
    ]);
    // a cena poe ela de volta, agora com bicicleta da empresa
    store.chegarNaEquipe(LORENA.id);
    const ela = store.value.hiredCouriers.find(
      c => c.candidatoId === LORENA.id
    );
    expect(ela?.veiculoProprio).toBe(false);
    expect(ela?.wageRate).toBe(REPASSE.transportadora);
    expect(ela?.vehicleUnitId).toBe("bike-2");
  });

  it("o agregado de verdade continua voltando do save", () => {
    /*
     * O caminho do agregado nao morreu: quem esta na lista do bairro COM
     * veiculo proprio (o Tiao) continua entrando com a unidade dele, fora da
     * garagem da XB, levando a fatia do condutor.
     */
    memoria.setItem(
      CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        savedAt: Date.now(),
        state: {
          vehicleFleet: { bike: 1 },
          hiredCouriers: [
            {
              id: "courier-1",
              name: "Tião",
              hiredAt: 1,
              vehicleId: "bike",
              vehicleUnitId: "proprio-cand-tiao",
              operationalPoints: 1,
              wageRate: REPASSE.condutor,
              veiculoProprio: true,
              candidatoId: "cand-tiao",
            },
          ],
        },
      })
    );
    const store = new CampaignStore();
    const [tiao] = store.value.hiredCouriers;
    expect(tiao?.name).toBe("Tião");
    expect(tiao?.veiculoProprio).toBe(true);
    expect(tiao?.wageRate).toBe(REPASSE.condutor);
    // a bicicleta dele nao entra na garagem da XB
    expect(store.value.vehicleFleet.bike).toBe(1);
  });

  it("unidade que nao existe na garagem continua sendo recusada", () => {
    memoria.setItem(
      CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        savedAt: Date.now(),
        state: {
          vehicleFleet: { bike: 1 },
          hiredCouriers: [
            {
              id: "courier-1",
              name: "Fantasma",
              hiredAt: 1,
              vehicleId: "bike",
              vehicleUnitId: "bike-9",
              operationalPoints: 1,
              wageRate: REPASSE.transportadora,
            },
          ],
        },
      })
    );
    expect(new CampaignStore().value.hiredCouriers).toHaveLength(0);
  });
});

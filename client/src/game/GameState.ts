/**
 * CampaignStore is the sole authority for campaign economy, prerequisites,
 * immutable route snapshots, persistence and migration. The whole game remains
 * offline-first: no rule in this file depends on a network or server clock.
 */
import {
  TIRE_MAX_LEVEL,
  VEHICLES,
  getVehicle,
  tireUpgradeCost,
  vehicleCargoCapacity,
} from "./config";
import {
  BIKE_PARTS,
  BUILDINGS,
  FIRST_COURIER_UNLOCK_LEVEL,
  MAX_BIKE_PART_LEVEL,
  MAX_COMPANY_LEVEL,
  MAX_MVP_BIKE_FLEET,
  REGIONS,
  ROUTES,
  SECOND_BIKE_UNLOCK_LEVEL,
  STARTING_OPERATIONAL_POINTS,
  VEHICLE_UNLOCK_LEVELS,
  bikePartEffects,
  bikePartUpgradeCost,
  buildingUpgradeCost,
  companyXpRequiredForLevel,
  companyLevelFromXp,
  courierHireCost,
  deliverySlotCount,
  operationsSummary,
  operationalPointsAvailable,
  previousRegion,
  routeCompletedInRegion,
  secondBikeCost,
  vehicleUpgradeCost,
  type RouteConfig,
} from "./progression";
import {
  TIRE_COMPOUNDS,
  conditionDurationMultiplier,
  conditionRevenueMultiplier,
  dayKey,
  getCompound,
  isCompoundUnlocked,
  maintenanceCost,
  operatingCosts,
  operatingProfile,
  routeDistanceKm,
  scaleOperatingCosts,
  terrainForRoute,
  tireFit as evaluateTireFit,
} from "./operations";
import {
  generateDailyMissions,
  missionComplete,
  progressDailyMissions,
} from "./missions";
import { MAXIMO_POR_CLASSE as MAXIMO_DE_UNIDADES_POR_CLASSE } from "./hiring";
import { candidato } from "./candidatos";
import {
  ENTREGADOR_PADRAO,
  ehEntregador,
  limparNome,
  nomeValido,
} from "./identity";
import { REPASSE } from "./freight";
import type { MotivoDeNaoContratar } from "./hiring";
import {
  PONTOS_DO_OPERADOR,
  capacidadeOperacional,
  custoDeContratar,
  custoDeUmaUnidade,
  frotaMaxima,
  podeContratar,
  salarioDaViagem,
} from "./hiring";

/**
 * O que a tela diz quando a contratacao nao sai.
 *
 * Cada motivo tem um recado proprio porque "nao pode" sem dizer por que e a
 * forma mais rapida de a pessoa desistir. A ordem em que eles aparecem e
 * decidida no `podeContratar`, e nao aqui.
 */
const RECADO_DA_CONTRATACAO: Readonly<
  Record<MotivoDeNaoContratar, (veiculo: string) => string>
> = {
  "classe-bloqueada": veiculo => `${veiculo} ainda não foi liberada.`,
  // Uma unidade fica sempre com o jogador: e a que ele pilota.
  "sem-veiculo-livre": veiculo =>
    `Compre uma ${veiculo.toLowerCase()} livre antes de contratar o operador.`,
  "sem-pontos": () =>
    "Contratação bloqueada: não há Pontos Operacionais livres.",
  "sem-dinheiro": () => "Falta caixa para a contratação.",
};
import {
  CAMPAIGN_SAVE_VERSION,
  type ActiveDelivery,
  type ActivePilotedRun,
  type BikePartId,
  type BikePartLevels,
  type BuildingId,
  type CampaignState,
  type CourierId,
  type DailyMissionKind,
  type DailyMissionState,
  type HiredCourier,
  type OperationsSummary,
  type RouteRunPlan,
  type RunResult,
  type RunSnapshot,
  type TireCompoundId,
  type TireFit,
  type TireStat,
  type VehicleConfig,
  type VehicleId,
} from "./types";

export const CAMPAIGN_STORAGE_KEY = "xb-pneus-do-pedal-ao-planeta-v3";
export const PREVIOUS_CAMPAIGN_STORAGE_KEY = "xb-pneus-do-pedal-ao-planeta-v2";
export const LEGACY_CAMPAIGN_STORAGE_KEY = "xb-pneus-do-pedal-ao-planeta-v1";

const VEHICLE_IDS = VEHICLES.map(vehicle => vehicle.id);
const VEHICLE_ID_SET = new Set<VehicleId>(VEHICLE_IDS);
const ROUTE_IDS = new Set(ROUTES.map(route => route.id));
const REGION_IDS = new Set(REGIONS.map(region => region.id));
const COMPOUND_IDS = new Set(TIRE_COMPOUNDS.map(compound => compound.id));
const TERRAIN_IDS = new Set([
  "urban",
  "highway",
  "industrial",
  "offroad",
  "orbital",
  "planetary",
]);
const WEATHER_IDS = new Set(["clear", "rain", "heat", "dust", "cold", "storm"]);
const FIT_IDS = new Set(["ideal", "adequate", "risky"]);
const MISSION_KINDS = new Set<DailyMissionKind>([
  "deliveries",
  "revenue",
  "upgrade",
  "idealTire",
  "expansion",
]);

const finite = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (
  value: unknown,
  min: number,
  max: number,
  fallback = min
): number => Math.min(max, Math.max(min, finite(value, fallback)));

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

const emptyBikePartLevels = (): BikePartLevels => ({
  tire: 0,
  cargo: 0,
  chain: 0,
  brake: 0,
  wheels: 0,
});

const emptyVehicleLevels = (): Record<VehicleId, number> => ({
  bike: 1,
  moto: 0,
  van: 0,
  truck: 0,
  fleet: 0,
  planetary: 0,
});

const emptyBuildingLevels = (): Record<BuildingId, number> => ({
  hq: 1,
  garage: 1,
  workshop: 0,
  warehouse: 0,
  dispatch: 0,
  planetLab: 0,
});

const defaultCompounds = (): Record<VehicleId, TireCompoundId> => ({
  bike: "urban",
  moto: "urban",
  van: "urban",
  truck: "urban",
  fleet: "urban",
  planetary: "urban",
});

const fullTireCondition = (): Record<VehicleId, number> => ({
  bike: 100,
  moto: 100,
  van: 100,
  truck: 100,
  fleet: 100,
  planetary: 100,
});

export const createDefaultCampaignState = (): CampaignState => ({
  // Vazio de proposito: e assim que o jogo sabe que a pessoa ainda nao se
  // apresentou e precisa ver a tela de boas-vindas.
  playerName: "",
  playerAvatarId: "",
  credits: 0,
  reputation: 0,
  companyXp: 0,
  deliveries: 0,
  totalDistance: 0,
  selectedVehicleId: "bike",
  unlockedVehicles: ["bike"],
  vehicleLevels: emptyVehicleLevels(),
  tireLevels: { grip: 0, durability: 0, efficiency: 0, capacity: 0 },
  buildingLevels: emptyBuildingLevels(),
  unlockedRegionIds: ["divinopolis"],
  activeDeliveries: [],
  activePilotedRun: null,
  completedRouteIds: [],
  onboardingStep: 0,
  equippedCompounds: defaultCompounds(),
  tireCondition: fullTireCondition(),
  dailyMissionDay: dayKey(),
  dailyMissions: [],
  bikePartLevels: emptyBikePartLevels(),
  /*
   * ── A EMPRESA NASCE SEM BICICLETA ────────────────────────────────────────
   *
   * Ordem dele, 08/09/2026: "o usuario comeca sem bike; ele vai entregar a
   * primeira bike a um amigo, que sera o primeiro entregador".
   *
   * E o que a cena de abertura ja contava e o numero desmentia: o drone
   * desce, o bau abre, e dentro esta uma bicicleta com todo o equipamento.
   * Se a empresa ja tivesse uma na garagem, aquela caixa nao seria nada — e
   * a frase "nao vou te dar o peixe, vou te ensinar a pescar" perderia o
   * sentido, porque o peixe ja estaria dado.
   *
   * Comecar em zero e o que faz o primeiro entregador ser uma DECISAO: a
   * unica bicicleta do mundo esta na sua mao, e voce entrega para o Renan.
   */
  vehicleFleet: { bike: 0, moto: 0, van: 0, truck: 0, fleet: 0, planetary: 0 },
  bikeFleetSize: 0,
  operationalPointsCapacity: STARTING_OPERATIONAL_POINTS,
  hiredCouriers: [],
});

const createDemoState = (): CampaignState => ({
  playerName: "Fernando",
  playerAvatarId: ENTREGADOR_PADRAO,
  credits: 248_400,
  reputation: 2_480,
  companyXp: companyXpRequiredForLevel(MAX_COMPANY_LEVEL),
  deliveries: 128,
  totalDistance: 92_640,
  selectedVehicleId: "planetary",
  unlockedVehicles: [...VEHICLE_IDS],
  vehicleLevels: {
    bike: 3,
    moto: 3,
    van: 3,
    truck: 3,
    fleet: 2,
    planetary: 2,
  },
  tireLevels: { grip: 4, durability: 4, efficiency: 4, capacity: 4 },
  buildingLevels: {
    hq: 10,
    garage: 5,
    workshop: 5,
    warehouse: 8,
    dispatch: 5,
    planetLab: 1,
  },
  unlockedRegionIds: REGIONS.map(region => region.id),
  activeDeliveries: [],
  activePilotedRun: null,
  completedRouteIds: ROUTES.map(route => route.id),
  onboardingStep: 4,
  equippedCompounds: {
    bike: "urban",
    moto: "rain",
    van: "highway",
    truck: "cargo",
    fleet: "offroad",
    planetary: "planet",
  },
  tireCondition: {
    bike: 86,
    moto: 91,
    van: 78,
    truck: 84,
    fleet: 72,
    planetary: 94,
  },
  dailyMissionDay: dayKey(),
  dailyMissions: generateDailyMissions(dayKey(), MAX_COMPANY_LEVEL, {
    upgrade: false,
    expansion: false,
  }).map((mission, index) => ({
    ...mission,
    progress:
      index === 0
        ? mission.target
        : index === 1
          ? Math.max(1, Math.floor(mission.target / 2))
          : 0,
  })),
  bikePartLevels: {
    tire: MAX_BIKE_PART_LEVEL,
    cargo: MAX_BIKE_PART_LEVEL,
    chain: MAX_BIKE_PART_LEVEL,
    brake: MAX_BIKE_PART_LEVEL,
    wheels: MAX_BIKE_PART_LEVEL,
  },
  vehicleFleet: {
    bike: MAX_MVP_BIKE_FLEET,
    moto: 2,
    van: 2,
    truck: 2,
    fleet: 2,
    planetary: 2,
  },
  bikeFleetSize: MAX_MVP_BIKE_FLEET,
  operationalPointsCapacity: 20,
  hiredCouriers: [
    {
      id: "courier-1",
      name: "Operador XB 01",
      hiredAt: 0,
      vehicleId: "bike",
      vehicleUnitId: "bike-2",
      operationalPoints: 1,
      wageRate: 0.18,
    },
  ],
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export interface StoreActionResult {
  ok: boolean;
  message: string;
  creditsEarned?: number;
  xpEarned?: number;
  reputationEarned?: number;
  levelBefore?: number;
  levelAfter?: number;
  tireWear?: number;
  tireFit?: TireFit;
  operatingCost?: number;
  netReward?: number;
  bikeFleetSize?: number;
  courierId?: CourierId;
  operationalPointsAvailable?: number;
}

export interface StartRunResult extends StoreActionResult {
  plan?: RouteRunPlan;
  run?: RunSnapshot;
}

export interface CollectCompletedResult extends StoreActionResult {
  collected: number;
  totalNetReward: number;
}

interface PersistedCampaignV3 {
  version: typeof CAMPAIGN_SAVE_VERSION;
  savedAt: number;
  state: CampaignState;
}

export class CampaignStore {
  private state: CampaignState;
  private pilotedPlan: RouteRunPlan | null = null;
  private cachedValue: CampaignState | null = null;

  constructor(
    private readonly demo = false,
    private readonly ephemeral = false
  ) {
    this.state = demo
      ? createDemoState()
      : ephemeral
        ? createDefaultCampaignState()
        : this.load();
    this.pilotedPlan = this.state.activePilotedRun?.plan ?? null;
    this.refreshUnlocks();
    this.ensureDailyMissions();
    // Persist the canonical, validated shape after loading or migrating. This
    // also removes rejected in-flight data so it is not retried on every boot.
    this.save();
  }

  /**
   * Copia defensiva para a interface. O clone e reaproveitado enquanto nada
   * muda: antes, cada leitura serializava a campanha inteira, e o laco de
   * render lia isso 60 vezes por segundo.
   */
  get value(): CampaignState {
    this.ensureDailyMissions();
    if (!this.cachedValue) this.cachedValue = clone(this.state);
    return this.cachedValue;
  }

  /**
   * Leitura interna do motor, sem clone. Quem chama NAO pode mutar o retorno.
   */
  get current(): CampaignState {
    return this.state;
  }

  get companyLevel(): number {
    return companyLevelFromXp(this.state.companyXp);
  }

  get operations(): OperationsSummary {
    return operationsSummary(
      this.state.operationalPointsCapacity,
      this.state.vehicleFleet,
      this.state.hiredCouriers
    );
  }

  get restorablePilotedRun(): ActivePilotedRun | null {
    return this.state.activePilotedRun
      ? clone(this.state.activePilotedRun)
      : null;
  }

  /**
   * Atualiza a rota pilotada em memoria. A gravacao em disco e sincrona e
   * custa uma serializacao inteira do save, entao so acontece quando
   * `persist` pede: o laco do jogo ja grava a cada meio segundo.
   */
  updatePilotedRun(run: RunSnapshot, persist = false): boolean {
    const active = this.state.activePilotedRun;
    if (!active || !this.pilotedPlan) return false;
    active.run = this.sanitizeRunSnapshot(
      run,
      active.plan,
      this.state,
      active.run.elapsed
    );
    active.updatedAt = Date.now();
    this.cachedValue = null;
    if (persist) this.save();
    return true;
  }

  isVehicleOccupied(id: VehicleId): boolean {
    return (
      this.pilotedPlan?.vehicleId === id ||
      this.state.activeDeliveries.some(delivery => delivery.vehicleId === id)
    );
  }

  upgradeBikePart(partId: BikePartId): StoreActionResult {
    const part = BIKE_PARTS.find(item => item.id === partId);
    if (!part)
      return { ok: false, message: "Peça de bicicleta não encontrada." };
    if (this.companyLevel < part.unlockLevel) {
      return {
        ok: false,
        message: `${part.shortName} libera no nível ${part.unlockLevel}.`,
      };
    }
    if (this.isVehicleOccupied("bike")) {
      return {
        ok: false,
        message: "A frota de bicicletas está em rota. Aguarde para melhorar.",
      };
    }
    const current = this.state.bikePartLevels[partId];
    const cost = bikePartUpgradeCost(partId, current);
    if (cost === null) {
      return {
        ok: false,
        message: `${part.shortName} já está no nível máximo.`,
      };
    }
    if (this.state.credits < cost) {
      return {
        ok: false,
        message: `Faltam XB$ ${cost - this.state.credits} para ${part.shortName}.`,
      };
    }
    this.state.credits -= cost;
    this.state.bikePartLevels[partId] = current + 1;
    this.recordMission("upgrade", 1);
    this.save();
    return {
      ok: true,
      message: `${part.shortName} atualizado para o nível ${current + 1}.`,
    };
  }

  /**
   * Mantem `bikeFleetSize` colado em `vehicleFleet.bike`.
   *
   * O campo antigo continua no save e em algumas telas. Ter dois numeros para
   * a mesma coisa e como ter dois relogios — entao ha um unico lugar que
   * escreve nele, este, e um teste que prova que ele nunca sai do lugar.
   */
  private sincronizarFrota(): void {
    /*
     * O PISO ERA 1 E VIROU 0.
     *
     * Enquanto a empresa nascia com uma bicicleta, forcar o minimo em um so
     * consertava save torto. Agora ela nasce com nenhuma — e um piso de 1
     * inventaria do nada a bicicleta que a cena inteira da abertura existe
     * para entregar.
     */
    this.state.bikeFleetSize = Math.max(0, this.state.vehicleFleet.bike ?? 0);
  }

  private unidadesDe(veiculo: VehicleId): number {
    return Math.max(0, Math.floor(this.state.vehicleFleet[veiculo] ?? 0));
  }

  private operadoresDe(veiculo: VehicleId): HiredCourier[] {
    return this.state.hiredCouriers.filter(
      operador => operador.vehicleId === veiculo
    );
  }

  /**
   * A capacidade da central, que cresce e nunca encolhe.
   *
   * Ela era um numero parado em 5 desde o primeiro save: dava para contratar
   * cinco ciclistas e mais nada, para sempre. Agora sobe com o Centro de
   * Rotas — o predio que existe justamente para coordenar contratos
   * simultaneos — e com o tamanho da empresa.
   */
  private atualizarCapacidadeOperacional(): void {
    this.state.operationalPointsCapacity = Math.max(
      this.state.operationalPointsCapacity,
      capacidadeOperacional(
        this.companyLevel,
        this.state.buildingLevels.dispatch,
        STARTING_OPERATIONAL_POINTS
      )
    );
  }

  /** Quantas unidades desta classe a empresa ainda pode comprar. */
  frotaMaximaDe(veiculo: VehicleId): number {
    return frotaMaxima(VEHICLE_UNLOCK_LEVELS[veiculo], this.companyLevel);
  }

  /**
   * Compra mais uma unidade de uma classe.
   *
   * Antes so existia `buyBikeUnit`, e a frota inteira do jogo era "quantas
   * bicicletas". A XB do Fernando compra moto, van, caminhao e carreta — e a
   * regra e a mesma para todas, o que muda e o preco, que sai da conta de
   * frete e nao de um numero digitado.
   */
  /**
   * Guarda quem a pessoa e: o nome dela e o entregador que ela escolheu.
   *
   * Vale uma vez, na primeira entrada — mas nada aqui impede trocar depois, e
   * isso e de proposito: se um dia houver um botao de trocar de entregador nos
   * ajustes, ele ja funciona sem mexer no motor.
   */
  definirJogador(nome: string, entregadorId: string): StoreActionResult {
    const limpo = limparNome(nome);
    if (!nomeValido(limpo)) {
      return { ok: false, message: "Escreva um nome com pelo menos 2 letras." };
    }
    if (!ehEntregador(entregadorId)) {
      return { ok: false, message: "Escolha um entregador para começar." };
    }
    this.state.playerName = limpo;
    this.state.playerAvatarId = entregadorId;
    this.save();
    return { ok: true, message: `Boa viagem, ${limpo}.` };
  }

  /**
   * Esquece QUEM esta jogando, sem tocar no resto da campanha.
   *
   * O dinheiro, o nivel e as entregas ficam; some so o nome e o entregador
   * escolhido. Serve para duas coisas diferentes que sao a mesma por dentro:
   * o Fernando conferir a tela de escolha sem zerar um save de nivel 7, e a
   * pessoa poder trocar de entregador um dia sem perder a vida que construiu.
   */
  esquecerJogador(): StoreActionResult {
    this.state.playerName = "";
    this.state.playerAvatarId = "";
    this.save();
    return { ok: true, message: "O jogo vai perguntar de novo quem e voce." };
  }

  buyVehicleUnit(veiculo: VehicleId): StoreActionResult {
    if (!this.state.unlockedVehicles.includes(veiculo)) {
      return {
        ok: false,
        message: `${veiculo === "bike" ? "A bicicleta" : "Esta classe"} ainda nao foi liberada.`,
      };
    }
    const atuais = this.unidadesDe(veiculo);
    const teto = this.frotaMaximaDe(veiculo);
    if (atuais >= teto) {
      return {
        ok: false,
        message:
          teto >= MAXIMO_DE_UNIDADES_POR_CLASSE
            ? "A garagem chegou ao limite desta classe."
            : "Suba de nivel para abrir mais uma vaga na garagem.",
      };
    }
    const cost = custoDeUmaUnidade(veiculo, atuais);
    if (this.state.credits < cost) {
      return {
        ok: false,
        message: `Faltam XB$ ${cost - this.state.credits} para a nova unidade.`,
      };
    }
    this.state.credits -= cost;
    this.state.vehicleFleet[veiculo] = atuais + 1;
    this.sincronizarFrota();
    this.recordMission("upgrade", 1);
    this.save();
    return {
      ok: true,
      message: `Unidade ${atuais + 1} adicionada a garagem.`,
      bikeFleetSize: this.state.bikeFleetSize,
    };
  }

  /** O caso bicicleta, que as telas antigas ja chamavam pelo nome. */
  buyBikeUnit(): StoreActionResult {
    if (this.companyLevel < SECOND_BIKE_UNLOCK_LEVEL) {
      return {
        ok: false,
        message: `A segunda bicicleta libera no nível ${SECOND_BIKE_UNLOCK_LEVEL}.`,
      };
    }
    return this.buyVehicleUnit("bike");
  }

  /**
   * Contrata um operador para uma classe.
   *
   * Cada operador sai com uma unidade reservada para ele: ninguem divide
   * veiculo, e uma unidade fica sempre com o jogador, que e quem pilota. O
   * operador ja vem habilitado — e para isso que se contrata alguem; a escada
   * de CNH do freight.ts e do jogador, para ele proprio poder pilotar aquela
   * classe.
   */
  hireOperator(
    veiculo: VehicleId,
    now = Date.now(),
    candidatoId?: string
  ): StoreActionResult {
    this.atualizarCapacidadeOperacional();
    const daClasse = this.operadoresDe(veiculo);
    /*
     * ── QUEM ESTA SENDO CONTRATADO ──────────────────────────────────────
     *
     * Ordem dele, 08/09/2026: o bairro tem oito entregadores, alguns com
     * bicicleta e outros sem. Contratar um que TRAZ a bicicleta e contratar
     * um AGREGADO — ele leva 80% do frete e banca a rodagem; a empresa nao
     * precisa ter veiculo nenhum na garagem.
     *
     * Sem candidato, e o caminho antigo: um operador da frota da XB.
     */
    const quem = candidatoId ? candidato(candidatoId) : undefined;
    if (candidatoId && !quem) {
      return { ok: false, message: "Esse entregador não está no bairro." };
    }
    if (quem && this.state.hiredCouriers.some(c => c.candidatoId === quem.id)) {
      return { ok: false, message: `${quem.nome} já trabalha com você.` };
    }
    const trazVeiculo = Boolean(quem?.veiculoProprio);
    const decisao = podeContratar(veiculo, {
      classeLiberada: this.state.unlockedVehicles.includes(veiculo),
      trazVeiculo,
      unidades: this.unidadesDe(veiculo),
      operadoresDaClasse: daClasse.length,
      agregadosDaClasse: daClasse.filter(c => c.veiculoProprio).length,
      pontosLivres: operationalPointsAvailable(
        this.state.operationalPointsCapacity,
        this.state.hiredCouriers
      ),
      caixa: this.state.credits,
    });
    if (!decisao.pode) {
      return {
        ok: false,
        message:
          decisao.motivo === "sem-dinheiro"
            ? `Faltam XB$ ${decisao.faltam} para a contratação.`
            : RECADO_DA_CONTRATACAO[decisao.motivo!](
                getVehicle(veiculo).shortName
              ),
      };
    }

    const numero = this.state.hiredCouriers.length + 1;
    const ocupadas = new Set(
      this.state.hiredCouriers.map(operador => operador.vehicleUnitId)
    );
    /*
     * O AGREGADO NAO OCUPA VAGA NA GARAGEM.
     *
     * A unidade dele nao e da frota da XB, e por isso nao pode sair da lista
     * de unidades da empresa: se saisse, o proximo frotista acharia a
     * garagem cheia sem ela estar. O identificador leva o nome dele para
     * ficar claro, em qualquer tela, de quem e aquele veiculo.
     */
    const vehicleUnitId = trazVeiculo
      ? `proprio-${quem!.id}`
      : Array.from(
          { length: Math.max(0, this.unidadesDe(veiculo) - 1) },
          (_, index) => `${veiculo}-${index + 2}`
        ).find(unitId => !ocupadas.has(unitId));
    if (!vehicleUnitId) {
      return { ok: false, message: "Nenhuma unidade livre para o operador." };
    }
    const courier: HiredCourier = {
      id: `courier-${numero}` as CourierId,
      name: quem?.nome ?? `Operador XB ${String(numero).padStart(2, "0")}`,
      hiredAt: Math.max(0, Math.floor(now)),
      vehicleId: veiculo,
      vehicleUnitId,
      operationalPoints: PONTOS_DO_OPERADOR[veiculo],
      wageRate: trazVeiculo ? REPASSE.condutor : REPASSE.transportadora,
      veiculoProprio: trazVeiculo,
      candidatoId: quem?.id,
    };
    this.state.credits -= decisao.custo;
    this.state.hiredCouriers.push(courier);
    this.recordMission("upgrade", 1);
    this.save();
    return {
      ok: true,
      message: trazVeiculo
        ? `${courier.name} entrou como agregado, com a bicicleta dele.`
        : `${courier.name} contratado. Automação de rotas liberada.`,
      courierId: courier.id,
      operationalPointsAvailable: this.operations.available,
    };
  }

  /**
   * ── A PRIMEIRA BICICLETA, ENTREGUE A MAO ─────────────────────────────────
   *
   * Ordem dele, 08/09/2026: quem joga comeca sem bicicleta e entrega a
   * primeira ao amigo, que vira o primeiro entregador.
   *
   * Isto NAO passa pelas regras de contratacao, e nao e descuido: aqui nao
   * ha escolha nem preco. O drone desceu, o bau abriu, e a pessoa deu a
   * unica bicicleta que existia para o Renan. Cobrar dinheiro por isso, ou
   * exigir vaga livre na garagem, seria transformar uma cena em formulario.
   *
   * A bicicleta ENTRA na frota da empresa no mesmo gesto: ela e da XB, e o
   * Renan roda com ela. Por isso ele e frotista, e nao agregado — nao trouxe
   * veiculo nenhum, recebeu o nosso.
   *
   * Acontece uma vez so. Chamar de novo nao faz nada, e e assim de proposito:
   * a cena pode ser reencenada por engano, e o bairro nao pode encher de
   * bicicleta por causa disso.
   */
  entregarAPrimeiraBike(
    nome: string,
    candidatoId: string,
    now = Date.now()
  ): StoreActionResult {
    if (this.state.hiredCouriers.some(c => c.candidatoId === candidatoId)) {
      return { ok: false, message: `${nome} já está com a bicicleta.` };
    }
    this.state.vehicleFleet.bike = Math.max(1, this.unidadesDe("bike") + 1);
    this.sincronizarFrota();
    this.atualizarCapacidadeOperacional();

    const courier: HiredCourier = {
      id: `courier-${this.state.hiredCouriers.length + 1}` as CourierId,
      name: nome,
      hiredAt: Math.max(0, Math.floor(now)),
      vehicleId: "bike",
      vehicleUnitId: "bike-1",
      operationalPoints: PONTOS_DO_OPERADOR.bike,
      wageRate: REPASSE.transportadora,
      veiculoProprio: false,
      candidatoId,
    };
    this.state.hiredCouriers.push(courier);
    this.save();
    return {
      ok: true,
      message: `${nome} ficou com a primeira bicicleta da XB.`,
      courierId: courier.id,
      operationalPointsAvailable: this.operations.available,
    };
  }

  /**
   * ── QUEM ENTRA JUNTO, SEM PRECO (11/09/2026) ─────────────────────────────
   *
   * Ordem dele: "por enquanto gere mesmo formato de renan, devemos ter os
   * dois na tela coletando e entregando". A Lorena entra como o Renan entrou:
   * numa cena, e nao num formulario — sem preco e sem vaga na garagem.
   *
   * Ela TRAZ a bicicleta dela (e a regra da vaga que ela tomou na lista), entao
   * entra como AGREGADA: leva a parte do condutor e a unidade nao sai da
   * garagem da XB. Quem nao traz veiculo nao passa por aqui — cai nas regras
   * de contratacao de sempre.
   *
   * Acontece uma vez so, como a primeira bicicleta.
   */
  chegarNaEquipe(candidatoId: string, now = Date.now()): StoreActionResult {
    const quem = candidato(candidatoId);
    if (!quem) {
      return { ok: false, message: "Esse entregador não está no bairro." };
    }
    if (this.state.hiredCouriers.some(c => c.candidatoId === quem.id)) {
      return { ok: false, message: `${quem.nome} já trabalha com você.` };
    }
    if (!quem.veiculoProprio) return this.hireOperator(quem.veiculo, now, quem.id);
    this.atualizarCapacidadeOperacional();
    const courier: HiredCourier = {
      id: `courier-${this.state.hiredCouriers.length + 1}` as CourierId,
      name: quem.nome,
      hiredAt: Math.max(0, Math.floor(now)),
      vehicleId: quem.veiculo,
      vehicleUnitId: `proprio-${quem.id}`,
      operationalPoints: PONTOS_DO_OPERADOR[quem.veiculo],
      wageRate: REPASSE.condutor,
      veiculoProprio: true,
      candidatoId: quem.id,
    };
    this.state.hiredCouriers.push(courier);
    this.save();
    return {
      ok: true,
      message: `${quem.nome} chegou com a bicicleta dela.`,
      courierId: courier.id,
      operationalPointsAvailable: this.operations.available,
    };
  }

  /** O caso bicicleta, que as telas antigas ja chamavam pelo nome. */
  hireCourier(now = Date.now()): StoreActionResult {
    if (this.companyLevel < FIRST_COURIER_UNLOCK_LEVEL) {
      return {
        ok: false,
        message: `O primeiro operador libera no nível ${FIRST_COURIER_UNLOCK_LEVEL}.`,
      };
    }
    return this.hireOperator("bike", now);
  }

  maintainBike(): StoreActionResult {
    return this.maintainVehicleTires("bike");
  }

  buyVehicle(vehicle: VehicleConfig): StoreActionResult {
    if (this.state.unlockedVehicles.includes(vehicle.id)) {
      this.state.selectedVehicleId = vehicle.id;
      this.save();
      return { ok: true, message: `${vehicle.shortName} selecionado.` };
    }

    const previous = VEHICLES[vehicle.order - 1];
    if (previous && !this.state.unlockedVehicles.includes(previous.id)) {
      return {
        ok: false,
        message: `Adquira ${previous.shortName} antes de avançar para esta era.`,
      };
    }
    const companyRequired = VEHICLE_UNLOCK_LEVELS[vehicle.id];
    if (this.companyLevel < companyRequired) {
      return {
        ok: false,
        message: `A empresa precisa chegar ao nível ${companyRequired}.`,
      };
    }
    if (
      vehicle.id !== "bike" &&
      this.state.buildingLevels.garage < vehicle.order
    ) {
      return {
        ok: false,
        message: `Melhore a Garagem para o nível ${vehicle.order}.`,
      };
    }
    if (vehicle.id === "planetary" && this.state.buildingLevels.planetLab < 1) {
      return { ok: false, message: "Construa o Laboratório Planetário." };
    }
    if (this.state.reputation < vehicle.reputationRequired) {
      return {
        ok: false,
        message: `Faltam ${vehicle.reputationRequired - this.state.reputation} pontos de reputação.`,
      };
    }
    if (this.state.credits < vehicle.cost) {
      return {
        ok: false,
        message: `Faltam XB$ ${vehicle.cost - this.state.credits} para este veículo.`,
      };
    }

    this.state.credits -= vehicle.cost;
    this.state.unlockedVehicles.push(vehicle.id);
    this.state.vehicleLevels[vehicle.id] = 1;
    this.state.selectedVehicleId = vehicle.id;
    if (vehicle.id === "moto" && this.state.onboardingStep === 3) {
      this.state.onboardingStep = 4;
    }
    this.refreshAndRecordExpansion();
    this.save();
    return { ok: true, message: `${vehicle.name} entrou para a frota.` };
  }

  selectVehicle(id: VehicleId): StoreActionResult {
    if (!this.state.unlockedVehicles.includes(id)) {
      return { ok: false, message: "Este veículo ainda não foi adquirido." };
    }
    this.state.selectedVehicleId = id;
    this.save();
    return {
      ok: true,
      message: `${getVehicle(id).shortName} pronto para operar.`,
    };
  }

  upgradeVehicle(id: VehicleId): StoreActionResult {
    if (!this.state.unlockedVehicles.includes(id)) {
      return {
        ok: false,
        message: "Adquira este veículo antes de melhorá-lo.",
      };
    }
    if (this.isVehicleOccupied(id)) {
      return {
        ok: false,
        message: "O veículo está em rota e não pode ser melhorado agora.",
      };
    }
    const current = this.state.vehicleLevels[id] || 1;
    if (current >= 5) return { ok: false, message: "Veículo no nível máximo." };
    const garageLimit = Math.max(
      1,
      Math.min(5, this.state.buildingLevels.garage)
    );
    if (current >= garageLimit) {
      return {
        ok: false,
        message: "Melhore a Garagem para ampliar este veículo.",
      };
    }
    const vehicle = getVehicle(id);
    const cost = vehicleUpgradeCost(vehicle.cost, current);
    if (this.state.credits < cost) {
      return { ok: false, message: `Faltam XB$ ${cost - this.state.credits}.` };
    }
    this.state.credits -= cost;
    this.state.vehicleLevels[id] = current + 1;
    this.recordMission("upgrade", 1);
    this.save();
    return {
      ok: true,
      message: `${vehicle.shortName} agora está no nível ${current + 1}.`,
    };
  }

  upgradeTire(stat: TireStat): StoreActionResult {
    const current = this.state.tireLevels[stat];
    if (current >= TIRE_MAX_LEVEL) {
      return { ok: false, message: "Esta tecnologia já está no nível máximo." };
    }
    if (current >= this.state.buildingLevels.workshop) {
      return {
        ok: false,
        message: "Melhore a Oficina de Pneus antes desta pesquisa.",
      };
    }
    const cost = tireUpgradeCost(stat, current);
    if (this.state.credits < cost) {
      return {
        ok: false,
        message: `Faltam XB$ ${cost - this.state.credits} para a melhoria.`,
      };
    }
    this.state.credits -= cost;
    this.state.tireLevels[stat] += 1;
    this.recordMission("upgrade", 1);
    this.save();
    return {
      ok: true,
      message: `Pneu atualizado para o nível ${current + 1}.`,
    };
  }

  equipCompound(
    vehicleId: VehicleId,
    compoundId: TireCompoundId
  ): StoreActionResult {
    if (!this.state.unlockedVehicles.includes(vehicleId)) {
      return {
        ok: false,
        message: "Adquira o veículo antes de equipar seus pneus.",
      };
    }
    if (this.isVehicleOccupied(vehicleId)) {
      return {
        ok: false,
        message: "O veículo está em rota. Troque o composto quando ele voltar.",
      };
    }
    const compound = getCompound(compoundId);
    if (
      !isCompoundUnlocked(
        compound,
        this.state.buildingLevels.workshop,
        this.state.buildingLevels.planetLab
      )
    ) {
      const requirement = compound.planetLabLevel
        ? `Oficina ${compound.workshopLevel} e Laboratório ${compound.planetLabLevel}`
        : `Oficina ${compound.workshopLevel}`;
      return { ok: false, message: `${compound.name} exige ${requirement}.` };
    }
    this.state.equippedCompounds[vehicleId] = compoundId;
    this.save();
    return {
      ok: true,
      message: `${compound.name} equipado em ${getVehicle(vehicleId).shortName}.`,
    };
  }

  maintainVehicleTires(vehicleId: VehicleId): StoreActionResult {
    if (!this.state.unlockedVehicles.includes(vehicleId)) {
      return { ok: false, message: "Veículo ainda não adquirido." };
    }
    if (this.isVehicleOccupied(vehicleId)) {
      return {
        ok: false,
        message: "O veículo está em rota e não pode entrar na oficina.",
      };
    }
    const condition = this.state.tireCondition[vehicleId];
    if (condition >= 100) {
      return { ok: false, message: "Pneus já estão em condição máxima." };
    }
    const cost = maintenanceCost(
      vehicleId,
      condition,
      vehicleId === "bike" ? this.state.bikePartLevels : undefined
    );
    if (this.state.credits < cost) {
      if (vehicleId === "bike" && condition < 15) {
        this.state.tireCondition.bike = 40;
        this.save();
        return {
          ok: true,
          message:
            "Revisão emergencial XB aplicada sem custo. A bicicleta voltou a 40%; faça uma revisão completa quando houver caixa.",
        };
      }
      return {
        ok: false,
        message: `Faltam XB$ ${cost - this.state.credits} para a manutenção.`,
      };
    }
    this.state.credits -= cost;
    this.state.tireCondition[vehicleId] = 100;
    this.save();
    return {
      ok: true,
      message: `${getVehicle(vehicleId).shortName} voltou a 100% de durabilidade.`,
    };
  }

  upgradeBuilding(id: BuildingId): StoreActionResult {
    const building = BUILDINGS.find(item => item.id === id);
    if (!building) return { ok: false, message: "Edifício não encontrado." };
    const current = this.state.buildingLevels[id];
    if (this.companyLevel < building.unlockLevel) {
      return {
        ok: false,
        message: `Libera no nível ${building.unlockLevel} da empresa.`,
      };
    }
    if (current >= building.maxLevel) {
      return {
        ok: false,
        message: `${building.shortName} já está no nível máximo.`,
      };
    }
    if (id !== "hq" && current >= this.state.buildingLevels.hq) {
      return { ok: false, message: "Melhore a Sede antes deste edifício." };
    }
    if (id === "hq" && current >= Math.ceil(this.companyLevel / 2) + 1) {
      return {
        ok: false,
        message: "Suba o nível da empresa antes de ampliar a Sede.",
      };
    }
    const cost = buildingUpgradeCost(building, current);
    if (this.state.credits < cost) {
      return {
        ok: false,
        message: `Faltam XB$ ${cost - this.state.credits} para a obra.`,
      };
    }
    this.state.credits -= cost;
    this.state.buildingLevels[id] = current + 1;
    if (this.state.onboardingStep === 2 && id === "garage") {
      this.state.onboardingStep = 3;
    }
    this.recordMission("upgrade", 1);
    this.refreshAndRecordExpansion();
    this.save();
    return {
      ok: true,
      message: `${building.shortName} chegou ao nível ${current + 1}.`,
    };
  }

  /** Returns a preview without mutating credits or reserving the vehicle. */
  /** Previsao pura: nao move credito, nao reserva veiculo, nao muta estado. */
  previewRoute(
    routeId: string,
    preferredVehicleId?: VehicleId
  ): StartRunResult {
    return this.prepareRoute(
      routeId,
      preferredVehicleId,
      true,
      undefined,
      false
    );
  }

  startPilotedRoute(routeId?: string): StartRunResult {
    if (this.pilotedPlan) {
      return {
        ok: false,
        message: "Já existe uma rota pilotada em andamento.",
      };
    }
    const resolvedRouteId = routeId ?? this.defaultPilotedRouteId();
    if (!resolvedRouteId) {
      return {
        ok: false,
        message: "Nenhum contrato está disponível para pilotar.",
      };
    }
    const prepared = this.prepareRoute(resolvedRouteId, undefined, true);
    if (!prepared.ok || !prepared.plan) return prepared;
    const plan = clone(prepared.plan);
    const run = this.initialRunSnapshot(plan);
    const now = Date.now();
    this.pilotedPlan = plan;
    this.state.activePilotedRun = {
      plan,
      run,
      reservedAt: now,
      updatedAt: now,
    };
    this.state.credits -= plan.operatingCost;
    if (this.state.onboardingStep === 0) this.state.onboardingStep = 1;
    this.save();
    return {
      ...prepared,
      plan: clone(plan),
      run: clone(run),
      message: `${ROUTES.find(route => route.id === resolvedRouteId)?.name ?? "Rota"} pronta. Custo operacional reservado: XB$ ${prepared.plan.operatingCost}.`,
    };
  }

  dispatchRoute(routeId: string, now = Date.now()): StoreActionResult {
    if (
      this.state.activeDeliveries.some(
        delivery => delivery.routeId === routeId
      ) ||
      this.pilotedPlan?.routeId === routeId
    ) {
      return { ok: false, message: "Este contrato já está em andamento." };
    }
    const slots = deliverySlotCount(this.state.buildingLevels.dispatch);
    const managedDeliveries = this.state.activeDeliveries.filter(
      delivery => !delivery.automated
    ).length;
    if (managedDeliveries >= slots) {
      return {
        ok: false,
        message: "Todos os slots de entrega estão ocupados.",
      };
    }
    const prepared = this.prepareRoute(routeId, undefined, true);
    if (!prepared.ok || !prepared.plan) return prepared;
    const plan = prepared.plan;
    const delivery: ActiveDelivery = {
      instanceId: `${routeId}-${Math.max(0, Math.floor(now))}-${this.state.activeDeliveries.length}`,
      routeId,
      vehicleId: plan.vehicleId,
      startedAt: now,
      completesAt: now + plan.duration * 1000,
      compoundId: plan.compoundId,
      terrain: plan.terrain,
      weather: plan.weather,
      tireFit: plan.tireFit,
      expectedWear: plan.expectedWear,
      durationSeconds: plan.duration,
      grossReward: plan.grossReward,
      operatingCost: plan.operatingCost,
      netReward: plan.netReward,
      xpReward: plan.xpReward,
      reputationReward: plan.reputationReward,
      distance: plan.distance,
      conditionAtDispatch: plan.conditionAtStart,
      costBreakdown: clone(plan.costBreakdown),
      operatorId: "player",
      vehicleUnitId: plan.vehicleUnitId,
      automated: false,
    };
    this.state.credits -= plan.operatingCost;
    this.state.activeDeliveries.push(delivery);
    if (this.state.onboardingStep === 0) this.state.onboardingStep = 1;
    this.save();
    return {
      ok: true,
      message: `${ROUTES.find(route => route.id === routeId)?.name ?? "Rota"} despachada com ${getCompound(plan.compoundId).name}. Retorno em ${Math.ceil(plan.duration)}s; lucro previsto XB$ ${plan.netReward}.`,
      tireFit: plan.tireFit,
      operatingCost: plan.operatingCost,
      netReward: plan.netReward,
    };
  }

  dispatchAutomatedRoute(
    routeId: string,
    courierId?: CourierId,
    now = Date.now()
  ): StoreActionResult {
    if (
      this.state.activeDeliveries.some(
        delivery => delivery.routeId === routeId
      ) ||
      this.pilotedPlan?.routeId === routeId
    ) {
      return { ok: false, message: "Este contrato já está em andamento." };
    }
    /*
     * Sem operador escolhido, a central pega um livre — mas so serve quem
     * dirige a classe que a rota pede. Antes o despacho automatico mandava
     * qualquer operador e preparava a rota como se fosse sempre bicicleta;
     * com a XB tendo carreta, isso mandaria um ciclista atravessar o pais.
     */
    const rotaDaVez = ROUTES.find(route => route.id === routeId);
    const livre = (item: HiredCourier) =>
      !this.state.activeDeliveries.some(
        delivery => delivery.operatorId === item.id
      );
    const courier = courierId
      ? this.state.hiredCouriers.find(item => item.id === courierId)
      : this.state.hiredCouriers.find(
          item => livre(item) && item.vehicleId === rotaDaVez?.requiredVehicle
        );
    if (!courier) {
      return { ok: false, message: "Nenhum operador automático está livre." };
    }
    if (rotaDaVez && courier.vehicleId !== rotaDaVez.requiredVehicle) {
      return {
        ok: false,
        message: `${courier.name} não dirige o veículo desta rota.`,
      };
    }
    if (
      this.state.activeDeliveries.some(
        delivery =>
          delivery.operatorId === courier.id ||
          delivery.vehicleUnitId === courier.vehicleUnitId
      ) ||
      this.pilotedPlan?.vehicleUnitId === courier.vehicleUnitId
    ) {
      return { ok: false, message: `${courier.name} ainda está em rota.` };
    }
    const automatedInFlight = this.state.activeDeliveries.filter(
      delivery => delivery.automated
    ).length;
    if (automatedInFlight >= this.operations.automatedSlots) {
      return {
        ok: false,
        message: "Todos os slots automáticos estão ocupados.",
      };
    }
    const prepared = this.prepareRoute(
      routeId,
      courier.vehicleId,
      false,
      courier.vehicleUnitId
    );
    if (!prepared.ok || !prepared.plan) return prepared;
    const basePlan = prepared.plan;
    /*
     * O salario do operador SUBSTITUI a mao de obra da rota, e nao soma com
     * ela.
     *
     * Antes somava, e isso passou a ser cobranca dupla no momento em que o
     * custo por km deixou de ser inventado: hoje a linha `labor` de
     * `operatingCosts` JA e o repasse ao condutor, tirado da conta de frete.
     * Pagar os dois seria pagar dois motoristas para dirigir um veiculo so —
     * um erro que nao aparece na tela, so no caixa, e sempre no vermelho.
     */
    const salary = Math.max(
      1,
      Math.round(basePlan.grossReward * courier.wageRate)
    );
    const costBreakdown = {
      ...basePlan.costBreakdown,
      labor: salary,
      total: basePlan.costBreakdown.total - basePlan.costBreakdown.labor + salary,
    };
    const plan: RouteRunPlan = {
      ...basePlan,
      costBreakdown,
      operatingCost: costBreakdown.total,
      netReward: basePlan.grossReward - costBreakdown.total,
    };
    if (this.state.credits < plan.operatingCost) {
      return {
        ok: false,
        message: `Faltam XB$ ${plan.operatingCost - this.state.credits} para custo e salário.`,
        operatingCost: plan.operatingCost,
      };
    }
    const delivery: ActiveDelivery = {
      instanceId: `${routeId}-${Math.max(0, Math.floor(now))}-${courier.id}`,
      routeId,
      vehicleId: courier.vehicleId,
      startedAt: now,
      completesAt: now + plan.duration * 1000,
      compoundId: plan.compoundId,
      terrain: plan.terrain,
      weather: plan.weather,
      tireFit: plan.tireFit,
      expectedWear: plan.expectedWear,
      durationSeconds: plan.duration,
      grossReward: plan.grossReward,
      operatingCost: plan.operatingCost,
      netReward: plan.netReward,
      xpReward: plan.xpReward,
      reputationReward: plan.reputationReward,
      distance: plan.distance,
      conditionAtDispatch: plan.conditionAtStart,
      costBreakdown: clone(plan.costBreakdown),
      operatorId: courier.id,
      vehicleUnitId: courier.vehicleUnitId,
      automated: true,
    };
    this.state.credits -= plan.operatingCost;
    this.state.activeDeliveries.push(delivery);
    this.save();
    return {
      ok: true,
      message: `${courier.name} iniciou ${ROUTES.find(route => route.id === routeId)?.name ?? "a rota"}. Lucro líquido previsto XB$ ${plan.netReward}.`,
      courierId: courier.id,
      operatingCost: plan.operatingCost,
      netReward: plan.netReward,
    };
  }

  collectDelivery(instanceId: string, now = Date.now()): StoreActionResult {
    const delivery = this.state.activeDeliveries.find(
      item => item.instanceId === instanceId
    );
    if (!delivery) return { ok: false, message: "Entrega não encontrada." };
    if (now < delivery.completesAt) {
      return { ok: false, message: "A equipe ainda está na rota." };
    }
    const route = ROUTES.find(item => item.id === delivery.routeId);
    if (!route) return { ok: false, message: "Contrato não encontrado." };

    const levelBefore = this.companyLevel;
    this.state.tireCondition[delivery.vehicleId] = Math.max(
      0,
      (this.state.tireCondition[delivery.vehicleId] ?? 100) -
        delivery.expectedWear
    );
    // Cost was reserved on dispatch; collection releases the immutable gross.
    this.state.credits += delivery.grossReward;
    this.state.companyXp += delivery.xpReward;
    this.state.reputation += delivery.reputationReward;
    this.state.deliveries += 1;
    this.state.totalDistance += delivery.distance;
    this.state.activeDeliveries = this.state.activeDeliveries.filter(
      item => item.instanceId !== instanceId
    );
    if (!this.state.completedRouteIds.includes(route.id)) {
      this.state.completedRouteIds.push(route.id);
    }
    if (this.state.onboardingStep === 1) this.state.onboardingStep = 2;
    this.recordMission("deliveries", 1);
    this.recordMission("revenue", Math.max(0, delivery.netReward));
    if (delivery.tireFit === "ideal") this.recordMission("idealTire", 1);
    this.refreshAndRecordExpansion();
    const levelAfter = this.companyLevel;
    this.save();
    return {
      ok: true,
      message:
        levelAfter > levelBefore
          ? `Entrega coletada. Lucro XB$ ${delivery.netReward}; empresa no nível ${levelAfter}!`
          : `Entrega coletada. Lucro líquido XB$ ${delivery.netReward}.`,
      creditsEarned: delivery.netReward,
      xpEarned: delivery.xpReward,
      reputationEarned: delivery.reputationReward,
      levelBefore,
      levelAfter,
      tireWear: delivery.expectedWear,
      tireFit: delivery.tireFit,
      operatingCost: delivery.operatingCost,
      netReward: delivery.netReward,
    };
  }

  collectCompletedDeliveries(now = Date.now()): CollectCompletedResult {
    const completedIds = this.state.activeDeliveries
      .filter(delivery => delivery.completesAt <= now)
      .map(delivery => delivery.instanceId);
    let totalNetReward = 0;
    let collected = 0;
    for (const instanceId of completedIds) {
      const result = this.collectDelivery(instanceId, now);
      if (!result.ok) continue;
      collected += 1;
      totalNetReward += result.netReward ?? 0;
    }
    return {
      ok: collected > 0,
      message:
        collected > 0
          ? `${collected} entrega(s) coletada(s). Lucro líquido XB$ ${totalNetReward}.`
          : "Nenhuma entrega concluída para coletar.",
      collected,
      totalNetReward,
      netReward: totalNetReward,
      creditsEarned: totalNetReward,
    };
  }

  applyRunResult(result: RunResult): void {
    const plan = this.pilotedPlan;
    const vehicleId =
      result.vehicleId ?? plan?.vehicleId ?? this.state.selectedVehicleId;
    const gross = Math.max(
      0,
      result.grossCreditsEarned ??
        result.creditsEarned + (result.operatingCost ?? 0)
    );
    // The route cost was reserved when the run began.
    this.state.credits += gross;
    this.state.reputation += Math.max(0, result.reputationEarned);
    this.state.companyXp += Math.max(
      0,
      result.xpEarned ??
        (result.success ? (plan?.xpReward ?? result.reputationEarned * 2) : 0)
    );
    this.state.deliveries += result.success ? 1 : 0;
    this.state.totalDistance += Math.max(0, result.distance);
    const wear = Math.max(
      0,
      result.tireWear ??
        (plan
          ? Math.ceil(plan.expectedWear * (result.success ? 1 : 1.25))
          : result.success
            ? 5
            : 9)
    );
    this.state.tireCondition[vehicleId] = Math.max(
      0,
      (this.state.tireCondition[vehicleId] ?? 100) - wear
    );
    if (result.success) {
      this.recordMission("deliveries", 1);
      const routeId = result.routeId ?? plan?.routeId;
      if (
        routeId &&
        ROUTE_IDS.has(routeId) &&
        !this.state.completedRouteIds.includes(routeId)
      ) {
        this.state.completedRouteIds.push(routeId);
      }
      if ((result.tireFit ?? plan?.tireFit) === "ideal") {
        this.recordMission("idealTire", 1);
      }
    }
    this.recordMission(
      "revenue",
      Math.max(0, result.netCreditsEarned ?? result.creditsEarned)
    );
    this.pilotedPlan = null;
    this.state.activePilotedRun = null;
    this.refreshAndRecordExpansion();
    this.save();
  }

  claimDailyMission(id: string): StoreActionResult {
    this.ensureDailyMissions();
    const mission = this.state.dailyMissions.find(item => item.id === id);
    if (!mission)
      return { ok: false, message: "Missão diária não encontrada." };
    if (!missionComplete(mission)) {
      return { ok: false, message: "Complete a meta antes de coletar." };
    }
    if (mission.claimed)
      return { ok: false, message: "Recompensa já coletada." };
    mission.claimed = true;
    this.state.credits += mission.rewardCredits;
    this.state.companyXp += mission.rewardXp;
    this.state.reputation += mission.rewardReputation;
    this.refreshAndRecordExpansion();
    this.save();
    return {
      ok: true,
      message: `${mission.title}: XB$ ${mission.rewardCredits} e ${mission.rewardXp} XP coletados.`,
      creditsEarned: mission.rewardCredits,
      xpEarned: mission.rewardXp,
      reputationEarned: mission.rewardReputation,
    };
  }

  reset(): void {
    this.pilotedPlan = null;
    this.state = this.demo ? createDemoState() : createDefaultCampaignState();
    this.ensureDailyMissions();
    this.save();
  }

  private initialRunSnapshot(plan: RouteRunPlan): RunSnapshot {
    return {
      elapsed: 0,
      duration: plan.duration,
      progress: 0,
      distance: 0,
      integrity: 100,
      cargo: 0,
      tireTokens: 0,
      score: 0,
      combo: 0,
      impactSerial: 0,
      paused: false,
      laneIndex: 1,
      routeId: plan.routeId,
      vehicleId: plan.vehicleId,
      vehicleUnitId: plan.vehicleUnitId,
      compoundId: plan.compoundId,
      terrain: plan.terrain,
      weather: plan.weather,
      tireFit: plan.tireFit,
      grossReward: plan.grossReward,
      operatingCost: plan.operatingCost,
      projectedNetReward: plan.netReward,
      expectedWear: plan.expectedWear,
      turboEnergy: 0,
      turboActive: false,
      turboSecondsRemaining: 0,
      turboActivations: 0,
      perfectRouteEligible: true,
    };
  }

  private vehicleUnitIds(vehicleId: VehicleId): string[] {
    const count = vehicleId === "bike" ? this.state.bikeFleetSize : 1;
    return Array.from(
      { length: Math.max(1, Math.floor(count)) },
      (_, index) => `${vehicleId}-${index + 1}`
    );
  }

  private isVehicleUnitOccupied(vehicleUnitId: string): boolean {
    return (
      this.pilotedPlan?.vehicleUnitId === vehicleUnitId ||
      this.state.activeDeliveries.some(
        delivery => delivery.vehicleUnitId === vehicleUnitId
      )
    );
  }

  private firstAvailableVehicleUnit(vehicleId: VehicleId): string | undefined {
    return this.vehicleUnitIds(vehicleId).find(
      unitId => !this.isVehicleUnitOccupied(unitId)
    );
  }

  private defaultPilotedRouteId(): string | undefined {
    const candidates = ROUTES.filter(route => {
      if (
        route.firstDelivery &&
        this.state.completedRouteIds.includes(route.id)
      )
        return false;
      return this.prepareRoute(route.id, undefined, false, undefined, false).ok;
    });
    return (
      candidates.find(
        route => !this.state.completedRouteIds.includes(route.id)
      ) ?? candidates[candidates.length - 1]
    )?.id;
  }

  private prepareRoute(
    routeId: string,
    preferredVehicleId?: VehicleId,
    enforceFunds = true,
    requiredVehicleUnitId?: string,
    allowUnlockRefresh = true
  ): StartRunResult {
    const route = ROUTES.find(item => item.id === routeId);
    if (!route) return { ok: false, message: "Contrato não encontrado." };
    // A previsao roda durante o render do React; destravar regiao aqui deixava
    // a tela contraditoria ate o proximo tique.
    if (allowUnlockRefresh) this.refreshUnlocks();
    if (
      route.firstDelivery &&
      this.state.completedRouteIds.includes(route.id)
    ) {
      return {
        ok: false,
        message: "A entrega inaugural só pode ser concluída uma vez.",
      };
    }
    if (
      this.state.activeDeliveries.some(
        delivery => delivery.routeId === route.id
      ) ||
      this.pilotedPlan?.routeId === route.id
    ) {
      return { ok: false, message: "Este contrato já está em andamento." };
    }
    if (!this.state.unlockedRegionIds.includes(route.regionId)) {
      return {
        ok: false,
        message: "Expanda a operação para liberar esta região.",
      };
    }
    const priorRegion = previousRegion(route.regionId);
    if (
      priorRegion &&
      (!this.state.unlockedRegionIds.includes(priorRegion.id) ||
        !routeCompletedInRegion(priorRegion.id, this.state.completedRouteIds))
    ) {
      return {
        ok: false,
        message: `Conclua ao menos uma rota em ${priorRegion.name} antes de avançar.`,
      };
    }
    if (this.companyLevel < route.requiredCompanyLevel) {
      return {
        ok: false,
        message: `Contrato disponível no nível ${route.requiredCompanyLevel}.`,
      };
    }

    const requiredOrder = getVehicle(route.requiredVehicle).order;
    const unitByVehicle = new Map<VehicleId, string>();
    const eligible = this.state.unlockedVehicles.filter(id => {
      if (getVehicle(id).order < requiredOrder) return false;
      const unitId = requiredVehicleUnitId
        ? this.vehicleUnitIds(id).includes(requiredVehicleUnitId) &&
          !this.isVehicleUnitOccupied(requiredVehicleUnitId)
          ? requiredVehicleUnitId
          : undefined
        : this.firstAvailableVehicleUnit(id);
      if (!unitId) return false;
      unitByVehicle.set(id, unitId);
      return true;
    });
    const requested = preferredVehicleId ?? this.state.selectedVehicleId;
    const selectedEligible = eligible.includes(requested)
      ? requested
      : eligible[eligible.length - 1];
    if (!selectedEligible) {
      const hasRequiredVehicle = this.state.unlockedVehicles.some(
        id => getVehicle(id).order >= requiredOrder
      );
      return {
        ok: false,
        message: hasRequiredVehicle
          ? "Todos os veículos compatíveis já estão em rota."
          : `A rota exige ${getVehicle(route.requiredVehicle).shortName}.`,
      };
    }
    const vehicleUnitId = unitByVehicle.get(selectedEligible);
    if (!vehicleUnitId) {
      return { ok: false, message: "Nenhuma unidade compatível está livre." };
    }
    if (selectedEligible === "bike" && route.requiredBikeParts) {
      const missing = BIKE_PARTS.find(part => {
        const requirement = route.requiredBikeParts?.[part.id] ?? 0;
        return this.state.bikePartLevels[part.id] < requirement;
      });
      if (missing) {
        return {
          ok: false,
          message: `${route.name} exige ${missing.shortName} nível ${route.requiredBikeParts[missing.id]}.`,
        };
      }
    }
    if (selectedEligible === "bike" && route.cargoKg) {
      const payload =
        getVehicle("bike").payload +
        bikePartEffects(this.state.bikePartLevels).payloadBonusKg;
      if (payload < route.cargoKg) {
        return {
          ok: false,
          message: `A carga exige ${route.cargoKg} kg; capacidade atual ${payload} kg.`,
        };
      }
    }
    const condition = this.state.tireCondition[selectedEligible] ?? 100;
    if (condition < 15) {
      return {
        ok: false,
        message: "Condição crítica dos pneus. Faça a manutenção antes da rota.",
      };
    }
    const plan = this.buildPlan(
      route,
      selectedEligible,
      condition,
      vehicleUnitId
    );
    if (enforceFunds && this.state.credits < plan.operatingCost) {
      return {
        ok: false,
        message: `Faltam XB$ ${plan.operatingCost - this.state.credits} para os custos operacionais.`,
        operatingCost: plan.operatingCost,
      };
    }
    return {
      ok: true,
      message: "Contrato disponível.",
      plan,
      tireFit: plan.tireFit,
      operatingCost: plan.operatingCost,
      netReward: plan.netReward,
    };
  }

  private buildPlan(
    route: RouteConfig,
    vehicleId: VehicleId,
    condition: number,
    vehicleUnitId = `${vehicleId}-1`
  ): RouteRunPlan {
    const region = REGIONS.find(item => item.id === route.regionId);
    const scale = region?.scale ?? "city";
    const compoundId = this.state.equippedCompounds[vehicleId] ?? "urban";
    const profile = operatingProfile(
      route.id,
      scale,
      compoundId,
      route.difficulty,
      this.state.dailyMissionDay
    );
    const vehicleLevel = this.state.vehicleLevels[vehicleId] || 1;
    const parts =
      vehicleId === "bike"
        ? bikePartEffects(this.state.bikePartLevels)
        : undefined;
    const isMvpLocalContract =
      vehicleId === "bike" &&
      (route.firstDelivery === true || route.operatingCostScale !== undefined);
    const duration = Math.max(
      3,
      (route.durationSeconds *
        (1 - Math.min(0.24, (vehicleLevel - 1) * 0.06)) *
        (isMvpLocalContract ? 1 : profile.durationMultiplier) *
        conditionDurationMultiplier(condition)) /
        (parts?.speedMultiplier ?? 1)
    );
    const distance = routeDistanceKm(
      route.distanceKm,
      route.durationSeconds,
      route.difficulty
    );
    const rawCosts = operatingCosts(
      vehicleId,
      distance,
      route.difficulty,
      scale,
      profile.terrain,
      profile.fit
    );
    const scaledCosts = scaleOperatingCosts(
      rawCosts,
      (route.operatingCostScale ?? 1) * (parts?.operatingCostMultiplier ?? 1)
    );
    // The inaugural delivery is an onboarding contract funded by XB.
    const costBreakdown = route.firstDelivery
      ? { fuelEnergy: 0, tolls: 0, labor: 0, maintenanceReserve: 0, total: 0 }
      : scaledCosts;
    const revenueMultiplier =
      1 +
      Math.max(0, this.state.buildingLevels.hq - 1) * 0.05 +
      this.state.buildingLevels.warehouse * 0.08 +
      this.state.tireLevels.efficiency * 0.08 +
      (vehicleLevel - 1) * 0.06;
    const grossReward = Math.max(
      0,
      Math.round(
        route.baseReward *
          revenueMultiplier *
          (isMvpLocalContract ? 1 : profile.revenueMultiplier) *
          conditionRevenueMultiplier(condition)
      )
    );
    const conditionWearPenalty = Math.floor(Math.max(0, 70 - condition) / 20);
    const expectedWear = Math.max(
      2,
      Math.ceil(profile.wear * (parts?.wearMultiplier ?? 1)) -
        this.state.tireLevels.durability +
        conditionWearPenalty
    );
    return {
      routeId: route.id,
      regionId: route.regionId,
      vehicleId,
      compoundId,
      terrain: profile.terrain,
      weather: profile.weather,
      tireFit: profile.fit,
      difficulty: route.difficulty,
      duration,
      grossReward,
      operatingCost: costBreakdown.total,
      netReward: grossReward - costBreakdown.total,
      xpReward: route.xpReward,
      reputationReward: Math.max(
        1,
        Math.round(
          route.reputationReward * (1 + (parts?.controlBonus ?? 0) / 200)
        )
      ),
      expectedWear,
      distance,
      conditionAtStart: condition,
      costBreakdown,
      vehicleUnitId,
    };
  }

  private refreshUnlocks(): number {
    const before = this.state.unlockedRegionIds.length;
    const level = this.companyLevel;
    REGIONS.forEach((region, index) => {
      if (this.state.unlockedRegionIds.includes(region.id)) return;
      const prior = index > 0 ? REGIONS[index - 1] : undefined;
      const priorReady =
        !prior ||
        (this.state.unlockedRegionIds.includes(prior.id) &&
          routeCompletedInRegion(prior.id, this.state.completedRouteIds));
      const requiredOrder = getVehicle(region.requiredVehicle).order;
      const vehicleReady = VEHICLES.slice(0, requiredOrder + 1).every(vehicle =>
        this.state.unlockedVehicles.includes(vehicle.id)
      );
      const planetaryReady =
        region.scale !== "world" || this.state.buildingLevels.planetLab > 0;
      if (
        priorReady &&
        level >= region.unlockLevel &&
        this.state.reputation >= region.reputationRequired &&
        vehicleReady &&
        planetaryReady
      ) {
        this.state.unlockedRegionIds.push(region.id);
      }
    });
    return this.state.unlockedRegionIds.length - before;
  }

  private refreshAndRecordExpansion(): void {
    const unlocked = this.refreshUnlocks();
    if (unlocked > 0) this.recordMission("expansion", unlocked);
  }

  private recordMission(kind: DailyMissionKind, amount: number): void {
    if (amount <= 0) return;
    this.ensureDailyMissions();
    this.state.dailyMissions = progressDailyMissions(
      this.state.dailyMissions,
      kind,
      amount
    );
  }

  private missionAvailability(): Partial<Record<DailyMissionKind, boolean>> {
    const canUpgradeBuilding = BUILDINGS.some(
      building => this.state.buildingLevels[building.id] < building.maxLevel
    );
    const canUpgradeVehicle = this.state.unlockedVehicles.some(
      id => (this.state.vehicleLevels[id] || 1) < 5
    );
    const canUpgradeTire = Object.values(this.state.tireLevels).some(
      level => level < TIRE_MAX_LEVEL
    );
    const canUpgradeBikePart = Object.values(this.state.bikePartLevels).some(
      level => level < MAX_BIKE_PART_LEVEL
    );
    return {
      upgrade:
        canUpgradeBuilding ||
        canUpgradeVehicle ||
        canUpgradeTire ||
        canUpgradeBikePart,
      expansion: this.state.unlockedRegionIds.length < REGIONS.length,
    };
  }

  private ensureDailyMissions(): void {
    const today = dayKey();
    if (
      this.state.dailyMissionDay === today &&
      this.state.dailyMissions.length === 3
    ) {
      return;
    }
    this.state.dailyMissions.forEach(mission => {
      if (!mission.claimed && missionComplete(mission)) {
        this.state.credits += mission.rewardCredits;
        this.state.companyXp += mission.rewardXp;
        this.state.reputation += mission.rewardReputation;
      }
    });
    this.state.dailyMissionDay = today;
    this.state.dailyMissions = generateDailyMissions(
      today,
      this.companyLevel,
      this.missionAvailability()
    );
    const newlyUnlocked = this.refreshUnlocks();
    if (newlyUnlocked > 0) {
      this.state.dailyMissions = progressDailyMissions(
        this.state.dailyMissions,
        "expansion",
        newlyUnlocked
      );
    }
    this.save();
  }

  private load(): CampaignState {
    const storage = this.storage();
    if (!storage) return createDefaultCampaignState();
    for (const key of [
      CAMPAIGN_STORAGE_KEY,
      PREVIOUS_CAMPAIGN_STORAGE_KEY,
      LEGACY_CAMPAIGN_STORAGE_KEY,
    ]) {
      try {
        const raw = storage.getItem(key);
        if (raw) return this.sanitizePersistedJson(raw);
      } catch {
        // Try the previous save generation before starting a fresh campaign.
      }
    }
    return createDefaultCampaignState();
  }

  private sanitizePersistedJson(raw: string): CampaignState {
    const value = JSON.parse(raw) as
      | Partial<PersistedCampaignV3>
      | { version?: number; state?: unknown }
      | Partial<CampaignState>;
    const candidate =
      value && typeof value === "object" && "state" in value && value.state
        ? value.state
        : value;
    return this.sanitize(candidate);
  }

  private sanitize(input: unknown): CampaignState {
    const parsed =
      input && typeof input === "object"
        ? (input as Partial<CampaignState>)
        : {};
    const fallback = createDefaultCampaignState();
    const requestedVehicles = new Set(
      Array.isArray(parsed.unlockedVehicles)
        ? parsed.unlockedVehicles.filter((id): id is VehicleId =>
            VEHICLE_IDS.includes(id as VehicleId)
          )
        : ["bike"]
    );
    requestedVehicles.add("bike");
    // A corrupted/old save cannot skip eras: retain only the contiguous prefix.
    const unlockedVehicles: VehicleId[] = [];
    for (const vehicle of VEHICLES) {
      if (!requestedVehicles.has(vehicle.id)) break;
      unlockedVehicles.push(vehicle.id);
    }
    const vehicleLevels = emptyVehicleLevels();
    unlockedVehicles.forEach(id => {
      vehicleLevels[id] = Math.round(
        clamp(parsed.vehicleLevels?.[id], 1, 5, 1)
      );
    });

    const buildingLevels = emptyBuildingLevels();
    BUILDINGS.forEach(building => {
      buildingLevels[building.id] = Math.round(
        clamp(parsed.buildingLevels?.[building.id], 0, building.maxLevel, 0)
      );
    });
    buildingLevels.hq = Math.max(1, buildingLevels.hq);
    buildingLevels.garage = Math.max(1, buildingLevels.garage);

    const bikePartLevels = emptyBikePartLevels();
    BIKE_PARTS.forEach(part => {
      bikePartLevels[part.id] = Math.round(
        clamp(parsed.bikePartLevels?.[part.id], 0, MAX_BIKE_PART_LEVEL, 0)
      );
    });
    /*
     * A frota agora e por classe. Save antigo so tinha `bikeFleetSize`, entao
     * ele vira a contagem de bicicletas e o resto comeca em zero — que e
     * exatamente a operacao que aquele save descrevia.
     */
    const frotaSalva = (parsed.vehicleFleet ?? {}) as Partial<
      Record<VehicleId, number>
    >;
    const vehicleFleet = {
      bike: 1,
      moto: 0,
      van: 0,
      truck: 0,
      fleet: 0,
      planetary: 0,
    } as Record<VehicleId, number>;
    VEHICLES.forEach(vehicle => {
      const teto = frotaMaxima(
        VEHICLE_UNLOCK_LEVELS[vehicle.id],
        MAX_COMPANY_LEVEL
      );
      /*
       * A bicicleta tem dois campos possiveis no save: o `vehicleFleet.bike`
       * novo e o `bikeFleetSize` antigo, que continua sendo escrito como
       * espelho. Quando os dois aparecem e discordam, vale o maior — assim
       * uma bicicleta comprada nunca some por causa de qual campo foi lido.
       */
      const salvo =
        vehicle.id === "bike"
          ? Math.max(
              clamp(parsed.bikeFleetSize, 1, teto, 1),
              clamp(frotaSalva.bike, 1, teto, 1)
            )
          : frotaSalva[vehicle.id];
      vehicleFleet[vehicle.id] = Math.round(
        clamp(salvo, vehicle.id === "bike" ? 1 : 0, teto, vehicle.id === "bike" ? 1 : 0)
      );
    });
    const bikeFleetSize = vehicleFleet.bike;
    const operationalPointsCapacity = Math.round(
      clamp(
        parsed.operationalPointsCapacity,
        STARTING_OPERATIONAL_POINTS,
        1_000,
        STARTING_OPERATIONAL_POINTS
      )
    );
    const hiredCouriers = this.sanitizeCouriers(
      parsed.hiredCouriers,
      vehicleFleet,
      operationalPointsCapacity
    );

    const equippedCompounds = defaultCompounds();
    const tireCondition = fullTireCondition();
    VEHICLE_IDS.forEach(id => {
      const compound = parsed.equippedCompounds?.[id];
      if (compound && COMPOUND_IDS.has(compound))
        equippedCompounds[id] = compound;
      tireCondition[id] = clamp(parsed.tireCondition?.[id], 0, 100, 100);
    });

    const requestedRegions = new Set(
      Array.isArray(parsed.unlockedRegionIds)
        ? parsed.unlockedRegionIds.filter(
            (id): id is string => typeof id === "string" && REGION_IDS.has(id)
          )
        : ["divinopolis"]
    );
    requestedRegions.add("divinopolis");
    const unlockedRegionIds: string[] = [];
    for (const region of REGIONS) {
      if (!requestedRegions.has(region.id)) break;
      unlockedRegionIds.push(region.id);
    }

    const completedRouteIds = unique(
      Array.isArray(parsed.completedRouteIds)
        ? parsed.completedRouteIds.filter(
            (id): id is string => typeof id === "string" && ROUTE_IDS.has(id)
          )
        : []
    );
    const selected = parsed.selectedVehicleId;
    const state: CampaignState = {
      /*
       * Nome e entregador vem do save, mas passam pela mesma limpeza da tela.
       * Um save editado a mao com nome de mil caracteres ou com invisiveis
       * colados nao pode vazar para dentro do jogo.
       */
      playerName: limparNome(parsed.playerName),
      playerAvatarId: ehEntregador(parsed.playerAvatarId)
        ? parsed.playerAvatarId
        : "",
      credits: Math.max(0, Math.round(finite(parsed.credits))),
      reputation: Math.max(0, Math.round(finite(parsed.reputation))),
      companyXp: Math.max(
        0,
        Math.round(
          finite(parsed.companyXp, Math.max(0, finite(parsed.reputation)) * 2)
        )
      ),
      deliveries: Math.max(0, Math.round(finite(parsed.deliveries))),
      totalDistance: Math.max(0, Math.round(finite(parsed.totalDistance))),
      selectedVehicleId:
        selected && unlockedVehicles.includes(selected)
          ? selected
          : fallback.selectedVehicleId,
      unlockedVehicles,
      vehicleLevels,
      tireLevels: {
        grip: Math.round(clamp(parsed.tireLevels?.grip, 0, TIRE_MAX_LEVEL)),
        durability: Math.round(
          clamp(parsed.tireLevels?.durability, 0, TIRE_MAX_LEVEL)
        ),
        efficiency: Math.round(
          clamp(parsed.tireLevels?.efficiency, 0, TIRE_MAX_LEVEL)
        ),
        capacity: Math.round(
          clamp(parsed.tireLevels?.capacity, 0, TIRE_MAX_LEVEL)
        ),
      },
      buildingLevels,
      unlockedRegionIds,
      activeDeliveries: [],
      activePilotedRun: null,
      completedRouteIds,
      onboardingStep: Math.round(clamp(parsed.onboardingStep, 0, 4)),
      equippedCompounds,
      tireCondition,
      dailyMissionDay:
        typeof parsed.dailyMissionDay === "string"
          ? parsed.dailyMissionDay
          : dayKey(),
      dailyMissions: this.sanitizeMissions(parsed.dailyMissions),
      bikePartLevels,
      vehicleFleet,
      bikeFleetSize,
      operationalPointsCapacity,
      hiredCouriers,
    };
    VEHICLE_IDS.forEach(id => {
      const compound = getCompound(state.equippedCompounds[id]);
      if (
        !isCompoundUnlocked(
          compound,
          state.buildingLevels.workshop,
          state.buildingLevels.planetLab
        )
      ) {
        state.equippedCompounds[id] = "urban";
      }
    });
    state.activeDeliveries = this.sanitizeDeliveries(
      parsed.activeDeliveries,
      state
    );
    state.activePilotedRun = this.sanitizeActivePilotedRun(
      parsed.activePilotedRun,
      state
    );
    return state;
  }

  private sanitizeActivePilotedRun(
    input: unknown,
    state: CampaignState
  ): ActivePilotedRun | null {
    if (!input || typeof input !== "object") return null;
    const raw = input as Partial<ActivePilotedRun>;
    const plan = this.sanitizePilotedPlan(raw.plan, state);
    if (!plan) return null;
    if (
      state.activeDeliveries.some(
        delivery =>
          delivery.routeId === plan.routeId ||
          delivery.vehicleUnitId === plan.vehicleUnitId
      )
    ) {
      return null;
    }
    const reservedAt = Math.max(0, finite(raw.reservedAt, Date.now()));
    const updatedAt = Math.max(reservedAt, finite(raw.updatedAt, reservedAt));
    return {
      plan,
      run: this.sanitizeRunSnapshot(raw.run, plan, state),
      reservedAt,
      updatedAt,
    };
  }

  private sanitizePilotedPlan(
    input: unknown,
    state: CampaignState
  ): RouteRunPlan | null {
    if (!input || typeof input !== "object") return null;
    const raw = input as Partial<RouteRunPlan>;
    const route = ROUTES.find(item => item.id === raw.routeId);
    const vehicleId = raw.vehicleId;
    const compoundId = raw.compoundId;
    const vehicleUnitId =
      vehicleId && typeof raw.vehicleUnitId === "string"
        ? raw.vehicleUnitId
        : vehicleId
          ? `${vehicleId}-1`
          : "";
    if (
      !route ||
      !vehicleId ||
      !VEHICLE_IDS.includes(vehicleId) ||
      !state.unlockedVehicles.includes(vehicleId) ||
      !this.vehicleUnitIdsForState(vehicleId, state).includes(vehicleUnitId) ||
      getVehicle(vehicleId).order < getVehicle(route.requiredVehicle).order ||
      raw.regionId !== route.regionId ||
      !state.unlockedRegionIds.includes(route.regionId) ||
      !compoundId ||
      !COMPOUND_IDS.has(compoundId) ||
      state.equippedCompounds[vehicleId] !== compoundId ||
      !isCompoundUnlocked(
        getCompound(compoundId),
        state.buildingLevels.workshop,
        state.buildingLevels.planetLab
      ) ||
      !raw.weather ||
      !WEATHER_IDS.has(raw.weather)
    ) {
      return null;
    }
    const priorRegion = previousRegion(route.regionId);
    if (
      companyLevelFromXp(state.companyXp) < route.requiredCompanyLevel ||
      (priorRegion &&
        (!state.unlockedRegionIds.includes(priorRegion.id) ||
          !routeCompletedInRegion(priorRegion.id, state.completedRouteIds)))
    ) {
      return null;
    }
    const region = REGIONS.find(item => item.id === route.regionId);
    const terrain = terrainForRoute(route.id, region?.scale);
    const fit = evaluateTireFit(compoundId, terrain, raw.weather);
    if (raw.terrain !== terrain || raw.tireFit !== fit) return null;
    if (route.firstDelivery && state.completedRouteIds.includes(route.id)) {
      return null;
    }

    const duration = Number(raw.duration);
    const grossReward = Number(raw.grossReward);
    const operatingCost = Number(raw.operatingCost);
    const expectedWear = Number(raw.expectedWear);
    const conditionAtStart = Number(raw.conditionAtStart);
    const breakdown = raw.costBreakdown;
    if (
      !Number.isFinite(duration) ||
      duration < 1 ||
      duration > route.durationSeconds * 5 ||
      !Number.isFinite(grossReward) ||
      grossReward < 0 ||
      grossReward > 1_000_000_000 ||
      !Number.isFinite(operatingCost) ||
      operatingCost < 0 ||
      operatingCost > 1_000_000_000 ||
      !Number.isFinite(expectedWear) ||
      expectedWear < 0 ||
      expectedWear > 100 ||
      !Number.isFinite(conditionAtStart) ||
      conditionAtStart < 15 ||
      conditionAtStart > 100 ||
      // A condição do pneu no início da corrida não é comparada com a de
      // agora: a mesma frota pode ter sofrido desgaste por outra entrega
      // enquanto esta corrida estava em andamento, e exigir igualdade
      // descartava a corrida inteira junto com o custo já reservado.
      !breakdown
    ) {
      return null;
    }
    const fuelEnergy = Number(breakdown.fuelEnergy);
    const tolls = Number(breakdown.tolls);
    const labor = Number(breakdown.labor);
    const maintenanceReserve = Number(breakdown.maintenanceReserve);
    if (
      ![fuelEnergy, tolls, labor, maintenanceReserve].every(
        value => Number.isFinite(value) && value >= 0
      ) ||
      Math.abs(
        fuelEnergy + tolls + labor + maintenanceReserve - operatingCost
      ) > 0.01 ||
      Math.abs(Number(breakdown.total) - operatingCost) > 0.01
    ) {
      return null;
    }
    const distance = routeDistanceKm(
      route.distanceKm,
      route.durationSeconds,
      route.difficulty
    );
    return {
      routeId: route.id,
      regionId: route.regionId,
      vehicleId,
      compoundId,
      terrain,
      weather: raw.weather,
      tireFit: fit,
      difficulty: route.difficulty,
      duration,
      grossReward: Math.round(grossReward),
      operatingCost: Math.round(operatingCost),
      netReward: Math.round(grossReward - operatingCost),
      xpReward: route.xpReward,
      reputationReward: route.reputationReward,
      expectedWear,
      distance,
      conditionAtStart,
      costBreakdown: {
        fuelEnergy,
        tolls,
        labor,
        maintenanceReserve,
        total: Math.round(operatingCost),
      },
      vehicleUnitId,
    };
  }

  private sanitizeRunSnapshot(
    input: unknown,
    plan: RouteRunPlan,
    state: CampaignState,
    minimumElapsed = 0
  ): RunSnapshot {
    const raw =
      input && typeof input === "object" ? (input as Partial<RunSnapshot>) : {};
    const elapsed = clamp(
      raw.elapsed,
      Math.max(0, minimumElapsed),
      plan.duration,
      Math.max(0, minimumElapsed)
    );
    const progress = plan.duration > 0 ? elapsed / plan.duration : 0;
    const vehicleLevel = state.vehicleLevels[plan.vehicleId] || 1;
    const cargoLimit = vehicleCargoCapacity(
      getVehicle(plan.vehicleId),
      vehicleLevel,
      state.tireLevels.capacity
    );
    return {
      elapsed,
      duration: plan.duration,
      progress,
      distance: plan.distance * progress,
      integrity: clamp(raw.integrity, 0, 100, 100),
      cargo: Math.floor(clamp(raw.cargo, 0, cargoLimit)),
      tireTokens: Math.floor(clamp(raw.tireTokens, 0, 10_000)),
      score: clamp(raw.score, 0, 1_000_000_000_000),
      combo: Math.floor(clamp(raw.combo, 0, 10_000)),
      impactSerial: Math.floor(clamp(raw.impactSerial, 0, 1_000_000_000)),
      paused: raw.paused === true,
      laneIndex: Math.floor(clamp(raw.laneIndex, 0, 2, 1)) as 0 | 1 | 2,
      routeId: plan.routeId,
      vehicleId: plan.vehicleId,
      vehicleUnitId: plan.vehicleUnitId,
      compoundId: plan.compoundId,
      terrain: plan.terrain,
      weather: plan.weather,
      tireFit: plan.tireFit,
      grossReward: plan.grossReward,
      operatingCost: plan.operatingCost,
      projectedNetReward: plan.netReward,
      expectedWear: plan.expectedWear,
      turboEnergy: clamp(raw.turboEnergy, 0, 100, 0),
      turboActive: raw.turboActive === true,
      turboSecondsRemaining: clamp(
        raw.turboSecondsRemaining,
        0,
        Math.max(0, plan.duration),
        0
      ),
      turboActivations: Math.floor(
        clamp(raw.turboActivations, 0, 10_000, raw.turboActive === true ? 1 : 0)
      ),
      perfectRouteEligible: raw.perfectRouteEligible !== false,
    };
  }

  private sanitizeMissions(input: unknown): DailyMissionState[] {
    if (!Array.isArray(input)) return [];
    return input
      .filter((mission): mission is Partial<DailyMissionState> =>
        Boolean(mission && typeof mission === "object")
      )
      .filter(
        mission =>
          typeof mission.id === "string" &&
          typeof mission.kind === "string" &&
          MISSION_KINDS.has(mission.kind as DailyMissionKind) &&
          typeof mission.title === "string" &&
          typeof mission.description === "string"
      )
      .slice(0, 3)
      .map(mission => {
        const target = Math.max(1, Math.round(finite(mission.target, 1)));
        return {
          id: mission.id!,
          kind: mission.kind as DailyMissionKind,
          title: mission.title!,
          description: mission.description!,
          target,
          progress: clamp(mission.progress, 0, target),
          rewardCredits: Math.max(0, Math.round(finite(mission.rewardCredits))),
          rewardXp: Math.max(0, Math.round(finite(mission.rewardXp))),
          rewardReputation: Math.max(
            0,
            Math.round(finite(mission.rewardReputation))
          ),
          claimed: mission.claimed === true,
        };
      });
  }

  /**
   * Le os operadores do save, agora de qualquer classe.
   *
   * O saneamento existe porque o save e um arquivo no computador da pessoa e
   * pode chegar aqui de qualquer jeito — editado, truncado, de uma versao
   * antiga. Um operador invalido nao pode derrubar o jogo nem, pior, ficar
   * dirigindo uma unidade que nao existe.
   *
   * Save antigo nao tinha classe: todo operador era ciclista com unidade
   * `bike-N`. Ele entra como ciclista, que e o que era.
   */
  private sanitizeCouriers(
    input: unknown,
    frota: Readonly<Record<VehicleId, number>>,
    operationalPointsCapacity: number
  ): HiredCourier[] {
    if (!Array.isArray(input)) return [];
    const couriers: HiredCourier[] = [];
    const ids = new Set<string>();
    const units = new Set<string>();
    const porClasse = new Map<VehicleId, number>();
    let pointsUsed = 0;
    for (const rawValue of input) {
      if (!rawValue || typeof rawValue !== "object") continue;
      const raw = rawValue as Partial<HiredCourier> & { bikeUnitId?: unknown };
      if (
        typeof raw.id !== "string" ||
        !/^courier-[1-9]\d*$/.test(raw.id) ||
        ids.has(raw.id)
      ) {
        continue;
      }
      const unidadeCrua =
        typeof raw.vehicleUnitId === "string"
          ? raw.vehicleUnitId
          : typeof raw.bikeUnitId === "string"
            ? raw.bikeUnitId
            : "";
      const classe = VEHICLE_ID_SET.has(raw.vehicleId as VehicleId)
        ? (raw.vehicleId as VehicleId)
        : "bike";
      /*
       * A unidade tem de ser da classe do operador e tem de existir na
       * garagem. A unidade 1 nunca e de operador: ela e a que o jogador
       * pilota.
       */
      const casa = new RegExp(`^${classe}-([2-9]\\d*)$`).exec(unidadeCrua);
      const numeroDaUnidade = casa ? Number(casa[1]) : Number.NaN;
      if (
        !Number.isInteger(numeroDaUnidade) ||
        numeroDaUnidade > Math.floor(frota[classe] ?? 0) ||
        units.has(unidadeCrua)
      ) {
        continue;
      }
      const operationalPoints = Math.round(
        clamp(raw.operationalPoints, 1, 50, PONTOS_DO_OPERADOR[classe])
      );
      if (pointsUsed + operationalPoints > operationalPointsCapacity) continue;
      const jaDaClasse = porClasse.get(classe) ?? 0;
      // Nunca mais operadores de uma classe do que unidades livres dela.
      if (jaDaClasse >= Math.max(0, Math.floor(frota[classe] ?? 0) - 1)) {
        continue;
      }
      const fallbackName = `Operador XB ${String(couriers.length + 1).padStart(2, "0")}`;
      couriers.push({
        id: raw.id as CourierId,
        name:
          typeof raw.name === "string" && raw.name.trim()
            ? raw.name.trim().slice(0, 48)
            : fallbackName,
        hiredAt: Math.max(0, Math.floor(finite(raw.hiredAt))),
        vehicleId: classe,
        vehicleUnitId: unidadeCrua,
        operationalPoints,
        wageRate: clamp(raw.wageRate, 0.05, 0.5, REPASSE.transportadora),
      });
      ids.add(raw.id);
      units.add(unidadeCrua);
      porClasse.set(classe, jaDaClasse + 1);
      pointsUsed += operationalPoints;
    }
    return couriers;
  }

  private sanitizeDeliveries(
    input: unknown,
    state: CampaignState
  ): ActiveDelivery[] {
    if (!Array.isArray(input)) return [];
    const routeSeen = new Set<string>();
    const unitSeen = new Set<string>();
    const deliveries: ActiveDelivery[] = [];
    for (const rawValue of input) {
      if (!rawValue || typeof rawValue !== "object") continue;
      const raw = rawValue as Partial<ActiveDelivery>;
      const route = ROUTES.find(item => item.id === raw.routeId);
      const vehicleId = raw.vehicleId;
      const validUnits = vehicleId
        ? this.vehicleUnitIdsForState(vehicleId, state)
        : [];
      const preferredUnit =
        typeof raw.vehicleUnitId === "string" &&
        validUnits.includes(raw.vehicleUnitId)
          ? raw.vehicleUnitId
          : validUnits.find(unitId => !unitSeen.has(unitId));
      if (
        !route ||
        !vehicleId ||
        !preferredUnit ||
        !state.unlockedVehicles.includes(vehicleId) ||
        !state.unlockedRegionIds.includes(route.regionId) ||
        getVehicle(vehicleId).order < getVehicle(route.requiredVehicle).order ||
        (route.firstDelivery && state.completedRouteIds.includes(route.id)) ||
        routeSeen.has(route.id) ||
        unitSeen.has(preferredUnit)
      ) {
        continue;
      }
      const startedAt = finite(raw.startedAt, Date.now());
      const completesAt = Math.max(
        startedAt,
        finite(raw.completesAt, startedAt)
      );
      const condition = state.tireCondition[vehicleId] ?? 100;
      // Legacy deliveries did not reserve costs. Preserve their economics with
      // a zero-cost snapshot instead of charging retroactively during migration.
      const legacyPlan = this.buildPlanForState(
        route,
        vehicleId,
        condition,
        state
      );
      const compoundId =
        raw.compoundId && COMPOUND_IDS.has(raw.compoundId)
          ? raw.compoundId
          : legacyPlan.compoundId;
      const grossReward = Math.max(
        0,
        Math.min(
          1_000_000_000,
          Math.round(finite(raw.grossReward, legacyPlan.grossReward))
        )
      );
      const hasSnapshot = typeof raw.operatingCost === "number";
      const operatingCost = hasSnapshot
        ? Math.max(
            0,
            Math.min(1_000_000_000, Math.round(finite(raw.operatingCost)))
          )
        : 0;
      const rawBreakdown = raw.costBreakdown;
      const breakdownParts = rawBreakdown
        ? {
            fuelEnergy: clamp(rawBreakdown.fuelEnergy, 0, 1_000_000_000),
            tolls: clamp(rawBreakdown.tolls, 0, 1_000_000_000),
            labor: clamp(rawBreakdown.labor, 0, 1_000_000_000),
            maintenanceReserve: clamp(
              rawBreakdown.maintenanceReserve,
              0,
              1_000_000_000
            ),
          }
        : undefined;
      const breakdownSum = breakdownParts
        ? breakdownParts.fuelEnergy +
          breakdownParts.tolls +
          breakdownParts.labor +
          breakdownParts.maintenanceReserve
        : 0;
      const costBreakdown =
        hasSnapshot &&
        breakdownParts &&
        Math.abs(breakdownSum - operatingCost) <= 1
          ? { ...breakdownParts, total: operatingCost }
          : {
              fuelEnergy: 0,
              tolls: 0,
              labor: operatingCost,
              maintenanceReserve: 0,
              total: operatingCost,
            };
      const requestedCourier =
        typeof raw.operatorId === "string" && raw.operatorId !== "player"
          ? state.hiredCouriers.find(courier => courier.id === raw.operatorId)
          : undefined;
      const automated =
        raw.automated === true &&
        requestedCourier?.vehicleUnitId === preferredUnit &&
        requestedCourier?.vehicleId === vehicleId;
      deliveries.push({
        instanceId:
          typeof raw.instanceId === "string" && raw.instanceId
            ? raw.instanceId
            : `${route.id}-${startedAt}-${deliveries.length}`,
        routeId: route.id,
        vehicleId,
        startedAt,
        completesAt,
        compoundId,
        terrain:
          raw.terrain && TERRAIN_IDS.has(raw.terrain)
            ? raw.terrain
            : legacyPlan.terrain,
        weather:
          raw.weather && WEATHER_IDS.has(raw.weather)
            ? raw.weather
            : legacyPlan.weather,
        tireFit:
          raw.tireFit && FIT_IDS.has(raw.tireFit)
            ? raw.tireFit
            : legacyPlan.tireFit,
        expectedWear: clamp(raw.expectedWear, 0, 100, legacyPlan.expectedWear),
        durationSeconds: clamp(
          raw.durationSeconds,
          0,
          route.durationSeconds * 10,
          (completesAt - startedAt) / 1000
        ),
        grossReward,
        operatingCost,
        netReward: grossReward - operatingCost,
        xpReward: Math.round(clamp(raw.xpReward, 0, 1_000_000, route.xpReward)),
        reputationReward: Math.round(
          clamp(raw.reputationReward, 0, 1_000_000, route.reputationReward)
        ),
        distance: Math.round(
          clamp(raw.distance, 0, 1_000_000_000, legacyPlan.distance)
        ),
        conditionAtDispatch: clamp(raw.conditionAtDispatch, 0, 100, condition),
        costBreakdown,
        operatorId:
          automated && requestedCourier ? requestedCourier.id : "player",
        vehicleUnitId: preferredUnit,
        automated,
      });
      routeSeen.add(route.id);
      unitSeen.add(preferredUnit);
    }
    const automatedSlots = operationsSummary(
      state.operationalPointsCapacity,
      state.vehicleFleet,
      state.hiredCouriers
    ).automatedSlots;
    return deliveries.slice(
      0,
      deliverySlotCount(state.buildingLevels.dispatch) + automatedSlots
    );
  }

  private vehicleUnitIdsForState(
    vehicleId: VehicleId,
    state: CampaignState
  ): string[] {
    const count = vehicleId === "bike" ? state.bikeFleetSize : 1;
    return Array.from(
      { length: Math.max(1, Math.floor(count)) },
      (_, index) => `${vehicleId}-${index + 1}`
    );
  }

  private buildPlanForState(
    route: RouteConfig,
    vehicleId: VehicleId,
    condition: number,
    state: CampaignState
  ): RouteRunPlan {
    const current = this.state;
    this.state = state;
    try {
      return this.buildPlan(route, vehicleId, condition);
    } finally {
      this.state = current;
    }
  }

  private storage(): Storage | null {
    try {
      return typeof window !== "undefined" ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  private save(): void {
    this.cachedValue = null;
    if (this.demo || this.ephemeral) return;
    const storage = this.storage();
    if (!storage) return;
    try {
      const payload: PersistedCampaignV3 = {
        version: CAMPAIGN_SAVE_VERSION,
        savedAt: Date.now(),
        state: this.state,
      };
      storage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Full/private/blocked localStorage cannot be allowed to crash gameplay.
    }
  }
}

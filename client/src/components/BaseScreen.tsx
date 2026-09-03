/**
 * Direção visual: Pit Lane Industrial isométrico. A imagem da central é o mapa;
 * hotspots em ciano funcionam como placas de oficina e nunca cobrem o pátio.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bike,
  Bot,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  Coins,
  Gauge,
  LockKeyhole,
  MapPinned,
  Orbit,
  RadioTower,
  Route,
  ShieldCheck,
  Star,
  Target,
  Truck,
  UserPlus,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";
import { GAME_ASSETS } from "@/game/assets";
import MissionPanel from "./MissionPanel";
import { getVehicle } from "@/game/config";
import {
  BUILDINGS,
  FIRST_COURIER_UNLOCK_LEVEL,
  MAX_MVP_BIKE_FLEET,
  REGIONS,
  ROUTES,
  SECOND_BIKE_UNLOCK_LEVEL,
  buildingUpgradeCost,
  courierHireCost,
  deliverySlotCount,
  operationsSummary,
  secondBikeCost,
  xpProgress,
} from "@/game/progression";
import {
  fitLabel,
  getCompound,
  operatingProfile,
  terrainLabel,
  weatherLabel,
} from "@/game/operations";
import type { BuildingId, GameSnapshot } from "@/game/types";
import type { GameHandle } from "@/game/scene";
import { secondsUntilNextDay } from "@/game/missions";
import { selectQuickRoute } from "@/game/routeSelection";
import { formatCredits, money } from "./format";

const buildingIcons = {
  hq: Building2,
  garage: Truck,
  workshop: Wrench,
  warehouse: Warehouse,
  dispatch: RadioTower,
  planetLab: Orbit,
} as const;

function buildingVisualStage(id: BuildingId, level: number) {
  if (level <= 0)
    return { id: "planned", code: "P0", label: "PROJETO", index: 0 };
  if ((id === "planetLab" && level >= 3) || level >= 6) {
    return { id: "advanced", code: "S3", label: "CENTRO AVANÇADO", index: 3 };
  }
  if (level >= 3)
    return { id: "operation", code: "S2", label: "OPERAÇÃO", index: 2 };
  return { id: "foundation", code: "S1", label: "FUNDAÇÃO", index: 1 };
}

function stageForLevel(level: number) {
  if (level >= 300) {
    return {
      name: "CENTRAL PLANETÁRIA",
      scale: "MUNDOS",
      image: GAME_ASSETS.basePlanetary,
      next: "REDE SOLAR",
    };
  }
  if (level >= 180) {
    return {
      name: "MEGAHUB GLOBAL",
      scale: "PAÍSES",
      image: GAME_ASSETS.baseGlobal,
      next: "OPERAÇÃO ORBITAL",
    };
  }
  if (level >= 80) {
    return {
      name: "CENTRAL REGIONAL",
      scale: "ESTADOS",
      image: GAME_ASSETS.baseRegional,
      next: "MEGAHUB GLOBAL",
    };
  }
  if (level >= 20) {
    return {
      name: "CENTRAL URBANA XB",
      scale: "CIDADES",
      image: GAME_ASSETS.baseLocal,
      next: "CENTRAL REGIONAL",
    };
  }
  return {
    name: "PÁTIO LOCAL XB",
    scale: "CIDADES",
    image: GAME_ASSETS.baseLocal,
    next: "CENTRAL URBANA",
  };
}

function journeyCopy(snapshot: GameSnapshot, level: number) {
  const { campaign } = snapshot;
  if (campaign.deliveries === 0) {
    if (campaign.activeDeliveries.length > 0) {
      return {
        index: "10",
        title: "PRIMEIRA ENTREGA EM ROTA",
        text: "Aguarde o retorno da equipe e colete os primeiros 10 XB para avançar.",
      };
    }
    return {
      index: "10",
      title: "PRIMEIRA ENTREGA · 10 XB",
      text: "Pilote ou despache a rota de 5 segundos para colocar a operação em movimento.",
    };
  }
  if (campaign.bikePartLevels.tire < 1) {
    const missing = Math.max(0, 30 - campaign.credits);
    return {
      index: "30",
      title: "PNEU URBANO · 30 XB",
      text: missing
        ? `Junte mais ${formatCredits(missing)} para ganhar velocidade e controle urbano.`
        : "Meta alcançada. Equipe o Pneu Urbano na Garagem.",
    };
  }
  if (campaign.bikePartLevels.cargo < 1) {
    const missing = Math.max(0, 60 - campaign.credits);
    return {
      index: "60",
      title: "MOCHILA PEQUENA · 60 XB",
      text: missing
        ? `Faltam ${formatCredits(missing)} para instalar a mochila na Garagem.`
        : "Meta alcançada. Abra a Garagem e instale a Mochila Pequena.",
    };
  }
  if (campaign.bikePartLevels.cargo < 2) {
    const missing = Math.max(0, 150 - campaign.credits);
    return {
      index: "150",
      title: "BAÚ PEQUENO · 150 XB",
      text: missing
        ? `Faltam ${formatCredits(missing)} para liberar cargas de mercado.`
        : "Meta alcançada. Instale o Baú Traseiro Pequeno na Garagem.",
    };
  }
  if (level < SECOND_BIKE_UNLOCK_LEVEL) {
    return {
      index: "N5",
      title: "SEGUNDA BIKE · NÍVEL 5",
      text: `Sua empresa está no nível ${level}. Continue entregando para formar a microfrota.`,
    };
  }
  if (campaign.bikeFleetSize < 2) {
    return {
      index: "N5",
      title: "COMPRE A SEGUNDA BIKE",
      text: "A expansão está liberada. Compre a bike na Central e prepare uma unidade para o futuro operador.",
    };
  }
  if (level < FIRST_COURIER_UNLOCK_LEVEL) {
    return {
      index: "N10",
      title: "OPERADOR · NÍVEL 10",
      text: `Sua empresa está no nível ${level}. No nível 10, a segunda bike ganha despacho automático.`,
    };
  }
  if (campaign.hiredCouriers.length === 0) {
    return {
      index: "N10",
      title: "CONTRATE O PRIMEIRO OPERADOR",
      text: "Use 1 Ponto Operacional para ativar entregas automáticas com a segunda bike.",
    };
  }
  if (level < 20) {
    return {
      index: "N20",
      title: "MICROFROTA · RUMO À MOTO",
      text: `Automação ativa. Avance do nível ${level} ao 20 para liberar a primeira motocicleta.`,
    };
  }
  if (!campaign.unlockedVehicles.includes("moto")) {
    return {
      index: "N20",
      title: "MOTOCICLETA LIBERADA",
      text: "Abra a Garagem para adquirir a moto e ampliar o alcance da operação XB.",
    };
  }
  return {
    index: "ON",
    title: "MICROFROTA EM OPERAÇÃO",
    text: "Pilote as rotas críticas, automatize as recorrentes e expanda a Central XB.",
  };
}

export default function BaseScreen({
  snapshot,
  handle,
}: {
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const levelProgress = xpProgress(snapshot.campaign.companyXp);
  const level = levelProgress.level;
  const stage = stageForLevel(level);
  const [selectedBuildingId, setSelectedBuildingId] =
    useState<BuildingId>("hq");
  const [missionsOpen, setMissionsOpen] = useState(() =>
    new URLSearchParams(window.location.search).has("missions")
  );
  const missionTriggerRef = useRef<HTMLButtonElement>(null);
  const selectedBuilding = BUILDINGS.find(
    item => item.id === selectedBuildingId
  )!;
  const buildingLevel = snapshot.campaign.buildingLevels[selectedBuildingId];
  const buildingLocked = level < selectedBuilding.unlockLevel;
  const buildingAtMax = buildingLevel >= selectedBuilding.maxLevel;
  const buildingCost = buildingUpgradeCost(selectedBuilding, buildingLevel);
  const selectedBuildingStage = buildingVisualStage(
    selectedBuildingId,
    buildingLevel
  );
  const SelectedBuildingIcon = buildingIcons[selectedBuilding.id];
  const slots = deliverySlotCount(snapshot.campaign.buildingLevels.dispatch);
  const journey = journeyCopy(snapshot, level);
  const operations = operationsSummary(
    snapshot.campaign.operationalPointsCapacity,
    snapshot.campaign.vehicleFleet,
    snapshot.campaign.hiredCouriers
  );
  const bikeCost = secondBikeCost(snapshot.campaign.bikeFleetSize);
  const courierCost = courierHireCost(snapshot.campaign.hiredCouriers.length);
  const bikeFleetComplete =
    snapshot.campaign.bikeFleetSize >= MAX_MVP_BIKE_FLEET;
  const bikeLevelReady = level >= SECOND_BIKE_UNLOCK_LEVEL;
  const bikeFundsReady = snapshot.campaign.credits >= bikeCost;
  const canBuyBike = !bikeFleetComplete && bikeLevelReady && bikeFundsReady;
  const spareBikeUnits = Math.max(
    0,
    snapshot.campaign.bikeFleetSize - 1 - snapshot.campaign.hiredCouriers.length
  );
  const courierLevelReady = level >= FIRST_COURIER_UNLOCK_LEVEL;
  const courierFundsReady = snapshot.campaign.credits >= courierCost;
  const canHireCourier =
    courierLevelReady &&
    spareBikeUnits > 0 &&
    operations.available > 0 &&
    courierFundsReady;
  const operationsMessage = !bikeFleetComplete
    ? !bikeLevelReady
      ? `Segunda bike bloqueada: alcance o nível ${SECOND_BIKE_UNLOCK_LEVEL}.`
      : !bikeFundsReady
        ? `Faltam ${formatCredits(bikeCost - snapshot.campaign.credits)} para a segunda bike.`
        : "Segunda bike liberada: a frota já pode crescer."
    : snapshot.campaign.hiredCouriers.length <
        snapshot.campaign.bikeFleetSize - 1
      ? !courierLevelReady
        ? `Operador bloqueado: alcance o nível ${FIRST_COURIER_UNLOCK_LEVEL}.`
        : operations.available < 1
          ? "Contratação bloqueada: não há Pontos Operacionais livres."
          : !courierFundsReady
            ? `Faltam ${formatCredits(courierCost - snapshot.campaign.credits)} para contratar o operador.`
            : "Operador liberado: contrate para automatizar a segunda bike."
      : operations.automatedSlots > 0
        ? "Despacho automático ativo. Salário do operador entra no custo da rota."
        : "Compre uma bike livre antes de contratar um operador.";
  const automatedInFlight = snapshot.campaign.activeDeliveries.filter(
    delivery => delivery.automated
  ).length;
  const manualInFlight = snapshot.campaign.activeDeliveries.filter(
    delivery => !delivery.automated
  ).length;
  const automatedSlotAvailable = operations.automatedSlots > automatedInFlight;
  const manualSlotAvailable = manualInFlight < slots;
  const completedMissions = snapshot.campaign.dailyMissions.filter(
    mission => mission.progress >= mission.target
  ).length;

  useEffect(() => {
    if (snapshot.campaign.onboardingStep === 2) setSelectedBuildingId("garage");
  }, [snapshot.campaign.onboardingStep]);

  const closeMissions = useCallback(() => {
    setMissionsOpen(false);
    window.requestAnimationFrame(() => missionTriggerRef.current?.focus());
  }, []);

  // Prop estável: sem ela o React.memo do quadro de missões nunca acerta.
  const claimMission = useCallback(
    (id: string) => handle.claimDailyMission(id),
    [handle]
  );

  // A contagem regressiva sai daqui em minutos: `snapshot.now` muda a cada
  // publicação e, dentro do painel, anulava o memo por um texto que só vira
  // uma vez por minuto.
  const missionResetMinutes = Math.floor(
    secondsUntilNextDay(new Date(snapshot.now)) / 60
  );

  const routeCandidates = ROUTES.filter(route => {
    const regionReady = snapshot.campaign.unlockedRegionIds.includes(
      route.regionId
    );
    const levelReady = level >= route.requiredCompanyLevel;
    const vehicleOrder = getVehicle(route.requiredVehicle).order;
    const fleetReady = snapshot.campaign.unlockedVehicles.some(
      id => getVehicle(id).order >= vehicleOrder
    );
    return regionReady && levelReady && fleetReady;
  });
  const nextRoute = selectQuickRoute(
    routeCandidates,
    snapshot.campaign.completedRouteIds,
    route => handle.previewRoute(route.id).ok,
    ROUTES[0]!
  );
  const nextRegion = REGIONS.find(region => region.id === nextRoute.regionId);
  const requiredOrder = getVehicle(nextRoute.requiredVehicle).order;
  const quickValidation = handle.previewRoute(nextRoute.id);
  const quickReady = quickValidation.ok;
  const quickBlockedMessage = quickValidation.ok ? "" : quickValidation.message;
  const automatedDispatchAvailable =
    automatedSlotAvailable && requiredOrder <= getVehicle("bike").order;
  const quickVehicle =
    quickValidation.plan?.vehicleId ??
    (getVehicle(snapshot.campaign.selectedVehicleId).order >= requiredOrder
      ? snapshot.campaign.selectedVehicleId
      : ([...snapshot.campaign.unlockedVehicles]
          .reverse()
          .find(id => getVehicle(id).order >= requiredOrder) ??
        snapshot.campaign.selectedVehicleId));
  const quickCompound = getCompound(
    quickValidation.plan?.compoundId ??
      snapshot.campaign.equippedCompounds[quickVehicle]
  );
  const quickProfile = operatingProfile(
    nextRoute.id,
    nextRegion?.scale ?? "city",
    quickCompound.id,
    nextRoute.difficulty,
    snapshot.campaign.dailyMissionDay
  );
  const quickWeather = quickValidation.plan?.weather ?? quickProfile.weather;
  const quickTerrain = quickValidation.plan?.terrain ?? quickProfile.terrain;
  const quickFit = quickValidation.plan?.tireFit ?? quickProfile.fit;
  const quickRepeatBlocked = Boolean(
    nextRoute.firstDelivery &&
      snapshot.campaign.completedRouteIds.includes(nextRoute.id)
  );
  const quickDisplayedDuration =
    quickValidation.plan?.duration ?? Math.max(3, nextRoute.durationSeconds);
  const quickDisplayedNet =
    quickValidation.plan?.netReward ?? Math.max(0, nextRoute.baseReward);
  const capacityMessage =
    operations.automatedSlots === 0
      ? manualSlotAvailable
        ? "Slot manual disponível. A automação libera com um operador contratado."
        : "Slot manual ocupado. A automação ainda não foi habilitada."
      : manualSlotAvailable
        ? automatedDispatchAvailable
          ? "Slots manual e automático disponíveis para um novo contrato."
          : "Automação em rota; o slot manual continua disponível."
        : automatedDispatchAvailable
          ? "Slot manual ocupado; o operador automático continua disponível."
          : "Slots manual e automático estão ocupados no momento.";
  const hasAutomatedOperator = operations.couriers > 0;
  const canDispatchAutomated =
    hasAutomatedOperator && automatedDispatchAvailable && quickReady;
  const operationsActionMessage = hasAutomatedOperator
    ? canDispatchAutomated
      ? `Operador livre para automatizar ${nextRoute.name}. O salário entra no custo final.`
      : !automatedSlotAvailable
        ? "Operador automático em rota. O slot manual permanece independente."
        : requiredOrder > getVehicle("bike").order
          ? "Operador livre, mas a próxima automação exige uma rota compatível com bicicleta."
          : `Automação indisponível: ${quickBlockedMessage}`
    : operationsMessage;
  const quickActionMessageId = "quick-route-action-message";
  const quickRouteActions = (
    <div
      className="quick-route-actions"
      aria-label={`Ações manuais para ${nextRoute.name}`}
    >
      {(!quickReady || snapshot.campaign.activeDeliveries.length > 0) && (
        <p className="quick-route-status" role="status">
          {quickReady
            ? `${nextRoute.name} · ${capacityMessage}`
            : quickBlockedMessage}
        </p>
      )}
      <button
        className="drive-button"
        onClick={() => handle.startRun(nextRoute.id)}
        disabled={!quickReady}
        aria-describedby={quickReady ? undefined : quickActionMessageId}
      >
        <Gauge size={17} />{" "}
        {quickRepeatBlocked
          ? "CONCLUÍDA"
          : quickReady
            ? "PILOTAR"
            : "INDISPONÍVEL"}
      </button>
      <button
        className="dispatch-button"
        onClick={() => handle.dispatchRoute(nextRoute.id)}
        disabled={!quickReady || !manualSlotAvailable}
        title={
          quickReady ? `Despachar manualmente ${nextRoute.name}` : undefined
        }
        aria-describedby={
          !quickReady || !manualSlotAvailable ? quickActionMessageId : undefined
        }
      >
        <RadioTower size={17} />{" "}
        {!manualSlotAvailable
          ? "MANUAL OCUPADO"
          : quickReady
            ? "DESPACHAR MANUAL"
            : "INDISPONÍVEL"}
      </button>
    </div>
  );

  return (
    <section
      className="game-screen base-screen"
      style={{ backgroundImage: `url(${stage.image})` }}
    >
      <div className="base-screen__shade" />
      <header className="base-topbar">
        <div className="brand-lockup brand-lockup--compact">
          <img src={GAME_ASSETS.logo} alt="Símbolo da XB Pneus" />
          <div>
            <strong>XB PNEUS</strong>
            <span>CENTRAL LOGÍSTICA</span>
          </div>
        </div>

        <div className="company-level">
          <span className="company-level__badge">NÍVEL {level}</span>
          <div>
            <small>EMPRESA XB</small>
            <div
              className="company-xp-track"
              role="progressbar"
              aria-label={`Progresso da empresa no nível ${level}`}
              aria-valuemin={0}
              aria-valuemax={levelProgress.needed}
              aria-valuenow={levelProgress.current}
            >
              <span style={{ width: `${levelProgress.percent}%` }} />
            </div>
            <em>
              {money.format(levelProgress.current)} /{" "}
              {money.format(levelProgress.needed)} XP
            </em>
          </div>
        </div>

        <div className="base-resources">
          <span>
            <Coins size={17} /> <small>CAIXA</small> XB${" "}
            {money.format(snapshot.campaign.credits)}
          </span>
          <span>
            <Star size={17} /> <small>REP</small>{" "}
            {money.format(snapshot.campaign.reputation)}
          </span>
          <span
            aria-label={`Pontos Operacionais: ${operations.used} usados de ${operations.capacity}`}
            title={`${operations.available} Pontos Operacionais livres`}
          >
            <Bot size={17} /> <small>OP</small> {operations.used}/
            {operations.capacity}
          </span>
        </div>
      </header>

      <div className="base-stage-label">
        <span>{stage.scale}</span>
        <strong>{stage.name}</strong>
        <small>PRÓXIMA ESCALA · {stage.next}</small>
      </div>

      <button
        ref={missionTriggerRef}
        className="mission-trigger"
        onClick={() => setMissionsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={missionsOpen}
      >
        <Target size={17} />
        <span>
          <small>TURNO XB</small>
          <strong>MISSÕES {completedMissions}/3</strong>
        </span>
      </button>

      {missionsOpen && (
        <MissionPanel
          missions={snapshot.campaign.dailyMissions}
          resetInMinutes={missionResetMinutes}
          onClaim={claimMission}
          onClose={closeMissions}
        />
      )}

      <div
        className="building-hotspots"
        aria-label="Edifícios da central logística"
      >
        {BUILDINGS.map(building => {
          const current = snapshot.campaign.buildingLevels[building.id];
          const locked = level < building.unlockLevel;
          const Icon = buildingIcons[building.id];
          const visualStage = buildingVisualStage(building.id, current);
          return (
            <button
              key={building.id}
              className={`building-hotspot stage-${visualStage.id} ${selectedBuildingId === building.id ? "is-selected" : ""} ${locked ? "is-locked" : ""}`}
              style={{
                left: `${building.position.x}%`,
                top: `${building.position.y}%`,
              }}
              onClick={() => setSelectedBuildingId(building.id)}
              aria-label={`${building.name}, nível ${current}`}
              aria-pressed={selectedBuildingId === building.id}
            >
              <span className="building-hotspot__icon">
                {locked ? <LockKeyhole size={18} /> : <Icon size={19} />}
              </span>
              <span>
                <small>
                  {locked
                    ? `LIBERA N${building.unlockLevel}`
                    : `${visualStage.code} · NÍVEL ${current}`}
                </small>
                <strong>{building.shortName}</strong>
                {!locked && (
                  <span className="building-stage-bars" aria-hidden="true">
                    {[1, 2, 3].map(stageIndex => (
                      <i
                        key={stageIndex}
                        className={
                          stageIndex <= visualStage.index ? "is-on" : ""
                        }
                      />
                    ))}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <aside className="base-tutorial">
        <span>{journey.index}</span>
        <div>
          <small>JORNADA INICIAL</small>
          <strong>{journey.title}</strong>
          <p>{journey.text}</p>
        </div>
      </aside>

      {snapshot.notice && (
        <div className="base-notice" role="status" aria-live="polite">
          <Check size={16} /> {snapshot.notice}
        </div>
      )}

      <section className="quick-delivery-panel">
        <span className="sr-only" id={quickActionMessageId}>
          {quickReady
            ? `${nextRoute.name}. ${capacityMessage}`
            : quickBlockedMessage}
        </span>
        <div className="quick-delivery-panel__heading">
          <span>
            <Route size={18} />
          </span>
          <div>
            <small>DESPACHO RÁPIDO</small>
            <strong>
              MANUAL {manualInFlight}/{slots} · AUTO {automatedInFlight}/
              {operations.automatedSlots}
            </strong>
          </div>
          <button onClick={() => handle.goRoutes()}>
            TODAS AS ROTAS <ChevronRight size={15} />
          </button>
        </div>

        {snapshot.campaign.activeDeliveries.length > 0 && (
          <div className="active-delivery-list">
            {snapshot.campaign.activeDeliveries.map(delivery => {
              const route = ROUTES.find(item => item.id === delivery.routeId)!;
              const operator = snapshot.campaign.hiredCouriers.find(
                courier => courier.id === delivery.operatorId
              );
              const total = Math.max(
                1,
                delivery.completesAt - delivery.startedAt
              );
              const remaining = Math.max(
                0,
                delivery.completesAt - snapshot.now
              );
              const ready = remaining <= 0;
              const progress = Math.min(
                100,
                ((total - remaining) / total) * 100
              );
              return (
                <article
                  key={delivery.instanceId}
                  className={ready ? "is-ready" : ""}
                >
                  <div>
                    <small>{route.cargo}</small>
                    <strong>{route.name}</strong>
                    <span>
                      {delivery.automated ? (
                        <Bot size={13} />
                      ) : (
                        <Truck size={13} />
                      )}{" "}
                      {delivery.automated
                        ? `AUTO · ${operator?.name ?? "OPERADOR XB"}`
                        : "DESPACHO DIRETO"}{" "}
                      · {getVehicle(delivery.vehicleId).shortName}
                    </span>
                  </div>
                  <div
                    className="delivery-timer"
                    role="progressbar"
                    aria-label={`Progresso da entrega ${route.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                  >
                    <span style={{ width: `${progress}%` }} />
                    <strong>
                      {ready ? "CHEGOU" : `${Math.ceil(remaining / 1000)}s`}
                    </strong>
                  </div>
                  <button
                    className={ready ? "collect-button" : "waiting-button"}
                    onClick={() =>
                      ready && handle.collectDelivery(delivery.instanceId)
                    }
                    disabled={!ready}
                  >
                    {ready ? "COLETAR" : "EM TRÂNSITO"}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {snapshot.campaign.activeDeliveries.length === 0 ? (
          <div className="next-delivery-card">
            <div className="next-delivery-card__route">
              <span className="route-number">
                R{String(ROUTES.indexOf(nextRoute) + 1).padStart(2, "0")}
              </span>
              <div>
                <small>{nextRoute.cargo}</small>
                <strong>{nextRoute.name}</strong>
                <span>
                  <Clock3 size={13} /> {Math.ceil(quickDisplayedDuration)}s ·{" "}
                  <Coins size={13} /> XB$ {money.format(quickDisplayedNet)}{" "}
                  líquido
                </span>
                <span className={`quick-forecast fit-${quickFit}`}>
                  {weatherLabel(quickWeather)} · {terrainLabel(quickTerrain)} ·{" "}
                  {quickCompound.code} {fitLabel(quickFit)}
                </span>
              </div>
            </div>
            {quickRouteActions}
          </div>
        ) : manualSlotAvailable ? (
          quickRouteActions
        ) : null}
      </section>

      <section
        className={`building-inspector stage-${selectedBuildingStage.id}`}
        aria-live="polite"
        aria-label={`Edifício selecionado: ${selectedBuilding.name}`}
      >
        <div className="building-inspector__index">
          {buildingLocked ? (
            <LockKeyhole />
          ) : (
            <SelectedBuildingIcon size={23} />
          )}
        </div>
        <div className="building-inspector__copy">
          <small>
            {buildingLocked
              ? `LIBERA NO NÍVEL ${selectedBuilding.unlockLevel}`
              : `${selectedBuildingStage.code} · ${selectedBuildingStage.label} · NÍVEL ${buildingLevel}/${selectedBuilding.maxLevel}`}
          </small>
          <strong>{selectedBuilding.name}</strong>
          <div
            className="building-evolution-strip"
            style={{ backgroundImage: `url(${GAME_ASSETS.buildingEvolution})` }}
            aria-label={`Estágio atual: ${selectedBuildingStage.label}`}
          >
            {["FUNDAÇÃO", "OPERAÇÃO", "AVANÇADO"].map((label, index) => (
              <i
                key={label}
                className={
                  index + 1 === selectedBuildingStage.index ? "is-current" : ""
                }
              >
                {label}
              </i>
            ))}
          </div>
          <p>{selectedBuilding.description}</p>
          <span>
            <ShieldCheck size={13} /> {selectedBuilding.effect}
          </span>
          <span>
            <Bike size={13} /> FROTA · {operations.bikeUnits}{" "}
            {operations.bikeUnits === 1 ? "BIKE" : "BIKES"}
          </span>
          <span>
            <Users size={13} /> EQUIPE · {operations.couriers}{" "}
            {operations.couriers === 1 ? "OPERADOR" : "OPERADORES"} · AUTO{" "}
            {operations.automatedSlots}
          </span>
          <div
            className="quick-route-actions"
            aria-label="Expansão da operação de bicicletas"
          >
            <p
              className="quick-route-status"
              id="operations-action-message"
              role="status"
            >
              {operationsActionMessage}
            </p>
            <button
              className="drive-button"
              onClick={() => handle.buyBikeUnit()}
              disabled={!canBuyBike}
              aria-describedby="operations-action-message"
            >
              <Bike size={15} />{" "}
              {bikeFleetComplete
                ? "FROTA COMPLETA"
                : bikeLevelReady
                  ? `COMPRAR · ${formatCredits(bikeCost)}`
                  : `BIKE · NÍVEL ${SECOND_BIKE_UNLOCK_LEVEL}`}
            </button>
            <button
              className="dispatch-button"
              onClick={() =>
                hasAutomatedOperator
                  ? handle.dispatchAutomatedRoute(nextRoute.id)
                  : handle.hireCourier()
              }
              disabled={
                hasAutomatedOperator ? !canDispatchAutomated : !canHireCourier
              }
              aria-describedby="operations-action-message"
            >
              {hasAutomatedOperator ? (
                <Bot size={15} />
              ) : (
                <UserPlus size={15} />
              )}{" "}
              {hasAutomatedOperator
                ? canDispatchAutomated
                  ? "DESPACHAR AUTO"
                  : automatedSlotAvailable
                    ? "AUTO INDISPONÍVEL"
                    : "AUTO EM ROTA"
                : snapshot.campaign.hiredCouriers.length >=
                    snapshot.campaign.bikeFleetSize - 1
                  ? "SEM BIKE LIVRE"
                  : courierLevelReady
                    ? `CONTRATAR · ${formatCredits(courierCost)}`
                    : `OPERADOR · NÍVEL ${FIRST_COURIER_UNLOCK_LEVEL}`}
            </button>
          </div>
        </div>
        <button
          onClick={() => handle.upgradeBuilding(selectedBuilding.id)}
          disabled={buildingLocked || buildingAtMax}
        >
          {buildingLocked
            ? "BLOQUEADO"
            : buildingAtMax
              ? "NÍVEL MÁXIMO"
              : buildingLevel === 0
                ? `CONSTRUIR · ${formatCredits(buildingCost)}`
                : `MELHORAR · ${formatCredits(buildingCost)}`}
        </button>
      </section>

      <nav className="base-nav" aria-label="Navegação da central">
        <button className="is-active" aria-current="page">
          <Building2 />
          <span>CENTRAL</span>
        </button>
        <button onClick={() => handle.goRoutes()}>
          <MapPinned />
          <span>EXPANSÃO</span>
        </button>
        <button onClick={() => handle.goGarage()}>
          <Wrench />
          <span>GARAGEM</span>
        </button>
        <button
          onClick={() => quickReady && handle.startRun(nextRoute.id)}
          disabled={!quickReady}
          aria-describedby={quickReady ? undefined : quickActionMessageId}
        >
          <Gauge />
          <span>PILOTAR</span>
        </button>
      </nav>
    </section>
  );
}

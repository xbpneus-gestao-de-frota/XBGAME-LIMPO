/**
 * Direção visual: sala de despacho + mapa técnico. A expansão é representada por
 * nós territoriais conectados, sem cartografia literal ou estética de fantasia.
 */
import { useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  Coins,
  Gauge,
  Globe2,
  LockKeyhole,
  Map,
  MapPinned,
  Orbit,
  PackageCheck,
  RadioTower,
  Star,
  Truck,
  Wrench,
} from "lucide-react";
import { GAME_ASSETS } from "@/game/assets";
import { getVehicle } from "@/game/config";
import {
  REGIONS,
  ROUTES,
  companyLevelFromXp,
  deliverySlotCount,
  scaleLabel,
} from "@/game/progression";
import {
  fitLabel,
  getCompound,
  operatingProfile,
  terrainLabel,
  weatherLabel,
} from "@/game/operations";
import type { GameHandle } from "@/game/scene";
import type { GameSnapshot, RegionScale } from "@/game/types";
import { money } from "./format";

const scales: RegionScale[] = ["city", "state", "country", "world"];

function Brand() {
  return (
    <div className="brand-lockup brand-lockup--compact">
      <img src={GAME_ASSETS.logo} alt="Símbolo da XB Pneus" />
      <div>
        <strong>XB PNEUS</strong>
        <span>CENTRO DE ROTAS</span>
      </div>
    </div>
  );
}

export default function RoutesScreen({
  snapshot,
  handle,
}: {
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const companyLevel = companyLevelFromXp(snapshot.campaign.companyXp);
  const initialRegion =
    [...REGIONS]
      .reverse()
      .find(region =>
        snapshot.campaign.unlockedRegionIds.includes(region.id)
      ) ?? REGIONS[0]!;
  const [activeScale, setActiveScale] = useState<RegionScale>(
    initialRegion.scale
  );
  const [selectedRegionId, setSelectedRegionId] = useState(initialRegion.id);
  const regions = REGIONS.filter(region => region.scale === activeScale);
  const selectedRegion =
    REGIONS.find(
      region => region.id === selectedRegionId && region.scale === activeScale
    ) ?? regions[0]!;
  const routes = ROUTES.filter(route => route.regionId === selectedRegion.id);
  const selectedUnlocked = snapshot.campaign.unlockedRegionIds.includes(
    selectedRegion.id
  );
  const slots = deliverySlotCount(snapshot.campaign.buildingLevels.dispatch);
  const manualDeliveries = snapshot.campaign.activeDeliveries.filter(
    delivery => !delivery.automated
  ).length;
  const manualSlotsFull = manualDeliveries >= slots;

  const connectedRegions = useMemo(() => {
    return REGIONS.filter(region =>
      snapshot.campaign.unlockedRegionIds.includes(region.id)
    );
  }, [snapshot.campaign.unlockedRegionIds]);

  const changeScale = (scale: RegionScale) => {
    setActiveScale(scale);
    const group = REGIONS.filter(region => region.scale === scale);
    const unlocked = [...group]
      .reverse()
      .find(region => snapshot.campaign.unlockedRegionIds.includes(region.id));
    setSelectedRegionId((unlocked ?? group[0]!).id);
  };

  const onScaleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    let targetIndex = index;
    if (event.key === "ArrowRight") targetIndex = (index + 1) % scales.length;
    else if (event.key === "ArrowLeft")
      targetIndex = (index - 1 + scales.length) % scales.length;
    else if (event.key === "Home") targetIndex = 0;
    else if (event.key === "End") targetIndex = scales.length - 1;
    else return;
    event.preventDefault();
    const scale = scales[targetIndex];
    if (!scale) return;
    changeScale(scale);
    document.getElementById(`scale-tab-${scale}`)?.focus();
  };

  const pilotRouteId = routes.find(
    route => handle.previewRoute(route.id).ok
  )?.id;

  return (
    <section
      className="game-screen routes-screen"
      style={{ backgroundImage: `url(${GAME_ASSETS.baseGlobal})` }}
    >
      <div className="routes-screen__shade" />
      <header className="routes-topbar">
        <Brand />
        <div className="routes-title">
          <span>MAPA DE EXPANSÃO</span>
          <strong>CIDADE → ESTADO → PAÍS → MUNDO</strong>
        </div>
        <div className="routes-resources">
          <span>
            <Coins /> XB$ {money.format(snapshot.campaign.credits)}
          </span>
          <span>
            <Star /> {money.format(snapshot.campaign.reputation)} REP
          </span>
          <span>
            <Building2 /> NÍVEL {companyLevel}
          </span>
        </div>
      </header>

      <main className="routes-layout">
        <section className="territory-map">
          <div className="map-grid" />
          <div className="map-rings">
            <i />
            <i />
            <i />
          </div>
          <div className="map-status" role="status">
            <span>
              <RadioTower size={14} /> REDE XB ONLINE
            </span>
            <strong>
              {connectedRegions.length}/{REGIONS.length} TERRITÓRIOS CONECTADOS
            </strong>
          </div>

          <div
            className="scale-tabs"
            role="tablist"
            aria-label="Escala territorial"
          >
            {scales.map(scale => {
              const total = REGIONS.filter(
                region => region.scale === scale
              ).length;
              const unlocked = REGIONS.filter(
                region =>
                  region.scale === scale &&
                  snapshot.campaign.unlockedRegionIds.includes(region.id)
              ).length;
              return (
                <button
                  key={scale}
                  id={`scale-tab-${scale}`}
                  role="tab"
                  className={activeScale === scale ? "is-active" : ""}
                  onClick={() => changeScale(scale)}
                  onKeyDown={event =>
                    onScaleKeyDown(event, scales.indexOf(scale))
                  }
                  aria-selected={activeScale === scale}
                  aria-controls="territory-panel"
                  tabIndex={activeScale === scale ? 0 : -1}
                >
                  {scale === "world" ? (
                    <Orbit />
                  ) : scale === "country" ? (
                    <Globe2 />
                  ) : (
                    <Map />
                  )}
                  <span>{scaleLabel(scale)}</span>
                  <small>
                    {unlocked}/{total}
                  </small>
                </button>
              );
            })}
          </div>

          <div
            id="territory-panel"
            className={`region-nodes region-nodes--${activeScale}`}
            role="tabpanel"
            aria-labelledby={`scale-tab-${activeScale}`}
          >
            {regions.map((region, index) => {
              const unlocked = snapshot.campaign.unlockedRegionIds.includes(
                region.id
              );
              const selected = selectedRegion.id === region.id;
              return (
                <button
                  key={region.id}
                  className={`region-node ${unlocked ? "is-unlocked" : "is-locked"} ${selected ? "is-selected" : ""}`}
                  style={
                    {
                      left: `${region.coordinates.x}%`,
                      top: `${region.coordinates.y}%`,
                      "--node-accent": region.accent,
                    } as React.CSSProperties
                  }
                  onClick={() => setSelectedRegionId(region.id)}
                  aria-pressed={selected}
                  aria-label={`${region.name}, ${unlocked ? "território conectado" : `bloqueado até o nível ${region.unlockLevel}`}`}
                >
                  <span>{unlocked ? <MapPinned /> : <LockKeyhole />}</span>
                  <strong>{region.name}</strong>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                </button>
              );
            })}
          </div>

          <div className="map-route-line map-route-line--one" />
          <div className="map-route-line map-route-line--two" />
          <div className="map-route-line map-route-line--three" />
        </section>

        <aside className="route-command-panel">
          <div className="route-region-head">
            <span className={selectedUnlocked ? "is-online" : ""}>
              {selectedUnlocked ? <RadioTower /> : <LockKeyhole />}
            </span>
            <div>
              <small>
                {scaleLabel(selectedRegion.scale)} · {selectedRegion.label}
              </small>
              <h1>{selectedRegion.name}</h1>
            </div>
          </div>

          {!selectedUnlocked && (
            <div className="region-requirements">
              <strong>REQUISITOS DE CONEXÃO</strong>
              <span
                className={
                  companyLevel >= selectedRegion.unlockLevel ? "is-ready" : ""
                }
              >
                <Building2 /> Empresa nível {selectedRegion.unlockLevel}
              </span>
              <span
                className={
                  snapshot.campaign.reputation >=
                  selectedRegion.reputationRequired
                    ? "is-ready"
                    : ""
                }
              >
                <Star /> {selectedRegion.reputationRequired} reputação
              </span>
              <span
                className={
                  snapshot.campaign.unlockedVehicles.includes(
                    selectedRegion.requiredVehicle
                  )
                    ? "is-ready"
                    : ""
                }
              >
                <Truck /> {getVehicle(selectedRegion.requiredVehicle).shortName}
              </span>
            </div>
          )}

          <div
            className="route-contract-list"
            aria-label={`Contratos de ${selectedRegion.name}`}
          >
            {routes.map(route => {
              const active = snapshot.campaign.activeDeliveries.find(
                delivery => delivery.routeId === route.id
              );
              const vehicleOrder = getVehicle(route.requiredVehicle).order;
              const complete = snapshot.campaign.completedRouteIds.includes(
                route.id
              );
              const remaining = active
                ? Math.max(0, active.completesAt - snapshot.now)
                : 0;
              const arrived = Boolean(active && remaining <= 0);
              const validation = handle.previewRoute(route.id);
              const plan = validation.plan;
              const eligibleVehicles =
                snapshot.campaign.unlockedVehicles.filter(
                  id => getVehicle(id).order >= vehicleOrder
                );
              const operatingVehicle =
                plan?.vehicleId ??
                active?.vehicleId ??
                (eligibleVehicles.includes(snapshot.campaign.selectedVehicleId)
                  ? snapshot.campaign.selectedVehicleId
                  : (eligibleVehicles[eligibleVehicles.length - 1] ??
                    snapshot.campaign.selectedVehicleId));
              const equipped = getCompound(
                plan?.compoundId ??
                  active?.compoundId ??
                  snapshot.campaign.equippedCompounds[operatingVehicle]
              );
              const profile = operatingProfile(
                route.id,
                selectedRegion.scale,
                equipped.id,
                route.difficulty,
                snapshot.campaign.dailyMissionDay
              );
              const recommended = getCompound(profile.recommendedCompoundId);
              const condition =
                plan?.conditionAtStart ??
                active?.conditionAtDispatch ??
                snapshot.campaign.tireCondition[operatingVehicle];
              const forecastWeather =
                plan?.weather ?? active?.weather ?? profile.weather;
              const forecastTerrain =
                plan?.terrain ?? active?.terrain ?? profile.terrain;
              const forecastFit =
                plan?.tireFit ?? active?.tireFit ?? profile.fit;
              const expectedDuration =
                plan?.duration ??
                active?.durationSeconds ??
                Math.max(3, route.durationSeconds);
              const expectedGross =
                plan?.grossReward ??
                active?.grossReward ??
                Math.max(0, route.baseReward);
              const expectedCost =
                plan?.operatingCost ?? active?.operatingCost ?? 0;
              const expectedNet =
                plan?.netReward ??
                active?.netReward ??
                expectedGross - expectedCost;
              const expectedReputation =
                plan?.reputationReward ??
                active?.reputationReward ??
                route.reputationReward;
              const ready = validation.ok;
              const blockedMessage = validation.ok ? "" : validation.message;
              const blockedMessageId = `route-blocked-${route.id}`;
              const manualSlotMessageId = `manual-slot-${route.id}`;
              return (
                <article
                  key={route.id}
                  className={`${ready || active ? "is-ready" : "is-locked"} ${complete ? "is-complete" : ""}`}
                  aria-labelledby={`route-title-${route.id}`}
                >
                  <div className="contract-topline">
                    <span>DIFICULDADE {"◆".repeat(route.difficulty)}</span>
                    {complete && (
                      <em>
                        <Check /> CONCLUÍDA
                      </em>
                    )}
                  </div>
                  <h2 id={`route-title-${route.id}`}>{route.name}</h2>
                  <p>{route.cargo}</p>
                  <div
                    className={`route-forecast fit-${forecastFit}`}
                    style={{
                      backgroundImage: `url(${GAME_ASSETS.routeConditions})`,
                    }}
                  >
                    <div>
                      <span>{weatherLabel(forecastWeather)}</span>
                      <span>{terrainLabel(forecastTerrain)}</span>
                    </div>
                    <strong>{fitLabel(forecastFit)}</strong>
                    <small>
                      {equipped.code} equipado · recomendado {recommended.code}{" "}
                      · condição {condition}%
                    </small>
                  </div>
                  <div className="contract-stats">
                    <span>
                      <Clock3 /> {Math.ceil(expectedDuration)}s
                    </span>
                    <span>
                      <CircleDollarSign /> XB$ {money.format(expectedNet)} líq.
                    </span>
                    <span>
                      <Star /> +{expectedReputation}
                    </span>
                  </div>
                  <div className="contract-requirement">
                    <Truck /> {getVehicle(route.requiredVehicle).shortName} ·
                    Empresa N{route.requiredCompanyLevel}
                  </div>
                  <div className="contract-economics">
                    <span>BRUTO XB$ {money.format(expectedGross)}</span>
                    <span>CUSTO XB$ {money.format(expectedCost)}</span>
                  </div>
                  {!active && !ready && (
                    <p className="route-blocked-message" id={blockedMessageId}>
                      {blockedMessage}
                    </p>
                  )}
                  {!active && ready && manualSlotsFull && (
                    <p
                      className="route-blocked-message"
                      id={manualSlotMessageId}
                    >
                      Slots manuais ocupados ({manualDeliveries}/{slots}). As
                      rotas automáticas usam capacidade própria.
                    </p>
                  )}
                  {active ? (
                    <button
                      className={arrived ? "is-collect" : "is-transit"}
                      disabled={!arrived}
                      onClick={() =>
                        arrived && handle.collectDelivery(active.instanceId)
                      }
                    >
                      {arrived ? (
                        <>
                          <PackageCheck /> COLETAR RECOMPENSA
                        </>
                      ) : (
                        <>
                          <Clock3 /> {active.automated ? "AUTO" : "MANUAL"} ·{" "}
                          {Math.ceil(remaining / 1000)}s
                        </>
                      )}
                    </button>
                  ) : (
                    <div
                      className="contract-actions"
                      aria-label={`Como executar ${route.name}`}
                    >
                      <button
                        className="drive-contract"
                        disabled={!ready}
                        aria-describedby={ready ? undefined : blockedMessageId}
                        onClick={() => handle.startRun(route.id)}
                      >
                        <Gauge /> {ready ? "PILOTAR" : "INDISPONÍVEL"}
                      </button>
                      <button
                        className="dispatch-contract"
                        disabled={!ready || manualSlotsFull}
                        aria-describedby={
                          !ready
                            ? blockedMessageId
                            : manualSlotsFull
                              ? manualSlotMessageId
                              : undefined
                        }
                        onClick={() => handle.dispatchRoute(route.id)}
                      >
                        {manualSlotsFull ? (
                          "MANUAL OCUPADO"
                        ) : ready ? (
                          <>
                            <RadioTower /> DESPACHAR MANUAL
                          </>
                        ) : (
                          "INDISPONÍVEL"
                        )}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {routes.length === 0 && (
            <div className="route-empty">
              <Orbit />
              <strong>SEM CONTRATOS NESTA CONEXÃO</strong>
              <p>Amplie a rede para abrir a próxima rota XB.</p>
            </div>
          )}

          {snapshot.notice && (
            <div className="route-notice" role="status" aria-live="polite">
              <Check /> {snapshot.notice}
            </div>
          )}
        </aside>
      </main>

      <nav
        className="routes-bottom-nav"
        aria-label="Navegação do centro de rotas"
      >
        <button onClick={() => handle.goBase()}>
          <ChevronLeft />
          <span>CENTRAL</span>
        </button>
        <button className="is-active" aria-current="page">
          <MapPinned />
          <span>EXPANSÃO</span>
        </button>
        <button onClick={() => handle.goGarage()}>
          <Wrench />
          <span>GARAGEM</span>
        </button>
        <button
          onClick={() => pilotRouteId && handle.startRun(pilotRouteId)}
          disabled={!pilotRouteId}
        >
          <Gauge />
          <span>PILOTAR</span>
        </button>
      </nav>
    </section>
  );
}

/**
 * Direção visual: Pit Lane Industrial — azul-marinho, ciano elétrico, placas
 * técnicas assimétricas e telemetria legível. React moldura a cena Babylon e
 * mantém toda a interação de gestão fora do motor gráfico.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Engine } from "@babylonjs/core/Engines/engine";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Building2,
  Check,
  CircleGauge,
  Coins,
  Flag,
  Gauge,
  Globe2,
  Home,
  LockKeyhole,
  LogOut,
  MapPinned,
  PackageCheck,
  Pause,
  Play,
  RotateCcw,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Wrench,
} from "lucide-react";
import { GAME_ASSETS } from "@/game/assets";
import BaseScreen from "./BaseScreen";
import ExperienceSettings from "./ExperienceSettings";
import RoutesScreen from "./RoutesScreen";
import TireStrategyPanel from "./TireStrategyPanel";
import LiveMinimap from "./LiveMinimap";
import PilotFocusLayer from "./PilotFocusLayer";
import {
  TIRE_MAX_LEVEL,
  TIRE_STATS,
  getVehicle,
  tireUpgradeCost,
  vehicleCargoCapacity,
  vehicleDisplaySpeedKmh,
} from "@/game/config";
import {
  BIKE_PARTS,
  MAX_BIKE_PART_LEVEL,
  ROUTES,
  VEHICLE_UNLOCK_LEVELS,
  bikePartUpgradeCost,
  companyLevelFromXp,
  vehicleUpgradeCost,
} from "@/game/progression";
import { bikeMaintenanceCost } from "@/game/operations";
import type { GameHandle } from "@/game/scene";
import {
  GameFeedback,
  loadFeedbackPreferences,
  type FeedbackPreferences,
} from "@/game/feedback";
import {
  babylonHardwareScalingLevel,
  loadQualityPreference,
  resolveQualitySettings,
  saveQualityPreference,
  type QualityPreference,
} from "@/game/quality";
import type {
  BikePartId,
  GameSnapshot,
  TireStat,
  VehicleConfig,
} from "@/game/types";
import { formatCredits, money } from "./format";
import { useFocusTrap } from "./useFocusTrap";

function BrandLockup({
  compact = false,
  artwork = false,
}: {
  compact?: boolean;
  artwork?: boolean;
}) {
  if (artwork) {
    return (
      <div className="brand-lockup brand-lockup--artwork">
        <img src={GAME_ASSETS.brandLockup} alt="Logotipo metálico XB PNEUS" />
      </div>
    );
  }

  return (
    <div className={`brand-lockup ${compact ? "brand-lockup--compact" : ""}`}>
      <img src={GAME_ASSETS.logo} alt="Símbolo da XB Pneus" />
      <div>
        <strong>XB PNEUS</strong>
        <span>DO PEDAL AO PLANETA</span>
      </div>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="stat-chip">
      <span className="stat-chip__icon">{icon}</span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function MenuScreen({
  snapshot,
  handle,
}: {
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const vehicle = getVehicle(snapshot.campaign.selectedVehicleId);
  const hasProgress = snapshot.campaign.deliveries > 0;

  return (
    <section
      className="game-screen menu-screen"
      data-era={vehicle.id}
      style={{ backgroundImage: `url(${GAME_ASSETS.reference})` }}
      aria-labelledby="menu-title"
    >
      <div className="screen-image-shade" />
      <header className="menu-header">
        <BrandLockup artwork />
        <div className="menu-header__status">
          <span className="signal-dot" />
          CAMPANHA LOCAL
        </div>
      </header>

      <main className="menu-layout">
        <div className="menu-copy">
          <p className="eyebrow">
            <span>01</span> UMA EMPRESA. SEIS ERAS.
          </p>
          <h1 id="menu-title">
            DO <em>PEDAL</em>
            <br />
            AO PLANETA.
          </h1>
          <p className="menu-lead">
            Comece com uma bicicleta. Domine cada rota, evolua seus pneus e
            construa uma operação capaz de mover novos mundos.
          </p>

          <div className="menu-actions">
            <button
              className="xb-button xb-button--primary"
              onClick={() => handle.goBase()}
            >
              <Flag size={19} />
              {hasProgress ? "CONTINUAR NA CENTRAL" : "ENTRAR NA CENTRAL"}
            </button>
            <button
              className="xb-button xb-button--ghost"
              onClick={() => handle.goGarage()}
            >
              <Wrench size={18} /> GARAGEM & EVOLUÇÃO
            </button>
          </div>

          <div className="menu-stats">
            <StatChip
              icon={<Coins size={19} />}
              label="CAIXA"
              value={`${formatCredits(snapshot.campaign.credits)}`}
            />
            <StatChip
              icon={<Star size={19} />}
              label="REPUTAÇÃO"
              value={money.format(snapshot.campaign.reputation)}
            />
            <StatChip
              icon={<PackageCheck size={19} />}
              label="ENTREGAS"
              value={money.format(snapshot.campaign.deliveries)}
            />
          </div>
        </div>

        <aside className="menu-progression">
          <div className="progression-label">
            <span>SEU PRÓXIMO QUILÔMETRO</span>
            <strong>{vehicle.era}</strong>
          </div>
          <figure className="menu-mascot">
            <span className="menu-mascot__halo" aria-hidden="true" />
            <img
              src={GAME_ASSETS.driver}
              alt="Mascote XB PNEUS em uniforme azul-marinho fazendo sinal de positivo"
            />
            <figcaption>
              <small>MASCOTE XB · EQUIPE OFICIAL</small>
              <strong>PRONTO PARA A ROTA</strong>
            </figcaption>
          </figure>
          <div className="current-contract-card">
            <span className="card-index">
              ROTA {String(vehicle.order + 1).padStart(2, "0")}
            </span>
            <div>
              <MapPinned size={25} />
              <span>
                <small>CONTRATO ATIVO</small>
                <strong>{vehicle.route}</strong>
              </span>
            </div>
            <p>{vehicle.description}</p>
          </div>
        </aside>
      </main>

      <footer className="menu-footer">
        <span>← → ou A D para dirigir</span>
        <span>ESPAÇO ativa o Turbo Borracha XB</span>
        <span className="footer-motto">ADERÊNCIA • RESISTÊNCIA • ESCALA</span>
      </footer>
    </section>
  );
}

function VehicleCard({
  vehicle,
  snapshot,
  handle,
}: {
  vehicle: VehicleConfig;
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const { campaign } = snapshot;
  const unlocked = campaign.unlockedVehicles.includes(vehicle.id);
  const selected = campaign.selectedVehicleId === vehicle.id;
  const companyLevel = companyLevelFromXp(campaign.companyXp);
  const companyRequired = VEHICLE_UNLOCK_LEVELS[vehicle.id];
  const companyReady = companyLevel >= companyRequired;
  const garageRequired = vehicle.id === "bike" ? 0 : Math.min(5, vehicle.order);
  const garageReady = campaign.buildingLevels.garage >= garageRequired;
  const reputationReady = campaign.reputation >= vehicle.reputationRequired;
  const creditReady = campaign.credits >= vehicle.cost;
  const available =
    companyReady && garageReady && reputationReady && creditReady;
  const isFinal = vehicle.id === "planetary";
  const vehicleLevel = campaign.vehicleLevels[vehicle.id] || 0;
  const atMax = vehicleLevel >= 5;
  const garageLimit = Math.max(1, Math.min(5, campaign.buildingLevels.garage));
  const upgradeCost = vehicleUpgradeCost(
    vehicle.cost,
    Math.max(1, vehicleLevel)
  );

  return (
    <article
      className={`vehicle-card ${selected ? "is-selected" : ""} ${
        unlocked ? "is-unlocked" : "is-locked"
      } ${available ? "is-available" : ""}`}
      data-vehicle={vehicle.id}
      data-era-index={vehicle.order + 1}
    >
      <div className="vehicle-card__topline">
        <span>
          {unlocked
            ? `NÍVEL ${vehicleLevel}/5`
            : `ERA ${String(vehicle.order + 1).padStart(2, "0")}`}
        </span>
        {unlocked ? <Check size={15} /> : <LockKeyhole size={14} />}
      </div>
      <div className="vehicle-card__icon">
        {vehicle.id === "bike" ? <Bike /> : isFinal ? <Globe2 /> : <Truck />}
      </div>
      <p>{vehicle.era}</p>
      <h3>{vehicle.shortName}</h3>
      <span className="vehicle-route">
        <Route size={13} /> {vehicle.route}
      </span>
      <div className="vehicle-specs">
        <span>
          <Gauge size={13} /> {vehicleDisplaySpeedKmh(vehicle.id, vehicleLevel)}{" "}
          km/h
        </span>
        <span>
          <PackageCheck size={13} />{" "}
          {vehicleCargoCapacity(
            vehicle,
            Math.max(1, vehicleLevel),
            campaign.tireLevels.capacity
          )}{" "}
          vol.
        </span>
      </div>

      {unlocked && (
        <div
          className="vehicle-level-track"
          aria-label={`${vehicle.shortName}: nível ${vehicleLevel}`}
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <span
              key={index}
              className={index < vehicleLevel ? "filled" : ""}
            />
          ))}
        </div>
      )}

      {!unlocked && (
        <div className="vehicle-requirements">
          <span className={companyReady ? "ready" : ""}>
            N{companyRequired}
          </span>
          <span className={garageReady ? "ready" : ""}>
            <Wrench size={12} /> G{garageRequired}
          </span>
          <span className={reputationReady ? "ready" : ""}>
            <Star size={12} /> {vehicle.reputationRequired}
          </span>
          <span className={creditReady ? "ready" : ""}>
            XB$ {money.format(vehicle.cost)}
          </span>
        </div>
      )}

      <div className="vehicle-actions-stack">
        <button
          className="vehicle-action"
          onClick={() =>
            unlocked
              ? handle.selectVehicle(vehicle.id)
              : handle.buyVehicle(vehicle.id)
          }
        >
          {selected
            ? "EM OPERAÇÃO"
            : unlocked
              ? "SELECIONAR"
              : available
                ? "ADQUIRIR"
                : "VER REQUISITOS"}
        </button>
        {unlocked && (
          <button
            className="vehicle-upgrade-action"
            onClick={() => handle.upgradeVehicle(vehicle.id)}
            disabled={atMax}
          >
            {atMax
              ? "MÁXIMO"
              : vehicleLevel >= garageLimit
                ? `EXIGE GARAGEM ${vehicleLevel + 1}`
                : `MELHORAR · ${formatCredits(upgradeCost)}`}
          </button>
        )}
      </div>
    </article>
  );
}

function TireUpgrade({
  stat,
  snapshot,
  handle,
}: {
  stat: (typeof TIRE_STATS)[number];
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const level = snapshot.campaign.tireLevels[stat.id];
  const atMax = level >= TIRE_MAX_LEVEL;
  const cost = tireUpgradeCost(stat.id, level);
  const workshopLevel = snapshot.campaign.buildingLevels.workshop;
  const cappedByWorkshop = level >= workshopLevel && !atMax;

  return (
    <article className="tire-upgrade">
      <div className="tire-upgrade__head">
        <span className="tire-code">{stat.shortLabel}</span>
        <span>
          NÍVEL {level}/{TIRE_MAX_LEVEL} · OFICINA {workshopLevel}
        </span>
      </div>
      <h3>{stat.label}</h3>
      <p>{stat.description}</p>
      <div className="level-track" aria-label={`${stat.label}: nível ${level}`}>
        {Array.from({ length: TIRE_MAX_LEVEL }).map((_, index) => (
          <span key={index} className={index < level ? "filled" : ""} />
        ))}
      </div>
      <div className="tire-upgrade__footer">
        <span className="benefit">{stat.benefit}</span>
        <button
          onClick={() => handle.upgradeTire(stat.id as TireStat)}
          disabled={atMax}
        >
          {atMax
            ? "MÁXIMO"
            : cappedByWorkshop
              ? `EXIGE OFICINA ${level + 1}`
              : `${formatCredits(cost)}`}
        </button>
      </div>
    </article>
  );
}

function BikePartUpgrade({
  part,
  snapshot,
  handle,
}: {
  part: (typeof BIKE_PARTS)[number];
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const level = snapshot.campaign.bikePartLevels[part.id];
  const companyLevel = companyLevelFromXp(snapshot.campaign.companyXp);
  const nextTier = part.tiers.find(tier => tier.level === level + 1);
  const cost = bikePartUpgradeCost(part.id, level);
  const unlocked = companyLevel >= part.unlockLevel;
  const atMax = level >= MAX_BIKE_PART_LEVEL || !nextTier || cost === null;

  return (
    <article
      className={`bike-part-upgrade ${unlocked ? "is-unlocked" : "is-locked"}`}
    >
      <div className="bike-part-upgrade__head">
        <span>{part.shortName.toUpperCase()}</span>
        <strong>
          NÍVEL {level}/{MAX_BIKE_PART_LEVEL}
        </strong>
      </div>
      <h3>{level > 0 ? part.tiers[level - 1]?.name : part.name}</h3>
      <p>{part.description}</p>
      <div
        className="bike-part-levels"
        role="progressbar"
        aria-label={`${part.name}: nível ${level}`}
        aria-valuemin={0}
        aria-valuemax={MAX_BIKE_PART_LEVEL}
        aria-valuenow={level}
      >
        {Array.from({ length: MAX_BIKE_PART_LEVEL }).map((_, index) => (
          <i key={index} className={index < level ? "is-on" : ""} />
        ))}
      </div>
      <div className="bike-part-upgrade__next">
        <span>
          {atMax
            ? "CONFIGURAÇÃO MÁXIMA"
            : unlocked
              ? `PRÓXIMO · ${nextTier?.name ?? part.name}`
              : `LIBERA NO NÍVEL ${part.unlockLevel}`}
        </span>
        <button
          onClick={() => handle.upgradeBikePart(part.id as BikePartId)}
          disabled={!unlocked || atMax}
        >
          {atMax
            ? "MÁXIMO"
            : !unlocked
              ? "BLOQUEADO"
              : `MELHORAR · ${formatCredits(cost ?? 0)}`}
        </button>
      </div>
    </article>
  );
}

function GarageScreen({
  snapshot,
  handle,
}: {
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const selected = getVehicle(snapshot.campaign.selectedVehicleId);
  const companyLevel = companyLevelFromXp(snapshot.campaign.companyXp);
  const selectedLevel = snapshot.campaign.vehicleLevels[selected.id] || 1;
  const bikeCondition = snapshot.campaign.tireCondition.bike;
  const bikeServiceCost = bikeMaintenanceCost(
    bikeCondition,
    snapshot.campaign.bikePartLevels
  );

  return (
    <section
      className="game-screen garage-screen"
      style={{ backgroundImage: `url(${GAME_ASSETS.garage})` }}
    >
      <div className="garage-shade" />
      <header className="garage-header">
        <BrandLockup compact />
        <div className="garage-header__metrics">
          <span>
            <Coins size={16} /> XB$ {money.format(snapshot.campaign.credits)}
          </span>
          <span>
            <Star size={16} /> {money.format(snapshot.campaign.reputation)} REP
          </span>
          <span>
            <Building2 size={16} /> NÍVEL {companyLevel}
          </span>
          <button onClick={() => handle.goBase()}>VOLTAR À CENTRAL</button>
        </div>
      </header>

      <main className="garage-content">
        <section className="garage-intro">
          <div>
            <p className="eyebrow">
              <span>OFICINA</span> CENTRO DE EVOLUÇÃO
            </p>
            <h1>
              TRANSFORME CADA
              <br />
              <em>QUILÔMETRO</em> EM ESCALA.
            </h1>
          </div>
          <div className="selected-operation">
            <small>OPERAÇÃO ATUAL</small>
            <strong>{selected.name}</strong>
            <span>
              Nível {selectedLevel}/5 · {selected.era} · {selected.route}
            </span>
            <img
              className="garage-mascot"
              src={GAME_ASSETS.driver}
              alt="Mascote XB PNEUS em uniforme azul-marinho fazendo sinal de positivo"
            />
          </div>
        </section>

        <img
          className="garage-progression-art"
          src={GAME_ASSETS.reference}
          alt="Frota XB PNEUS evoluindo da bicicleta ao transporte planetário"
        />

        {snapshot.notice && (
          <div className="game-notice" role="status" aria-live="polite">
            <Sparkles size={16} /> {snapshot.notice}
          </div>
        )}

        <section className="bike-parts-workshop">
          <div className="section-heading">
            <span>MVP</span>
            <div>
              <small>DA PRIMEIRA ENTREGA À MICROFROTA</small>
              <h2>OFICINA DA BICICLETA</h2>
            </div>
          </div>
          <div className="bike-parts-summary">
            <div>
              <small>CONDIÇÃO MECÂNICA</small>
              <strong>{Math.round(bikeCondition)}%</strong>
              <div
                role="progressbar"
                aria-label="Condição da bicicleta"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(bikeCondition)}
              >
                <i style={{ width: `${bikeCondition}%` }} />
              </div>
            </div>
            <button
              onClick={() => handle.maintainBike()}
              disabled={bikeCondition >= 100}
            >
              <Wrench size={16} />{" "}
              {bikeCondition >= 100
                ? "REVISÃO EM DIA"
                : `REVISAR · ${formatCredits(bikeServiceCost)}`}
            </button>
          </div>
          <div className="bike-parts-grid">
            {BIKE_PARTS.map(part => (
              <BikePartUpgrade
                key={part.id}
                part={part}
                snapshot={snapshot}
                handle={handle}
              />
            ))}
          </div>
        </section>

        <div className="garage-panels">
          <section className="vehicle-catalog">
            <div className="section-heading">
              <span>01</span>
              <div>
                <small>ESCALA DA EMPRESA</small>
                <h2>FROTA, NÍVEIS & NOVAS ERAS</h2>
              </div>
            </div>
            <div className="vehicle-grid">
              {snapshot.vehicles.map(vehicle => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  snapshot={snapshot}
                  handle={handle}
                />
              ))}
            </div>
          </section>

          <section className="tire-workshop">
            <div className="section-heading">
              <span>02</span>
              <div>
                <small>TECNOLOGIA CENTRAL</small>
                <h2>PNEUS XB PERFORMANCE</h2>
              </div>
            </div>
            <div className="tire-stack">
              {TIRE_STATS.map(stat => (
                <TireUpgrade
                  key={stat.id}
                  stat={stat}
                  snapshot={snapshot}
                  handle={handle}
                />
              ))}
            </div>
            <div className="tire-principle">
              <ShieldCheck size={28} />
              <p>
                <strong>
                  Oficina nível {snapshot.campaign.buildingLevels.workshop}.
                </strong>{" "}
                Cada pesquisa afeta controle, integridade, receita ou capacidade
                em tempo real.
              </p>
            </div>
          </section>
        </div>

        <TireStrategyPanel campaign={snapshot.campaign} handle={handle} />

        <div className="garage-bottom-actions">
          <button
            className="xb-button xb-button--primary"
            onClick={() => handle.goRoutes()}
          >
            <Flag size={18} /> ESCOLHER ROTA PARA PILOTAR
          </button>
          <button
            className="reset-button"
            onClick={() => {
              if (window.confirm("Reiniciar toda a campanha da XB Pneus?"))
                handle.resetProgress();
            }}
          >
            <RotateCcw size={15} /> REINICIAR CAMPANHA
          </button>
        </div>
      </main>
    </section>
  );
}

function RunningHud({
  snapshot,
  handle,
  canvasRef,
}: {
  snapshot: GameSnapshot;
  handle: GameHandle;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const run = snapshot.run as typeof snapshot.run & {
    routeId?: string;
    routeName?: string;
  };
  const vehicle = getVehicle(
    run.vehicleId ?? snapshot.campaign.selectedVehicleId
  );
  const routeName =
    run.routeName ??
    ROUTES.find(route => route.id === run.routeId)?.name ??
    vehicle.route;

  useEffect(() => {
    // O motor escuta o teclado no próprio canvas: sem foco a rota não responde.
    const frame = window.requestAnimationFrame(() =>
      canvasRef.current?.focus()
    );
    return () => window.cancelAnimationFrame(frame);
  }, [canvasRef]);

  return (
    <section
      className="running-hud"
      data-pilot-focus="active"
      data-v270-input={
        typeof navigator !== "undefined" && navigator.maxTouchPoints > 0
          ? "touch"
          : "keyboard"
      }
      aria-label="Telemetria da corrida"
    >
      <div className="hud-topline">
        <BrandLockup compact />
        <div className="route-chip">
          <span>ERA {String(vehicle.order + 1).padStart(2, "0")}</span>
          <strong>{routeName}</strong>
        </div>
        <div className="hud-score">
          <small>PONTUAÇÃO</small>
          <strong>{money.format(snapshot.run.score)}</strong>
        </div>
        <button
          className="pause-button"
          onClick={() => handle.pauseRun()}
          aria-label="Pausar corrida"
        >
          <Pause size={18} /> <span>PAUSAR</span>
        </button>
      </div>

      <PilotFocusLayer snapshot={snapshot} />

      <div className="hud-navigation-stack">
        <LiveMinimap progress={snapshot.run.progress} routeName={routeName} />
      </div>

      <div
        key={snapshot.run.impactSerial}
        className={snapshot.run.impactSerial ? "impact-frame" : ""}
      />

      <div className="touch-controls">
        <button
          data-v270-control="left"
          onClick={() => handle.moveLeft()}
          aria-label="Mover para a faixa esquerda"
        >
          <ArrowLeft />
          <span>ESQUERDA</span>
        </button>
        <button
          data-v270-control="right"
          onClick={() => handle.moveRight()}
          aria-label="Mover para a faixa direita"
        >
          <ArrowRight />
          <span>DIREITA</span>
        </button>
        <button
          data-v270-control="turbo"
          className={`turbo-action ${snapshot.run.turboActive ? "is-active" : ""}`}
          onClick={() => handle.activateTurbo()}
          disabled={snapshot.run.turboActive || snapshot.run.turboEnergy < 100}
          aria-label={
            snapshot.run.turboActive
              ? "Turbo Borracha XB ativo"
              : snapshot.run.turboEnergy >= 100
                ? "Ativar Turbo Borracha XB"
                : `Turbo Borracha XB carregando, ${Math.round(snapshot.run.turboEnergy)} por cento`
          }
        >
          <Sparkles />
          <span>
            {snapshot.run.turboActive
              ? "TURBO ATIVO"
              : snapshot.run.turboEnergy >= 100
                ? "ATIVAR TURBO"
                : `${Math.round(snapshot.run.turboEnergy)}%`}
          </span>
        </button>
      </div>

      <div className="hud-instruction" aria-hidden="true">
        ← → / A D <span>MUDE DE FAIXA</span> · ESPAÇO <span>TURBO</span> · P{" "}
        <span>PAUSAR</span>
      </div>
    </section>
  );
}

function PauseOverlay({ handle }: { handle: GameHandle }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    resumeRef.current?.focus();
  }, []);

  useFocusTrap(panelRef, { onEscape: () => handle.resumeRun() });

  return (
    <section
      className="pause-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div ref={panelRef} className="pause-panel">
        <Pause size={38} aria-hidden="true" />
        <p className="eyebrow">
          <span>BOX</span> OPERAÇÃO PAUSADA
        </p>
        <h1 id="pause-title">PIT STOP.</h1>
        <p>
          A rota está segura. Continue quando estiver pronto ou encerre a
          viagem.
        </p>
        <div className="pause-actions">
          <button
            ref={resumeRef}
            className="xb-button xb-button--primary"
            onClick={() => handle.resumeRun()}
          >
            <Play size={18} /> CONTINUAR
          </button>
          <button
            className="xb-button xb-button--ghost"
            onClick={() => handle.abortRun()}
          >
            <LogOut size={18} /> ENCERRAR E VER RELATÓRIO
          </button>
          <button
            className="pause-menu-button"
            onClick={() => {
              handle.abortRun();
              handle.goMenu();
            }}
          >
            <LogOut size={16} /> VOLTAR AO MENU INICIAL
          </button>
        </div>
      </div>
    </section>
  );
}

function ResultScreen({
  snapshot,
  handle,
}: {
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const result = snapshot.lastResult;
  const panelRef = useRef<HTMLDivElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const run = snapshot.run as typeof snapshot.run & {
    routeId?: string;
    routeName?: string;
    operatingCost?: number;
  };
  const resultRouteId = result?.routeId ?? run.routeId;

  useEffect(() => {
    primaryActionRef.current?.focus();
  }, []);

  useFocusTrap(panelRef, { onEscape: () => handle.goRoutes() });

  if (!result) return null;
  const vehicle = getVehicle(
    result.vehicleId ?? run.vehicleId ?? snapshot.campaign.selectedVehicleId
  );
  const resultRoute = ROUTES.find(route => route.id === resultRouteId);
  const resultRouteName = run.routeName ?? resultRoute?.name ?? vehicle.route;
  const operatingCost = result.operatingCost ?? run.operatingCost;
  const wasAborted = Boolean(result.aborted);
  const netCredits = result.netCreditsEarned ?? result.creditsEarned;
  const repeatValidation = resultRouteId
    ? handle.previewRoute(resultRouteId)
    : { ok: false, message: "Escolha um contrato na Central de Rotas." };
  const canRepeat = Boolean(resultRouteId && repeatValidation.ok);

  return (
    <section
      className="result-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
    >
      <div
        ref={panelRef}
        className={`result-panel ${wasAborted ? "is-aborted" : result.success ? "is-success" : "is-failure"}`}
      >
        <div className="result-stamp">
          {wasAborted ? <LogOut /> : result.success ? <Check /> : <Wrench />}
        </div>
        <p className="eyebrow">
          <span>RELATÓRIO</span> ROTA FINALIZADA
        </p>
        <h1 id="result-title">
          {wasAborted
            ? "ROTA ENCERRADA."
            : result.success
              ? "ENTREGA CONCLUÍDA."
              : "HORA DE REVISAR."}
        </h1>
        <p>
          {wasAborted
            ? `A operação ${resultRouteName} foi encerrada voluntariamente. O custo já mobilizado não é reembolsável.`
            : result.success
              ? `${resultRouteName} agora faz parte da história da sua empresa.`
              : "A carga voltou para a base. Melhore a durabilidade e tente novamente."}
        </p>

        <div className="result-primary">
          <small>
            {wasAborted ? "SALDO LÍQUIDO DO ENCERRAMENTO" : "SALDO LÍQUIDO"}
          </small>
          <strong>XB$ {money.format(netCredits)}</strong>
          <span>+{result.reputationEarned} reputação</span>
          {result.perfectRoute && (
            <em className="perfect-route-badge">
              <Sparkles size={14} /> ROTA PERFEITA · BÔNUS TURBO XB
            </em>
          )}
        </div>

        <div className="result-grid">
          <span>
            <small>DISTÂNCIA</small>
            <strong>{result.distance} km</strong>
          </span>
          <span>
            <small>VOLUMES</small>
            <strong>{result.cargo}</strong>
          </span>
          <span>
            <small>PNEUS XB</small>
            <strong>{result.tireTokens}</strong>
          </span>
          <span>
            <small>INTEGRIDADE</small>
            <strong>{result.integrity}%</strong>
          </span>
          {typeof operatingCost === "number" && (
            <span>
              <small>CUSTO OPERACIONAL</small>
              <strong>XB$ {money.format(operatingCost)}</strong>
            </span>
          )}
          {typeof result.baseCreditsEarned === "number" && (
            <span>
              <small>CONTRATO BASE</small>
              <strong>XB$ {money.format(result.baseCreditsEarned)}</strong>
            </span>
          )}
          {typeof result.collectibleBonusCredits === "number" &&
            result.collectibleBonusCredits > 0 && (
              <span>
                <small>BÔNUS DE COLETA</small>
                <strong>
                  XB$ {money.format(result.collectibleBonusCredits)}
                </strong>
              </span>
            )}
          {typeof result.perfectRouteBonusCredits === "number" &&
            result.perfectRouteBonusCredits > 0 && (
              <span>
                <small>BÔNUS ROTA PERFEITA</small>
                <strong>
                  XB$ {money.format(result.perfectRouteBonusCredits)}
                </strong>
              </span>
            )}
          {typeof result.grossCreditsEarned === "number" && (
            <span>
              <small>RECEITA BRUTA</small>
              <strong>XB$ {money.format(result.grossCreditsEarned)}</strong>
            </span>
          )}
          {typeof result.turboActivations === "number" &&
            result.turboActivations > 0 && (
              <span>
                <small>TURBO XB</small>
                <strong>{result.turboActivations}× ATIVADO</strong>
              </span>
            )}
        </div>

        {!canRepeat && (
          <p
            className="result-repeat-status"
            id="result-repeat-status"
            role="status"
          >
            <Wrench size={15} aria-hidden="true" /> Para repetir:{" "}
            {repeatValidation.message}
          </p>
        )}

        <div className="result-actions">
          <button
            ref={primaryActionRef}
            className="xb-button xb-button--primary"
            onClick={() => handle.goBase()}
          >
            <Home size={18} /> IR PARA CENTRAL
          </button>
          <button
            className="xb-button xb-button--ghost"
            onClick={() => handle.goRoutes()}
          >
            <MapPinned size={18} /> ESCOLHER ROTA
          </button>
          <button
            className="xb-button xb-button--ghost"
            onClick={() => canRepeat && handle.startRun(resultRouteId)}
            disabled={!canRepeat}
            aria-describedby={canRepeat ? undefined : "result-repeat-status"}
          >
            <Route size={18} /> REPETIR
          </button>
        </div>
      </div>
    </section>
  );
}

function CompleteScreen({
  snapshot,
  handle,
}: {
  snapshot: GameSnapshot;
  handle: GameHandle;
}) {
  const finalResult =
    snapshot.lastResult?.routeId === "rede-solar-final"
      ? snapshot.lastResult
      : null;
  return (
    <section
      className="game-screen complete-screen"
      style={{ backgroundImage: `url(${GAME_ASSETS.planetary})` }}
    >
      <div className="complete-shade" />
      <header className="complete-header">
        <BrandLockup />
      </header>
      <main className="complete-copy">
        <p className="eyebrow">
          <span>ERA 06</span> ROTA PLANETÁRIA
        </p>
        <h1>
          VOCÊ MOVEU
          <br />
          <em>O MUNDO.</em>
        </h1>
        <p>
          Da primeira entrega de bicicleta à maior operação logística da
          história da XB Pneus. Agora, cada horizonte é uma nova rota.
        </p>
        <div className="complete-stats">
          <span>
            <small>ENTREGAS</small>
            <strong>{money.format(snapshot.campaign.deliveries)}</strong>
          </span>
          <span>
            <small>DISTÂNCIA</small>
            <strong>{money.format(snapshot.campaign.totalDistance)} km</strong>
          </span>
          <span>
            <small>REPUTAÇÃO</small>
            <strong>{money.format(snapshot.campaign.reputation)}</strong>
          </span>
          {finalResult && (
            <>
              <span>
                <small>SALDO LÍQUIDO DA ROTA</small>
                <strong>
                  XB${" "}
                  {money.format(
                    finalResult.netCreditsEarned ?? finalResult.creditsEarned
                  )}
                </strong>
              </span>
              <span>
                <small>CUSTO OPERACIONAL</small>
                <strong>
                  XB$ {money.format(finalResult.operatingCost ?? 0)}
                </strong>
              </span>
            </>
          )}
        </div>
        <div className="menu-actions">
          <button
            className="xb-button xb-button--primary"
            onClick={() => handle.goRoutes()}
          >
            <Globe2 size={19} /> ESCOLHER OPERAÇÃO
          </button>
          <button
            className="xb-button xb-button--ghost"
            onClick={() => handle.goBase()}
          >
            <Building2 size={18} /> CENTRAL LOGÍSTICA
          </button>
        </div>
      </main>
    </section>
  );
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const handleRef = useRef<GameHandle | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const feedbackRef = useRef<GameFeedback | null>(null);
  const modeRef = useRef<string>("loading");
  const [qualityPreference, setQualityPreference] = useState<QualityPreference>(
    loadQualityPreference
  );
  const qualitySettings = useMemo(
    () => resolveQualitySettings(qualityPreference),
    [qualityPreference]
  );
  const qualitySettingsRef = useRef(qualitySettings);
  const [feedbackPreferences, setFeedbackPreferences] =
    useState<FeedbackPreferences>(loadFeedbackPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [engineError, setEngineError] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  // Refs não podem ser escritas durante o render: renders descartados vazariam.
  useEffect(() => {
    qualitySettingsRef.current = qualitySettings;
  }, [qualitySettings]);

  useEffect(() => {
    const feedback = new GameFeedback({
      initialPreferences: feedbackPreferences,
      contextProvider: () => ({
        paused: modeRef.current === "paused",
        hidden: document.hidden,
      }),
    });
    feedbackRef.current = feedback;
    return () => {
      feedbackRef.current = null;
      void feedback.dispose();
    };
    // Preferences are updated through setPreferences without recreating audio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeQuality = (preference: QualityPreference) => {
    saveQualityPreference(preference);
    const nextSettings = resolveQualitySettings(preference);
    qualitySettingsRef.current = nextSettings;
    setQualityPreference(preference);
    engineRef.current?.setHardwareScalingLevel(
      babylonHardwareScalingLevel(nextSettings)
    );
  };

  const changeFeedback = (preferences: FeedbackPreferences) => {
    setFeedbackPreferences(preferences);
    feedbackRef.current?.setPreferences(preferences);
    if (preferences.soundEnabled) void feedbackRef.current?.unlockAudio();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    let initializationExpired = false;
    let unsubscribe: (() => void) | null = null;
    let initializationTimer: number | null = null;
    let idleTickTimer: number | null = null;
    let renderFrameId: number | null = null;
    let idleTransitionFrameId: number | null = null;
    let resizeFrameId: number | null = null;
    let engine: Engine | null = null;
    let stopRenderLoop: (() => void) | null = null;
    let resumeRenderLoop: (() => void) | null = null;
    let renderingSuspended = false;

    // Cada resize recria o framebuffer do Babylon: um quadro por rajada basta.
    const onResize = () => {
      if (resizeFrameId !== null) return;
      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = null;
        engine?.resize();
      });
    };

    // Aba escondida no meio da rota é corrida às cegas: pausamos por segurança.
    const onVisibilityChange = () => {
      if (!document.hidden || modeRef.current !== "running") return;
      handleRef.current?.pauseRun();
    };

    const cancelPendingFrames = () => {
      if (renderFrameId !== null) {
        window.cancelAnimationFrame(renderFrameId);
        renderFrameId = null;
      }
      if (idleTransitionFrameId !== null) {
        window.cancelAnimationFrame(idleTransitionFrameId);
        idleTransitionFrameId = null;
      }
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
        resizeFrameId = null;
      }
    };

    // Toda saída — expiração, falha ou desmontagem — passa por aqui.
    const releaseEngine = () => {
      cancelPendingFrames();
      if (initializationTimer !== null) {
        window.clearTimeout(initializationTimer);
        initializationTimer = null;
      }
      if (idleTickTimer !== null) {
        window.clearInterval(idleTickTimer);
        idleTickTimer = null;
      }
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopRenderLoop = null;
      resumeRenderLoop = null;
      unsubscribe?.();
      unsubscribe = null;
      handleRef.current?.dispose();
      handleRef.current = null;
      engineRef.current = null;
      engine?.dispose();
      engine = null;
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilityChange);

    initializationTimer = window.setTimeout(() => {
      if (cancelled) return;
      initializationExpired = true;
      initializationTimer = null;
      setEngineError(true);
      releaseEngine();
      startedRef.current = false;
    }, 12_000);

    Promise.all([
      import("@babylonjs/core/Engines/engine"),
      import("@/game/scene"),
    ])
      .then(([{ Engine: BabylonEngine }, { createGameScene }]) => {
        if (cancelled || initializationExpired) return null;
        const settings = qualitySettingsRef.current;
        engine = new BabylonEngine(canvas, settings.antialias, {
          preserveDrawingBuffer: false,
          stencil: false,
          adaptToDeviceRatio: true,
        });
        engineRef.current = engine;
        engine.setHardwareScalingLevel(babylonHardwareScalingLevel(settings));
        // Um reset de GPU no Android deixava a pista preta sem qualquer aviso.
        engine.onContextLostObservable.add(() => {
          renderingSuspended = true;
          stopRenderLoop?.();
          setContextLost(true);
        });
        engine.onContextRestoredObservable.add(() => {
          renderingSuspended = false;
          setContextLost(false);
          engine?.resize();
          resumeRenderLoop?.();
        });
        return createGameScene(engine, canvas, {
          glow: settings.preset !== "performance",
          shadows: settings.preset !== "performance",
        });
      })
      .then(handle => {
        if (!handle) return;
        if (cancelled || initializationExpired) {
          handle.dispose();
          return;
        }
        if (initializationTimer !== null) {
          window.clearTimeout(initializationTimer);
          initializationTimer = null;
        }
        handleRef.current = handle;
        let lastRenderAt = 0;
        let previousSnapshot: GameSnapshot | null = null;
        const renderScene = () => {
          if (cancelled || renderingSuspended || engine?.isDisposed) return;
          engine?.beginFrame();
          handle.scene.render();
          engine?.endFrame();
        };
        const stopContinuousRender = () => {
          if (renderFrameId === null) return;
          window.cancelAnimationFrame(renderFrameId);
          renderFrameId = null;
        };
        const startContinuousRender = () => {
          if (renderFrameId !== null || renderingSuspended) return;
          if (modeRef.current !== "running") return;
          renderFrameId = window.requestAnimationFrame(timestamp => {
            renderFrameId = null;
            if (modeRef.current !== "running") return;
            const minimumFrameTime =
              1_000 / qualitySettingsRef.current.targetFps;
            if (timestamp - lastRenderAt >= minimumFrameTime - 1) {
              renderScene();
              lastRenderAt = timestamp;
            }
            startContinuousRender();
          });
        };
        const requestIdleTransitionRender = () => {
          if (idleTransitionFrameId !== null || renderingSuspended) return;
          idleTransitionFrameId = window.requestAnimationFrame(() => {
            idleTransitionFrameId = null;
            if (modeRef.current !== "running") renderScene();
          });
        };
        stopRenderLoop = stopContinuousRender;
        resumeRenderLoop = () => {
          if (modeRef.current === "running") startContinuousRender();
          else requestIdleTransitionRender();
        };
        unsubscribe = handle.subscribe(nextSnapshot => {
          if (previousSnapshot) {
            const feedback = feedbackRef.current;
            if (
              nextSnapshot.run.impactSerial > previousSnapshot.run.impactSerial
            ) {
              void feedback?.trigger("collision");
            } else if (
              nextSnapshot.run.cargo > previousSnapshot.run.cargo ||
              nextSnapshot.run.tireTokens > previousSnapshot.run.tireTokens
            ) {
              void feedback?.trigger("pickup");
            }
            if (
              nextSnapshot.run.turboActive &&
              !previousSnapshot.run.turboActive
            ) {
              void feedback?.trigger("boost");
            }
            if (
              nextSnapshot.mode === "result" &&
              previousSnapshot.mode !== "result"
            ) {
              void feedback?.trigger(
                nextSnapshot.lastResult?.success ? "success" : "error"
              );
            }
          }
          previousSnapshot = nextSnapshot;
          modeRef.current =
            nextSnapshot.mode === "running" && nextSnapshot.run.paused
              ? "paused"
              : nextSnapshot.mode;
          setSnapshot(nextSnapshot);
          if (modeRef.current === "running") {
            if (idleTransitionFrameId !== null) {
              window.cancelAnimationFrame(idleTransitionFrameId);
              idleTransitionFrameId = null;
            }
            startContinuousRender();
          } else {
            stopContinuousRender();
            requestIdleTransitionRender();
          }
        });
        idleTickTimer = window.setInterval(() => {
          if (modeRef.current === "running") return;
          renderScene();
          setSnapshot(handle.getSnapshot());
        }, 1_000);
      })
      .catch(() => {
        if (cancelled || initializationExpired) return;
        setEngineError(true);
        releaseEngine();
        startedRef.current = false;
      });

    return () => {
      cancelled = true;
      releaseEngine();
      startedRef.current = false;
    };
  }, []);

  const handle = handleRef.current;
  const canvasHidden = snapshot?.mode !== "running" || snapshot.run.paused;

  // aria-hidden com foco dentro esconde do leitor de tela o elemento focado.
  useEffect(() => {
    if (!canvasHidden) return;
    const canvas = canvasRef.current;
    if (canvas && document.activeElement === canvas) canvas.blur();
  }, [canvasHidden]);

  return (
    <div
      className="game-shell"
      onPointerDownCapture={event => {
        const feedback = feedbackRef.current;
        void feedback?.unlockAudio();
        if ((event.target as HTMLElement).closest("button"))
          void feedback?.trigger("button");
      }}
    >
      <canvas
        ref={canvasRef}
        className="game-canvas"
        style={{ touchAction: "none" }}
        aria-label="Estrada 3D da rota XB Pneus. Use as setas esquerda e direita ou as teclas A e D para mudar de faixa."
        aria-hidden={canvasHidden}
        tabIndex={canvasHidden ? -1 : 0}
      />

      {engineError ? (
        <div
          className="engine-error-screen"
          role="alert"
          aria-labelledby="engine-error-title"
        >
          <Wrench size={44} aria-hidden="true" />
          <strong id="engine-error-title">A PISTA 3D NÃO INICIOU</strong>
          <p>
            Feche outros aplicativos pesados e recarregue o jogo. Seu progresso
            permanece salvo.
          </p>
          <button
            className="xb-button xb-button--primary"
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={18} /> TENTAR NOVAMENTE
          </button>
        </div>
      ) : !snapshot || !handle ? (
        <div
          className="loading-screen"
          role="status"
          aria-live="polite"
          aria-label="Preparando a rota"
        >
          <img src={GAME_ASSETS.logo} alt="XB Pneus" />
          <strong>PREPARANDO A ROTA</strong>
          <span aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      ) : (
        <div className="game-ui">
          {snapshot.mode === "base" && (
            <BaseScreen snapshot={snapshot} handle={handle} />
          )}
          {snapshot.mode === "routes" && (
            <RoutesScreen snapshot={snapshot} handle={handle} />
          )}
          {snapshot.mode === "menu" && (
            <MenuScreen snapshot={snapshot} handle={handle} />
          )}
          {snapshot.mode === "garage" && (
            <GarageScreen snapshot={snapshot} handle={handle} />
          )}
          {snapshot.mode === "running" && !snapshot.run.paused && (
            <RunningHud
              snapshot={snapshot}
              handle={handle}
              canvasRef={canvasRef}
            />
          )}
          {snapshot.mode === "running" && snapshot.run.paused && (
            <PauseOverlay handle={handle} />
          )}
          {snapshot.mode === "result" && (
            <ResultScreen snapshot={snapshot} handle={handle} />
          )}
          {snapshot.mode === "complete" && (
            <CompleteScreen snapshot={snapshot} handle={handle} />
          )}
          {snapshot.isDemo && (
            <div className="demo-badge" role="status">
              <CircleGauge size={14} /> DEMONSTRAÇÃO AUTOMÁTICA
            </div>
          )}
          {snapshot.mode !== "running" && snapshot.mode !== "result" && (
            <ExperienceSettings
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              qualityPreference={qualityPreference}
              resolvedPreset={qualitySettings.preset}
              onQualityChange={changeQuality}
              feedback={feedbackPreferences}
              onFeedbackChange={changeFeedback}
            />
          )}
        </div>
      )}

      {contextLost && !engineError && (
        <div
          className="engine-error-screen"
          role="alert"
          aria-labelledby="context-lost-title"
        >
          <Wrench size={44} aria-hidden="true" />
          <strong id="context-lost-title">A PLACA DE VÍDEO REINICIOU</strong>
          <p>
            O navegador perdeu o contexto 3D da pista. Recarregue para voltar à
            rota; seu progresso permanece salvo no dispositivo.
          </p>
          <button
            className="xb-button xb-button--primary"
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={18} /> RECARREGAR
          </button>
        </div>
      )}
    </div>
  );
}

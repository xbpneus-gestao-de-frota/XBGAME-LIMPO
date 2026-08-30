import { getVehicle, vehicleDisplaySpeedKmh } from "@/game/config";
import { deliveryExperience } from "@/game/deliveryExperience";
import { fitLabel, terrainLabel, weatherLabel } from "@/game/operations";
import { ROUTES } from "@/game/progression";
import type { GameSnapshot } from "@/game/types";
import { money } from "./format";

/*
 * Sem React.memo de propósito: a camada mostra telemetria ao vivo
 * (velocidade, integridade, turbo, pontos e progresso) que muda a cada
 * publicação do motor. Nenhum recorte de props faria o memo pular um render;
 * ele só somava uma comparação rasa a cada quadro.
 */
function PilotFocusLayer({ snapshot }: { snapshot: GameSnapshot }) {
  const run = snapshot.run;
  const vehicleId = run.vehicleId ?? snapshot.campaign.selectedVehicleId;
  const vehicle = getVehicle(vehicleId);
  const route = ROUTES.find(item => item.id === run.routeId);
  const routeName = route?.name ?? vehicle.route;
  const vehicleLevel = snapshot.campaign.vehicleLevels[vehicleId] || 1;
  const tireCondition = snapshot.campaign.tireCondition[vehicleId] ?? 100;
  const speed = vehicleDisplaySpeedKmh(vehicleId, vehicleLevel, tireCondition);
  const experience = deliveryExperience(run.progress, run.paused);
  const progressPercent = Math.round(experience.progress * 100);
  const integrity = Math.round(run.integrity);
  const turbo = Math.round(run.turboEnergy);
  const context = [
    run.weather ? weatherLabel(run.weather) : null,
    run.terrain ? terrainLabel(run.terrain) : null,
    run.tireFit ? fitLabel(run.tireFit) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <aside
      className="v270-focus-layer"
      data-xb-hud="golden-route"
      data-stage={experience.stage}
      data-turbo={
        run.turboActive ? "active" : turbo >= 100 ? "ready" : "charging"
      }
      data-vehicle={vehicleId}
      aria-label="HUD Focus do Modo Piloto"
    >
      <div className="v270-edge-shade" aria-hidden="true" />
      <div className="v270-mode-chip">
        <i aria-hidden="true" />
        <span>MODO PILOTO</span>
        <b>{run.terrain ? `${terrainLabel(run.terrain)} XB` : "CIDADE XB"}</b>
      </div>

      <section
        className={`v270-objective ${run.elapsed > 3.8 ? "is-compact" : ""}`}
        aria-label="Objetivo da rota"
      >
        <header>
          <span>ERA {String(vehicle.order + 1).padStart(2, "0")}</span>
          <b>{progressPercent}%</b>
        </header>
        <h1>{routeName}</h1>
        <p>{context || "OPERAÇÃO LOCAL · PNEUS XB"}</p>
        <div
          className="v270-objective-track"
          role="progressbar"
          aria-label="Progresso do contrato"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        >
          <i style={{ width: `${progressPercent}%` }} />
        </div>
      </section>

      <section className="v270-telemetry" aria-label="Telemetria essencial">
        <div className="v270-speed">
          <strong>{speed}</strong>
          <span>KM/H</span>
        </div>
        <dl>
          <div>
            <dt>INTEGRIDADE</dt>
            <dd>{integrity}%</dd>
          </div>
          <div>
            <dt>TURBO</dt>
            <dd>{run.turboActive ? "ATIVO" : `${turbo}%`}</dd>
          </div>
          <div>
            <dt>PONTOS</dt>
            <dd>{money.format(run.score)}</dd>
          </div>
        </dl>
        <div className="v270-integrity-track" aria-hidden="true">
          <i style={{ width: `${integrity}%` }} />
        </div>
      </section>

      <section className="v270-stage" aria-live="polite">
        <i aria-hidden="true" />
        <span>{experience.label.toUpperCase()}</span>
        <b>{experience.detail}</b>
      </section>

      <div
        className="v270-lane-guide"
        aria-label={`Faixa ${run.laneIndex + 1} de 3`}
      >
        {[0, 1, 2].map(lane => (
          <i
            key={lane}
            className={snapshot.run.laneIndex === lane ? "is-active" : ""}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="v270-footer" aria-hidden="true">
        <span>ORIGEM</span>
        <i>
          <b style={{ width: `${progressPercent}%` }} />
        </i>
        <strong>{progressPercent}%</strong>
        <span>DESTINO</span>
      </div>
    </aside>
  );
}

export default PilotFocusLayer;

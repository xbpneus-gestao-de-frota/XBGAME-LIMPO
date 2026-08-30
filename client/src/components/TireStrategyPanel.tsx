/**
 * Pit Lane Industrial: seleção de composto como decisão operacional, com
 * condição e manutenção separadas de preços reais de produtos.
 */
import { memo } from "react";
import {
  Check,
  CircleGauge,
  Coins,
  LockKeyhole,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { GAME_ASSETS } from "@/game/assets";
import {
  TIRE_COMPOUNDS,
  getCompound,
  isCompoundUnlocked,
  maintenanceCost,
} from "@/game/operations";
import { getVehicle } from "@/game/config";
import type { GameHandle } from "@/game/scene";
import type { CampaignState } from "@/game/types";
import { formatCredits } from "./format";

/** Recebe apenas a campanha: a referência é estável e o memo realmente acerta. */
function TireStrategyPanel({
  campaign,
  handle,
}: {
  campaign: CampaignState;
  handle: GameHandle;
}) {
  const vehicleId = campaign.selectedVehicleId;
  const vehicle = getVehicle(vehicleId);
  const equippedId = campaign.equippedCompounds[vehicleId];
  const equipped = getCompound(equippedId);
  const condition = campaign.tireCondition[vehicleId];
  const workshop = campaign.buildingLevels.workshop;
  const planetLab = campaign.buildingLevels.planetLab;
  // Mesmo cálculo do CampaignStore.maintainVehicleTires: sem os níveis das
  // peças o botão anunciava o preço cheio e a oficina cobrava o preço com
  // desconto — dois valores para a mesma ação, lado a lado na garagem.
  const serviceCost = maintenanceCost(
    vehicleId,
    condition,
    vehicleId === "bike" ? campaign.bikePartLevels : undefined
  );

  return (
    <section
      className="tire-strategy-panel"
      aria-labelledby="tire-strategy-title"
    >
      <div
        className="tire-strategy-panel__visual"
        style={{ backgroundImage: `url(${GAME_ASSETS.tireCompounds})` }}
      >
        <div>
          <small>03 · ESTRATÉGIA OPERACIONAL</small>
          <h2 id="tire-strategy-title">
            COMPOSTO CERTO.
            <br />
            <em>ROTA MAIS FORTE.</em>
          </h2>
          <p>Equipe o pneu conforme terreno e previsão antes de despachar.</p>
        </div>
        <aside>
          <span>
            <CircleGauge size={15} /> CONDIÇÃO · {vehicle.shortName}
          </span>
          <strong>{condition}%</strong>
          <div
            role="progressbar"
            aria-label={`Condição dos pneus do ${vehicle.shortName}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={condition}
          >
            <i style={{ width: `${condition}%` }} />
          </div>
          <small>
            {equipped.code} · {equipped.name}
          </small>
          <button
            onClick={() => handle.maintainVehicleTires(vehicleId)}
            disabled={condition >= 100}
          >
            <Wrench size={14} />{" "}
            {condition >= 100
              ? "CONDIÇÃO MÁXIMA"
              : `MANUTENÇÃO · ${formatCredits(serviceCost)}`}
          </button>
        </aside>
      </div>

      <div
        className="compound-grid"
        role="group"
        aria-label="Compostos de pneus"
      >
        {TIRE_COMPOUNDS.map(compound => {
          const unlocked = isCompoundUnlocked(compound, workshop, planetLab);
          const active = equippedId === compound.id;
          return (
            <article
              key={compound.id}
              className={`${active ? "is-equipped" : ""} ${unlocked ? "is-unlocked" : "is-locked"}`}
              style={
                { "--compound-accent": compound.accent } as React.CSSProperties
              }
            >
              <div className="compound-code">{compound.code}</div>
              <div>
                <small>
                  {unlocked
                    ? "COMPOSTO XB"
                    : `EXIGE OFICINA ${compound.workshopLevel}`}
                </small>
                <strong>{compound.name}</strong>
                <p>{compound.description}</p>
              </div>
              <button
                onClick={() => handle.equipCompound(vehicleId, compound.id)}
                disabled={!unlocked || active}
                aria-pressed={active}
                aria-label={`${active ? "Equipado" : unlocked ? "Equipar" : "Bloqueado"}: ${compound.name}`}
              >
                {active ? (
                  <>
                    <Check size={13} /> EQUIPADO
                  </>
                ) : unlocked ? (
                  "EQUIPAR"
                ) : (
                  <>
                    <LockKeyhole size={13} /> BLOQUEADO
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>

      <footer className="compound-footer">
        <span>
          <ShieldCheck size={15} /> Oficina {workshop}/5
        </span>
        <span>
          <Coins size={15} /> Manutenção usa somente moeda interna da campanha
        </span>
      </footer>
    </section>
  );
}

export default memo(TireStrategyPanel);

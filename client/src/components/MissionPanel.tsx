/**
 * Pit Lane Industrial: quadro diário compacto, com progresso em ciano e
 * recompensas legíveis como ordens de serviço da central logística.
 */
import {
  Check,
  Clock3,
  Coins,
  PackageCheck,
  Star,
  Target,
  X,
  Zap,
} from "lucide-react";
import { memo, useEffect, useId, useRef } from "react";
import { GAME_ASSETS } from "@/game/assets";
import { missionComplete } from "@/game/missions";
import type { DailyMissionState } from "@/game/types";
import { money } from "./format";
import { useFocusTrap } from "./useFocusTrap";

function countdown(minutes: number) {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/*
 * Recebe o recorte exato que usa, não o snapshot inteiro: `missions` é a
 * referência estável guardada pela campanha e `resetInMinutes` só muda na
 * virada do minuto. Com o snapshot como prop o React.memo nunca acertava,
 * porque getSnapshot() devolve um objeto novo a cada publicação.
 */
function MissionPanel({
  missions,
  resetInMinutes,
  onClaim,
  onClose,
}: {
  missions: readonly DailyMissionState[];
  resetInMinutes: number;
  onClaim: (id: string) => void;
  onClose: () => void;
}) {
  const completed = missions.filter(missionComplete).length;
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const closeButton = panel.querySelector<HTMLButtonElement>(
      ".mission-panel__close"
    );
    closeButton?.focus();
    return () => previousFocus?.focus();
  }, []);

  useFocusTrap(panelRef, { onEscape: onClose });

  return (
    <>
      {/* aria-modal só é verdade com um bloqueio real: sem isto a Central continua clicável. */}
      <div
        className="mission-panel__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        className="mission-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div
          className="mission-panel__hero"
          style={{ backgroundImage: `url(${GAME_ASSETS.dailyMissions})` }}
        >
          <div>
            <span>
              <Target size={14} /> TURNO XB
            </span>
            <strong id={titleId}>MISSÕES DIÁRIAS</strong>
            <small>
              <Clock3 size={12} /> RENOVA EM {countdown(resetInMinutes)}
            </small>
          </div>
          <button
            className="mission-panel__close"
            onClick={onClose}
            aria-label="Fechar missões"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mission-panel__summary">
          <span>
            <PackageCheck size={15} /> {completed}/3 METAS CONCLUÍDAS
          </span>
          <div
            role="progressbar"
            aria-label="Progresso das missões diárias"
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={completed}
          >
            <i style={{ width: `${(completed / 3) * 100}%` }} />
          </div>
        </div>

        <div className="mission-list">
          {missions.map((mission, index) => {
            const complete = missionComplete(mission);
            const percent = Math.min(
              100,
              (mission.progress / mission.target) * 100
            );
            return (
              <article
                key={mission.id}
                className={`${complete ? "is-complete" : ""} ${mission.claimed ? "is-claimed" : ""}`}
              >
                <span className="mission-index">0{index + 1}</span>
                <div className="mission-copy">
                  <small>
                    {mission.kind === "idealTire"
                      ? "PNEU ESTRATÉGICO"
                      : "ORDEM DO TURNO"}
                  </small>
                  <strong>{mission.title}</strong>
                  <p>{mission.description}</p>
                  <div
                    className="mission-progress"
                    role="progressbar"
                    aria-label={`Progresso: ${mission.title}`}
                    aria-valuemin={0}
                    aria-valuemax={mission.target}
                    aria-valuenow={Math.min(mission.progress, mission.target)}
                  >
                    <i style={{ width: `${percent}%` }} />
                  </div>
                  <em>
                    {money.format(mission.progress)} /{" "}
                    {money.format(mission.target)}
                  </em>
                </div>
                <div className="mission-reward">
                  <span>
                    <Coins size={12} /> {money.format(mission.rewardCredits)}
                  </span>
                  <span>
                    <Zap size={12} /> {mission.rewardXp} XP
                  </span>
                  <span>
                    <Star size={12} /> {mission.rewardReputation}
                  </span>
                  <button
                    onClick={() => onClaim(mission.id)}
                    disabled={!complete || mission.claimed}
                  >
                    {mission.claimed ? (
                      <>
                        <Check size={13} /> COLETADO
                      </>
                    ) : complete ? (
                      "COLETAR"
                    ) : (
                      "EM CURSO"
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </aside>
    </>
  );
}

export default memo(MissionPanel);

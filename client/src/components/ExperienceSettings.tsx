import { useEffect, useRef, useState } from "react";
import {
  Film,
  Gauge,
  Settings2,
  UserRoundCog,
  Vibrate,
  Volume2,
  X,
} from "lucide-react";
import type { FeedbackPreferences } from "@/game/feedback";
import type { QualityPreference, ResolvedQualityPreset } from "@/game/quality";
import { useFocusTrap } from "./useFocusTrap";
import { esquecerAbertura } from "@/game/openingScene";

const qualityOptions: ReadonlyArray<{
  id: QualityPreference;
  label: string;
  detail: string;
}> = [
  {
    id: "auto",
    label: "Automático",
    detail: "Escolhe o melhor equilíbrio para este aparelho.",
  },
  {
    id: "performance",
    label: "Desempenho",
    detail: "Prioriza fluidez e bateria em celulares modestos.",
  },
  {
    id: "balanced",
    label: "Equilibrado",
    detail: "Mantém bom acabamento com custo gráfico controlado.",
  },
  {
    id: "quality",
    label: "Qualidade",
    detail: "Entrega máxima nitidez em aparelhos mais potentes.",
  },
];

const presetLabel: Record<ResolvedQualityPreset, string> = {
  performance: "DESEMPENHO",
  balanced: "EQUILIBRADO",
  quality: "QUALIDADE",
};

export default function ExperienceSettings({
  open,
  onOpenChange,
  qualityPreference,
  resolvedPreset,
  onQualityChange,
  feedback,
  onFeedbackChange,
  aoRecomecarApresentacao,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  qualityPreference: QualityPreference;
  resolvedPreset: ResolvedQualityPreset;
  onQualityChange(preference: QualityPreference): void;
  feedback: FeedbackPreferences;
  onFeedbackChange(preferences: FeedbackPreferences): void;
  /** Esquece nome e entregador, sem apagar a campanha. */
  aoRecomecarApresentacao(): void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(open);
  const [aberturaLiberada, setAberturaLiberada] = useState(false);
  const [apresentacaoLiberada, setApresentacaoLiberada] = useState(false);

  useEffect(() => {
    let focusFrame: number | null = null;
    if (open) {
      closeRef.current?.focus();
    } else if (wasOpenRef.current) {
      focusFrame = window.requestAnimationFrame(() =>
        triggerRef.current?.focus()
      );
    }
    wasOpenRef.current = open;
    return () => {
      if (focusFrame !== null) window.cancelAnimationFrame(focusFrame);
    };
  }, [open]);

  useFocusTrap(panelRef, {
    onEscape: () => onOpenChange(false),
    enabled: open,
  });

  const onQualityKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    let nextIndex = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % qualityOptions.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + qualityOptions.length) % qualityOptions.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = qualityOptions.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const next = qualityOptions[nextIndex];
    if (!next) return;
    onQualityChange(next.id);
    const options =
      event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
        '[role="radio"]'
      );
    options?.[nextIndex]?.focus();
  };

  if (!open) {
    return (
      <button
        ref={triggerRef}
        className="experience-settings-trigger"
        onClick={() => onOpenChange(true)}
        aria-label="Abrir ajustes de experiência"
      >
        <Settings2 aria-hidden="true" />
        <span>AJUSTES</span>
      </button>
    );
  }

  return (
    <section
      className="experience-settings-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="experience-settings-title"
    >
      <div ref={panelRef} className="experience-settings-panel">
        <header>
          <span className="experience-settings-icon" aria-hidden="true">
            <Settings2 />
          </span>
          <div>
            <small>EXPERIÊNCIA XB</small>
            <h2 id="experience-settings-title">AJUSTES DO JOGO</h2>
          </div>
          <button
            ref={closeRef}
            className="experience-settings-close"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar ajustes"
          >
            <X />
          </button>
        </header>

        <div className="experience-settings-section">
          <div className="experience-settings-heading">
            <Gauge aria-hidden="true" />
            <span>
              <strong>QUALIDADE GRÁFICA</strong>
              <small>ATUAL · {presetLabel[resolvedPreset]}</small>
            </span>
          </div>
          <div
            className="quality-choice-grid"
            role="radiogroup"
            aria-label="Preset de qualidade gráfica"
          >
            {qualityOptions.map((option, index) => (
              <button
                key={option.id}
                className={qualityPreference === option.id ? "is-selected" : ""}
                role="radio"
                aria-checked={qualityPreference === option.id}
                tabIndex={qualityPreference === option.id ? 0 : -1}
                onClick={() => onQualityChange(option.id)}
                onKeyDown={event => onQualityKeyDown(event, index)}
              >
                <strong>{option.label}</strong>
                <span>{option.detail}</span>
              </button>
            ))}
          </div>
          <p className="quality-choice-note">
            Resolução e FPS mudam imediatamente. A suavização de bordas vale na
            próxima abertura da pista.
          </p>
        </div>

        <div className="experience-settings-section experience-feedback-grid">
          <label>
            <span className="experience-settings-heading">
              <Volume2 aria-hidden="true" />
              <span>
                <strong>SOM DO JOGO</strong>
                <small>MÚSICA E EFEITOS</small>
              </span>
            </span>
            <input
              type="checkbox"
              checked={feedback.soundEnabled}
              onChange={event =>
                onFeedbackChange({
                  ...feedback,
                  soundEnabled: event.currentTarget.checked,
                })
              }
            />
            <i aria-hidden="true" />
          </label>
          <label>
            <span className="experience-settings-heading">
              <Vibrate aria-hidden="true" />
              <span>
                <strong>VIBRAÇÃO</strong>
                <small>TOQUES E IMPACTOS NO CELULAR</small>
              </span>
            </span>
            <input
              type="checkbox"
              checked={feedback.vibrationEnabled}
              onChange={event =>
                onFeedbackChange({
                  ...feedback,
                  vibrationEnabled: event.currentTarget.checked,
                })
              }
            />
            <i aria-hidden="true" />
          </label>
        </div>

        <div className="experience-settings-section">
          <button
            className="experience-settings-acao"
            onClick={() => {
              esquecerAbertura();
              setAberturaLiberada(true);
            }}
          >
            <Film aria-hidden="true" />
            <span>
              <strong>VER A ABERTURA DE NOVO</strong>
              <small>
                {aberturaLiberada
                  ? "PRONTO — ELA VOLTA NO PRÓXIMO PLAY GAME"
                  : "O FILME QUE ROLA NA PRIMEIRA VEZ"}
              </small>
            </span>
          </button>
        </div>

        {/*
          Existe porque o jogo esconde essas telas de proposito: o filme roda
          uma vez, e a escolha do entregador so aparece enquanto ninguem se
          apresentou. Quem ja jogou nunca mais as ve — e nao havia como
          rever sem apagar a campanha inteira. Isto devolve as duas sem custar
          o dinheiro, o nivel e as entregas de quem chegou longe.
        */}
        <div className="experience-settings-section">
          <button
            className="experience-settings-acao"
            onClick={() => {
              esquecerAbertura();
              aoRecomecarApresentacao();
              setAberturaLiberada(true);
              setApresentacaoLiberada(true);
            }}
          >
            <UserRoundCog aria-hidden="true" />
            <span>
              <strong>VER A ENTRADA DE NOVO</strong>
              <small>
                {apresentacaoLiberada
                  ? "PRONTO — FILME E ESCOLHA VOLTAM NO PRÓXIMO PLAY GAME"
                  : "O FILME E A ESCOLHA DO ENTREGADOR, SEM PERDER O JOGO"}
              </small>
            </span>
          </button>
        </div>

        <p className="experience-settings-note">
          A vibração começa desligada. A XB respeita sua bateria, sua
          privacidade e a preferência de movimento reduzido do aparelho.
        </p>
      </div>
    </section>
  );
}

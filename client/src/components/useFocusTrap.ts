import { useEffect, useRef, type RefObject } from "react";

/**
 * Lista única de elementos focáveis: as cópias espalhadas pelos diálogos
 * divergiam e deixavam campos de formulário fora do ciclo do Tab.
 */
const FOCUSABLE_SELECTOR =
  'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Pilha de painéis com armadilha ativa. Como agora todos escutam o mesmo
 * documento, sem ela dois diálogos abertos ao mesmo tempo fechariam juntos no
 * primeiro Escape. Só o painel do topo responde.
 */
const trapStack: HTMLElement[] = [];

interface FocusTrapOptions {
  onEscape?: () => void;
  /** Diálogos que só montam o painel quando abertos religam a armadilha aqui. */
  enabled?: boolean;
}

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  { onEscape, enabled = true }: FocusTrapOptions = {}
): void {
  const escapeRef = useRef(onEscape);

  useEffect(() => {
    escapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (trapStack[trapStack.length - 1] !== element) return;
      if (event.key === "Escape") {
        event.preventDefault();
        // O motor escuta o teclado na janela e mapeia Escape para pausar ou
        // retomar. Sem parar a propagação aqui, o mesmo Escape que retomava a
        // corrida chegava ao GameWorld já com run.paused === false e pausava
        // tudo de novo, no mesmo quadro.
        event.stopPropagation();
        escapeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [
        ...element.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        element.focus();
        return;
      }
      const active = document.activeElement;
      // Um clique no fundo escurecido devolve o foco ao <body>: sem este
      // desvio o Tab seguinte saía do diálogo e caminhava pela tela de trás.
      if (!(active instanceof Node) || !element.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // No documento, não no painel: preso ao painel, a armadilha valia apenas
    // enquanto o foco estivesse dentro dele — e um clique no fundo do diálogo
    // já era suficiente para desligá-la.
    trapStack.push(element);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const index = trapStack.lastIndexOf(element);
      if (index >= 0) trapStack.splice(index, 1);
    };
  }, [ref, enabled]);
}

import { useContext } from "react";
import {
  TransitionContext,
  type TransitionPhase,
  type TransitionMode,
  type TransitionPageState,
} from "./context";

export interface TransitionState {
  phase: TransitionPhase;
  from: string | null;
  to: string | null;
  mode: TransitionMode;
  pages: TransitionPageState[];
  isTransitioning: boolean;
}

/**
 * Read-only observer for the current transition state.
 * Returns the full picture: phase, from/to, mode, and all rendered pages.
 */
export function useTransitionState(): TransitionState {
  const context = useContext(TransitionContext);
  const phase = context?.phase ?? "idle";

  return {
    phase,
    from: context?.from ?? null,
    to: context?.to ?? null,
    mode: context?.mode ?? "wait",
    pages: context?.pages ?? [],
    isTransitioning: phase !== "idle",
  };
}

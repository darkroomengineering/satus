import { useContext } from "react";
import { TransitionContext, type TransitionPhase } from "./context";

export interface TransitionState {
  phase: TransitionPhase;
  from: string | null;
  to: string | null;
  isTransitioning: boolean;
}

/**
 * Read-only observer for the current transition state.
 * Useful for components that need to react to transitions
 * without registering exit/enter animations.
 */
export function useTransitionState(): TransitionState {
  const context = useContext(TransitionContext);
  const phase = context?.phase ?? "idle";

  return {
    phase,
    from: context?.from ?? null,
    to: context?.to ?? null,
    isTransitioning: phase !== "idle",
  };
}

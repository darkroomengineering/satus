import { useContext, useId, useLayoutEffect, useRef } from "react";
import {
  TransitionContext,
  type ExitFunction,
  type EnterFunction,
  type InitialFunction,
  type TransitionPhase,
} from "./context";

export interface RouteTransitionConfig {
  /** Set element state before first paint. Fires during transitions and on first load when appear is enabled. */
  initial?: InitialFunction;
  /** Animate out. Call done() when finished. Return cleanup function for interruption. */
  exit?: ExitFunction;
  /** Animate in. Call done() when finished. Return cleanup function for interruption. */
  enter?: EnterFunction;
}

export function useRouteTransition(config: RouteTransitionConfig): {
  phase: TransitionPhase;
  isExiting: boolean;
  isEntering: boolean;
} {
  const context = useContext(TransitionContext);
  const id = useId();

  const initialRef = useRef(config.initial);
  const exitRef = useRef(config.exit);
  const enterRef = useRef(config.enter);
  initialRef.current = config.initial;
  exitRef.current = config.exit;
  enterRef.current = config.enter;

  // Stable ref to context for registration (avoids re-registering on context value change)
  const registerRef = useRef(context);
  registerRef.current = context;

  // Apply initial state before first paint when mounting as the ENTERING page,
  // or on first load when appear is enabled.
  const phaseOnMount = useRef(context?.phase);
  const appearOnMount = useRef(context?.appear);
  const infoOnMount = useRef(
    context?.from && context?.to
      ? { from: context.from, to: context.to, direction: context.direction ?? ("push" as const) }
      : null,
  );

  useLayoutEffect(() => {
    if (phaseOnMount.current === "exiting") return;
    if (infoOnMount.current) {
      initialRef.current?.(infoOnMount.current);
    } else if (appearOnMount.current) {
      // First-load appear — fire initial() with synthetic info
      initialRef.current?.({ from: "", to: "", direction: "push" });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Register exit + enter — runs once on mount (useLayoutEffect guarantees
  // registration completes before the parent's orchestration useEffect fires)
  useLayoutEffect(() => {
    const ctx = registerRef.current;
    if (!ctx) return;

    const exitWrapper: ExitFunction = (exitCtx) => {
      if (exitRef.current) return exitRef.current(exitCtx);
      exitCtx.done();
    };

    const enterWrapper: EnterFunction = (enterCtx) => {
      if (enterRef.current) return enterRef.current(enterCtx);
      enterCtx.done();
    };

    const unregisterExit = ctx.registerExit(id, exitWrapper);
    const unregisterEnter = ctx.registerEnter(id, enterWrapper);

    return () => {
      unregisterExit();
      unregisterEnter();
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    phase: context?.phase ?? "idle",
    isExiting: context?.phase === "exiting",
    isEntering: context?.phase === "entering",
  };
}

import { useContext, useEffect, useId, useLayoutEffect, useRef } from "react";
import {
  TransitionContext,
  type ExitFunction,
  type EnterFunction,
  type InitialFunction,
  type TransitionPhase,
} from "./context";

export interface RouteTransitionConfig {
  /**
   * Set the element's initial state before it becomes visible.
   * Runs via useLayoutEffect on mount — only during a transition, never on
   * first page load. Receives `info` with `from`, `to`, and `direction`.
   *
   * If JS is disabled this never fires, so the page renders normally.
   */
  initial?: InitialFunction;

  /**
   * Animate out. Receives `{ done, enter, info }`.
   * - `done()` signals exit completion
   * - `enter()` triggers the next page's enter early (before done)
   * - Return a `Thenable` for auto-done
   * - Return a `function` for cleanup on interruption
   */
  exit?: ExitFunction;

  /**
   * Animate in. Receives `{ info }`.
   * Runs after the exiting page calls done() (or enter() for early start).
   * Not called on initial page load.
   */
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

  // Capture registration functions in a ref so the effect doesn't re-fire
  // when the context value object changes (it changes every render due to
  // pages/phase updates, but the registration functions are stable).
  const registerRef = useRef(context);
  registerRef.current = context;

  // Apply initial state before first paint when mounting as the ENTERING page.
  // Fires when there's an active transition (from/to set) and we're NOT the exiting page.
  // Does NOT fire on cold page load (from/to are null).
  const phaseOnMount = useRef(context?.phase);
  const infoOnMount = useRef(
    context?.from && context?.to
      ? { from: context.from, to: context.to, direction: "push" as const }
      : null,
  );

  useLayoutEffect(() => {
    if (!infoOnMount.current) return;
    if (phaseOnMount.current === "exiting") return;
    initialRef.current?.(infoOnMount.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Register exit + enter — runs once on mount, cleans up on unmount.
  // Uses ref to avoid re-registering when context object identity changes.
  useEffect(() => {
    const ctx = registerRef.current;
    if (!ctx) return;

    const exitWrapper: ExitFunction = (exitCtx) => {
      if (exitRef.current) {
        return exitRef.current(exitCtx);
      }
      exitCtx.done();
    };

    const enterWrapper: EnterFunction = (enterCtx) => enterRef.current?.(enterCtx);

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

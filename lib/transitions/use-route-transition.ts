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

  // Apply initial state before first paint when mounting as the ENTERING page.
  // Only fires for phase "entering" — exiting pages should start visible.
  // Does NOT fire on cold page load (phase "idle").
  const phaseOnMount = useRef(context?.phase);
  const infoOnMount = useRef(
    context?.from && context?.to
      ? { from: context.from, to: context.to, direction: "push" as const }
      : null,
  );

  useLayoutEffect(() => {
    if (phaseOnMount.current !== "entering") return;
    if (!infoOnMount.current) return;
    initialRef.current?.(infoOnMount.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Register exit + enter with TransitionRouter
  useEffect(() => {
    if (!context) return;

    const exitWrapper: ExitFunction = (ctx) => {
      if (exitRef.current) {
        return exitRef.current(ctx);
      }
      ctx.done();
    };

    const enterWrapper: EnterFunction = (ctx) => enterRef.current?.(ctx);

    const unregisterExit = context.registerExit(id, exitWrapper);
    const unregisterEnter = context.registerEnter(id, enterWrapper);

    return () => {
      unregisterExit();
      unregisterEnter();
    };
  }, [context, id]);

  return {
    phase: context?.phase ?? "idle",
    isExiting: context?.phase === "exiting",
    isEntering: context?.phase === "entering",
  };
}

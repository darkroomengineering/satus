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
   * Animate out. Call `done()` or return a thenable (GSAP tween / Promise).
   * Receives `info` as second argument so the exiting page knows where
   * the user is navigating to.
   */
  exit?: ExitFunction;

  /**
   * Animate in. Runs after the page has mounted following a transition.
   * Receives `info` with `from`, `to`, and `direction`.
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

    const exitWrapper: ExitFunction = (done, info) => {
      if (exitRef.current) {
        return exitRef.current(done, info);
      }
      done();
    };

    const enterWrapper: EnterFunction = (info) => enterRef.current?.(info);

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

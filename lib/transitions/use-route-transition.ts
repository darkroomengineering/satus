import { useContext, useEffect, useId, useLayoutEffect, useRef } from "react";
import {
  TransitionContext,
  type ExitFunction,
  type EnterFunction,
  type TransitionPhase,
} from "./context";

export interface RouteTransitionConfig {
  /**
   * Set the element's initial state before it becomes visible.
   * Runs via useLayoutEffect on mount — only during a transition, never on
   * first page load. Use `gsap.set(ref, { opacity: 0, y: 50 })` here so the
   * element is hidden before the old page's clone is removed.
   *
   * If JS is disabled this never fires, so the page renders normally.
   */
  initial?: () => void;

  /** Animate out. Call `done()` or return a thenable (GSAP tween / Promise). */
  exit?: ExitFunction;

  /** Animate in. Runs after the page has mounted following a transition. */
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

  // Apply initial state before first paint when mounting during a transition.
  // phase !== "idle" means we arrived here via navigation, not a cold page load.
  const phaseOnMount = useRef(context?.phase);
  useLayoutEffect(() => {
    if (!phaseOnMount.current || phaseOnMount.current === "idle") return;
    initialRef.current?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Register exit + enter with TransitionRouter
  useEffect(() => {
    if (!context) return;

    const exitWrapper: ExitFunction = (done) => {
      if (exitRef.current) {
        return exitRef.current(done);
      }
      done();
    };

    const enterWrapper: EnterFunction = () => enterRef.current?.();

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

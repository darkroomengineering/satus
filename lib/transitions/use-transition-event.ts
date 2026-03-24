import { useContext, useEffect, useId, useRef } from "react";
import { TransitionContext, type ExitFunction, type EnterFunction } from "./context";

export interface TransitionEventConfig {
  onExit?: ExitFunction;
  onEnter?: EnterFunction;
}

/**
 * Participate in page transitions from a persistent component
 * (header, footer, WebGL canvas, etc.) that stays mounted across navigations.
 *
 * - `onExit({ done, enter, info })`: runs alongside page exit animations.
 * - `onEnter({ info })`: runs after the new page has mounted.
 */
export function useTransitionEvent(config: TransitionEventConfig): void {
  const context = useContext(TransitionContext);
  const id = useId();

  const onExitRef = useRef(config.onExit);
  const onEnterRef = useRef(config.onEnter);
  onExitRef.current = config.onExit;
  onEnterRef.current = config.onEnter;

  const registerRef = useRef(context);
  registerRef.current = context;

  useEffect(() => {
    const ctx = registerRef.current;
    if (!ctx) return;

    return ctx.registerEvent(id, {
      onExit: (exitCtx) => {
        if (onExitRef.current) {
          return onExitRef.current(exitCtx);
        }
        exitCtx.done();
      },
      onEnter: (enterCtx) => onEnterRef.current?.(enterCtx),
    });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
}

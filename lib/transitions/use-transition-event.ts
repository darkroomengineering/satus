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

  useEffect(() => {
    if (!context) return;

    return context.registerEvent(id, {
      onExit: (ctx) => {
        if (onExitRef.current) {
          return onExitRef.current(ctx);
        }
        ctx.done();
      },
      onEnter: (ctx) => onEnterRef.current?.(ctx),
    });
  }, [context, id]);
}

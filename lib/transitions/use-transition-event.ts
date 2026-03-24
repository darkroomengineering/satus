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
 * - `onExit(done, info)`: runs alongside page exit animations. Call `done()`
 *   or return a thenable when finished. `info` contains `from`, `to`, `direction`.
 *
 * - `onEnter(info)`: runs after the new page has mounted.
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
      onExit: (done, info) => {
        if (onExitRef.current) {
          return onExitRef.current(done, info);
        }
        done();
      },
      onEnter: (info) => onEnterRef.current?.(info),
    });
  }, [context, id]);
}

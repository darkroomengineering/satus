import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useLocation, useBlocker } from "react-router";
import {
  TransitionContext,
  type TransitionRouterProps,
  type TransitionContextValue,
  type TransitionPhase,
  type TransitionDirection,
  type TransitionInfo,
  type TransitionOrchestratorContext,
  type ExitFunction,
  type EnterFunction,
  type TransitionEventCallbacks,
} from "./context";
import { collectExits, collectEnters } from "./helpers";

// ---------------------------------------------------------------------------
// TransitionRouter — top-level component
// ---------------------------------------------------------------------------

export function TransitionRouter({
  children,
  mode = "wait",
  timeout = 5000,
  onTransition,
  preventTransition,
  onExitStart,
  onExitComplete,
  onEnterStart,
  onEnterComplete,
}: TransitionRouterProps) {
  const props: InternalProps = {
    children,
    timeout,
    ...(onTransition && { onTransition }),
    ...(preventTransition && { preventTransition }),
    ...(onExitStart && { onExitStart }),
    ...(onExitComplete && { onExitComplete }),
    ...(onEnterStart && { onEnterStart }),
    ...(onEnterComplete && { onEnterComplete }),
  };

  if (mode === "overlap") {
    return OverlapMode(props);
  }
  return WaitMode(props);
}

// ---------------------------------------------------------------------------
// Shared registration logic
// ---------------------------------------------------------------------------

type InternalProps = Omit<TransitionRouterProps, "mode">;

function useRegistrations() {
  const exitMap = useRef(new Map<string, ExitFunction>());
  const enterMap = useRef(new Map<string, EnterFunction>());
  const eventMap = useRef(new Map<string, TransitionEventCallbacks>());
  const exitResolvers = useRef(new Map<string, () => void>());

  function registerExit(id: string, fn: ExitFunction): () => void {
    exitMap.current.set(id, fn);
    return () => {
      exitMap.current.delete(id);
      // Auto-resolve if this exit was pending (component unmounted mid-transition)
      const resolver = exitResolvers.current.get(id);
      if (resolver) {
        resolver();
        exitResolvers.current.delete(id);
      }
    };
  }

  function registerEnter(id: string, fn: EnterFunction): () => void {
    enterMap.current.set(id, fn);
    return () => {
      enterMap.current.delete(id);
    };
  }

  function registerEvent(id: string, config: TransitionEventCallbacks): () => void {
    eventMap.current.set(id, config);
    return () => {
      eventMap.current.delete(id);
      // Auto-resolve event exits too
      const resolver = exitResolvers.current.get(`evt:${id}`);
      if (resolver) {
        resolver();
        exitResolvers.current.delete(`evt:${id}`);
      }
    };
  }

  function runExits(): Promise<void> {
    return collectExits(exitMap.current, eventMap.current, exitResolvers.current);
  }

  function runEnters(): Promise<void> {
    return collectEnters(enterMap.current, eventMap.current);
  }

  return {
    exitMap,
    enterMap,
    eventMap,
    exitResolvers,
    registerExit,
    registerEnter,
    registerEvent,
    runExits,
    runEnters,
  };
}

// ---------------------------------------------------------------------------
// WAIT MODE
// ---------------------------------------------------------------------------
// Uses useBlocker to hold navigation while exit animations play.
// Old page is the real, live React tree — no stale data, no cloning.
// ---------------------------------------------------------------------------

function WaitMode({
  children,
  timeout = 5000,
  onTransition,
  preventTransition,
  onExitStart,
  onExitComplete,
  onEnterStart,
  onEnterComplete,
}: InternalProps) {
  const location = useLocation();
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const { registerExit, registerEnter, registerEvent, runExits, runEnters } = useRegistrations();

  const transitionInfoRef = useRef<TransitionInfo | null>(null);
  const directionRef = useRef<TransitionDirection>("push");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isRunningRef = useRef(false);
  const prevLocationKeyRef = useRef(location.key);

  // Refs for latest callback props (avoid stale closures)
  const onTransitionRef = useRef(onTransition);
  const onExitStartRef = useRef(onExitStart);
  const onExitCompleteRef = useRef(onExitComplete);
  const onEnterStartRef = useRef(onEnterStart);
  const onEnterCompleteRef = useRef(onEnterComplete);
  onTransitionRef.current = onTransition;
  onExitStartRef.current = onExitStart;
  onExitCompleteRef.current = onExitComplete;
  onEnterStartRef.current = onEnterStart;
  onEnterCompleteRef.current = onEnterComplete;

  // -- Navigation blocker --------------------------------------------------

  const blocker = useBlocker(({ currentLocation, nextLocation, historyAction }) => {
    if (isRunningRef.current) return false;
    if (currentLocation.pathname === nextLocation.pathname) return false;
    if (preventTransition?.(currentLocation.pathname, nextLocation.pathname)) {
      return false;
    }
    directionRef.current = historyAction.toLowerCase() as TransitionDirection;
    return true;
  });

  // -- Start exit when blocker activates ------------------------------------

  useEffect(() => {
    if (blocker.state !== "blocked" || isRunningRef.current) return;

    isRunningRef.current = true;

    const from = location.pathname;
    const to = blocker.location.pathname;
    const direction = directionRef.current;
    const info: TransitionInfo = { from, to, direction };
    transitionInfoRef.current = info;

    setPhase("exiting");
    onExitStartRef.current?.(info);

    // Safety timeout — force-proceed if something hangs
    timeoutRef.current = setTimeout(() => {
      console.warn(`[TransitionRouter] Timed out after ${timeout}ms — force-proceeding`);
      proceed(info);
    }, timeout);

    if (onTransitionRef.current) {
      // Centralized orchestration — user calls next()
      const ctx: TransitionOrchestratorContext = {
        from,
        to,
        direction,
        fromElement: undefined,
        toElement: undefined,
        runExits,
        runEnters,
        next: () => proceed(info),
      };

      const result = onTransitionRef.current(ctx);
      if (result && typeof result.then === "function") {
        result.then(
          () => {
            // Auto-proceed if onTransition resolved without calling next()
            if (isRunningRef.current && blocker.state === "blocked") {
              proceed(info);
            }
          },
          (err: unknown) => {
            console.warn("[TransitionRouter] onTransition error:", err);
            proceed(info);
          },
        );
      }
    } else {
      // Distributed — auto-run all registered exits, then proceed
      void runExits().then(() => proceed(info));
    }
  }, [blocker.state]); // eslint-disable-line react-hooks/exhaustive-deps

  function proceed(info: TransitionInfo): void {
    if (!isRunningRef.current) return;
    clearTimeout(timeoutRef.current);
    onExitCompleteRef.current?.(info);

    if (blocker.state === "blocked") {
      blocker.proceed();
    }
  }

  // -- Enter phase after navigation commits ---------------------------------
  // useLayoutEffect ensures phase updates before paint, preventing the new
  // page from rendering one frame with phase="exiting".

  useLayoutEffect(() => {
    if (location.key === prevLocationKeyRef.current) return;
    prevLocationKeyRef.current = location.key;

    if (!isRunningRef.current) return;

    setPhase("entering");
    onEnterStartRef.current?.(transitionInfoRef.current!);
  }, [location.key]);

  // Run enters after phase changes to "entering" — child effects have
  // registered by now (passive effects run child → parent).
  useEffect(() => {
    if (phase !== "entering") return;

    void runEnters().then(() => {
      onEnterCompleteRef.current?.(transitionInfoRef.current!);
      setPhase("idle");
      isRunningRef.current = false;
      transitionInfoRef.current = null;
    });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Document attribute for CSS hooks -------------------------------------

  useEffect(() => {
    document.documentElement.dataset.transitionPhase = phase;
  }, [phase]);

  // -- Context value --------------------------------------------------------

  const contextValue: TransitionContextValue = {
    phase,
    from: transitionInfoRef.current?.from ?? null,
    to: transitionInfoRef.current?.to ?? null,
    registerExit,
    registerEnter,
    registerEvent,
  };

  return <TransitionContext.Provider value={contextValue}>{children}</TransitionContext.Provider>;
}

// ---------------------------------------------------------------------------
// OVERLAP MODE
// ---------------------------------------------------------------------------
// Clones the current page's DOM before navigation, renders the clone as an
// overlay while the new page mounts underneath. Both the old (clone) and new
// (real) DOM are available for coordinated transitions.
//
// WebGL / persistent components are NOT part of the clone — they remain live
// and participate via useTransitionEvent.
// ---------------------------------------------------------------------------

function OverlapMode({
  children,
  timeout = 5000,
  onTransition,
  preventTransition,
  onExitStart,
  onExitComplete,
  onEnterStart,
  onEnterComplete,
}: InternalProps) {
  const location = useLocation();
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const { registerExit, registerEnter, registerEvent, runExits, runEnters } = useRegistrations();

  const containerRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLDivElement | null>(null);
  const transitionInfoRef = useRef<TransitionInfo | null>(null);
  const directionRef = useRef<TransitionDirection>("push");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isRunningRef = useRef(false);
  const prevLocationKeyRef = useRef(location.key);

  const onTransitionRef = useRef(onTransition);
  const onExitStartRef = useRef(onExitStart);
  const onExitCompleteRef = useRef(onExitComplete);
  const onEnterStartRef = useRef(onEnterStart);
  const onEnterCompleteRef = useRef(onEnterComplete);
  onTransitionRef.current = onTransition;
  onExitStartRef.current = onExitStart;
  onExitCompleteRef.current = onExitComplete;
  onEnterStartRef.current = onEnterStart;
  onEnterCompleteRef.current = onEnterComplete;

  // -- Navigation blocker ---------------------------------------------------

  const blocker = useBlocker(({ currentLocation, nextLocation, historyAction }) => {
    if (isRunningRef.current) return false;
    if (currentLocation.pathname === nextLocation.pathname) return false;
    if (preventTransition?.(currentLocation.pathname, nextLocation.pathname)) {
      return false;
    }
    directionRef.current = historyAction.toLowerCase() as TransitionDirection;
    return true;
  });

  // -- Block → clone → proceed ---------------------------------------------

  useEffect(() => {
    if (blocker.state !== "blocked" || isRunningRef.current) return;
    if (!containerRef.current) return;

    isRunningRef.current = true;

    const from = location.pathname;
    const to = blocker.location.pathname;
    const direction = directionRef.current;
    const info: TransitionInfo = { from, to, direction };
    transitionInfoRef.current = info;

    // Clone the container's children into an overlay div
    const container = containerRef.current;
    const clone = document.createElement("div");
    clone.setAttribute("data-transition-clone", "");
    clone.setAttribute("aria-hidden", "true");
    clone.style.cssText = "position:absolute;inset:0;z-index:1;pointer-events:none;";

    for (const child of Array.from(container.childNodes)) {
      clone.appendChild(child.cloneNode(true));
    }

    container.prepend(clone);
    cloneRef.current = clone;

    setPhase("exiting");
    onExitStartRef.current?.(info);

    // Safety timeout
    timeoutRef.current = setTimeout(() => {
      console.warn(`[TransitionRouter] Overlap transition timed out after ${timeout}ms`);
      finalize(info);
    }, timeout);

    // Proceed — React Router navigates, new page renders under the clone
    blocker.proceed();
  }, [blocker.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- After navigation commits, run the transition -------------------------

  useLayoutEffect(() => {
    if (location.key === prevLocationKeyRef.current) return;
    prevLocationKeyRef.current = location.key;

    if (!isRunningRef.current || !cloneRef.current || !containerRef.current) {
      return;
    }

    const fromElement = cloneRef.current;
    const toElement = containerRef.current;
    const info = transitionInfoRef.current!;

    onEnterStartRef.current?.(info);

    if (onTransitionRef.current) {
      const ctx: TransitionOrchestratorContext = {
        from: info.from,
        to: info.to,
        direction: info.direction,
        fromElement,
        toElement,
        runExits,
        runEnters,
        next: () => finalize(info),
      };

      const result = onTransitionRef.current(ctx);
      if (result && typeof result.then === "function") {
        result.then(
          () => {
            if (isRunningRef.current) finalize(info);
          },
          (err: unknown) => {
            console.warn("[TransitionRouter] onTransition error:", err);
            finalize(info);
          },
        );
      }
    } else {
      // Default overlap: clone fade + enters run in parallel
      setPhase("entering");

      // Enters start after effects register (~1 frame), clone fade runs
      // simultaneously via CSS transition (400ms). By the time the clone
      // is fully transparent the enter animations are well underway.
      setTimeout(() => {
        void runEnters();
      }, 0);

      defaultOverlapTransition(fromElement, () => finalize(info));
    }
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  function finalize(info: TransitionInfo): void {
    if (!isRunningRef.current) return;
    clearTimeout(timeoutRef.current);

    cloneRef.current?.remove();
    cloneRef.current = null;

    onExitCompleteRef.current?.(info);
    onEnterCompleteRef.current?.(info);
    setPhase("idle");
    isRunningRef.current = false;
    transitionInfoRef.current = null;
  }

  // -- Document attribute ---------------------------------------------------

  useEffect(() => {
    document.documentElement.dataset.transitionPhase = phase;
  }, [phase]);

  // -- Context --------------------------------------------------------------

  const contextValue: TransitionContextValue = {
    phase,
    from: transitionInfoRef.current?.from ?? null,
    to: transitionInfoRef.current?.to ?? null,
    registerExit,
    registerEnter,
    registerEvent,
  };

  return (
    <TransitionContext.Provider value={contextValue}>
      <div ref={containerRef} data-transition-router="" style={{ position: "relative" }}>
        {children}
      </div>
    </TransitionContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Default overlap animation (no GSAP dependency — pure CSS transition)
// ---------------------------------------------------------------------------

function defaultOverlapTransition(clone: HTMLElement, onComplete: () => void): void {
  clone.style.transition = "opacity 0.4s ease-out";

  // Force reflow before changing opacity
  void clone.offsetHeight;
  clone.style.opacity = "0";

  const onEnd = () => {
    clone.removeEventListener("transitionend", onEnd);
    onComplete();
  };

  clone.addEventListener("transitionend", onEnd);

  // Fallback in case transitionend doesn't fire
  setTimeout(onComplete, 500);
}

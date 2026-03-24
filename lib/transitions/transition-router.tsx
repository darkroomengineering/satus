import {
  Component,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  type ReactNode,
  type ErrorInfo,
} from "react";
import { useLocation, useBlocker, useOutlet } from "react-router";
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
import { setDebugState } from "./debug";

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
      const resolver = exitResolvers.current.get(`evt:${id}`);
      if (resolver) {
        resolver();
        exitResolvers.current.delete(`evt:${id}`);
      }
    };
  }

  function runExits(info: TransitionInfo): Promise<void> {
    return collectExits(exitMap.current, eventMap.current, exitResolvers.current, info);
  }

  function runEnters(info: TransitionInfo): Promise<void> {
    return collectEnters(enterMap.current, eventMap.current, info);
  }

  function counts() {
    return {
      exitCount: exitMap.current.size + eventMap.current.size,
      enterCount: enterMap.current.size + eventMap.current.size,
    };
  }

  return {
    registerExit,
    registerEnter,
    registerEvent,
    runExits,
    runEnters,
    counts,
  };
}

// ---------------------------------------------------------------------------
// WAIT MODE — uses useBlocker, one page at a time
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
  const { registerExit, registerEnter, registerEvent, runExits, runEnters, counts } =
    useRegistrations();

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

  const blocker = useBlocker(({ currentLocation, nextLocation, historyAction }) => {
    if (isRunningRef.current) return false;
    if (currentLocation.pathname === nextLocation.pathname) return false;
    if (preventTransition?.(currentLocation.pathname, nextLocation.pathname)) {
      return false;
    }
    directionRef.current = historyAction.toLowerCase() as TransitionDirection;
    return true;
  });

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

    timeoutRef.current = setTimeout(() => {
      console.warn(`[TransitionRouter] Timed out after ${timeout}ms — force-proceeding`);
      proceed(info);
    }, timeout);

    if (onTransitionRef.current) {
      const ctx: TransitionOrchestratorContext = {
        from,
        to,
        direction,
        fromElement: undefined,
        toElement: undefined,
        runExits: () => runExits(info),
        runEnters: () => runEnters(info),
        next: () => proceed(info),
      };
      const result = onTransitionRef.current(ctx);
      if (result && typeof result.then === "function") {
        result.then(
          () => {
            if (isRunningRef.current && blocker.state === "blocked") proceed(info);
          },
          (err: unknown) => {
            console.warn("[TransitionRouter] onTransition error:", err);
            proceed(info);
          },
        );
      }
    } else {
      void runExits(info).then(() => proceed(info));
    }
  }, [blocker.state]); // eslint-disable-line react-hooks/exhaustive-deps

  function proceed(info: TransitionInfo): void {
    if (!isRunningRef.current) return;
    clearTimeout(timeoutRef.current);
    onExitCompleteRef.current?.(info);
    if (blocker.state === "blocked") blocker.proceed();
  }

  useLayoutEffect(() => {
    if (location.key === prevLocationKeyRef.current) return;
    prevLocationKeyRef.current = location.key;
    if (!isRunningRef.current) return;
    setPhase("entering");
    onEnterStartRef.current?.(transitionInfoRef.current!);
  }, [location.key]);

  useEffect(() => {
    if (phase !== "entering") return;
    const info = transitionInfoRef.current!;
    void runEnters(info).then(() => {
      onEnterCompleteRef.current?.(info);
      setPhase("idle");
      isRunningRef.current = false;
      transitionInfoRef.current = null;
    });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.dataset.transitionPhase = phase;
  }, [phase]);

  const contextValue: TransitionContextValue = {
    phase,
    from: transitionInfoRef.current?.from ?? null,
    to: transitionInfoRef.current?.to ?? null,
    registerExit,
    registerEnter,
    registerEvent,
  };

  // Debug reporting
  useEffect(() => {
    const c = counts();
    setDebugState({
      mode: "wait",
      pages: [
        {
          key: location.key,
          pathname: location.pathname,
          phase,
          exitCount: c.exitCount,
          enterCount: c.enterCount,
        },
      ],
      info: transitionInfoRef.current,
      isTransitioning: phase !== "idle",
    });
  });

  return <TransitionContext.Provider value={contextValue}>{children}</TransitionContext.Provider>;
}

// ---------------------------------------------------------------------------
// OVERLAP MODE — AnimatePresence-inspired
// ---------------------------------------------------------------------------
// Keeps a rendered pages array like AnimatePresence's renderedChildren.
// Each page gets its own context + registrations. No useBlocker — just
// tracks location changes and manages the page stack.
// ---------------------------------------------------------------------------

interface RenderedPage {
  key: string;
  outlet: ReactNode;
  pathname: string;
}

function OverlapMode({
  timeout = 5000,
  onTransition: _onTransition,
  preventTransition,
  onExitStart,
  onExitComplete,
  onEnterStart,
  onEnterComplete,
}: InternalProps) {
  const outlet = useOutlet();
  const location = useLocation();

  // -- Page stack (like AnimatePresence's renderedChildren) ------------------

  const [pages, setPages] = useState<RenderedPage[]>(() => [
    { key: location.key, outlet, pathname: location.pathname },
  ]);

  const prevOutletRef = useRef(outlet);
  const prevKeyRef = useRef(location.key);

  // Detect location change during render (like getDerivedStateFromProps).
  // The previous outlet is in the ref — capture it before it's overwritten.
  if (location.key !== prevKeyRef.current) {
    const oldOutlet = prevOutletRef.current;
    const oldPathname =
      pages.find((p) => p.key === prevKeyRef.current)?.pathname ?? location.pathname;
    const hasNew = pages.some((p) => p.key === location.key);

    if (!hasNew) {
      const skip = preventTransition?.(oldPathname, location.pathname);
      if (skip) {
        // Replace instead of stack
        setPages([{ key: location.key, outlet, pathname: location.pathname }]);
      } else {
        // Keep old page (with its frozen outlet), add new page
        setPages((prev) => {
          // Replace the old page's outlet with the frozen ref version
          const updated = prev.map((p) =>
            p.key === prevKeyRef.current ? { ...p, outlet: oldOutlet } : p,
          );
          return [...updated, { key: location.key, outlet, pathname: location.pathname }];
        });
      }
    }

    prevKeyRef.current = location.key;
  }

  // Always keep ref pointing to latest outlet
  prevOutletRef.current = outlet;

  // -- Remove page when its exit completes ----------------------------------

  const removePage = useCallback((key: string) => {
    setPages((prev) => prev.filter((p) => p.key !== key));
  }, []);

  // -- Lifecycle callbacks --------------------------------------------------

  const onExitStartRef = useRef(onExitStart);
  const onExitCompleteRef = useRef(onExitComplete);
  const onEnterStartRef = useRef(onEnterStart);
  const onEnterCompleteRef = useRef(onEnterComplete);
  onExitStartRef.current = onExitStart;
  onExitCompleteRef.current = onExitComplete;
  onEnterStartRef.current = onEnterStart;
  onEnterCompleteRef.current = onEnterComplete;

  // -- Derive transition state from the page stack --------------------------

  const isTransitioning = pages.length > 1;
  const latestPage = pages[pages.length - 1];
  const firstExiting = pages.length > 1 ? pages[0] : null;

  const info: TransitionInfo | null =
    firstExiting && latestPage
      ? {
          from: firstExiting.pathname,
          to: latestPage.pathname,
          direction: "push" as TransitionDirection,
        }
      : null;

  // Fire lifecycle callbacks
  const prevTransitioningRef = useRef(false);
  useEffect(() => {
    if (isTransitioning && !prevTransitioningRef.current && info) {
      onExitStartRef.current?.(info);
      onEnterStartRef.current?.(info);
    }
    if (!isTransitioning && prevTransitioningRef.current && info) {
      onExitCompleteRef.current?.(info);
      onEnterCompleteRef.current?.(info);
    }
    prevTransitioningRef.current = isTransitioning;
  });

  // Document attribute + debug reporting
  useEffect(() => {
    document.documentElement.dataset.transitionPhase = isTransitioning ? "exiting" : "idle";

    setDebugState({
      mode: "overlap",
      pages: pages.map((page) => ({
        key: page.key,
        pathname: page.pathname,
        phase: page.key === latestPage?.key ? (isTransitioning ? "entering" : "idle") : "exiting",
        exitCount: 0,
        enterCount: 0,
      })),
      info,
      isTransitioning,
    });
  });

  // -- Render each page with its own context --------------------------------

  return (
    <div data-transition-router="" style={{ position: "relative" }}>
      {pages.map((page, i) => {
        const isPresent = page.key === latestPage?.key;
        return (
          <PresencePage
            key={page.key}
            isPresent={isPresent}
            info={info}
            timeout={timeout}
            onExitComplete={() => removePage(page.key)}
            style={
              !isPresent
                ? {
                    position: "absolute" as const,
                    inset: 0,
                    zIndex: pages.length - i,
                    pointerEvents: "none" as const,
                  }
                : undefined
            }
          >
            {page.outlet}
          </PresencePage>
        );
      })}
      {/* Non-outlet children (like TransitionDebug) rendered outside pages.
          They read from the nearest parent TransitionContext, which doesn't
          exist here — wrap in one for persistent components. */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PresencePage — wraps each page in its own TransitionContext.
// Like AnimatePresence's PresenceChild.
// ---------------------------------------------------------------------------

interface PresencePageProps {
  children: ReactNode;
  isPresent: boolean;
  info: TransitionInfo | null;
  timeout: number;
  onExitComplete: () => void;
  style?: React.CSSProperties | undefined;
}

function PresencePage({
  children,
  isPresent,
  info,
  timeout,
  onExitComplete,
  style,
}: PresencePageProps) {
  const regs = useRegistrations();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasExitedRef = useRef(false);

  // When isPresent flips to false → run all registered exits
  useEffect(() => {
    if (isPresent || hasExitedRef.current || !info) return;

    // Safety timeout
    timeoutRef.current = setTimeout(() => {
      if (!hasExitedRef.current) {
        hasExitedRef.current = true;
        console.warn("[TransitionRouter] Page exit timed out — removing");
        onExitComplete();
      }
    }, timeout);

    // Wait one tick for component effects to register, then run exits
    const timer = setTimeout(() => {
      void regs.runExits(info).then(() => {
        if (!hasExitedRef.current) {
          hasExitedRef.current = true;
          clearTimeout(timeoutRef.current);
          onExitComplete();
        }
      });
    }, 0);

    return () => {
      clearTimeout(timer);
      clearTimeout(timeoutRef.current);
    };
  }, [isPresent]); // eslint-disable-line react-hooks/exhaustive-deps

  // When isPresent and transitioning (info exists) → run enters
  useEffect(() => {
    if (!isPresent || !info) return;

    const timer = setTimeout(() => {
      void regs.runEnters(info);
    }, 0);

    return () => clearTimeout(timer);
  }, [isPresent, info?.from]); // eslint-disable-line react-hooks/exhaustive-deps

  const phase: TransitionPhase = !isPresent ? "exiting" : info ? "entering" : "idle";

  const contextValue: TransitionContextValue = {
    phase,
    from: info?.from ?? null,
    to: info?.to ?? null,
    registerExit: regs.registerExit,
    registerEnter: regs.registerEnter,
    registerEvent: regs.registerEvent,
  };

  return (
    <TransitionContext.Provider value={contextValue}>
      <div style={style} data-transition-page={isPresent ? "present" : "exiting"}>
        <TransitionErrorBoundary
          onError={() => {
            if (!hasExitedRef.current) {
              hasExitedRef.current = true;
              clearTimeout(timeoutRef.current);
              onExitComplete();
            }
          }}
        >
          {children}
        </TransitionErrorBoundary>
      </div>
    </TransitionContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Error boundary — catches stale context errors in exiting pages
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
  onError: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class TransitionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.warn("[TransitionRouter] Exiting page error:", error, errorInfo);
    this.props.onError();
  }

  override render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

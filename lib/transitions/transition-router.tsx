import {
  Component,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  type ReactNode,
  type ErrorInfo,
  type Ref,
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
  type CleanupFunction,
  type TransitionEventCallbacks,
} from "./context";
import { collectExits, collectEnters, runCleanups, type CollectedHandle } from "./helpers";
import type { TransitionPageState } from "./context";

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

  function runExits(info: TransitionInfo, enter: () => void): CollectedHandle {
    return collectExits(exitMap.current, eventMap.current, exitResolvers.current, info, enter);
  }

  function runEnters(info: TransitionInfo): CollectedHandle {
    return collectEnters(enterMap.current, eventMap.current, info);
  }

  return {
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
    const noop = () => {};
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
        runExits: () => runExits(info, noop).promise,
        runEnters: () => runEnters(info).promise,
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
      void runExits(info, noop).promise.then(() => proceed(info));
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
    void runEnters(info).promise.then(() => {
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
    mode: "wait",
    pages: [{ key: location.key, pathname: location.pathname, phase }],
    registerExit,
    registerEnter,
    registerEvent,
  };

  return <TransitionContext.Provider value={contextValue}>{children}</TransitionContext.Provider>;
}

// ---------------------------------------------------------------------------
// OVERLAP MODE — AnimatePresence-inspired, max 2 pages
// ---------------------------------------------------------------------------

interface RenderedPage {
  key: string;
  outlet: ReactNode;
  pathname: string;
}

/** Handle exposed by PresencePage */
interface PresencePageHandle {
  interrupt: () => Promise<void>;
  triggerEnters: () => void;
  getPhase: () => TransitionPhase;
}

function OverlapMode({
  children: externalChildren,
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

  const [pages, setPages] = useState<RenderedPage[]>(() => [
    { key: location.key, outlet, pathname: location.pathname },
  ]);

  const prevOutletRef = useRef(outlet);
  const prevKeyRef = useRef(location.key);

  // Refs to PresencePage handles for interruption
  const pageHandles = useRef(new Map<string, PresencePageHandle>());

  // Detect location change during render.
  const prevPathname = pages[pages.length - 1]?.pathname;
  if (location.key !== prevKeyRef.current) {
    if (location.pathname === prevPathname) {
      // Same page — sync the key + outlet so nothing drifts
      setPages((prev) =>
        prev.map((p, i) => (i === prev.length - 1 ? { ...p, key: location.key, outlet } : p)),
      );
    } else {
      const oldOutlet = prevOutletRef.current;
      const oldPathname = prevPathname ?? location.pathname;
      const hasNew = pages.some((p) => p.key === location.key);

      if (!hasNew) {
        const skip = preventTransition?.(oldPathname, location.pathname);
        if (skip) {
          setPages([{ key: location.key, outlet, pathname: location.pathname }]);
        } else {
          setPages((prev) => {
            // Max 2 pages: keep only the most recent + new page
            const current = prev[prev.length - 1];
            const updated = current ? [{ ...current, outlet: oldOutlet }] : [];
            return [
              ...updated,
              {
                key: location.key,
                outlet,
                pathname: location.pathname,
              },
            ];
          });

          // Interrupt any pages that got evicted
          for (const [key, handle] of pageHandles.current) {
            const isKept = key === prevKeyRef.current || key === location.key;
            if (!isKept) {
              void handle.interrupt();
            }
          }
        }
      }
    }
  }

  // Always track the latest key, even for same-pathname navigations
  prevKeyRef.current = location.key;
  prevOutletRef.current = outlet;

  const removePage = useCallback((key: string) => {
    pageHandles.current.delete(key);
    setPages((prev) => prev.filter((p) => p.key !== key));
  }, []);

  // Lifecycle callbacks
  const onExitStartRef = useRef(onExitStart);
  const onExitCompleteRef = useRef(onExitComplete);
  const onEnterStartRef = useRef(onEnterStart);
  const onEnterCompleteRef = useRef(onEnterComplete);
  onExitStartRef.current = onExitStart;
  onExitCompleteRef.current = onExitComplete;
  onEnterStartRef.current = onEnterStart;
  onEnterCompleteRef.current = onEnterComplete;

  // Derived state
  const isTransitioning = pages.length > 1;
  const latestPage = pages[pages.length - 1];
  const firstExiting = pages.length > 1 ? pages[0] : null;

  // enter() trigger — idempotent, triggers entering page's animations.
  // Called automatically when all exits complete, or manually from exit via info.enter().
  const enterTriggeredRef = useRef(false);
  const triggerEnter = useCallback(() => {
    if (enterTriggeredRef.current) return;
    enterTriggeredRef.current = true;
    const enteringKey = latestPage?.key;
    if (enteringKey) {
      pageHandles.current.get(enteringKey)?.triggerEnters();
    }
  }, [latestPage?.key]);

  // Reset enter trigger when transition starts
  const prevTransitioningRef = useRef(false);
  if (isTransitioning && !prevTransitioningRef.current) {
    enterTriggeredRef.current = false;
  }

  // Build info
  const infoRef = useRef<TransitionInfo | null>(null);
  if (firstExiting && latestPage) {
    infoRef.current = {
      from: firstExiting.pathname,
      to: latestPage.pathname,
      direction: "push" as TransitionDirection,
    };
  } else if (!isTransitioning) {
    infoRef.current = null;
  }
  const info = infoRef.current;

  // Lifecycle callbacks
  useEffect(() => {
    if (isTransitioning && !prevTransitioningRef.current && info) {
      onExitStartRef.current?.(info);
    }
    if (!isTransitioning && prevTransitioningRef.current && info) {
      onExitCompleteRef.current?.(info);
      onEnterCompleteRef.current?.(info);
    }
    prevTransitioningRef.current = isTransitioning;
  });

  // When exiting page completes → trigger enter if not already triggered
  const onPageExitComplete = useCallback(
    (key: string) => {
      triggerEnter();
      removePage(key);
    },
    [triggerEnter, removePage],
  );

  // Debug + document attribute: report at actual lifecycle moments
  useEffect(() => {
    document.documentElement.dataset.transitionPhase = isTransitioning ? "exiting" : "idle";
  }, [isTransitioning]);

  // Build page states for the top-level context by reading actual phase from handles
  const pageStates: TransitionPageState[] = pages.map((page) => {
    const handle = pageHandles.current.get(page.key);
    const phase = handle?.getPhase() ?? (page.key === latestPage?.key ? "idle" : "exiting");
    return { key: page.key, pathname: page.pathname, phase };
  });

  const topContextValue: TransitionContextValue = {
    phase: isTransitioning ? "exiting" : "idle",
    from: infoRef.current?.from ?? null,
    to: infoRef.current?.to ?? null,
    mode: "overlap",
    pages: pageStates,
    registerExit: () => () => {},
    registerEnter: () => () => {},
    registerEvent: () => () => {},
  };

  return (
    <TransitionContext.Provider value={topContextValue}>
      <div data-transition-router="" style={{ position: "relative" }}>
        {pages.map((page) => {
          const isPresent = page.key === latestPage?.key;
          return (
            <PresencePage
              key={page.key}
              ref={(handle) => {
                if (handle) {
                  pageHandles.current.set(page.key, handle);
                } else {
                  pageHandles.current.delete(page.key);
                }
              }}
              isPresent={isPresent}
              info={info}
              timeout={timeout}
              onExitComplete={() => onPageExitComplete(page.key)}
              onEnterRequest={triggerEnter}
              style={
                !isPresent
                  ? {
                      position: "absolute" as const,
                      inset: 0,
                      zIndex: 0,
                      pointerEvents: "none" as const,
                    }
                  : { position: "relative" as const, zIndex: 1 }
              }
            >
              {page.outlet}
            </PresencePage>
          );
        })}
      </div>
      {externalChildren}
    </TransitionContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// PresencePage — wraps each page with its own context + registrations.
// Exposes an `interrupt()` handle for forced cleanup on rapid navigation.
// ---------------------------------------------------------------------------

interface PresencePageProps {
  children: ReactNode;
  isPresent: boolean;
  info: TransitionInfo | null;
  timeout: number;
  onExitComplete: () => void;
  onEnterRequest: () => void;
  style?: React.CSSProperties | undefined;
}

const PresencePage = forwardRef(function PresencePage(
  { children, isPresent, info, timeout, onExitComplete, onEnterRequest, style }: PresencePageProps,
  ref: Ref<PresencePageHandle>,
) {
  const regs = useRegistrations();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasExitedRef = useRef(false);
  const cleanupsRef = useRef<CleanupFunction[]>([]);

  const entersTriggeredRef = useRef(false);
  const [phase, setPhase] = useState<TransitionPhase>(!isPresent ? "exiting" : "idle");

  // Expose handle to parent
  useImperativeHandle(
    ref,
    () => ({
      interrupt: async () => {
        if (hasExitedRef.current) return;
        hasExitedRef.current = true;
        clearTimeout(timeoutRef.current);

        if (cleanupsRef.current.length > 0) {
          await runCleanups(cleanupsRef.current);
          cleanupsRef.current = [];
        }

        onExitComplete();
      },
      triggerEnters: () => {
        if (entersTriggeredRef.current || !info) return;
        entersTriggeredRef.current = true;
        setPhase("entering");

        // Wait one tick for component effects to register
        setTimeout(() => {
          const handle = regs.runEnters(info);
          cleanupsRef.current.push(...handle.cleanups);
        }, 0);
      },
      getPhase: () => phase,
    }),
    [onExitComplete, info, regs, phase],
  );

  // When isPresent flips to false → run all registered exits
  useEffect(() => {
    if (isPresent || hasExitedRef.current || !info) return;
    setPhase("exiting");

    timeoutRef.current = setTimeout(() => {
      if (!hasExitedRef.current) {
        hasExitedRef.current = true;
        console.warn("[TransitionRouter] Page exit timed out — removing");
        onExitComplete();
      }
    }, timeout);

    // Wait one tick for component effects to register
    const timer = setTimeout(() => {
      const handle = regs.runExits(info, onEnterRequest);
      cleanupsRef.current = handle.cleanups;

      void handle.promise.then(() => {
        if (!hasExitedRef.current) {
          hasExitedRef.current = true;
          clearTimeout(timeoutRef.current);
          cleanupsRef.current = [];
          onExitComplete();
        }
      });
    }, 0);

    return () => {
      clearTimeout(timer);
      clearTimeout(timeoutRef.current);
    };
  }, [isPresent]); // eslint-disable-line react-hooks/exhaustive-deps

  const contextValue: TransitionContextValue = {
    phase,
    from: info?.from ?? null,
    to: info?.to ?? null,
    mode: "overlap",
    pages: [],
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
});

// ---------------------------------------------------------------------------
// Error boundary
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

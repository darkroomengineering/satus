import {
  Component,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useReducer,
  type ReactNode,
  type ErrorInfo,
} from "react";
import { useLocation, useNavigationType, useBlocker, useOutlet } from "react-router";
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
  type TransitionRegistry,
} from "./context";
import { collectExits, collectEnters, runCleanups } from "./helpers";
import type { TransitionPageState } from "./context";

// ---------------------------------------------------------------------------
// createRegistry — stable registration object, stored in useRef
// ---------------------------------------------------------------------------

function createRegistry(): TransitionRegistry {
  const exitMap = new Map<string, ExitFunction>();
  const enterMap = new Map<string, EnterFunction>();
  const eventMap = new Map<string, TransitionEventCallbacks>();
  const exitResolvers = new Map<string, () => void>();
  const enterResolvers = new Map<string, () => void>();

  return {
    registerExit(id, fn) {
      exitMap.set(id, fn);
      return () => {
        exitMap.delete(id);
        exitResolvers.get(id)?.();
        exitResolvers.delete(id);
      };
    },
    registerEnter(id, fn) {
      enterMap.set(id, fn);
      return () => {
        enterMap.delete(id);
        enterResolvers.get(id)?.();
        enterResolvers.delete(id);
      };
    },
    registerEvent(id, config) {
      eventMap.set(id, config);
      return () => {
        eventMap.delete(id);
        exitResolvers.get(`evt:${id}`)?.();
        exitResolvers.delete(`evt:${id}`);
        enterResolvers.get(`evt:${id}`)?.();
        enterResolvers.delete(`evt:${id}`);
      };
    },
    runExits(info, enter) {
      return collectExits(exitMap, eventMap, exitResolvers, info, enter);
    },
    runEnters(info) {
      return collectEnters(enterMap, eventMap, enterResolvers, info);
    },
    hasExits() {
      if (exitMap.size > 0) return true;
      for (const config of eventMap.values()) {
        if (config.onExit) return true;
      }
      return false;
    },
    clear() {
      exitMap.clear();
      enterMap.clear();
      eventMap.clear();
      for (const resolve of exitResolvers.values()) resolve();
      for (const resolve of enterResolvers.values()) resolve();
      exitResolvers.clear();
      enterResolvers.clear();
    },
  };
}

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
// Shared types
// ---------------------------------------------------------------------------

type InternalProps = Omit<TransitionRouterProps, "mode">;

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
  const registryRef = useRef(createRegistry());
  const registry = registryRef.current;

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
        runExits: () => registry.runExits(info, noop).promise,
        runEnters: () => registry.runEnters(info).promise,
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
      void registry.runExits(info, noop).promise.then(() => proceed(info));
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
    void registry.runEnters(info).promise.then(() => {
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
    registerExit: registry.registerExit,
    registerEnter: registry.registerEnter,
    registerEvent: registry.registerEvent,
  };

  const outlet = useOutlet();

  return (
    <TransitionContext.Provider value={contextValue}>
      {outlet}
      {children}
    </TransitionContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// OVERLAP MODE — useReducer + useLayoutEffect/useEffect orchestration
// ---------------------------------------------------------------------------

interface PageEntry {
  key: string;
  outlet: ReactNode;
  pathname: string;
}

type PageAction =
  | { type: "NAVIGATE"; page: PageEntry; frozenOutlet: ReactNode }
  | { type: "SKIP_NAVIGATE"; page: PageEntry }
  | { type: "REMOVE_PAGE"; key: string };

function pageReducer(state: PageEntry[], action: PageAction): PageEntry[] {
  switch (action.type) {
    case "NAVIGATE": {
      const current = state[state.length - 1];
      const kept = current ? [{ ...current, outlet: action.frozenOutlet }] : [];
      return [...kept, action.page];
    }
    case "SKIP_NAVIGATE":
      return [action.page];
    case "REMOVE_PAGE":
      return state.filter((p) => p.key !== action.key);
  }
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
  const navigationType = useNavigationType();

  const [pages, dispatch] = useReducer(pageReducer, [
    { key: location.key, outlet, pathname: location.pathname },
  ]);
  const [phase, setPhase] = useState<TransitionPhase>("idle");

  const prevKeyRef = useRef(location.key);
  const prevOutletRef = useRef(outlet);
  const infoRef = useRef<TransitionInfo | null>(null);
  const cleanupsRef = useRef<CleanupFunction[]>([]);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const enterTriggeredRef = useRef(false);
  const isTransitioningRef = useRef(false);
  // Counter that increments on each new transition to trigger the orchestration effect
  const transitionIdRef = useRef(0);
  const [transitionId, setTransitionId] = useState(0);

  // Global event registry (for useTransitionEvent in persistent components)
  const globalRegistryRef = useRef(createRegistry());
  const globalRegistry = globalRegistryRef.current;

  // Per-page registries, keyed by page key
  const pageRegistries = useRef(new Map<string, TransitionRegistry>());

  // Callback refs
  const onExitStartRef = useRef(onExitStart);
  const onExitCompleteRef = useRef(onExitComplete);
  const onEnterStartRef = useRef(onEnterStart);
  const onEnterCompleteRef = useRef(onEnterComplete);
  onExitStartRef.current = onExitStart;
  onExitCompleteRef.current = onExitComplete;
  onEnterStartRef.current = onEnterStart;
  onEnterCompleteRef.current = onEnterComplete;

  // Get or create a per-page registry
  function getOrCreatePageRegistry(key: string): TransitionRegistry {
    let reg = pageRegistries.current.get(key);
    if (!reg) {
      reg = createRegistry();
      pageRegistries.current.set(key, reg);
    }
    return reg;
  }

  // Preserved stylesheet clones — kept alive during transitions so CSS Modules
  // don't lose styles when React Router removes old route <link> tags from <head>.
  const preservedLinksRef = useRef<HTMLLinkElement[]>([]);

  function removePreservedLinks() {
    for (const link of preservedLinksRef.current) {
      link.remove();
    }
    preservedLinksRef.current = [];
  }

  // Finish a transition — clean up and remove exiting page.
  // `generation` prevents stale callbacks from old transitions (after rapid navigation).
  function finishTransition(exitingKey: string, generation: number) {
    if (!isTransitioningRef.current) return;
    if (transitionIdRef.current !== generation) return;
    isTransitioningRef.current = false;
    clearTimeout(timeoutIdRef.current);
    cleanupsRef.current = [];
    removePreservedLinks();
    setPhase("idle");
    dispatch({ type: "REMOVE_PAGE", key: exitingKey });
    pageRegistries.current.get(exitingKey)?.clear();
    pageRegistries.current.delete(exitingKey);
  }

  // ---------------------------------------------------------------------------
  // Preserve stylesheets during transitions (production CSS Module fix)
  // React Router's <Links> removes old route stylesheets from <head> on navigation,
  // even when the old page is still in the DOM during exit animations.
  // MutationObserver re-adds removed <link> tags as clones before the browser paints.
  // See: https://github.com/remix-run/react-router/issues/14413
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      if (!isTransitioningRef.current) return;

      for (const mutation of mutations) {
        for (const node of mutation.removedNodes) {
          if (
            node instanceof HTMLLinkElement &&
            node.rel === "stylesheet" &&
            node.href &&
            !node.dataset.transitionPreserved
          ) {
            const clone = node.cloneNode(true) as HTMLLinkElement;
            clone.dataset.transitionPreserved = "true";
            document.head.appendChild(clone);
            preservedLinksRef.current.push(clone);
          }
        }
      }
    });

    observer.observe(document.head, { childList: true });

    return () => {
      observer.disconnect();
      removePreservedLinks();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Location change detection (useLayoutEffect)
  // Fires synchronously after DOM commit. State updates here cause synchronous
  // re-render before paint. Children's useLayoutEffect (registrations) will fire
  // during that synchronous flush, before any useEffect.
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    if (location.key === prevKeyRef.current) return;

    const prevPathname = pages[pages.length - 1]?.pathname;
    const prevOutlet = prevOutletRef.current;

    // Update refs (moved out of render body)
    prevKeyRef.current = location.key;
    prevOutletRef.current = outlet;

    // Same pathname — nothing to do. React Router handles data updates internally.
    // Dispatching SYNC_KEY would change the page key, causing a full remount + stale initial().
    if (location.pathname === prevPathname) {
      return;
    }

    // Check if navigation should be prevented
    if (preventTransition?.(prevPathname ?? location.pathname, location.pathname)) {
      dispatch({
        type: "SKIP_NAVIGATE",
        page: { key: location.key, outlet, pathname: location.pathname },
      });
      return;
    }

    // Clean up any in-progress transition
    if (isTransitioningRef.current) {
      clearTimeout(timeoutIdRef.current);
      runCleanups(cleanupsRef.current);
      cleanupsRef.current = [];
      removePreservedLinks();
      isTransitioningRef.current = false;

      // Clear evicted page registries (anything that's not the new page)
      for (const [key, reg] of pageRegistries.current) {
        if (key !== location.key) {
          reg.clear();
          pageRegistries.current.delete(key);
        }
      }
    }

    // Reset transition state
    enterTriggeredRef.current = false;
    isTransitioningRef.current = true;

    const direction = navigationType.toLowerCase() as TransitionDirection;
    infoRef.current = {
      from: prevPathname ?? location.pathname,
      to: location.pathname,
      direction,
    };

    // Dispatch new page — reducer ensures max 2
    dispatch({
      type: "NAVIGATE",
      page: { key: location.key, outlet, pathname: location.pathname },
      frozenOutlet: prevOutlet,
    });

    setPhase("exiting");

    // Bump transition counter to trigger orchestration effect
    transitionIdRef.current++;
    setTransitionId(transitionIdRef.current);
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep prevOutletRef in sync for non-navigation renders
  useLayoutEffect(() => {
    prevOutletRef.current = outlet;
  });

  // ---------------------------------------------------------------------------
  // Orchestration (useEffect)
  // By the time this fires, all children's useLayoutEffect registrations have
  // completed. No setTimeout(0) needed.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (transitionId === 0 || !isTransitioningRef.current) return;

    const info = infoRef.current;
    if (!info || pages.length < 2) return;

    // Capture generation so stale callbacks from interrupted transitions are no-ops
    const generation = transitionIdRef.current;
    const isStale = () => transitionIdRef.current !== generation;

    const exitingKey = pages[0]!.key;
    const enteringKey = pages[1]!.key;
    const exitRegistry = pageRegistries.current.get(exitingKey);
    const enterRegistry = pageRegistries.current.get(enteringKey);

    onExitStartRef.current?.(info);

    // Safety timeout
    timeoutIdRef.current = setTimeout(() => {
      console.warn(`[TransitionRouter] Timed out after ${timeout}ms — force-proceeding`);
      finishTransition(exitingKey, generation);
    }, timeout);

    // The enter() trigger — idempotent, can be called by exit callbacks or auto after exits
    const triggerEnters = () => {
      if (isStale() || enterTriggeredRef.current) return;
      enterTriggeredRef.current = true;

      setPhase("entering");
      onExitCompleteRef.current?.(info);
      onEnterStartRef.current?.(info);

      const pageHandle = enterRegistry
        ? enterRegistry.runEnters(info)
        : { promise: Promise.resolve(), cleanups: [] as CleanupFunction[] };
      const globalHandle = globalRegistry.runEnters(info);

      cleanupsRef.current.push(...pageHandle.cleanups, ...globalHandle.cleanups);

      void Promise.all([pageHandle.promise, globalHandle.promise]).then(() => {
        if (isStale()) return;
        onEnterCompleteRef.current?.(info);
        finishTransition(exitingKey, generation);
      });
    };

    // Check if any exits are registered
    const hasPageExits = exitRegistry?.hasExits() ?? false;
    const hasGlobalExits = globalRegistry.hasExits();

    if (!hasPageExits && !hasGlobalExits) {
      // No exit callbacks — remove exiting page immediately, trigger enters
      dispatch({ type: "REMOVE_PAGE", key: exitingKey });
      pageRegistries.current.get(exitingKey)?.clear();
      pageRegistries.current.delete(exitingKey);

      enterTriggeredRef.current = true;
      setPhase("entering");
      onExitCompleteRef.current?.(info);
      onEnterStartRef.current?.(info);

      const pageHandle = enterRegistry
        ? enterRegistry.runEnters(info)
        : { promise: Promise.resolve(), cleanups: [] as CleanupFunction[] };
      const globalHandle = globalRegistry.runEnters(info);

      cleanupsRef.current.push(...pageHandle.cleanups, ...globalHandle.cleanups);

      void Promise.all([pageHandle.promise, globalHandle.promise]).then(() => {
        if (isStale()) return;
        onEnterCompleteRef.current?.(info);
        clearTimeout(timeoutIdRef.current);
        removePreservedLinks();
        setPhase("idle");
        isTransitioningRef.current = false;
        cleanupsRef.current = [];
      });
      return;
    }

    // Run exits from page registry + global event registry
    const pageExitHandle = exitRegistry
      ? exitRegistry.runExits(info, triggerEnters)
      : { promise: Promise.resolve(), cleanups: [] as CleanupFunction[] };
    const globalExitHandle = globalRegistry.runExits(info, triggerEnters);

    cleanupsRef.current.push(...pageExitHandle.cleanups, ...globalExitHandle.cleanups);

    void Promise.all([pageExitHandle.promise, globalExitHandle.promise]).then(() => {
      triggerEnters();
    });

    return () => {
      clearTimeout(timeoutIdRef.current);
    };
  }, [transitionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync data attribute
  useEffect(() => {
    document.documentElement.dataset.transitionPhase = phase;
  }, [phase]);

  // ---------------------------------------------------------------------------
  // Build context values and render
  // ---------------------------------------------------------------------------
  const isTransitioning = pages.length > 1;
  const latestPage = pages[pages.length - 1];

  // Per-page phase: exiting page is always "exiting". Entering page is "idle"
  // during exit phase (so initial() fires), "entering" during enter phase.
  const pageStates: TransitionPageState[] = pages.map((page) => ({
    key: page.key,
    pathname: page.pathname,
    phase:
      page.key === latestPage?.key
        ? isTransitioning
          ? phase === "entering"
            ? "entering"
            : "idle"
          : "idle"
        : "exiting",
  }));

  // Top-level context: global event registration for persistent components
  const topContextValue: TransitionContextValue = {
    phase,
    from: infoRef.current?.from ?? null,
    to: infoRef.current?.to ?? null,
    mode: "overlap",
    pages: pageStates,
    registerExit: globalRegistry.registerExit,
    registerEnter: globalRegistry.registerEnter,
    registerEvent: globalRegistry.registerEvent,
  };

  return (
    <TransitionContext.Provider value={topContextValue}>
      <div data-transition-router="" style={{ position: "relative" }}>
        {pages.map((page) => {
          const isPresent = page.key === latestPage?.key;
          const pageRegistry = getOrCreatePageRegistry(page.key);

          const pageContext: TransitionContextValue = {
            phase: !isPresent
              ? "exiting"
              : isTransitioning
                ? phase === "entering"
                  ? "entering"
                  : "idle"
                : "idle",
            from: infoRef.current?.from ?? null,
            to: infoRef.current?.to ?? null,
            mode: "overlap",
            pages: pageStates,
            registerExit: pageRegistry.registerExit,
            registerEnter: pageRegistry.registerEnter,
            registerEvent: pageRegistry.registerEvent,
          };

          return (
            <TransitionContext.Provider key={page.key} value={pageContext}>
              <div
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
                data-transition-page={isPresent ? "present" : "exiting"}
              >
                <TransitionErrorBoundary
                  onError={() => {
                    dispatch({ type: "REMOVE_PAGE", key: page.key });
                    pageRegistries.current.get(page.key)?.clear();
                    pageRegistries.current.delete(page.key);
                  }}
                >
                  {page.outlet}
                </TransitionErrorBoundary>
              </div>
            </TransitionContext.Provider>
          );
        })}
      </div>
      {externalChildren}
    </TransitionContext.Provider>
  );
}

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

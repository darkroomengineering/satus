import { useState, useRef, useEffect, useLayoutEffect, useReducer, type ReactNode } from "react";
import { useLocation, useNavigationType, useOutlet } from "react-router";
import {
  TransitionContext,
  type TransitionRouterProps,
  type TransitionContextValue,
  type TransitionPhase,
  type TransitionDirection,
  type TransitionInfo,
  type TransitionOrchestratorContext,
  type CleanupFunction,
  type TransitionPageState,
  type TransitionRegistry,
  type TransitionMode,
} from "./context";
import { runCleanups } from "./helpers";
import { createRegistry } from "./registry";
import { useStylesheetFix } from "./use-stylesheet-fix";
import { TransitionErrorBoundary } from "./error-boundary";

// ---------------------------------------------------------------------------
// Page stack reducer — max 2 pages (exiting + entering)
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

// ---------------------------------------------------------------------------
// Page styles — mode controls visibility during the exit phase
// ---------------------------------------------------------------------------

function getPageStyle(
  isPresent: boolean,
  mode: TransitionMode,
  phase: TransitionPhase,
  isTransitioning: boolean,
): React.CSSProperties {
  // Exiting page
  if (!isPresent) {
    if (mode === "wait") {
      // Wait: exiting page drives layout, visible during exit
      return { position: "relative", zIndex: 0, pointerEvents: "none" };
    }
    // Overlap: exiting page floats behind entering page
    return { position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" };
  }

  // Wait mode: hide entering page during exit phase (in DOM for hook registration)
  if (mode === "wait" && phase === "exiting" && isTransitioning) {
    return { position: "absolute", inset: 0, visibility: "hidden", pointerEvents: "none" };
  }

  // Present page (visible)
  return { position: "relative", zIndex: 1 };
}

// ---------------------------------------------------------------------------
// TransitionRouter — unified component
//
// State machine:
//   idle ──[navigation]──> exiting ──[exits done]──> entering ──[enters done]──> idle
//                              ^                                      |
//                              +──────────[rapid navigation]──────────+
//
// Both "wait" and "overlap" modes use the same page-stack approach.
// The mode controls:
//   - Whether the entering page is visible during exits
//   - Whether exit callbacks receive a functional enter() trigger
//   - When the exiting page is removed (before enters in wait, after in overlap)
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
  const outlet = useOutlet();
  const location = useLocation();
  const navigationType = useNavigationType();

  // Monotonically increasing page key — ensures React always mounts fresh
  // components for each navigation. Using location.key would cause React to
  // reuse component instances on back-navigation (same key), skipping initial()
  // and producing invisible enter animations.
  const navIdRef = useRef(0);

  const [pages, dispatch] = useReducer(pageReducer, [
    { key: "page-0", outlet, pathname: location.pathname },
  ]);
  const [phase, setPhase] = useState<TransitionPhase>("idle");

  const prevKeyRef = useRef(location.key);
  const prevOutletRef = useRef(outlet);
  const infoRef = useRef<TransitionInfo | null>(null);
  const cleanupsRef = useRef<CleanupFunction[]>([]);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const enterTriggeredRef = useRef(false);
  const isTransitioningRef = useRef(false);

  // Generation counter: ref is source of truth (bumped synchronously in
  // useLayoutEffect), state copy triggers the orchestration useEffect.
  const transitionGenRef = useRef(0);
  const [transitionGen, setTransitionGen] = useState(0);

  // Global event registry (for useTransitionEvent in persistent components)
  const globalRegistryRef = useRef(createRegistry());
  const globalRegistry = globalRegistryRef.current;

  // Per-page registries, keyed by page key
  const pageRegistries = useRef(new Map<string, TransitionRegistry>());

  // Callback refs — avoid stale closures in async animation callbacks
  const cbRef = useRef({
    onTransition,
    onExitStart,
    onExitComplete,
    onEnterStart,
    onEnterComplete,
  });
  cbRef.current = { onTransition, onExitStart, onExitComplete, onEnterStart, onEnterComplete };

  function getOrCreatePageRegistry(key: string): TransitionRegistry {
    let reg = pageRegistries.current.get(key);
    if (!reg) {
      reg = createRegistry();
      pageRegistries.current.set(key, reg);
    }
    return reg;
  }

  function finishTransition(exitingKey: string, generation: number) {
    if (!isTransitioningRef.current) return;
    if (transitionGenRef.current !== generation) return;
    isTransitioningRef.current = false;
    clearTimeout(timeoutIdRef.current);
    cleanupsRef.current = [];
    setPhase("idle");
    dispatch({ type: "REMOVE_PAGE", key: exitingKey });
    pageRegistries.current.get(exitingKey)?.clear();
    pageRegistries.current.delete(exitingKey);
  }

  // Preserve CSS Module stylesheets across navigations
  useStylesheetFix();

  // ---------------------------------------------------------------------------
  // Navigation detection (useLayoutEffect)
  //
  // Fires synchronously after DOM commit. Children's useLayoutEffect
  // registrations (exit/enter callbacks) complete during the synchronous
  // flush before any useEffect — so the orchestration effect always sees them.
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    if (location.key === prevKeyRef.current) return;

    const prevPathname = pages[pages.length - 1]?.pathname;
    const prevOutlet = prevOutletRef.current;

    prevKeyRef.current = location.key;
    prevOutletRef.current = outlet;

    // Same pathname — skip. React Router handles data updates internally.
    if (location.pathname === prevPathname) return;

    // Prevented navigation — skip animation, swap page instantly
    if (preventTransition?.(prevPathname ?? location.pathname, location.pathname)) {
      dispatch({
        type: "SKIP_NAVIGATE",
        page: {
          key: pages[pages.length - 1]?.key ?? "page-0",
          outlet,
          pathname: location.pathname,
        },
      });
      return;
    }

    // Abort in-progress transition (rapid navigation)
    if (isTransitioningRef.current) {
      clearTimeout(timeoutIdRef.current);
      runCleanups(cleanupsRef.current);
      cleanupsRef.current = [];
      isTransitioningRef.current = false;

      // Clear ALL page registries — we're aborting, start fresh
      for (const reg of pageRegistries.current.values()) {
        reg.clear();
      }
      pageRegistries.current.clear();
    }

    // Start new transition
    enterTriggeredRef.current = false;
    isTransitioningRef.current = true;

    const direction = navigationType.toLowerCase() as TransitionDirection;
    infoRef.current = {
      from: prevPathname ?? location.pathname,
      to: location.pathname,
      direction,
    };

    navIdRef.current++;
    dispatch({
      type: "NAVIGATE",
      page: { key: `page-${navIdRef.current}`, outlet, pathname: location.pathname },
      frozenOutlet: prevOutlet,
    });

    setPhase("exiting");

    // Bump generation to trigger orchestration effect
    transitionGenRef.current++;
    setTransitionGen(transitionGenRef.current);
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep prevOutletRef in sync on non-navigation renders.
  // ORDERING: must be declared AFTER the navigation detection effect
  // (React fires layout effects in declaration order).
  useLayoutEffect(() => {
    prevOutletRef.current = outlet;
  });

  // ---------------------------------------------------------------------------
  // Orchestration (useEffect)
  //
  // By this point all children's useLayoutEffect registrations are complete.
  // The generation counter guards against stale callbacks from interrupted
  // transitions — each async callback checks isStale() before proceeding.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (transitionGen === 0 || !isTransitioningRef.current) return;

    const info = infoRef.current;
    if (!info || pages.length < 2) return;

    const generation = transitionGenRef.current;
    const isStale = () => transitionGenRef.current !== generation;

    const exitingKey = pages[0]!.key;
    const enteringKey = pages[1]!.key;
    const exitRegistry = pageRegistries.current.get(exitingKey);
    const enterRegistry = pageRegistries.current.get(enteringKey);

    cbRef.current.onExitStart?.(info);

    // Safety timeout
    timeoutIdRef.current = setTimeout(() => {
      console.warn(`[TransitionRouter] Timed out after ${timeout}ms — force-proceeding`);
      finishTransition(exitingKey, generation);
    }, timeout);

    // Enter trigger — idempotent, used both by exit callbacks and after all exits complete
    const triggerEnters = () => {
      if (isStale() || enterTriggeredRef.current) return;
      enterTriggeredRef.current = true;

      cbRef.current.onExitComplete?.(info);

      // Wait mode: remove exiting page before enter phase so it's gone when entering page appears
      if (mode === "wait") {
        dispatch({ type: "REMOVE_PAGE", key: exitingKey });
        pageRegistries.current.get(exitingKey)?.clear();
        pageRegistries.current.delete(exitingKey);
      }

      setPhase("entering");
      cbRef.current.onEnterStart?.(info);

      const pageHandle = enterRegistry
        ? enterRegistry.runEnters(info)
        : { promise: Promise.resolve(), cleanups: [] as CleanupFunction[] };
      const globalHandle = globalRegistry.runEnters(info);

      cleanupsRef.current.push(...pageHandle.cleanups, ...globalHandle.cleanups);

      void Promise.all([pageHandle.promise, globalHandle.promise]).then(() => {
        if (isStale()) return;
        cbRef.current.onEnterComplete?.(info);

        if (mode === "overlap") {
          // Overlap: exiting page still in DOM — remove it now
          finishTransition(exitingKey, generation);
        } else {
          // Wait: exiting page already removed above
          clearTimeout(timeoutIdRef.current);
          setPhase("idle");
          isTransitioningRef.current = false;
          cleanupsRef.current = [];
        }
      });
    };

    // Custom orchestration — user controls the entire flow
    if (cbRef.current.onTransition) {
      const ctx: TransitionOrchestratorContext = {
        from: info.from,
        to: info.to,
        direction: info.direction,
        runExits: () => {
          const noop = () => {};
          const pageExitHandle = exitRegistry
            ? exitRegistry.runExits(info, noop)
            : { promise: Promise.resolve(), cleanups: [] as CleanupFunction[] };
          const globalExitHandle = globalRegistry.runExits(info, noop);
          cleanupsRef.current.push(...pageExitHandle.cleanups, ...globalExitHandle.cleanups);
          return Promise.all([pageExitHandle.promise, globalExitHandle.promise]).then(() => {});
        },
        runEnters: () => {
          const pageHandle = enterRegistry
            ? enterRegistry.runEnters(info)
            : { promise: Promise.resolve(), cleanups: [] as CleanupFunction[] };
          const globalHandle = globalRegistry.runEnters(info);
          cleanupsRef.current.push(...pageHandle.cleanups, ...globalHandle.cleanups);
          return Promise.all([pageHandle.promise, globalHandle.promise]).then(() => {});
        },
        next: () => finishTransition(exitingKey, generation),
      };

      const result = cbRef.current.onTransition(ctx);
      if (result && typeof result.then === "function") {
        result.then(
          () => {
            if (!isStale() && isTransitioningRef.current) {
              finishTransition(exitingKey, generation);
            }
          },
          (err: unknown) => {
            console.warn("[TransitionRouter] onTransition error:", err);
            finishTransition(exitingKey, generation);
          },
        );
      }
      return () => clearTimeout(timeoutIdRef.current);
    }

    // Default orchestration — run exits, then enters
    const hasPageExits = exitRegistry?.hasExits() ?? false;
    const hasGlobalExits = globalRegistry.hasExits();

    if (!hasPageExits && !hasGlobalExits) {
      // No exits — defer enters by one frame so initial()'s anime.js
      // duration:0 animations have time to apply. Without this, enter
      // callbacks fire before initial state is set, causing invisible
      // animations (element already at final state).
      const rafId = requestAnimationFrame(() => {
        triggerEnters();
      });
      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timeoutIdRef.current);
      };
    }

    // In wait mode, enter() from exit callbacks is a no-op (enters wait for all exits).
    // In overlap mode, enter() triggers enters early (pages animate simultaneously).
    const enterCallback = mode === "overlap" ? triggerEnters : () => {};

    const pageExitHandle = exitRegistry
      ? exitRegistry.runExits(info, enterCallback)
      : { promise: Promise.resolve(), cleanups: [] as CleanupFunction[] };
    const globalExitHandle = globalRegistry.runExits(info, enterCallback);

    cleanupsRef.current.push(...pageExitHandle.cleanups, ...globalExitHandle.cleanups);

    void Promise.all([pageExitHandle.promise, globalExitHandle.promise]).then(() => {
      triggerEnters();
    });

    return () => clearTimeout(timeoutIdRef.current);
  }, [transitionGen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync data attribute
  useEffect(() => {
    document.documentElement.dataset.transitionPhase = phase;
  }, [phase]);

  // ---------------------------------------------------------------------------
  // Build context values and render
  // ---------------------------------------------------------------------------
  const isTransitioning = pages.length > 1;
  const latestPage = pages[pages.length - 1];
  const direction = infoRef.current?.direction ?? null;

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

  // Top-level context for persistent components (useTransitionEvent)
  const topContextValue: TransitionContextValue = {
    phase,
    from: infoRef.current?.from ?? null,
    to: infoRef.current?.to ?? null,
    direction,
    mode,
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
            direction,
            mode,
            pages: pageStates,
            registerExit: pageRegistry.registerExit,
            registerEnter: pageRegistry.registerEnter,
            registerEvent: pageRegistry.registerEvent,
          };

          return (
            <TransitionContext.Provider key={page.key} value={pageContext}>
              <div
                style={getPageStyle(isPresent, mode, phase, isTransitioning)}
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
      {children}
    </TransitionContext.Provider>
  );
}

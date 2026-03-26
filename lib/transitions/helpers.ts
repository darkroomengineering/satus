import type {
  ExitFunction,
  EnterFunction,
  CleanupFunction,
  TransitionEventCallbacks,
  TransitionInfo,
  TransitionCtx,
} from "./context";

// ---------------------------------------------------------------------------
// Exit handling
// ---------------------------------------------------------------------------

export interface ExitHandle {
  promise: Promise<void>;
  cleanup: CleanupFunction | null;
}

export function wrapExit(
  id: string,
  fn: ExitFunction,
  resolvers: Map<string, () => void>,
  info: TransitionInfo,
  enter: () => void,
  ctx: TransitionCtx,
): ExitHandle {
  let cleanup: CleanupFunction | null = null;

  const promise = new Promise<void>((resolve) => {
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      resolvers.delete(id);
      resolve();
    };

    // Resolve any stale resolver for this id (prevents hanging promises from interrupted transitions)
    resolvers.get(id)?.();
    resolvers.set(id, done);

    try {
      const result = fn({ done, enter, info, ctx });
      if (typeof result === "function") {
        cleanup = result;
      }
    } catch (err) {
      console.warn("[TransitionRouter] Exit error:", err);
      done();
    }
  });

  return { promise, cleanup };
}

// ---------------------------------------------------------------------------
// Enter handling
// ---------------------------------------------------------------------------

export interface EnterHandle {
  promise: Promise<void>;
  cleanup: CleanupFunction | null;
}

export function wrapEnter(
  id: string,
  fn: EnterFunction,
  resolvers: Map<string, () => void>,
  info: TransitionInfo,
  ctx: TransitionCtx,
): EnterHandle {
  let cleanup: CleanupFunction | null = null;

  const promise = new Promise<void>((resolve) => {
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      resolvers.delete(id);
      resolve();
    };

    // Resolve any stale resolver for this id (prevents hanging promises from interrupted transitions)
    resolvers.get(id)?.();
    resolvers.set(id, done);

    try {
      const result = fn({ done, info, ctx });
      if (typeof result === "function") {
        cleanup = result;
      }
    } catch (err) {
      console.warn("[TransitionRouter] Enter error:", err);
      done();
    }
  });

  return { promise, cleanup };
}

// ---------------------------------------------------------------------------
// Collectors
// ---------------------------------------------------------------------------

export interface CollectedHandle {
  promise: Promise<void>;
  cleanups: CleanupFunction[];
}

export function collectExits(
  exitMap: Map<string, ExitFunction>,
  eventMap: Map<string, TransitionEventCallbacks>,
  resolvers: Map<string, () => void>,
  info: TransitionInfo,
  enter: () => void,
  ctx: TransitionCtx,
): CollectedHandle {
  const cleanups: CleanupFunction[] = [];
  const promises: Array<Promise<void>> = [];

  for (const [id, fn] of exitMap) {
    const h = wrapExit(id, fn, resolvers, info, enter, ctx);
    promises.push(h.promise);
    if (h.cleanup) cleanups.push(h.cleanup);
  }

  for (const [id, config] of eventMap) {
    if (config.onExit) {
      const h = wrapExit(`evt:${id}`, config.onExit, resolvers, info, enter, ctx);
      promises.push(h.promise);
      if (h.cleanup) cleanups.push(h.cleanup);
    }
  }

  const promise = promises.length > 0 ? Promise.all(promises).then(() => {}) : Promise.resolve();

  return { promise, cleanups };
}

export function collectEnters(
  enterMap: Map<string, EnterFunction>,
  eventMap: Map<string, TransitionEventCallbacks>,
  resolvers: Map<string, () => void>,
  info: TransitionInfo,
  ctx: TransitionCtx,
): CollectedHandle {
  const cleanups: CleanupFunction[] = [];
  const promises: Array<Promise<void>> = [];

  for (const [id, fn] of enterMap) {
    const h = wrapEnter(id, fn, resolvers, info, ctx);
    promises.push(h.promise);
    if (h.cleanup) cleanups.push(h.cleanup);
  }

  for (const [id, config] of eventMap) {
    if (config.onEnter) {
      const h = wrapEnter(`evt:${id}`, config.onEnter, resolvers, info, ctx);
      promises.push(h.promise);
      if (h.cleanup) cleanups.push(h.cleanup);
    }
  }

  const promise = promises.length > 0 ? Promise.all(promises).then(() => {}) : Promise.resolve();

  return { promise, cleanups };
}

/** Run all cleanup functions synchronously. */
export function runCleanups(cleanups: CleanupFunction[]): void {
  for (const fn of cleanups) {
    try {
      fn();
    } catch (err) {
      console.warn("[TransitionRouter] Cleanup error:", err);
    }
  }
}

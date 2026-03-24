import type {
  ExitFunction,
  EnterFunction,
  CleanupFunction,
  Thenable,
  TransitionEventCallbacks,
  TransitionInfo,
} from "./context";

// ---------------------------------------------------------------------------
// Return value discrimination
// ---------------------------------------------------------------------------

function isThenable(value: unknown): value is Thenable {
  return (
    value != null &&
    typeof value !== "function" &&
    typeof (value as Record<string, unknown>).then === "function"
  );
}

function isCleanup(value: unknown): value is CleanupFunction {
  return typeof value === "function";
}

// ---------------------------------------------------------------------------
// Exit handling
// ---------------------------------------------------------------------------

export interface ExitHandle {
  promise: Promise<void>;
  cleanup: CleanupFunction | null;
}

/**
 * Run a single exit function. Returns a handle with:
 * - `promise` that resolves when done() is called (or auto-done via thenable)
 * - `cleanup` function if the exit returned one (for interruption)
 */
export function wrapExit(
  id: string,
  fn: ExitFunction,
  resolvers: Map<string, () => void>,
  info: TransitionInfo,
  enter: () => void,
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

    resolvers.set(id, done);

    try {
      const result = fn({ done, enter, info });
      if (isCleanup(result)) {
        cleanup = result;
      } else if (isThenable(result)) {
        result.then(done, (err: unknown) => {
          console.warn("[TransitionRouter] Exit animation error:", err);
          done();
        });
      }
    } catch (err) {
      console.warn("[TransitionRouter] Exit animation error:", err);
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

/**
 * Run a single enter function. Returns a handle with promise + cleanup.
 */
export function runEnter(fn: EnterFunction, info: TransitionInfo): EnterHandle {
  let cleanup: CleanupFunction | null = null;

  try {
    const result = fn({ info });
    if (isCleanup(result)) {
      cleanup = result;
      return { promise: Promise.resolve(), cleanup };
    }
    if (isThenable(result)) {
      const promise = new Promise<void>((resolve) => {
        result.then(
          () => resolve(),
          (err: unknown) => {
            console.warn("[TransitionRouter] Enter animation error:", err);
            resolve();
          },
        );
      });
      return { promise, cleanup };
    }
  } catch (err) {
    console.warn("[TransitionRouter] Enter animation error:", err);
  }

  return { promise: Promise.resolve(), cleanup };
}

// ---------------------------------------------------------------------------
// Collectors — run all registered functions, return combined handle
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
): CollectedHandle {
  const cleanups: CleanupFunction[] = [];
  const promises: Array<Promise<void>> = [];

  for (const [id, fn] of exitMap) {
    const handle = wrapExit(id, fn, resolvers, info, enter);
    promises.push(handle.promise);
    if (handle.cleanup) cleanups.push(handle.cleanup);
  }

  for (const [id, config] of eventMap) {
    if (config.onExit) {
      const handle = wrapExit(`evt:${id}`, config.onExit, resolvers, info, enter);
      promises.push(handle.promise);
      if (handle.cleanup) cleanups.push(handle.cleanup);
    }
  }

  const promise = promises.length > 0 ? Promise.all(promises).then(() => {}) : Promise.resolve();

  return { promise, cleanups };
}

export function collectEnters(
  enterMap: Map<string, EnterFunction>,
  eventMap: Map<string, TransitionEventCallbacks>,
  info: TransitionInfo,
): CollectedHandle {
  const cleanups: CleanupFunction[] = [];
  const promises: Array<Promise<void>> = [];

  for (const [, fn] of enterMap) {
    const handle = runEnter(fn, info);
    promises.push(handle.promise);
    if (handle.cleanup) cleanups.push(handle.cleanup);
  }

  for (const [, config] of eventMap) {
    if (config.onEnter) {
      const handle = runEnter(config.onEnter, info);
      promises.push(handle.promise);
      if (handle.cleanup) cleanups.push(handle.cleanup);
    }
  }

  const promise = promises.length > 0 ? Promise.all(promises).then(() => {}) : Promise.resolve();

  return { promise, cleanups };
}

/**
 * Run all cleanup functions. If any return thenables, wait for them.
 */
export function runCleanups(cleanups: CleanupFunction[]): Promise<void> {
  const promises: Array<Promise<void>> = [];

  for (const fn of cleanups) {
    try {
      const result = fn();
      if (isThenable(result)) {
        promises.push(
          new Promise<void>((resolve) => {
            result.then(
              () => resolve(),
              () => resolve(),
            );
          }),
        );
      }
    } catch {
      // Cleanup errors are swallowed
    }
  }

  return promises.length > 0 ? Promise.all(promises).then(() => {}) : Promise.resolve();
}

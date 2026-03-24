import type { ExitFunction, EnterFunction, Thenable, TransitionEventCallbacks } from "./context";

/**
 * Wrap an exit function in a Promise that resolves when done() is called.
 * If the function returns a thenable, done() is auto-called on resolve.
 * Errors are caught and logged — transitions never get stuck.
 */
export function wrapExit(
  id: string,
  fn: ExitFunction,
  resolvers: Map<string, () => void>,
): Promise<void> {
  return new Promise<void>((resolve) => {
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      resolvers.delete(id);
      resolve();
    };

    resolvers.set(id, done);

    try {
      const result = fn(done);
      if (isThenable(result)) {
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
}

/**
 * Run an enter function. If it returns a thenable, await it.
 * Errors are caught — enter animations are fire-and-forget from the system's perspective.
 */
export function runEnter(fn: EnterFunction): Promise<void> {
  try {
    const result = fn();
    if (isThenable(result)) {
      return new Promise<void>((resolve) => {
        result.then(
          () => resolve(),
          (err: unknown) => {
            console.warn("[TransitionRouter] Enter animation error:", err);
            resolve();
          },
        );
      });
    }
  } catch (err) {
    console.warn("[TransitionRouter] Enter animation error:", err);
  }
  return Promise.resolve();
}

/**
 * Run all registered exit functions (page exits + persistent component exits).
 * Returns a Promise that resolves when ALL have completed.
 */
export function collectExits(
  exitMap: Map<string, ExitFunction>,
  eventMap: Map<string, TransitionEventCallbacks>,
  resolvers: Map<string, () => void>,
): Promise<void> {
  const promises: Array<Promise<void>> = [];

  for (const [id, fn] of exitMap) {
    promises.push(wrapExit(id, fn, resolvers));
  }

  for (const [id, config] of eventMap) {
    if (config.onExit) {
      promises.push(wrapExit(`evt:${id}`, config.onExit, resolvers));
    }
  }

  return promises.length > 0 ? Promise.all(promises).then(() => {}) : Promise.resolve();
}

/**
 * Run all registered enter functions (page enters + persistent component enters).
 */
export function collectEnters(
  enterMap: Map<string, EnterFunction>,
  eventMap: Map<string, TransitionEventCallbacks>,
): Promise<void> {
  const promises: Array<Promise<void>> = [];

  for (const [, fn] of enterMap) {
    promises.push(runEnter(fn));
  }

  for (const [, config] of eventMap) {
    if (config.onEnter) {
      promises.push(runEnter(config.onEnter));
    }
  }

  return promises.length > 0 ? Promise.all(promises).then(() => {}) : Promise.resolve();
}

function isThenable(value: unknown): value is Thenable {
  return value != null && typeof (value as Record<string, unknown>).then === "function";
}

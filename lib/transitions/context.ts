import { createContext } from "react";

export type TransitionPhase = "idle" | "exiting" | "entering";
export type TransitionDirection = "push" | "pop" | "replace";
export type TransitionMode = "wait" | "overlap";

/** Any object with a .then() — covers Promise, GSAP tweens/timelines, etc. */
export interface Thenable {
  then(resolve: (...args: unknown[]) => void, reject?: (...args: unknown[]) => void): unknown;
}

export interface TransitionInfo {
  from: string;
  to: string;
  direction: TransitionDirection;
}

/** Cleanup function returned from exit/enter. May return a thenable to wait for async cleanup (e.g. reversal). */
export type CleanupFunction = () => void | Thenable;

/** Context passed to exit callbacks */
export interface ExitContext {
  /** Signal that the exit animation is complete */
  done: () => void;
  /**
   * Trigger the entering page's animations early, before done() is called.
   * Idempotent — calling twice is safe. No-op in wait mode.
   * If never called, enters start automatically when done() fires.
   */
  enter: () => void;
  /** Navigation info: from, to, direction */
  info: TransitionInfo;
}

/** Context passed to enter callbacks */
export interface EnterContext {
  /** Navigation info: from, to, direction */
  info: TransitionInfo;
}

/**
 * Exit animation function.
 * - Destructure `{ done }` for simple exits
 * - Destructure `{ done, enter }` to trigger the next page mid-exit
 * - Destructure `{ done, enter, info }` for route-aware transitions
 * - Return a `Thenable` (GSAP tween/Promise) for auto-done
 * - Return a `function` as a cleanup handler (called on interruption)
 */
export type ExitFunction = (ctx: ExitContext) => void | Thenable | CleanupFunction;

/**
 * Enter animation function.
 * - Return a `Thenable` for async tracking
 * - Return a `function` as a cleanup handler (called on interruption)
 */
export type EnterFunction = (ctx: EnterContext) => void | Thenable | CleanupFunction;

export type InitialFunction = (info: TransitionInfo) => void;

export interface TransitionEventCallbacks {
  onExit?: ExitFunction;
  onEnter?: EnterFunction;
}

export interface TransitionContextValue {
  phase: TransitionPhase;
  from: string | null;
  to: string | null;
  registerExit: (id: string, fn: ExitFunction) => () => void;
  registerEnter: (id: string, fn: EnterFunction) => () => void;
  registerEvent: (id: string, config: TransitionEventCallbacks) => () => void;
}

export interface TransitionOrchestratorContext {
  from: string;
  to: string;
  direction: TransitionDirection;
  fromElement: HTMLElement | undefined;
  toElement: HTMLElement | undefined;
  runExits: () => Promise<void>;
  runEnters: () => Promise<void>;
  next: () => void;
}

export interface TransitionRouterProps {
  children: React.ReactNode;
  mode?: TransitionMode;
  timeout?: number;
  onTransition?: (ctx: TransitionOrchestratorContext) => void | Promise<void>;
  preventTransition?: (from: string, to: string) => boolean;
  onExitStart?: (info: TransitionInfo) => void;
  onExitComplete?: (info: TransitionInfo) => void;
  onEnterStart?: (info: TransitionInfo) => void;
  onEnterComplete?: (info: TransitionInfo) => void;
}

export const TransitionContext = createContext<TransitionContextValue | null>(null);

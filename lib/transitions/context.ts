import { createContext } from "react";
import type { CollectedHandle } from "./helpers";

export type TransitionPhase = "idle" | "exiting" | "entering";
export type TransitionDirection = "push" | "pop" | "replace";
export type TransitionMode = "swap" | "stack";

export interface TransitionInfo {
  from: string;
  to: string;
  direction: TransitionDirection;
}

/** Cleanup function returned from exit/enter. Called on interruption. */
export type CleanupFunction = () => void;

/** Shared context object — writable by any exit, readable by any enter. Cleared between transitions. */
export type TransitionCtx = Record<string, unknown>;

/** Context passed to exit callbacks */
export interface ExitContext {
  /** Signal that the exit animation is complete. Must be called. */
  done: () => void;
  /**
   * Trigger the entering page's animations early, before done().
   * Idempotent. No-op in wait mode.
   * If never called, enters start automatically when done() fires.
   */
  enter: () => void;
  /** Navigation info */
  info: TransitionInfo;
  /** Shared context — write data here for enter callbacks to read */
  ctx: TransitionCtx;
}

/** Context passed to enter callbacks */
export interface EnterContext {
  /** Signal that the enter animation is complete. Must be called. */
  done: () => void;
  /** Navigation info */
  info: TransitionInfo;
  /** Shared context — read data written by exit callbacks */
  ctx: TransitionCtx;
}

/**
 * Exit animation function. Call done() when finished.
 * Optionally return a cleanup function (called on interruption).
 */
export type ExitFunction = (ctx: ExitContext) => void | CleanupFunction;

/**
 * Enter animation function. Call done() when finished.
 * Optionally return a cleanup function (called on interruption).
 */
export type EnterFunction = (ctx: EnterContext) => void | CleanupFunction;

export type InitialFunction = (info: TransitionInfo) => void;

export interface TransitionEventCallbacks {
  onExit?: ExitFunction;
  onEnter?: EnterFunction;
}

export interface TransitionRegistry {
  registerExit: (id: string, fn: ExitFunction) => () => void;
  registerEnter: (id: string, fn: EnterFunction) => () => void;
  registerEvent: (id: string, config: TransitionEventCallbacks) => () => void;
  runExits: (info: TransitionInfo, enter: () => void, ctx: TransitionCtx) => CollectedHandle;
  runEnters: (info: TransitionInfo, ctx: TransitionCtx) => CollectedHandle;
  hasExits: () => boolean;
  clear: () => void;
}

export interface TransitionPageState {
  key: string;
  pathname: string;
  phase: TransitionPhase;
}

export interface TransitionContextValue {
  phase: TransitionPhase;
  from: string | null;
  to: string | null;
  direction: TransitionDirection | null;
  mode: TransitionMode;
  /** Whether first-load enter animations are enabled */
  appear: boolean;
  pages: TransitionPageState[];
  registerExit: (id: string, fn: ExitFunction) => () => void;
  registerEnter: (id: string, fn: EnterFunction) => () => void;
  registerEvent: (id: string, config: TransitionEventCallbacks) => () => void;
}

export interface TransitionOrchestratorContext {
  from: string;
  to: string;
  direction: TransitionDirection;
  runExits: () => Promise<void>;
  runEnters: () => Promise<void>;
  next: () => void;
}

export interface TransitionRouterProps {
  children: React.ReactNode;
  mode?: TransitionMode;
  timeout?: number;
  onTransition?: (ctx: TransitionOrchestratorContext) => void | Promise<void>;
  preventTransition?: (
    from: string,
    to: string,
    navigation: { direction: TransitionDirection; trigger: "link" | "browser" },
  ) => boolean;
  onExitStart?: (info: TransitionInfo) => void;
  onExitComplete?: (info: TransitionInfo) => void;
  onEnterStart?: (info: TransitionInfo) => void;
  onEnterComplete?: (info: TransitionInfo) => void;
  /** Enable enter animations on first page load. Default: false (SSR-safe). */
  appear?: boolean;
  /** Gate enter animations — set to false while a preloader is active. Default: true. */
  ready?: boolean;
}

export const TransitionContext = createContext<TransitionContextValue | null>(null);

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

export type ExitFunction = (done: () => void, info: TransitionInfo) => void | Thenable;
export type EnterFunction = (info: TransitionInfo) => void | Thenable;
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

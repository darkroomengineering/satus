import { useSyncExternalStore } from "react";
import type { TransitionPhase, TransitionMode, TransitionInfo } from "./context";

export interface DebugPageState {
  key: string;
  pathname: string;
  phase: TransitionPhase;
  exitCount: number;
  enterCount: number;
}

export interface TransitionDebugState {
  mode: TransitionMode;
  pages: DebugPageState[];
  info: TransitionInfo | null;
  isTransitioning: boolean;
}

const INITIAL: TransitionDebugState = {
  mode: "wait",
  pages: [],
  info: null,
  isTransitioning: false,
};

let state = INITIAL;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function setDebugState(next: TransitionDebugState): void {
  state = next;
  emit();
}

function getSnapshot(): TransitionDebugState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Subscribe to the internal transition debug state from anywhere in the tree. */
export function useTransitionDebug(): TransitionDebugState {
  return useSyncExternalStore(subscribe, getSnapshot, () => INITIAL);
}

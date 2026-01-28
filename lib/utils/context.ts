import { createContext, useContext } from 'react'

/**
 * Standard context interface for consistent state management across the application.
 *
 * @template S - State type containing reactive values
 * @template A - Actions type containing functions to modify state
 * @template M - Meta type for computed values and metadata (optional)
 *
 * @example
 * ```tsx
 * interface CounterState {
 *   count: number
 * }
 *
 * interface CounterActions {
 *   increment: () => void
 *   decrement: () => void
 * }
 *
 * interface CounterMeta {
 *   isEven: () => boolean
 * }
 *
 * const CounterContext = createStandardContext<CounterState, CounterActions, CounterMeta>('Counter')
 * ```
 */
export interface StandardContext<S, A, M = object> {
  state: S
  actions: A
  meta?: M
}

/**
 * Creates a typed context with the standard { state, actions, meta } structure.
 *
 * @param displayName - Optional display name for React DevTools
 * @returns A React context initialized with null
 *
 * @example
 * ```tsx
 * const MyContext = createStandardContext<MyState, MyActions>('MyContext')
 * ```
 */
export function createStandardContext<S, A, M = object>(displayName?: string) {
  const Context = createContext<StandardContext<S, A, M> | null>(null)
  if (displayName) Context.displayName = displayName
  return Context
}

/**
 * Hook factory for consuming a standard context with proper error handling.
 *
 * @param Context - The context to consume
 * @param hookName - Name of the hook for error messages
 * @returns The context value with state, actions, and optional meta
 * @throws Error if used outside of the Provider
 *
 * @example
 * ```tsx
 * export function useMyContext() {
 *   return useStandardContext(MyContext, 'useMyContext')
 * }
 * ```
 */
export function useStandardContext<S, A, M = object>(
  Context: React.Context<StandardContext<S, A, M> | null>,
  hookName: string
): StandardContext<S, A, M> {
  const context = useContext(Context)
  if (!context) {
    throw new Error(`${hookName} must be used within its Provider`)
  }
  return context
}

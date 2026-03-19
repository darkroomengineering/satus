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
 * type CounterContextType = StandardContext<CounterState, CounterActions>
 * ```
 */
export interface StandardContext<S, A, M = object> {
  state: S
  actions: A
  meta?: M
}

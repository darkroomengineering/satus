// Form state returned by server actions.
// Lives here (lib/) so lib-level utilities can import it without reaching
// upward into components/ (which would invert the dependency layer).
export type FormState<T = unknown> = {
  status: number
  message: string
  data?: T
  fieldErrors?: Record<string, string>
}

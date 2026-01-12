import { create } from 'zustand'

export type TransitionPhase = 'idle' | 'exiting' | 'entering'

export type TransitionType =
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'reveal'
  | 'custom'

interface TransitionState {
  /** Current transition phase */
  phase: TransitionPhase
  /** Whether a transition is in progress */
  isTransitioning: boolean
  /** Whether the PageTransition overlay is mounted and ready */
  isReady: boolean
  /** The href being navigated to */
  targetHref: string | null
  /** Transition type for exit */
  exitType: TransitionType
  /** Transition type for enter */
  enterType: TransitionType
  /** Duration in seconds */
  duration: number
  /** Callback when exit animation completes */
  onExitComplete: (() => void) | null
}

interface TransitionActions {
  /** Start exit transition */
  startExit: (
    href: string,
    options?: {
      exitType?: TransitionType
      enterType?: TransitionType
      duration?: number
      onExitComplete?: () => void
    }
  ) => void
  /** Mark exit as complete, start enter */
  completeExit: () => void
  /** Mark enter as complete, reset to idle */
  completeEnter: () => void
  /** Mark the overlay as ready (called by PageTransition on mount) */
  setReady: (ready: boolean) => void
  /** Reset transition state */
  reset: () => void
}

const initialState: TransitionState = {
  phase: 'idle',
  isTransitioning: false,
  isReady: false,
  targetHref: null,
  exitType: 'fade',
  enterType: 'fade',
  duration: 0.5,
  onExitComplete: null,
}

export const useTransitionStore = create<TransitionState & TransitionActions>(
  (set, get) => ({
    ...initialState,

    startExit: (href, options = {}) => {
      const {
        exitType = 'fade',
        enterType = 'fade',
        duration = 0.5,
        onExitComplete,
      } = options

      set({
        phase: 'exiting',
        isTransitioning: true,
        targetHref: href,
        exitType,
        enterType,
        duration,
        onExitComplete: onExitComplete ?? null,
      })
    },

    completeExit: () => {
      const { onExitComplete } = get()
      // Set phase to 'entering' BEFORE calling the callback
      // This ensures the enter animation effect sees the correct phase
      set({
        phase: 'entering',
        onExitComplete: null,
      })
      // Now trigger navigation
      onExitComplete?.()
    },

    completeEnter: () => {
      set({
        phase: 'idle',
        isTransitioning: false,
        targetHref: null,
      })
    },

    setReady: (ready: boolean) => {
      set({ isReady: ready })
    },

    reset: () => set(initialState),
  })
)

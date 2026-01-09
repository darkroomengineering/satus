'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { type TransitionType, useTransitionStore } from './store'

interface NavigateOptions {
  /** Transition type for the exit animation */
  exitType?: TransitionType
  /** Transition type for the enter animation (defaults to exitType) */
  enterType?: TransitionType
  /** Duration in seconds */
  duration?: number
  /** Callback when exit animation completes (before navigation) */
  onExitComplete?: () => void
}

/**
 * Hook for programmatic page transitions.
 *
 * Use this when you need to trigger transitions from code
 * rather than from a link click.
 *
 * @example
 * ```tsx
 * const { navigate, isTransitioning } = usePageTransition()
 *
 * const handleSubmit = async (data) => {
 *   await saveData(data)
 *   navigate('/success', { exitType: 'slide-left' })
 * }
 * ```
 */
export function usePageTransition() {
  const router = useRouter()
  const { phase, isTransitioning, startExit, reset } = useTransitionStore()

  const navigate = useCallback(
    (href: string, options: NavigateOptions = {}) => {
      const { exitType = 'fade', enterType, duration, onExitComplete } = options

      // Don't start new transition if one is in progress
      if (isTransitioning) return

      // Capture href for callback closure
      const targetHref = href

      startExit(targetHref, {
        exitType,
        enterType: enterType || exitType,
        ...(duration !== undefined && { duration }),
        onExitComplete: () => {
          onExitComplete?.()
          // Cast to Route for typed routes compatibility
          router.push(targetHref as Route)
        },
      })
    },
    [isTransitioning, startExit, router]
  )

  return {
    /** Navigate with transition */
    navigate,
    /** Current transition phase */
    phase,
    /** Whether a transition is in progress */
    isTransitioning,
    /** Reset transition state (emergency use) */
    reset,
  }
}

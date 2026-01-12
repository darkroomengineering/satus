'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { type MouseEvent, useCallback } from 'react'
import { Link } from '~/components/ui/link'
import { type TransitionType, useTransitionStore } from './store'

interface TransitionLinkProps {
  /** The destination URL */
  href?: string
  /** Transition type for the exit animation */
  exitType?: TransitionType
  /** Transition type for the enter animation (defaults to exitType) */
  enterType?: TransitionType
  /** Duration in seconds */
  duration?: number
  /** Callback when transition starts */
  onTransitionStart?: () => void
  /** Click handler */
  onClick?: (e: MouseEvent<HTMLElement>) => void
  /** Scroll to top after navigation */
  scroll?: boolean
  /** Additional CSS class */
  className?: string
  /** Link content */
  children?: React.ReactNode
}

/**
 * A link component that triggers page transitions.
 *
 * Wraps the standard Link component and intercepts navigation
 * to play a GSAP-powered transition animation before navigating.
 *
 * @example
 * ```tsx
 * <TransitionLink href="/about" exitType="slide-up">
 *   About Us
 * </TransitionLink>
 * ```
 */
export function TransitionLink({
  href,
  exitType = 'fade',
  enterType,
  duration,
  onTransitionStart,
  onClick,
  scroll,
  className,
  children,
}: TransitionLinkProps) {
  const router = useRouter()
  const { isReady, isTransitioning, startExit } = useTransitionStore()

  const handleClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      // Call original onClick if provided
      onClick?.(e)

      // Don't intercept if default was prevented
      if (e.defaultPrevented) return

      // Don't intercept if no href
      if (!href) return

      // Don't intercept external links
      if (href.startsWith('http://') || href.startsWith('https://')) return

      // Don't intercept if modifier keys are pressed (new tab, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      // If transitions aren't ready (overlay not mounted), let normal navigation happen
      if (!isReady) return

      // Don't start new transition if one is in progress
      if (isTransitioning) {
        e.preventDefault()
        return
      }

      // Prevent default navigation
      e.preventDefault()

      // Notify callback
      onTransitionStart?.()

      // Capture href for use in callback
      const targetHref = href

      // Start transition
      startExit(targetHref, {
        exitType,
        enterType: enterType || exitType,
        ...(duration !== undefined && { duration }),
        onExitComplete: () => {
          // Navigate after exit animation completes
          // Cast to Route for typed routes compatibility
          router.push(targetHref as Route)
        },
      })
    },
    [
      href,
      onClick,
      isTransitioning,
      startExit,
      exitType,
      enterType,
      duration,
      onTransitionStart,
      router,
      isReady,
    ]
  )

  return (
    <Link
      {...(href !== undefined && { href })}
      onClick={handleClick}
      {...(scroll !== undefined && { scroll })}
      {...(className !== undefined && { className })}
    >
      {children}
    </Link>
  )
}

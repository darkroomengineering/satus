'use client'

import cn from 'clsx'
import gsap from 'gsap'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import s from './page-transition.module.css'
import { type TransitionType, useTransitionStore } from './store'

// Animation configurations - easily customizable
const ANIMATIONS: Record<
  TransitionType,
  {
    enter: gsap.TweenVars
    exit: gsap.TweenVars
    initial: gsap.TweenVars
  }
> = {
  fade: {
    initial: { opacity: 0 },
    exit: { opacity: 1 },
    enter: { opacity: 0 },
  },
  'slide-left': {
    initial: { xPercent: -100 },
    exit: { xPercent: 0 },
    enter: { xPercent: 100 },
  },
  'slide-right': {
    initial: { xPercent: 100 },
    exit: { xPercent: 0 },
    enter: { xPercent: -100 },
  },
  'slide-up': {
    initial: { yPercent: 100 },
    exit: { yPercent: 0 },
    enter: { yPercent: -100 },
  },
  'slide-down': {
    initial: { yPercent: -100 },
    exit: { yPercent: 0 },
    enter: { yPercent: 100 },
  },
  reveal: {
    initial: { scaleY: 0, transformOrigin: 'top' },
    exit: { scaleY: 1, transformOrigin: 'top' },
    enter: { scaleY: 0, transformOrigin: 'bottom' },
  },
  custom: {
    initial: { opacity: 0 },
    exit: { opacity: 1 },
    enter: { opacity: 0 },
  },
}

interface PageTransitionProps {
  /** Custom class for the overlay */
  className?: string
  /** Background color of the overlay */
  color?: string
  /** Default transition type */
  defaultType?: TransitionType
  /** Default duration in seconds */
  defaultDuration?: number
  /** Custom easing */
  ease?: string
  /** Callback when transition starts */
  onTransitionStart?: () => void
  /** Callback when transition ends */
  onTransitionEnd?: () => void
}

/**
 * Page transition overlay component.
 *
 * Place this in your root layout to enable GSAP-powered page transitions.
 * Works with TransitionLink for navigation or can be triggered programmatically.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx or Wrapper component
 * <PageTransition color="black" defaultType="slide-up" />
 * ```
 */
export function PageTransition({
  className,
  color = 'var(--color-background, black)',
  defaultType = 'fade',
  defaultDuration = 0.5,
  ease = 'power3.inOut',
  onTransitionStart,
  onTransitionEnd,
}: PageTransitionProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const prevPathname = useRef(pathname)

  const {
    phase,
    exitType,
    enterType,
    duration,
    completeExit,
    completeEnter,
    setReady,
  } = useTransitionStore()

  // Mark overlay as ready on mount
  useEffect(() => {
    setReady(true)
    return () => setReady(false)
  }, [setReady])

  // Handle exit animation
  useEffect(() => {
    if (phase !== 'exiting') return

    const overlay = overlayRef.current
    if (!overlay) return

    onTransitionStart?.()

    const type = exitType || defaultType
    const animDuration = duration || defaultDuration
    const config = ANIMATIONS[type]

    // Reset all animatable properties before setting initial state
    // This prevents leftover values from previous animations
    gsap.set(overlay, {
      visibility: 'visible',
      opacity: 1,
      xPercent: 0,
      yPercent: 0,
      scaleY: 1,
      transformOrigin: 'center',
      ...config.initial,
    })

    // Animate to exit state (overlay covers screen)
    gsap.to(overlay, {
      ...config.exit,
      duration: animDuration,
      ease,
      onComplete: completeExit,
    })
  }, [
    phase,
    exitType,
    duration,
    defaultType,
    defaultDuration,
    ease,
    completeExit,
    onTransitionStart,
  ])

  // Handle enter animation (triggered by pathname change after navigation)
  useEffect(() => {
    // Only animate if we're in entering phase
    if (phase !== 'entering') return

    // Only animate if pathname actually changed
    if (pathname === prevPathname.current) return

    const overlay = overlayRef.current
    if (!overlay) return

    // Update prevPathname only after all checks pass
    prevPathname.current = pathname

    const type = enterType || defaultType
    const animDuration = duration || defaultDuration
    const config = ANIMATIONS[type]

    // Animate overlay out (reveal new page)
    gsap.to(overlay, {
      ...config.enter,
      duration: animDuration,
      ease,
      onComplete: () => {
        gsap.set(overlay, { visibility: 'hidden' })
        completeEnter()
        onTransitionEnd?.()
      },
    })
  }, [
    pathname,
    phase,
    enterType,
    duration,
    defaultType,
    defaultDuration,
    ease,
    completeEnter,
    onTransitionEnd,
  ])

  return (
    <div
      ref={overlayRef}
      className={cn(s.overlay, className)}
      style={{
        backgroundColor: color,
        visibility: 'hidden',
      }}
      aria-hidden="true"
    />
  )
}

export {
  type TransitionPhase,
  type TransitionType,
  useTransitionStore,
} from './store'
export { TransitionLink } from './transition-link'
export { usePageTransition } from './use-page-transition'

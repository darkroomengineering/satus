'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'

// Layout effect on the client (avoids a hidden→visible flash for elements
// already in view on mount), plain effect on the server (no SSR warning).
const useIsomorphicLayoutEffect =
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- SSR guard; literal typeof enables bundler dead-code elimination
  typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Entrance animations are for content the visitor has not seen yet. On a slow
 * connection the server-rendered text paints and is readable long before the
 * bundle arrives; hydrating then hides it and replays the entrance, yanking
 * copy the visitor is mid-sentence in, and stamps LCP at hydration time
 * (measured on shield.fi, throttled mobile, 2026-08-28: 7.0 s LCP for a
 * paragraph that first painted at 1.2 s). When the bundle itself landed this
 * late, skip the choreography and reveal instantly.
 *
 * Module scope on purpose: this captures how late the FIRST load's bundle
 * was, once. Client-side navigations mount fresh DOM that has never painted,
 * so their entrances stay correct regardless of this flag, and on a session
 * that started slow, skipping later entrances too errs on the side of the
 * struggling device.
 */
// oxlint-disable-next-line anti-slop/no-runtime-typeof -- SSR guard; literal typeof enables bundler dead-code elimination
const HYDRATED_LATE = typeof window !== 'undefined' && performance.now() > 2500

interface UseRevealOptions {
  /** IntersectionObserver threshold (0–1). Default 0. */
  threshold?: number
  /** Default bottom inset of -25% reveals once the element is a quarter into the viewport. */
  rootMargin?: string
  /** Reveal only once, then disconnect. Default true. */
  once?: boolean
}

/**
 * Flips `data-reveal` (`"hidden"` → `"visible"`) on the returned ref when it
 * enters the viewport; the animation itself is CSS on `[data-reveal-item]`
 * children (compositor thread, unaffected by hydration work). Items get a
 * `--reveal-index` property for staggered `transition-delay`. The CSS contract
 * lives once in `lib/styles/css/global.css`; per-section knobs are
 * `--reveal-transform`, `--reveal-stagger` and `--reveal-duration` on the
 * container.
 *
 * Without JS `data-reveal` is never set, so the hidden state never applies.
 * Under reduced motion, or when `HYDRATED_LATE`, the element is revealed
 * immediately and the observer is skipped.
 */
export function useReveal<T extends HTMLElement = HTMLElement>({
  threshold = 0,
  rootMargin = '0px 0px -25% 0px',
  once = true,
}: UseRevealOptions = {}) {
  const ref = useRef<T>(null)

  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const items = element.querySelectorAll<HTMLElement>('[data-reveal-item]')
    items.forEach((item, index) => {
      item.style.setProperty('--reveal-index', String(index))
    })

    if (
      HYDRATED_LATE ||
      // oxlint-disable-next-line hamo/no-raw-observer -- hook returns the server snapshot during hydration
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      element.dataset.reveal = 'visible'
      return
    }

    element.dataset.reveal = 'hidden'

    // oxlint-disable-next-line hamo/no-raw-observer -- state-based hook would add a hidden-then-visible flash
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            element.dataset.reveal = 'visible'
            if (once) observer.disconnect()
          } else if (!once) {
            element.dataset.reveal = 'hidden'
          }
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return ref
}

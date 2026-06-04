'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Reveal-on-scroll primitive.
 *
 * Attaches an IntersectionObserver to the returned ref and flips a
 * `data-reveal` attribute (`"hidden"` → `"visible"`) when the element enters
 * the viewport. The actual animation lives in CSS — animate `transform` and
 * `opacity` on `[data-reveal-item]` children so it runs on the compositor
 * thread, unaffected by main-thread work during hydration. This is the
 * off-main-thread alternative to driving entrance animations with GSAP.
 *
 * Children that should stagger carry `data-reveal-item`; the hook sets a
 * `--reveal-index` custom property on each so CSS can derive a
 * `transition-delay`. The visual treatment (distance, axis, duration, easing)
 * stays in the component's CSS module — this hook only owns the mechanism.
 *
 * Degrades gracefully: with JS disabled the `data-reveal` attribute is never
 * set, so the CSS hidden state (scoped under `[data-reveal]`) never applies and
 * content renders visible. Under `prefers-reduced-motion` the element is
 * revealed immediately and the observer is skipped.
 *
 * The reveal CSS contract lives once, globally, in `lib/styles/css/global.css`;
 * per-section knobs are set on the container in its own CSS module:
 * `--reveal-transform` (hidden offset), `--reveal-stagger`, `--reveal-duration`.
 *
 * @example
 * ```tsx
 * const ref = useReveal<HTMLDivElement>()
 * return (
 *   <div ref={ref} className={s.grid}>
 *     {items.map((item) => (
 *       <div key={item.id} data-reveal-item className={s.card}>{item.name}</div>
 *     ))}
 *   </div>
 * )
 * ```
 *
 * ```css
 * .grid {
 *   --reveal-transform: translateY(32px);
 *   --reveal-stagger: 120ms;
 * }
 * ```
 */

// Layout effect on the client (avoids a hidden→visible flash for elements
// already in view on mount), plain effect on the server (no-op, no SSR warning).
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

interface UseRevealOptions {
  /** IntersectionObserver threshold (0–1). Default 0. */
  threshold?: number
  /**
   * IntersectionObserver rootMargin. The default bottom inset of -25% mirrors
   * a GSAP ScrollTrigger `start: 'top 75%'` — reveal once the element is a
   * quarter into the viewport.
   */
  rootMargin?: string
  /** Reveal only once, then disconnect. Default true. */
  once?: boolean
}

export function useReveal<T extends HTMLElement = HTMLElement>({
  threshold = 0,
  rootMargin = '0px 0px -25% 0px',
  once = true,
}: UseRevealOptions = {}) {
  const ref = useRef<T>(null)

  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    // Index staggered children so CSS can offset each via transition-delay.
    const items = element.querySelectorAll<HTMLElement>('[data-reveal-item]')
    items.forEach((item, index) => {
      item.style.setProperty('--reveal-index', String(index))
    })

    // Respect reduced motion: reveal immediately, never observe.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.dataset.reveal = 'visible'
      return
    }

    element.dataset.reveal = 'hidden'

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

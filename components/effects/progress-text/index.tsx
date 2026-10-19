'use client'

import { animate, onScroll, splitText, stagger } from 'animejs'
import cn from 'clsx'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef } from 'react'

import { usePreferredReducedMotion } from '@/hooks/use-sync-external'

import s from './progress-text.module.css'

type ProgressTextProps = {
  /**
   * Text content to reveal — a string, or JSX with inline markup (e.g.
   * `<em>word</em>`). anime.js's `splitText` splits every rendered word
   * regardless of nesting. Treated as STATIC after mount: the split takes
   * ownership of the rendered text nodes, so React updating `children` in
   * place would clash with the split DOM. To change the content, remount
   * with a `key`.
   */
  children: ReactNode
  /**
   * anime.js `onScroll` `enter` threshold, viewport edge first, then the
   * element's (`'bottom top'`: the viewport's bottom meets the element's top).
   */
  enter?: string
  /** anime.js `onScroll` `leave` threshold, e.g. `'bottom bottom'`. */
  leave?: string
  /**
   * Opacity of words the scroll position hasn't reached yet. Default is
   * 0.8, not a low "barely there" dim: this text is real visible content
   * (not decorative), so its dimmest resting state still has to clear
   * WCAG AA 4.5:1 against the page background. `.outro`
   * (`app/(site)/page.module.css`) already renders this text at
   * `opacity: 0.6`, and CSS opacity nests multiplicatively, so the two
   * combine to 0.6 x 0.8 = 0.48 effective alpha (~4.9:1 for white-on-black,
   * measured with colorjs.io's WCAG21 contrast — the 4.5:1 floor needs
   * >= ~0.76 here). Lowering this without raising the container opacity
   * re-fails color-contrast.
   */
  dimOpacity?: number
  className?: string
  style?: CSSProperties
}

/**
 * Scroll-driven text reveal, built on anime.js's `splitText` + `onScroll`.
 *
 * Words fade from `dimOpacity` to fully opaque as scroll progress advances
 * through `enter`..`leave` (synced 1:1, no easing lag). Lenis feeds the
 * scroll through the bridge in `components/layout/lenis/anime.tsx`.
 * `prefers-reduced-motion: reduce` skips the scroll linkage and fades every
 * word in once.
 */
export function ProgressText({
  children,
  enter = 'top top',
  leave = 'bottom bottom',
  dimOpacity = 0.8,
  className,
  style,
}: ProgressTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = usePreferredReducedMotion()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const split = splitText(container, {
      // `noUncheckedIndexedAccess` types the CSS module's index signature
      // as `string | undefined`; the class always exists at build time.
      words: { class: s.word ?? false },
      // The real accessible text is the sr-only span rendered below; the
      // default would insert a second hidden copy inside this container.
      accessible: false,
    })

    // The effect re-runs after any re-split, and `split.revert()` reverts the
    // animation it returned, its `onScroll`, and the split markup together.
    split.addEffect(({ words }) => {
      if (words.length === 0) return
      if (prefersReducedMotion) {
        return animate(words, { opacity: [dimOpacity, 1], duration: 300 })
      }
      // Each word fades over twice its share of the range, so neighbours
      // overlap instead of switching on one at a time.
      const share = 1000 / words.length
      return animate(words, {
        opacity: [dimOpacity, 1],
        duration: share * 2,
        delay: stagger(share),
        ease: 'linear',
        autoplay: onScroll({ target: container, enter, leave, sync: true }),
      })
    })

    return () => {
      split.revert()
    }
  }, [enter, leave, dimOpacity, prefersReducedMotion])

  return (
    <>
      {/* Real accessible text: a plain element (not the split container) so
          aria-hidden placement never depends on the split having run — the
          sentence is readable to assistive tech from first paint, not just
          after the reveal animation wires up. */}
      <span className="sr-only">{children}</span>
      <span
        ref={containerRef}
        aria-hidden="true"
        className={cn(s.progressText, className)}
        style={style}
      >
        {children}
      </span>
    </>
  )
}

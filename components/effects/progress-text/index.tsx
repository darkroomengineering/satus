'use client'

import type { TextSplitter } from 'animejs'
import cn from 'clsx'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef } from 'react'

import { usePreferredReducedMotion } from '@/hooks/use-sync-external'

import s from './progress-text.module.css'

// anime.js loads after hydration instead of with the page: a static import
// puts the whole library in the initial JS of every route that renders this.
// The import() lives outside the component because React Compiler cannot
// compile a component containing an import expression.
const loadAnime = () => import('animejs')

type ProgressTextProps = {
  /**
   * A string or JSX with inline markup; `splitText` splits every rendered word
   * regardless of nesting. Static after mount: the split owns the rendered
   * text nodes, so React updating `children` in place would clash with it.
   * Remount with a `key` to change the content.
   */
  children: ReactNode
  /** anime.js `onScroll` `enter`, viewport edge first (`'bottom top'`: viewport bottom meets element top). */
  enter?: string
  /** anime.js `onScroll` `leave`. The default ends when the element's bottom crosses the viewport's middle. */
  leave?: string
  /**
   * Opacity of words the scroll hasn't reached yet. This is real content, so
   * its dimmest state must clear WCAG AA 4.5:1 (0.5 gives ~5.3:1, white on
   * black). CSS opacity multiplies: an ancestor with its own `opacity` lowers
   * that further, so raise this to match.
   */
  dimOpacity?: number
  className?: string
  style?: CSSProperties
}

/**
 * Scroll-driven text reveal (anime.js `splitText` + `onScroll`): words fade
 * from `dimOpacity` to opaque across `enter`..`leave`, synced 1:1. Lenis feeds
 * the scroll via `components/layout/lenis/anime.tsx`. Under
 * `prefers-reduced-motion: reduce` every word fades in once, when the text
 * enters.
 */
export function ProgressText({
  children,
  enter = 'bottom top',
  leave = 'center bottom',
  dimOpacity = 0.5,
  className,
  style,
}: ProgressTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = usePreferredReducedMotion()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let split: TextSplitter | undefined
    let cancelled = false

    // Until anime.js arrives the text shows fully opaque, the no-JS state.
    void loadAnime().then(({ animate, onScroll, splitText, stagger }) => {
      if (cancelled) return

      const textSplit = splitText(container, {
        // `noUncheckedIndexedAccess` types the CSS module's index signature
        // as `string | undefined`; the class always exists at build time.
        words: { class: s.word ?? false },
        // The real accessible text is the sr-only span rendered below; the
        // default would insert a second hidden copy inside this container.
        accessible: false,
      })
      split = textSplit

      // The effect re-runs after any re-split, and `revert()` reverts the
      // animation it returned, its `onScroll`, and the split markup together.
      textSplit.addEffect(({ words }) => {
        if (words.length === 0) return
        if (prefersReducedMotion) {
          // `sync: 'play'` starts the fade when the text enters, not at mount,
          // which for below-fold text would finish before anyone sees it.
          return animate(words, {
            opacity: [dimOpacity, 1],
            duration: 300,
            autoplay: onScroll({ target: container, enter, sync: 'play' }),
          })
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
    })

    return () => {
      cancelled = true
      split?.revert()
    }
  }, [enter, leave, dimOpacity, prefersReducedMotion])

  return (
    <>
      {/* Accessible text lives outside the split container, so it is readable
          from first paint, before the split has run. */}
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

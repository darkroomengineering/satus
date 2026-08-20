'use client'

import { useRect } from 'hamo'
import { useLenis } from 'lenis/react'
import { useEffect, useRef } from 'react'

import { mapRange } from '@/utils/math'

import s from './scrollbar.module.css'

// Fixed nudge per Arrow key press — mirrors a typical native scrollbar's
// arrow-key step rather than jumping the full viewport.
const ARROW_KEY_SCROLL_AMOUNT = 100

interface ScrollbarProps {
  /**
   * DOM id of the element this scrollbar controls (the `ReactLenis`
   * wrapper, or the page root when Lenis runs in `root` mode). Feeds
   * `aria-controls` — see https://www.w3.org/TR/wai-aria-1.2/#scrollbar.
   *
   * Optional rather than required: this is an exported primitive, and forks
   * already render `<Scrollbar />` with no props. Omitting it costs the
   * `aria-controls` association and nothing else, so a missing id degrades
   * the semantics instead of breaking the build.
   */
  controlsId?: string
}

export function Scrollbar({ controlsId }: ScrollbarProps = {}) {
  const thumbRef = useRef<HTMLDivElement>(null!)
  const lenis = useLenis()
  const [innerMeasureRef, { height: innerHeight = 0 }] = useRect()
  const [thumbMeasureRef, { height: thumbHeight = 0 }] = useRect()

  useLenis(
    ({ scroll, limit }) => {
      const progress = limit > 0 ? scroll / limit : 0

      thumbRef.current.style.transform = `translate3d(0,${
        progress * (innerHeight - thumbHeight)
      }px,0)`

      // Imperative, not React state: this runs on every scroll frame, and a
      // state update here would re-render just to move an attribute the DOM
      // already reflects visually through the transform above.
      thumbRef.current.setAttribute(
        'aria-valuenow',
        String(Math.round(progress * 100))
      )
    },
    [innerHeight, thumbHeight]
  )

  useEffect(() => {
    let start: null | number = null

    function onPointerMove(e: PointerEvent) {
      if (start === null || !lenis) return

      e.preventDefault()

      const scroll = mapRange(
        0,
        innerHeight - thumbHeight,
        e.clientY - start,
        0,
        lenis.limit
      )

      lenis?.scrollTo(scroll, { lerp: 0.2 })
    }

    function onPointerDown(e: PointerEvent) {
      start = e.offsetY
      document.documentElement.classList.add('scrollbar-grabbing')
    }

    function onPointerUp() {
      start = null
      document.documentElement.classList.remove('scrollbar-grabbing')
    }

    // A cancelled gesture (OS interruption, alt-tab, touch cancel) never
    // fires `pointerup` — without this, `start` stays non-null and
    // `.scrollbar-grabbing` sticks on `<html>` permanently.
    function onPointerCancel() {
      start = null
      document.documentElement.classList.remove('scrollbar-grabbing')
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!lenis) return
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return

      e.preventDefault()
      const delta =
        e.key === 'ArrowDown'
          ? ARROW_KEY_SCROLL_AMOUNT
          : -ARROW_KEY_SCROLL_AMOUNT
      lenis.scrollTo(lenis.scroll + delta, { lerp: 0.2 })
    }

    const element = thumbRef.current
    element?.addEventListener('pointerdown', onPointerDown, false)
    element?.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointermove', onPointerMove, false)
    window.addEventListener('pointerup', onPointerUp, false)
    window.addEventListener('pointercancel', onPointerCancel, false)

    return () => {
      element?.removeEventListener('pointerdown', onPointerDown, false)
      element?.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointermove', onPointerMove, false)
      window.removeEventListener('pointerup', onPointerUp, false)
      window.removeEventListener('pointercancel', onPointerCancel, false)
    }
  }, [lenis, innerHeight, thumbHeight])

  return (
    <div className={s.scrollbar}>
      <div ref={innerMeasureRef} className={s.inner}>
        <div
          className={s.thumb}
          role="scrollbar"
          aria-label="Page scroll position"
          aria-controls={controlsId}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          tabIndex={0}
          ref={(node) => {
            if (!node) return
            thumbRef.current = node
            thumbMeasureRef(node)
          }}
        />
      </div>
    </div>
  )
}

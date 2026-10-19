import { engine, scrollContainers } from 'animejs'
import { useLenis } from 'lenis/react'
import { useEffect } from 'react'
import { useTempus } from 'tempus/react'

// Lenis emits `scroll` before it writes the position to the DOM, and the
// browser fires its own `scroll` a frame later, so anime's observers re-read
// the position in the Tempus tick below, after the write. Module scope: it
// reads no reactive state, and only one root Lenis mounts this.
let scrolled = false

function handleScroll() {
  scrolled = true
}

/**
 * Runs anime.js on the Tempus loop and feeds it Lenis's scroll.
 * Must be rendered inside ReactLenis context.
 */
export function LenisAnimeSync() {
  // Tempus owns the frame loop while this is mounted. Unmounting hands anime
  // its own loop back, or every animation in flight would freeze.
  useEffect(() => {
    engine.useDefaultMainLoop = false
    // The flag only stops anime from starting its loop: a loop already running
    // re-queues itself and ticks before Lenis, so cancel its queued frame.
    engine.pause()
    engine.resume()
    return () => {
      engine.useDefaultMainLoop = true
      engine.wake()
    }
  }, [])

  useLenis(handleScroll)

  // order: 10 — after Lenis (order: -1) has written scroll state, so scrubbed
  // animations render this frame's scroll position, not last frame's.
  useTempus(
    () => {
      if (scrolled) {
        scrolled = false
        for (const container of scrollContainers.values()) {
          container.handleScroll()
        }
      }
      engine.update()
    },
    { order: 10 }
  )

  return null
}

// oxlint-disable-next-line eslint/no-restricted-imports -- the one place media queries are written
import { useMediaQuery, useWindowSize } from 'hamo'
import { useSyncExternalStore } from 'react'

import { breakpoints } from '@/styles/config'

import { usePreferredReducedMotion } from './use-sync-external'

// Safari and WebGL support never change while the page is open, so compute
// once and share across hook instances.
interface DeviceDetectionCache {
  isSafari?: boolean
  supportsWebGL?: boolean
}

const cache: DeviceDetectionCache = {}

function detectIsSafari() {
  cache.isSafari ??= /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  return cache.isSafari
}

/**
 * Renderer strings that mean WebGL is emulated on the CPU: Chrome's
 * SwiftShader (headless Chrome, cloud audit runners such as PageSpeed
 * Insights, VMs without a GPU), Mesa's llvmpipe/softpipe, and generic
 * "Software" adapters. A context still comes back, so a bare
 * `getContext('webgl2')` check passes, but every frame is main-thread work:
 * measured on shield.fi with `--use-angle=swiftshader` (2026-08-28),
 * Lighthouse recorded 28 s of blocking time on desktop and 149 s on mobile,
 * and PageSpeed Insights gave up with "the page stopped responding". Those
 * machines get the DOM fallback, same as no-WebGL2 devices.
 */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software/i

function probeSupportsWebGL(): boolean {
  const probe = document.createElement('canvas').getContext('webgl2')
  if (!probe) return false

  try {
    // Chrome 101+ returns the unmasked renderer from RENDERER directly; older
    // browsers and Firefox need the debug extension.
    const debug = probe.getExtension('WEBGL_debug_renderer_info')
    const renderer = String(
      debug
        ? probe.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : probe.getParameter(probe.RENDERER)
    )
    return !SOFTWARE_RENDERER.test(renderer)
  } finally {
    // Chrome caps live WebGL contexts at ~16 per page and evicts the oldest.
    // An unreleased probe holds a slot for the session, and once the cap is hit
    // the real canvas can be the one evicted.
    probe.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

function detectSupportsWebGL() {
  cache.supportsWebGL ??= probeSupportsWebGL()
  return cache.supportsWebGL
}

// These detections never change after load: a stable no-op subscribe keeps
// useSyncExternalStore happy without ever notifying.
function subscribeToStaticDetection() {
  // oxlint-disable-next-line eslint/no-empty-function -- required unsubscribe signature; nothing to tear down since the value is never notified
  return () => {}
}

function getStaticDetectionServerSnapshot() {
  return undefined
}

/**
 * `isWebGL` is true only for a hardware-accelerated WebGL2 context (see
 * `SOFTWARE_RENDERER`) on a desktop-width viewport that is not touch-only
 * (`isTouchOnly`). Phones in landscape and tablets get the DOM fallback even
 * past the desktop breakpoint; a laptop with a touchscreen keeps WebGL because
 * its primary pointer can hover.
 */
export function useDeviceDetection() {
  const breakpoint = breakpoints.dt

  const isMobile = useMediaQuery(`(max-width: ${breakpoint - 1}px)`)
  const isDesktop = useMediaQuery(`(min-width: ${breakpoint}px)`)
  const isReducedMotion = usePreferredReducedMotion()
  const isTouchOnly = useMediaQuery('(any-pointer: coarse) and (hover: none)')
  const { dpr } = useWindowSize()

  // Undefined on the server so SSR stays consistent; the real value on the
  // client with no effect.
  const isSafari = useSyncExternalStore(
    subscribeToStaticDetection,
    detectIsSafari,
    getStaticDetectionServerSnapshot
  )
  const supportsWebGL = useSyncExternalStore(
    subscribeToStaticDetection,
    detectSupportsWebGL,
    getStaticDetectionServerSnapshot
  )

  // `isTouchOnly` is undefined until its media query resolves; `!isTouchOnly`
  // would read that as "not touch" and open the gate early.
  const isWebGL = supportsWebGL && isDesktop && isTouchOnly === false

  return {
    isMobile,
    isDesktop,
    isReducedMotion,
    isTouchOnly,
    dpr,
    isWebGL,
    isSafari,
  }
}

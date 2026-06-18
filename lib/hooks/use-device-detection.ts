import { useMediaQuery, useWindowSize } from 'hamo'
import { useEffect, useState } from 'react'
import { breakpoints } from '@/styles/config'
import { usePreferredReducedMotion } from './use-sync-external'

function checkIsAutoplaySupported() {
  // Detect if user can autoplay inline video
  // Works when user is on low-battery mode on IOS
  // Return promise from video.play
  const video = document.createElement('video')
  video.src =
    'data:video/mp4;base64,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'
  video.load()
  video.style.display = 'none'
  video.autoplay = true
  video.setAttribute('webkit-playsinline', 'webkit-playsinline')
  video.setAttribute('playsinline', 'playsinline')
  video.muted = true
  return video.play()
}

/**
 * Module-level cache for static, session-constant detections.
 *
 * Safari / WebGL / autoplay support never change while the page is open, but
 * detecting them is non-trivial (the autoplay check spins up a <video> and
 * calls play()). Computing once and sharing across every hook instance avoids
 * re-running that work for each component that mounts.
 */
const cache: {
  isSafari?: boolean
  supportsWebGL?: boolean
  isAutoplaySupported?: Promise<boolean>
} = {}

function detectIsSafari() {
  cache.isSafari ??= /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  return cache.isSafari
}

function detectSupportsWebGL() {
  cache.supportsWebGL ??= !!document
    .createElement('canvas')
    .getContext('webgl2')
  return cache.supportsWebGL
}

function detectIsAutoplaySupported() {
  cache.isAutoplaySupported ??= checkIsAutoplaySupported().then(
    () => true,
    () => false
  )
  return cache.isAutoplaySupported
}

/**
 * Detect device capabilities: screen size, input method, motion preference,
 * WebGL support, Safari, and inline-video autoplay support.
 *
 * @example
 * ```tsx
 * const { isMobile, isWebGL, isReducedMotion, isAutoplaySupported } = useDeviceDetection()
 * ```
 */
export function useDeviceDetection() {
  const breakpoint = breakpoints.dt

  const isMobile = useMediaQuery(`(max-width: ${breakpoint - 1}px)`)
  const isDesktop = useMediaQuery(`(min-width: ${breakpoint}px)`)
  const isReducedMotion = usePreferredReducedMotion()
  // Detects coarse-pointer / no-hover devices (touch-only, e.g. phones/tablets)
  const isTouchOnly = useMediaQuery('(any-pointer: coarse) and (hover: none)')
  const { dpr } = useWindowSize()

  // Static detections — resolved from the module cache after mount (client-only
  // so SSR stays consistent; undefined until then).
  const [isSafari, setIsSafari] = useState<boolean>()
  const [supportsWebGL, setSupportsWebGL] = useState<boolean>()
  const [isAutoplaySupported, setIsAutoplaySupported] = useState<boolean>()

  useEffect(() => {
    setIsSafari(detectIsSafari())
    setSupportsWebGL(detectSupportsWebGL())
    detectIsAutoplaySupported().then(setIsAutoplaySupported)
  }, [])

  const isWebGL = supportsWebGL && isDesktop

  return {
    // Screen size
    isMobile,
    isDesktop,
    // Accessibility
    isReducedMotion,
    // Performance
    isTouchOnly,
    dpr,
    // Rendering
    isWebGL,

    // Browser
    isSafari,
    // Capabilities
    isAutoplaySupported,
  }
}

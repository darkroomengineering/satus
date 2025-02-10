'use client'

import { type Rect, useLazyState, useWindowSize } from 'hamo'
import { useLenis } from 'lenis/react'
import { useCallback, useEffect, useRef } from 'react'
import { useTransform } from '~/hooks/use-transform'
import { clamp, mapRange } from '~/libs/maths'
import { useOrchestra } from '~/orchestra'
import { useMinimap } from '~/orchestra/minimap'

// @refresh reset

type UseMarkerOptions = {
  text?: string
  color?: string
  type?: 'start' | 'end'
  fixed?: boolean
  visible?: boolean
  id?: string
}

function useMarker({
  type = 'start',
  fixed = false,
  visible = false,
  id = '',
}: UseMarkerOptions = {}) {
  const elementRef = useRef<HTMLElement | null>(null)

  const color = type === 'start' ? 'green' : 'red'
  const text = type === 'start' ? 'start' : 'end'

  const setElementRef = useMinimap({
    color,
  })

  const { minimap } = useOrchestra()

  useEffect(() => {
    if (!minimap) return

    if (!visible) return

    const element = document.createElement('div')
    setElementRef?.(element)

    element.style.cssText = `
        position: ${fixed ? 'fixed' : 'absolute'};
        top: 0px;
        left: ${fixed ? '50%' : '10%'};
        right: ${fixed ? '10%' : '50%'};
        text-align: ${fixed ? 'left' : 'right'};
        z-index: 9999;
        color: ${color};
        
        ${type === 'start' ? 'border-top' : 'border-bottom'}: 1px solid ${color};
        transform: translateY(${type === 'start' ? '0%' : '-100%'});
        font-size: 24px;
        font-family: Arial, sans-serif;
        text-transform: uppercase;
      `

    const innerElement = document.createElement('div')
    innerElement.style.cssText = `
      position: absolute;
      padding: 8px;
      ${type === 'start' ? 'left' : 'right'}: 0;
    `
    element.appendChild(innerElement)

    innerElement.innerText = (fixed ? 'viewport ' : `${id} `) + text

    // setElementRef?.(element)
    elementRef.current = element
    element.style.pointerEvents = 'none'
    document.documentElement.appendChild(elementRef.current)

    return () => {
      // setElementRef?.(null)
      elementRef.current?.remove()
    }
  }, [color, text, fixed, id, visible, type, setElementRef, minimap])

  const top = useCallback(
    (value: number) => {
      if (!elementRef.current) return
      const element = elementRef.current
      element.style.top = `${value}px`

      if (!fixed) return

      const firstChild = element.children[0] as HTMLElement

      if (value <= 0) {
        element.style.transform = 'translateY(0%)'
        element.style.borderBottom = 'none'
        element.style.borderTop = `1px solid ${color}`

        firstChild.style.top = '0'
      } else if (value >= window.innerHeight) {
        element.style.transform = 'translateY(-100%)'
        element.style.borderBottom = `1px solid ${color}`
        element.style.borderTop = 'none'

        firstChild.style.bottom = '0'
      }
    },
    [color, fixed]
  )

  return { top }
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' || !Number.isNaN(value)
}

type TriggerPosition = 'top' | 'center' | 'bottom' | number
type TriggerPositionCombination = `${TriggerPosition} ${TriggerPosition}`

export type UseScrollTriggerOptions = {
  rect?: Rect
  start?: TriggerPositionCombination
  end?: TriggerPositionCombination
  id?: string
  offset?: number
  disabled?: boolean
  markers?: boolean
  onEnter?: ({ progress }: { progress: number }) => void
  onLeave?: ({ progress }: { progress: number }) => void
  onProgress?: (progress: {
    height: number
    isActive: boolean
    progress: number
    lastProgress: number
    steps: number[]
  }) => void
  steps?: number
}

export function useScrollTrigger(
  {
    rect,
    start = 'bottom bottom', // bottom of the element meets the bottom of the viewport
    end = 'top top', // top of the element meets the top of the viewport
    id = '',
    offset = 0,
    disabled = false,
    markers,
    onEnter,
    onLeave,
    onProgress,
    steps = 1,
  }: UseScrollTriggerOptions,
  deps = [] as unknown[]
) {
  const getTransform = useTransform()
  const lenis = useLenis()

  const elementMarkerStart = useMarker({
    id,
    type: 'start',
    visible: markers,
  })
  const elementMarkerEnd = useMarker({
    id,
    type: 'end',
    visible: markers,
  })

  const viewportMarkerStart = useMarker({
    id,
    type: 'start',
    fixed: true,
    visible: markers,
  })
  const viewportMarkerEnd = useMarker({
    id,
    type: 'end',
    fixed: true,
    visible: markers,
  })

  const { height: windowHeight = 0 } = useWindowSize()

  const [elementStartKeyword, viewportStartKeyword] =
    typeof start === 'string' ? start.split(' ') : [start]
  const [elementEndKeyword, viewportEndKeyword] =
    typeof end === 'string' ? end.split(' ') : [end]

  let viewportStart = isNumber(viewportStartKeyword)
    ? Number.parseFloat(viewportStartKeyword)
    : 0
  if (viewportStartKeyword === 'top') viewportStart = 0
  if (viewportStartKeyword === 'center') viewportStart = windowHeight * 0.5
  if (viewportStartKeyword === 'bottom') viewportStart = windowHeight

  let viewportEnd = isNumber(viewportEndKeyword)
    ? Number.parseFloat(viewportEndKeyword)
    : 0
  if (viewportEndKeyword === 'top') viewportEnd = 0
  if (viewportEndKeyword === 'center') viewportEnd = windowHeight * 0.5
  if (viewportEndKeyword === 'bottom') viewportEnd = windowHeight

  let elementStart = isNumber(elementStartKeyword)
    ? Number.parseFloat(elementStartKeyword)
    : rect?.bottom || 0
  if (elementStartKeyword === 'top') elementStart = rect?.top || 0
  if (elementStartKeyword === 'center')
    elementStart = (rect?.top || 0) + (rect?.height || 0) * 0.5
  if (elementStartKeyword === 'bottom') elementStart = rect?.bottom || 0

  elementStart += offset

  let elementEnd = isNumber(elementEndKeyword)
    ? Number.parseFloat(elementEndKeyword)
    : rect?.top || 0
  if (elementEndKeyword === 'top') elementEnd = rect?.top || 0
  if (elementEndKeyword === 'center')
    elementEnd = (rect?.top || 0) + (rect?.height || 0) * 0.5
  if (elementEndKeyword === 'bottom') elementEnd = rect?.bottom || 0

  elementEnd += offset

  const startValue = elementStart - viewportStart
  const endValue = elementEnd - viewportEnd

  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress

  const onUpdate = useCallback(
    (progress: number, lastProgress: number) => {
      onProgressRef.current?.({
        height: endValue - startValue,
        isActive: progress >= 0 && progress <= 1,
        progress: clamp(0, progress, 1),
        lastProgress: lastProgress,
        steps: Array.from({ length: steps }).map((_, i) =>
          clamp(0, mapRange(i / steps, (i + 1) / steps, progress, 0, 1), 1)
        ),
      })
    },
    [endValue, startValue, steps, ...deps]
  )

  // eslint-disable-next-line no-unused-vars
  const [setProgress, getProgress] = useLazyState(
    // @ts-ignore
    undefined,
    (progress: number, lastProgress: number) => {
      if (Number.isNaN(progress) || progress === undefined) return

      if (
        (progress >= 0 && lastProgress < 0) ||
        (progress <= 1 && lastProgress > 1)
      ) {
        onEnter?.({ progress: clamp(0, progress, 1) })
      }

      if (!(clamp(0, progress, 1) === clamp(0, lastProgress, 1))) {
        onUpdate(progress, lastProgress)
      }

      if (
        (progress < 0 && lastProgress >= 0) ||
        (progress > 1 && lastProgress <= 1)
      ) {
        onLeave?.({ progress: clamp(0, progress, 1) })
      }
    },
    [endValue, startValue, steps, onUpdate, ...deps]
  )

  // useEffect(() => {
  //   const progress = getProgress()
  //   if (Number.isNaN(progress)) return

  //   onUpdate(progress, progress)
  // }, [getProgress, onUpdate, ...deps])

  const update = useCallback(() => {
    if (disabled) return

    let scroll: number

    if (lenis) {
      scroll = Math.floor(lenis?.scroll)
    } else {
      scroll = window.scrollY
    }

    const { translate } = getTransform()

    if (viewportMarkerStart) viewportMarkerStart.top(viewportStart)

    if (viewportMarkerEnd) viewportMarkerEnd.top(viewportEnd)

    if (elementMarkerStart) elementMarkerStart.top(elementStart - translate.y)

    if (elementMarkerEnd) elementMarkerEnd.top(elementEnd - translate.y)

    const progress = mapRange(startValue, endValue, scroll - translate.y, 0, 1)

    setProgress(progress)
  }, [
    lenis,
    viewportMarkerStart,
    viewportMarkerEnd,
    viewportStart,
    viewportEnd,
    elementMarkerStart,
    elementMarkerEnd,
    elementStart,
    elementEnd,
    startValue,
    endValue,
    getTransform,
    setProgress,
    disabled,
    ...deps,
  ])

  useLenis(update, [update])

  useEffect(() => {
    if (lenis) return

    update()
    window.addEventListener('scroll', update, false)

    return () => {
      window.removeEventListener('scroll', update, false)
    }
  }, [lenis, update])

  useTransform(update, [update])
}

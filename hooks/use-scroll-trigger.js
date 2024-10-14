'use client'

import { useWindowSize } from '@darkroom.engineering/hamo'
import { useTransform } from 'hooks/use-transform'
import { useLenis } from 'lenis/react'
import { clamp, mapRange } from 'libs/maths'
import { useMinimap } from 'libs/orchestra/minimap'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useLazyState } from './use-lazy-state'

// @refresh reset

function useMarker({
  text = 'start',
  color = 'green',
  type = 'start',
  fixed = false,
  visible = false,
  id = '',
} = {}) {
  const elementRef = useRef()

  const setElementRef = useMinimap({
    color,
  })

  useLayoutEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

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
    `
    element.appendChild(innerElement)

    innerElement.innerText = (fixed ? 'viewport ' : id + ' ') + text

    // setElementRef?.(element)
    elementRef.current = element
    element.style.pointerEvents = 'none'
    document.documentElement.appendChild(elementRef.current)

    return () => {
      // setElementRef?.(null)
      elementRef.current.remove()
    }
  }, [color, text, fixed, id, visible, type, setElementRef])

  const top = useCallback(
    (value) => {
      if (!elementRef.current) return
      elementRef.current.style.top = `${value}px`

      if (!fixed) return

      if (value <= 0) {
        elementRef.current.style.transform = 'translateY(0%)'
        elementRef.current.style.borderBottom = 'none'
        elementRef.current.style.borderTop = `1px solid ${color}`

        elementRef.current.children[0].style.top = 0
      } else if (value >= window.innerHeight) {
        elementRef.current.style.transform = 'translateY(-100%)'
        elementRef.current.style.borderBottom = `1px solid ${color}`
        elementRef.current.style.borderTop = 'none'

        elementRef.current.children[0].style.bottom = 0
      }
    },
    [color, fixed],
  )

  return { top }
}

function isNumber(value) {
  return typeof value === 'number' || !isNaN(value)
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
  },
  deps = [],
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getTransform = useTransform()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lenis = useLenis()

  const elementMarkerStart = useMarker({
    id,
    text: 'start',
    color: 'green',
    type: 'start',
    visible: markers,
  })
  const elementMarkerEnd = useMarker({
    id,
    text: 'end',
    color: 'red',
    type: 'end',
    visible: markers,
  })

  const viewportMarkerStart = useMarker({
    id,
    text: 'start',
    color: 'green',
    type: 'end',
    fixed: true,
    visible: markers,
  })
  const viewportMarkerEnd = useMarker({
    id,
    text: 'end',
    color: 'red',
    type: 'start',
    fixed: true,
    visible: markers,
  })

  const { height: windowHeight } = useWindowSize()

  const [elementStartKeyword, viewportStartKeyword] = start.split(' ')
  const [elementEndKeyword, viewportEndKeyword] = end.split(' ')

  let viewportStart = isNumber(viewportStartKeyword)
    ? parseFloat(viewportStartKeyword)
    : windowHeight
  if (viewportStartKeyword === 'top') viewportStart = 0
  if (viewportStartKeyword === 'center') viewportStart = windowHeight * 0.5
  if (viewportStartKeyword === 'bottom') viewportStart = windowHeight

  let viewportEnd = isNumber(viewportEndKeyword)
    ? parseFloat(viewportEndKeyword)
    : 0
  if (viewportEndKeyword === 'top') viewportEnd = 0
  if (viewportEndKeyword === 'center') viewportEnd = windowHeight * 0.5
  if (viewportEndKeyword === 'bottom') viewportEnd = windowHeight

  let elementStart = isNumber(elementStartKeyword)
    ? parseFloat(elementStartKeyword)
    : rect?.bottom
  if (elementStartKeyword === 'top') elementStart = rect?.top
  if (elementStartKeyword === 'center')
    elementStart = rect?.top + rect?.height * 0.5
  if (elementStartKeyword === 'bottom') elementStart = rect?.bottom

  elementStart += offset

  let elementEnd = isNumber(elementEndKeyword)
    ? parseFloat(elementEndKeyword)
    : rect?.top
  if (elementEndKeyword === 'top') elementEnd = rect?.top
  if (elementEndKeyword === 'center')
    elementEnd = rect?.top + rect?.height * 0.5
  if (elementEndKeyword === 'bottom') elementEnd = rect?.bottom

  elementEnd += offset

  const startValue = elementStart - viewportStart
  const endValue = elementEnd - viewportEnd

  // eslint-disable-next-line no-unused-vars
  const [getProgress, setProgress] = useLazyState(
    undefined,
    (progress, lastProgress) => {
      if (isNaN(progress)) return

      if (
        (progress >= 0 && lastProgress < 0) ||
        (progress <= 1 && lastProgress > 1)
      ) {
        onEnter?.()
      }

      if (
        (progress < 0 && lastProgress >= 0) ||
        (progress > 1 && lastProgress <= 1)
      ) {
        onLeave?.()
      }

      if (clamp(0, progress, 1) === clamp(0, lastProgress, 1)) return

      onProgress?.({
        height: endValue - startValue,
        isActive: progress >= 0 && progress <= 1,
        progress: clamp(0, progress, 1),
        steps: Array.from({ length: steps }).map((_, i) =>
          clamp(0, mapRange(i / steps, (i + 1) / steps, progress, 0, 1), 1),
        ),
      })
    },
    [steps, startValue, endValue],
  )

  const update = useCallback(
    () => {
      if (disabled) return

      let scroll

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

      let progress = mapRange(startValue, endValue, scroll - translate.y, 0, 1)

      setProgress(progress)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lenis, rect, getTransform, startValue, endValue, disabled, steps, ...deps],
  )

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

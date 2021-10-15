import { useStore } from 'lib/store'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDebounce, useMeasure, useWindowSize } from 'react-use'

class Viewport {
  constructor() {
    this.width = undefined
    this.height = undefined

    this.onResize()
    window.addEventListener('resize', this.onResize)
  }

  onResize = () => {
    this.width = window.innerWidth
    this.height = window.innerHeight
  }
}

export function offsetTop(element, accumulator = 0) {
  const top = accumulator + element.offsetTop
  if (element.offsetParent) {
    return offsetTop(element.offsetParent, top)
  }
  return top
}

export function offsetLeft(element, accumulator = 0) {
  const left = accumulator + element.offsetLeft
  if (element.offsetParent) {
    return offsetLeft(element.offsetParent, left)
  }
  return left
}

export const useRect = () => {
  const ref = useRef()
  const [refMeasure, { width, height }] = useMeasure()
  const [bodyRef, { height: bodyHeight }] = useMeasure()
  const { width: windowWidth, height: windowHeight } = useWindowSize()
  const [offsets, setOffsets] = useState({ top: undefined, left: undefined })
  const rect = useRef({})
  const windowSize = useRef({})

  const compute = () => {
    const scrollY = useStore.getState().scroll?.scroll?.y || 0

    const { top, left, width, height } = rect.current
    const { width: windowWidth, height: windowHeight } = windowSize.current

    if (!top || !left || !width || !height) {
      return
    }

    const _rect = {
      top: top - scrollY,
      left: left,
      height: height,
      width: width,
      bottom: windowHeight - (top - scrollY + height),
      right: windowWidth - (left + width),
    }

    const inView =
      _rect.top + _rect.height > 0 && _rect.bottom + _rect.height > 0

    return { ..._rect, inView }
  }

  const resize = () => {
    setOffsets({
      top: offsetTop(ref.current),
      left: offsetLeft(ref.current),
    })
  }

  useEffect(() => {
    bodyRef(document.body)
    refMeasure(ref.current)
  }, [])

  useDebounce(
    () => {
      resize()
    },
    1000,
    [bodyHeight]
  )

  useEffect(() => {
    rect.current = { top: offsets.top, left: offsets.left, width, height }
  }, [offsets, width, height])

  useDebounce(
    () => {
      windowSize.current = { width: windowWidth, height: windowHeight }
    },
    1000,
    [windowWidth, windowHeight]
  )

  return [ref, compute]
}

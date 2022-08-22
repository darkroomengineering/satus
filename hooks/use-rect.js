import { useLayoutEffect } from '@studio-freight/hamo'
import { useRef, useState } from 'react'
import { throttle } from 'throttle-debounce'

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

export function useRect({ debounce = 1000 } = {}) {
  const element = useRef()

  const [rect, setRect] = useState({
    top: undefined,
    left: undefined,
    width: undefined,
    height: undefined,
  })

  const resize = () => {
    if (element.current) {
      setRect((prev) => ({
        ...prev,
        top: offsetTop(element.current),
        left: offsetLeft(element.current),
      }))
    }
  }

  // resize if body height changes
  useLayoutEffect(() => {
    const callback = throttle(debounce, resize)
    const resizeObserver = new ResizeObserver(callback)
    resizeObserver.observe(document.body)

    return () => {
      resizeObserver.disconnect()
      callback.cancel({ upcomingOnly: true })
    }
  }, [debounce])

  const onResizeObserver = ([entry]) => {
    const { width, height } = entry.contentRect

    setRect((prev) => ({
      ...prev,
      width,
      height,
    }))
  }

  const resizeObserver = useRef()

  const setRef = (node) => {
    if (!node || node === element.current) return

    resizeObserver.current?.disconnect()
    resizeObserver.current = new ResizeObserver(onResizeObserver)

    resizeObserver.current.observe(node)

    element.current = node
  }

  const getRect = (x = 0, y = 0) => {
    return rect
  }

  return [setRef, rect, getRect]
}

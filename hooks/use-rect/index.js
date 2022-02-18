// import { useStore } from 'lib/store'
// import { useEffect, useRef, useState } from 'react'
import { debounce as _debounce } from 'debounce'
import { useLayoutEffect, useRef, useState } from 'react'
import { useMeasure, useWindowSize } from 'react-use'

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

function _useRect(debounce = 1000) {
  const ref = useRef()
  const [refMeasure, { width, height }] = useMeasure()
  const { width: windowWidth, height: windowHeight } = useWindowSize()
  const [left, setLeft] = useState()
  const [top, setTop] = useState()

  // resize if body height changes
  useLayoutEffect(() => {
    const callback = _debounce(resize, debounce)
    const resizeObserver = new ResizeObserver(callback)
    resizeObserver.observe(document.body)

    return () => {
      resizeObserver.disconnect()
      callback.flush()
    }
  }, [debounce])

  const resize = () => {
    if (ref.current) {
      setTop(offsetTop(ref.current))
      setLeft(offsetLeft(ref.current))
    }
  }

  const compute = (scrollY = 0) => {
    const rect = {
      top: top - scrollY,
      left: left,
      height: height,
      width: width,
      bottom: windowHeight - (top - scrollY + height),
      right: windowWidth - (left + width),
    }
    const inView = rect.top + rect.height > 0 && rect.bottom + rect.height > 0

    return { ...rect, inView }
  }

  const setRef = (node) => {
    ref.current = node
    refMeasure(node)
    resize()
  }

  return [setRef, compute]
}

export const useRect =
  typeof window !== 'undefined' ? _useRect : () => [() => {}, undefined]

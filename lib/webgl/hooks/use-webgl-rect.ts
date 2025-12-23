import { useThree } from '@react-three/fiber'
import type { Rect } from 'hamo'
import { useLenis } from 'lenis/react'
import { useCallback, useEffect, useRef } from 'react'
import { Euler, Vector3 } from 'three'
import { useTransform } from '~/hooks/use-transform'

interface WebGLTransform {
  position: Vector3
  rotation: Euler
  scale: Vector3
  isVisible: boolean
}

export function useWebGLRect(
  rect: Rect,
  onUpdate?: (transform: WebGLTransform) => void
) {
  const size = useThree((state) => state.size)

  const transformRef = useRef<WebGLTransform>({
    position: new Vector3(0, 0, 0),
    rotation: new Euler(0, 0, 0),
    scale: new Vector3(1, 1, 1),
    isVisible: true,
  })

  const lenis = useLenis()
  const getTransform = useTransform()

  const update = useCallback(() => {
    const { translate, scale } = getTransform()

    let scroll: number

    if (lenis) {
      scroll = Math.floor(lenis?.scroll)
    } else {
      scroll = window.scrollY
    }

    const transform = transformRef.current

    if (
      rect.top === undefined ||
      rect.height === undefined ||
      rect.left === undefined ||
      rect.width === undefined
    ) {
      console.warn('useWebGLRect: rect is missing required properties', rect)
      return
    }

    transform.isVisible =
      scroll > rect.top - size.height + translate.y &&
      scroll < rect.top + translate.y + rect.height

    transform.position.x = -size.width / 2 + (rect.left + rect.width / 2)
    transform.position.y =
      size.height / 2 - (rect.top + rect.height / 2) + scroll - translate.y
    transform.scale.x = rect.width * scale.x
    transform.scale.y = rect.height * scale.y

    onUpdate?.(transformRef.current)
  }, [lenis, getTransform, size, rect, onUpdate])

  useTransform(update, [update])
  useLenis(update, [update])

  useEffect(() => {
    if (lenis) return

    update()
    window.addEventListener('scroll', update, false)

    return () => {
      window.removeEventListener('scroll', update, false)
    }
  }, [lenis, update])

  const get = useCallback(() => transformRef.current, [])

  return get
}

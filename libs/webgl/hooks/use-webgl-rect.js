import { useThree } from '@react-three/fiber'
import { useTransform } from 'hooks/use-transform'
import { useLenis } from 'libs/lenis'
import { useCallback, useEffect, useRef } from 'react'
import { Euler, Vector3 } from 'three'

export function useWebGLRect(rect, onUpdate) {
  const size = useThree(({ size }) => size)

  const transformRef = useRef({
    position: new Vector3(0, 0, 0),
    rotation: new Euler(0, 0, 0),
    scale: new Vector3(1, 1, 1),
    isVisible: true,
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lenis = useLenis()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getTransform = useTransform()

  const update = useCallback(() => {
    const { translate, scale } = getTransform()

    let scroll

    if (lenis) {
      scroll = Math.floor(lenis?.scroll)
    } else {
      scroll = window.scrollY
    }

    const transform = transformRef.current

    transform.isVisible =
      scroll > rect.top - size.height + translate.y &&
      scroll < rect.top + translate.y + rect.height

    transform.position.x = -size.width / 2 + (rect.left + rect.width / 2)
    transform.position.y =
      size.height / 2 - (rect.top + rect.height / 2) + scroll - translate.y
    transform.scale.x = rect.width * scale.x
    transform.scale.y = rect.height * scale.y

    onUpdate?.(transformRef.current)
  }, [lenis, getTransform, size, rect])

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

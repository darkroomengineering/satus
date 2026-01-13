import { useThree } from '@react-three/fiber'
import type { Rect } from 'hamo'
import { useLenis } from 'lenis/react'
import { useCallback, useEffect, useEffectEvent, useRef } from 'react'
import { Euler, Vector3 } from 'three'
import { useTransform } from '@/hooks/use-transform'

interface WebGLTransform {
  position: Vector3
  rotation: Euler
  scale: Vector3
  isVisible: boolean
}

interface UseWebGLRectOptions {
  /** Whether the element is visible in the viewport. When false, skips computations. */
  visible?: boolean
}

/**
 * Hook for positioning WebGL meshes based on DOM element rects.
 *
 * Uses useEffectEvent for stable callback references that always
 * access latest values without causing effect re-runs.
 *
 * Pass `visible: false` to skip position computations when the element
 * is off-screen, improving performance for many WebGL elements.
 *
 * @example
 * ```tsx
 * function WebGLElement({ rect, visible }: { rect: Rect; visible: boolean }) {
 *   const meshRef = useRef<Mesh>(null)
 *
 *   useWebGLRect(rect, ({ position, scale }) => {
 *     meshRef.current?.position.copy(position)
 *     meshRef.current?.scale.copy(scale)
 *   }, { visible })
 *
 *   // Skip rendering entirely when off-screen
 *   if (!visible) return null
 *
 *   return <mesh ref={meshRef}>...</mesh>
 * }
 * ```
 */
export function useWebGLRect(
  rect: Rect,
  onUpdate?: (transform: WebGLTransform) => void,
  options: UseWebGLRectOptions = {}
) {
  const { visible = true } = options

  const size = useThree((state) => state.size)
  const lenis = useLenis()
  const getTransform = useTransform()

  const transformRef = useRef<WebGLTransform>({
    position: new Vector3(0, 0, 0),
    rotation: new Euler(0, 0, 0),
    scale: new Vector3(1, 1, 1),
    isVisible: true,
  })

  // useEffectEvent: callback always has access to latest values
  // without being a dependency that triggers re-subscriptions
  const handleUpdate = useEffectEvent(() => {
    // Skip computations when not visible
    if (!visible) return

    const { translate, scale } = getTransform()
    const scroll = lenis ? Math.floor(lenis.scroll) : window.scrollY
    const transform = transformRef.current

    if (
      rect.top === undefined ||
      rect.height === undefined ||
      rect.left === undefined ||
      rect.width === undefined
    ) {
      // Expected during initial render before DOM measurement completes
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
  })

  // Subscribe to transform changes - handleUpdate is stable from useEffectEvent
  useTransform(handleUpdate, [])

  // Subscribe to lenis scroll - handleUpdate is stable from useEffectEvent
  useLenis(handleUpdate, [])

  // Fallback for non-lenis scroll
  useEffect(() => {
    if (lenis) return

    handleUpdate()
    window.addEventListener('scroll', handleUpdate, false)

    return () => {
      window.removeEventListener('scroll', handleUpdate, false)
    }
  }, [lenis]) // handleUpdate is stable from useEffectEvent

  const get = useCallback(() => transformRef.current, [])

  return get
}

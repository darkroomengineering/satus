'use client'

import {
  createContext,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
} from 'react'

const DEFAULT_TRANSFORM = {
  translate: {
    x: 0,
    y: 0,
    z: 0,
  },
  rotate: {
    x: 0,
    y: 0,
    z: 0,
  },
  scale: {
    x: 1,
    y: 1,
    z: 1,
  },
  clip: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  userData: {} as Record<string | number, unknown>,
}

type Transform = typeof DEFAULT_TRANSFORM
type TransformCallback = (transform: Transform) => void
type TransformRef = {
  setTranslate: (x?: number, y?: number, z?: number) => void
  setRotate: (x?: number, y?: number, z?: number) => void
  setScale: (x?: number, y?: number, z?: number) => void
  setClip: ({
    top,
    right,
    bottom,
    left,
  }: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }) => void
}

type TransformContextType = {
  getTransform: () => Transform
  addCallback: (callback: TransformCallback) => void
  removeCallback: (callback: TransformCallback) => void
  setTranslate: (x?: number, y?: number, z?: number) => void
  setRotate: (x?: number, y?: number, z?: number) => void
  setScale: (x?: number, y?: number, z?: number) => void
  setClip: (params?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }) => void
  setUserData: (key: string | number, value: unknown) => void
}

export const TransformContext = createContext<TransformContextType>({
  getTransform: () => structuredClone(DEFAULT_TRANSFORM),
  addCallback: () => {
    // Default no-op implementation
  },
  removeCallback: () => {
    // Default no-op implementation
  },
  setTranslate: () => {
    // Default no-op implementation
  },
  setRotate: () => {
    // Default no-op implementation
  },
  setScale: () => {
    // Default no-op implementation
  },
  setClip: () => {
    // Default no-op implementation
  },
  setUserData: () => {
    // Default no-op implementation
  },
})

type TransformProviderProps = {
  children: ReactNode
  ref?: Ref<TransformRef>
}

/**
 * Provider component for managing element transforms.
 *
 * Provides a context for managing translation, rotation, scale, and clip transforms
 * that can be inherited by child components. Useful for complex WebGL scenes
 * and coordinated animations.
 *
 * @param props - Component props
 * @param props.children - Child components
 * @param props.ref - Optional ref to control transforms programmatically
 *
 * @example
 * ```tsx
 * import { TransformProvider } from '@/hooks/use-transform'
 *
 * function Scene() {
 *   return (
 *     <TransformProvider>
 *       <div>My transformed content</div>
 *     </TransformProvider>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Control transforms programmatically
 * function AnimatedScene() {
 *   const transformRef = useRef<TransformRef>(null)
 *
 *   useEffect(() => {
 *     transformRef.current?.setTranslate(100, 50, 0)
 *     transformRef.current?.setScale(1.2, 1.2, 1)
 *   }, [])
 *
 *   return (
 *     <TransformProvider ref={transformRef}>
 *       <div>Animated content</div>
 *     </TransformProvider>
 *   )
 * }
 * ```
 */
export function TransformProvider({ children, ref }: TransformProviderProps) {
  const parentTransformRef = useRef(structuredClone(DEFAULT_TRANSFORM))
  const transformRef = useRef(structuredClone(DEFAULT_TRANSFORM))

  const getTransform = useCallback<() => Transform>(() => {
    const transform = structuredClone(parentTransformRef.current)

    transform.translate.x += transformRef.current.translate.x
    transform.translate.y += transformRef.current.translate.y
    transform.translate.z += transformRef.current.translate.z

    transform.rotate.x += transformRef.current.rotate.x
    transform.rotate.y += transformRef.current.rotate.y
    transform.rotate.z += transformRef.current.rotate.z

    transform.scale.x *= transformRef.current.scale.x
    transform.scale.y *= transformRef.current.scale.y
    transform.scale.z *= transformRef.current.scale.z

    transform.userData = {
      ...transformRef.current.userData,
      ...transform.userData,
    }

    return transform
  }, [])

  const callbacksRefs = useRef<TransformCallback[]>([])

  const addCallback = useCallback((callback: TransformCallback) => {
    callbacksRefs.current.push(callback)
  }, [])

  const removeCallback = useCallback((callback: TransformCallback) => {
    callbacksRefs.current = callbacksRefs.current.filter(
      (ref) => ref !== callback
    )
  }, [])

  const update = useEffectEvent(() => {
    for (const callback of callbacksRefs.current) {
      callback(getTransform())
    }
  })

  const setTranslate = useCallback((x = 0, y = 0, z = 0) => {
    if (!Number.isNaN(x)) transformRef.current.translate.x = Number(x)
    if (!Number.isNaN(y)) transformRef.current.translate.y = Number(y)
    if (!Number.isNaN(z)) transformRef.current.translate.z = Number(z)

    update()
  }, [])

  const setRotate = useCallback((x = 0, y = 0, z = 0) => {
    if (!Number.isNaN(x)) transformRef.current.rotate.x = Number(x)
    if (!Number.isNaN(y)) transformRef.current.rotate.y = Number(y)
    if (!Number.isNaN(z)) transformRef.current.rotate.z = Number(z)

    update()
  }, [])

  const setScale = useCallback((x = 1, y = 1, z = 1) => {
    if (!Number.isNaN(x)) transformRef.current.scale.x = Number(x)
    if (!Number.isNaN(y)) transformRef.current.scale.y = Number(y)
    if (!Number.isNaN(z)) transformRef.current.scale.z = Number(z)

    update()
  }, [])

  const setClip = useCallback(
    ({ top = 0, right = 0, bottom = 0, left = 0 } = {}) => {
      if (!Number.isNaN(top)) transformRef.current.clip.top = Number(top)
      if (!Number.isNaN(right)) transformRef.current.clip.right = Number(right)
      if (!Number.isNaN(bottom))
        transformRef.current.clip.bottom = Number(bottom)
      if (!Number.isNaN(left)) transformRef.current.clip.left = Number(left)

      update()
    },
    []
  )

  const setUserData = useCallback((key: string | number, value: unknown) => {
    transformRef.current.userData[key] = value
    update()
  }, [])

  useTransform((transform) => {
    parentTransformRef.current = structuredClone(transform)
    update()
  })

  useImperativeHandle(ref, () => ({
    setTranslate,
    setRotate,
    setScale,
    setClip,
    setUserData,
  }))

  return (
    <TransformContext
      value={{
        getTransform,
        addCallback,
        removeCallback,
        setTranslate,
        setRotate,
        setScale,
        setClip,
        setUserData,
      }}
    >
      {children}
    </TransformContext>
  )
}

/**
 * Hook for accessing and responding to transform changes.
 *
 * Use this hook to get the current transform state or register a callback
 * that runs whenever transforms change in the TransformProvider hierarchy.
 *
 * @param callback - Optional callback fired when transforms change
 * @param deps - Dependencies for the callback effect
 * @returns Function to get current transform state
 *
 * @example
 * ```tsx
 * import { useTransform } from '@/hooks/use-transform'
 *
 * function AnimatedElement() {
 *   useTransform((transform) => {
 *     console.log('New transform:', transform.translate)
 *     // Apply transforms to DOM or WebGL
 *     element.style.transform = `
 *       translate3d(${transform.translate.x}px, ${transform.translate.y}px, ${transform.translate.z}px)
 *       rotateX(${transform.rotate.x}deg)
 *       scale3d(${transform.scale.x}, ${transform.scale.y}, ${transform.scale.z})
 *     `
 *   })
 *
 *   return <div>Animated element</div>
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Get current transform without callback
 * function CurrentTransform() {
 *   const getTransform = useTransform()
 *
 *   const handleClick = () => {
 *     const current = getTransform()
 *     console.log('Current position:', current.translate)
 *   }
 *
 *   return <button onClick={handleClick}>Log Transform</button>
 * }
 * ```
 */
export function useTransform(
  callback?: TransformCallback,
  deps = [] as unknown[]
) {
  const { getTransform, addCallback, removeCallback } =
    useContext(TransformContext)

  useEffect(() => {
    if (!callback) return

    addCallback(callback)
    return () => {
      removeCallback(callback)
    }
  }, [callback, addCallback, removeCallback, ...deps])

  return getTransform
}

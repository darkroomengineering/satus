import {
  type ReactNode,
  type Ref,
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  userData: {},
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

export const TransformContext = createContext({
  getTransform: () => structuredClone(DEFAULT_TRANSFORM),
  addCallback: (() => {}) as (callback: TransformCallback) => void,
  removeCallback: (() => {}) as (callback: TransformCallback) => void,
})

// TODO: batch updates
// TODO: update only when needed (if values have changed)

type TransformProviderProps = {
  children: ReactNode
  ref?: Ref<TransformRef>
}

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

    transform.userData = { ...transformRef.current.userData }

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

  const update = useCallback(() => {
    for (const callback of callbacksRefs.current) {
      callback(getTransform())
    }
  }, [getTransform])

  const setTranslate = useCallback(
    (x = 0, y = 0, z = 0) => {
      if (!Number.isNaN(x)) transformRef.current.translate.x = Number(x)
      if (!Number.isNaN(y)) transformRef.current.translate.y = Number(y)
      if (!Number.isNaN(z)) transformRef.current.translate.z = Number(z)

      update()
    },
    [update]
  )

  const setRotate = useCallback(
    (x = 0, y = 0, z = 0) => {
      if (!Number.isNaN(x)) transformRef.current.rotate.x = Number(x)
      if (!Number.isNaN(y)) transformRef.current.rotate.y = Number(y)
      if (!Number.isNaN(z)) transformRef.current.rotate.z = Number(z)

      update()
    },
    [update]
  )

  const setScale = useCallback(
    (x = 1, y = 1, z = 1) => {
      if (!Number.isNaN(x)) transformRef.current.scale.x = Number(x)
      if (!Number.isNaN(y)) transformRef.current.scale.y = Number(y)
      if (!Number.isNaN(z)) transformRef.current.scale.z = Number(z)

      update()
    },
    [update]
  )

  const setClip = useCallback(
    ({ top = 0, right = 0, bottom = 0, left = 0 } = {}) => {
      if (!Number.isNaN(top)) transformRef.current.clip.top = Number(top)
      if (!Number.isNaN(right)) transformRef.current.clip.right = Number(right)
      if (!Number.isNaN(bottom))
        transformRef.current.clip.bottom = Number(bottom)
      if (!Number.isNaN(left)) transformRef.current.clip.left = Number(left)

      update()
    },
    [update]
  )

  const setUserData = useCallback(
    (key, value) => {
      transformRef.current.userData[key] = value
      update()
    },
    [update],
  )

  useTransform(
    (transform) => {
      parentTransformRef.current = structuredClone(transform)
      update()
    },
    [update]
  )

  useImperativeHandle(ref, () => ({
    setTranslate,
    setRotate,
    setScale,
    setClip,
    setUserData,
  }))

  return (
    <TransformContext.Provider
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
    </TransformContext.Provider>
  )
}

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

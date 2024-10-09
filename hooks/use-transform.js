import {
  createContext,
  forwardRef,
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
}

export const TransformContext = createContext({
  getTransform: () => structuredClone(DEFAULT_TRANSFORM),
  addCallback: () => {},
  removeCallback: () => {},
})

// TODO: batch updates
// TODO: update only when needed (if values have changed)

export const TransformProvider = forwardRef(function TransformProvider(
  { children },
  ref
) {
  const parentTransformRef = useRef(structuredClone(DEFAULT_TRANSFORM))
  const transformRef = useRef(structuredClone(DEFAULT_TRANSFORM))

  const getTransform = useCallback(() => {
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

    return transform
  }, [])

  const callbacksRefs = useRef([])

  const addCallback = useCallback((callback) => {
    callbacksRefs.current.push(callback)
  }, [])

  const removeCallback = useCallback((callback) => {
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
      if (!Number.isNaN(x))
        transformRef.current.translate.x = Number.parseFloat(x)
      if (!Number.isNaN(y))
        transformRef.current.translate.y = Number.parseFloat(y)
      if (!Number.isNaN(z))
        transformRef.current.translate.z = Number.parseFloat(z)

      update()
    },
    [update]
  )

  const setRotate = useCallback(
    (x = 0, y = 0, z = 0) => {
      if (!Number.isNaN(x)) transformRef.current.rotate.x = Number.parseFloat(x)
      if (!Number.isNaN(y)) transformRef.current.rotate.y = Number.parseFloat(y)
      if (!Number.isNaN(z)) transformRef.current.rotate.z = Number.parseFloat(z)

      update()
    },
    [update]
  )

  const setScale = useCallback(
    (x = 1, y = 1, z = 1) => {
      if (!Number.isNaN(x)) transformRef.current.scale.x = Number.parseFloat(x)
      if (!Number.isNaN(y)) transformRef.current.scale.y = Number.parseFloat(y)
      if (!Number.isNaN(z)) transformRef.current.scale.z = Number.parseFloat(z)

      update()
    },
    [update]
  )

  const setClip = useCallback(
    ({ top = 0, right = 0, bottom = 0, left = 0 } = {}) => {
      if (!Number.isNaN(top))
        transformRef.current.clip.top = Number.parseFloat(top)
      if (!Number.isNaN(right))
        transformRef.current.clip.right = Number.parseFloat(right)
      if (!Number.isNaN(bottom))
        transformRef.current.clip.bottom = Number.parseFloat(bottom)
      if (!Number.isNaN(left))
        transformRef.current.clip.left = Number.parseFloat(left)

      update()
    },
    [update]
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
  }))

  return (
    <TransformContext.Provider
      value={{ getTransform, addCallback, removeCallback }}
    >
      {children}
    </TransformContext.Provider>
  )
})

export function useTransform(callback, deps = []) {
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

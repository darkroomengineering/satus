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
  ref,
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
      (ref) => ref !== callback,
    )
  }, [])

  const update = useCallback(() => {
    callbacksRefs.current.forEach((callback) => callback(getTransform()))
  }, [getTransform])

  const setTranslate = useCallback(
    (x = 0, y = 0, z = 0) => {
      if (!isNaN(x)) transformRef.current.translate.x = parseFloat(x)
      if (!isNaN(y)) transformRef.current.translate.y = parseFloat(y)
      if (!isNaN(z)) transformRef.current.translate.z = parseFloat(z)

      update()
    },
    [update],
  )

  const setRotate = useCallback(
    (x = 0, y = 0, z = 0) => {
      if (!isNaN(x)) transformRef.current.rotate.x = parseFloat(x)
      if (!isNaN(y)) transformRef.current.rotate.y = parseFloat(y)
      if (!isNaN(z)) transformRef.current.rotate.z = parseFloat(z)

      update()
    },
    [update],
  )

  const setScale = useCallback(
    (x = 1, y = 1, z = 1) => {
      if (!isNaN(x)) transformRef.current.scale.x = parseFloat(x)
      if (!isNaN(y)) transformRef.current.scale.y = parseFloat(y)
      if (!isNaN(z)) transformRef.current.scale.z = parseFloat(z)

      update()
    },
    [update],
  )

  const setClip = useCallback(
    ({ top = 0, right = 0, bottom = 0, left = 0 } = {}) => {
      if (!isNaN(top)) transformRef.current.clip.top = parseFloat(top)
      if (!isNaN(right)) transformRef.current.clip.right = parseFloat(right)
      if (!isNaN(bottom)) transformRef.current.clip.bottom = parseFloat(bottom)
      if (!isNaN(left)) transformRef.current.clip.left = parseFloat(left)

      update()
    },
    [update],
  )

  useTransform(
    (transform) => {
      parentTransformRef.current = structuredClone(transform)
      update()

      // if (debug) {
      //   console.log(parentTransformRef.current.translate)
      // }
    },
    [update],
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
  }, [addCallback, removeCallback, ...deps])

  return getTransform
}

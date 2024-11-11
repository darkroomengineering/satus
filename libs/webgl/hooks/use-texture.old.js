import { useEffect, useRef, useState } from 'react'
import { DefaultLoadingManager, Texture, TextureLoader } from 'three'

const loader = new TextureLoader()

export function useTexture(src, callback) {
  const gl = useThree((state) => state.gl)

  const isArray = Array.isArray(src)

  const [texture, setTexture] = useState<
    ([] | undefined) | (Texture[] | Texture)
  >(isArray ? [] : undefined)
  const textureRefs = useRef<Texture[]>([])

  // biome-ignore lint/correctness/useExhaustiveDependencies: this is fine
  useEffect(() => {
    if (!src) {
      setTexture(undefined)
      return
    }

    const srcs = [src].flat()

    srcs.forEach((src, i) => {
      DefaultLoadingManager.itemStart(src)

      loader.load(src, (texture) => {
        if (isArray) {
          textureRefs.current[i] = texture
          const length = textureRefs.current.filter((v) => v.isTexture).length
          if (length === srcs.length) {
            setTexture(textureRefs.current)
            // @ts-expect-error - no time to type this usage works
            callback?.(textureRefs.current)
          }
        } else {
          setTexture(texture)
          // @ts-expect-error - no time to type this usage works
          callback?.(texture)
        }

        DefaultLoadingManager.itemEnd(src)

        gl.initTexture(texture)
      })
    })
  }, [JSON.stringify(src), isArray])

  return texture
}

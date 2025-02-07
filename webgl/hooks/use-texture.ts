import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { DefaultLoadingManager, type Texture, TextureLoader } from 'three'

const loader = new TextureLoader()

export function useTexture(
  src: string | string[],
  callback?: (texture: Texture | Texture[]) => void
) {
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

    const srcs = (src ? (Array.isArray(src) ? src : [src]) : []) as string[]

    srcs.forEach((src, i) => {
      DefaultLoadingManager.itemStart(src)

      loader.load(src, (texture) => {
        if (isArray) {
          textureRefs.current[i] = texture
          const length = textureRefs.current.filter((v) => v.isTexture).length
          if (length === srcs.length) {
            setTexture(textureRefs.current)
            callback?.(textureRefs.current)
          }
        } else {
          setTexture(texture)
          callback?.(texture)
        }

        DefaultLoadingManager.itemEnd(src)

        gl.initTexture(texture as any)
      })
    })
  }, [JSON.stringify(src), isArray])

  return texture
}

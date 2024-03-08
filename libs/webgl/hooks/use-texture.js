import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { DefaultLoadingManager, TextureLoader } from 'three'

const loader = new TextureLoader()

export function useTexture(src, callback) {
  const gl = useThree(({ gl }) => gl)

  const isArray = Array.isArray(src)

  const [texture, setTexture] = useState(isArray ? [] : undefined)
  const textureRefs = useRef([])

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
            callback?.(textureRefs.current)
          }
        } else {
          setTexture(texture)
          callback?.(texture)
        }

        DefaultLoadingManager.itemEnd(src)

        gl.initTexture(texture)
      })
    })
  }, [JSON.stringify(src)])

  return texture
}

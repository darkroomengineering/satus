import { useFrame, useLayoutEffect } from '@studio-freight/hamo'
import {
  Mesh,
  Program,
  Renderer,
  Texture,
  Transform,
  Triangle,
  Vec2,
} from 'ogl/src'
import { useMemo, useRef } from 'react'
import { useMeasure } from 'react-use'
import fragment from './fragment.glsl'
import vertex from './vertex.glsl'

class TextureLoader extends Texture {
  load(src) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => (this.image = img)
    img.src = src
    return this
  }
}

export function WebGLDemo() {
  const el = useRef()

  const renderer = useMemo(
    () =>
      new Renderer({
        alpha: true,
        dpr: 0.2 * window.devicePixelRatio,
        premultipliedAlpha: false,
        depth: false,
      }),
    []
  )

  const gl = useMemo(() => renderer.gl, [renderer])

  const canvas = useMemo(() => {
    return gl.canvas
  }, [gl])

  const scene = useMemo(() => new Transform(), [])
  const geometry = useMemo(() => new Triangle(gl), [gl])
  const program = useMemo(() => {
    const program = new Program(gl, {
      uniforms: {
        uTime: {
          value: 0,
        },
        uGradient: {
          value: new TextureLoader(gl).load('/images/gradient.jpg'),
        },
        uResolution: {
          value: new Vec2(0, 0),
        },
      },
      vertex,
      fragment,
      transparent: true,
    })
    gl.enable(gl.BLEND)
    program.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    return program
  }, [])

  const mesh = useMemo(
    () => new Mesh(gl, { geometry, program }),
    [gl, geometry, program]
  )

  function render() {
    renderer.render({ scene: mesh })
  }

  useFrame((time) => {
    program.uniforms.uTime.value = time * 0.0001
    render()
  })

  useLayoutEffect(() => {
    el.current.appendChild(canvas)
    canvas.style =
      'position: absolute; top:0; left:0; height:100%; width: 100%;'

    return () => {
      canvas.remove()
    }
  }, [canvas])

  const [ref, { width, height }] = useMeasure()

  useLayoutEffect(() => {
    canvas.width = width
    canvas.height = height

    program.uniforms.uResolution.value.set(width, height)
    renderer.setSize(width, height)
  }, [width, height, renderer])

  return (
    <div
      ref={(node) => {
        ref(node)
        el.current = node
      }}
      style={{ height: '100%', width: '100%', position: 'relative' }}
    />
  )
}

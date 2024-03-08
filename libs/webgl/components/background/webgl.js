import { useFrame, useThree } from '@react-three/fiber'
import { types } from '@theatre/core'
import { colors, viewports } from 'config/variables'
import { useTransform } from 'hooks/use-transform'
import { useCurrentSheet } from 'libs/theatre'
import { useTheatre } from 'libs/theatre/hooks/use-theatre'
import { useWebGLRect } from 'libs/webgl/hooks/use-webgl-rect'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { BackgroundMaterial } from './material'
import { Shape } from './shape/shape'
import { useBackground } from './use-background'

// @refresh reset

// const AUDIOS_LIST = [
//   '/audios/speech.mp3',
//   '/audios/file_example_MP3_700KB.mp3',
//   '/audios/sample-9s.mp3',
//   '/audios/Kevin MacLeod - Funky Chunk.mp3',
// ]

export function WebGLBackground({
  theatreKey = 'background',
  rect,
  borderRadius = 0,
  backgroundColor = colors['dark-gray'],
  isTransparent = false,
  _ref,
}) {
  const viewport = useThree(({ viewport }) => viewport)

  const [material] = useState(() => new BackgroundMaterial())

  useImperativeHandle(
    _ref,
    () => ({
      material,
    }),
    [material],
  )

  const [isVisible, setIsVisible] = useState(true)
  // const [audioSource, setAudioSource] = useState()
  // const [speed, setSpeed] = useState(0)
  // const [rythm, setRythm] = useState(1)

  const sheet = useCurrentSheet()

  // const [analyser, audio] = useAudioViz(audioSource, 32)

  const [audioFrames, setAudioFrames] = useState([])
  const { audioList } = useBackground()

  // console.log(audioList)

  useTheatre(
    sheet,
    `${theatreKey} / audio`,
    {
      // source: types.stringLiteral(
      //   AUDIOS_LIST[0],
      //   Object.fromEntries(AUDIOS_LIST.map((v) => [v, v])),
      //   {
      //     label: 'Audio source',
      //   },
      // ),
      audio: types.stringLiteral(
        audioList[0]?.name,
        Object.fromEntries(audioList.map(({ name }) => [name, name])),
      ),
      color: types.rgba({ r: 197 / 255, g: 241 / 255, b: 123 / 255, a: 1 }),
      // backgroundColor: types.rgba({
      //   r: 242 / 255,
      //   g: 242 / 255,
      //   b: 242 / 255,
      //   a: 1,
      // }),
      // muted: types.boolean(true),
      visible: types.boolean(true),
    },
    {
      onValuesChange: ({ audio, color, visible }) => {
        audio = audioList.find(({ name }) => name === audio)
        setAudioFrames(audio?.frames ?? [])
        material.color = color.toString().slice(0, 7)
        // console.log(backgroundColor.toString().slice(0, 7))
        // material.backgroundColor = backgroundColor.toString().slice(0, 7)
        // setAudioSource(source)

        setIsVisible(visible)

        // if (muted || !visible) {
        //   analyser.disconnect()
        // } else {
        //   analyser.connect(analyser.context.destination)
        // }
      },
      deps: [material, audioList],
    },
  )

  // useTheatre(
  //   sheet,
  //   `background-${theatreKey} / noise`,
  //   {
  //     amplitude: types.number(1, { range: [0, 10], nudgeMultiplier: 0.1 }),
  //     frequency: types.number(1, { range: [0, 10], nudgeMultiplier: 0.1 }),
  //     speed: types.number(0, { range: [0, 1], nudgeMultiplier: 0.01 }),
  //     rythm: types.number(1, { range: [0, 2], nudgeMultiplier: 0.01 }),
  //   },
  //   {
  //     onValuesChange: ({ amplitude, frequency, speed, rythm }) => {
  //       // material.noiseAmplitude = amplitude
  //       // material.noiseFrequency = frequency
  //       // material.noiseTimeScale = speed
  //       // material.noiseRythmTimeScale = rythm
  //     },
  //     deps: [material, audio],
  //   },
  // )

  useTheatre(
    sheet,
    `${theatreKey} / pixels`,
    {
      speed: types.number(0, { range: [0, 2], nudgeMultiplier: 0.01 }),
      rythm: types.number(1, { range: [0, 2], nudgeMultiplier: 0.01 }),
      shift: types.number(0.25, { range: [0, 2], nudgeMultiplier: 0.01 }),
      segments: types.number(35, { range: [0, 100], nudgeMultiplier: 1 }),
      frequency: types.number(2, { range: [0, 4], nudgeMultiplier: 0.01 }),
      amplitude: types.number(0.5, { range: [0, 2], nudgeMultiplier: 0.01 }),
    },
    {
      onValuesChange: ({
        speed,
        rythm,
        frequency,
        shift,
        segments,
        amplitude,
      }) => {
        material.timeScale = speed
        material.rythmTimeScale = rythm

        material.frequency = frequency
        material.shift = shift
        material.segments = segments
        material.amplitude = amplitude
      },
      deps: [material],
    },
  )

  // useTheatre(
  //   sheet,
  //   `background-${theatreKey} / sin-wave`,
  //   {
  //     amplitude: types.number(0.1, { range: [0, 1], nudgeMultiplier: 0.01 }),
  //     frequency: types.number(7, { range: [0, 10], nudgeMultiplier: 0.1 }),
  //     shift: types.number(0, {
  //       range: [0, Math.PI],
  //       nudgeMultiplier: 0.01,
  //     }),
  //     y: types.number(0.5, { range: [0, 1], nudgeMultiplier: 0.01 }),
  //     fade: types.number(0.1, { range: [0, 1], nudgeMultiplier: 0.01 }),
  //   },
  //   {
  //     onValuesChange: ({ amplitude, frequency, shift, y, fade }) => {
  //       // material.sinusAmplitude = amplitude
  //       // material.sinusFrequency = frequency
  //       // material.sinusShift = shift
  //       // material.sinusY = y
  //       // material.sinusFade = fade
  //     },
  //     deps: [material],
  //   },
  // )

  useFrame((_, deltaTime) => {
    material.uniforms.uTime.value += deltaTime
    // material.uniforms.uTime.value += deltaTime * 0.1
  })

  useEffect(() => {
    material.resolution.set(viewport.width, viewport.height)
    material.uniforms.uAspect.value = viewport.aspect
    material.uniforms.uDpr.value = viewport.dpr
  }, [material, viewport])

  const [shapeMaterial, setShapeMaterial] = useState()
  const [shapeTexture, setShapeTexture] = useState()

  const currentFrame = useRef(0)

  useFrame((_, deltaTime) => {
    currentFrame.current += deltaTime * 60
    const frameIndex = Math.floor(currentFrame.current) % audioFrames.length
    const rythm = audioFrames[frameIndex]

    if (typeof rythm !== 'number') return

    material.uniforms.uTimeRythm.value += rythm * 0.1 // rythm
    // console.log(averageFrequency / 255)
    if (shapeMaterial) {
      shapeMaterial.uniforms.uTimeRythm.value += rythm * 0.1 // rythm
      shapeMaterial.rythm = rythm
    }
    // console.log(audioFrames)
  })

  useEffect(() => {
    const desktopWidth = parseInt(viewports.desktop.width)

    material.borderRadius = (viewport.width / desktopWidth) * borderRadius
  }, [material, borderRadius, viewport])

  useEffect(() => {
    material.backgroundColor = backgroundColor
  }, [material, backgroundColor])

  useEffect(() => {
    material.isTransparent = isTransparent
  }, [material, isTransparent])

  // const texture = useShape()

  useEffect(() => {
    material.uniforms.uTexture.value = shapeTexture
  }, [material, shapeTexture])

  const meshRef = useRef()

  useWebGLRect(rect, ({ position, scale }) => {
    meshRef.current.scale.copy(scale)
    meshRef.current.position.copy(position)

    meshRef.current.updateMatrix()
  })

  useTransform(
    ({ clip }) => {
      material.clip.set(clip.top, clip.bottom)
    },
    [material],
  )

  return (
    <>
      <Shape
        type="noise"
        ref={(node) => {
          setShapeTexture(node?.texture)
          setShapeMaterial(node?.material)
        }}
        theatreKey={`${theatreKey} / shape`}
      />
      <mesh ref={meshRef} visible={isVisible} matrixAutoUpdate={false}>
        <planeGeometry />
        <primitive object={material} />
      </mesh>
    </>
  )
}

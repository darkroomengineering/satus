'use client'

import { useContext, useState } from 'react'
import {
  TransformContext,
  TransformProvider,
  useTransform,
} from '~/hooks/use-transform'

// function TransformDisplay() {
//   const [displayTransform, setDisplayTransform] = useState('')

//   useTransform((t) => {
//     setDisplayTransform(JSON.stringify(t, null, 2))
//   })

//   return (
//     <div className="space-y-2">
//       <h4 className="font-bold">Live Transform Data</h4>
//       <pre className="text-xs bg-secondary/10 p-3 rounded overflow-auto max-h-48 font-mono">
//         {displayTransform}
//       </pre>
//     </div>
//   )
// }

function TransformControls() {
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)

  const { setTranslate } = useContext(TransformContext)

  return (
    <div className="space-y-4">
      <h4 className="font-bold">Transform Controls</h4>

      {/* Translate Controls */}
      <div className="space-y-2">
        <h5 className="font-semibold">Translate</h5>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label htmlFor="translateX" className="text-xs block">
              X
            </label>
            <input
              id="translateX"
              type="range"
              min="-100"
              max="100"
              value={translateX}
              onChange={(e) => {
                const value = Number(e.target.value)
                setTranslateX(value)
                setTranslate(value, translateY)
              }}
              className="w-full"
            />
            <span className="text-xs">{translateX}</span>
          </div>
          <div>
            <label htmlFor="translateY" className="text-xs block">
              Y
            </label>
            <input
              id="translateY"
              type="range"
              min="-100"
              max="100"
              value={translateY}
              onChange={(e) => {
                const value = Number(e.target.value)
                setTranslateY(value)
                setTranslate(translateX, value)
              }}
              className="w-full"
            />
            <span className="text-xs">{translateY}</span>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <button
        type="button"
        onClick={() => {
          setTranslateX(0)
          setTranslateY(0)
          setTranslate(0, 0)
        }}
        className="px-3 py-1 bg-blue text-primary rounded text-sm"
      >
        Reset Transform
      </button>
    </div>
  )
}

function AnimatedElement() {
  const [elementTransform, setElementTransform] = useState(
    'translate(0px, 0px)'
  )

  useTransform((transform) => {
    const { translate } = transform
    setElementTransform(`translate(${translate.x}px, ${translate.y}px)`)
  })

  return (
    <div
      className="dr-w-200 dr-h-200 bg-gradient-to-br from-purple to-pink rounded-lg shadow-lg transition-all duration-300"
      style={{ transform: elementTransform }}
    />
  )
}

function TransformTestContent() {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-green/10 border border-green/20 rounded">
        <p className="text-sm">
          ✓ Transform hooks now use{' '}
          <code className="px-1 bg-secondary/20">useEffectEvent</code>
        </p>
        <p className="text-xs opacity-70 mt-1">
          Callbacks don't trigger unnecessary re-renders
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TransformControls />
        {/* <TransformDisplay /> */}
      </div>

      <div className="space-y-4">
        <h4 className="font-bold">Visual Transform Test</h4>
        <div className="flex items-center space-x-4">
          <span className="text-sm opacity-70">Animated Element:</span>
          <AnimatedElement />
        </div>
        <p className="text-xs opacity-70">
          Use the controls above to move the purple element and watch the
          transform data update in real-time.
        </p>
      </div>

      <div className="text-xs opacity-50 p-4 bg-secondary/5 rounded">
        💡 Check React DevTools Profiler to see how useEffectEvent prevents
        unnecessary re-renders
      </div>
    </div>
  )
}

export function TransformTest() {
  return (
    <TransformProvider>
      <TransformTestContent />
    </TransformProvider>
  )
}

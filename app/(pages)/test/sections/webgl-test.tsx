'use client'

import { Box } from '~/app/(pages)/r3f/(components)/box'
import { AnimatedGradient } from '~/components/animated-gradient'

export function WebGLTest() {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-green/10 border border-green/20 rounded">
        <p className="text-sm">
          ✓ Activity wraps DOM layer (smart architecture!)
        </p>
        <p className="text-xs opacity-70 mt-1">
          Activity controls visibility detection and rect tracking at the DOM
          level. When hidden, updates defer before entering R3F's reconciler.
        </p>
      </div>

      {/* Spacer to test off-screen behavior */}
      <div className="h-[100vh] flex items-center justify-center border border-secondary/10 rounded">
        <p className="text-sm opacity-50">
          ⬇️ Scroll down to activate WebGL scenes below
        </p>
      </div>

      {/* 3D Box */}
      <div className="space-y-4">
        <h4 className="font-bold">3D Box (React Three Fiber)</h4>
        <div className="border border-secondary/20 rounded-lg overflow-hidden">
          <Box className="w-full h-[400px] bg-secondary/5" />
        </div>
        <p className="text-xs opacity-50">
          ✓ DOM layer wrapped with Activity - defers rect tracking when
          off-screen
        </p>
      </div>

      {/* Another spacer */}
      <div className="h-[50vh]" />

      {/* Animated Gradient */}
      <div className="space-y-4">
        <h4 className="font-bold">Animated Gradient (WebGL Shader)</h4>
        <div className="border border-secondary/20 rounded-lg overflow-hidden">
          <AnimatedGradient
            className="w-full h-[300px]"
            colors={['#ff0080', '#7928ca', '#0070f3']}
            speed={0.5}
          />
        </div>
        <p className="text-xs opacity-50">
          ✓ Activity defers visibility & rect updates at DOM level
        </p>
      </div>

      {/* Another spacer */}
      <div className="h-[50vh]" />

      {/* Multiple scenes test */}
      <div className="space-y-4">
        <h4 className="font-bold">Multiple Scenes (Performance Test)</h4>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border border-secondary/20 rounded-lg overflow-hidden"
            >
              <AnimatedGradient
                className="w-full h-[200px]"
                colors={[
                  `hsl(${i * 60}, 70%, 50%)`,
                  `hsl(${i * 60 + 30}, 70%, 50%)`,
                ]}
                speed={0.3 + i * 0.1}
              />
            </div>
          ))}
        </div>
        <p className="text-xs opacity-50">
          ✓ Each scene independently deferred at DOM level when off-screen
        </p>
      </div>

      <div className="text-xs opacity-50 p-4 bg-secondary/5 rounded">
        💡 Activity works by wrapping the DOM container, deferring
        IntersectionObserver and useRect updates before they send props through
        WebGLTunnel into R3F.
      </div>
    </div>
  )
}

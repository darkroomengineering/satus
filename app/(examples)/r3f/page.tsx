import { Wrapper } from '@/components/layout/wrapper'
import { TheatreProjectProvider } from '@/dev/theatre'
import { Box } from './_components/box'
import { GLTFModel } from './_components/gltf-model'
import { PerfMonitorWrapper } from './_components/perf-monitor-wrapper'
import { TexturedPlane } from './_components/textured-plane'

/**
 * R3F Example Page - Three.js Best Practices
 *
 * Demonstrates key patterns from the @/lib/webgl utilities:
 *
 * 1. useDisposable - Automatic resource cleanup (Box component)
 * 2. useTextureCached - Texture loading with caching (TexturedPlane)
 * 3. useGLTFLoader + disposeObject - GLTF loading with proper cleanup (GLTFModel)
 * 4. PerfMonitor - Memory leak detection (dev only)
 *
 * All components use useWebGLElement for visibility-based optimization.
 * When off-screen, expensive computations are skipped.
 */
export default function R3FPage() {
  return (
    <TheatreProjectProvider id="Satus-R3f" config="/config/Satus-R3f.json">
      <Wrapper theme="red" className="font-mono uppercase" webgl>
        {/* PerfMonitor: Tracks memory usage in dev mode */}
        <PerfMonitorWrapper />

        <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
          {/* Section header */}
          <h1 className="text-2xl tracking-wider">WebGL Utilities Demo</h1>

          {/* Demo grid */}
          <div className="flex flex-wrap items-center justify-center gap-8">
            {/* TexturedPlane: useTextureCached demo */}
            <div className="flex flex-col items-center gap-2">
              <TexturedPlane className="size-[200px]" />
              <span className="text-xs opacity-60">
                useTextureCached
                <br />
                (Cached texture loading)
              </span>
            </div>

            {/* Box: useDisposable demo */}
            <div className="flex flex-col items-center gap-2">
              <Box className="size-[200px]" />
              <span className="text-xs opacity-60">
                useDisposable
                <br />
                (Auto resource cleanup)
              </span>
            </div>

            {/* GLTFModel: useGLTFLoader + disposeObject demo */}
            <div className="flex flex-col items-center gap-2">
              <GLTFModel className="size-[200px]" />
              <span className="text-xs opacity-60">
                useGLTFLoader
                <br />
                (Draco + KTX2 support)
              </span>
            </div>
          </div>

          {/* Info footer */}
          <p className="max-w-lg text-center text-xs opacity-40">
            Open DevTools console to see PerfMonitor stats.
            <br />
            Replace placeholder assets in /public/images and /public/models.
          </p>
        </div>
      </Wrapper>
    </TheatreProjectProvider>
  )
}

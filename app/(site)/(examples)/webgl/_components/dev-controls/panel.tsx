'use client'

import { useThree } from '@react-three/fiber'
import { useEffect, useState, useSyncExternalStore } from 'react'

import Orchestra from '@/lib/dev/orchestra'
import { WebGLTunnel } from '@/webgl/components/tunnel'

// The switch writes the `imageMipmaps` key of the Orchestra dev store, which
// `lib/webgl/components/image/webgl.tsx` reads in development.
function subscribeToMipmaps(onChange: () => void) {
  return Orchestra.subscribe((state) => state.imageMipmaps, onChange)
}

function getMipmaps() {
  return Orchestra.getState().imageMipmaps ?? true
}

function setMipmaps(imageMipmaps: boolean) {
  Orchestra.setState({ imageMipmaps })
}

/** Reports the canvas DPR from inside the canvas; re-renders only when r3f changes it, so it never keeps the canvas drawing. */
function DprProbe({ onChange }: { onChange: (dpr: number) => void }) {
  const dpr = useThree((state) => state.viewport.dpr)

  useEffect(() => {
    onChange(dpr)
  }, [dpr, onChange])

  return null
}

export function DevControlsPanel() {
  const mipmaps = useSyncExternalStore(
    subscribeToMipmaps,
    getMipmaps,
    () => true
  )
  const [dpr, setDpr] = useState<number>()

  // The Orchestra store persists: reset on mount, unmount and `pagehide`
  // (React never unmounts on tab close), or mipmaps left off follow every
  // image on every page, in the next session too.
  useEffect(() => {
    const reset = () => {
      setMipmaps(true)
    }
    reset()
    window.addEventListener('pagehide', reset)
    return () => {
      window.removeEventListener('pagehide', reset)
      reset()
    }
  }, [])

  return (
    <div className="fixed right-[8px] bottom-[8px] z-99998 grid gap-[4px] rounded-[8px] bg-secondary p-[8px] font-mono text-[12px] text-primary">
      <WebGLTunnel>
        <DprProbe onChange={setDpr} />
      </WebGLTunnel>
      <button
        type="button"
        aria-pressed={mipmaps}
        onClick={() => {
          setMipmaps(!mipmaps)
        }}
        className="min-h-[44px] rounded-[4px] px-[12px] text-left outline-1 outline-current"
      >
        Mipmaps: {mipmaps ? 'on' : 'off'}
      </button>
      <output data-dev-dpr-readout>
        Canvas DPR: {dpr === undefined ? 'no canvas' : dpr.toFixed(2)} (device{' '}
        {window.devicePixelRatio})
      </output>
    </div>
  )
}

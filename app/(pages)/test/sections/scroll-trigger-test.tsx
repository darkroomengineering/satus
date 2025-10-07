'use client'

import { useRect } from 'hamo'
import { useState } from 'react'
import { useScrollTrigger } from '~/hooks/use-scroll-trigger'

function ScrollItem({ index }: { index: number }) {
  const [setRectRef, rect] = useRect()
  const [progress, setProgress] = useState(0)
  const [isActive, setIsActive] = useState(false)

  useScrollTrigger({
    rect,
    start: 'bottom bottom',
    end: 'top top',
    onProgress: ({ progress: p, isActive: active }) => {
      setProgress(p)
      setIsActive(active)
    },
  })

  return (
    <div
      ref={setRectRef}
      className="min-h-[300px] p-6 border border-current/20 rounded-lg relative overflow-hidden"
    >
      {/* Progress bar */}
      <div
        className="absolute inset-0 bg-blue/10 transition-all"
        style={{ width: `${progress * 100}%` }}
      />

      <div className="relative space-y-2">
        <h4 className="font-bold">Scroll Item {index}</h4>
        <p className="text-sm opacity-70">
          Scroll to see the progress indicator
        </p>
        <div className="text-xs space-y-1 font-mono">
          <div>Progress: {(progress * 100).toFixed(1)}%</div>
          <div>Active: {isActive ? '✓' : '✗'}</div>
        </div>
      </div>
    </div>
  )
}

export function ScrollTriggerTest() {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-green/10 border border-green/20 rounded">
        <p className="text-sm">
          ✓ useScrollTrigger now uses{' '}
          <code className="px-1 bg-secondary/20">useEffectEvent</code>
        </p>
        <p className="text-xs opacity-70 mt-1">
          Callbacks don't trigger effect re-runs anymore
        </p>
      </div>

      <div className="space-y-8">
        {[1, 2, 3, 4].map((i) => (
          <ScrollItem key={i} index={i} />
        ))}
      </div>

      <div className="text-xs opacity-50 p-4 bg-secondary/5 rounded">
        💡 Check React DevTools Profiler to see reduced effect re-runs
      </div>
    </div>
  )
}

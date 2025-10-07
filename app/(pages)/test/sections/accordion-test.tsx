'use client'

import { useEffect, useRef, useState } from 'react'
import * as Accordion from '~/components/accordion'

function HeavyContent({ id }: { id: number }) {
  const [mountCount, setMountCount] = useState(0)
  const countRef = useRef(0)

  // Effect only runs on mount/unmount
  // Uses ref to avoid infinite loop
  useEffect(() => {
    countRef.current += 1
    const currentCount = countRef.current
    setMountCount(currentCount)

    console.log(`[Accordion ${id}] Mounted (count: ${currentCount})`)

    return () => {
      console.log(`[Accordion ${id}] Cleanup`)
    }
  }, [id]) // Only re-run if id changes

  return (
    <div className="p-4 space-y-2 bg-secondary/10 rounded">
      <p className="text-sm">
        This content uses{' '}
        <code className="px-1 bg-secondary/20">useEffect</code> to track
        mount/unmount cycles
      </p>
      <p className="text-xs opacity-70">
        Mount count: <strong>{mountCount}</strong>
      </p>
      <p className="text-xs opacity-50">Check console for mount/cleanup logs</p>
    </div>
  )
}

export function AccordionTest() {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-green/10 border border-green/20 rounded">
        <p className="text-sm">
          ✓ Each accordion body is wrapped with{' '}
          <code className="px-1 bg-secondary/20">Activity</code>
        </p>
        <p className="text-xs opacity-70 mt-1">
          Effects in closed panels are deferred and cleaned up automatically
        </p>
      </div>

      <Accordion.Group>
        {[1, 2, 3].map((id) => (
          <Accordion.Root key={id} className="border border-current/20 rounded">
            <Accordion.Button className="w-full p-4 text-left font-bold hover:bg-black/5 transition-colors">
              Accordion Panel {id}
            </Accordion.Button>
            <Accordion.Body>
              <HeavyContent id={id} />
            </Accordion.Body>
          </Accordion.Root>
        ))}
      </Accordion.Group>

      <div className="text-xs opacity-50 p-4 bg-secondary/5 rounded">
        💡 Open browser console to see mount logs. Toggle panels to test
        behavior.
      </div>
    </div>
  )
}

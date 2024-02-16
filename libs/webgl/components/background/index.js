'use client'

import { useRect } from '@studio-freight/hamo'
import { types } from '@theatre/core'
import { SheetProvider, useSheet } from 'libs/theatre'
import { useTheatre } from 'libs/theatre/hooks/use-theatre'
import { WebGLTunnel } from 'libs/webgl/components/tunnel'
import dynamic from 'next/dynamic'
import { forwardRef, useState } from 'react'

const WebGLBackground = dynamic(
  () => import('./webgl').then(({ WebGLBackground }) => WebGLBackground),
  { ssr: false },
)

export const Background = forwardRef(function Background(
  { className, theatreKey = 'soundmap', ...props },
  ref,
) {
  const [setRectRef, rect] = useRect({
    ignoreTransform: true,
  })

  const sheet = useSheet('soundmap')

  const [count, setCount] = useState(1)

  useTheatre(
    sheet,
    `${theatreKey} / list`,
    {
      count: types.number(1, { range: [1, 10], nudgeMultiplier: 1 }),
    },
    {
      onValuesChange: ({ count }) => {
        setCount(count)
      },
    },
  )

  return (
    <div ref={setRectRef} className={className}>
      <WebGLTunnel>
        <SheetProvider id="soundmap">
          {Array.from({ length: count }).map((_, i) => (
            <WebGLBackground
              key={i}
              rect={rect}
              theatreKey={`${theatreKey} / ${i}`}
              _ref={ref}
              isTransparent={i > 0}
              {...props}
            />
          ))}
        </SheetProvider>
      </WebGLTunnel>
    </div>
  )
})

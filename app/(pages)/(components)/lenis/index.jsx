'use client'

import 'lenis/dist/lenis.css'
import { ReactLenis } from 'lenis/react'
import { useRef } from 'react'
import { useTempus } from 'tempus/react'

export function Lenis({ root, options }) {
  const lenisRef = useRef()

  useTempus((time) => {
    lenisRef.current.lenis.raf(time)
  })

  return (
    <ReactLenis
      ref={lenisRef}
      root={root}
      options={{
        ...options,
        autoRaf: false,
        anchors: true,
        prevent: (node) =>
          node.nodeName === 'VERCEL-LIVE-FEEDBACK' ||
          node.id === 'theatrejs-studio-root',
      }}
    />
  )
}

'use client'

import { useFrame } from '@darkroom.engineering/hamo'
import 'lenis/dist/lenis.css'
import { ReactLenis } from 'lenis/react'
import { useRef } from 'react'

export function Lenis({ root, options }) {
  const lenisRef = useRef()

  useFrame((time) => {
    lenisRef.current.lenis.raf(time)
  }, 0)

  return (
    <ReactLenis
      ref={lenisRef}
      root={root}
      options={{
        ...options,
        autoRaf: false,
        prevent: (node) => {
          return (
            node.nodeName === 'VERCEL-LIVE-FEEDBACK' ||
            node.id === 'theatrejs-studio-root'
          )
        },
      }}
    />
  )
}

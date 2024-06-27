'use client'

import { ReactLenis } from 'libs/lenis'

export function Lenis({ root, options }) {
  return (
    <ReactLenis
      root={root}
      options={{
        ...options,
        prevent: (node) => {
          console.log(node.id)
          return (
            node.nodeName === 'VERCEL-LIVE-FEEDBACK' ||
            node.id === 'theatrejs-studio-root'
          )
        },
      }}
    />
  )
}

'use client'

import { Lenis } from '@studio-freight/react-lenis'

export function LenisProvider({ children }) {
  return (
    <Lenis root>
      <main>{children}</main>
    </Lenis>
  )
}

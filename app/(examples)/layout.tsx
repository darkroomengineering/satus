import type { PropsWithChildren } from 'react'
import { Wrapper } from '@/components/layout/wrapper'

export default function ExamplesLayout({ children }: PropsWithChildren) {
  return (
    <Wrapper theme="dark" lenis={{}}>
      {children}
    </Wrapper>
  )
}

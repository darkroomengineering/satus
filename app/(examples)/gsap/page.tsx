import { Wrapper } from '@/components/layout/wrapper'
import { Link } from '@/components/ui/link'

import { ScopedAnimation } from './_components/scoped-animation'

export const metadata = {
  title: 'GSAP',
  description: 'Scoped GSAP animation with useGSAP',
}

export default function GsapPage() {
  return (
    <Wrapper theme="dark">
      <h1 className="dr-h1">gsap</h1>
      <ScopedAnimation />
      <Link href="/">back home</Link>
    </Wrapper>
  )
}

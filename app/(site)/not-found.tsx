import { Wrapper } from '@/components/layout/wrapper'
import { Link } from '@/components/ui/link'
import { NotFoundView } from '@/components/ui/not-found-view'

import s from '@/components/ui/not-found-view/not-found-view.module.css'

export default function NotFound() {
  return (
    <Wrapper theme="dark">
      <NotFoundView
        homeLink={
          <Link href="/" className={s.cta}>
            Go Home
          </Link>
        }
      />
    </Wrapper>
  )
}

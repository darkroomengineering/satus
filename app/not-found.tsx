import { Wrapper } from '@/components/layout/wrapper'
import { Link } from '@/components/ui/link'
import s from './not-found.module.css'

export default function NotFound() {
  return (
    <Wrapper theme="dark">
      <section className={s.section}>
        <div className={s.panel}>
          <div className={s.label}>Error</div>
          <h1 className={s.code}>404</h1>
          <p className={s.message}>Page not found</p>
          <p className={s.description}>
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <Link href="/" className={s.cta}>
            Go Home
          </Link>
        </div>
      </section>
    </Wrapper>
  )
}

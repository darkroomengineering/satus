import { Link } from '@studio-freight/compono'
import s from './footer.module.scss'

export function Footer() {
  return (
    <footer className={s.footer}>
      <div className="layout-block">
        <h2>
          <Link href="mailto:contact@studiofreight.com">mail</Link>
          <Link href="/contact">contact</Link>
          <Link>twitter</Link>
        </h2>
      </div>
    </footer>
  )
}

import cn from 'clsx'
import { Link } from 'components/link'
import s from './footer.module.scss'

export function Footer() {
  return (
    <footer className={cn(s.footer, 'layout-block')}>
      <Link href="mailto:hello@studiofreight.com" className="link">
        mail
      </Link>
      <Link href="https://x.com/studiofreight" className="link">
        twitter
      </Link>
    </footer>
  )
}

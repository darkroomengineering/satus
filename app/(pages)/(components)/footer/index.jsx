import Logo from '~/components/darkroom.svg'
import { Link } from '~/components/link'
import s from './footer.module.css'

export function Footer() {
  return (
    <footer className={s.footer}>
      <Link href="https://darkroom.engineering/" className="link">
        <Logo className={s.logo} />
      </Link>
      <div>
        <Link
          href="https://github.com/darkroomengineering/satus/generate"
          className="link"
        >
          use this template
        </Link>
        {' / '}
        <Link
          href="https://github.com/darkroomengineering/satus"
          className="link"
        >
          github
        </Link>
      </div>
    </footer>
  )
}

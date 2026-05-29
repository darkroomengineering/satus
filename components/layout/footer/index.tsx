import Logo from '@/components/ui/darkroom.svg'
import { Link } from '@/components/ui/link'
import s from './footer.module.css'

export function Footer() {
  return (
    <footer className={s.footer}>
      <Link
        aria-label="Darkroom Engineering"
        className={s.logo}
        href="https://darkroom.engineering/"
      >
        <Logo aria-hidden="true" className="dr-w-148 text-secondary" />
      </Link>
      <div className={s.links}>
        <Link
          className={s.link}
          href="https://github.com/darkroomengineering/satus/generate"
        >
          use this template
        </Link>
        <span aria-hidden="true" className={s.separator}>
          /
        </span>
        <Link
          className={s.link}
          href="https://github.com/darkroomengineering/satus"
        >
          github
        </Link>
      </div>
    </footer>
  )
}

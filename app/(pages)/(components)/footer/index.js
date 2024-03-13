import Link from 'next/link'
import s from './footer.module.scss'

export function Footer() {
  return (
    <footer className={s.footer}>
      <Link href="https://darkroom.engineering/" className="link">
        darkroom.engineering
      </Link>
      <Link
        href="https://github.com/darkroomengineering/satus"
        className="link"
      >
        github
      </Link>
    </footer>
  )
}

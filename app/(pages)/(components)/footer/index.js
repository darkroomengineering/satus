import Link from 'next/link'
import s from './footer.module.scss'

export function Footer() {
  return (
    <footer className={s.footer}>
      <Link href="https://darkroom.engineering/" target="_blank">
        darkroom.engineering
      </Link>
      <Link href="https://github.com/darkroomengineering/satus" target="_blank">
        github
      </Link>
    </footer>
  )
}

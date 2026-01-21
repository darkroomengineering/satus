import Logo from '@/components/ui/darkroom.svg'
import { Link } from '@/components/ui/link'

export function Footer() {
  return (
    <footer className="flex dt:flex-row flex-col dt:items-end items-center justify-between p-safe font-mono uppercase">
      <Link
        href="https://darkroom.engineering/"
        className="link"
        aria-label="Darkroom Engineering"
      >
        <Logo className="dr-w-148 text-secondary" aria-hidden="true" />
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

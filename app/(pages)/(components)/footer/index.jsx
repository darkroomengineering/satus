import Logo from '~/components/darkroom.svg'
import { Link } from '~/components/link'

export function Footer() {
  return (
    <footer className="flex flex-col dt:flex-row items-center dt:items-end justify-between p-safe uppercase font-mono">
      <Link href="https://darkroom.engineering/" className="link">
        <Logo className="dr-w-148 text-black" />
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

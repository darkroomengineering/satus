import cn from 'clsx'
import { Link } from '@/components/ui/link'
import s from './getting-started.module.css'

const COMMANDS = [
  { cmd: 'bunx degit darkroomengineering/satus my-project', label: 'Clone' },
  { cmd: 'cd my-project && bun install', label: 'Install' },
  { cmd: 'bun run setup:project', label: 'Configure' },
  { cmd: 'bun dev', label: 'Run' },
] as const

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/darkroomengineering/satus' },
  {
    label: 'Use Template',
    href: 'https://github.com/darkroomengineering/satus/generate',
  },
  { label: 'Components', href: '/components' },
  { label: 'DeepWiki', href: 'https://deepwiki.com/darkroomengineering/satus' },
] as const

export function GettingStarted() {
  return (
    <section className={cn(s.section, 'dr-layout-grid')}>
      <div className="col-span-full dt:col-start-2 dt:col-end-9">
        <h2 className={s.title}>Get Started</h2>
        <div className={s.commands}>
          {COMMANDS.map((item, index) => (
            <div key={item.cmd} className={s.command}>
              <span className={s.commandStep}>
                <span className={s.commandIndex} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className={s.commandLabel}>{item.label}</span>
              </span>
              <div className={s.commandBlock}>
                <code className={s.commandCode}>{item.cmd}</code>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={cn(s.aside, 'col-span-full dt:col-start-10 dt:col-end-12')}
      >
        <h3 className={s.linksTitle}>Links</h3>
        <div className={s.links}>
          {LINKS.map((link) => (
            <Link key={link.label} href={link.href} className={s.link}>
              <span className={s.linkArrow} aria-hidden="true">
                →
              </span>
              {link.label}
            </Link>
          ))}
        </div>

        <div className={s.asideNote}>
          <span className={s.asideNoteText}>
            Part of the{' '}
            <Link
              href="https://oss.darkroom.engineering"
              className={s.asideNoteLink}
            >
              Darkroom OSS
            </Link>{' '}
            ecosystem
          </span>
        </div>
      </div>
    </section>
  )
}

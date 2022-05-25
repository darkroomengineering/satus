import cn from 'clsx'
import { Link } from 'components/link'
import s from './footer.module.scss'

export const Footer = ({ className }) => {
  return (
    <footer className={cn(s.footer, className)} data-scroll-section>
      <div className="layout-block">
        <h2>
          <Link href="mailto:contact@studiofreight.com">contact</Link>
        </h2>
      </div>
    </footer>
  )
}

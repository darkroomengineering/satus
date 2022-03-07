import cn from 'clsx'
import s from './footer.module.scss'

export const Footer = ({ className }) => {
  return (
    <footer className={cn(s.footer, className)} data-scroll-section>
      <h2>Footer</h2>
    </footer>
  )
}

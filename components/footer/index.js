import { useStore } from 'lib/store'
import s from './footer.module.scss'

export const Footer = () => {
  const data = useStore((state) => state.footerData)

  return (
    <footer className={s.footer}>
      <div className="layout-block">
        <h2>{data.title}</h2>
      </div>
    </footer>
  )
}

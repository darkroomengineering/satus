import { Wrapper } from '../(components)/wrapper'
import s from './home.module.css'

export default function Home() {
  return (
    <Wrapper theme="red" className={s.page}>
      {/* content  */}
      <div className="layout-grid">
        <p>Hello</p>
      </div>
    </Wrapper>
  )
}

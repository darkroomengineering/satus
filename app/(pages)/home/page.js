import { TheatreProjectProvider } from 'libs/theatre'
import { Wrapper } from '../wrapper'
import s from './home.module.scss'

export default function Home() {
  return (
    <TheatreProjectProvider id="Satus-Home" config="/config/Satus-Home.json">
      <Wrapper theme="red" className={s.page}>
        {/* content  */}
      </Wrapper>
    </TheatreProjectProvider>
  )
}

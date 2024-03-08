import { TheatreProjectProvider } from 'libs/theatre'
import s from './home.module.scss'
import { Wrapper } from './wrapper'

export default function Home() {
  return (
    <TheatreProjectProvider id="Satus-Home" config="/config/Satus-Home.json">
      <Wrapper theme="red" className={s.page}>
        <h1>satus/home</h1>
      </Wrapper>
    </TheatreProjectProvider>
  )
}

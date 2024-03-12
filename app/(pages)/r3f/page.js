import { TheatreProjectProvider } from 'libs/theatre'
import { Wrapper } from '../wrapper'
import { Box } from './(components)/box'
import s from './r3f.module.scss'

export default function Home() {
  return (
    <TheatreProjectProvider id="Satus-Home" config="/config/Satus-Home.json">
      <Wrapper theme="red" className={s.page} webgl={true}>
        <Box />
      </Wrapper>
    </TheatreProjectProvider>
  )
}

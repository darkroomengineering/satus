import { TheatreProjectProvider } from 'libs/theatre'
import { Wrapper } from '../(components)/wrapper'
import { Box } from './(components)/box'
import s from './r3f.module.scss'

export default function Home() {
  return (
    <TheatreProjectProvider id="Satus-R3f" config="/config/Satus-R3f.json">
      <Wrapper theme="red" className={s.page} webgl={true}>
        <div className={s.inner}>
          <Box className={s.box} />
        </div>
      </Wrapper>
    </TheatreProjectProvider>
  )
}

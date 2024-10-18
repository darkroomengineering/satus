import { Wrapper } from '~/app/(pages)/(components)/wrapper'
import { TheatreProjectProvider } from '~/libs/theatre'
import { Canvas } from '~/libs/webgl/components/canvas'
import { Box } from './(components)/box'
import s from './r3f.module.css'

export default function Home() {
  return (
    <TheatreProjectProvider id="Satus-R3f" config="/config/Satus-R3f.json">
      <Wrapper theme="red" className={s.page}>
        <div className={s.inner}>
          <Box className={s.box} />
        </div>
      </Wrapper>
      <Canvas root />
    </TheatreProjectProvider>
  )
}

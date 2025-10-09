import { Wrapper } from '~/app/(pages)/(components)/wrapper'
import { TheatreProjectProvider } from '~/orchestra/theatre'
import { Box } from './(components)/box'

export default function Home() {
  return (
    <TheatreProjectProvider id="Satus-R3f" config="/config/Satus-R3f.json">
      <Wrapper theme="red" className="font-mono uppercase" webgl>
        <div className="flex items-center justify-center flex-grow">
          <Box className="size-[250px]" />
        </div>
      </Wrapper>
    </TheatreProjectProvider>
  )
}

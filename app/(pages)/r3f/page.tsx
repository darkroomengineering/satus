import { Wrapper } from '~/app/(pages)/_components/wrapper'
import { TheatreProjectProvider } from '~/dev/theatre'
import { Box } from './_components/box'

export default function Home() {
  return (
    <TheatreProjectProvider id="Satus-R3f" config="/config/Satus-R3f.json">
      <Wrapper theme="red" className="font-mono uppercase" webgl>
        <div className="flex grow items-center justify-center">
          <Box className="size-[250px]" />
        </div>
      </Wrapper>
    </TheatreProjectProvider>
  )
}

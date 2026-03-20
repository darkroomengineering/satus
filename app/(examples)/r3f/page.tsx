import { Wrapper } from '@/components/layout/wrapper'
import { TheatreProjectProvider } from '@/dev/theatre'
import { Box } from './_components/box'

export default function R3FPage() {
  return (
    <TheatreProjectProvider id="Satus-R3f" config="/config/Satus-R3f.json">
      <Wrapper theme="red" className="font-mono uppercase" webgl>
        <div className="grid min-h-[300vh] place-items-center">
          <div className="h-[50vh]" />
          <Box className="size-[250px]" />
          <div className="h-[50vh]" />
        </div>
      </Wrapper>
    </TheatreProjectProvider>
  )
}

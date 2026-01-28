import { Wrapper } from '@/components/layout/wrapper'
import { TheatreProjectProvider } from '@/dev/theatre'
import { Box } from './_components/box'

const isWebGLEnabled = process.env.NEXT_PUBLIC_ENABLE_WEBGL === 'true'

export default function R3FPage() {
  if (!isWebGLEnabled) {
    return (
      <Wrapper theme="red" className="font-mono uppercase">
        <div className="flex grow flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-xl">WebGL Not Enabled</h1>
          <p className="max-w-md opacity-60">
            This example requires WebGL to be enabled. Add the following to your{' '}
            <code className="rounded bg-white/10 px-1">.env.local</code> file:
          </p>
          <code className="rounded bg-white/10 px-3 py-2">
            NEXT_PUBLIC_ENABLE_WEBGL="true"
          </code>
          <p className="text-sm opacity-40">
            Then restart your development server.
          </p>
        </div>
      </Wrapper>
    )
  }

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

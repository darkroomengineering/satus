import { Wrapper } from '@/components/layout/wrapper'

export default function Loading() {
  return (
    <Wrapper className="font-mono">
      <div className="my-auto flex flex-col items-center justify-center uppercase">
        <p>Cooking...</p>
      </div>
    </Wrapper>
  )
}

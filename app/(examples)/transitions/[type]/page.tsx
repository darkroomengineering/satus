import { Wrapper } from '~/components/layout/wrapper'
import { BackLink } from './_components/back-link'

interface PageProps {
  params: Promise<{ type: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { type } = await params
  return {
    title: `${type} Transition`,
    description: `Demonstrating the ${type} page transition effect`,
  }
}

export default async function TransitionTypePage({ params }: PageProps) {
  const { type } = await params

  return (
    <Wrapper theme="red" className="font-mono">
      <section className="flex min-h-svh flex-col items-center justify-center">
        <div className="text-center">
          <p className="dr-mb-8 text-sm uppercase tracking-widest opacity-50">
            Transition Type
          </p>
          <h1 className="dr-text-48 dt:dr-text-72 dr-mb-24 font-bold">
            {type}
          </h1>
          <p className="dr-mb-32 max-w-md opacity-70">
            You arrived here using the <strong>{type}</strong> transition. Click
            below to go back with the same effect.
          </p>
          <BackLink transitionType={type} />
        </div>
      </section>
    </Wrapper>
  )
}

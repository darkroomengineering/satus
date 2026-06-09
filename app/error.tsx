'use client'

import { Wrapper } from '@/components/layout/wrapper'
import { ErrorView } from '@/components/ui/error-view'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <Wrapper theme="light" className="font-mono" webgl>
      <ErrorView error={error} reset={reset} />
    </Wrapper>
  )
}

'use client'

import { Wrapper } from '@/components/layout/wrapper'
import { ErrorView } from '@/components/ui/error-view'
import { Link } from '@/components/ui/link'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <Wrapper theme="light" className="font-mono">
      <ErrorView
        error={error}
        reset={reset}
        homeLink={
          <Link
            href="/"
            className="rounded border-gray-300 px-6 py-3 hover:bg-gray-50 border transition-colors"
          >
            Go Home
          </Link>
        }
      />
    </Wrapper>
  )
}

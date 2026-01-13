'use client'

import { useEffect } from 'react'
import { Wrapper } from '@/components/layout/wrapper'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <Wrapper theme="light" className="font-mono" webgl>
      <div className="dr-gap-y-24 my-auto flex flex-col items-center justify-center uppercase">
        <h1 className="mb-4 font-bold text-4xl">Critical Error</h1>
        <p className="mb-6 text-gray-600 text-lg">
          A critical error occurred. Please refresh the page or contact support
          if the problem persists.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-gray-500 text-sm hover:text-gray-700">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="flex justify-center gap-4">
          <button
            onClick={reset}
            type="button"
            className="rounded bg-black px-6 py-3 text-white transition-colors hover:bg-gray-800"
          >
            Try Again
          </button>
          <button
            onClick={() => {
              window.location.href = '/'
            }}
            type="button"
            className="rounded border border-gray-300 px-6 py-3 transition-colors hover:bg-gray-50"
          >
            Go Home
          </button>
        </div>
      </div>
    </Wrapper>
  )
}

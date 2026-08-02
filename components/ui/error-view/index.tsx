'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface ErrorViewProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  description?: string
  /**
   * Element rendered in place of the default "Go Home" anchor. Pass the
   * project's `Link` (from '@/components/ui/link') when rendering inside the
   * router (e.g. app/(site)/error.tsx). Defaults to a raw `<a>`, which is required
   * in app/global-error.tsx since it renders outside the router.
   */
  homeLink?: ReactNode
}

const DEFAULT_HOME_LINK = (
  // oxlint-disable-next-line react/forbid-elements, nextjs/no-html-link-for-pages -- global-error renders outside the router, so the Link component cannot be used here
  <a
    href="/"
    className="rounded border-gray-300 px-6 py-3 hover:bg-gray-50 border transition-colors"
  >
    Go Home
  </a>
)

/**
 * Shared error boundary view used by both app/(site)/error.tsx and app/global-error.tsx.
 *
 * Uses only plain HTML elements (no next/link, no app providers) so it is safe
 * to render in both the standard error boundary context and in global-error's
 * root-level context where the router may not be available.
 */
export function ErrorView({
  error,
  reset,
  title = 'Something went wrong',
  description = "We're sorry, but something unexpected happened. Please try again.",
  homeLink = DEFAULT_HOME_LINK,
}: ErrorViewProps) {
  useEffect(() => {
    console.error('Error boundary caught:', error)
  }, [error])

  return (
    <div className="my-auto flex flex-col items-center justify-center dr-gap-y-24 uppercase">
      <h1 className="mb-4 font-bold text-4xl">{title}</h1>
      <p className="mb-6 text-gray-600 text-lg">{description}</p>

      {process.env.NODE_ENV === 'development' && (
        <details className="mb-6 text-left">
          <summary className="text-gray-500 text-sm hover:text-gray-700 cursor-pointer">
            Error Details (Development Only)
          </summary>
          <pre className="mt-2 rounded bg-gray-100 p-4 text-xs overflow-auto">
            {error.message}
            {error.digest && `\nDigest: ${error.digest}`}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}

      <div className="gap-4 flex justify-center">
        <button
          onClick={reset}
          type="button"
          className="rounded px-6 py-3 hover:bg-gray-800 bg-black text-white transition-colors"
        >
          Try Again
        </button>
        {homeLink}
      </div>
    </div>
  )
}

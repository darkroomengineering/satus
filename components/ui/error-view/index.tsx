'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface ErrorViewProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  description?: string
  /**
   * Replaces the default "Go Home" anchor. Pass `Link` (`@/components/ui/link`)
   * inside the router; the default raw `<a>` is required in
   * app/global-error.tsx, which renders outside it.
   */
  homeLink?: ReactNode
}

const DEFAULT_HOME_LINK = (
  // oxlint-disable-next-line react/forbid-elements, nextjs/no-html-link-for-pages -- global-error renders outside the router, so the Link component cannot be used here
  <a
    href="/"
    className="inline-flex min-h-[44px] items-center border border-secondary dr-px-24 transition-opacity hover:opacity-70"
  >
    Go Home
  </a>
)

/**
 * Error view shared by app/(site)/error.tsx and app/global-error.tsx. Plain
 * HTML only (no next/link, no providers): global-error renders where the
 * router may be unavailable.
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
    <div className="my-auto flex flex-col items-center justify-center dr-gap-y-24 dr-px-16 text-center uppercase">
      <h1 className="font-bold dr-text-28">{title}</h1>
      <p className="dr-text-14 text-secondary/70">{description}</p>

      {process.env.NODE_ENV === 'development' && (
        <details className="max-w-full text-left">
          <summary className="cursor-pointer dr-text-12">
            Error Details (Development Only)
          </summary>
          <pre className="dr-mt-8 overflow-auto bg-secondary/5 dr-p-16 dr-text-12">
            {error.message}
            {error.digest && `\nDigest: ${error.digest}`}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}

      <div className="flex flex-wrap justify-center dr-gap-16">
        <button
          onClick={reset}
          type="button"
          className="inline-flex min-h-[44px] items-center bg-secondary dr-px-24 text-primary transition-opacity hover:opacity-80"
        >
          Try Again
        </button>
        {homeLink}
      </div>
    </div>
  )
}

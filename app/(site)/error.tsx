'use client'

import { Theme } from '@/components/layout/theme'
import { ErrorView } from '@/components/ui/error-view'
import { Link } from '@/components/ui/link'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * No `Wrapper`: it may be what crashed (Lenis, WebGL, header, footer), and
 * importing it gives this boundary its own copy of the whole page shell, which
 * every route downloads on first load. `Theme` is light enough to keep: it
 * moves `<html>` (and the scrollbar gutter) off the crashed page's theme after
 * mount, and `data-theme` on `<main>` colors this view before that.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <Theme theme="light" global>
      <main
        id="main-content"
        data-theme="light"
        className="flex min-h-svh flex-col items-center justify-center bg-primary font-mono text-secondary"
      >
        <ErrorView
          error={error}
          reset={reset}
          homeLink={
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center border border-secondary dr-px-24 transition-opacity hover:opacity-70"
            >
              Go Home
            </Link>
          }
        />
      </main>
    </Theme>
  )
}

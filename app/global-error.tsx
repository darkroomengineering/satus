'use client'

import { ErrorView } from '@/components/ui/error-view'

// global-error replaces the root layout, so it must bring the stylesheet itself
import '@/lib/styles/css/index.css'

/**
 * Last-resort boundary: replaces the ENTIRE root layout when it crashes, so it
 * must render its own <html>/<body> and must not depend on any provider or
 * heavy chrome (Wrapper pulls in Lenis/WebGL/theme machinery — all bundled on
 * every route, and all liable to be the thing that just crashed).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-dvh flex-col items-center justify-center font-mono">
          <ErrorView
            error={error}
            reset={reset}
            title="Critical Error"
            description="A critical error occurred. Please refresh the page or contact support if the problem persists."
          />
        </div>
      </body>
    </html>
  )
}

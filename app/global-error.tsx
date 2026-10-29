'use client'

import { ErrorView } from '@/components/ui/error-view'
import { fontsVariable } from '@/lib/styles/fonts'

// global-error replaces the root layout, so it must bring the stylesheet itself
import '@/lib/styles/css/index.css'

/**
 * Replaces the entire root layout when it crashes, so it renders its own
 * <html>/<body> and must not depend on any provider or heavy chrome: Wrapper
 * pulls in Lenis/WebGL/theme, any of which may be what crashed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className={fontsVariable} data-theme="dark">
      <body>
        <div className="flex min-h-svh flex-col items-center justify-center font-mono">
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

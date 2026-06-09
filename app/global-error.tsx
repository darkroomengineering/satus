'use client'

import { Wrapper } from '@/components/layout/wrapper'
import { ErrorView } from '@/components/ui/error-view'

// global-error.tsx replaces the root layout when a root-level error occurs,
// so it must render its own <html> and <body>. Without them Next.js renders
// broken, unstyled HTML at the worst possible moment for the user.
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
        <Wrapper theme="light" className="font-mono" webgl>
          <ErrorView
            error={error}
            reset={reset}
            title="Critical Error"
            description="A critical error occurred. Please refresh the page or contact support if the problem persists."
          />
        </Wrapper>
      </body>
    </html>
  )
}

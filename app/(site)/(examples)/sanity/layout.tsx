import { draftMode } from 'next/headers'

import { isConfigured } from '@/integrations/registry'
import { DisableDraftMode } from '@/integrations/sanity/components/disable-draft-mode'

// `app/robots.ts` allows `/` to every bot, so omitting this route from the
// sitemap isn't enough to keep it out of search results — it must be
// hardcoded noindex, the same as `app/studio/layout.tsx`.
export const metadata = {
  robots: { index: false, follow: false },
}

export default async function SanityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isEnabled: isDraftMode } = await draftMode()
  const sanityConfigured = isConfigured('sanity')

  return (
    <>
      {children}
      {/* Show "Disable Draft Mode" button on Sanity pages */}
      {sanityConfigured && isDraftMode && <DisableDraftMode />}
    </>
  )
}

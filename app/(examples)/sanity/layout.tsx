import { draftMode } from 'next/headers'
import { isSanityConfigured } from '@/integrations/check-integration'
import { DisableDraftMode } from '@/integrations/sanity/components/disable-draft-mode'

export default async function SanityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isEnabled: isDraftMode } = await draftMode()
  const sanityConfigured = isSanityConfigured()

  return (
    <>
      {children}
      {/* Show "Disable Draft Mode" button on Sanity pages */}
      {sanityConfigured && isDraftMode && <DisableDraftMode />}
    </>
  )
}

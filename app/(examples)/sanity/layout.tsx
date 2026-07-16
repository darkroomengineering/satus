import { draftMode } from 'next/headers'
import { isConfigured } from '@/integrations/registry'
import { DisableDraftMode } from '@/integrations/sanity/components/disable-draft-mode'

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

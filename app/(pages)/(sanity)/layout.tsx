import { draftMode } from 'next/headers'
import { VisualEditing } from 'next-sanity/visual-editing'
import { isSanityConfigured } from '~/lib/lib/integrations/check-integration'
import { DisableDraftMode } from '~/lib/lib/integrations/sanity/components/disable-draft-mode'
import { SanityLive } from '~/lib/lib/integrations/sanity/live'

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
      {/* Visual editing - only in draft mode and if Sanity is configured */}
      {sanityConfigured && isDraftMode && (
        <>
          <VisualEditing />
          <DisableDraftMode />
          <SanityLive />
        </>
      )}
    </>
  )
}

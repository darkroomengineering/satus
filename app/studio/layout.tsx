import type { Metadata } from 'next'
import { draftMode, headers } from 'next/headers'
import type { PropsWithChildren } from 'react'

export const metadata: Metadata = {
  title: 'Sanity Studio',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function StudioLayout({ children }: PropsWithChildren) {
  await headers()

  // Reload of entire app is happening only when entering the studio
  // when draft mode is already enabled, we need to disable it
  const draft = await draftMode()
  if (draft.isEnabled) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Disabling draft mode')
    }
    draft.disable()
  }

  return children
}

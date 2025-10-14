import type { Metadata } from 'next'
import { headers } from 'next/headers'
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
  return children
}

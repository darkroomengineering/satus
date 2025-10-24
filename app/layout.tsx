import type { Metadata, Viewport } from 'next'
import { draftMode } from 'next/headers'
import { VisualEditing } from 'next-sanity/visual-editing'
import type { PropsWithChildren } from 'react'
import { ReactTempus } from 'tempus/react'
import { RealViewport } from '~/components/real-viewport'
import { DisableDraftMode } from '~/integrations/sanity/components/disable-draft-mode'
import AppData from '~/package.json'
import { themes } from '~/styles/colors'
import '~/styles/css/index.css'

import { GSAPRuntime } from '~/components/gsap/runtime'
import { isSanityConfigured } from '~/integrations/check-integration'
import { SanityLive } from '~/integrations/sanity/live'
import { OrchestraTools } from '~/orchestra'
import { fontsVariable } from '~/styles/fonts'

const APP_NAME = AppData.name
const APP_DEFAULT_TITLE = 'Satūs'
const APP_TITLE_TEMPLATE = '%s - Satūs'
const APP_DESCRIPTION = AppData.description
const APP_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(APP_BASE_URL),
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    url: APP_BASE_URL,
    images: [
      {
        url: '/opengraph-image.jpg',
        width: 1200,
        height: 630,
        alt: APP_DEFAULT_TITLE,
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  authors: [
    { name: 'darkroom.engineering', url: 'https://darkroom.engineering' },
  ],
  other: {
    'fb:app_id': process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
  },
}

export const viewport: Viewport = {
  themeColor: themes.red.primary,
  colorScheme: 'normal',
}

export default async function Layout({ children }: PropsWithChildren) {
  const { isEnabled: isDraftMode } = await draftMode()
  const sanityConfigured = isSanityConfigured()

  return (
    <html
      lang="en"
      dir="ltr"
      className={fontsVariable}
      // NOTE: This is due to the data-theme attribute being set which causes hydration errors
      suppressHydrationWarning
    >
      <body>
        {/* Critical: CSS custom properties needed for layout */}
        <RealViewport />

        {/* Main app content */}
        {children}

        {/* Development tools - dynamically imported */}
        <OrchestraTools />

        {/* Animation framework */}
        <GSAPRuntime />

        {/* RAF management - lightweight, but don't patch in draft mode to avoid conflicts */}
        <ReactTempus patch={!isDraftMode} />

        {/* Visual editing - only in draft mode and if Sanity is configured */}
        {sanityConfigured && isDraftMode && (
          <>
            <VisualEditing />
            <DisableDraftMode />
            <SanityLive />
          </>
        )}
      </body>
    </html>
  )
}

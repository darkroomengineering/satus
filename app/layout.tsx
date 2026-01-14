import type { Metadata, Viewport } from 'next'

import { draftMode } from 'next/headers'
import Script from 'next/script'
import { VisualEditing } from 'next-sanity/visual-editing'
import { type PropsWithChildren, Suspense } from 'react'
import { ReactTempus } from 'tempus/react'
import { Link } from '@/components/ui/link'
import { RealViewport } from '@/components/ui/real-viewport'
import { OptionalFeatures } from '@/lib/features'
import { TransformProvider } from '@/lib/hooks/use-transform'
import { isSanityConfigured } from '@/lib/integrations/check-integration'
import { SanityLive } from '@/lib/integrations/sanity/live'
import { themes } from '@/lib/styles/colors'
import { fontsVariable } from '@/lib/styles/fonts'
import AppData from '@/package.json'
import '@/lib/styles/css/index.css'

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
      {/* this helps to track Satus usage thanks to Wappalyzer */}
      <Script async>{`window.satusVersion = '${AppData.version}';`}</Script>
      <body>
        {/* Skip link for keyboard navigation accessibility */}
        <Suspense fallback={null}>
          <Link
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-9999 focus:rounded focus:bg-black focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-white"
          >
            Skip to main content
          </Link>
        </Suspense>
        {/* Critical: CSS custom properties needed for layout */}
        <RealViewport>
          <TransformProvider>
            {/* Main app content */}
            {children}
          </TransformProvider>
        </RealViewport>
        {/* Optional features - conditionally loaded based on configuration */}
        <OptionalFeatures />

        {/* Sanity Visual Editing - only when draft mode is enabled */}
        {sanityConfigured && isDraftMode && (
          <Suspense fallback={null}>
            <VisualEditing />
            <SanityLive />
          </Suspense>
        )}

        {/* RAF management - lightweight, but don't patch in draft mode to avoid conflicts */}
        <ReactTempus patch={!isDraftMode} />
      </body>
    </html>
  )
}

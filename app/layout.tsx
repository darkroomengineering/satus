import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google'
import type { Metadata, Viewport } from 'next'
import { VisualEditing } from 'next-sanity'
import { draftMode } from 'next/headers'
import type { PropsWithChildren } from 'react'
import { ReactTempus } from 'tempus/react'
import { DisableDraftMode } from '~/components/disable-draft-mode'
import { GSAP } from '~/components/gsap'
import { ScrollTrigger } from '~/components/gsap/scroll-trigger'
import { PerformanceMonitor } from '~/components/performance-monitor'
import { RoutePerformanceTracker } from '~/components/performance-monitor/route-tracker'
import { RealViewport } from '~/components/real-viewport'
import { OrchestraTools } from '~/orchestra'
import AppData from '~/package.json'
import { themes } from '~/styles/colors'
import '~/styles/css/index.css'
import { fontsVariable } from '~/styles/fonts'

const APP_NAME = AppData.name
const APP_DEFAULT_TITLE = 'Satūs'
const APP_TITLE_TEMPLATE = '%s - Satūs'
const APP_DESCRIPTION = AppData.description
const APP_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

const GTM_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID
const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS

export const metadata: Metadata = {
  metadataBase: APP_BASE_URL ? new URL(`${APP_BASE_URL}`) : undefined,
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
  formatDetection: {
    telephone: false,
  },
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
        url: '/og-image.png',
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
  const isDraftMode = (await draftMode()).isEnabled

  return (
    <html
      lang="en"
      dir="ltr"
      className={fontsVariable}
      // NOTE: This is due to the data-theme attribute being set which causes hydration errors
      suppressHydrationWarning
    >
      {/* Google Tag Manager - loads in <head> for optimal performance */}
      {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
      <body>
        {/* Critical: CSS custom properties needed for layout */}
        <RealViewport />

        {/* Main app content */}
        {children}

        {/* Non-critical: Performance monitoring (singleton, lightweight) */}
        <PerformanceMonitor />
        <RoutePerformanceTracker />

        {/* Development tools - dynamically imported */}
        <OrchestraTools />

        {/* Animation framework */}
        <GSAP />
        <ScrollTrigger />

        {/* RAF management - lightweight, but don't patch in draft mode to avoid conflicts */}
        <ReactTempus patch={!isDraftMode} />

        {/* Visual editing - only in draft mode */}
        {isDraftMode && (
          <>
            <VisualEditing />
            <DisableDraftMode />
          </>
        )}

        {/* Analytics - loads async, non-blocking */}
        {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      </body>
    </html>
  )
}

import { Analytics } from '@vercel/analytics/next'
import { TransformProvider } from 'hamo'
import type { Metadata, Viewport } from 'next'
import { draftMode } from 'next/headers'
import Script from 'next/script'
import { type PropsWithChildren, Suspense } from 'react'
import { ReactTempus } from 'tempus/react'

import { Link } from '@/components/ui/link'
import { RealViewport } from '@/components/ui/real-viewport'
import { ToastProvider } from '@/components/ui/toast'
import { env } from '@/lib/env'
import { OptionalFeatures } from '@/lib/features'
import { isConfigured } from '@/lib/integrations/registry'
import { SanityVisualEditing } from '@/lib/integrations/sanity/components/visual-editing'
import { SITE_ALTERNATE_TYPES } from '@/lib/seo/alternates'
import { JsonLd } from '@/lib/seo/json-ld'
import { organizationSchema, websiteSchema } from '@/lib/seo/schemas'
import { BASE_URL, SITE } from '@/lib/seo/site'
import { themes } from '@/lib/styles/colors'
import AppData from '@/package.json'

const APP_NAME = AppData.name
const APP_DEFAULT_TITLE = SITE.name
const APP_TITLE_TEMPLATE = `%s - ${SITE.name}`
const APP_DESCRIPTION = AppData.description

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  // No canonical: a route that sets none (noindex examples, the 404) would
  // inherit it. Indexable pages set their own through `routeAlternates`.
  alternates: { types: SITE_ALTERNATE_TYPES },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
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
}

if (env.NEXT_PUBLIC_FACEBOOK_APP_ID) {
  metadata.other = { 'fb:app_id': env.NEXT_PUBLIC_FACEBOOK_APP_ID }
}

export const viewport: Viewport = {
  // Matches the server-rendered `data-theme="dark"` in app/layout.tsx; <Theme>
  // rewrites it per route.
  themeColor: themes.dark.primary,
  colorScheme: 'normal',
}

/**
 * App-wide providers, metadata and analytics for every route except /studio,
 * which sits outside this group so Studio doesn't pull in the rAF loop,
 * toasts, Visual Editing or JSON-LD.
 */
export default async function AppLayout({ children }: PropsWithChildren) {
  const { isEnabled: isDraftMode } = await draftMode()
  const sanityConfigured = isConfigured('sanity')

  return (
    <>
      {/* this helps to track Satus usage thanks to Wappalyzer */}
      <Script
        id="satus-version"
        async
      >{`window.satusVersion = '${AppData.version}';`}</Script>
      {/* On every page, not just home: deep pages are landed on directly far more often. */}
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <Suspense fallback={null}>
        <Link
          href="#main-content"
          className="focus:top-4 focus:left-4 focus:rounded focus:px-4 focus:py-2 sr-only focus:not-sr-only focus:fixed focus:z-9999 focus:bg-black focus:text-white focus:ring-2 focus:ring-white focus:outline-none"
        >
          Skip to main content
        </Link>
      </Suspense>
      <RealViewport>
        <ToastProvider>
          <TransformProvider>
            {/*
              DO NOT add Header or Footer here.
              They are included in the <Wrapper> component used by each page.
              See: components/layout/wrapper/index.tsx
            */}
            {children}
          </TransformProvider>
        </ToastProvider>
      </RealViewport>
      <OptionalFeatures />

      {sanityConfigured && isDraftMode && (
        <Suspense fallback={null}>
          <SanityVisualEditing />
        </Suspense>
      )}

      {/* Not patched in draft mode, to avoid conflicts. */}
      <ReactTempus patch={!isDraftMode} />
      {/* Vercel-hosted deployments only — the injected /_vercel/insights
          script 404s on self-hosted or CI `next start`. */}
      {process.env.VERCEL_ENV && <Analytics />}
    </>
  )
}

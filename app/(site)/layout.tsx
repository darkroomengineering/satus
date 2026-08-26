import { Analytics } from '@vercel/analytics/next'
import { TransformProvider } from 'hamo'
import type { Metadata, Viewport } from 'next'
import { VisualEditing } from 'next-sanity/visual-editing'
import { draftMode } from 'next/headers'
import Script from 'next/script'
import { type PropsWithChildren, Suspense } from 'react'
import { ReactTempus } from 'tempus/react'

import { Link } from '@/components/ui/link'
import { RealViewport } from '@/components/ui/real-viewport'
import { ToastProvider, ToastViewport } from '@/components/ui/toast'
import { APP_BASE_URL, env } from '@/lib/env'
import { OptionalFeatures } from '@/lib/features'
import { isConfigured } from '@/lib/integrations/registry'
import { SanityLive } from '@/lib/integrations/sanity/live'
import { routeAlternates } from '@/lib/seo/alternates'
import { JsonLd } from '@/lib/seo/json-ld'
import { organizationSchema, websiteSchema } from '@/lib/seo/schemas'
import { themes } from '@/lib/styles/colors'
import AppData from '@/package.json'

const APP_NAME = AppData.name
const APP_DEFAULT_TITLE = 'Satūs'
const APP_TITLE_TEMPLATE = '%s - Satūs'
const APP_DESCRIPTION = AppData.description

export const metadata: Metadata = {
  metadataBase: new URL(APP_BASE_URL),
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  alternates: {
    // Only the home route's canonical. Child routes build their own through
    // `routeAlternates` — inheriting this one would canonicalize the whole
    // site to `/`.
    ...routeAlternates('/'),
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
}

if (env.NEXT_PUBLIC_FACEBOOK_APP_ID) {
  metadata.other = { 'fb:app_id': env.NEXT_PUBLIC_FACEBOOK_APP_ID }
}

export const viewport: Viewport = {
  themeColor: themes.red.primary,
  colorScheme: 'normal',
}

/**
 * App-wide providers, metadata and analytics for every route EXCEPT /studio,
 * which lives outside this route group so Sanity Studio doesn't drag in the
 * rAF loop, toasts, Sanity Live, JSON-LD, etc. The root layout owns the
 * html/body shell, global CSS and font variables.
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
      {/* Entity identity for search and answer engines, on every page — deep
          pages are landed on directly far more often than the homepage. */}
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      {/* Skip link for keyboard navigation accessibility */}
      <Suspense fallback={null}>
        <Link
          href="#main-content"
          className="focus:top-4 focus:left-4 focus:rounded focus:px-4 focus:py-2 sr-only focus:not-sr-only focus:fixed focus:z-9999 focus:bg-black focus:text-white focus:ring-2 focus:ring-white focus:outline-none"
        >
          Skip to main content
        </Link>
      </Suspense>
      {/* Critical: CSS custom properties needed for layout */}
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
          <ToastViewport />
        </ToastProvider>
      </RealViewport>
      {/*
        Optional features - conditionally loaded based on configuration.

        `gsap` is on because the starter homepage animates its outro with
        <ProgressText>. It costs ~43KB gzipped, so drop it once no page under
        this layout uses GSAP — a site that does not animate should not ship
        an animation engine.
      */}
      <OptionalFeatures gsap />

      {/* Sanity Live - renders unconditionally when Sanity is configured for real-time updates.
          includeDrafts subscribes the event stream to draft mutations so
          Presentation-tool edits push to the preview without a manual refresh. */}
      {sanityConfigured && <SanityLive includeDrafts={isDraftMode} />}

      {/* Sanity Visual Editing - only when draft mode is enabled */}
      {sanityConfigured && isDraftMode && (
        <Suspense fallback={null}>
          <VisualEditing />
        </Suspense>
      )}

      {/* RAF management - lightweight, but don't patch in draft mode to avoid conflicts */}
      <ReactTempus patch={!isDraftMode} />
      {/* Vercel-hosted deployments only — the injected /_vercel/insights
          script 404s on self-hosted or CI `next start`. */}
      {process.env.VERCEL_ENV && <Analytics />}
    </>
  )
}

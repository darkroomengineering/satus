import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google'
import type { Metadata, Viewport } from 'next'
import type { PropsWithChildren } from 'react'
import { ReactTempus } from 'tempus/react'
import { GSAP } from '~/components/gsap'
import { RealViewport } from '~/components/real-viewport'
import { OrchestraTools } from '~/orchestra'
import AppData from '~/package.json'
import { themes } from '~/styles/colors'
import { fontsClassName } from '~/styles/fonts'

import '~/styles/css/index.css'

const APP_NAME = AppData.name
const APP_DEFAULT_TITLE = 'Satūs'
const APP_TITLE_TEMPLATE = '%s - Satūs'
const APP_DESCRIPTION = AppData.description
const APP_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

const GTM_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID || false
const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS || false

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
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

export const viewport: Viewport = {
  themeColor: themes.red.primary,
  colorScheme: 'normal',
}

export default function Layout({ children }: PropsWithChildren) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={fontsClassName}
      // NOTE: This is due to the data-theme attribute being set which causes hydration errors
      suppressHydrationWarning
    >
      {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
      <body>
        <RealViewport />
        {children}
        <OrchestraTools />
        <GSAP />
        {/* @ts-expect-error - TODO: Fix in tempus */}
        <ReactTempus patch />
      </body>
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  )
}

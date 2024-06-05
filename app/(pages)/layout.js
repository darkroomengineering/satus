import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google'
import { Debug } from 'components/debug'
import { GSAP } from 'components/gsap'
import { TransitionProvider } from 'components/page-transition/transition-context'

import { RealViewport } from 'components/real-viewport'
import { StyleVariables } from 'libs/style-variables'
import { colors, themes } from 'styles/config'
import AppData from '../../package.json'

import 'styles/global.scss'
import { fonts } from '../fonts'

const APP_NAME = AppData.name
const APP_DEFAULT_TITLE = 'Satūs'
const APP_TITLE_TEMPLATE = '%s - Satūs'
const APP_DESCRIPTION = AppData.description
const APP_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

const GTM_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID || false
const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS || false

export const metadata = {
  metadataBase:
    process.env.NODE_ENV === 'development'
      ? new URL(`http://localhost:${process.env.PORT || 3000}`)
      : new URL(APP_BASE_URL),
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
}

export const viewport = {
  themeColor: '#e30613',
}

export default async function Layout({ children }) {
  return (
    <TransitionProvider>
      <html lang="en" dir="ltr" className={fonts?.className}>
        <head>
          <StyleVariables colors={colors} themes={themes} />
        </head>
        {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
        <body>
          <RealViewport />
          {children}
          <Debug />
          <GSAP />
        </body>
        {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
      </html>
    </TransitionProvider>
  )
}

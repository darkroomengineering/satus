// https://nextjs.org/docs/pages/building-your-application/optimizing/fonts#local-fonts

import cn from 'clsx'
import localFont from 'next/font/local'

const ibmPlexMono = localFont({
  src: [
    {
      path: '../public/fonts/IBM_Plex_Mono/IBMPlexMono-Medium.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-ibm-plex-mono',
  preload: true,
})

export const fonts = { className: cn(ibmPlexMono.variable) }

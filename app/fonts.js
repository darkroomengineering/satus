// https://nextjs.org/docs/pages/building-your-application/optimizing/fonts#local-fonts

import cn from 'clsx'
import localFont from 'next/font/local'

const ibm = localFont({
  src: [
    {
      path: './fonts/IBMPlexMono/IBMPlexMono-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-ibm',
  display: 'swap',
  preload: true,
})

export const fonts = { className: cn(ibm.variable) }

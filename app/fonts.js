// https://nextjs.org/docs/pages/building-your-application/optimizing/fonts#local-fonts

import cn from 'clsx'
import localFont from 'next/font/local'

const inter = localFont({
  src: [
    {
      path: './fonts/inter/InterVariable.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

export const fonts = { className: cn(inter.variable) }

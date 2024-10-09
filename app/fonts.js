// https://nextjs.org/docs/pages/building-your-application/optimizing/fonts#local-fonts

import cn from 'clsx'
import localFont from 'next/font/local'

const mono = localFont({
  src: [
    {
      path: '../public/fonts/ServerMono/ServerMono-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-mono',
  preload: true,
})

export const fonts = { className: cn(mono.variable) }

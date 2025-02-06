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

const fonts = [mono]
const fontsClassName = fonts.map((font) => font.className).join(' ')

export { fontsClassName }

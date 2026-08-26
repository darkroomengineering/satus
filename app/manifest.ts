import type { MetadataRoute } from 'next'

import AppData from '@/package.json'
import { themes } from '@/styles/colors'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: AppData.name,
    short_name: AppData.name,
    description: AppData.description,
    start_url: '/',
    display: 'standalone',
    background_color: themes.red.primary,
    theme_color: themes.red.primary,
    // `sizes` must match the real pixel dimensions of each file — a browser
    // that trusts a wrong value picks the wrong icon, and nothing validates
    // this. One entry per file: listing `/icon.png` twice made the same
    // bytes look like two separate icons.
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}

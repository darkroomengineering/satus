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
    // `sizes` must match each file's real pixel dimensions: a browser trusts
    // it and nothing validates it. One entry per file.
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

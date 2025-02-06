import type { MetadataRoute } from 'next'
import AppData from '~/package.json'
import { themes } from '~/styles/config'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: AppData.name,
    short_name: AppData.name,
    description: AppData.description,
    start_url: '/',
    display: 'standalone',
    background_color: themes.light.primary,
    theme_color: themes.light.contrast,
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}

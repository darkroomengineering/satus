import AppData from '~/package.json'
import Image from './opengraph-image'

export const runtime = 'edge'

// Image metadata
export const alt = AppData.name
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default Image

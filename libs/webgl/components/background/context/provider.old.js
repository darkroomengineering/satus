import { promises as fs } from 'fs'
import { BackgroundClientProvider } from './provider'

export async function BackgroundProvider({ children, data }) {
  // const host = headers().get('host')

  const audioList = await Promise.all(
    data.soundmap.audioList.map(async (url) => {
      if (url.includes('//assets.tina.io')) {
        url = `/cms/${url.split('/').at(-1)}`
      }

      let json = null

      try {
        json = await fs.readFile(process.cwd() + '/public' + url, 'utf8')
      } catch (e) {
        console.log(e)
      }

      return JSON.parse(json)
    }),
  )

  return (
    <BackgroundClientProvider audioList={audioList}>
      {children}
    </BackgroundClientProvider>
  )
}

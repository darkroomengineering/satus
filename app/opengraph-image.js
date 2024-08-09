import { ImageResponse } from 'next/og'
import { themes } from 'styles/config.js'
import AppData from '../package.json'

export const runtime = 'edge'

// Image metadata
export const alt = AppData.name
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

const getFont = async () => {
  const res = await fetch(
    new URL(
      'public/fonts/V1_Server_Mono/V1-ServerMono-Regular.woff2',
      import.meta.url,
    ),
  )
  return await res.arrayBuffer()
}

// Image generation
export default async function Image() {
  // Font
  const mono = getFont()

  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: themes.red.primary,
          color: themes.red.secondary,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 48px',
          fontFamily: 'V1_Server_Mono',
          textTransform: 'uppercase',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontSize: 14,
            fontWeight: 400,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>darkroom.engineering</div>
          </div>
          <div
            style={{
              justifySelf: 'center',
              alignSelf: 'center',
              textAlign: 'center',
              fontSize: 32,
              fontWeight: 400,
            }}
          >
            {AppData.name}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>where things get developed</div>
            <div>hi@darkroom.engineering</div>
          </div>
        </div>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
      fonts: [
        {
          name: 'V1_Server_Mono',
          data: await mono,
          style: 'normal',
          weight: 400,
        },
      ],
    },
  )
}

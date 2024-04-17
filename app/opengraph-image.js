import { ImageResponse } from 'next/og'
import { themes } from 'styles/config.js'
import AppData from '../package.json'

// Image metadata
export const alt = AppData.name
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

// Image generation
export default async function Image() {
  // Font
  const ibmPlexMono = fetch(
    new URL('fonts/IBM_Plex_Mono/IBMPlexMono-Regular.woff2', import.meta.url),
  ).then((res) => res.arrayBuffer())

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
          padding: '8px',
          fontFamily: 'IBM_Plex_Mono',
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
          name: 'IBM_Plex_Mono',
          data: await ibmPlexMono,
          style: 'normal',
          weight: 400,
        },
      ],
    },
  )
}

export function PreloadFonts({ fonts = [] }) {
  return (
    <>
      {fonts.map((path) => {
        return (
          <link
            key={path}
            href={path}
            as="font"
            rel="preload prefetch"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        )
      })}
    </>
  )
}

export function StyleVariables({ colors = {}, themes = {} }) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root {${Object.entries(colors)
          .map(([key, value]) => `--${key}: ${value};`)
          .join('')}}${Object.entries(themes)
          .map(
            ([key, colors]) =>
              `.theme-${key} {${Object.entries(colors)
                .map(([key, value]) => `--theme-${key}: ${value};`)
                .join('')}}`,
          )
          .join('')}
              `,
      }}
    />
  )
}

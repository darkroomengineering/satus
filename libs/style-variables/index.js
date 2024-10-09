export function StyleVariables({ colors = {}, themes = {} }) {
  return (
    <style
      // biome-ignore lint/security/noDangerouslySetInnerHtml: idk let's find a better way
      dangerouslySetInnerHTML={{
        __html: `:root {${Object.entries(colors)
          .map(([key, value]) => `--${key}: ${value};`)
          .join('')}}${Object.entries(themes)
          .map(
            ([key, colors]) =>
              `.theme-${key} {${Object.entries(colors)
                .map(([key, value]) => `--theme-${key}: ${value};`)
                .join('')}}`
          )
          .join('')}
              `,
      }}
    />
  )
}

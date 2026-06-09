import type { Decorator, Preview } from '@storybook/react'
import { useEffect } from 'storybook/preview-api'
import '../lib/styles/css/index.css'

// The site applies a palette by setting `data-theme` on <html>; global.css then
// derives --surface/--line from --color-secondary. Setting the attribute on the
// iframe's documentElement (not a wrapper) makes those derived tokens resolve
// exactly as they do on the site, so editing the site's CSS tokens updates
// Storybook too.
const THEMES = ['dark', 'light', 'red', 'evil'] as const

const withTheme: Decorator = (Story, context) => {
  const theme = (context.globals.theme as string) ?? 'dark'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return <Story />
}

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Satūs theme',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: THEMES.map((value) => ({ value, title: value })),
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(?<colorField>background|color)$/i,
        date: /(?<dateField>Date)$/i,
      },
    },
  },
}

export default preview

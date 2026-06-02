import type { Preview } from '@storybook/react'
import '../lib/styles/css/index.css'

const preview: Preview = {
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

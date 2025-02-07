import cn from 'clsx'
import { StyleVariables } from '~/libs/style-variables'
import { colors, themes } from '~/styles/config'
import '~/styles/css/index.css'
import { fontsClassName } from '~/styles/fonts'

/** @type { import('@storybook/react').Preview } */
const preview = {
  decorators: [
    (Story) => (
      <>
        <head>
          <StyleVariables colors={colors} themes={themes} />
        </head>
        <div
          className={cn(fontsClassName, 'theme-light')}
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <Story />
        </div>
      </>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview

import { fonts } from 'app/fonts'
import cn from 'clsx'
import { StyleVariables } from 'libs/style-variables'
import { colors, themes } from 'styles/config'
import 'styles/global.scss'

/** @type { import('@storybook/react').Preview } */
const preview = {
  decorators: [
    (Story) => (
      <>
        <head>
          <StyleVariables colors={colors} themes={themes} />
        </head>
        <div
          className={cn(fonts?.className, 'theme-light')}
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

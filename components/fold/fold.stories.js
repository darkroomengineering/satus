import cn from 'clsx'
import Lenis from 'lenis/react'
import { Fold } from '.'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'UI/Fold',
  decorators: [
    (Story) => (
      <Lenis
        style={{
          height: '100vh',
          overflowY: 'auto',
          fontSize: '5vw',
        }}
      >
        <div>
          <Story />
        </div>
      </Lenis>
    ),
  ],
  component: Fold,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'fullscreen',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    type: {
      table: {
        disable: true,
      },
    },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: {
    ...Fold.defaultProps,
    children:
      'Lorem ipsum dolor sit amet consectetur adipisicing elit. Illum saepe quae repellendus, blanditiis nam doloremque corporis dolore error laboriosam fugiat architecto inventore facilis deserunt at libero! Beatae consequatur amet exercitationem? Lorem ipsum dolor sit amet consectetur adipisicing elit. Illum saepe quae repellendus, blanditiis nam doloremque corporis dolore error laboriosam fugiat architecto inventore facilis deserunt at libero! Beatae consequatur amet exercitationem? Lorem ipsum dolor sit amet consectetur adipisicing elit. Illum saepe quae repellendus, blanditiis nam doloremque corporis dolore error laboriosam fugiat architecto inventore facilis deserunt at libero! Beatae consequatur amet exercitationem?',
  },
}

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Bottom = {
  render: ({ children, ...props }) => (
    <>
      <Fold {...props} className={cn('theme-light')}>
        <div
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-secondary)',
            padding: '64px 24px',
          }}
        >
          {children}
        </div>
      </Fold>
      <div
        className={cn('theme-dark')}
        style={{
          backgroundColor: 'var(--theme-primary)',
          color: 'var(--theme-secondary)',
          padding: '64px 24px',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </>
  ),
  args: {
    disabled: false,
    overlay: false,
    parallax: false,
  },
}

export const Top = {
  render: ({ children, ...props }) => (
    <>
      <div
        className={cn('theme-light')}
        style={{
          backgroundColor: 'var(--theme-primary)',
          color: 'var(--theme-secondary)',
          padding: '64px 24px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </div>
      <Fold {...props} type="top" className={cn('theme-dark')}>
        <div
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-secondary)',
            padding: '64px 24px',
          }}
        >
          {children}
        </div>
      </Fold>
    </>
  ),
  args: {},
}

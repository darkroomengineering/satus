import Lenis from 'lenis/react'
import { ProgressText } from '.'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'UI/ProgressText',
  component: ProgressText,
  decorators: [
    (Story) => (
      <Lenis
        style={{
          height: '100vh',
          overflowY: 'auto',
          fontSize: '5vw',
        }}
      >
        <div style={{ padding: '250px 0' }}>
          <Story />
        </div>
      </Lenis>
    ),
  ],
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'fullscreen',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {},
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: {},
}

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default = {
  render: ({ children, ...props }) => (
    <>
      <ProgressText
        transition="600ms opacity ease-out"
        onChange={(node, value) => {
          node.style.opacity = value ? 1 : 0.33
        }}
        {...props}
      >
        {children}
      </ProgressText>
    </>
  ),
  args: {
    children:
      'Ordo universi semper mutat, et omnia fluxa sunt perpetuo. Lorem ipsum dolor sit amet consectetur adipisicing elit. Illum saepe quae repellendus, blanditiis nam doloremque corporis dolore error laboriosam fugiat architecto inventore facilis deserunt at libero! Beatae consequatur amet exercitationem? Lorem ipsum dolor sit amet consectetur adipisicing elit. Illum saepe quae repellendus, blanditiis nam doloremque corporis dolore error laboriosam fugiat architecto inventore facilis deserunt at libero! Beatae consequatur amet exercitationem? Lorem ipsum dolor sit amet consectetur adipisicing elit. Illum saepe quae repellendus, blanditiis nam doloremque corporis dolore error laboriosam fugiat architecto inventore facilis deserunt at libero! Beatae consequatur amet exercitationem?',
    start: 'top top',
    end: 'bottom bottom',
    transition: '600ms opacity ease-out',
  },
}

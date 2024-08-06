import { Marquee } from '.'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'UI/Marquee',
  component: Marquee,
  decorators: [
    (Story) => (
      <div style={{ padding: '24px 0', fontSize: '5vw' }}>
        {/* 👇 Decorators in Storybook also accept a function. Replace <Story/> with Story() to enable it  */}
        <Story />
      </div>
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
  render: ({ children, ...props }) => <Marquee {...props}>{children}</Marquee>,
  args: {
    children: 'Ordo universi semper mutat, et omnia fluxa sunt perpetuo.',
    repeat: 2,
    speed: 1,
    scrollVelocity: true,
    reversed: false,
    pauseOnHover: false,
  },
}

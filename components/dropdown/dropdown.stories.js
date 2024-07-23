import { fn } from '@storybook/test'
import { Dropdown } from '.'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'UI/Dropdown',
  component: Dropdown,
  decorators: [
    (Story) => (
      <div style={{ fontSize: '1vw' }}>
        {/* 👇 Decorators in Storybook also accept a function. Replace <Story/> with Story() to enable it  */}
        <Story />
      </div>
    ),
  ],
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
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
    <Dropdown {...props}>{children}</Dropdown>
  ),
  args: {
    children: 'Ordo universi semper mutat, et omnia fluxa sunt perpetuo.',
    ...Dropdown.defaultProps,
    options: ['Option 1', 'Option 2', 'Option 3'],
    onChange: fn(),
  },
}

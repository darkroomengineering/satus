import { Select } from '.'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Components/Select',
  component: Select,
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
  render: ({ children, ...props }) => <Select {...props}>{children}</Select>,
  args: {
    ...Select.props,
    options: [
      { value: '1', label: 'Aardvark' },
      { value: '2', label: 'Cat' },
      { value: '3', label: 'Dog' },
      { value: '4', label: 'Kangaroo' },
      { value: '5', label: 'Panda' },
      { value: '6', label: 'Snake' },
    ],
  },
}

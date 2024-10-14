import { Canvas } from 'libs/webgl/components/canvas'
import { AnimatedGradient } from '.'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'UI/AnimatedGradient',
  component: AnimatedGradient,
  decorators: [
    (Story) => (
      <>
        <Canvas root style={{ backgroundColor: '#151515' }} force />
        <div
          style={{
            minHeight: '400px',
          }}
        ></div>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            overflow: 'hidden',
          }}
        >
          <Story />
        </div>
      </>
    ),
  ],
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'fullscreen',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  // tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    frequency: {
      control: { type: 'range', min: 0, max: 10, step: 0.01 },
    },
    amplitude: {
      control: { type: 'range', min: 0, max: 10, step: 0.01 },
    },
    colorAmplitude: {
      control: { type: 'range', min: 0, max: 10, step: 0.01 },
    },
    colorFrequency: {
      control: { type: 'range', min: 0, max: 10, step: 0.01 },
    },
    speed: {
      control: { type: 'range', min: 0, max: 10, step: 0.01 },
    },
    quantize: {
      control: { type: 'range', min: 0, max: 100, step: 0.01 },
    },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: {
    colors: ['#feed7a', '#ff8400', '#df91f7'],
    amplitude: 2,
    frequency: 0.33,
    colorAmplitude: 2,
    colorFrequency: 0.33,
    speed: 1,
    quantize: 0,
    flowap: true,
  },
}

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Full = {
  render: ({ ...props }) => (
    <>
      <AnimatedGradient
        style={{
          position: 'absolute',
          inset: '0',
        }}
        {...props}
      />
    </>
  ),
  args: {},
}

export const Patches = {
  render: ({ ...props }) => (
    <>
      <AnimatedGradient
        style={{
          position: 'absolute',
          width: '100%',
          top: '0',
          left: '0',
          aspectRatio: '1/1',
          transform: 'translate3d(-50%, -50%, 0)',
        }}
        radial
        {...props}
      />
      {/* <AnimatedGradient
        style={{
          position: 'absolute',
          top: '100%',
          left: '33%',
          width: '1000px',
          aspectRatio: '1/1',
          transform: 'translate3d(-50%, -50%, 0)',
        }}
        {...props}
      /> */}
      <AnimatedGradient
        style={{
          position: 'absolute',
          left: '100%',
          top: '100%',
          width: '100%',
          aspectRatio: '1/1',
          transform: 'translate3d(-50%, -50%, 0)',
        }}
        radial
        {...props}
      />
    </>
  ),
  args: {},
}

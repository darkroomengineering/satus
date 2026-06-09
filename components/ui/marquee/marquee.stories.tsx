import type { Meta, StoryObj } from '@storybook/react'
import { Marquee } from './index'

const meta = {
  title: 'UI/Marquee',
  component: Marquee,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Marquee>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div style={{ width: '100%', overflow: 'hidden', padding: '32px 0' }}>
      <Marquee speed={0.5} repeat={4}>
        <span style={{ padding: '0 16px' }}>✦ Satūs Starter Kit</span>
        <span style={{ padding: '0 16px' }}>✦ Next.js</span>
        <span style={{ padding: '0 16px' }}>✦ React 19</span>
        <span style={{ padding: '0 16px' }}>✦ Tailwind CSS v4</span>
        <span style={{ padding: '0 16px' }}>✦ Base UI</span>
        <span style={{ padding: '0 16px' }}>✦ WebGL Ready</span>
      </Marquee>
    </div>
  ),
}

export const Reversed: Story = {
  render: () => (
    <div
      style={{
        width: '100%',
        overflow: 'hidden',
        padding: '32px 0',
        opacity: 0.5,
      }}
    >
      <Marquee speed={0.3} repeat={4} reversed>
        <span style={{ padding: '0 16px' }}>→ Build Fast</span>
        <span style={{ padding: '0 16px' }}>→ Ship Faster</span>
        <span style={{ padding: '0 16px' }}>→ Scale Better</span>
        <span style={{ padding: '0 16px' }}>→ Stay Creative</span>
      </Marquee>
    </div>
  ),
}

export const DualTrack: Story = {
  name: 'Dual track (forward + reversed)',
  render: () => (
    <div style={{ width: '100%', overflow: 'hidden', padding: '32px 0' }}>
      <Marquee speed={0.5} repeat={4}>
        <span style={{ padding: '0 16px' }}>✦ Satūs Starter Kit</span>
        <span style={{ padding: '0 16px' }}>✦ Next.js</span>
        <span style={{ padding: '0 16px' }}>✦ React 19</span>
        <span style={{ padding: '0 16px' }}>✦ Tailwind CSS v4</span>
        <span style={{ padding: '0 16px' }}>✦ Base UI</span>
        <span style={{ padding: '0 16px' }}>✦ WebGL Ready</span>
      </Marquee>
      <Marquee speed={0.3} repeat={4} reversed style={{ opacity: 0.5 }}>
        <span style={{ padding: '0 16px' }}>→ Build Fast</span>
        <span style={{ padding: '0 16px' }}>→ Ship Faster</span>
        <span style={{ padding: '0 16px' }}>→ Scale Better</span>
        <span style={{ padding: '0 16px' }}>→ Stay Creative</span>
      </Marquee>
    </div>
  ),
}

export const PauseOnHover: Story = {
  render: () => (
    <div style={{ width: '100%', overflow: 'hidden', padding: '32px 0' }}>
      <Marquee speed={0.5} repeat={4} pauseOnHover>
        <span style={{ padding: '0 16px' }}>Hover to pause</span>
        <span style={{ padding: '0 16px' }}>✦ Item two</span>
        <span style={{ padding: '0 16px' }}>✦ Item three</span>
        <span style={{ padding: '0 16px' }}>✦ Item four</span>
      </Marquee>
    </div>
  ),
}

import { addons } from 'storybook/manager-api'
import { create } from 'storybook/theming'

// Brand the Storybook UI to match Satūs. Values mirror the brand palette in
// lib/styles/colors.ts (red #e30613, dark = black/white) and --line from
// global.css. The story canvas tracks the site's CSS tokens live; this manager
// chrome is build-time JS, so update it here if the brand palette changes.
const satus = create({
  base: 'dark',
  brandTitle: 'Satūs',
  brandUrl: 'https://github.com/darkroomengineering/satus',

  colorPrimary: '#e30613',
  colorSecondary: '#e30613',

  appBg: '#000000',
  appContentBg: '#000000',
  appPreviewBg: '#000000',
  appBorderColor: 'rgba(255, 255, 255, 0.14)',
  appBorderRadius: 6,

  textColor: '#ffffff',
  textMutedColor: 'rgba(255, 255, 255, 0.55)',

  barBg: '#000000',
  barTextColor: 'rgba(255, 255, 255, 0.55)',
  barSelectedColor: '#ffffff',
  barHoverColor: '#e30613',

  inputBg: '#000000',
  inputBorder: 'rgba(255, 255, 255, 0.14)',
  inputTextColor: '#ffffff',
  inputBorderRadius: 4,

  fontCode: 'ui-monospace, SFMono-Regular, Menlo, monospace',
})

addons.setConfig({ theme: satus })

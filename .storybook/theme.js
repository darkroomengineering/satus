import { create } from '@storybook/theming/create'

export default create({
  brandTitle: 'Satūs',
  brandUrl: 'https://satus.darkroom.engineering/',
  brandImage: 'https://satus.darkroom.engineering/images/darkroom.svg',
  brandTarget: '_self',
  base: 'light',

  //
  colorPrimary: '#E30613',
  colorSecondary: '#585C6D',

  // UI
  appBg: '#ffffff',
  appContentBg: '#ffffff',
  appPreviewBg: '#ffffff',
  appBorderRadius: 2,

  // Text colors
  textColor: '#10162F',
  textInverseColor: '#ffffff',

  // Toolbar default and active colors
  barTextColor: '#9E9E9E',
  barSelectedColor: '#585C6D',
  barHoverColor: '#585C6D',
  barBg: '#ffffff',

  // Form colors
  inputBg: '#ffffff',
  inputBorder: '#10162F',
  inputTextColor: '#10162F',
  inputBorderRadius: 2,
})

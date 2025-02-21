import type { Config } from '../config'
import { scalingCalc } from './utils'

export function generateTailwind({
  breakpoints,
  colors,
  fonts,
  themes,
  typography,
}: Pick<Config, 'breakpoints' | 'colors' | 'fonts' | 'themes' | 'typography'>) {
  // Theme
  const theme = `/** Custom theme **/
@theme {
	--breakpoint-*: initial;
	${Object.entries(breakpoints)
    .map(([name, value]) => `--breakpoint-${name}: ${value}px;`)
    .join('\n\t')}

  --color-*: initial;
	${Object.entries(Object.entries(themes)[0][1])
    .map(([key, value]) => `--color-${key}: ${value};`)
    .join('\n\t')}
  ${Object.entries(colors)
    .map(([key, value]) => `--color-${key}: ${value};`)
    .join('\n\t')}
    
  --spacing: 0.25rem;
	--spacing-page: var(--space);
	--spacing-gap: var(--gap);

  --font-*: initial;
  ${Object.entries(fonts)
    .map(([name, variableName]) => `--font-${name}: var(${variableName});`)
    .join('\n\t')}
}`

  // Theme overwrites
  const themeOverwrites = `
/** Custom theme overwrites **/
${Object.entries(themes)
  .map(
    ([name, value]) => `[data-theme=${name}] {
  ${Object.entries(value)
    .map(([key, value]) => `--color-${key}: ${value};`)
    .join('\n\t')}
}`
  )
  .join('\n')}
  `

  // Utilities
  const utilities = `
/** Custom static utilities **/
${Object.entries(typography)
  .map(
    ([name, value]) => `@utility ${name} {
  ${Object.entries(value)
    .map(([key, value]) => {
      if (key === 'font-size') {
        if (typeof value === 'number') {
          return `@apply stext-${value};`
        }

        return [
          `font-size: ${scalingCalc(value.mobile)};`,
          `@variant dt { font-size: ${scalingCalc(value.desktop)}; }`,
        ].join('\n\t')
      }

      return `${key}: ${value};`
    })
    .join('\n\t')}
}`
  )
  .join('\n')}

@utility desktop-only {
  @media (--mobile) {
    display: none !important;
  }
}

@utility mobile-only {
  @media (--desktop) {
    display: none !important;
  }
}

@utility design-grid {
	display: grid;
	grid-template-columns: repeat(var(--columns), 1fr);
	gap: var(--gap);
}

@utility layout-block {
	margin-inline: auto;
	width: calc(100% - 2 * var(--space));
}

@utility layout-block-inner {
	padding-inline: var(--space);
	width: 100%;
}

@utility layout-grid {
	@apply layout-block design-grid;
}

@utility layout-grid-inner {
	@apply layout-block-inner design-grid;
}`

  // Variants
  const variants = `
/** Custom variants **/
${Object.keys(themes)
  .map(
    (name) =>
      `@custom-variant ${name} (&:where([data-theme=${name}], [data-theme=${name} *]));`
  )
  .join('\n')}`

  return [theme, themeOverwrites, utilities, variants].join('\n')
}

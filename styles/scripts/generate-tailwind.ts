import type { Config } from '../config'
import { formatObject, scalingCalc } from './utils'

export function generateTailwind({
  breakpoints,
  colors,
  customSizes,
  easings,
  fonts,
  themes,
  typography,
}: Pick<
  Config,
  | 'breakpoints'
  | 'colors'
  | 'customSizes'
  | 'easings'
  | 'fonts'
  | 'themes'
  | 'typography'
>) {
  // Theme
  const theme = `/** Custom theme **/
@theme {
	--breakpoint-*: initial;
	${formatObject(breakpoints, ([name, value]) => `--breakpoint-${name}: ${value}px;`)}

  --color-*: initial;
	${formatObject(Object.entries(themes)[0][1], ([key, value]) => `--color-${key}: ${value};`)}
  ${formatObject(colors, ([key, value]) => `--color-${key}: ${value};`)}
    
  --spacing-*: initial;
	--spacing-page: var(--space);
	--spacing-gap: var(--gap);
  ${formatObject(customSizes, ([key]) => `--spacing-${key}: var(--${key});`)}

  --font-*: initial;
  ${formatObject(fonts, ([name, variableName]) => `--font-${name}: var(${variableName});`)}

  --ease-*: initial;
  ${formatObject(easings, ([name, value]) => `--ease-${name}: ${value};`)}
}`

  // Theme overwrites
  const themeOverwrites = `
/** Custom theme overwrites **/
${formatObject(
  themes,
  ([name, value]) => `[data-theme=${name}] {
  ${formatObject(value, ([key, value]) => `--color-${key}: ${value};`)}
}`,
  '\n'
)}
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

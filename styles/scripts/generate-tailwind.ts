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
	--spacing-0: 0;
	--spacing-safe: var(--safe);
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
    .filter((entry) => entry?.[0] && entry?.[1])
    .filter((entry) => entry !== undefined)
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

      if (typeof value === 'object') {
        return [
          `${key}: ${value.mobile};`,
          `@variant dt { ${key}: ${value.desktop}; }`,
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

@utility dr-grid {
	display: grid;
	grid-template-columns: repeat(var(--columns), 1fr);
	column-gap: var(--gap);
}

@utility dr-layout-block {
	margin-inline: auto;
  width: calc(100% - 2 * var(--safe));
}

@utility dr-layout-block-inner {
	padding-inline: var(--safe);
	width: 100%;
}

@utility dr-layout-grid {
	@apply dr-layout-block dr-grid;
}

@utility dr-layout-grid-inner {
	@apply dr-layout-block-inner dr-grid;
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

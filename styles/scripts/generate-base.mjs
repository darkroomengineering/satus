export function generateBase({
  breakpoints,
  colors,
  easings,
  fontFamilies,
  headerHeight,
  layout,
  screens,
  themes,
  typeStyles,
}) {
  return `@theme {
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
	--spacing-page: var(--device-space);
	--spacing-gap: var(--device-gap);

  --font-*: initial;
  ${Object.entries(fontFamilies)
    .map(([key, value]) => `--font-${key}: ${value};`)
    .join('\n\t')}
}

:root {
	${Object.entries(screens)
    .map(
      ([name, { width, height }]) =>
        `--${name}-width: ${width};\n\t--${name}-height: ${height};`
    )
    .join('\n\n\t')}

	${Object.entries(layout)
    .map(([name, { mobile, desktop }]) => {
      if (name === 'columns') {
        return `--mobile-columns: ${fluidCalc(mobile)};\n\t--desktop-columns: ${fluidCalc(desktop)};`
      }

      if (name === 'gap') {
        return `--mobile-gap: ${fluidCalc(mobile)};\n\t--desktop-gap: ${fluidCalc(desktop)};`
      }

      if (name === 'space') {
        return `--mobile-space: ${fluidCalc(mobile)};\n\t--desktop-space: ${fluidCalc(desktop)};`
      }
    })
    .join('\n\n\t')}

  ${Object.entries(headerHeight)
    .map(([name, value]) => `--${name}-header-height: ${fluidCalc(value)};`)
    .join('\n\t')}

	--device-width: var(--mobile-width);
	--device-height: var(--mobile-height);
	--device-columns: var(--mobile-columns);
	--device-gap: var(--mobile-gap);
	--device-space: var(--mobile-space);
	--header-height: var(--mobile-header-height);

  ${Object.entries(easings)
    .map(([name, value]) => `--ease-${name}: ${value};`)
    .join('\n\t')}

	@variant dt {
		--device-width: var(--desktop-width);
		--device-height: var(--desktop-height);
		--device-columns: var(--desktop-columns);
		--device-gap: var(--desktop-gap);
		--device-space: var(--desktop-space);
		--header-height: var(--desktop-header-height);
	}
}

${Object.entries(typeStyles)
  .map(
    ([name, value]) => `@utility ${name} {
  ${Object.entries(value)
    .map(([key, value]) => {
      if (key === 'font-size') {
        return `@apply stext-${value};`
      }

      return `${key}: ${value};`
    })
    .join('\n\t')}
}`
  )
  .join('\n')}

@utility design-grid {
	display: grid;
	grid-template-columns: repeat(var(--device-columns), 1fr);
	gap: var(--device-gap);
}

@utility layout-block {
	margin-inline: auto;
	width: calc(100% - 2 * var(--device-margin));
}

@utility layout-block-inner {
	padding-inline: var(--device-margin);
	width: 100%;
}

@utility layout-grid {
	@apply layout-block design-grid;
}

@utility layout-grid-inner {
	@apply layout-block-inner design-grid;
}

${Object.keys(themes)
  .map(
    (name) =>
      `@custom-variant ${name} (&:where([data-theme=${name}], [data-theme=${name} *]));`
  )
  .join('\n')}`
}

function fluidCalc(value) {
  return `calc(((${value} * 100) / var(--device-width)) * 1vw)`
}

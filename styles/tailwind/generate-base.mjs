export function generateBase({
  breakpoints,
  layout,
  screens,
  themes,
  typeStyles,
}) {
  console.log(breakpoints, layout, screens, themes, typeStyles)

  return `@theme {
	--breakpoint-*: initial;
	${Object.entries(breakpoints)
    .map(([name, value]) => `--breakpoint-${name}: ${value}px;`)
    .join('\n\t')}

  --color-*: initial;
	${Object.entries(Object.entries(themes)[0][1])
    .map(([key, value]) => `--color-${key}: ${value};`)
    .join('\n\t')}
    
  --spacing: 0.25rem;
	--spacing-space: var(--device-space);
	--spacing-gap: var(--device-gap);

  --font-*: initial;
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
  .join('\n\t\t')}
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
  .join('\n')}

:root {
	${Object.entries(screens)
    .map(
      ([name, { width, height }]) =>
        `--${name}-width: ${width};\n\t--${name}-height: ${height};`
    )
    .join('\n\t')}

	${Object.entries(layout)
    .map(([name, [mobile, desktop]]) => {
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
    .join('\n')}

	--max-width: 9999;

	--device-width: var(--mobile-width);
	--device-columns: var(--mobile-columns);
	--device-gap: var(--mobile-gap);
	--device-space: var(--mobile-space);

	@variant dt {
		--device-width: var(--desktop-width);
		--device-columns: var(--desktop-columns);
		--device-gap: var(--desktop-gap);
		--device-space: var(--desktop-space);
	}
}`
}

function fluidCalc(value) {
  return `calc(((${value} * 100) / var(--device-width)) * 1vw)`
}

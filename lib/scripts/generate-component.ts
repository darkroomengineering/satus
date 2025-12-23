#!/usr/bin/env bun
/**
 * Generate Component Module
 *
 * Generates new components with pre-configured templates through interactive prompts.
 * Used by the unified generator: `bun run generate`
 */

import * as p from '@clack/prompts'

interface ComponentOptions {
  client?: boolean
  category?: string
}

export interface ComponentConfig {
  path: string
  options: ComponentOptions
}

/**
 * Interactive prompts for component configuration
 */
export const promptComponentConfig = async (): Promise<ComponentConfig> => {
  const category = await p.select({
    message: 'Which category should this component belong to?',
    options: [
      {
        value: 'ui',
        label: 'UI Components',
        hint: 'Reusable primitives (buttons, inputs, etc.)',
      },
      {
        value: 'layout',
        label: 'Layout Components',
        hint: 'Site structure (navigation, footer, etc.)',
      },
      {
        value: 'effects',
        label: 'Effects Components',
        hint: 'Animations and visual enhancements',
      },
      {
        value: 'blocks',
        label: 'Block Components',
        hint: 'Pre-built page sections',
      },
    ],
  })

  if (p.isCancel(category)) {
    p.cancel('Component generation cancelled')
    process.exit(0)
  }

  const name = await p.text({
    message: 'What should the component be called?',
    placeholder: 'button, hero-section, animated-text',
    validate: (value) => {
      if (!value) return 'Component name is required'
      if (!/^[a-z][a-z0-9-]*$/.test(value)) {
        return 'Component name must be kebab-case (lowercase with hyphens)'
      }
      return undefined
    },
  })

  if (p.isCancel(name)) {
    p.cancel('Component generation cancelled')
    process.exit(0)
  }

  const componentPath = `${category}/${name}`

  const isClientComponent = await p.confirm({
    message: "Should this be a client component ('use client')?",
    initialValue: false,
  })

  if (p.isCancel(isClientComponent)) {
    p.cancel('Component generation cancelled')
    process.exit(0)
  }

  return {
    path: componentPath,
    options: {
      client: isClientComponent,
      category,
    },
  }
}

/**
 * Generate component index.tsx content
 */
const generateComponentContent = (
  componentName: string,
  options: ComponentOptions
): string => {
  const { client } = options

  // Convert kebab-case to PascalCase
  const pascalName = componentName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

  // Get CSS class name (camelCase)
  const cssClassName = componentName
    .split('-')
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join('')

  const directive = client ? "'use client'\n\n" : ''

  return `${directive}import cn from 'clsx'
import type { HTMLAttributes } from 'react'
import s from './${componentName}.module.css'

interface ${pascalName}Props extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

export function ${pascalName}({
  children,
  className,
  ...props
}: ${pascalName}Props) {
  return (
    <div className={cn(s.${cssClassName}, className)} {...props}>
      {children}
    </div>
  )
}
`
}

/**
 * Generate CSS module content
 */
const generateCssContent = (componentName: string): string => {
  // Convert kebab-case to camelCase for CSS class
  const cssClassName = componentName
    .split('-')
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join('')

  return `/* ${componentName}.module.css */

.${cssClassName} {
  /* Add your component styles here */
}
`
}

/**
 * Generate README.md content
 */
const generateReadmeContent = (
  componentName: string,
  componentPath: string
): string => {
  // Convert kebab-case to PascalCase
  const pascalName = componentName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

  return `# ${pascalName}

## Overview

Brief description of the ${componentName} component.

## Usage

\`\`\`tsx
import { ${pascalName} } from '~/components/${componentPath}'

<${pascalName}>
  Your content here
</${pascalName}>
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`children\` | \`React.ReactNode\` | - | Component content |
| \`className\` | \`string\` | - | Additional CSS classes |

## Examples

### Basic Usage

\`\`\`tsx
<${pascalName}>
  <h2>Title</h2>
  <p>Description</p>
</${pascalName}>
\`\`\`

### With Custom Styling

\`\`\`tsx
<${pascalName} className="custom-class">
  Custom styled content
</${pascalName}>
\`\`\`
`
}

/**
 * Update barrel export file
 */
const updateBarrelExport = async (
  componentPath: string,
  componentName: string
): Promise<void> => {
  const pathParts = componentPath.split('/')
  const category = pathParts[0]
  const barrelPath = `components/${category}/index.ts`

  try {
    // Check if barrel file exists
    const file = Bun.file(barrelPath)
    const exists = await file.exists()

    if (!exists) {
      // Create new barrel file
      const content = `// ${category.charAt(0).toUpperCase() + category.slice(1)} Components
// Import from '~/components/${category}' or '~/components/${category}/[component]'

export * from './${componentName}'
`
      await Bun.write(barrelPath, content)
      p.log.success(`Generated barrel export: ${barrelPath}`)
      return
    }

    // Update existing barrel file
    const content = await file.text()

    // Check if already exported
    if (content.includes(`from './${componentName}'`)) {
      p.log.warn(`Component already generated in ${barrelPath}`)
      return
    }

    // Add export (find a good place to insert)
    const lines = content.split('\n')
    const exportLines = lines.filter((line) => line.includes('export'))

    if (exportLines.length > 0) {
      // Insert after the last export
      const lastExportIndex = lines.lastIndexOf(
        exportLines[exportLines.length - 1]
      )
      lines.splice(lastExportIndex + 1, 0, `export * from './${componentName}'`)
    } else {
      // Append at end
      lines.push(`export * from './${componentName}'`)
    }

    await Bun.write(barrelPath, lines.join('\n'))
    p.log.success(`Generated barrel export: ${barrelPath}`)
  } catch (error) {
    p.log.warn(
      `Could not generate barrel export: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Generate component files and directories
 */
export const createComponent = async (
  componentPath: string,
  options: ComponentOptions
): Promise<void> => {
  const s = p.spinner()

  try {
    const pathParts = componentPath.split('/')
    const componentName = pathParts[pathParts.length - 1]

    // Validate component name
    if (!/^[a-z][a-z0-9-]*$/.test(componentName)) {
      throw new Error(
        'Component name must be kebab-case (lowercase with hyphens)'
      )
    }

    // Create directory structure
    const componentDir = `components/${componentPath}`

    s.start(`Generating component "${componentPath}"`)

    // Create component directory
    await Bun.$`mkdir -p ${componentDir}`.quiet()

    // Generate and write files
    const componentContent = generateComponentContent(componentName, options)
    const cssContent = generateCssContent(componentName)
    const readmeContent = generateReadmeContent(componentName, componentPath)

    await Bun.write(`${componentDir}/index.tsx`, componentContent)
    await Bun.write(`${componentDir}/${componentName}.module.css`, cssContent)
    await Bun.write(`${componentDir}/README.md`, readmeContent)

    s.stop(`Component "${componentPath}" generated successfully!`)

    // Show what was created
    p.log.success(`Created files:`)
    p.log.message(`  📄 ${componentDir}/index.tsx`)
    p.log.message(`  🎨 ${componentDir}/${componentName}.module.css`)
    p.log.message(`  📚 ${componentDir}/README.md`)

    // Try to update barrel exports
    await updateBarrelExport(componentPath, componentName)

    const pascalName = componentName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')

    p.note(
      `Next steps:\n` +
        `  1. Customize ${componentDir}/index.tsx\n` +
        `  2. Style in ${componentDir}/${componentName}.module.css\n` +
        `  3. Update ${componentDir}/README.md\n` +
        `  4. Import: \`import { ${pascalName} } from '~/components/${componentPath}'\``
    )
  } catch (error) {
    s.stop(`Failed to create component "${componentPath}"`)
    throw error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Main CLI function
 */

// Export functions for use by unified create script

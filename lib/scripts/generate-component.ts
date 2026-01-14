#!/usr/bin/env bun
/**
 * Generate Component Module
 *
 * Generates new components with pre-configured templates through interactive prompts.
 * Used by the unified generator: `bun run generate`
 *
 * Cross-platform compatible (Windows, macOS, Linux)
 */

import * as p from '@clack/prompts'
import { createDir } from './utils'

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
 * Convert kebab-case to PascalCase
 */
const toPascalCase = (str: string): string =>
  str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

/**
 * Convert kebab-case to camelCase
 */
const toCamelCase = (str: string): string =>
  str
    .split('-')
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join('')

/**
 * Generate component index.tsx content
 */
const generateComponentContent = (
  componentName: string,
  options: ComponentOptions
): string => {
  const { client } = options
  const pascalName = toPascalCase(componentName)
  const cssClassName = toCamelCase(componentName)
  const directive = client ? `'use client'\n\n` : ''

  return `${directive}import cn from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'
import s from './${componentName}.module.css'

interface ${pascalName}Props extends HTMLAttributes<HTMLDivElement> {
  /** Component content */
  children?: ReactNode
}

/**
 * ${pascalName} component.
 *
 * @example
 * \`\`\`tsx
 * import { ${pascalName} } from '@/components/${options.category}/${componentName}'
 *
 * <${pascalName}>
 *   Content here
 * </${pascalName}>
 * \`\`\`
 */
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
  const cssClassName = toCamelCase(componentName)

  return `/* ${componentName}.module.css */

.${cssClassName} {
  /* Add your component styles here */
}
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
  const category = pathParts[0] ?? 'components'
  const barrelPath = `components/${category}/index.ts`
  const pascalName = toPascalCase(componentName)

  try {
    // Check if barrel file exists
    const file = Bun.file(barrelPath)
    const exists = await file.exists()

    if (!exists) {
      // Create new barrel file with header comment based on category
      const categoryTitles: Record<string, string> = {
        ui: 'UI Primitives - Reusable across any project',
        layout: 'Layout Components - Site chrome (customize per project)',
        effects: 'Effects Components - Animations and visual enhancements',
        blocks: 'Block Components - Pre-built page sections',
      }

      const header =
        categoryTitles[category] || `${toPascalCase(category)} Components`
      const content = `// ${header}
// Import from '@/components/${category}' or '@/components/${category}/[component]'

export { ${pascalName} } from './${componentName}'
`
      await Bun.write(barrelPath, content)
      p.log.success(`Created barrel export: ${barrelPath}`)
      return
    }

    // Update existing barrel file
    const content = await file.text()

    // Check if already exported
    if (content.includes(`from './${componentName}'`)) {
      p.log.warn(`Component already exported in ${barrelPath}`)
      return
    }

    // Add export at the end, maintaining the file's style
    const lines = content.split('\n')

    // Find the last non-empty line to append after
    let insertIndex = lines.length
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i]?.trim()) {
        insertIndex = i + 1
        break
      }
    }

    // Insert the new export
    lines.splice(
      insertIndex,
      0,
      `export { ${pascalName} } from './${componentName}'`
    )

    await Bun.write(barrelPath, lines.join('\n'))
    p.log.success(`Updated barrel export: ${barrelPath}`)
  } catch (error) {
    p.log.warn(
      `Could not update barrel export: ${error instanceof Error ? error.message : String(error)}`
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
    const componentName = pathParts[pathParts.length - 1] ?? ''

    // Validate component name
    if (!/^[a-z][a-z0-9-]*$/.test(componentName)) {
      throw new Error(
        'Component name must be kebab-case (lowercase with hyphens)'
      )
    }

    // Create directory structure
    const componentDir = `components/${componentPath}`

    s.start(`Generating component "${componentPath}"`)

    // Create component directory (cross-platform)
    await createDir(componentDir)

    // Generate and write files
    const componentContent = generateComponentContent(componentName, options)
    const cssContent = generateCssContent(componentName)

    await Bun.write(`${componentDir}/index.tsx`, componentContent)
    await Bun.write(`${componentDir}/${componentName}.module.css`, cssContent)

    s.stop(`Component "${componentPath}" generated successfully!`)

    // Show what was created
    p.log.success(`Created files:`)
    p.log.message(`  📄 ${componentDir}/index.tsx`)
    p.log.message(`  🎨 ${componentDir}/${componentName}.module.css`)

    // Try to update barrel exports
    await updateBarrelExport(componentPath, componentName)

    const pascalName = toPascalCase(componentName)

    p.note(
      `Next steps:\n` +
        `  1. Customize ${componentDir}/index.tsx\n` +
        `  2. Style in ${componentDir}/${componentName}.module.css\n` +
        `  3. Import: \`import { ${pascalName} } from '@/components/${componentPath}'\``
    )
  } catch (error) {
    s.stop(`Failed to create component "${componentPath}"`)
    throw error instanceof Error ? error : new Error(String(error))
  }
}

// Export functions for use by unified create script

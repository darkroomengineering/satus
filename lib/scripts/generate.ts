#!/usr/bin/env bun
/**
 * Satūs Generator CLI
 *
 * Interactive scaffolding for new pages and components.
 * Generates pre-configured templates following project conventions.
 *
 * Usage:
 *   bun run generate
 *
 * Options:
 *   - Page: Creates route with layout, metadata, and optional integrations
 *   - Component: Creates UI component with CSS module and barrel export
 */

import * as p from '@clack/prompts'
import { createComponent, promptComponentConfig } from './generate-component'
// Import the existing generators
import { createPage, promptPageConfig } from './generate-page'

/**
 * Main CLI function
 */
const main = async (): Promise<void> => {
  console.clear()

  p.intro('Satūs Generator')

  // Ask what to create
  const createType = await p.select({
    message: 'What would you like to generate?',
    options: [
      {
        value: 'page',
        label: 'Page',
        hint: 'New route/page with layout and components',
      },
      {
        value: 'component',
        label: 'Component',
        hint: 'New reusable UI component',
      },
    ],
  })

  if (p.isCancel(createType)) {
    p.cancel('Generation cancelled')
    process.exit(0)
  }

  try {
    if (createType === 'page') {
      // Get page configuration through interactive prompts
      const { name: pageName, options } = await promptPageConfig()

      // Create the page
      await createPage(pageName, options)
    } else if (createType === 'component') {
      // Get component configuration through interactive prompts
      const { path: componentPath, options } = await promptComponentConfig()

      // Create the component
      await createComponent(componentPath, options)
    }

    p.outro('Generation completed successfully! 🚀')
  } catch (error) {
    p.log.error(
      `Generation failed: ${error instanceof Error ? error.message : String(error)}`
    )
    process.exit(1)
  }
}

// Run the CLI
main().catch((err) => {
  p.log.error(`Unexpected error: ${err.message}`)
  process.exit(1)
})

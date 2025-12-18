#!/usr/bin/env bun
/**
 * Unified Create CLI
 *
 * Generate new pages or components with pre-configured templates through interactive prompts
 *
 * Usage:
 *   bun run create
 */

import * as p from '@clack/prompts'
import { createComponent, promptComponentConfig } from './create-component'
// Import the existing generators
import { createPage, promptPageConfig } from './create-page'

/**
 * Main CLI function
 */
const main = async (): Promise<void> => {
  console.clear()

  p.intro('Satūs Creator')

  // Ask what to create
  const createType = await p.select({
    message: 'What would you like to create?',
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
    p.cancel('Creation cancelled')
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

    p.outro('Creation completed successfully! 🚀')
  } catch (error) {
    p.log.error(
      `Creation failed: ${error instanceof Error ? error.message : String(error)}`
    )
    process.exit(1)
  }
}

// Run the CLI
main().catch((err) => {
  p.log.error(`Unexpected error: ${err.message}`)
  process.exit(1)
})

#!/usr/bin/env bun
/**
 * Page Generator CLI
 *
 * Generate new pages with pre-configured templates through interactive prompts
 *
 * Usage:
 *   bun run create:page
 */

import * as p from '@clack/prompts'

interface PageOptions {
  webgl?: boolean
  sanity?: boolean
  shopify?: boolean
  theme?: string
  css?: boolean
}

export interface PageConfig {
  name: string
  options: PageOptions
}

/**
 * Interactive prompts for page configuration
 */
export const promptPageConfig = async (): Promise<PageConfig> => {
  const name = await p.text({
    message: 'What should the page be called?',
    placeholder: 'about, contact, products',
    validate: (value) => {
      if (!value) return 'Page name is required'
      if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(value)) {
        return 'Page name must start with a letter and contain only letters, numbers, hyphens, and underscores'
      }
      return undefined
    },
  })

  if (p.isCancel(name)) {
    p.cancel('Page creation cancelled')
    process.exit(0)
  }

  const theme = await p.select({
    message: 'Choose a theme for the page',
    options: [
      { value: 'dark', label: 'Dark (default)', hint: 'Standard dark theme' },
      { value: 'light', label: 'Light', hint: 'Light theme' },
      { value: 'red', label: 'Red', hint: 'Red accent theme' },
    ],
    initialValue: 'dark',
  })

  if (p.isCancel(theme)) {
    p.cancel('Page creation cancelled')
    process.exit(0)
  }

  const integrations = await p.multiselect({
    message: 'Which integrations should this page use?',
    options: [
      { value: 'webgl', label: 'WebGL Canvas', hint: 'Enable 3D graphics' },
      { value: 'sanity', label: 'Sanity CMS', hint: 'Content management' },
      { value: 'shopify', label: 'Shopify', hint: 'E-commerce' },
    ],
    required: false,
  })

  if (p.isCancel(integrations)) {
    p.cancel('Page creation cancelled')
    process.exit(0)
  }

  const includeCss = await p.confirm({
    message: 'Include a CSS module file?',
    initialValue: false,
  })

  if (p.isCancel(includeCss)) {
    p.cancel('Page creation cancelled')
    process.exit(0)
  }

  return {
    name,
    options: {
      theme,
      webgl: integrations.includes('webgl'),
      sanity: integrations.includes('sanity'),
      shopify: integrations.includes('shopify'),
      css: includeCss,
    },
  }
}

/**
 * Generate page.tsx content
 */
const generatePageContent = (
  pageName: string,
  options: PageOptions
): string => {
  const { webgl, sanity, shopify, theme = 'dark' } = options

  // Capitalize first letter for title
  const title = pageName.charAt(0).toUpperCase() + pageName.slice(1)

  let imports = `import { Wrapper } from '~/components/layout/wrapper'`
  let content = `<section className="dr-py-100">\n  <div className="container">\n    <h1>${title}</h1>\n    {/* Your content here */}\n  </div>\n</section>`

  // Add conditional imports and content based on options
  if (sanity) {
    imports += `\nimport { sanityFetch } from '~/integrations/sanity/live'`
    imports += `\nimport { RichText } from '~/integrations/sanity'`
    content += `\n\n{/* Sanity CMS content */}\n{/* const { data } = await sanityFetch({ query: pageQuery }) */}`
  }

  if (shopify) {
    imports += `\nimport { Cart } from '~/integrations/shopify/cart'`
    content += `\n\n{/* Shopify integration */}\n{/* <Cart /> */}`
  }

  const wrapperProps = []
  wrapperProps.push(`theme="${theme}"`)

  if (webgl) {
    wrapperProps.push('webgl')
  }

  const wrapperPropsStr = wrapperProps.join(' ')

  return `import type { Metadata } from 'next'
${imports}

export const metadata: Metadata = {
  title: '${title}',
  description: '${title} page description',
}

export default function ${title}Page() {
  return (
    <Wrapper ${wrapperPropsStr}>
      ${content}
    </Wrapper>
  )
}
`
}

/**
 * Create page files and directories
 */
export const createPage = async (
  pageName: string,
  options: PageOptions
): Promise<void> => {
  const s = p.spinner()

  try {
    // Create directory structure
    const pageDir = `app/${pageName}`
    const componentsDir = `${pageDir}/_components`

    s.start(`Creating page structure for "${pageName}"`)

    // Create main page directory
    await Bun.$`mkdir -p ${pageDir}`.quiet()

    // Create _components subdirectory
    await Bun.$`mkdir -p ${componentsDir}`.quiet()

    // Create .gitkeep in _components
    await Bun.write(`${componentsDir}/.gitkeep`, '')

    // Generate and write page.tsx
    const pageContent = generatePageContent(pageName, options)
    await Bun.write(`${pageDir}/page.tsx`, pageContent)

    // Create CSS module if requested
    if (options.css) {
      const cssContent = `/* ${pageName}.module.css */\n\n.container {\n  /* Add your styles here */\n}\n`
      await Bun.write(`${pageDir}/${pageName}.module.css`, cssContent)
    }

    s.stop(`Page "${pageName}" created successfully!`)

    // Show what was created
    p.log.success(`Created files:`)
    p.log.message(`  📄 ${pageDir}/page.tsx`)
    p.log.message(`  📁 ${componentsDir}/`)
    if (options.css) {
      p.log.message(`  🎨 ${pageDir}/${pageName}.module.css`)
    }

    p.note(
      `Next steps:\n` +
        `  1. Customize ${pageDir}/page.tsx\n` +
        `  2. Add components to ${componentsDir}/\n` +
        `  3. Visit /${pageName} to see your page`
    )
  } catch (error) {
    s.stop(`Failed to create page "${pageName}"`)
    throw error
  }
}

// Export functions for use by unified create script

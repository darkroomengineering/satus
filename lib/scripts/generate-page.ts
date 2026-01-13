#!/usr/bin/env bun
/**
 * Generate Page Module
 *
 * Generates new pages with pre-configured templates through interactive prompts.
 * Used by the unified generator: `bun run generate`
 *
 * Cross-platform compatible (Windows, macOS, Linux)
 */

import * as p from '@clack/prompts'
import { createDir } from './utils'

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
    p.cancel('Page generation cancelled')
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
    p.cancel('Page generation cancelled')
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
    p.cancel('Page generation cancelled')
    process.exit(0)
  }

  const includeCss = await p.confirm({
    message: 'Include a CSS module file?',
    initialValue: false,
  })

  if (p.isCancel(includeCss)) {
    p.cancel('Page generation cancelled')
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

  // Build imports
  const imports: string[] = []
  imports.push(`import type { Metadata } from 'next'`)
  imports.push(`import { Wrapper } from '@/components/layout/wrapper'`)

  // Integration-specific imports
  if (sanity || shopify) {
    imports.push(
      `import { NotConfigured } from '@/components/ui/not-configured'`
    )
  }

  if (sanity) {
    imports.push(
      `import { isSanityConfigured } from '@/lib/integrations/check-integration'`
    )
    imports.push(`import { sanityFetch } from 'next-sanity/live'`)
    imports.push(
      `import { pageQuery } from '@/lib/integrations/sanity/queries'`
    )
    imports.push(
      `import type { Page } from '@/lib/integrations/sanity/sanity.types'`
    )
    imports.push(
      `import { generateSanityMetadata } from '@/lib/utils/metadata'`
    )
  }

  if (shopify) {
    imports.push(
      `import { isShopifyConfigured } from '@/lib/integrations/check-integration'`
    )
    imports.push(`import { Cart } from '@/lib/integrations/shopify/cart'`)
  }

  // Build wrapper props
  const wrapperProps: string[] = [`theme="${theme}"`]
  if (webgl) {
    wrapperProps.push('webgl')
  }

  // Build component body based on integrations
  let componentBody: string

  if (sanity && shopify) {
    // Both integrations
    componentBody = `  // Show setup instructions if integrations are not configured
  if (!isSanityConfigured()) {
    return (
      <Wrapper theme="${theme}">
        <NotConfigured integration="Sanity" />
      </Wrapper>
    )
  }

  if (!isShopifyConfigured()) {
    return (
      <Wrapper theme="${theme}">
        <NotConfigured integration="Shopify" />
      </Wrapper>
    )
  }

  const { data } = await sanityFetch({
    query: pageQuery,
    params: { slug: '${pageName}' },
  })

  return (
    <Wrapper ${wrapperProps.join(' ')}>
      <Cart>
        <section className="dr-py-100">
          <div className="container">
            <h1>${title}</h1>
            {/* Your content here */}
            {/* Use data from Sanity: {data?.title} */}
          </div>
        </section>
      </Cart>
    </Wrapper>
  )`
  } else if (sanity) {
    // Sanity only
    componentBody = `  // Show setup instructions if Sanity is not configured
  if (!isSanityConfigured()) {
    return (
      <Wrapper theme="${theme}">
        <NotConfigured integration="Sanity" />
      </Wrapper>
    )
  }

  const { data } = await sanityFetch({
    query: pageQuery,
    params: { slug: '${pageName}' },
  })

  return (
    <Wrapper ${wrapperProps.join(' ')}>
      <section className="dr-py-100">
        <div className="container">
          <h1>${title}</h1>
          {/* Your content here */}
          {/* Use data from Sanity: {data?.title} */}
        </div>
      </section>
    </Wrapper>
  )`
  } else if (shopify) {
    // Shopify only
    componentBody = `  // Show setup instructions if Shopify is not configured
  if (!isShopifyConfigured()) {
    return (
      <Wrapper theme="${theme}">
        <NotConfigured integration="Shopify" />
      </Wrapper>
    )
  }

  return (
    <Wrapper ${wrapperProps.join(' ')}>
      <Cart>
        <section className="dr-py-100">
          <div className="container">
            <h1>${title}</h1>
            {/* Your content here */}
          </div>
        </section>
      </Cart>
    </Wrapper>
  )`
  } else {
    // No integrations
    componentBody = `  return (
    <Wrapper ${wrapperProps.join(' ')}>
      <section className="dr-py-100">
        <div className="container">
          <h1>${title}</h1>
          {/* Your content here */}
        </div>
      </section>
    </Wrapper>
  )`
  }

  // Build metadata export
  let metadataExport: string
  if (sanity) {
    metadataExport = `
export async function generateMetadata(): Promise<Metadata> {
  if (!isSanityConfigured()) {
    return {
      title: '${title}',
      description: '${title} page description',
    }
  }

  const { data } = await sanityFetch({
    query: pageQuery,
    params: { slug: '${pageName}' },
  })

  if (!data) {
    return {
      title: '${title}',
      description: '${title} page description',
    }
  }

  return generateSanityMetadata({
    document: data,
    url: '/${pageName}',
    type: 'website',
  })
}`
  } else {
    metadataExport = `
export const metadata: Metadata = {
  title: '${title}',
  description: '${title} page description',
}`
  }

  // Determine if component should be async
  const isAsync = sanity || shopify

  return `${imports.join('\n')}
${metadataExport}

export default ${isAsync ? 'async ' : ''}function ${title}Page() {
${componentBody}
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

    // Create main page directory (cross-platform)
    await createDir(pageDir)

    // Create _components subdirectory (cross-platform)
    await createDir(componentsDir)

    // Create .gitkeep in _components
    await Bun.write(`${componentsDir}/.gitkeep`, '')

    // Generate and write page.tsx
    const pageContent = generatePageContent(pageName, options)
    await Bun.write(`${pageDir}/page.tsx`, pageContent)

    // Create CSS module if requested
    if (options.css) {
      const cssContent = `/* ${pageName}.module.css */

.container {
  /* Add your styles here */
}
`
      await Bun.write(`${pageDir}/${pageName}.module.css`, cssContent)
    }

    s.stop(`Page "${pageName}" generated successfully!`)

    // Show what was created
    p.log.success(`Generated files:`)
    p.log.message(`  📄 ${pageDir}/page.tsx`)
    p.log.message(`  📁 ${componentsDir}/`)
    if (options.css) {
      p.log.message(`  🎨 ${pageDir}/${pageName}.module.css`)
    }

    // Build next steps message
    const nextSteps = [`1. Customize ${pageDir}/page.tsx`]

    if (options.sanity) {
      nextSteps.push(
        `2. Create a "${pageName}" page in Sanity Studio at /studio`
      )
    }

    nextSteps.push(
      `${nextSteps.length + 1}. Add components to ${componentsDir}/`
    )
    nextSteps.push(
      `${nextSteps.length + 1}. Visit /${pageName} to see your page`
    )

    p.note(`Next steps:\n  ${nextSteps.join('\n  ')}`)
  } catch (error) {
    s.stop(`Failed to generate page "${pageName}"`)
    throw error
  }
}

// Export functions for use by unified generate script

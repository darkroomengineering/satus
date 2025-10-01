/**
 * Integration Cleanup Utilities
 *
 * Helps identify and optionally remove unused integrations from the codebase
 * to reduce bundle size and maintenance overhead.
 */

import { getUnconfiguredIntegrations } from '~/integrations/check-integration'

interface RemovalGuide {
  dirs: string[]
  pages: string[]
  notes?: string
}

export const REMOVAL_GUIDE: Record<string, RemovalGuide> = {
  Sanity: {
    dirs: ['integrations/sanity', 'app/studio'],
    pages: ['app/(pages)/sanity'],
    notes: 'Also remove Sanity imports from app/layout.tsx',
  },
  Shopify: {
    dirs: ['integrations/shopify'],
    pages: ['app/(pages)/shopify'],
    notes: 'Uninstall: @shopify/* packages',
  },
  HubSpot: {
    dirs: ['integrations/hubspot'],
    pages: ['app/(pages)/hubspot'],
    notes: 'Uninstall: @hubspot/api-client',
  },
  Mailchimp: {
    dirs: ['integrations/mailchimp'],
    pages: [],
    notes: 'Remove Mailchimp-related form handlers',
  },
  Mandrill: {
    dirs: ['integrations/mandrill'],
    pages: [],
    notes: 'Remove Mandrill-related form handlers',
  },
  Turnstile: {
    dirs: [],
    pages: [],
    notes:
      'Remove Turnstile validation from integrations/mailchimp/turnstile.ts',
  },
  Analytics: {
    dirs: [],
    pages: [],
    notes: 'Remove GoogleAnalytics and GoogleTagManager from app/layout.tsx',
  },
}

/**
 * Get removal instructions for a specific integration
 */
export function getRemovalGuide(integration: string): RemovalGuide | undefined {
  return REMOVAL_GUIDE[integration]
}

/**
 * Print cleanup instructions to console
 */
export function printCleanupInstructions() {
  console.log('\n🧹 Integration Cleanup Tool')
  console.log(`${'─'.repeat(60)}`)

  const unconfigured = getUnconfiguredIntegrations()

  if (unconfigured.length === 0) {
    console.log('✅ All integrations are configured!')
    console.log('No cleanup needed.\n')
    return
  }

  console.log('\n⚠️  The following integrations are NOT configured:')
  for (const integration of unconfigured) {
    console.log(`   - ${integration}`)
  }

  console.log(
    '\n💡 To reduce bundle size, consider removing unused integrations.'
  )
  console.log('\nManual Removal Steps:')
  console.log(`${'─'.repeat(60)}`)

  for (const integration of unconfigured) {
    const guide = REMOVAL_GUIDE[integration]
    if (!guide) continue

    console.log(`\n${integration}:`)

    if (guide.dirs.length > 0) {
      console.log('   Directories to remove:')
      for (const dir of guide.dirs) {
        console.log(`     - rm -rf ${dir}`)
      }
    }

    if (guide.pages.length > 0) {
      console.log('   Pages to remove:')
      for (const page of guide.pages) {
        console.log(`     - rm -rf ${page}`)
      }
    }

    if (guide.notes) {
      console.log(`   Notes: ${guide.notes}`)
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log('\n⚠️  Manual Review Required:')
  console.log('   - Check for imports of removed integrations')
  console.log('   - Run: bun lint to catch any broken imports')
  console.log('   - Remove unused dependencies from package.json')
  console.log('   - Update documentation and README')
  console.log('\n💡 After removing integrations, run:')
  console.log('   - bun install (to clean up dependencies)')
  console.log('   - bun lint:fix (to auto-fix import issues)')
  console.log('   - bun build (to verify build succeeds)')
  console.log(`${'─'.repeat(60)}\n`)
}

// CLI execution: Run as standalone script
if (import.meta.main) {
  printCleanupInstructions()
  process.exit(0)
}

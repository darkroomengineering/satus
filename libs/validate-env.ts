/**
 * Environment Variable Validation
 * Validates required environment variables at startup to catch configuration errors early
 */

interface EnvValidation {
  name: string
  required: boolean
  description: string
  integration?: string
}

// Define all environment variables with their requirements
const ENV_VARIABLES: EnvValidation[] = [
  // Core App
  {
    name: 'NEXT_PUBLIC_BASE_URL',
    required: false,
    description: 'Base URL for the application (defaults to localhost:3000)',
  },

  // Sanity CMS
  {
    name: 'NEXT_PUBLIC_SANITY_PROJECT_ID',
    required: false,
    description: 'Sanity project ID',
    integration: 'Sanity',
  },
  {
    name: 'NEXT_PUBLIC_SANITY_DATASET',
    required: false,
    description: 'Sanity dataset name',
    integration: 'Sanity',
  },
  {
    name: 'NEXT_PUBLIC_SANITY_STUDIO_URL',
    required: false,
    description: 'Sanity Studio URL',
    integration: 'Sanity',
  },
  {
    name: 'SANITY_API_WRITE_TOKEN',
    required: false,
    description: 'Sanity API write token for draft mode',
    integration: 'Sanity',
  },

  // Shopify
  {
    name: 'SHOPIFY_STORE_DOMAIN',
    required: false,
    description: 'Shopify store domain (e.g., your-store.myshopify.com)',
    integration: 'Shopify',
  },
  {
    name: 'SHOPIFY_STOREFRONT_ACCESS_TOKEN',
    required: false,
    description: 'Shopify Storefront API access token',
    integration: 'Shopify',
  },
  {
    name: 'SHOPIFY_REVALIDATION_SECRET',
    required: false,
    description: 'Secret for Shopify webhook validation',
    integration: 'Shopify',
  },

  // HubSpot
  {
    name: 'HUBSPOT_ACCESS_TOKEN',
    required: false,
    description: 'HubSpot API access token',
    integration: 'HubSpot',
  },
  {
    name: 'NEXT_PUBLIC_HUBSPOT_PORTAL_ID',
    required: false,
    description: 'HubSpot portal ID',
    integration: 'HubSpot',
  },

  // Mailchimp
  {
    name: 'MAILCHIMP_API_KEY',
    required: false,
    description: 'Mailchimp API key',
    integration: 'Mailchimp',
  },
  {
    name: 'MAILCHIMP_SERVER_PREFIX',
    required: false,
    description: 'Mailchimp server prefix (e.g., us1)',
    integration: 'Mailchimp',
  },
  {
    name: 'MAILCHIMP_AUDIENCE_ID',
    required: false,
    description: 'Mailchimp audience/list ID',
    integration: 'Mailchimp',
  },

  // Mandrill
  {
    name: 'MANDRILL_API_KEY',
    required: false,
    description: 'Mandrill API key',
    integration: 'Mandrill',
  },
  {
    name: 'MANDRILL_FROM_EMAIL',
    required: false,
    description: 'Mandrill sender email address',
    integration: 'Mandrill',
  },
  {
    name: 'MANDRILL_TO_EMAIL',
    required: false,
    description: 'Mandrill recipient email address',
    integration: 'Mandrill',
  },

  // Cloudflare Turnstile
  {
    name: 'NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY',
    required: false,
    description: 'Cloudflare Turnstile site key',
    integration: 'Turnstile',
  },
  {
    name: 'CLOUDFLARE_TURNSTILE_SECRET_KEY',
    required: false,
    description: 'Cloudflare Turnstile secret key',
    integration: 'Turnstile',
  },

  // Analytics
  {
    name: 'NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID',
    required: false,
    description: 'Google Tag Manager ID',
    integration: 'Analytics',
  },
  {
    name: 'NEXT_PUBLIC_GOOGLE_ANALYTICS',
    required: false,
    description: 'Google Analytics measurement ID',
    integration: 'Analytics',
  },
  {
    name: 'NEXT_PUBLIC_FACEBOOK_APP_ID',
    required: false,
    description: 'Facebook App ID for Open Graph',
    integration: 'Analytics',
  },
]

interface ValidationResult {
  valid: boolean
  missing: EnvValidation[]
  integrationStatus: Record<string, boolean>
}

export function validateEnv(
  options: { silent?: boolean } = {}
): ValidationResult {
  const missing: EnvValidation[] = []
  const integrationStatus: Record<string, boolean> = {}

  for (const envVar of ENV_VARIABLES) {
    const value = process.env[envVar.name]
    const isMissing = !value || value.trim() === ''

    if (isMissing && envVar.required) {
      missing.push(envVar)
    }

    // Track which integrations are configured
    if (envVar.integration) {
      if (!integrationStatus[envVar.integration]) {
        integrationStatus[envVar.integration] = false
      }
      if (!isMissing) {
        integrationStatus[envVar.integration] = true
      }
    }
  }

  const valid = missing.length === 0

  // Only log in development and if not silent
  if (!options.silent && process.env.NODE_ENV === 'development') {
    console.log('\n🔍 Environment Variable Check')
    console.log(`${'─'.repeat(50)}`)

    if (valid) {
      console.log('✅ All required environment variables are set')
    } else {
      console.log('❌ Missing required environment variables:')
      for (const envVar of missing) {
        console.log(`   - ${envVar.name}: ${envVar.description}`)
      }
    }

    // Show integration status
    const configuredIntegrations = Object.entries(integrationStatus)
      .filter(([, isConfigured]) => isConfigured)
      .map(([name]) => name)

    if (configuredIntegrations.length > 0) {
      console.log('\n📦 Configured Integrations:')
      for (const integration of configuredIntegrations) {
        console.log(`   ✓ ${integration}`)
      }
    }

    const unconfiguredIntegrations = Object.entries(integrationStatus)
      .filter(([, isConfigured]) => !isConfigured)
      .map(([name]) => name)

    if (unconfiguredIntegrations.length > 0) {
      console.log('\n⚠️  Unconfigured Integrations (optional):')
      for (const integration of unconfiguredIntegrations) {
        console.log(`   - ${integration}`)
      }
    }

    console.log(`${'─'.repeat(50)}\n`)
  }

  return {
    valid,
    missing,
    integrationStatus,
  }
}

// Auto-run validation on import if not in test environment
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  validateEnv()
}

// CLI execution: Run as standalone script
if (import.meta.main) {
  const result = validateEnv({ silent: false })

  if (!result.valid) {
    console.error('\n❌ Environment validation failed!')
    console.error(
      'Please check your .env.local file and ensure all required variables are set.'
    )
    console.error('See .env.example for reference.\n')
    process.exit(1)
  }

  console.log('✅ Environment validation passed!\n')
  process.exit(0)
}

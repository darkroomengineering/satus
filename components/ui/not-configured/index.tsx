import cn from 'clsx'
import { Link } from '@/components/ui/link'
import s from './not-configured.module.css'

interface NotConfiguredProps {
  /**
   * Name of the integration (e.g., 'Sanity', 'Shopify', 'HubSpot')
   */
  integration: string
  /**
   * Optional description of what the integration does
   */
  description?: string
  /**
   * Link to the integration's documentation or setup guide
   */
  docsUrl?: string
  /**
   * Environment variables required for this integration
   */
  envVars?: string[]
  /**
   * Additional CSS classes
   */
  className?: string
}

const INTEGRATION_INFO: Record<
  string,
  { description: string; docsUrl: string; envVars: string[] }
> = {
  Sanity: {
    description: 'Headless CMS with visual editing and real-time collaboration',
    docsUrl: 'https://www.sanity.io/docs',
    envVars: [
      'NEXT_PUBLIC_SANITY_PROJECT_ID',
      'NEXT_PUBLIC_SANITY_DATASET',
      'NEXT_PUBLIC_SANITY_API_READ_TOKEN',
    ],
  },
  Shopify: {
    description: 'E-commerce platform with cart and checkout functionality',
    docsUrl: 'https://shopify.dev/docs/storefronts/headless',
    envVars: ['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_STOREFRONT_ACCESS_TOKEN'],
  },
  HubSpot: {
    description: 'Marketing forms and newsletter integration',
    docsUrl: 'https://developers.hubspot.com/docs/api/overview',
    envVars: ['HUBSPOT_ACCESS_TOKEN', 'NEXT_PUBLIC_HUBSPOT_PORTAL_ID'],
  },
  Mailchimp: {
    description: 'Email marketing and newsletter subscriptions',
    docsUrl: 'https://mailchimp.com/developer/',
    envVars: [
      'MAILCHIMP_API_KEY',
      'MAILCHIMP_SERVER_PREFIX',
      'MAILCHIMP_AUDIENCE_ID',
    ],
  },
  Mandrill: {
    description: 'Transactional email service',
    docsUrl: 'https://mailchimp.com/developer/transactional/',
    envVars: ['MANDRILL_API_KEY'],
  },
}

/**
 * Displays a friendly message when an integration is not configured.
 *
 * Use this in example pages to show helpful setup instructions instead of crashing.
 *
 * @example
 * ```tsx
 * import { isSanityConfigured } from '@/integrations/check-integration'
 * import { NotConfigured } from '@/components/ui/not-configured'
 *
 * export default function SanityPage() {
 *   if (!isSanityConfigured()) {
 *     return <NotConfigured integration="Sanity" />
 *   }
 *   // ... rest of page
 * }
 * ```
 */
export function NotConfigured({
  integration,
  description,
  docsUrl,
  envVars,
  className,
}: NotConfiguredProps) {
  const info = INTEGRATION_INFO[integration]
  const finalDescription = description || info?.description
  const finalDocsUrl = docsUrl || info?.docsUrl
  const finalEnvVars = envVars || info?.envVars || []

  return (
    <div className={cn(s.container, className)}>
      <div className={s.icon}>⚙️</div>
      <h1 className={s.title}>{integration} Not Configured</h1>

      {finalDescription && <p className={s.description}>{finalDescription}</p>}

      <div className={s.instructions}>
        <h2 className={s.subtitle}>Setup Instructions</h2>
        <ol className={s.steps}>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code>
          </li>
          <li>
            Add the following environment variables:
            {finalEnvVars.length > 0 && (
              <ul className={s.envList}>
                {finalEnvVars.map((envVar) => (
                  <li key={envVar}>
                    <code>{envVar}</code>
                  </li>
                ))}
              </ul>
            )}
          </li>
          <li>Restart the development server</li>
        </ol>

        {finalDocsUrl && (
          <p className={s.docs}>
            <Link href={finalDocsUrl}>View {integration} Documentation →</Link>
          </p>
        )}
      </div>

      <div className={s.hint}>
        <strong>Hint:</strong> Run <code>bun run setup:project</code> to remove
        unused integrations.
      </div>
    </div>
  )
}

export default NotConfigured

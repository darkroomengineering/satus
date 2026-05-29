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
}

/**
 * Displays a friendly message when an integration is not configured.
 *
 * Use this in example pages to show helpful setup instructions instead of crashing.
 *
 * @example
 * ```tsx
 * import { isConfigured } from '@/integrations/registry'
 * import { NotConfigured } from '@/components/ui/not-configured'
 *
 * export default function SanityPage() {
 *   if (!isConfigured('sanity')) {
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
  const finalDescription = description ?? info?.description
  const finalDocsUrl = docsUrl ?? info?.docsUrl
  const finalEnvVars = envVars ?? info?.envVars ?? []

  return (
    <div className={cn(s.container, className)}>
      <div className={s.panel}>
        <div className={s.meta}>
          <div className={s.label}>Not Configured</div>
          <h1 className={s.title}>
            <span className={s.accent}>{integration}</span>
          </h1>
          {finalDescription && (
            <p className={s.description}>{finalDescription}</p>
          )}
        </div>

        <div className={s.instructions}>
          <div className={s.instructionsLabel}>Setup</div>
          <ol className={s.steps}>
            <li>
              Copy <code className={s.code}>.env.example</code> to{' '}
              <code className={s.code}>.env.local</code>
            </li>
            <li>Add the required environment variables:</li>
          </ol>

          {finalEnvVars.length > 0 && (
            <div className={s.envBlock}>
              {finalEnvVars.map((envVar) => (
                <div key={envVar} className={s.envVar}>
                  <code>{envVar}</code>
                </div>
              ))}
            </div>
          )}

          <ol className={s.stepsAfter} start={3}>
            <li>Restart the development server</li>
          </ol>
        </div>

        <div className={s.footer}>
          <div className={s.hint}>
            Run <code className={s.code}>bun run setup:project</code> to remove
            unused integrations.
          </div>
          {finalDocsUrl && (
            <Link href={finalDocsUrl} className={s.docsLink}>
              View {integration} Docs
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

import { APP_BASE_URL } from '@/lib/env'

/**
 * Canonical facts about the site owner.
 *
 * Single source of truth for entity copy: the JSON-LD graph, any crawlable
 * "about" prose, and `/llms.txt` all read from here, so they can never
 * disagree with each other.
 *
 * Hardcoded on purpose. Answer engines (ChatGPT, Claude, Perplexity, Google
 * AI Overviews) cite what they can read as plain text — if these values
 * render empty, the site has no citable identity. If editors need to own
 * this copy, back it with a CMS singleton and keep these as fallbacks.
 *
 * Replace every value before launch. Prefer phrasing that does not go stale:
 * "multiple Awwwards honors" beats "30+ awards".
 */
export interface AgentUseCase {
  /** Short job name that an agent can match against its task. */
  name: string
  /** Concrete boundary for when this site or product is a good fit. */
  description: string
}

export interface AgentGuidance {
  whenToUse: readonly AgentUseCase[]
  /** Ordered instructions for starting or continuing the job. */
  howToUse: readonly string[]
}

export interface DeveloperResource {
  name: string
  description: string
  /** Absolute URL so the resource also works outside the rendered site. */
  url: string
}

export interface SiteFacts {
  /** Display name, exactly as it should be cited. */
  name: string
  /** Other spellings people search for (casing variants, abbreviations). */
  alternateNames: readonly string[]
  url: string
  /** Absolute URL — relative paths are ignored by most consumers. */
  logo: string
  /** One or two sentences: who, where, for whom. Answers "what is X?". */
  description: string
  /** ISO year or date. */
  foundingDate?: string
  /** Human-readable location, e.g. 'Buenos Aires, Argentina'. */
  locationName?: string
  /** ISO 3166-1 alpha-2, e.g. 'AR'. */
  addressCountry?: string
  areaServed?: string
  /** What you sell, in the words a buyer would use. */
  services: readonly string[]
  /** Topics you are an authority on — feeds schema.org `knowsAbout`. */
  knowsAbout: readonly string[]
  email?: string
  /** Profile URLs (social, directories) — feeds schema.org `sameAs`. */
  sameAs: readonly string[]
  /** Task-oriented instructions for agents. Omit when the site is not callable. */
  agentGuidance?: AgentGuidance
  /** Real, public technical resources. Never list a surface that is not shipped. */
  developerResources?: readonly DeveloperResource[]
}

/**
 * Canonical, normalized base URL — the single place every absolute URL in
 * the app (sitemap, robots, `/llms.txt`, JSON-LD) derives from.
 *
 * `APP_BASE_URL` (`lib/env.ts`) already carries the fallback chain
 * (`NEXT_PUBLIC_BASE_URL` ?? `https://localhost:3000`); this just normalizes
 * it once. `NEXT_PUBLIC_BASE_URL` is validated with `z.url()`, which permits
 * a trailing slash. Everything below concatenates onto this, so an
 * unnormalized value would emit `//icon.png` and `//#organization` — a
 * broken logo and a JSON-LD `@id` that no longer matches the one other nodes
 * reference. Strip it once, here, rather than in every consumer.
 */
export const BASE_URL = APP_BASE_URL.replace(/\/+$/, '')

export const SITE: SiteFacts = {
  name: 'Satūs',
  alternateNames: ['Satus'],
  url: BASE_URL,
  // NOTE: `app/icon.png` is one of the files `bun run handoff` deletes as
  // Satus branding. Point this at the project's own logo before launch, or
  // the Organization schema advertises a 404.
  logo: `${BASE_URL}/icon.png`,
  description:
    'Satūs is a Next.js starter by darkroom.engineering — React 19, TypeScript strict, Tailwind v4, and production-ready integrations.',
  areaServed: 'Worldwide',
  services: [],
  knowsAbout: [],
  sameAs: ['https://darkroom.engineering'],
  agentGuidance: {
    whenToUse: [
      {
        name: 'Start a production Next.js site',
        description:
          'Use Satūs when a new project needs a Next.js 16 and React 19 baseline with strict TypeScript, accessible UI primitives, and production checks already configured.',
      },
      {
        name: 'Add optional commerce or content integrations',
        description:
          'Use Satūs when a site may need Sanity, Shopify, HubSpot, Mailchimp, or Turnstile without making those services mandatory for a fresh clone.',
      },
    ],
    howToUse: [
      'Clone or deploy the Satūs repository, then follow the README setup steps.',
      'Read AGENTS.md and ARCHITECTURE.md before changing project conventions or integration boundaries.',
      'Run bun run check before committing changes.',
    ],
  },
  developerResources: [
    {
      name: 'Satūs source repository',
      description: 'Source code, releases, and issue tracker for the starter.',
      url: 'https://github.com/darkroomengineering/satus',
    },
    {
      name: 'Satūs setup guide',
      description:
        'Installation, local development, and deployment instructions.',
      url: 'https://github.com/darkroomengineering/satus#readme',
    },
    {
      name: 'Satūs architecture',
      description:
        'Project structure, design decisions, and customization boundaries.',
      url: 'https://github.com/darkroomengineering/satus/blob/main/ARCHITECTURE.md',
    },
  ],
}

/** "a, b, and c" — prose-friendly list for entity copy. */
export function formatList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

import type { PortableTextBlock } from 'next-sanity'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'

import { Wrapper } from '@/components/layout/wrapper'
import { Link } from '@/components/ui/link'
import { isConfigured } from '@/integrations/registry'
import { RichText } from '@/integrations/sanity/components/rich-text'
import { sanityFetch } from '@/integrations/sanity/live'
import { pageQuery } from '@/integrations/sanity/queries'
import { getLinkAttributes } from '@/integrations/sanity/utils/link'
import { generateSanityMetadata } from '@/utils/metadata'

/**
 * `sanityFetch` calls `cacheTag()` internally, which under Cache Components
 * (`cacheComponents: true`) is only legal inside a `'use cache'` function —
 * including in draft mode. The official next-sanity pattern: always fetch
 * inside 'use cache', but pass `perspective`/`stega`/`slug` as arguments so
 * they are part of the cache key, and branch on `draftMode()` at the
 * request level. Live edits then land via SanityLive tag revalidation.
 *
 * Declared as `const` (not `async function`, unlike the otherwise-identical
 * pattern in `app/(site)/(examples)/sanity/page.tsx`) so the sanity
 * bundle's strip transform in `lib/scripts/integration-bundles.ts` can
 * remove both helpers with the existing `removeVariableStatement` op —
 * there is no remove-function-declaration op in
 * `lib/scripts/ast-operation-types.ts`, and this file (unlike the tutorial
 * page) must survive integration removal as the in-chrome 404 handler, so
 * it can't just be deleted wholesale.
 */
const fetchPage = async (
  slug: string,
  perspective: 'published' | 'drafts',
  stega: boolean
) => {
  'use cache'
  return sanityFetch({
    query: pageQuery,
    params: { slug },
    perspective,
    stega,
  })
}

const fetchPageForRequest = async (slug: string) => {
  const { isEnabled: isDraftMode } = await draftMode()
  return isDraftMode
    ? fetchPage(slug, 'drafts', true)
    : fetchPage(slug, 'published', false)
}

interface CmsPageProps {
  params: Promise<{ slug: string[] }>
}

/**
 * Renders every published Sanity `page` document at its single-segment slug
 * (`/about`, `/pricing`, ...). Only a single path segment is resolved as a
 * CMS page — anything deeper 404s, same as a slug with no matching document.
 *
 * REPLACES the old `[...unmatched]` catch-all and keeps its job: when
 * nothing resolves, `notFound()` renders the 404 inside this (site) route
 * group's chrome and providers, instead of the bare root layout. Static
 * segments (`/sanity`, `/studio`, `/api`, ...) win over this catch-all
 * because Next matches more specific routes first.
 *
 * A sanity-less project keeps this exact file, stripped down to a lean
 * `notFound()` stub by the sanity bundle's `codeTransforms` in
 * `lib/scripts/integration-bundles.ts`, so the in-chrome 404 keeps working
 * with zero Sanity dependency.
 */
export default async function CmsPage({ params }: CmsPageProps) {
  const { slug } = await params
  const [slugSegment] = slug

  if (slug.length !== 1 || !slugSegment || !isConfigured('sanity')) {
    notFound()
  }

  const { data } = await fetchPageForRequest(slugSegment)

  if (!data) notFound()

  const linkAttrs = data.link ? getLinkAttributes(data.link) : null
  // SAFETY: PageQueryResult's typegen'd `content` array is the same
  // portable-text block/span/markDefs shape as next-sanity's
  // PortableTextBlock, derived independently by typegen so TS can't unify
  // the two structurally identical types.
  const content = data.content as PortableTextBlock[] | null

  return (
    <Wrapper theme="light">
      <div
        className="flex grow flex-col gap-gap dr-px-16 dr-py-32"
        data-sanity={data._id}
      >
        <h1 data-sanity="title">{data.title}</h1>
        {content && (
          <div data-sanity="content">
            <RichText content={content} />
          </div>
        )}
        {linkAttrs && (
          <Link
            href={linkAttrs.href}
            target={linkAttrs.target}
            rel={linkAttrs.rel}
          >
            {data.link?.text}
          </Link>
        )}
      </div>
    </Wrapper>
  )
}

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata
export async function generateMetadata({ params }: CmsPageProps) {
  const { slug } = await params
  const [slugSegment] = slug

  if (slug.length !== 1 || !slugSegment || !isConfigured('sanity')) return

  const { data } = await fetchPageForRequest(slugSegment)

  if (!data) return

  return generateSanityMetadata({
    document: data,
    url: `/${slugSegment}`,
    type: 'website',
  })
}

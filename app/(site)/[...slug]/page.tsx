import { type PortableTextBlock, stegaClean } from 'next-sanity'
import { notFound } from 'next/navigation'

import { Wrapper } from '@/components/layout/wrapper'
import { Link } from '@/components/ui/link'
import { isConfigured } from '@/integrations/registry'
import { RichText } from '@/integrations/sanity/components/rich-text'
import { sanityFetch } from '@/integrations/sanity/fetch'
import { isKnownCmsPath } from '@/integrations/sanity/known-path'
import { pageQuery } from '@/integrations/sanity/queries'
import { getLinkAttributes } from '@/integrations/sanity/utils/link'
import { generateSanityMetadata } from '@/utils/metadata'

/**
 * `sanityFetch` sets its own caching: published reads are cached under the
 * `sanity` tag until the publish webhook, draft mode reads uncached. Callers
 * check `isKnownCmsPath` first, so only published slugs get a cache entry.
 *
 * Declared as `const`, not `function`: the sanity bundle's strip transform
 * (`lib/scripts/integration-bundles.ts`) removes it with
 * `removeVariableStatement`, and `lib/scripts/ast-operation-types.ts` has no
 * remove-function-declaration op. This file must survive integration removal
 * as the in-chrome 404 handler, so it can't be deleted wholesale.
 */
const fetchPage = (slug: string) =>
  sanityFetch({ query: pageQuery, params: { slug } })

interface CmsPageProps {
  params: Promise<{ slug: string[] }>
}

/**
 * Renders a published Sanity `page` at its single-segment slug (`/about`);
 * deeper paths 404. As the catch-all, `notFound()` here renders the 404 inside
 * the (site) group's chrome and providers instead of the bare root layout.
 *
 * A sanity-less project keeps this file, stripped to a `notFound()` stub by
 * the sanity bundle's `codeTransforms` in `lib/scripts/integration-bundles.ts`.
 */
export default async function CmsPage({ params }: CmsPageProps) {
  const { slug } = await params
  const [slugSegment] = slug

  if (
    slug.length !== 1 ||
    !slugSegment ||
    !isConfigured('sanity') ||
    // Before the fetch, so an unknown slug never writes a cache entry.
    !(await isKnownCmsPath(`/${slugSegment}`))
  ) {
    notFound()
  }

  const data = await fetchPage(slugSegment)

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

export async function generateMetadata({ params }: CmsPageProps) {
  const { slug } = await params
  const [slugSegment] = slug

  if (
    slug.length !== 1 ||
    !slugSegment ||
    !isConfigured('sanity') ||
    !(await isKnownCmsPath(`/${slugSegment}`))
  ) {
    return
  }

  const data = await fetchPage(slugSegment)

  if (!data) return

  return generateSanityMetadata({
    document: stegaClean(data),
    url: `/${slugSegment}`,
    type: 'website',
  })
}

import type { PortableTextBlock } from 'next-sanity'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'

import { Wrapper } from '@/components/layout/wrapper'
import { SanityImage } from '@/components/ui/sanity-image'
import { isConfigured } from '@/integrations/registry'
import { RichText } from '@/integrations/sanity/components/rich-text'
import { sanityFetch } from '@/integrations/sanity/live'
import { articleQuery } from '@/integrations/sanity/queries'
import { JsonLd } from '@/lib/seo/json-ld'
import {
  type ArticleSchemaInput,
  articleSchema,
  breadcrumbSchema,
} from '@/lib/seo/schemas'
import { SITE } from '@/lib/seo/site'
import { generateSanityMetadata } from '@/utils/metadata'

/**
 * Renders every published Sanity `article` document at `/articles/[slug]` —
 * its own namespace so an article slug can never collide with a `page`
 * slug resolved by the `[...slug]` catch-all.
 */

// Same 'use cache' + draftMode pattern as `app/(site)/[...slug]/page.tsx` —
// see that file's comment for why `sanityFetch` requires this shape under
// Cache Components.
async function fetchArticle(
  slug: string,
  perspective: 'published' | 'drafts',
  stega: boolean
) {
  'use cache'
  return sanityFetch({
    query: articleQuery,
    params: { slug },
    perspective,
    stega,
  })
}

async function fetchArticleForRequest(slug: string) {
  const { isEnabled: isDraftMode } = await draftMode()
  return isDraftMode
    ? fetchArticle(slug, 'drafts', true)
    : fetchArticle(slug, 'published', false)
}

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params

  if (!isConfigured('sanity')) notFound()

  const { data } = await fetchArticleForRequest(slug)

  if (!data) notFound()

  const url = `${SITE.url}/articles/${slug}`

  const articleInput: ArticleSchemaInput = {
    headline: data.title ?? slug,
    url,
  }
  if (data.excerpt) articleInput.description = data.excerpt
  if (data.publishedAt) articleInput.datePublished = data.publishedAt
  if (data._updatedAt) articleInput.dateModified = data._updatedAt
  if (data.author) articleInput.authorName = data.author

  // SAFETY: ArticleQueryResult's typegen'd `content` array is the same
  // portable-text block/span/markDefs shape as next-sanity's
  // PortableTextBlock, derived independently by typegen so TS can't unify
  // the two structurally identical types.
  const content = data.content as PortableTextBlock[] | null

  return (
    <Wrapper theme="light">
      {/* `/articles` has no index page — the breadcrumb trail goes
          straight from the site root to the article itself. */}
      <JsonLd
        data={breadcrumbSchema([
          { name: SITE.name, url: SITE.url },
          { name: data.title ?? slug, url },
        ])}
      />
      <JsonLd data={articleSchema(articleInput)} />
      <article
        className="flex grow flex-col gap-gap dr-px-16 dr-py-32"
        data-sanity={data._id}
      >
        <h1 data-sanity="title">{data.title}</h1>
        {data.featuredImage && (
          <SanityImage image={data.featuredImage} maxWidth={1920} />
        )}
        {content && (
          <div data-sanity="content">
            <RichText content={content} />
          </div>
        )}
      </article>
    </Wrapper>
  )
}

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata
export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug } = await params

  if (!isConfigured('sanity')) return

  const { data } = await fetchArticleForRequest(slug)

  if (!data) return

  return generateSanityMetadata({
    document: data,
    url: `/articles/${slug}`,
    type: 'article',
  })
}

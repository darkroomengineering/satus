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
import { articleSchema, breadcrumbSchema } from '@/lib/seo/schemas'
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
      <JsonLd
        data={articleSchema({
          headline: data.title ?? slug,
          ...(data.excerpt ? { description: data.excerpt } : {}),
          url,
          ...(data.publishedAt ? { datePublished: data.publishedAt } : {}),
          ...(data._updatedAt ? { dateModified: data._updatedAt } : {}),
          ...(data.author ? { authorName: data.author } : {}),
        })}
      />
      <article
        className="flex grow flex-col gap-gap dr-px-16 dr-py-32"
        data-sanity={data._id}
      >
        <h1 data-sanity="title">{data.title}</h1>
        {data.featuredImage && (
          <SanityImage image={data.featuredImage} maxWidth={1920} />
        )}
        {data.content && (
          <div data-sanity="content">
            <RichText content={data.content as PortableTextBlock[]} />
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

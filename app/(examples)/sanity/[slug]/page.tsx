import { notFound } from 'next/navigation'
import { Wrapper } from '@/components/layout/wrapper'
import { client } from '@/integrations/sanity/client'
import { sanityFetch } from '@/integrations/sanity/live'
import { allArticlesQuery, articleQuery } from '@/integrations/sanity/queries'
import { generateSanityMetadata } from '@/utils/metadata'
import { SanityArticle } from './_components/article'

export async function generateStaticParams() {
  // Cache Components requires generateStaticParams to return at least one entry.
  // When Sanity is unconfigured (no env) or has no articles, emit a placeholder
  // slug that the page resolves to notFound() — keeps the starter building
  // without integration env (e.g. in CI). Use the client directly for
  // build-time fetching instead of sanityFetch.
  const fallback = [{ slug: 'article-not-found' }]

  if (!client) return fallback

  const data = await client.fetch(allArticlesQuery)
  if (!(data && Array.isArray(data))) return fallback

  const params = data
    .map((article) => article.slug?.current)
    .filter((slug): slug is string => Boolean(slug))
    .map((slug) => ({ slug }))

  return params.length > 0 ? params : fallback
}

// `sanityFetch` calls `cacheTag()` internally, which under Next's Cache
// Components (`cacheComponents: true`) is only legal inside a `'use cache'`
// function. Wrapping here also dedupes the fetch across the page render and
// `generateMetadata` (slug is passed as an arg so the cache keys per article).
async function fetchArticle(slug: string) {
  'use cache'
  return sanityFetch({
    query: articleQuery,
    params: { slug },
  })
}

export default async function SanityArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { data } = await fetchArticle(slug)

  if (!data) return notFound()

  return (
    <Wrapper theme="light" className="font-mono uppercase">
      <div className="max-dt:dr-px-16 flex grow items-center justify-center">
        <SanityArticle data={data} />
      </div>
    </Wrapper>
  )
}

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { data } = await fetchArticle(slug)

  if (!data) return

  return generateSanityMetadata({
    document: data,
    url: `/sanity/${slug}`,
    type: 'article',
  })
}

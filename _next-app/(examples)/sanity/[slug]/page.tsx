import { notFound } from 'next/navigation'
import { Wrapper } from '@/components/layout/wrapper'
import { client } from '@/integrations/sanity/client'
import { sanityFetch } from '@/integrations/sanity/live'
import { allArticlesQuery, articleQuery } from '@/integrations/sanity/queries'
import type { Article } from '@/integrations/sanity/sanity.types'
import { generateSanityMetadata } from '@/utils/metadata'
import { SanityArticle } from './_components/article'

export async function generateStaticParams() {
  // Use client directly for build-time data fetching instead of sanityFetch
  if (!client) return []

  const data = await client.fetch(allArticlesQuery)

  if (!(data && Array.isArray(data))) return []

  return data.map((article) => ({ slug: article.slug?.current ?? '' }))
}

export default async function SanityArticlePage({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = await params
  const { data } = await sanityFetch({
    query: articleQuery,
    params: { slug },
  })

  if (!data) return notFound()

  return (
    <Wrapper theme="light" className="font-mono uppercase">
      <div className="max-dt:dr-px-16 flex grow items-center justify-center">
        <SanityArticle data={data as Article} />
      </div>
    </Wrapper>
  )
}

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata
export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = await params
  const { data } = await sanityFetch({
    query: articleQuery,
    params: { slug },
  })

  if (!data) return

  return generateSanityMetadata({
    document: data,
    url: `/sanity/${slug}`,
    type: 'article',
  })
}

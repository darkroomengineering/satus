import { notFound } from 'next/navigation'
import { Wrapper } from '~/app/(pages)/(components)/wrapper'
import { sanityFetch } from '~/integrations/sanity/live'
import { articleQuery } from '~/integrations/sanity/queries'
import { generateSanityMetadata } from '~/libs/metadata'
import { SanityArticle } from './(component)/article'

// export async function generateStaticParams() {
//   const { data } = await sanityFetch({
//     query: allArticlesQuery,
//   })

//   return data.map((article) => ({ slug: article.slug?.current }))
// }

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
    <Wrapper theme="red" className="uppercase font-mono">
      <div className="flex items-center justify-center grow max-dt:dr-px-16">
        <SanityArticle data={data} />
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

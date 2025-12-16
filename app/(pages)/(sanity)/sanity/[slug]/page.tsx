import { notFound } from 'next/navigation'
import { Wrapper } from '~/app/(pages)/_components/wrapper'
import { sanityFetch } from '~/integrations/sanity/live'
import { articleQuery } from '~/integrations/sanity/queries'
import { generateSanityMetadata } from '~/utils'
import { SanityArticle } from './_components/article'

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
    <Wrapper theme="red" className="font-mono uppercase">
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

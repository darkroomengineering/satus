export const dynamic = 'force-dynamic'

import { Wrapper } from 'app/(pages)/wrapper'
import { isEmptyArray } from 'libs/utils'
import { notFound } from 'next/navigation'
import { client } from 'tina/__generated__/client'
import { TinaProvider } from 'tina/tina-provider'
import { Hero } from '../../(components)/hero'
import { Section } from '../../(components)/section'
import s from '../../tina.module.scss'

const pageId = 'templatesConnection'
const indexable = false //TODO: change when going live

export default async function Templates({ params }) {
  const [pageData] = await Promise.all([
    client.queries[pageId]({
      filter: { slug: { eq: params.slug } },
    }),
  ])

  if (isEmptyArray(pageData.data[pageId].edges)) return notFound()

  return (
    <Wrapper theme="red" className={s.page}>
      <TinaProvider serverData={pageData} pageId={pageId}>
        <Hero />
        <Section />
      </TinaProvider>
    </Wrapper>
  )
}

export const dynamicParams = true

export async function generateStaticParams() {
  const { data } = await client.queries[pageId]()
  const paths = data[pageId].edges.map(({ node }) => ({ slug: node.slug }))

  return paths
}

export async function generateMetadata({ params }) {
  const [metadata] = await Promise.all([
    client.queries['getTemplatesMetadata']({
      filter: { slug: { eq: params.slug } },
    }),
  ])

  const cmsMetadata = metadata?.data[pageId]?.edges[0]?.node?.global?.find(
    ({ __typename }) => __typename.toLowerCase().includes('metadata'),
  )

  if (!cmsMetadata) return {}

  return {
    ...cmsMetadata,
    openGraph: cmsMetadata.openGraph
      ? {
          images: [
            {
              url: cmsMetadata.openGraph,
              width: 1200,
              height: 630,
              alt: cmsMetadata.title,
            },
          ],
        }
      : null,
    robots: {
      index: indexable,
      follow: indexable,
      googleBot: {
        index: indexable,
        follow: indexable,
      },
    },
  }
}

import { client } from 'tina/__generated__/client'
import { TinaProvider } from 'tina/tina-provider'
import { Wrapper } from '../wrapper'
import { Hero } from './(components)/hero'
import { Section } from './(components)/section'
import s from './tina.module.scss'

const pageId = 'home'
const indexable = false //TODO: change when going live

export default async function TinaHome() {
  const [pageData] = await Promise.all([
    client.queries[pageId]({
      relativePath: `${pageId}.md`,
    }),
  ])

  return (
    <Wrapper theme="red" className={s.page}>
      <TinaProvider serverData={pageData} pageId={pageId}>
        <Hero />
        <Section />
      </TinaProvider>
    </Wrapper>
  )
}

export async function generateMetadata() {
  const [metadata] = await Promise.all([
    client.queries['getHomeMetadata']({
      relativePath: `${pageId}.md`,
    }),
  ])

  const cmsMetadata = metadata?.data[pageId]?.global?.find(({ __typename }) =>
    __typename.toLowerCase().includes('metadata'),
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

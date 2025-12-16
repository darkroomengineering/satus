import type { PortableTextBlock } from 'next-sanity'
import { Link } from '~/components/link'
import { RichText } from '~/integrations/sanity'
import type { Page } from '~/integrations/sanity/sanity.types'

type SanityTutorialProps = NonNullable<Page>

type InternalReference = {
  _type: string
  slug?: { current: string }
  title?: string
}

export function SanityTutorial({ data }: { data: SanityTutorialProps }) {
  if (!data) return null

  return (
    <div className="flex flex-col items-center gap-gap" data-sanity={data._id}>
      <h2 className="text-center" data-sanity="title">
        {data?.title}
      </h2>
      {data.content && (
        <div data-sanity="content">
          <RichText content={data?.content as PortableTextBlock[]} />
        </div>
      )}
      {data?.link && (
        <Link
          href={`/sanity/${(data?.link?.internalLink as InternalReference)?.slug?.current}`}
        >
          {data?.link?.text}
        </Link>
      )}
    </div>
  )
}

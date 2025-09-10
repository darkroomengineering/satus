'use client'

import { Link } from '~/components/link'
import { RichText } from '~/integrations/sanity'

export function SanityTutorial({ data }) {
  return (
    <div className="flex flex-col items-center gap-gap" data-sanity={data._id}>
      <h2 className="text-center" data-sanity="title">
        {data.title}
      </h2>
      {data.content && (
        <div data-sanity="content">
          <RichText content={data.content} />
        </div>
      )}
      {data?.link && (
        <Link href={`/sanity/${data.link.internalLink.slug.current}`}>
          {data.link.text}
        </Link>
      )}
    </div>
  )
}

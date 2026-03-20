import type { PortableTextBlock } from 'next-sanity'
import { Link } from '@/components/ui/link'
import { RichText } from '@/integrations/sanity/components/rich-text'
import type {
  Page,
  Link as SanityLink,
} from '@/integrations/sanity/sanity.types'
import { getLinkAttributes } from '@/integrations/sanity/utils/link'

type SanityTutorialProps = NonNullable<Page>

export function SanityTutorial({ data }: { data: SanityTutorialProps }) {
  if (!data) return null

  const linkAttrs = data?.link
    ? getLinkAttributes(data.link as SanityLink)
    : null

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
      {linkAttrs && (
        <Link
          href={linkAttrs.href}
          target={linkAttrs.target}
          rel={linkAttrs.rel}
        >
          {data?.link?.text}
        </Link>
      )}
    </div>
  )
}

import type { PortableTextBlock, StegaBranded } from 'next-sanity'

import { Link } from '@/components/ui/link'
import { RichText } from '@/integrations/sanity/components/rich-text'
import type { PageQueryResult } from '@/integrations/sanity/sanity.types'
import { getLinkAttributes } from '@/integrations/sanity/utils/link'

// The page fetches with `stega` keyed off draft mode, and next-sanity brands
// a stega'd result's strings as `StegaString` (safe to render, not comparable
// to string literals). Accept both shapes so the draft-mode fetch type-checks
// without stripping the stega payload Presentation's click-to-edit relies on.
type PageData = NonNullable<PageQueryResult>
type SanityTutorialProps = PageData | StegaBranded<PageData>

export function SanityTutorial({ data }: { data: SanityTutorialProps }) {
  if (!data) return null

  const linkAttrs = data.link ? getLinkAttributes(data.link) : null

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

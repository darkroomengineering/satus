import type { PortableTextBlock } from 'next-sanity'
import { Image } from '@/components/ui/image'
import { RichText } from '@/integrations/sanity/components/rich-text'
import type { Article } from '@/integrations/sanity/sanity.types'
import { urlForImage } from '@/integrations/sanity/utils/image'

type SanityArticleProps = NonNullable<Article>

export function SanityArticle({ data }: { data: SanityArticleProps }) {
  if (!data) return null

  return (
    <div className="flex flex-col items-center gap-gap" data-sanity={data._id}>
      <h1 data-sanity="title">article: {data.title}</h1>
      {data.excerpt && (
        <p className="text-gray-600" data-sanity="excerpt">
          {data.excerpt}
        </p>
      )}
      {data.featuredImage && (
        <div data-sanity="featuredImage">
          <Image src={urlForImage(data.featuredImage).url()} />
        </div>
      )}
      {data.content && (
        <div data-sanity="content">
          <RichText content={data.content as PortableTextBlock[]} />
        </div>
      )}
      {data.publishedAt && (
        <time dateTime={data.publishedAt} data-sanity="publishedAt">
          {new Date(data.publishedAt).toLocaleDateString()}
        </time>
      )}
      {data.author && <p data-sanity="author">By {data.author}</p>}
      {data.categories && data.categories.length > 0 && (
        <div className="flex gap-2" data-sanity="categories">
          {data.categories.map((category) => (
            <span
              key={category}
              className="rounded bg-gray-100 px-2 py-1 text-sm"
            >
              {category}
            </span>
          ))}
        </div>
      )}
      {data.tags && data.tags.length > 0 && (
        <div className="flex gap-2" data-sanity="tags">
          {data.tags.map((tag) => (
            <span key={tag} className="rounded bg-gray-200 px-2 py-1 text-xs">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

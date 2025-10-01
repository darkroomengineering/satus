import type { PortableTextBlock } from 'next-sanity'
import { Image } from '~/components/image'
import { RichText, urlForImage } from '~/integrations/sanity'
import type { Article } from '~/integrations/sanity/sanity.types'

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
              className="text-sm bg-gray-100 px-2 py-1 rounded"
            >
              {category}
            </span>
          ))}
        </div>
      )}
      {data.tags && data.tags.length > 0 && (
        <div className="flex gap-2" data-sanity="tags">
          {data.tags.map((tag) => (
            <span key={tag} className="text-xs bg-gray-200 px-2 py-1 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

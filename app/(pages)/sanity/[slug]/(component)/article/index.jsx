'use client'

import { SanityImage } from '~/components/sanity-image'
import { RichText, useSanityContext } from '~/integrations/sanity'

export function SanityArticle() {
  const { document } = useSanityContext()

  if (!document) return null

  return (
    <div
      className="flex flex-col items-center gap-gap"
      data-sanity={document._id}
    >
      <h1 data-sanity="title">article: {document.title}</h1>
      {document.excerpt && (
        <p className="text-gray-600" data-sanity="excerpt">
          {document.excerpt}
        </p>
      )}
      {document.featuredImage && (
        <div data-sanity="featuredImage">
          <SanityImage image={document.featuredImage} maxWidth={800} />
        </div>
      )}
      {document.content && (
        <div data-sanity="content">
          <RichText content={document.content} />
        </div>
      )}
      {document.publishedAt && (
        <time dateTime={document.publishedAt} data-sanity="publishedAt">
          {new Date(document.publishedAt).toLocaleDateString()}
        </time>
      )}
      {document.author && <p data-sanity="author">By {document.author}</p>}
      {document.categories && document.categories.length > 0 && (
        <div className="flex gap-2" data-sanity="categories">
          {document.categories.map((category) => (
            <span
              key={category}
              className="text-sm bg-gray-100 px-2 py-1 rounded"
            >
              {category}
            </span>
          ))}
        </div>
      )}
      {document.tags && document.tags.length > 0 && (
        <div className="flex gap-2" data-sanity="tags">
          {document.tags.map((tag) => (
            <span key={tag} className="text-xs bg-gray-200 px-2 py-1 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

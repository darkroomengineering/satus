'use client'

import { RichText, useSanityContext } from '~/integrations/sanity'

export function SanityTutorial() {
  const { document } = useSanityContext()

  if (!document) return null

  return (
    <div
      className="flex flex-col items-center gap-gap"
      data-sanity={document._id}
    >
      <h2 className="text-center" data-sanity="title">
        {document.title}
      </h2>
      {document.content && (
        <div data-sanity="content">
          <RichText content={document.content} />
        </div>
      )}
    </div>
  )
}

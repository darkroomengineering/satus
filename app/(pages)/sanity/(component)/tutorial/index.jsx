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

      <div className="flex gap-gap">
        <code className="dr-p-8 inline-block border border-secondary dr-rounded-8">
          # MacOS
          <br />
          brew install mkcert
        </code>
        <code className="dr-p-8 inline-block border border-secondary dr-rounded-8">
          # Windows
          <br />
          choco install mkcert
          <br />
        </code>
      </div>

      <code className="dr-p-8 inline-block border border-secondary dr-rounded-8">
        mkcert -install
        <br />
        mkcert localhost
        <br />
        npm run dev:sanity
      </code>

      <code className="dr-p-8 inline-block border border-secondary dr-rounded-8">
        # update .env
        <br />
        SANITY_PROJECT_ID
        <br />
        SANITY_DATASET
        <br />
        SANITY_API_TOKEN
      </code>
    </div>
  )
}

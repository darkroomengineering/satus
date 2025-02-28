'use client'

import { storyblokEditable } from '@storyblok/js'
import { useStoryblokContext } from '~/intergrations/storyblok/context'

// TODO:
// - Webhooks
// - Visual Editor url
// - Draft mode

export function Tutorial() {
  const {
    story: { content },
  } = useStoryblokContext()

  return (
    <div
      className="flex flex-col items-center gap-gap"
      {...storyblokEditable(content)}
    >
      <h2 className="text-center">{content?.title}</h2>
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
        npm run dev:storyblok
      </code>

      <code className="dr-p-8 inline-block border border-secondary dr-rounded-8">
        # update .env
        <br />
        STORYBLOK_PREVIEW_ACCESS_TOKEN
        <br />
        STORYBLOK_PUBLIC_ACCESS_TOKEN
      </code>
    </div>
  )
}

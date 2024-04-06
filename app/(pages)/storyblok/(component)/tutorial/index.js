'use client'

import { storyblokEditable } from '@storyblok/js'
import { useStoryblokContext } from 'libs/storyblok/context'
import s from './tutorial.module.scss'

// TODO:
// - Webhooks
// - Visual Editor url
// - Draft mode

export function Tutorial() {
  const { story } = useStoryblokContext()

  const content = story?.content

  return (
    <div className={s.tutorial} {...storyblokEditable(content)}>
      <h2 className={s.title}>{content?.title}</h2>

      <div className={s.codes}>
        <code>
          # MacOS
          <br />
          brew install mkcert
        </code>
        <code>
          # Windows
          <br />
          choco install mkcert
          <br />
        </code>
      </div>

      <code>
        mkcert -install
        <br />
        mkcert localhost
        <br />
        npm run dev:storyblok
      </code>

      <code>
        # update .env
        <br />
        STORYBLOK_PREVIEW_ACCESS_TOKEN
        <br />
        STORYBLOK_PUBLIC_ACCESS_TOKEN
      </code>
    </div>
  )
}

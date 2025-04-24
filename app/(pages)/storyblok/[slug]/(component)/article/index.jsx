'use client'

import { storyblokEditable } from '@storyblok/js'
import { useStoryblokContext } from '~/integrations/storyblok/context'

export function Article() {
  const {
    story: { content },
  } = useStoryblokContext()

  if (!content) return

  return (
    <div
      className="flex flex-col items-center gap-gap"
      {...storyblokEditable(content)}
    >
      <h1>article: {content?.title}</h1>
    </div>
  )
}

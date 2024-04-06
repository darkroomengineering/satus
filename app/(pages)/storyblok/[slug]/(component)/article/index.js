'use client'

import { storyblokEditable } from '@storyblok/js'
import { useStoryblokContext } from 'libs/storyblok/context'
import s from './article.module.scss'

export function Article() {
  const { story } = useStoryblokContext()

  const content = story?.content

  if (!content) return

  return (
    <div className={s.article} {...storyblokEditable(content)}>
      <h1 className={s.title}>article: {content?.title}</h1>
    </div>
  )
}

'use client'

import { useRect } from '@darkroom.engineering/hamo'
import cn from 'clsx'
import { useScrollTrigger } from 'hooks/use-scroll-trigger'
import { slugify } from 'libs/slugify'
import { Fragment, useRef } from 'react'
import s from './progress-text.module.css'

// TODO: add support for children as an array of strings and objects

export function ProgressText({
  children,
  start = 'top top',
  end = 'bottom bottom',
  transition = '600ms opacity ease-out',
  onChange = (node, value) => {
    node.style.opacity = value ? 1 : 0.33
  },
  className,
  style,
}) {
  const [setRectRef, rect] = useRect()

  const wordsRefs = useRef([])

  useScrollTrigger({
    rect,
    start,
    end,
    onProgress: ({ progress }) => {
      wordsRefs.current.forEach((node, i) => {
        onChange?.(node, progress > i / wordsRefs.current.length)
      })
    },
  })

  if (typeof children !== 'string') {
    console.warn('ProgressText children should be a string')
    return children
  }

  return (
    <span
      ref={setRectRef}
      className={cn(s.progressText, className)}
      style={{
        '--transition': transition,
        ...style,
      }}
    >
      {children.split(' ').map((word, index) => (
        <Fragment key={slugify(word)}>
          <span
            className={s.word}
            ref={(node) => {
              wordsRefs.current[index] = node
            }}
            style={{ opacity: 0.33 }}
          >
            {word}
          </span>{' '}
        </Fragment>
      ))}
    </span>
  )
}

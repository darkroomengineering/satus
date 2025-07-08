'use client'

import cn from 'clsx'
import { useRect } from 'hamo'
import { type CSSProperties, Fragment, type ReactNode, useRef } from 'react'
import {
  type UseScrollTriggerOptions,
  useScrollTrigger,
} from '~/hooks/use-scroll-trigger'
import { slugify } from '~/libs/utils'
import s from './progress-text.module.css'

// TODO: add support for children as an array of strings and objects

type ProgressTextProps = {
  children: ReactNode
  start: UseScrollTriggerOptions['start']
  end: UseScrollTriggerOptions['end']
  transition?: CSSProperties['transition']
  onChange?: (node: HTMLSpanElement, value: boolean) => void
  className?: string
  style?: CSSProperties
}

function defaultOnChange(node: HTMLSpanElement, value: boolean) {
  node.style.opacity = String(value ? 1 : 0.33)
}

export function ProgressText({
  children,
  start = 'top top',
  end = 'bottom bottom',
  transition = '600ms opacity ease-out',
  onChange = defaultOnChange,
  className,
  style,
}: ProgressTextProps) {
  const [setRectRef, rect] = useRect()

  const wordsRefs = useRef<HTMLSpanElement[]>([])

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
        <Fragment key={`${slugify(word)}-${index}`}>
          <span
            className={s.word}
            ref={(node) => {
              if (!node) return
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

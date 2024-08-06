'use client'

import { useRect } from '@darkroom.engineering/hamo'
import cn from 'clsx'
import { useScrollTrigger } from 'hooks/use-scroll-trigger'
import PropTypes from 'prop-types'
import { Fragment, useRef } from 'react'
import s from './progress-text.module.scss'

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
      {children.split(' ').map((word, i) => (
        <Fragment key={i}>
          <span
            className={s.word}
            key={i}
            ref={(node) => {
              wordsRefs.current[i] = node
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

ProgressText.propTypes = {
  start: PropTypes.string,
  end: PropTypes.string,
  transition: PropTypes.string,
  onChange: PropTypes.func,
}

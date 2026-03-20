'use client'

import cn from 'clsx'
import { type UseScrollTriggerOptions, useScrollTrigger } from 'hamo'
import {
  Children,
  type CSSProperties,
  Fragment,
  isValidElement,
  type ReactNode,
  useRef,
} from 'react'
import { slugify } from '@/utils/strings'
import s from './progress-text.module.css'

interface WordSegment {
  text: string
  className?: string
  style?: CSSProperties
}

type ProgressTextProps = {
  /** Accepts a string, an array of strings, or an array of objects with { text, className?, style? } */
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

/** Extract words from children, supporting strings, arrays of strings, and objects with { text, className?, style? } */
function extractWords(children: ReactNode): WordSegment[] {
  const words: WordSegment[] = []

  function processNode(node: ReactNode) {
    if (typeof node === 'string') {
      for (const word of node.split(' ').filter(Boolean)) {
        words.push({ text: word })
      }
    } else if (
      typeof node === 'object' &&
      node !== null &&
      !isValidElement(node) &&
      'text' in node
    ) {
      const segment = node as WordSegment
      for (const word of segment.text.split(' ').filter(Boolean)) {
        const entry: WordSegment = { text: word }
        if (segment.className) entry.className = segment.className
        if (segment.style) entry.style = segment.style
        words.push(entry)
      }
    } else if (Array.isArray(node)) {
      for (const item of node) {
        processNode(item)
      }
    } else if (isValidElement<{ children?: ReactNode }>(node)) {
      // Extract text from React elements (e.g., <span>word</span>)
      Children.forEach(node.props.children, processNode)
    }
  }

  processNode(children)
  return words
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
  const wordsRefs = useRef<HTMLSpanElement[]>([])

  const [setRectRef] = useScrollTrigger({
    start,
    end,
    onProgress: ({ progress }) => {
      wordsRefs.current.forEach((node, i) => {
        onChange?.(node, progress > i / wordsRefs.current.length)
      })
    },
  })

  const words = extractWords(children)

  if (words.length === 0) {
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
      {words.map((word, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: word list derived from static children, order never changes
        <Fragment key={`${slugify(word.text)}-${index}`}>
          <span
            className={cn(s.word, word.className)}
            ref={(node) => {
              if (!node) return
              wordsRefs.current[index] = node
            }}
            style={{ opacity: 0.33, ...word.style }}
          >
            {word.text}
          </span>{' '}
        </Fragment>
      ))}
    </span>
  )
}

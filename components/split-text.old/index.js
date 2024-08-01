'use client'

import { useResizeObserver } from '@darkroom.engineering/hamo'
import { gsap } from 'gsap'
// import { SplitText as GSAPSplitText } from 'gsap/dist/SplitText'
import cn from 'clsx'
import { SplitText as GSAPSplitText } from 'gsap/dist/SplitText'
import { useIsVisualEditor } from 'libs/storyblok/use-is-visual-editor'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import s from './split-text.module.scss'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(GSAPSplitText)
}

function replaceFromNode(node, string, replacement = string) {
  node.innerHTML = node.innerHTML.replace(
    new RegExp('(?!<[^>]+)' + string + '(?![^<]+>)', 'g'),
    replacement,
  )
}

export const SplitText = forwardRef(function SplitText(
  { children, className, type },
  ref,
) {
  const elementRef = useRef()
  const fallbackRef = useRef()
  const [setRectRef, { contentRect: rect }] = useResizeObserver()

  const [splitted, setSplitted] = useState()

  useImperativeHandle(ref, () => splitted, [splitted])

  useEffect(() => {
    if (!elementRef.current) return

    replaceFromNode(fallbackRef.current, '-', '‑')

    const ignoredElements = [
      ...elementRef.current.querySelectorAll('[data-ignore-split-text]'),
    ]
    ignoredElements.map((item) => {
      item.innerText = item.innerText.replaceAll(' ', '&nbsp;')
    })
    const splitted = new GSAPSplitText(elementRef.current, {
      tag: 'span',
      type,
      linesClass: 'line',
      wordsClass: 'word',
      charsClass: 'char',
    })

    setSplitted(splitted)

    return () => {
      splitted.revert()
      setSplitted()
    }
  }, [rect, type])

  const isVisualEditor = useIsVisualEditor()

  const render = useMemo(
    () => (
      <span className={cn(s.wrapper, className)}>
        <span ref={elementRef} className={s.splitText} aria-hidden>
          {children}
        </span>
        <span
          className={s.fallback}
          ref={(node) => {
            setRectRef(node)
            fallbackRef.current = node
          }}
        >
          {children}
        </span>
      </span>
    ),
    [children, className, setRectRef],
  )

  return isVisualEditor ? children : render
})

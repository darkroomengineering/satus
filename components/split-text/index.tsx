'use client'

import cn from 'clsx'
import { gsap } from 'gsap'
import { SplitText as GSAPSplitText } from 'gsap/SplitText'
import { useResizeObserver } from 'hamo'
import {
  type Ref,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useIsVisualEditor } from '~/integrations/storyblok/use-is-visual-editor'
import s from './split-text.module.css'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(GSAPSplitText)
}

function replaceFromNode(
  node: HTMLSpanElement,
  string: string,
  replacement = string
) {
  node.innerHTML = node.innerHTML.replace(
    new RegExp(`(?!<[^>]+)${string}(?![^<]+>)`, 'g'),
    replacement
  )
}

type SplitTextProps = {
  children: string
  className?: string
  type?: string
  ref?: Ref<GSAPSplitText | undefined>
}

export function SplitText({ children, className, type, ref }: SplitTextProps) {
  const elementRef = useRef<HTMLSpanElement>(null!)
  const fallbackRef = useRef<HTMLSpanElement>(null!)
  const [setRectRef, entry] = useResizeObserver()
  const rect = entry?.contentRect

  const [splitted, setSplitted] = useState<GSAPSplitText | undefined>()

  useImperativeHandle(ref, () => splitted, [splitted])

  // biome-ignore lint/correctness/useExhaustiveDependencies: rect dependency is needed to adjust on size changes
  useEffect(() => {
    if (!elementRef.current) return

    replaceFromNode(fallbackRef.current, '-', '‑')

    const ignoredElements = [
      ...elementRef.current.querySelectorAll<HTMLElement>(
        '[data-ignore-split-text]'
      ),
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
      setSplitted(undefined)
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
            if (!node) return
            setRectRef(node)
            fallbackRef.current = node
          }}
        >
          {children}
        </span>
      </span>
    ),
    [children, className, setRectRef]
  )

  return isVisualEditor ? children : render
}

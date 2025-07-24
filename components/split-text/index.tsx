'use client'

import cn from 'clsx'
import { SplitText as GSAPSplitText } from 'gsap/SplitText'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
// import { useIsVisualEditor } from '~/integrations/storyblok/use-is-visual-editor'
import s from './split-text.module.css'

// @refresh reset

interface SplitTextProps {
  children: React.ReactNode
  className?: string
  as?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
  willAppear?: boolean
  type?: 'lines' | 'words' | 'chars'
  mask?: boolean
}

interface SplitTextRef {
  getNode: () => HTMLElement | null
  getSplitText: () => GSAPSplitText | null
  splittedText: GSAPSplitText | null
}

export function SplittedText({
  ref,
  children,
  className,
  as: Tag = 'span',
  willAppear = false,
  type = 'words',
  mask = true,
}: SplitTextProps & {
  ref?:
    | React.RefObject<SplitTextRef | null>
    | ((node: SplitTextRef | null) => void)
}) {
  // const isVisualEditor = useIsVisualEditor()

  const splitRef = useRef<HTMLDivElement>(null)
  const splittedRef = useRef<GSAPSplitText | null>(null)
  const [splittedText, setSplittedText] = useState<GSAPSplitText | null>(null)

  useEffect(() => {
    function findDeepestElement(
      element: HTMLElement | null
    ): HTMLElement | null {
      if (!element) return null

      if (element.children.length !== element.childNodes.length) {
        return element
      }

      if (element.children.length === 1) {
        return findDeepestElement(element.children[0] as HTMLElement)
      }

      return element as HTMLElement
    }

    splittedRef.current?.revert()

    const split = GSAPSplitText.create(findDeepestElement(splitRef.current), {
      type,
      mask: mask ? type : undefined,
      autoSplit: true,
      wordsClass: 'word',
      linesClass: 'line',
      charsClass: 'char',
      onSplit: (splitted) => {
        splittedRef.current = splitted
        setSplittedText(splitted)
      },
    })

    return () => {
      split.revert()
    }
  }, [type, mask])

  useImperativeHandle(
    ref,
    () => ({
      // timeline,
      getSplitText: () => splittedRef.current,
      getNode: () => splitRef.current,
      splittedText,
    }),
    [splittedText]
  )

  // if (isVisualEditor) {
  //   return (
  //     <Tag
  //       className={cn(s.splitText, className)}
  //       ref={splitRef}
  //       style={{
  //         opacity: willAppear ? 0 : 1,
  //       }}
  //     >
  //       {children}
  //     </Tag>
  //   )
  // }

  return (
    <Tag
      className={cn(s.splitText, className)}
      ref={splitRef}
      style={{
        opacity: willAppear ? 0 : 1,
      }}
    >
      {children}
    </Tag>
  )
}

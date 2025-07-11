'use client'

import cn from 'clsx'
import { useResizeObserver } from 'hamo'
import {
  type Ref,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import s from './split-text.module.css'

// Type for GSAP SplitText
interface GSAPSplitTextInstance {
  chars?: Element[]
  words?: Element[]
  lines?: Element[]
  revert(): void
}

interface GSAPSplitTextConstructor {
  new (
    element: HTMLElement,
    options?: {
      tag?: string
      type?: string
      linesClass?: string
      wordsClass?: string
      charsClass?: string
    }
  ): GSAPSplitTextInstance
}

type GSAPSplitTextType = GSAPSplitTextInstance

// Lazy load GSAP and SplitText
let gsapLoaded = false
let GSAPSplitTextConstructor: GSAPSplitTextConstructor | null = null

async function loadGSAPSplitText() {
  if (!gsapLoaded) {
    const [gsapModule, splitTextModule] = await Promise.all([
      import('gsap'),
      import('gsap/SplitText'),
    ])
    const gsap = gsapModule.gsap
    GSAPSplitTextConstructor =
      splitTextModule.SplitText as GSAPSplitTextConstructor
    gsap.registerPlugin(GSAPSplitTextConstructor)
    gsapLoaded = true
  }
  return GSAPSplitTextConstructor
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

type SplitText = 'chars' | 'words' | 'lines'

type SplitType =
  | `${SplitText}`
  | `${SplitText},${SplitText}`
  | `${SplitText},${SplitText},${SplitText}`

type SplitTextProps = {
  children: string
  className?: string
  type?: SplitType
  ref?: Ref<GSAPSplitTextType | undefined>
}

export function SplitText({
  children,
  className,
  type = 'words',
  ref,
}: SplitTextProps) {
  const elementRef = useRef<HTMLSpanElement>(null!)
  const fallbackRef = useRef<HTMLSpanElement>(null!)
  const [setRectRef, entry] = useResizeObserver()
  const rect = entry?.contentRect

  const [splitted, setSplitted] = useState<GSAPSplitTextType | undefined>()

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

    let splittedInstance: GSAPSplitTextInstance | null = null

    // Load and create SplitText instance
    loadGSAPSplitText().then((SplitTextConstructor) => {
      if (!SplitTextConstructor) return

      splittedInstance = new SplitTextConstructor(elementRef.current, {
        tag: 'span',
        type,
        linesClass: 'line',
        wordsClass: 'word',
        charsClass: 'char',
      })

      setSplitted(splittedInstance)
    })

    return () => {
      if (splittedInstance) {
        splittedInstance.revert()
      }
      setSplitted(undefined)
    }
  }, [rect, type])

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

  return render
}

'use client'

import { useRect } from '@studio-freight/hamo'
import { gsap } from 'gsap'
import { SplitText as GSAPSplitText } from 'gsap/dist/SplitText'
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

export const SplitText = forwardRef(function SplitText(
  { children, className, type },
  ref,
) {
  const elementRef = useRef()
  const [setRectRef, rect] = useRect()

  const [splitted, setSplitted] = useState()

  useImperativeHandle(ref, () => splitted, [splitted])

  useEffect(() => {
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

  const render = useMemo(
    () => (
      <span className={s.wrapper}>
        <span ref={elementRef} className={s.splitText} aria-hidden>
          {children}
        </span>
        <span
          style={{ opacity: 0, pointerEvents: 'none', display: 'inline-block' }}
          ref={setRectRef}
        >
          {children}
        </span>
      </span>
    ),
    [children, className],
  )

  return render
})

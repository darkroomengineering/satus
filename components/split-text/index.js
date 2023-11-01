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

gsap.registerPlugin(GSAPSplitText)

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
    })
    setSplitted(splitted)

    return () => {
      splitted.revert()
      setSplitted()
    }
  }, [rect, type])

  const render = useMemo(
    () => (
      <span className={className}>
        <span className={s.wrapper}>
          <span
            style={{ visibility: 'hidden', display: 'inline-block' }}
            ref={setRectRef}
          >
            {children}
          </span>
          <span ref={elementRef} className={s.splitText}>
            {children}
          </span>
        </span>
      </span>
    ),
    [children, className],
  )

  return render
})

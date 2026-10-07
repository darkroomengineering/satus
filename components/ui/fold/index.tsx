'use client'

import cn from 'clsx'
import { useRect, useScrollTrigger, useWindowSize } from 'hamo'
import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  use,
  useEffect,
  useRef,
} from 'react'

import s from './fold.module.css'

const FoldContext = createContext(false)

export function useFold() {
  return use(FoldContext)
}

type FoldProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode
  className?: string
  type?: 'bottom' | 'top'
  disabled?: boolean
  overlay?: boolean
  parallax?: boolean
}

export function Fold({
  children,
  className,
  disabled = false,
  type = 'bottom',
  overlay = true,
  parallax = true,
  ...props
}: FoldProps) {
  const { height: windowHeight = 0 } = useWindowSize()
  const [setRectRef, rect] = useRect()

  const overlayRef = useRef<HTMLDivElement>(null!)
  const stickyRef = useRef<HTMLDivElement>(null!)

  // Direct writes, not a custom property: a variable restyles every descendant.
  function apply(amount: number) {
    if (overlayRef.current) {
      overlayRef.current.style.opacity = String(amount)
    }

    if (parallax && stickyRef.current) {
      const offset = (type === 'top' ? 5 : -5) * amount
      stickyRef.current.style.transform = `translate3d(0, ${offset}svh, 0)`
    }
  }

  useScrollTrigger({
    start: `${rect.top ?? 0} top`,
    end: `${(rect.top ?? 0) + windowHeight} top`,
    disabled: disabled || type === 'bottom',
    onProgress: ({ progress }) => apply(1 - progress),
  })

  useScrollTrigger({
    start: `${(rect.bottom ?? 0) - windowHeight} bottom`,
    end: `${rect.bottom ?? 0} bottom`,
    disabled: disabled || type === 'top',
    onProgress: ({ progress }) => apply(progress),
  })

  useEffect(() => {
    if (!disabled && parallax) return
    stickyRef.current.style.transform = ''
  }, [disabled, parallax])

  return (
    <FoldContext.Provider value={true}>
      <div
        ref={setRectRef}
        className={cn(
          s.fold,
          disabled && s.isDisabled,
          type === 'bottom' && s.isBottom,
          type === 'top' && s.isTop,
          overlay && s.isOverlay,
          className
        )}
        {...props}
      >
        <div className={cn(s.sticky)} ref={stickyRef}>
          {children}
        </div>
        <div className={s.overlay} ref={overlayRef} />
      </div>
    </FoldContext.Provider>
  )
}

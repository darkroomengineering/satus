'use client'

import { useResizeObserver } from '@darkroom.engineering/hamo'
import cn from 'clsx'
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useImperativeHandle,
  useState,
} from 'react'
import s from './accordion.module.scss'

const AccordionsGroupContext = createContext({})
const AccordionContext = createContext({})

function useAccordionsGroupContext() {
  return useContext(AccordionsGroupContext)
}

function useAccordionContext() {
  return useContext(AccordionContext)
}

function Group({ children }) {
  const [currentId, setCurrentId] = useState()

  return (
    <AccordionsGroupContext.Provider value={{ currentId, setCurrentId }}>
      {children}
    </AccordionsGroupContext.Provider>
  )
}

const Root = forwardRef(function Root({ children, className }, ref) {
  const id = useId()

  const { currentId, setCurrentId } = useAccordionsGroupContext()

  const isOpen = currentId === id

  const toggle = useCallback(() => {
    setCurrentId((prev) => (prev === id ? undefined : id))
  }, [id, setCurrentId])

  useImperativeHandle(ref, () => ({
    toggle,
  }))

  return (
    <AccordionContext.Provider value={{ isOpen, toggle }}>
      <div className={cn(s.accordion, className)}>{children?.({ isOpen })}</div>
    </AccordionContext.Provider>
  )
})

function Button({ children, className, onClick, ...props }) {
  const { toggle } = useAccordionContext()

  return (
    <button
      className={cn(s.button, className)}
      onClick={() => {
        onClick?.()
        toggle()
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function Body({ children, className }) {
  const { isOpen } = useAccordionContext()

  const [setRectRef, { contentRect: rect }] = useResizeObserver()

  return (
    <div
      className={cn(s.body, isOpen && s.isOpen)}
      aria-hidden={!isOpen}
      style={{
        height: (isOpen ? rect?.height : 0) + 'px',
      }}
    >
      <div ref={setRectRef}>
        <div className={className}>{children}</div>
      </div>
    </div>
  )
}

export { Body, Button, Group, Root }

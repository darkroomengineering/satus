'use client'

import cn from 'clsx'
import { useResizeObserver } from 'hamo'
import {
  Activity,
  createContext,
  type Dispatch,
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
  type Ref,
  type SetStateAction,
  useCallback,
  useContext,
  useId,
  useImperativeHandle,
  useState,
} from 'react'
import s from './accordion.module.css'

const AccordionsGroupContext = createContext(
  {} as {
    currentId: string | undefined
    setCurrentId: Dispatch<SetStateAction<string | undefined>>
  }
)
const AccordionContext = createContext(
  {} as { isOpen: boolean; toggle: () => void }
)

function useAccordionsGroupContext() {
  return useContext(AccordionsGroupContext)
}

function useAccordionContext() {
  return useContext(AccordionContext)
}

function Group({ children }: PropsWithChildren) {
  const [currentId, setCurrentId] = useState<string | undefined>()

  return (
    <AccordionsGroupContext.Provider value={{ currentId, setCurrentId }}>
      {children}
    </AccordionsGroupContext.Provider>
  )
}

type RootProps = {
  className?: string
  children?: ReactNode | ((props: { isOpen: boolean }) => ReactNode)
  ref?: Ref<{ toggle: () => void }>
}

function Root({ children, className, ref }: RootProps) {
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
      <div className={cn(s.accordion, className)}>
        {typeof children === 'function' ? children({ isOpen }) : children}
      </div>
    </AccordionContext.Provider>
  )
}

function Button({
  children,
  className,
  onClick,
  ...props
}: HTMLAttributes<HTMLButtonElement>) {
  const { toggle } = useAccordionContext()

  return (
    <button
      className={cn(s.button, className)}
      onClick={(e) => {
        onClick?.(e)
        toggle()
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function Body({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  const { isOpen } = useAccordionContext()

  const [setRectRef, entry] = useResizeObserver()

  return (
    <div
      className={cn(s.body, isOpen && s.isOpen)}
      aria-hidden={!isOpen}
      style={{
        height: `${isOpen ? entry?.contentRect.height : 0}px`,
      }}
    >
      <div ref={setRectRef}>
        {/* Activity defers updates when closed and cleans up effects automatically */}
        <Activity mode={isOpen ? 'visible' : 'hidden'}>
          <div className={className}>{children}</div>
        </Activity>
      </div>
    </div>
  )
}

export { Body, Button, Group, Root }

'use client'

import { Collapsible } from '@base-ui/react/collapsible'
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
  use,
  useId,
  useImperativeHandle,
  useState,
} from 'react'

import s from './accordion.module.css'

/**
 * Accordion on Base UI Collapsible; closed content sits in React's `Activity`.
 *
 * @example
 * ```tsx
 * import { Accordion } from '@/components/ui/accordion'
 *
 * <Accordion.Group>
 *   <Accordion.Root>
 *     <Accordion.Button>Section 1</Accordion.Button>
 *     <Accordion.Body>Content 1</Accordion.Body>
 *   </Accordion.Root>
 *   <Accordion.Root>
 *     <Accordion.Button>Section 2</Accordion.Button>
 *     <Accordion.Body>Content 2</Accordion.Body>
 *   </Accordion.Root>
 * </Accordion.Group>
 * ```
 *
 * @example
 * ```tsx
 * // With render function for dynamic button text
 * <Accordion.Root>
 *   {({ isOpen }) => (
 *     <>
 *       <Accordion.Button>{isOpen ? 'Close' : 'Open'}</Accordion.Button>
 *       <Accordion.Body>Hidden content</Accordion.Body>
 *     </>
 *   )}
 * </Accordion.Root>
 * ```
 */

const AccordionsGroupContext = createContext<{
  currentId: string | undefined
  setCurrentId: Dispatch<SetStateAction<string | undefined>>
  inGroup: boolean
}>({
  currentId: undefined,
  // no-op outside a Group; real setter is provided by Group below
  setCurrentId: () => undefined,
  inGroup: false,
})
const AccordionContext = createContext<{
  isOpen: boolean
  id: string
} | null>(null)

function useAccordionsGroupContext() {
  return use(AccordionsGroupContext)
}

function useAccordionContext() {
  const context = use(AccordionContext)
  if (!context) {
    throw new Error('useAccordionContext must be used within an Accordion.Root')
  }
  return context
}

function isRenderFunction(
  children: RootProps['children']
): children is (props: { isOpen: boolean }) => ReactNode {
  return typeof children === 'function'
}

/** Only one accordion in a Group can be open at a time. */
function Group({ children }: PropsWithChildren) {
  const [currentId, setCurrentId] = useState<string | undefined>()

  return (
    <AccordionsGroupContext.Provider
      value={{ currentId, setCurrentId, inGroup: true }}
    >
      {children}
    </AccordionsGroupContext.Provider>
  )
}

type RootProps = {
  className?: string
  children?: ReactNode | ((props: { isOpen: boolean }) => ReactNode)
  ref?: Ref<{ toggle: () => void }>
  defaultOpen?: boolean
}

/** One accordion item; inside a Group, only one item is open at a time. */
function Root({ children, className, ref, defaultOpen = false }: RootProps) {
  const id = useId()
  const { currentId, setCurrentId, inGroup } = useAccordionsGroupContext()

  const hasGroup = inGroup
  const [localOpen, setLocalOpen] = useState(defaultOpen)

  const isOpen = hasGroup ? currentId === id : localOpen

  const toggle = () => {
    if (hasGroup) {
      setCurrentId((prev) => (prev === id ? undefined : id))
    } else {
      setLocalOpen((prev) => !prev)
    }
  }

  useImperativeHandle(ref, () => ({
    toggle,
  }))

  return (
    <AccordionContext.Provider value={{ isOpen, id }}>
      <Collapsible.Root
        open={isOpen}
        onOpenChange={toggle}
        className={cn(s.accordion, className)}
      >
        {isRenderFunction(children) ? children({ isOpen }) : children}
      </Collapsible.Root>
    </AccordionContext.Provider>
  )
}

function Button({
  children,
  className,
  style,
  ...props
}: HTMLAttributes<HTMLButtonElement>) {
  return (
    <Collapsible.Trigger
      className={cn(s.button, className)}
      {...(style && { style })}
      {...props}
    >
      {children}
    </Collapsible.Trigger>
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

  // Before the first measurement `entry` is undefined: 'auto' renders the
  // natural height for that frame instead of an invalid "undefinedpx".
  let panelHeight = '0px'
  if (isOpen) {
    panelHeight = entry ? `${entry.contentRect.height}px` : 'auto'
  }

  return (
    <Collapsible.Panel
      className={cn(s.body, isOpen && s.isOpen)}
      style={{
        height: panelHeight,
      }}
    >
      <div ref={setRectRef}>
        <Activity mode={isOpen ? 'visible' : 'hidden'}>
          <div className={className}>{children}</div>
        </Activity>
      </div>
    </Collapsible.Panel>
  )
}

export { Body, Button, Group, Root }

export const Accordion = {
  Group,
  Root,
  Button,
  Body,
}

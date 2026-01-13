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
  useContext,
  useId,
  useImperativeHandle,
  useState,
} from 'react'
import s from './accordion.module.css'

/**
 * Accordion component built on Base UI Collapsible.
 *
 * Combines Base UI's accessibility features with React 19's Activity
 * for optimal performance when accordion content is hidden.
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

const AccordionsGroupContext = createContext(
  {} as {
    currentId: string | undefined
    setCurrentId: Dispatch<SetStateAction<string | undefined>>
  }
)
const AccordionContext = createContext(
  {} as { isOpen: boolean; toggle: () => void; id: string }
)

function useAccordionsGroupContext() {
  return useContext(AccordionsGroupContext)
}

function useAccordionContext() {
  return useContext(AccordionContext)
}

/**
 * Group component for single-open accordion behavior.
 * Only one accordion can be open at a time within a Group.
 */
function Group({ children }: PropsWithChildren) {
  const [currentId, setCurrentId] = useState<string | undefined>()

  return (
    <AccordionsGroupContext.Provider value={{ currentId, setCurrentId }}>
      {children}
    </AccordionsGroupContext.Provider>
  )
}

/**
 * Props for the Accordion Root component.
 */
type RootProps = {
  /** Additional CSS classes */
  className?: string
  /** Child components or render function with open state */
  children?: ReactNode | ((props: { isOpen: boolean }) => ReactNode)
  /** Ref to access toggle method programmatically */
  ref?: Ref<{ toggle: () => void }>
  /** Default open state (uncontrolled) */
  defaultOpen?: boolean
}

/**
 * Accordion item root component.
 *
 * Provides the context and state management for an individual accordion item.
 * When used within an Accordion.Group, only one item can be open at a time.
 *
 * @param props - Component props
 * @param props.children - Accordion content or render function
 * @param props.className - Additional CSS classes
 * @param props.ref - Ref for programmatic control
 * @param props.defaultOpen - Whether the accordion starts open
 */
function Root({ children, className, ref, defaultOpen = false }: RootProps) {
  const id = useId()
  const { currentId, setCurrentId } = useAccordionsGroupContext()

  // If in a group, use group state; otherwise use local state
  const hasGroup = setCurrentId !== undefined
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
    <AccordionContext.Provider value={{ isOpen, toggle, id }}>
      <Collapsible.Root
        open={isOpen}
        onOpenChange={() => toggle()}
        className={cn(s.accordion, className)}
      >
        {typeof children === 'function' ? children({ isOpen }) : children}
      </Collapsible.Root>
    </AccordionContext.Provider>
  )
}

/**
 * Accordion trigger button.
 * Clicking toggles the accordion open/closed state.
 */
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

/**
 * Accordion body/content panel.
 * Uses Activity to defer updates when hidden for better performance.
 */
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
    <Collapsible.Panel
      className={cn(s.body, isOpen && s.isOpen)}
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
    </Collapsible.Panel>
  )
}

export { Body, Button, Group, Root }

// Also export as namespace for compound component pattern
export const Accordion = {
  Group,
  Root,
  Button,
  Body,
}

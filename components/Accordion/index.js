import {
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useMeasure } from 'react-use'
import s from './style.module.scss'
import cn from 'clsx'

const AccordionsGroupContext = createContext()

const Header = () => null

const Body = () => null

export const Accordion = ({ children, index = 0, className }) => {
  const { opened, toggle } = useContext(AccordionsGroupContext)

  const header = children.find((el) => el.type === Header)
  const body = children.find((el) => el.type === Body)

  const isOpened = useMemo(() => {
    return opened.includes(index)
  }, [opened])

  const [contentRef, { height }] = useMeasure()

  return (
    <div className={cn(s.accordion, className)}>
      <button
        className={s.accordion__header}
        onClick={() => {
          toggle(index)
        }}
      >
        {header?.props?.children}
      </button>
      <div
        className={s.accordion__body}
        style={{
          height: isOpened ? height + 'px' : 0,
          opacity: isOpened ? 1 : 0,
          pointerEvents: isOpened ? 'all' : 'none',
        }}
      >
        <div ref={contentRef}>{body?.props?.children}</div>
      </div>
    </div>
  )
}

export const AccordionGroup = ({ children, limit }) => {
  const [opened, setOpened] = useState([])

  const toggle = (index) => {
    setOpened((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index)
      } else if (limit !== undefined && prev.length === limit) {
        return [...prev, index].slice(1)
      }
      return [...prev, index]
    })
  }

  const renderAccordions = useMemo(() => {
    return (children[0] ? children : [children])
      .filter((el) => el.type === Accordion)
      .map((el, i) => cloneElement(el, { index: i, key: i }))
  }, [children])

  return (
    <AccordionsGroupContext.Provider value={{ opened, toggle }}>
      {renderAccordions}
    </AccordionsGroupContext.Provider>
  )
}

Accordion.Header = Header
Accordion.Body = Body
Accordion.Group = AccordionGroup

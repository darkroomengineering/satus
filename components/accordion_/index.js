import {
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useMeasure } from 'react-use'
import s from './accordion.module.scss'
import cn from 'clsx'

const AccordionsGroupContext = createContext()

const Header = (props) => {
  return <div {...props}>{props.children}</div>
}

const Body = (props) => {
  return <div {...props}>{props.children}</div>
}

export const Accordion = ({ children, index = 0, className }) => {
  const { opened, toggle } = useContext(AccordionsGroupContext)
  const [contentRef, { height }] = useMeasure()

  const isOpened = useMemo(() => {
    return opened.includes(index)
  }, [opened, index])

  const Renders = (el) => {
    switch (el.type) {
      case Header:
        return (
          <button
            className={s.accordion__header}
            onClick={() => {
              toggle(index)
            }}
            key="header"
          >
            <Header {...el.props}>{el.props.children}</Header>
          </button>
        )
      case Body:
        return (
          <div
            className={s.accordion__body}
            style={{
              height: isOpened ? height + 'px' : 0,
              opacity: isOpened ? 1 : 0,
              pointerEvents: isOpened ? 'all' : 'none',
            }}
            key="body"
          >
            <div ref={contentRef}>
              <Body {...el.props}>{el.props.children}</Body>
            </div>
          </div>
        )
    }
  }

  const template = useMemo(() => {
    return (
      <div className={cn(s.accordion, className)}>
        {(children[0] ? children : [children]).map((item) => Renders(item))}
      </div>
    )
  }, [isOpened, height, children, className])

  return template
}

export const AccordionGroup = ({
  children,
  maxAccordionsOpenSimultaniously,
}) => {
  const [opened, setOpened] = useState([])

  const toggle = (index) => {
    setOpened((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index)
      } else if (
        maxAccordionsOpenSimultaniously !== undefined &&
        prev.length === maxAccordionsOpenSimultaniously
      ) {
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

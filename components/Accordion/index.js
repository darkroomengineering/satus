import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useMeasure } from 'react-use'
import s from './accordion.module.scss'

const AccordionsGroupContext = createContext()

export const Accordion = ({ children, isOpen, label, index = 0 }) => {
  const { opened, setOpened } = useContext(AccordionsGroupContext)

  // useEffect(() => {
  //   console.log({ index })
  // }, [index])

  const isOpened = useMemo(() => {
    return index === opened
  }, [opened])

  const [contentRef, { height }] = useMeasure()

  console.log('updated', index)

  return (
    <div className={s.accordion}>
      <div
        className={s.accordion__head}
        onClick={() => {
          setOpened((prev) => (prev === index ? undefined : index))
        }}
      >
        {label}
      </div>
      <div
        className={s.accordion__content}
        style={{
          height: opened ? height + 'px' : 0,
          opacity: isOpened ? 1 : 0,
          pointerEvents: isOpened ? 'all' : 'none',
        }}
      >
        <div ref={contentRef}>{children}</div>
      </div>
    </div>
  )
}

export const AccordionsGroup = ({ children }) => {
  const [opened, setOpened] = useState()

  console.log('accordion updated')

  return (
    <AccordionsGroupContext.Provider value={{ opened, setOpened }}>
      {children}
    </AccordionsGroupContext.Provider>
  )
}

{
  /* <Accordions.group >
    <Accordion  className=""/>
        <Accodion.header className="">
            header
        <Accodion.header>
        <Accodion.content  className="">
            content
        <Accodion.content>  
    </Accordion>
</Accordions.group> */
}

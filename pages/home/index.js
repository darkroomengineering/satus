import { ScrollContext } from 'components/Scroll'
import { useContext, useEffect, useLayoutEffect } from 'react'
import s from './style.module.scss'
import { raf } from '@react-spring/rafz'
import { useStore } from 'lib/store'
import { Accordion } from 'components/Accordion'

export default function Home() {
  function update() {
    const y = useStore.getState()?.scroll?.scroll?.y
    return true
  }

  useEffect(() => {
    raf.onFrame(update)

    return () => {
      raf.cancel(update)
    }
  }, [])

  return (
    <div className={s.pageHome}>
<<<<<<< HEAD
      <Accordion.Group limit={1}>
        <Accordion className={s.pageHome__accordion}>
          <Accordion.Header>
            <div className={s.pageHome__accordion__header}>header</div>
          </Accordion.Header>
          <Accordion.Body>
            <div className={s.pageHome__accordion__body}>body</div>
          </Accordion.Body>
        </Accordion>
        <Accordion className={s.pageHome__accordion}>
          <Accordion.Header>
            <div className={s.pageHome__accordion__header}>header</div>
          </Accordion.Header>
          <Accordion.Body>
            <div className={s.pageHome__accordion__body}>body</div>
          </Accordion.Body>
        </Accordion>
=======
      <Accordion.Group maxAccordionsOpenSimultaniously={3}>
        {Array(6)
          .fill({ header: 'this is header', body: 'this is body' })
          .map((item, idx) => (
            <Accordion
              className={s.pageHome__accordion}
              key={`accordion-item-${idx}`}
            >
              <Accordion.Header>
                <div className={s.pageHome__accordion__header}>
                  header : {`accordion-item-${idx}`}
                </div>
              </Accordion.Header>
              <Accordion.Body>
                <div className={s.pageHome__accordion__body}>{item.body}</div>
              </Accordion.Body>
            </Accordion>
          ))}
>>>>>>> ac94aa58becca65f0f3029cb666496bc8b2881dd
      </Accordion.Group>
    </div>
  )
}

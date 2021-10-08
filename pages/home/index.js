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
      <Accordion.Group limit={1}>
        <Accordion className={s.pageHome__accordion}>
          <Accordion.Header>
            <div className={s.pageHome__accordion__header}>header</div>
          </Accordion.Header>
          <Accordion.Body className={s.pageHome__accordion__body}>
            <div className={s.pageHome__accordion__body}>body</div>
          </Accordion.Body>
        </Accordion>
        <Accordion className={s.pageHome__accordion}>
          <Accordion.Header>
            <div className={s.pageHome__accordion__header}>header</div>
          </Accordion.Header>
          <Accordion.Body className={s.pageHome__accordion__body}>
            <div className={s.pageHome__accordion__body}>body</div>
          </Accordion.Body>
        </Accordion>
      </Accordion.Group>
    </div>
  )
}

import { ScrollContext } from 'components/Scroll'
import cn from 'clsx'
import { useContext, useEffect, useLayoutEffect } from 'react'
import s from './style.module.scss'
import { raf } from '@react-spring/rafz'
import { useStore } from 'lib/store'
import { Accordion } from 'components/Accordion'
import { Marquee } from 'components/Marquee'
import Slider from 'components/Slider'

const devs = [
  {
    name: 'Franco',
    position: 'Lords of Lords',
    image: '/devs/franco.png',
  },
  {
    name: 'Clement',
    position: 'Expert on Dark Magic',
    image: '/devs/clement.png',
  },
  {
    name: 'Leandro',
    position: 'He didnt fucked it up',
    image: '/devs/leandro.png',
  },
  {
    name: 'Guido',
    position: 'Avoids owning projects',
    image: '/devs/guido.png',
  },
]

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
      <Marquee className={s.pageHome__marquee} offset={50} repeat={3}>
        marquee stuff that scroll continuously
      </Marquee>
      <Marquee className={s.pageHome__marquee} inverted repeat={3}>
        marquee stuff that scroll continuously
      </Marquee>
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
      </Accordion.Group>
      <Slider>
        <Slider.Header>
          <div className={s['slider-header']}>
            <p>Slider Header</p>
            <p>Slider Title</p>
          </div>
        </Slider.Header>
        <Slider.Embla
          emblaApi={{
            slidesToScroll: 1,
            skipSnaps: false,
            startIndex: 1,
            loop: true,
            autoScroll: true,
          }}
        >
          <Slider.Embla.Slide>
            {devs.map((item, idx) => (
              <div className={s['slide']} key={`slide-item-${idx}`}>
                <div className={s['slide-inner']}>
                  <img src={item.image} alt="" className={s['slide-img']} />
                  <p className={s['slide-title']}>{item.name}</p>
                  <p className={s['slide-text']}>{item.position}</p>
                </div>
              </div>
            ))}
          </Slider.Embla.Slide>
          <Slider.Embla.Buttons />
        </Slider.Embla>
      </Slider>
    </div>
  )
}

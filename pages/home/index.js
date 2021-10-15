import { ScrollContext } from 'components/scroll'
import cn from 'clsx'
import { useContext, useEffect, useLayoutEffect, Fragment } from 'react'
import s from './home.module.scss'
import { raf } from '@react-spring/rafz'
import { useStore } from 'lib/store'
import { Accordion } from 'components/accordion'
import { Marquee } from 'components/marquee'
import Slider from 'components/slider'
import { Layout } from 'layouts/default'

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
    <Layout>
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
                <Accordion.Header className={s.pageHome__accordion__header}>
                  header : {`accordion-item-${idx}`}
                </Accordion.Header>
                <Accordion.Body className={s.pageHome__accordion__body}>
                  {item.body}
                </Accordion.Body>
              </Accordion>
            ))}
        </Accordion.Group>
        <Slider
          emblaApi={{
            slidesToScroll: 1,
            skipSnaps: false,
            startIndex: 1,
            loop: true,
            autoScroll: true,
          }}
        >
          {({ scrollPrev, scrollNext, emblaRef }) => {
            return (
              <Fragment>
                <div className={s['slider-header']}>
                  <p>Slider Hader</p>
                  <p>Slider Title</p>
                </div>
                <Slider.Slides emblaRef={emblaRef}>
                  {devs.map((item, idx) => (
                    <div className={s['slide']} key={`slide-item-${idx}`}>
                      <div className={s['slide-inner']}>
                        <img
                          src={item.image}
                          alt=""
                          className={s['slide-img']}
                        />
                        <p className={s['slide-title']}>{item.name}</p>
                        <p className={s['slide-text']}>{item.position}</p>
                      </div>
                    </div>
                  ))}
                </Slider.Slides>
                <button onClick={scrollPrev} className={s['slide-buttons']}>
                  previous
                </button>
                <button onClick={scrollPrev} className={s['slide-buttons']}>
                  next
                </button>
              </Fragment>
            )
          }}
        </Slider>
      </div>
    </Layout>
  )
}

import { raf } from '@react-spring/rafz'
import { Accordion } from 'components/accordion'
import { Marquee } from 'components/marquee'
import Slider from 'components/slider'
import { useRect } from 'hooks/use-rect'
import { Layout } from 'layouts/default'
import { Fragment, useEffect, useRef } from 'react'
import s from './home.module.scss'

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
  const rectRef = useRef()
  const [ref, compute] = useRect()

  function update() {
    const rect = compute()
    if (rect) {
      const string = `inView: ${rect.inView}<br>left:${Math.round(
        rect.left
      )}px<br>top:${Math.round(rect.top)}px<br>width:${
        rect.width
      }px<br>height:${rect.height}px<br>right:${Math.round(
        rect.right
      )}px<br>bottom:${Math.round(rect.bottom)}px`
      rectRef.current.innerHTML = string
    }

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
          HOLA JORDAN
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

        <div
          ref={(node) => {
            rectRef.current = node
            ref.current = node
          }}
          style={{
            width: '250px',
            height: '250px',
            backgroundColor: 'cyan',
            margin: '0 auto',
          }}
        ></div>
      </div>
    </Layout>
  )
}

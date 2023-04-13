import * as Accordion from '@radix-ui/react-accordion'
import {
  Image,
  Kinesis,
  Link,
  Marquee,
  MarqueeScroll,
  Slider,
} from '@studio-freight/compono'
import { useMediaQuery, useRect } from '@studio-freight/hamo'
import { useLenis } from '@studio-freight/react-lenis'
import { types } from '@theatre/core'
import { Layout } from 'layouts/default'
import { useSheet } from 'lib/theatre'
import { useTheatre } from 'lib/theatre/hooks/use-theatre'
import { useRef } from 'react'
import s from './home.module.scss'

const devs = [
  {
    name: 'Franco',
    position: 'Pizza of Pizza',
    image: 'https://assets.studiofreight.com/devs/franco.png',
  },
  {
    name: 'Clement',
    position: 'Expert on Dark Magic',
    image: 'https://assets.studiofreight.com/devs/clement.png',
  },
  {
    name: 'Leandro',
    position: 'He didnt fucked it up',
    image: 'https://assets.studiofreight.com/devs/leandro.png',
  },
  {
    name: 'Guido',
    position: 'Avoids owning projects',
    image: 'https://assets.studiofreight.com/devs/guido.png',
  },
]

export default function Home() {
  const rectRef = useRef()
  const [setRef, rect] = useRect()
  const isDesktop = useMediaQuery('(min-width: 800px)')

  useLenis(
    ({ scroll }) => {
      const top = rect.top - scroll
      const left = rect.left
      const width = rect.width
      const height = rect.height

      const string = `left:${Math.round(left)}px<br>top:${Math.round(
        top
      )}px<br>width:${width}px<br>height:${height}px<br>right:${Math.round(
        left + width
      )}px<br>bottom:${Math.round(top + height)}px`
      rectRef.current.innerHTML = string
    },
    [rect],
    1
  )

  const theatreRectRef = useRef()

  const sheet = useSheet('Home')

  useTheatre(
    sheet,
    'hero',
    {
      visible: true,
      x: types.number(0, { range: [-100, 100] }),
      y: types.number(0, { range: [-100, 100] }),
    },
    {
      onValuesChange: ({ x, y, visible }) => {
        theatreRectRef.current.style.transform = `translate3d(${x}%,${y}%,0)`
        theatreRectRef.current.style.opacity = visible ? 1 : 0
      },
    }
  )

  return (
    <Layout theme="light">
      <section className={s.home} id="top">
        <div className={s.theatreRect} ref={theatreRectRef} />
        {isDesktop === true ? (
          <span>only desktop and no SSR</span>
        ) : (
          <span>only mobile and SSR</span>
        )}
        <Marquee className={s.marquee} repeat={3}>
          <span className={s.item}>marquee stuff that scroll continuously</span>
        </Marquee>
        <MarqueeScroll className={s.marquee} inverted repeat={4}>
          <span className={s.item}>HOLA JORDAN</span>
        </MarqueeScroll>
        <Link href="#kinesis">scroll to kinesis</Link>
        <Accordion.Root type="single" collapsible>
          {Array(2)
            .fill({ header: 'this is header', body: 'this is body' })
            .map((item, key) => (
              <Accordion.Item
                key={key + 1}
                value={key + 1}
                className={s.accordion}
              >
                <Accordion.Header>
                  <Accordion.Trigger>header</Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className={s.accordion__content}>
                  <div>body</div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
        </Accordion.Root>
        <Slider emblaApi={{ align: 'center', skipSnaps: false }}>
          {({ scrollPrev, scrollNext, emblaRef }) => {
            return (
              <div className={s.slider}>
                <div className={s['slider-header']}>
                  <p>Slider Hader</p>
                  <p>Slider Title</p>
                </div>
                <Slider.Slides ref={emblaRef}>
                  {devs.map(({ image, name, position }, idx) => (
                    <div className={s['slide']} key={`slide-item-${idx}`}>
                      <div className={s['slide-inner']}>
                        <Image
                          src={image}
                          alt=""
                          width="300"
                          height="300"
                          className={s['slide-img']}
                          size="20vw"
                        />
                        <p className={s['slide-title']}>{name}</p>
                        <p className={s['slide-text']}>{position}</p>
                      </div>
                    </div>
                  ))}
                </Slider.Slides>
                <button onClick={scrollPrev} className={s['slide-buttons']}>
                  previous
                </button>
                <button onClick={scrollNext} className={s['slide-buttons']}>
                  next
                </button>
              </div>
            )
          }}
        </Slider>

        <Link id="kinesis" href="#top">
          <Kinesis className={s.kinesis}>
            <div className={s.item}>kinesis</div>
          </Kinesis>
        </Link>

        <div style={{ height: '100vh' }} id="rect">
          <div
            ref={(node) => {
              setRef(node)
              rectRef.current = node
            }}
            style={{
              width: '250px',
              height: '250px',
              backgroundColor: 'cyan',
              margin: '0 auto',
            }}
          ></div>
        </div>
      </section>
    </Layout>
  )
}

export async function getStaticProps() {
  return {
    props: {
      id: 'home',
    }, // will be passed to the page component as props
  }
}

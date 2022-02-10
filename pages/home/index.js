import * as Accordion from '@radix-ui/react-accordion'
import { Marquee } from 'components/marquee'
import { Slider } from 'components/slider'
import { useFrame } from 'hooks/use-frame'
import { useRect } from 'hooks/use-rect'
import { Layout } from 'layouts/default'
import { useStore } from 'lib/store'
import { useRef } from 'react'
import s from './home.module.scss'

const devs = [
  {
    name: 'Franco',
    position: 'Lords of Lords',
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
  const [ref, compute] = useRect()
  const locomotive = useStore((state) => state.locomotive)

  useFrame(() => {
    const scrollY = locomotive?.scroll.instance.scroll.y || 0

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
  }, 0)

  console.log('update')

  return (
    <Layout>
      <div className={s.pageHome}>
        <Marquee className={s.pageHome__marquee} offset={50} repeat={3}>
          marquee stuff that scroll continuously
        </Marquee>
        <Marquee className={s.pageHome__marquee} inverted repeat={3}>
          HOLA JORDAN
        </Marquee>
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
              <>
                <div className={s['slider-header']}>
                  <p>Slider Hader</p>
                  <p>Slider Title</p>
                </div>
                <Slider.Slides ref={emblaRef} className={s.slider}>
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
              </>
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

import * as Accordion from '@radix-ui/react-accordion'
import { raf } from '@react-spring/rafz'
import { Marquee } from 'components/marquee'
import { Slider } from 'components/slider'
import { CmsMethods, fetchCmsQuery } from 'contentful/api'
import { homeQuery } from 'contentful/queries/homepage.graphql'
import { useRect } from 'hooks/use-rect'
import { Layout } from 'layouts/default'
import { useEffect, useRef } from 'react'
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
                <Slider.Slides ref={emblaRef}>
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

export const getStaticProps = async ({ preview = false }) => {
  const cmsMethods = new CmsMethods()
  const variables = {
    pageId: '67aYLZRzNXmiiUsc2GDCnP',
    preview: preview,
  }
  const fetchHomePage = await fetchCmsQuery(homeQuery, variables)
  const data = fetchHomePage?.home

  const homePageData = {
    title: 'hola',
  }

  console.log(homePageData)

  return {
    props: {
      homePageData,
    },
    revalidate: 1,
  }
}

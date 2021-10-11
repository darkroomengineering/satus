import cn from 'clsx'
import useEmblaCarousel from 'embla-carousel-react'
import { Fragment, useCallback, useEffect, useState } from 'react'
import useInterval from 'hooks/useInterval'
import SliderBtn from './emblaButtons'
import s from './embla.module.scss'

const Buttons = () => null
const Slide = () => null

const Embla = ({ children, emblaApi = {} }) => {
  const [emblaRef, embla] = useEmblaCarousel(emblaApi)

  const [scrollSnaps, setScrollSnaps] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [delay, setDelay] = useState(5000)
  const [isRunning, setIsRunning] = useState(emblaApi.autoScroll)

  const scrollPrev = useCallback(() => {
    embla && embla.scrollPrev()
  }, [embla])
  const scrollNext = useCallback(() => {
    embla && embla.scrollNext()
  }, [embla])
  const scrollTo = useCallback(
    (index) => embla && embla.scrollTo(index),
    [embla]
  )

  useInterval(
    () => {
      if (selectedIndex === scrollSnaps.length - 1) {
        scrollTo(0)
      } else {
        scrollNext()
      }
    },
    isRunning ? delay : null
  )

  useEffect(() => {
    const onSelect = () => {
      setSelectedIndex(embla.selectedScrollSnap())
    }
    if (embla) {
      setScrollSnaps(embla.scrollSnapList())
      embla.on('select', onSelect)
      onSelect()
    }
  }, [embla])

  const Renders = (el) => {
    switch (el.type) {
      case Buttons:
        return (
          <SliderBtn
            className={s['button-wrapper']}
            key={'Button'}
            scrollPrev={scrollPrev}
            scrollNext={scrollNext}
          />
        )
      case Slide:
        return (
          <div className={s['slides-wrapper']} ref={emblaRef} key={'Slider'}>
            <div className={s.container}>
              {el.props.children.map((child, idx) => child)}
            </div>
          </div>
        )
    }
  }

  const slides = children[0] ? children : [children]
  return <div className={s.slider}>{slides.map((item) => Renders(item))}</div>
}

Embla.Slide = Slide
Embla.Buttons = Buttons

export default Embla

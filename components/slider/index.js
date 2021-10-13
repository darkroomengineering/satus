import cn from 'clsx'
import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useState } from 'react'
import useInterval from 'hooks/use-interval'
import s from './slider.module.scss'

const Slides = ({ children, emblaRef }) => {
  return (
    <div className={s.slider}>
      <div className={s['slides-wrapper']} ref={emblaRef}>
        <div className={s.container}>{children.map((child, idx) => child)}</div>
      </div>
    </div>
  )
}

const Slider = ({ children, emblaApi = {} }) => {
  const [emblaRef, embla] = useEmblaCarousel(emblaApi)
  const [scrollSnaps, setScrollSnaps] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [delay, setDelay] = useState(5000)
  const [isRunning, setIsRunning] = useState(emblaApi.autoScroll ?? false)

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

  return children({ scrollPrev, scrollNext, emblaRef })
}

Slider.Slides = Slides

export default Slider

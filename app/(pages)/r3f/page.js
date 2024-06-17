'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { TheatreProjectProvider } from 'libs/theatre'
import { useContext, useRef } from 'react'
import { TransitionContext } from '../(components)/page-transition/transition.context'
import { Wrapper } from '../(components)/wrapper'
import { Box } from './(components)/box'
import s from './r3f.module.scss'

gsap.registerPlugin(useGSAP)

export default function R3fPage() {
  const { timeline } = useContext(TransitionContext)
  const container = useRef(null)

  useGSAP(
    () => {
      const targets = gsap.utils.toArray(['div'])

      gsap.fromTo(
        targets,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.25 },
      )
      timeline.add(gsap.to(container.current, { opacity: 0 }))
    },
    { scope: container },
  )

  return (
    <TheatreProjectProvider id="Satus-R3f" config="/config/Satus-R3f.json">
      <Wrapper ref={container} theme="red" className={s.page} webgl={true}>
        <Box />
      </Wrapper>
    </TheatreProjectProvider>
  )
}

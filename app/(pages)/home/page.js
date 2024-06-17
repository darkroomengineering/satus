'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useContext, useRef } from 'react'
import { TransitionContext } from '../(components)/page-transition/transition.context'
import { Wrapper } from '../(components)/wrapper'
import s from './home.module.scss'

gsap.registerPlugin(useGSAP)

export default function Home() {
  const { timeline } = useContext(TransitionContext)
  const container = useRef(null)

  useGSAP(
    () => {
      gsap.fromTo(
        'p',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.25 },
      )
      timeline.add(gsap.to(container.current, { opacity: 0 }))
    },
    { scope: container },
  )

  return (
    <Wrapper ref={container} theme="red" className={s.page}>
      <section className={s.inner}>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit.
          Necessitatibus, nobis. Adipisci debitis maiores dolorem optio
          architecto omnis dolor dolores autem. Vel doloribus, placeat ipsam
          harum quasi velit cumque dignissimos doloremque?
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit.
          Necessitatibus, nobis. Adipisci debitis maiores dolorem optio
          architecto omnis dolor dolores autem. Vel doloribus, placeat ipsam
          harum quasi velit cumque dignissimos doloremque?
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit.
          Necessitatibus, nobis. Adipisci debitis maiores dolorem optio
          architecto omnis dolor dolores autem. Vel doloribus, placeat ipsam
          harum quasi velit cumque dignissimos doloremque?
        </p>
      </section>
    </Wrapper>
  )
}

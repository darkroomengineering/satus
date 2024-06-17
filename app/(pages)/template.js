'use client'

import { useGSAP } from '@gsap/react'

import gsap from 'gsap'

import { useContext, useEffect, useState } from 'react'
import { TransitionContext } from './(components)/page-transition/transition.context'

gsap.registerPlugin(useGSAP)

export default function Template(props) {
  const { children } = props
  const [displayChildren, setDisplayChildren] = useState(children)
  const { timeline } = useContext(TransitionContext)

  useEffect(() => {
    console.log('pause', props)
    timeline.pause().clear()
    return () => {
      console.log('play', props)
      timeline.play().then(() => {
        window.scrollTo(0, 0)
        setDisplayChildren(children)
      })
    }
  }, [children])

  return displayChildren
}

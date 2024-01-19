'use client'

import { SplitText as GSAPSplitText } from 'components/split-text'
import { colors } from 'config/variables'
import gsap from 'gsap'
import { useEffect, useState } from 'react'

export function SplitText({ children }) {
  const [titleSplitted, setTitleSplitted] = useState()

  useEffect(() => {
    const words = titleSplitted?.words

    if (!words) return

    words.forEach((word) => {
      word.addEventListener(
        'mouseenter',
        () => {
          gsap.fromTo(
            word,
            {
              color: colors.green,
            },
            {
              color: colors.white,
              duration: 4,
              ease: 'expo.out',
            },
          )
        },
        false,
      )
    })
  }, [titleSplitted])

  return (
    <GSAPSplitText
      ref={(node) => {
        if (node) setTitleSplitted(node)
      }}
      type="words"
    >
      {children}
    </GSAPSplitText>
  )
}

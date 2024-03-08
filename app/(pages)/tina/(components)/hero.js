'use client'

import { useTinaContext } from 'tina/tina-provider'
import { tinaField } from 'tinacms/dist/react'

export const Hero = () => {
  const { hero: data } = useTinaContext()

  if (!data) return

  return (
    <p data-tina-field={tinaField(data.firstFold, 'title')}>
      {data.firstFold.title}
    </p>
  )
}

'use client'

import { useTinaContext } from 'tina/tina-provider'
import { tinaField } from 'tinacms/dist/react'

export const Section = () => {
  const { sections: data } = useTinaContext()

  if (!data) return

  return (
    <p data-tina-field={tinaField(data.firstSection, 'title')}>
      {data.firstSection.title}
    </p>
  )
}

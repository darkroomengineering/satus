import NextImage from 'next/image'
import { forwardRef } from 'react'

export const Image = forwardRef(function Image({ ...props }, ref) {
  return <NextImage ref={ref} {...props} />
})
'use client'

import { Link as ComponoLink } from '@studio-freight/compono'

export function Link({ children, ...props }) {
  return <ComponoLink {...props}>{children}</ComponoLink>
}

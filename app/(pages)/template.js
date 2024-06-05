'use client'

import { PageTransition } from 'components/page-transition'

export default function Template({ children }) {
  return <PageTransition>{children}</PageTransition>
}

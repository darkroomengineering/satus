'use client'

import { useSearchParams } from 'next/navigation'

export function useIsVisualEditor() {
  const searchParams = useSearchParams()
  return searchParams?.has('_storyblok')
}

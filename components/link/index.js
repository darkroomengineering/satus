'use client'

import { useSetFinishViewTransition } from 'components/page-transition/transition-context'
import { useLenis } from 'libs/lenis'
import NextLink from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { forwardRef, startTransition, useCallback } from 'react'

// copied from https://github.com/vercel/next.js/blob/66f8ffaa7a834f6591a12517618dce1fd69784f6/packages/next/src/client/link.tsx#L180-L191
function isModifiedEvent(event) {
  const eventTarget = event.currentTarget
  const target = eventTarget.getAttribute('target')
  return (
    (target && target !== '_self') ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey || // triggers resource download
    (event.nativeEvent && event.nativeEvent.which === 2)
  )
}

// copied from https://github.com/vercel/next.js/blob/66f8ffaa7a834f6591a12517618dce1fd69784f6/packages/next/src/client/link.tsx#L204-L217
function shouldPreserveDefault(e) {
  const { nodeName } = e.currentTarget
  const isAnchorNodeName = nodeName.toUpperCase() === 'A'
  if (isAnchorNodeName && isModifiedEvent(e)) {
    return true
  }
  return false
}

export const Link = forwardRef(function Link(
  // eslint-disable-next-line
  { href, fallback = 'div', onClick, replace, scroll, ...props },
  ref,
) {
  // eslint-disable-next-line
  const lenis = useLenis()
  const pathname = usePathname()
  const router = useRouter()
  const finishViewTransition = useSetFinishViewTransition()

  if (!href || typeof href !== 'string') {
    const Tag = fallback
    return <Tag ref={ref} {...props} href={href} />
  }

  const isExternal = href.startsWith('http')

  if (isExternal) {
    props.target = '_blank'
    props.rel = 'noopener noreferrer'
  }

  const isAnchor = href.startsWith('#') || href.startsWith(`${pathname}#`)

  // eslint-disable-next-line
  const handleClick = useCallback(
    (e) => {
      if (props.onClick) {
        props.onClick(e)
      }

      if ('startViewTransition' in document) {
        if (shouldPreserveDefault(e)) {
          return
        }

        e.preventDefault()

        document.startViewTransition(
          () =>
            new Promise((resolve) => {
              startTransition(() => {
                router[replace ? 'replace' : 'push'](href, {
                  scroll: scroll ?? true,
                })
                finishViewTransition(() => resolve())
              })
            }),
        )
      } else {
        if (isAnchor && lenis) {
          e.preventDefault()
          lenis.scrollTo(href)
        }
      }
    },
    [props.onClick, href, replace, scroll],
  )

  return <NextLink ref={ref} onClick={handleClick} {...props} href={href} />
})

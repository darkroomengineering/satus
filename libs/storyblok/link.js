import { Link } from 'components/link'
import { forwardRef } from 'react'

const storyBlokLink = (link) => {
  const linkType = typeof link

  if (!link || (linkType !== 'string' && linkType !== 'object')) {
    console.log('warning wrong link type', link)
    return 'no-valid'
  }

  if (linkType === 'string') return link

  if (!link?.cached_url) {
    console.log(
      'warning wrong link allocation verify passing correct element',
      link,
    )

    return 'no-valid'
  }

  let href = link?.cached_url

  if (link?.anchor) {
    href = `${href}#${link.anchor}`
  }

  return href
}

export const StoryblokLink = forwardRef(function SBLink(
  { href, ...props },
  ref,
) {
  return <Link ref={ref} href={storyBlokLink(href)} {...props} />
})

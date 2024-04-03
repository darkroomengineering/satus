// https://www.npmjs.com/package/storyblok-rich-text-react-renderer

import { Image } from 'components/image'
import { Link } from 'components/link'
import {
  MARK_LINK,
  NODE_IMAGE,
  render,
} from 'storyblok-rich-text-react-renderer'

export function renderRichText(
  content,
  { markResolvers = {}, nodeResolvers = {}, blokResolvers = {} } = {},
) {
  return render(content, {
    markResolvers: {
      [MARK_LINK]: (children, { href }) =>
        children && <Link href={href}>{children}</Link>,
      ...markResolvers,
    },
    nodeResolvers: {
      [NODE_IMAGE]: (children, { src, alt }) =>
        src && <Image src={src} alt={alt} />,
      ...nodeResolvers,
    },
    blokResolvers: {
      ...blokResolvers,
    },
  })
}

export function RichText({
  content,
  markResolvers = {},
  nodeResolvers = {},
  blokResolvers = {},
}) {
  return renderRichText(content, {
    markResolvers,
    nodeResolvers,
    blokResolvers,
  })
}

// https://www.npmjs.com/package/storyblok-rich-text-react-renderer

import { Image } from 'components/image'
import { Link } from 'components/link'
import {
  MARK_LINK,
  NODE_HEADING,
  NODE_IMAGE,
  NODE_PARAGRAPH,
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
      [NODE_HEADING]: (children, { level }) => {
        switch (level) {
          case 1:
            return <h1 className="h1">{children}</h1>
          case 2:
            return <h2 className="h2">{children}</h2>
          case 3:
            return <h3 className="h3">{children}</h3>
          case 4:
            return <h4 className="h4">{children}</h4>
          case 5:
            return <h5 className="h5">{children}</h5>
          case 6:
            return <h6 className="h6">{children}</h6>
          default:
            return null
        }
      },
      [NODE_PARAGRAPH]: (children) => <p className="p">{children}</p>,
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

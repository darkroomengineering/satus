// https://www.npmjs.com/package/storyblok-rich-text-react-renderer

import {
  MARK_LINK,
  NODE_IMAGE,
  type RenderOptions,
  type StoryblokRichtext,
  render,
} from 'storyblok-rich-text-react-renderer'
import { Image } from '~/components/image'
import { Link } from '~/components/link'

type RenderRichTextOptions = {
  markResolvers?: RenderOptions['markResolvers']
  nodeResolvers?: RenderOptions['nodeResolvers']
  blokResolvers?: RenderOptions['blokResolvers']
}

export function renderRichText(
  content: StoryblokRichtext | unknown,
  {
    markResolvers = {},
    nodeResolvers = {},
    blokResolvers = {},
  }: RenderRichTextOptions = {}
) {
  return render(content, {
    markResolvers: {
      [MARK_LINK]: (children, { href }) =>
        children ? <Link href={href}>{children}</Link> : null,
      ...markResolvers,
    },
    nodeResolvers: {
      [NODE_IMAGE]: (_, { src, alt }) =>
        src ? <Image src={src} alt={alt} /> : null,
      ...nodeResolvers,
    },
    blokResolvers: {
      ...blokResolvers,
    },
  })
}

type RichTextProps = {
  content: StoryblokRichtext | unknown
} & RenderRichTextOptions

export function RichText({
  content,
  markResolvers = {},
  nodeResolvers = {},
  blokResolvers = {},
}: RichTextProps) {
  return renderRichText(content, {
    markResolvers,
    nodeResolvers,
    blokResolvers,
  })
}

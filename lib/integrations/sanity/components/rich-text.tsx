import { PortableText, type PortableTextBlock } from '@portabletext/react'
import { Link } from '@/components/ui/link'
import { SanityImage } from '@/components/ui/sanity-image'
import type { Link as SanityLink } from '../sanity.types'
import { getLinkAttributes } from '../utils/link'

interface RichTextProps {
  content: PortableTextBlock[]
}

export function RichText({ content }: RichTextProps) {
  if (!content) return null

  return (
    <PortableText
      value={content}
      components={{
        types: {
          image: ({ value }) => <SanityImage image={value} maxWidth={1920} />,
        },
        marks: {
          link: ({ children, value }) => {
            const linkData = value as SanityLink
            const { href, target, rel } = getLinkAttributes(linkData)

            return (
              <Link
                href={href}
                target={target}
                rel={rel}
                data-sanity-edit-target
              >
                {children}
              </Link>
            )
          },
        },
        block: {
          h1: ({ children }) => <h1 className="h1">{children}</h1>,
          h2: ({ children }) => <h2 className="h2">{children}</h2>,
          h3: ({ children }) => <h3 className="h3">{children}</h3>,
          h4: ({ children }) => <h4 className="h4">{children}</h4>,
          h5: ({ children }) => <h5 className="h5">{children}</h5>,
          h6: ({ children }) => <h6 className="h6">{children}</h6>,
          normal: ({ children }) => <p className="p">{children}</p>,
        },
      }}
    />
  )
}

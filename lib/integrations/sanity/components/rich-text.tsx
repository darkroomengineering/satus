import { PortableText, type PortableTextBlock } from '@portabletext/react'
import { Link } from '~/components/link'
import { SanityImage } from '~/components/sanity-image'

interface RichTextProps {
  content: PortableTextBlock[]
}

interface LinkFieldData {
  type: 'external' | 'internal'
  url?: string
  blank?: boolean
  label?: string
}

function resolveLinkFieldUrl(linkData: LinkFieldData): string {
  if (!linkData) return '#'

  // External URL
  if (linkData.type === 'external' && linkData.url) {
    return linkData.url
  }

  // Internal path (like /home, /hubspot, /r3f, etc.)
  if (linkData.type === 'internal' && linkData.url) {
    return linkData.url
  }

  return '#'
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
            const href = resolveLinkFieldUrl(value)
            const isExternal = value?.type === 'url'

            return (
              <Link
                href={href}
                target={isExternal && value?.blank ? '_blank' : undefined}
                rel={
                  isExternal && value?.blank ? 'noopener noreferrer' : undefined
                }
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

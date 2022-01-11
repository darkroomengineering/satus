import { documentToReactComponents } from '@contentful/rich-text-react-renderer'
import { BLOCKS, INLINES } from '@contentful/rich-text-types'
import cn from 'clsx'
import s from './renderer.module.scss'

export default function renderTerms({ json }) {
  const document = json

  const options = {
    renderNode: {
      [BLOCKS.HEADING_5]: function p(node, children) {
        return <h5 className="h5 secondary">{children}</h5>
      },
      [BLOCKS.PARAGRAPH]: function p(node, children) {
        return <p className="p">{children}</p>
      },
      [INLINES.HYPERLINK]: function hyperlink(node, children) {
        return (
          <a
            className={cn('link', s.links)}
            target="_blank"
            href={node.data.uri}
            rel="noopener noreferrer"
          >
            {children}
          </a>
        )
      },
    },
  }
  return documentToReactComponents(document, options)
}

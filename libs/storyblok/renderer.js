import { render } from 'storyblok-rich-text-react-renderer'

export function renderRichText(content, customResolvers = {}) {
  return render(content, {
    markResolvers: {
      //   [MARK_LINK]: (children, { href }) => {
      //     return (
      //       <StoryblokLink href={href} className="link">
      //         {children}
      //       </StoryblokLink>
      //     )
      //   },
      ...customResolvers.markResolvers,
    },
    nodeResolvers: {
      // [NODE_HEADING]: (children, { level }) => {
      //   switch (level) {
      //     case 1:
      //       return <h1 className="h1">{children}</h1>
      //     case 2:
      //       return <h2 className="h2">{children}</h2>
      //     case 3:
      //       return <h3 className="h3">{children}</h3>
      //     case 4:
      //       return <h4 className="h4">{children}</h4>
      //     case 5:
      //       return <h5 className="h5">{children}</h5>
      //     case 6:
      //       return <h6 className="h6">{children}</h6>
      //     default:
      //       return null
      //   }
      // },
      // [NODE_QUOTE]: (children) => (
      //   <blockquote className="quote">{children}</blockquote>
      // ),
      // [NODE_PARAGRAPH]: (children) => <p className="p">{children}</p>,
      // [NODE_OL]: (children) => <ol className="ol">{children}</ol>,
      // [NODE_LI]: (children) => <li className="li">{children}</li>,
      // [NODE_UL]: (children) => <ul className="ul">{children}</ul>,
      ...customResolvers.nodeResolvers,
    },
    blokResolvers: {
      // yourCustomBlock: ({ data, _editable }) => {
      //   return (
      //     <div {...storyblokEditable(_editable)}>
      //       <p>{data.title}</p>
      //     </div>
      //   )
      // },
      ...customResolvers.blokResolvers,
    },
  })
}

export function RichText({ tag = 'div', content, className, resolvers = {} }) {
  const Tag = tag

  return <Tag className={className}>{renderRichText(content, resolvers)}</Tag>
}

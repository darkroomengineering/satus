import { Image } from 'components/image'
import { TinaMarkdown } from 'tinacms/dist/rich-text'
import s from './richtext.module.scss'

export const RichText = ({ content, components = {} }) => {
  return content ? (
    <TinaMarkdown
      content={content}
      components={{
        h1: RenderH1,
        h2: RenderH2,
        h3: RenderH3,
        h4: RenderH4,
        h5: RenderH5,
        h6: RenderH6,
        ul: RenderUl,
        ol: RenderOl,
        p: RenderParagraph,
        img: RenderImage,
        ...components,
      }}
    />
  ) : (
    <span>Enter text</span>
  )
}

const RenderH1 = ({ children }) => {
  return <h1 className="h1">{children}</h1>
}

const RenderH2 = ({ children }) => {
  return <h2 className="h2">{children}</h2>
}

const RenderH3 = ({ children }) => {
  return <h3 className="h3">{children}</h3>
}

const RenderH4 = ({ children }) => {
  return <h4 className="h4">{children}</h4>
}

const RenderH5 = ({ children }) => {
  return <h5 className="h5">{children}</h5>
}

const RenderH6 = ({ children }) => {
  return <h6 className="p-m">{children}</h6>
}

const RenderUl = ({ children }) => {
  return <ul className={s['unordered-list']}>{children}</ul>
}

const RenderOl = ({ children }) => {
  return <ol className={s['ordered-list']}>{children}</ol>
}

const RenderParagraph = ({ children }) => {
  if (children.props.content[0].type === 'img') {
    return <div className={s.image}>{children}</div>
  }

  return <p className="p">{children}</p>
}

const RenderImage = ({ url, caption = '' }) => {
  return <Image src={url} alt={caption} />
}

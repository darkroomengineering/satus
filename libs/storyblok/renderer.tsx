// https://www.npmjs.com/package/storyblok-rich-text-react-renderer

import {
  MARK_LINK,
  NODE_HEADING,
  NODE_IMAGE,
  NODE_PARAGRAPH,
  type RenderOptions,
  type StoryblokRichtext,
  render,
} from "storyblok-rich-text-react-renderer";
import { Image } from "~/components/image";
import { Link } from "~/components/link";

type RenderRichTextOptions = {
  markResolvers?: RenderOptions["markResolvers"];
  nodeResolvers?: RenderOptions["nodeResolvers"];
  blokResolvers?: RenderOptions["blokResolvers"];
};

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
      [NODE_HEADING]: (children, { level }) => {
        switch (level) {
          case 1:
            return <h1 className="h1">{children}</h1>;
          case 2:
            return <h2 className="h2">{children}</h2>;
          case 3:
            return <h3 className="h3">{children}</h3>;
          case 4:
            return <h4 className="h4">{children}</h4>;
          case 5:
            return <h5 className="h5">{children}</h5>;
          case 6:
            return <h6 className="h6">{children}</h6>;
          default:
            return null;
        }
      },
      [NODE_PARAGRAPH]: (children) => <p className="p">{children}</p>,
      ...nodeResolvers,
    },
    blokResolvers: {
      ...blokResolvers,
    },
  });
}

type RichTextProps = {
  content: StoryblokRichtext | unknown;
} & RenderRichTextOptions;

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
  });
}

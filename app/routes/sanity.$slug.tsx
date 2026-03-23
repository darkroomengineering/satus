import type { SanityDocument } from "@sanity/client";
import { Link } from "react-router";
import { Image } from "~/components/image";
import { Wrapper } from "~/components/wrapper";
import { client } from "~/integrations/sanity/client";
import { urlForImage } from "~/integrations/sanity/image";
import { articleQuery } from "~/integrations/sanity/queries";
import type { Route } from "./+types/sanity.$slug";

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.article?.title;
  return [{ title: title ? `${title} — Satus` : "Article — Satus" }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const article = await client.fetch<SanityDocument>(articleQuery, {
    slug: params.slug,
  });
  if (!article) {
    throw new Response("Article not found", { status: 404 });
  }
  return { article };
}

export default function SanityArticlePage({ loaderData }: Route.ComponentProps) {
  const { article } = loaderData;

  return (
    <Wrapper className="max-dt:dr-px-16 items-center justify-center font-mono uppercase">
      <div className="flex flex-col items-center gap-gap">
        <h1>{article.title}</h1>
        {article.excerpt && <p className="opacity-50">{article.excerpt}</p>}
        {article.featuredImage && (
          <Image
            src={urlForImage(article.featuredImage).url()}
            alt={article.title || ""}
            aspectRatio={16 / 9}
            mobileSize="100vw"
            desktopSize="50vw"
          />
        )}
        {article.publishedAt && (
          <time dateTime={article.publishedAt}>
            {new Date(article.publishedAt).toLocaleDateString()}
          </time>
        )}
        <Link to="/sanity" className="link mt-4 opacity-50">
          ← back
        </Link>
      </div>
    </Wrapper>
  );
}

import type { SanityDocument } from "@sanity/client";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { Image } from "@/components/image";
import { client } from "@/integrations/sanity/client";
import { urlForImage } from "@/integrations/sanity/image";
import { articleQuery } from "@/integrations/sanity/queries";
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
    <div className="max-dt:dr-px-16 flex min-h-dvh grow items-center justify-center font-mono uppercase">
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
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </div>
    );
  }
  if (error instanceof Error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    );
  }
  return <h1>Unknown Error</h1>;
}

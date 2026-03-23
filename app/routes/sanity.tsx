import type { SanityDocument } from "@sanity/client";
import { Link } from "react-router";
import { client } from "~/integrations/sanity/client";
import { allArticlesQuery } from "~/integrations/sanity/queries";
import type { Route } from "./+types/sanity";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Sanity — Satus" },
    { name: "description", content: "Sanity CMS integration example" },
  ];
}

export async function loader(_args: Route.LoaderArgs) {
  const articles = await client.fetch<SanityDocument[]>(allArticlesQuery);
  return { articles };
}

export default function SanityPage({ loaderData }: Route.ComponentProps) {
  const { articles } = loaderData;

  return (
    <div className="max-dt:dr-px-16 flex min-h-dvh grow items-center justify-center font-mono uppercase">
      <div className="flex flex-col items-center gap-gap">
        <h2 className="text-center">Sanity</h2>
        {articles && articles.length > 0 ? (
          <ul className="flex flex-col items-center gap-2">
            {articles.map((article) => (
              <li key={article._id}>
                <Link to={`/sanity/${article.slug?.current}`} className="link">
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="opacity-50">No articles found. Add content in Sanity Studio.</p>
        )}
      </div>
    </div>
  );
}

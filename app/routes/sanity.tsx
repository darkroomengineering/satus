import type { SanityDocument } from '@sanity/client'
import { useQuery } from '@sanity/react-loader'
import { Link } from '@/components/link'
import { loadQuery } from '@/integrations/sanity/loader.server'
import { allArticlesQuery } from '@/integrations/sanity/queries'
import { getPreviewData } from '@/integrations/sanity/session'
import type { Route } from './+types/sanity'

export function meta(_args: Route.MetaArgs) {
  return [
    { title: 'Sanity — Satus' },
    { name: 'description', content: 'Sanity CMS integration example' },
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  const { options } = await getPreviewData(request)
  const initial = await loadQuery<SanityDocument[]>(
    allArticlesQuery,
    {},
    options
  )
  return { initial }
}

export default function SanityExample({ loaderData }: Route.ComponentProps) {
  const { initial } = loaderData
  const { data: articles } = useQuery<SanityDocument[]>(
    allArticlesQuery,
    {},
    { initial }
  )

  return (
    <div className="flex min-h-dvh flex-col gap-8 pt-32 pb-24 font-mono">
      <header className="px-safe">
        <h1 className="dt:text-[13px] text-[12px] uppercase opacity-50">
          Sanity
        </h1>
        <p className="mt-2 text-sm opacity-40">
          Articles fetched via React Router loader + @sanity/react-loader
        </p>
      </header>

      <section className="flex flex-col gap-4 px-safe">
        {articles && articles.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {articles.map((article) => (
              <li
                key={article._id}
                className="flex flex-col gap-1 border-secondary/10 border-t pt-3"
              >
                <Link
                  href={`/sanity/${article.slug?.current}`}
                  className="link text-sm underline"
                >
                  {article.title}
                </Link>
                {article.excerpt && (
                  <p className="text-xs opacity-40">{article.excerpt}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-2 text-sm opacity-50">
            <p>No articles found.</p>
            <p>
              Set <code className="opacity-100">SANITY_PROJECT_ID</code> and{' '}
              <code className="opacity-100">SANITY_DATASET</code> in your .env
              to connect.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

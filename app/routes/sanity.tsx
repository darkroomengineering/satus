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

export default function SanityPage({ loaderData }: Route.ComponentProps) {
  const { initial } = loaderData
  const { data: articles } = useQuery<SanityDocument[]>(
    allArticlesQuery,
    {},
    { initial }
  )

  return (
    <div className="max-dt:dr-px-16 flex min-h-dvh grow items-center justify-center font-mono uppercase">
      <div className="flex flex-col items-center gap-gap">
        <h2 className="text-center">Sanity</h2>
        {articles && articles.length > 0 ? (
          <ul className="flex flex-col items-center gap-2">
            {articles.map((article) => (
              <li key={article._id}>
                <Link
                  href={`/sanity/${article.slug?.current}`}
                  className="link"
                >
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="opacity-50">
            No articles found. Add content in Sanity Studio.
          </p>
        )}
      </div>
    </div>
  )
}

import type { SanityDocument } from '@sanity/client'
import { useQuery } from '@sanity/react-loader'
import { Image } from '@/components/image'
import { Link } from '@/components/link'
import { urlForImage } from '@/integrations/sanity/image'
import { loadQuery } from '@/integrations/sanity/loader.server'
import { articleQuery } from '@/integrations/sanity/queries'
import { getPreviewData } from '@/integrations/sanity/session'
import type { Route } from './+types/sanity.$slug'

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.initial?.data?.title
  return [{ title: title ? `${title} — Satus` : 'Article — Satus' }]
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { options } = await getPreviewData(request)
  const initial = await loadQuery<SanityDocument>(
    articleQuery,
    { slug: params.slug },
    options
  )
  return { initial, slug: params.slug }
}

export default function SanityArticlePage({
  loaderData,
}: Route.ComponentProps) {
  const { initial, slug } = loaderData
  const { data: article } = useQuery<SanityDocument>(
    articleQuery,
    { slug },
    { initial }
  )

  if (!article) {
    return (
      <div className="flex min-h-dvh grow items-center justify-center font-mono uppercase">
        <p>Article not found</p>
      </div>
    )
  }

  return (
    <div className="max-dt:dr-px-16 flex min-h-dvh grow items-center justify-center font-mono uppercase">
      <div className="flex flex-col items-center gap-gap">
        <h1>{article.title}</h1>
        {article.excerpt && <p className="opacity-50">{article.excerpt}</p>}
        {article.featuredImage && (
          <Image
            src={urlForImage(article.featuredImage).url()}
            alt={article.title || ''}
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
        <Link href="/sanity" className="link mt-4 opacity-50">
          ← back
        </Link>
      </div>
    </div>
  )
}

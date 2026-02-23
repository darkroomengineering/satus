import { domain, shopifyFetch } from './client'
import { TAGS } from './constants'
import { getMenuQuery } from './queries/menu'

interface MenuItem {
  title: string
  path: string
}

export async function getMenu(handle: string): Promise<MenuItem[]> {
  const res = await shopifyFetch<{
    menu: { items: Array<{ title: string; url: string }> } | null
  }>({
    query: getMenuQuery,
    tags: [TAGS.collections],
    variables: {
      handle,
    },
  })

  return (
    res.body.data.menu?.items.map((item) => ({
      title: item.title,
      path: item.url
        .replace(domain, '')
        .replace('/collections', '/search')
        .replace('/pages', ''),
    })) || []
  )
}

import { shopifyFetch } from './client'
import { TAGS } from './constants'
import { getMenuQuery } from './queries/menu'
import { getPageQuery, getPagesQuery } from './queries/page'
import { removeEdgesAndNodes } from './reshape'
import type { EdgeNode, Page } from './types'

const domain = process.env.SHOPIFY_STORE_DOMAIN ?? ''

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
    })) ?? []
  )
}

export async function getPage(handle: string): Promise<Page | null> {
  const res = await shopifyFetch<{ pageByHandle: Page | null }>({
    query: getPageQuery,
    variables: { handle },
  })

  return res.body.data.pageByHandle
}

export async function getPages(): Promise<Page[]> {
  const res = await shopifyFetch<{ pages: EdgeNode<Page> }>({
    query: getPagesQuery,
  })

  return removeEdgesAndNodes(res.body.data.pages)
}

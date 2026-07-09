import { env } from '@/lib/env'
import { shopifyFetch } from './client'
import { TAGS } from './constants'
import { getMenuQuery } from './queries/menu'
import { getPageQuery, getPagesQuery } from './queries/page'
import { removeEdgesAndNodes } from './reshape'
import {
  type GetMenuResponseData,
  type GetPageResponseData,
  type GetPagesResponseData,
  getMenuResponseSchema,
  getPageResponseSchema,
  getPagesResponseSchema,
} from './schemas'
import type { Page } from './types'

const domain = env.SHOPIFY_STORE_DOMAIN ?? ''

interface MenuItem {
  title: string
  path: string
}

export async function getMenu(handle: string): Promise<MenuItem[]> {
  const res = await shopifyFetch<GetMenuResponseData>({
    query: getMenuQuery,
    tags: [TAGS.collections],
    variables: {
      handle,
    },
    dataSchema: getMenuResponseSchema,
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
  const res = await shopifyFetch<GetPageResponseData>({
    query: getPageQuery,
    variables: { handle },
    dataSchema: getPageResponseSchema,
  })

  return res.body.data.pageByHandle
}

export async function getPages(): Promise<Page[]> {
  const res = await shopifyFetch<GetPagesResponseData>({
    query: getPagesQuery,
    dataSchema: getPagesResponseSchema,
  })

  return removeEdgesAndNodes(res.body.data.pages)
}

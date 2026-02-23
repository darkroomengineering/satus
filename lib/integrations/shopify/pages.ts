import { removeEdgesAndNodes, shopifyFetch } from './client'
import { getPageQuery, getPagesQuery } from './queries/page'
import type { EdgeNode } from './types'

export async function getPage(handle: string): Promise<unknown> {
  const res = await shopifyFetch<{ pageByHandle: unknown }>({
    query: getPageQuery,
    variables: { handle },
  })

  return res.body.data.pageByHandle
}

export async function getPages(): Promise<unknown[]> {
  const res = await shopifyFetch<{ pages: EdgeNode<unknown> }>({
    query: getPagesQuery,
  })

  return removeEdgesAndNodes(res.body.data.pages)
}

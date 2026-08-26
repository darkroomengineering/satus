export const MARKDOWN_HANDLER_PATH = '/agent-content'
export const MARKDOWN_SOURCE_PATH_HEADER = 'x-satus-markdown-source-path'

export function markdownPathForRoute(path: string): string {
  if (path === '/') return '/index.md'
  return `${path.replace(/\/$/, '')}.md`
}

export function routePathFromMarkdown(path: string): string | null {
  if (path === '/index.md') return '/'
  if (!path.endsWith('.md')) return null

  const routePath = path.slice(0, -3)
  return routePath || '/'
}

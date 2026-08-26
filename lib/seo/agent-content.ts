import { STATIC_ROUTES } from '@/lib/seo/route-catalog'
import type { ContentRoute } from '@/lib/seo/routes'
import { SITE } from '@/lib/seo/site'

export function absoluteSiteUrl(path: string): string {
  return new URL(path, `${SITE.url}/`).toString()
}

export function buildStaticRoutesMarkdown(): string {
  return STATIC_ROUTES.map(
    (route) =>
      `- [${route.label}](${absoluteSiteUrl(route.path)}): ${route.description}`
  ).join('\n')
}

export function buildCmsRoutesMarkdown(
  cmsRoutes: readonly ContentRoute[]
): string {
  if (cmsRoutes.length === 0) return ''

  const links = cmsRoutes
    .map((route) => `- [${route.label}](${absoluteSiteUrl(route.path)})`)
    .join('\n')

  return `\n\n## Published content\n\n${links}`
}

export function buildAgentGuidanceMarkdown(): string {
  const guidance = SITE.agentGuidance
  if (!guidance) return ''

  const sections: string[] = []

  if (guidance.whenToUse.length > 0) {
    sections.push(
      `## When to use\n\n${guidance.whenToUse
        .map((useCase) => `- **${useCase.name}:** ${useCase.description}`)
        .join('\n')}`
    )
  }

  if (guidance.howToUse.length > 0) {
    sections.push(
      `## How to use\n\n${guidance.howToUse
        .map((instruction, index) => `${index + 1}. ${instruction}`)
        .join('\n')}`
    )
  }

  return sections.length > 0 ? `\n\n${sections.join('\n\n')}` : ''
}

export function buildDeveloperResourcesMarkdown(): string {
  const resources = SITE.developerResources
  if (!resources || resources.length === 0) return ''

  const links = resources
    .map(
      (resource) =>
        `- [${resource.name}](${resource.url}): ${resource.description}`
    )
    .join('\n')

  return `\n\n## Developer resources\n\n${links}`
}

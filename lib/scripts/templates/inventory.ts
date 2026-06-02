/**
 * Component inventory template for the client handoff script.
 *
 * Pure render function -- no I/O. `prepare-handoff.ts` scans the filesystem for
 * components and pages, then passes the gathered lists here. A `null` list means
 * the corresponding scan failed and the section renders a fallback line.
 */

export interface InventoryData {
  /** ISO date (YYYY-MM-DD) shown in the "Generated:" line. */
  date: string
  /** Configured integration display names. */
  integrations: string[]
  /** Sorted `components/ui` names, or `null` if the scan failed. */
  uiComponents: string[] | null
  /** Sorted `components/layout` names, or `null` if the scan failed. */
  layoutComponents: string[] | null
  /** Sorted `components/effects` names, or `null` if the scan failed. */
  effectComponents: string[] | null
  /** Processed page routes (examples excluded), or `null` if the scan failed. */
  pages: string[] | null
}

/** Render a `## <heading>` section listing component names, or a fallback line. */
function pushComponentSection(
  lines: string[],
  heading: string,
  components: string[] | null,
  scanErrorLine: string
): void {
  lines.push(heading)
  lines.push('')
  if (components === null) {
    lines.push(scanErrorLine)
  } else {
    for (const name of components) {
      lines.push(`- \`${name}\``)
    }
  }
  lines.push('')
}

/** Render the component inventory markdown. */
export function renderInventory({
  date,
  integrations,
  uiComponents,
  layoutComponents,
  effectComponents,
  pages,
}: InventoryData): string {
  const lines: string[] = []

  lines.push('# Component Inventory')
  lines.push('')
  lines.push(`Generated: ${date}`)
  lines.push('')

  lines.push('## Active Integrations')
  lines.push('')
  if (integrations.length > 0) {
    for (const integration of integrations) {
      lines.push(`- ${integration}`)
    }
  } else {
    lines.push('- None configured')
  }
  lines.push('')

  pushComponentSection(
    lines,
    '## UI Components',
    uiComponents,
    '- Could not scan components'
  )
  pushComponentSection(
    lines,
    '## Layout Components',
    layoutComponents,
    '- Could not scan layout components'
  )
  pushComponentSection(
    lines,
    '## Effect Components',
    effectComponents,
    '- Could not scan effect components'
  )

  // Pages section intentionally has no trailing blank line (matches the
  // original generator, which ended the document on the last page entry).
  lines.push('## Pages')
  lines.push('')
  if (pages === null) {
    lines.push('- Could not scan pages')
  } else {
    for (const route of pages) {
      lines.push(`- \`/${route}\``)
    }
  }

  return lines.join('\n')
}

// Pure string transforms; callers (bundle-installer, setup-project) own I/O.

/** First export line whose quoted specifier is `'pattern'` or `'./pattern'`. */
export function findBarrelLine(
  sourceText: string,
  pattern: string
): string | undefined {
  return sourceText
    .split('\n')
    .find(
      (line) => line.includes(`'${pattern}'`) || line.includes(`'./${pattern}'`)
    )
}

/** Remove every export line matching `pattern` (same match as `findBarrelLine`). */
export function removeBarrelLines(sourceText: string, pattern: string) {
  const lines = sourceText.split('\n')
  const filtered = lines.filter(
    (line) =>
      !(line.includes(`'${pattern}'`) || line.includes(`'./${pattern}'`))
  )
  if (filtered.length === lines.length)
    return { text: sourceText, changed: false }
  return { text: filtered.join('\n'), changed: true }
}

/**
 * Insert a barrel export line in sorted position among existing `export`
 * lines (best-effort). Idempotent: unchanged when the line already exists.
 */
export function insertBarrelLine(localText: string, line: string): string {
  const newLine = line.trim()
  if (newLine.length === 0) return localText

  const lines = localText.split('\n')
  if (lines.some((existing) => existing.trim() === newLine)) return localText

  const exportIndexes: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.startsWith('export ')) exportIndexes.push(i)
  }

  if (exportIndexes.length === 0) {
    const base =
      localText.length === 0 || localText.endsWith('\n')
        ? localText
        : `${localText}\n`
    return `${base}${newLine}\n`
  }

  const sortedAfter = exportIndexes.find(
    (i) => (lines[i] ?? '').localeCompare(newLine) > 0
  )
  const lastExport = exportIndexes[exportIndexes.length - 1] ?? 0
  const insertAt = sortedAfter ?? lastExport + 1
  lines.splice(insertAt, 0, newLine)
  return lines.join('\n')
}

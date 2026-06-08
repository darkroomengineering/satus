/**
 * COMPONENTS.md manifest generator
 *
 * Introspects the codebase with ts-morph and writes COMPONENTS.md.
 * Run with: bun run generate:manifest
 * Check mode: bun run manifest:check (exits 1 if file differs)
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Project, SyntaxKind } from 'ts-morph'
import { toPascalCase } from './generate-shared'

const ROOT = join(import.meta.dir, '..', '..')
const OUT_FILE = join(ROOT, 'COMPONENTS.md')
const IS_CHECK = process.argv.includes('--check')

function glob(pattern: string): string[] {
  const g = new Bun.Glob(pattern)
  return [...g.scanSync({ cwd: ROOT, absolute: true })]
}

function isClientFile(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8')
    for (const raw of content.split('\n')) {
      const line = raw.trim()
      if (!line) continue
      if (
        line.startsWith('//') ||
        line.startsWith('*') ||
        line.startsWith('/*')
      )
        continue
      return line === "'use client'" || line === '"use client"'
    }
    return false
  } catch {
    return false
  }
}

interface ExportSig {
  name: string
  sig: string
}

/**
 * Format a ts-morph type string for the manifest. Strips the machine-specific
 * `import("/abs/path/node_modules/...").` qualifiers the compiler emits for
 * inferred types (they bake an absolute path into the output and make it
 * non-deterministic across checkouts), collapses whitespace, and truncates.
 */
function formatTypeText(raw: string): string {
  const cleaned = raw
    .replace(/import\("[^"]*"\)\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length > 80 ? `${cleaned.slice(0, 77)}...` : cleaned
}

function getExportedSignatures(
  project: Project,
  filePath: string
): ExportSig[] {
  try {
    const sf =
      project.addSourceFileAtPathIfExists(filePath) ??
      project.getSourceFile(filePath)
    if (!sf) return []

    const results: ExportSig[] = []

    for (const [name, decls] of sf.getExportedDeclarations()) {
      const decl = decls[0]
      if (!decl) continue

      let sig = ''

      if (decl.getKind() === SyntaxKind.FunctionDeclaration) {
        const f = decl.asKindOrThrow(SyntaxKind.FunctionDeclaration)
        const params = f
          .getParameters()
          .map((p) => p.getText())
          .join(', ')
        const ret = f.getReturnTypeNode()?.getText() ?? ''
        sig = ret ? `(${params}) => ${ret}` : `(${params})`
      } else if (decl.getKind() === SyntaxKind.VariableDeclaration) {
        const v = decl.asKindOrThrow(SyntaxKind.VariableDeclaration)
        const typeNode = v.getTypeNode()
        if (typeNode) {
          sig = formatTypeText(typeNode.getText())
        } else {
          const init = v.getInitializer()
          if (init) {
            sig = formatTypeText(init.getType().getText())
          }
        }
      } else if (decl.getKind() === SyntaxKind.TypeAliasDeclaration) {
        const ta = decl.asKindOrThrow(SyntaxKind.TypeAliasDeclaration)
        sig = formatTypeText(ta.getTypeNode()?.getText() ?? '')
      }

      const clean = sig.replace(/\n\s*/g, ' ').trim()
      results.push({ name, sig: clean })
    }

    return results
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Read tsconfig paths
// ---------------------------------------------------------------------------

function readTsconfigPaths(): Array<{ alias: string; mapsTo: string }> {
  // ts-morph reads tsconfig with the TypeScript compiler's JSONC parser, so
  // comments and trailing commas are handled correctly.
  const project = new Project({
    tsConfigFilePath: join(ROOT, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  })
  const paths = project.getCompilerOptions().paths ?? {}
  return Object.entries(paths).map(([alias, targets]) => {
    const target = targets[0] ?? ''
    const mapsTo = target.startsWith('./') ? target : `./${target}`
    return { alias, mapsTo }
  })
}

// ---------------------------------------------------------------------------
// Section generators
// ---------------------------------------------------------------------------

function buildComponentSection(
  title: string,
  files: string[],
  aliasPrefix: string
): string {
  if (!files.length) return ''

  const rows: string[] = []
  for (const file of files.sort()) {
    const match = file.match(/components\/([^/]+\/[^/]+)\/index\.tsx$/)
    const dirName = match?.[1] ?? ''
    const parts = dirName.split('/')
    const componentDir = parts[parts.length - 1] ?? ''
    const importPath = `${aliasPrefix}/${componentDir}`
    const type = isClientFile(file) ? 'Client' : 'Server'
    const name = toPascalCase(componentDir)
    rows.push(`| ${name} | \`${importPath}\` | ${type} |`)
  }

  return `## ${title}

| Component | Import | Type |
|-----------|--------|------|
${rows.join('\n')}

---
`
}

function buildEffectSection(): string {
  const indexFiles = glob('components/effects/*/index.tsx')
  const topLevelFiles = glob('components/effects/*.tsx')

  const rows: string[] = []

  for (const file of [...indexFiles, ...topLevelFiles].sort()) {
    let name: string
    let importPath: string

    if (file.includes('/index.tsx')) {
      const match = file.match(/components\/effects\/([^/]+)\/index\.tsx$/)
      const dir = match?.[1] ?? ''
      name = toPascalCase(dir)
      importPath = `@/components/effects/${dir}`
    } else {
      const match = file.match(/components\/effects\/([^/]+)\.tsx$/)
      const base = match?.[1] ?? ''
      // Skip webgl sub-files (e.g., animated-gradient/webgl.tsx)
      if (base.includes('webgl')) continue
      name = toPascalCase(base)
      importPath = `@/components/effects/${base}`
    }

    const type = isClientFile(file) ? 'Client' : 'Server'
    rows.push(`| ${name} | \`${importPath}\` | ${type} |`)
  }

  if (!rows.length) return ''

  return `## Effect Components

| Component | Import | Type |
|-----------|--------|------|
${rows.join('\n')}

---
`
}

function buildHooksSection(project: Project): string {
  const hookFiles = glob('lib/hooks/*.ts')

  const rows: string[] = []

  for (const file of hookFiles.sort()) {
    const match = file.match(/lib\/hooks\/([^.]+)\.ts$/)
    const base = match?.[1] ?? ''
    if (base === 'index') continue

    const importPath = `@/hooks/${base}`
    const sf =
      project.addSourceFileAtPathIfExists(file) ?? project.getSourceFile(file)
    if (!sf) continue

    for (const [name, decls] of sf.getExportedDeclarations()) {
      if (!name.startsWith('use')) continue
      const decl = decls[0]
      if (!decl) continue

      let sig = ''
      if (decl.getKind() === SyntaxKind.FunctionDeclaration) {
        const f = decl.asKindOrThrow(SyntaxKind.FunctionDeclaration)
        const params = f
          .getParameters()
          .map((p) => p.getText())
          .join(', ')
        const ret = f.getReturnTypeNode()?.getText() ?? ''
        sig = ret ? `(${params}) => ${ret}` : `(${params})`
      } else if (decl.getKind() === SyntaxKind.VariableDeclaration) {
        const v = decl.asKindOrThrow(SyntaxKind.VariableDeclaration)
        const typeNode = v.getTypeNode()
        sig = typeNode?.getText() ?? ''
      }

      const clean = sig.replace(/\n\s*/g, ' ').trim()
      rows.push(`| ${name} | \`${importPath}\` | \`${clean}\` |`)
    }
  }

  if (!rows.length) return ''

  return `## Hooks

| Hook | Import | Signature |
|------|--------|-----------|
${rows.join('\n')}

---
`
}

function buildUtilsSection(project: Project): string {
  const utilFiles = glob('lib/utils/*.ts').filter(
    (f) => !(f.endsWith('.test.ts') || f.endsWith('.d.ts'))
  )

  const sections: string[] = []

  for (const file of utilFiles.sort()) {
    const match = file.match(/lib\/utils\/([^.]+)\.ts$/)
    const base = match?.[1] ?? ''
    const importPath = `@/utils/${base}`

    const sigs = getExportedSignatures(project, file)
    if (!sigs.length) continue

    const rows = sigs.map(({ name, sig }) => {
      const sigCell = sig ? `\`${sig}\`` : ''
      return `| ${name} | ${sigCell} |`
    })

    const heading = base.charAt(0).toUpperCase() + base.slice(1)
    sections.push(`### ${heading} (\`${importPath}\`)

| Export | Signature |
|--------|-----------|
${rows.join('\n')}
`)
  }

  if (!sections.length) return ''

  return `## Utilities

${sections.join('\n')}
---
`
}

function buildWebGLSection(): string {
  const tsxEntries = glob('lib/webgl/components/*/index.tsx')
  const tsEntries = glob('lib/webgl/components/*/index.ts')
  const allEntries = [...tsxEntries, ...tsEntries]

  if (!allEntries.length) return ''

  const rows: string[] = []
  for (const file of allEntries.sort()) {
    const match = file.match(/lib\/webgl\/components\/([^/]+)\/index\.[tj]sx?$/)
    const dir = match?.[1] ?? ''
    const name = toPascalCase(dir)
    const importPath = `@/webgl/components/${dir}`
    const type = isClientFile(file) ? 'Client' : 'Server'
    rows.push(`| ${name} | \`${importPath}\` | ${type} |`)
  }

  return `## WebGL Components

| Component | Import | Type |
|-----------|--------|------|
${rows.join('\n')}

---
`
}

function buildIntegrationRegistrySection(project: Project): string {
  const file = join(ROOT, 'lib/integrations/registry.ts')
  if (!existsSync(file)) return ''

  const sigs = getExportedSignatures(project, file)
  if (!sigs.length) return ''

  const rows = sigs.map(({ name, sig }) => {
    const sigCell = sig ? `\`${sig}\`` : ''
    return `| ${name} | ${sigCell} |`
  })

  return `## Integration Registry (\`@/integrations/registry\`)

| Export | Signature |
|--------|-----------|
${rows.join('\n')}

---
`
}

function buildAliasesSection(): string {
  const aliases = readTsconfigPaths()
  const rows = aliases.map(
    ({ alias, mapsTo }) => `| \`${alias}\` | \`${mapsTo}\` |`
  )

  return `## Import Path Aliases

| Alias | Maps To |
|-------|---------|
${rows.join('\n')}
`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function generate(): string {
  const project = new Project({
    tsConfigFilePath: join(ROOT, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  })

  const uiFiles = glob('components/ui/*/index.tsx')
  const layoutFiles = glob('components/layout/*/index.tsx')

  const uiSection = buildComponentSection(
    'UI Components',
    uiFiles,
    '@/components/ui'
  )
  const layoutSection = buildComponentSection(
    'Layout Components',
    layoutFiles,
    '@/components/layout'
  )
  const effectSection = buildEffectSection()
  const hooksSection = buildHooksSection(project)
  const utilsSection = buildUtilsSection(project)
  const webglSection = buildWebGLSection()
  const integrationSection = buildIntegrationRegistrySection(project)
  const aliasesSection = buildAliasesSection()

  const header = `<!-- AUTO-GENERATED by \`bun run generate:manifest\` - do not edit by hand. -->

# Component & API Manifest

Quick-reference for every component, hook, and utility in the Satus starter kit.

---

`

  return [
    header,
    uiSection,
    layoutSection,
    effectSection,
    hooksSection,
    utilsSection,
    webglSection,
    integrationSection,
    aliasesSection,
  ]
    .filter(Boolean)
    .join('\n')
}

const content = generate()

if (IS_CHECK) {
  if (!existsSync(OUT_FILE)) {
    console.error(
      'COMPONENTS.md does not exist. Run `bun run generate:manifest` first.'
    )
    process.exit(1)
  }
  const existing = readFileSync(OUT_FILE, 'utf-8')
  if (existing === content) {
    console.log('COMPONENTS.md is up to date.')
    process.exit(0)
  }
  // Print a simple diff summary
  const existingLines = existing.split('\n')
  const newLines = content.split('\n')
  console.error(
    'COMPONENTS.md is out of date. Re-run `bun run generate:manifest` to update.'
  )
  console.error(`  Existing: ${existingLines.length} lines`)
  console.error(`  Generated: ${newLines.length} lines`)
  const maxLen = Math.max(existingLines.length, newLines.length)
  for (let i = 0; i < maxLen; i++) {
    if (existingLines[i] !== newLines[i]) {
      console.error(`  First diff at line ${i + 1}:`)
      console.error(`    - ${existingLines[i] ?? '(missing)'}`)
      console.error(`    + ${newLines[i] ?? '(missing)'}`)
      break
    }
  }
  process.exit(1)
} else {
  await Bun.write(OUT_FILE, content)
  console.log(`COMPONENTS.md written (${content.split('\n').length} lines)`)
}

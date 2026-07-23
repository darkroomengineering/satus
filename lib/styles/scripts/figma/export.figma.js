/**
 * Figma Variables + text styles → interchange JSON (the export half of the sync).
 *
 * This is Figma Plugin API code, NOT a repo module. It does not run in Node/Bun.
 * Run it against the Figma file to produce the object that gets saved as
 * `figma-tokens.json`, which `import.ts` then turns into repo config.
 *
 * Two ways to run it:
 *   1. Agent / MCP: paste this body into a `use_figma` call (returns the JSON),
 *      then write the result to figma-tokens.json.
 *   2. Enterprise CI: port to the REST API (variables + text styles).
 *
 * It reads collections + text styles by name and maps them to the interchange:
 *   Primitives (1 mode)              → primitives  (raw sRGB)
 *   Color      (Light/Dark/Red/Evil) → themes      (aliases resolved to names)
 *   Layout     (Mobile/Desktop)      → layout / screens / customSizes
 *   Typography (Mobile/Desktop) + text styles → typography
 *   Motion     (1 mode)              → motion
 *
 * Typography note: font-size binds cleanly to variables; line-height variable
 * bindings are pixel-only in Figma, so line-height lives as percent VARIABLES
 * (read here by name) rather than bound to the text style.
 */

// code ↔ Figma font maps (code-owned; unknown values fail the export loudly)
const FAMILY_TO_KEY = { Oswald: 'display', 'Spline Sans Mono': 'mono' }
const STYLE_TO_WEIGHT = {
  Thin: 100,
  ExtraLight: 200,
  Light: 300,
  Regular: 400,
  Medium: 500,
  SemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  Black: 900,
}

const cols = await figma.variables.getLocalVariableCollectionsAsync()
const byName = {}
for (const c of cols) byName[c.name] = c
const varById = new Map()
for (const v of await figma.variables.getLocalVariablesAsync()) varById.set(v.id, v)

const modeKey = (n) => n.toLowerCase()
const desc = (v) => (v.description ? { description: v.description } : {})
const errors = []

// Primitives: raw sRGB (+ description)
const primitives = {}
{
  const c = byName.Primitives
  const mode = c.modes[0].modeId
  for (const id of c.variableIds) {
    const v = varById.get(id)
    const val = v.valuesByMode[mode]
    primitives[v.name] = { r: val.r, g: val.g, b: val.b, ...desc(v) }
  }
}

// Color: semantic tokens per theme mode; aliases resolved to primitive names
const themes = {}
{
  const c = byName.Color
  for (const m of c.modes) {
    const theme = {}
    for (const id of c.variableIds) {
      const v = varById.get(id)
      const val = v.valuesByMode[m.modeId]
      if (val && val.type === 'VARIABLE_ALIAS') theme[v.name] = { ref: varById.get(val.id).name }
      else if (val) theme[v.name] = { rgb: { r: val.r, g: val.g, b: val.b } }
    }
    themes[modeKey(m.name)] = theme
  }
}

// Layout: columns/gap/safe → layout; device-* → screens; rest → customSizes
const RESERVED = new Set(['columns', 'gap', 'safe'])
const layout = {}
const screens = {}
const customSizes = {}
{
  const c = byName.Layout
  const modes = c.modes.map((m) => ({ key: modeKey(m.name), id: m.modeId }))
  const read = (v) => Object.fromEntries(modes.map((m) => [m.key, v.valuesByMode[m.id]]))
  for (const id of c.variableIds) {
    const v = varById.get(id)
    const vals = read(v)
    if (RESERVED.has(v.name)) layout[v.name] = { ...vals, ...desc(v) }
    else if (v.name === 'device-width') for (const m of modes) (screens[m.key] ??= {}).width = vals[m.key]
    else if (v.name === 'device-height') for (const m of modes) (screens[m.key] ??= {}).height = vals[m.key]
    else customSizes[v.name] = { ...vals, ...desc(v) }
  }
}

// Typography: text styles + named Typography variables (font-size, line-height)
const typography = {}
{
  const c = byName.Typography
  const modes = c.modes.map((m) => ({ key: modeKey(m.name), id: m.modeId }))
  const vars = {}
  for (const id of c.variableIds) {
    const v = varById.get(id)
    vars[v.name] = Object.fromEntries(modes.map((m) => [m.key, v.valuesByMode[m.id]]))
  }
  for (const s of await figma.getLocalTextStylesAsync()) {
    const name = s.name
    const family = FAMILY_TO_KEY[s.fontName.family]
    if (!family) {
      errors.push(`Unknown font family "${s.fontName.family}" on text style "${name}" — add it to FAMILY_TO_KEY and fonts.ts`)
      continue
    }
    const baseStyle = (s.fontName.style.replace(/ ?Italic$/, '') || 'Regular').replace(/\s+/g, '')
    const weight = STYLE_TO_WEIGHT[baseStyle]
    if (!weight) {
      errors.push(`Unknown weight for style "${s.fontName.style}" on "${name}"`)
      continue
    }
    if (s.letterSpacing.unit !== 'PERCENT') {
      errors.push(`letter-spacing on "${name}" must be PERCENT (em), got ${s.letterSpacing.unit}`)
      continue
    }
    const size = vars[`${name}/font-size`]
    const lh = vars[`${name}/line-height`]
    if (!size || !lh) {
      errors.push(`Missing "${name}/font-size" or "${name}/line-height" variable`)
      continue
    }
    const feats = s.openTypeFeatures || {}
    const featKeys = Object.keys(feats)
    typography[name] = {
      family,
      weight,
      fontStyle: /Italic$/.test(s.fontName.style) ? 'italic' : 'normal',
      letterSpacing: `${Number((s.letterSpacing.value / 100).toFixed(4))}em`,
      leadingTrim: s.leadingTrim,
      fontFeatureSettings: featKeys.length
        ? featKeys.map((k) => `"${k.toLowerCase()}" ${feats[k] ? 1 : 0}`).join(', ')
        : null,
      fontSize: { mobile: size.mobile, desktop: size.desktop },
      lineHeight: { mobile: `${lh.mobile}%`, desktop: `${lh.desktop}%` },
    }
  }
}

// Motion: durations in ms
const motion = {}
{
  const c = byName.Motion
  const mode = c.modes[0].modeId
  for (const id of c.variableIds) {
    const v = varById.get(id)
    motion[v.name] = v.valuesByMode[mode]
  }
}

if (errors.length) throw new Error(`Figma token export failed:\n- ${errors.join('\n- ')}`)

return {
  $generatedFrom: 'figma',
  fileKey: figma.fileKey,
  primitives,
  themes,
  layout,
  screens,
  customSizes,
  typography,
  motion,
}

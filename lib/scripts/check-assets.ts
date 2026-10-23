/**
 * Guards tracked asset weight: fails (exit 1) listing every git-tracked video
 * or raster image under `public/` and `app/` over its size/width limit.
 * `git ls-files` excludes `node_modules/` and `.next/` by construction; the
 * explicit prefix checks below are a second line of defense. SVGs are exempt
 * from the width check.
 *
 * Width is read from the file's own header (PNG/JPEG/WEBP/GIF), not decoded.
 * An unparseable raster image FAILS the width check: "can't verify the width"
 * must not mean "assume it's fine". AVIF always fails this way, since its
 * ISOBMFF container needs a full box walker; every tracked .avif fails until
 * it is re-encoded to png/jpeg/webp, a parser is added here, or a fork owner
 * removes '.avif' from RASTER_IMAGE_EXTENSIONS (size-only enforcement).
 */

// Fork owners: tune these for your own project's weight budget.
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 // 2MB
const MAX_IMAGE_BYTES = 1 * 1024 * 1024 // 1MB
const MAX_IMAGE_WIDTH_PX = 2400

// Next file-based metadata icons (`app/icon.png`, `app/apple-icon.png`, and
// per-segment variants) get a far tighter budget than content images: every
// visitor downloads them, browsers draw them at 16-180px, and a manifest can
// pull one twice. A full-resolution export is invisible waste the general 1MB
// limit won't catch.
// A ceiling, not a target: a 192px icon from a plain resize fits without a
// quantizing encoder; pngquant/oxipng land nearer 15KB.
const MAX_ICON_BYTES = 48 * 1024 // 48KB
const MAX_ICON_WIDTH_PX = 512
const ICON_BASENAME_PATTERN = /^(icon|apple-icon|favicon)\d*$/

// Bytes read from the start of a raster image to find its dimensions header;
// SOF/IHDR sit within the first few KB unless an unusually large EXIF/ICC
// payload precedes them.
const HEADER_SNIFF_BYTES = 256 * 1024

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov'])
const RASTER_IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.avif',
])
const SCAN_ROOTS = ['public/', 'app/']
const EXCLUDED_PREFIXES = ['node_modules/', '.next/']

interface Dimensions {
  width: number
  height: number
}

function formatBytes(bytes: number): string {
  // Icon budgets live in the tens of KB, where an MB figure reads as "0.03MB"
  // and tells the reader nothing.
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)}KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

/** PNG: 8-byte signature + IHDR chunk (4-byte length, 4-byte type, then width/height as big-endian uint32s). */
function pngDimensions(buf: Uint8Array): Dimensions | undefined {
  if (
    buf.length < 24 ||
    buf[0] !== 0x89 ||
    buf[1] !== 0x50 ||
    buf[2] !== 0x4e ||
    buf[3] !== 0x47
  ) {
    return undefined
  }
  const width =
    ((buf[16]! << 24) | (buf[17]! << 16) | (buf[18]! << 8) | buf[19]!) >>> 0
  const height =
    ((buf[20]! << 24) | (buf[21]! << 16) | (buf[22]! << 8) | buf[23]!) >>> 0
  return { width, height }
}

/** JPEG: scan markers for the first SOF (start-of-frame) segment, which carries width/height. */
function jpegDimensions(buf: Uint8Array): Dimensions | undefined {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return undefined

  let offset = 2
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++
      continue
    }
    const marker = buf[offset + 1]!
    // SOF0-SOF15, excluding DHT(C4)/JPG(C8)/DAC(CC) which reuse the range
    // but aren't frame headers.
    const isSOF =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    if (isSOF) {
      const height = (buf[offset + 5]! << 8) | buf[offset + 6]!
      const width = (buf[offset + 7]! << 8) | buf[offset + 8]!
      return { width, height }
    }
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd9)
    ) {
      offset += 2
      continue
    }
    const segmentLength = (buf[offset + 2]! << 8) | buf[offset + 3]!
    offset += 2 + segmentLength
  }
  return undefined
}

/** WEBP: RIFF/WEBP container — VP8X (extended), VP8 (lossy), or VP8L (lossless) chunk. */
function webpDimensions(buf: Uint8Array): Dimensions | undefined {
  if (
    buf.length < 30 ||
    buf[0] !== 0x52 ||
    buf[1] !== 0x49 ||
    buf[2] !== 0x46 ||
    buf[3] !== 0x46 ||
    buf[8] !== 0x57 ||
    buf[9] !== 0x45 ||
    buf[10] !== 0x42 ||
    buf[11] !== 0x50
  ) {
    return undefined
  }

  const fourCC = String.fromCharCode(buf[12]!, buf[13]!, buf[14]!, buf[15]!)

  if (fourCC === 'VP8X') {
    const width = 1 + (buf[24]! | (buf[25]! << 8) | (buf[26]! << 16))
    const height = 1 + (buf[27]! | (buf[28]! << 8) | (buf[29]! << 16))
    return { width, height }
  }

  if (
    fourCC === 'VP8 ' &&
    buf[23] === 0x9d &&
    buf[24] === 0x01 &&
    buf[25] === 0x2a
  ) {
    const width = (buf[26]! | (buf[27]! << 8)) & 0x3fff
    const height = (buf[28]! | (buf[29]! << 8)) & 0x3fff
    return { width, height }
  }

  if (fourCC === 'VP8L' && buf[20] === 0x2f) {
    const b0 = buf[21]!
    const b1 = buf[22]!
    const b2 = buf[23]!
    const b3 = buf[24]!
    const width = 1 + (((b1 & 0x3f) << 8) | b0)
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
    return { width, height }
  }

  return undefined
}

/** GIF: fixed-offset logical screen descriptor (bytes 6-9, little-endian uint16s). */
function gifDimensions(buf: Uint8Array): Dimensions | undefined {
  if (
    buf.length < 10 ||
    buf[0] !== 0x47 ||
    buf[1] !== 0x49 ||
    buf[2] !== 0x46
  ) {
    return undefined
  }
  const width = buf[6]! | (buf[7]! << 8)
  const height = buf[8]! | (buf[9]! << 8)
  return { width, height }
}

function parseDimensions(ext: string, buf: Uint8Array): Dimensions | undefined {
  switch (ext) {
    case '.png':
      return pngDimensions(buf)
    case '.jpg':
    case '.jpeg':
      return jpegDimensions(buf)
    case '.webp':
      return webpDimensions(buf)
    case '.gif':
      return gifDimensions(buf)
    // .avif has no parser (see header note).
    default:
      return undefined
  }
}

function extname(path: string): string {
  const dot = path.lastIndexOf('.')
  return dot === -1 ? '' : path.slice(dot).toLowerCase()
}

/** Filename without its directory or extension: `app/icon.png` -> `icon`. */
function stem(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1)
  const dot = name.lastIndexOf('.')
  return dot === -1 ? name : name.slice(0, dot)
}

function getTrackedFiles(): string[] {
  const result = Bun.spawnSync(['git', 'ls-files'])
  if (result.exitCode !== 0) {
    console.error('check:assets: `git ls-files` failed — is this a git repo?')
    process.exit(1)
  }
  return result.stdout.toString().split('\n').filter(Boolean)
}

interface Offense {
  path: string
  detail: string
}

async function main() {
  const files = getTrackedFiles().filter(
    (path) =>
      SCAN_ROOTS.some((root) => path.startsWith(root)) &&
      !EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))
  )

  const offenses: Offense[] = []

  for (const path of files) {
    const ext = extname(path)
    if (ext === '.svg') continue // vector — no fixed dimensions to check

    const isVideo = VIDEO_EXTENSIONS.has(ext)
    const isRasterImage = RASTER_IMAGE_EXTENSIONS.has(ext)
    if (!(isVideo || isRasterImage)) continue

    const file = Bun.file(path)
    const size = file.size

    if (isVideo) {
      if (size > MAX_VIDEO_BYTES) {
        offenses.push({
          path,
          detail: `${formatBytes(size)} > ${formatBytes(MAX_VIDEO_BYTES)} video limit`,
        })
      }
      continue
    }

    const isIcon = ICON_BASENAME_PATTERN.test(stem(path))
    const maxBytes = isIcon ? MAX_ICON_BYTES : MAX_IMAGE_BYTES
    const maxWidth = isIcon ? MAX_ICON_WIDTH_PX : MAX_IMAGE_WIDTH_PX
    const role = isIcon ? 'icon' : 'image'

    if (size > maxBytes) {
      offenses.push({
        path,
        detail: `${formatBytes(size)} > ${formatBytes(maxBytes)} ${role} limit`,
      })
    }

    // Fail closed: an image whose width can't be parsed must not pass.
    const header = new Uint8Array(
      await file.slice(0, HEADER_SNIFF_BYTES).arrayBuffer()
    )
    const dimensions = parseDimensions(ext, header)
    if (!dimensions) {
      offenses.push({
        path,
        detail: `cannot verify width (${ext} has no parser here) — re-encode to png/jpeg/webp, or add a parser / exempt the extension in lib/scripts/check-assets.ts`,
      })
      continue
    }
    if (dimensions.width > maxWidth) {
      offenses.push({
        path,
        detail: `${dimensions.width}px wide > ${maxWidth}px ${role} limit`,
      })
    }
  }

  if (offenses.length > 0) {
    console.error('check:assets: asset weight budget exceeded\n')
    for (const offense of offenses) {
      console.error(`  ${offense.path}: ${offense.detail}`)
    }
    console.error(
      `\nRe-encode or replace the offending file(s), or raise the limits in lib/scripts/check-assets.ts if this fork's budget is different.`
    )
    process.exit(1)
  }

  console.log('check:assets: all tracked assets are within budget')
}

if (import.meta.main) {
  await main()
}

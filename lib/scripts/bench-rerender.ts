/**
 * Re-render cost benchmark.
 *
 * The third measurement angle in this repo, and the one that covers what the
 * other two structurally cannot:
 *
 *   bun run lighthouse   one cold page load. Blind to re-renders entirely.
 *   bun run bench:nav    client-side route swaps. Measures navigation, not
 *                        the work a mounted tree does when state changes.
 *   bun run bench:rerender  ← this. Main-thread cost of re-rendering an
 *                             already-mounted tree.
 *
 * Why it exists: React Compiler bailouts (setState synchronously in an effect,
 * mutating a useState value, creating components during render) cost you
 * auto-memoization for the WHOLE function they occur in. That shows up as
 * avoidable work on every subsequent re-render — and nothing else here measures
 * it. A Lighthouse pass over exactly those fixes moved nothing outside noise,
 * because it never re-renders anything.
 *
 * How: drives viewport resizes, which is the cheapest way to force a real
 * re-render cascade through this app's shared hooks — useWindowSize feeds
 * useDeviceDetection, which gates isWebGL and is consumed app-wide. Main-thread
 * cost comes from CDP's Performance domain (ScriptDuration / TaskDuration /
 * RecalcStyleDuration), which works against a production build. It does not
 * depend on React's development-only profiling hooks, so the numbers reflect
 * what ships.
 *
 * SCOPE, and be honest about it: this covers the hooks that are reachable from
 * a route. `useDeviceDetection` is, and it is the highest-value fix of the set.
 * The fluid and flowmap simulations are NOT — only FlowmapProvider consumes
 * them and no route mounts it — so their bailout fixes cannot be measured from
 * a browser at all, and this script does not pretend to.
 *
 * Usage:
 *   bun run build && PORT=3123 bun run start &
 *   bun run bench:rerender
 *   bun run bench:rerender --runs 5 --resizes 40 --path /
 *
 * A/B by running it against two builds and diffing the medians. Read the full
 * sample, not just the median: on a dev machine a small sample's median moves
 * on one outlier.
 *
 * What it found first time out, and it is worth knowing before you reach for a
 * compiler-bailout fix expecting a speedup. Reverting ONLY
 * lib/hooks/use-device-detection.ts to its pre-fix shape (setState called
 * synchronously in an effect, so React Compiler bails out of the whole hook),
 * 5 runs each, 30 viewport changes, 4x CPU throttle:
 *
 *                    pre-fix                 fixed
 *   script    115ms  (spread 106-122)  121ms  (spread 99-157)
 *   task      850ms                    931ms
 *
 * No improvement. The fixed build's fastest run beats the pre-fix build's
 * fastest, but the spread swamps the difference either way.
 *
 * The reasoning behind the fix was still right — a bailout does cost
 * auto-memoization for the entire function — but the magnitude was not there,
 * because this particular hook's body is a handful of media-query reads and
 * boolean derivations. Losing memoization on work that cheap costs nothing you
 * can measure, and the resize cascade here is dominated by style recalculation
 * (~250ms of the ~900ms) and the WebGL canvas, not by that hook's JS.
 *
 * Treat compiler bailouts as correctness and hygiene, not as a performance
 * lever, unless the function they occur in is doing real work. Measure before
 * claiming a win.
 */
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
function arg(name: string, fallback: string) {
  const i = args.indexOf(`--${name}`)
  const value = args[i + 1]
  return i !== -1 && value ? value : fallback
}

const BASE = arg('url', 'http://localhost:3123').replace(/\/+$/, '')
const PATH = arg('path', '/')
const RUNS = Number(arg('runs', '5'))
const RESIZES = Number(arg('resizes', '30'))
// CPU throttle. Re-render cost is main-thread work, and an unthrottled dev
// machine is fast enough to bury the difference in noise. 4x is roughly a
// mid-range laptop, and it widens the signal without inventing it.
const CPU = Number(arg('cpu', '4'))

type Sample = { script: number; task: number; style: number; wall: number }

const median = (xs: number[]) =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? Number.NaN

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const samples: Sample[] = []

  for (let run = 0; run < RUNS; run++) {
    // Fresh page per run: a re-used page carries warm JIT and a warm client
    // cache, so run 2 onward would read faster than anything real.
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    })
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Performance.enable')
    if (CPU > 1) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
    }

    await page.goto(`${BASE}${PATH}`, { waitUntil: 'load' })
    // Let hydration and the lazy root canvas settle, so we time steady-state
    // re-renders rather than mount.
    await page.waitForTimeout(1500)

    const readMetrics = async () => {
      const { metrics } = await cdp.send('Performance.getMetrics')
      const get = (n: string) =>
        metrics.find((m: { name: string; value: number }) => m.name === n)
          ?.value ?? 0
      return {
        script: get('ScriptDuration'),
        task: get('TaskDuration'),
        style: get('RecalcStyleDuration'),
      }
    }

    const before = await readMetrics()
    const wallStart = Date.now()

    for (let i = 0; i < RESIZES; i++) {
      // Alternate widths across the `dt` breakpoint so useDeviceDetection's
      // media queries actually flip, instead of resizing within one bucket
      // where nothing downstream changes.
      const width = i % 2 === 0 ? 700 : 1280
      await page.setViewportSize({ width, height: 800 })
      // One frame, so React commits between resizes rather than batching the
      // whole loop into a single update.
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => r(null)))
      )
    }

    const wall = Date.now() - wallStart
    const after = await readMetrics()

    samples.push({
      script: (after.script - before.script) * 1000,
      task: (after.task - before.task) * 1000,
      style: (after.style - before.style) * 1000,
      wall,
    })

    await page.close()
    process.stdout.write('.')
  }

  await browser.close()

  const col = (k: keyof Sample) => samples.map((s) => s[k])
  const fmt = (k: keyof Sample) =>
    `${median(col(k)).toFixed(0)}ms   ${JSON.stringify(col(k).map((v) => Math.round(v)))}`

  console.log(`\n\nre-render cost: ${RESIZES} viewport changes on ${PATH}`)
  console.log(
    `${BASE} · ${RUNS} runs · ${CPU > 1 ? `${CPU}x CPU throttle` : 'no CPU throttle'}\n`
  )
  console.log(`  script   ${fmt('script')}`)
  console.log(`  task     ${fmt('task')}`)
  console.log(`  style    ${fmt('style')}`)
  console.log(`  wall     ${fmt('wall')}`)
  console.log(
    `\n  script is the one to watch — main-thread JS for the re-render` +
      `\n  cascade. task includes style/layout/paint on top of it.\n`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

/**
 * Re-render cost benchmark: main-thread cost of re-rendering an already-mounted
 * tree, which `bun run lighthouse` (one cold load) and `bun run bench:nav`
 * (route swaps) cannot see. React Compiler bailouts (setState synchronously in
 * an effect, mutating a useState value, creating components during render) cost
 * auto-memoization for the WHOLE function they occur in.
 *
 * Drives viewport resizes to force a re-render cascade through the shared
 * hooks (useWindowSize feeds useDeviceDetection, which gates isWebGL and is
 * consumed app-wide). Main-thread cost comes from CDP's Performance domain
 * (ScriptDuration / TaskDuration / RecalcStyleDuration), which works on a
 * production build, unlike React's dev-only profiling hooks.
 *
 * SCOPE: covers hooks reachable from a route, such as `useDeviceDetection`.
 * The fluid and flowmap simulations are NOT: only FlowmapProvider consumes
 * them and no route mounts it, so their bailout fixes can't be measured here.
 *
 * Usage (needs a production server; A/B by diffing medians across two builds,
 * and read the full sample, since one outlier moves a small median):
 *   bun run build && PORT=3123 bun run start &
 *   bun run bench:rerender [--runs 5 --resizes 40 --path /]
 *
 * Measured result (5 runs, 30 viewport changes, 4x CPU throttle), reverting
 * ONLY lib/hooks/use-device-detection.ts to its pre-fix shape (setState
 * synchronously in an effect, so the compiler bails out of the whole hook):
 *
 *                    pre-fix                 fixed
 *   script    115ms  (spread 106-122)  121ms  (spread 99-157)
 *   task      850ms                    931ms
 *
 * No improvement: the spread swamps the difference. That hook is a handful of
 * media-query reads, so lost memoization costs nothing measurable, and the
 * cascade is dominated by style recalculation (~250ms of ~900ms) and the WebGL
 * canvas. Treat compiler bailouts as correctness and hygiene, not a perf
 * lever, unless the function does real work.
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
// CPU throttle: an unthrottled dev machine buries the difference in noise. 4x
// is roughly a mid-range laptop.
const CPU = Number(arg('cpu', '4'))

type Sample = { script: number; task: number; style: number; wall: number }

const median = (xs: number[]) =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? Number.NaN

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const samples: Sample[] = []

  for (let run = 0; run < RUNS; run++) {
    // Fresh page per run: a re-used page's warm JIT and client cache skew run 2 onward.
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    })
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Performance.enable')
    if (CPU > 1) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
    }

    await page.goto(`${BASE}${PATH}`, { waitUntil: 'load' })
    // Settle hydration and the lazy root canvas: time steady state, not mount.
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
      // Alternate across the `dt` breakpoint so useDeviceDetection's media
      // queries actually flip.
      const width = i % 2 === 0 ? 700 : 1280
      await page.setViewportSize({ width, height: 800 })
      // One frame, so React commits between resizes instead of batching the loop.
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

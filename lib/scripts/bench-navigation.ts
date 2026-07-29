/**
 * Client-side navigation benchmark.
 *
 * Lighthouse audits a single cold page load, which is the wrong instrument for
 * Next's instant-navigation work: `partialPrefetching` and `cachedNavigations`
 * change how fast an ALREADY-LOADED app swaps routes, and a load audit never
 * navigates. This measures that instead.
 *
 * For each run it clicks a real <Link> and records two numbers:
 *
 *   shell   click -> the target route's heading is on screen. This is the one
 *           prefetching moves. With a prefetched shell it should be flat and
 *           small no matter how slow the route's data is.
 *   content click -> the streamed panel is on screen. Server-bound (the demo
 *           route sleeps ~1.5s on purpose), so it should NOT improve. It is
 *           here as a control: if it moves, something other than prefetching
 *           changed.
 *
 * Reports the median plus the full sample, because TBT/TTI-style numbers on a
 * dev machine are noisy enough that a 3-run median can be moved by one
 * outlier — the sample is what tells you whether a delta is real.
 *
 * Usage:
 *   bun run build && PORT=3123 bun run start &
 *   bun run bench:nav                  # defaults to http://localhost:3123
 *   bun run bench:nav --runs 10 --url http://localhost:3000
 *
 * Compare two configs by running it against each build and diffing the
 * medians.
 *
 * What it found when it was written (7 runs each, 100ms RTT, this branch on
 * next 16.3.0-preview.10), toggling partialPrefetching + cachedNavigations +
 * varyParams + optimisticRouting together:
 *
 *                    flags off              flags on
 *   shell     110ms  (spread  84-250)   90ms  (spread 78-105)
 *   content  1420ms                    1915ms
 *
 * The shell median moves a little, but the useful part is the spread: an
 * on-demand shell fetch ranges 84-250ms, a prefetched one 78-105ms. Prefetching
 * buys predictability more than raw speed.
 *
 * The content number is a genuine cost, not noise — it reproduced unthrottled
 * (+537ms) and at 100ms RTT (+495ms). Splitting shell from data serialises
 * them: the shell paints from cache, and only then does the dynamic request
 * start, so this route's 1.5s server sleep begins ~500ms later than it would
 * in a single streamed response. Whether that trade is right depends on
 * whether an instant shell plus skeleton beats a shorter blank wait for the
 * route in question. It is a trade, not a free win.
 */
import { chromium } from 'playwright-core'

type Sample = { shell: number; content: number }

const args = process.argv.slice(2)
function arg(name: string, fallback: string) {
  const i = args.indexOf(`--${name}`)
  return i !== -1 && args[i + 1] ? (args[i + 1] as string) : fallback
}

const BASE = arg('url', 'http://localhost:3123').replace(/\/+$/, '')
const RUNS = Number(arg('runs', '7'))
const HUB = `${BASE}/instant-nav-demo`

/**
 * Round-trip latency to emulate, in ms. This is not optional decoration: on
 * localhost the RTT is ~0, and hiding round trips is the entire reason
 * prefetching exists. Measured against an unthrottled local server the flags
 * look useless — there is no latency for a prefetched shell to save, so the
 * extra request the split introduces for dynamic content shows up as pure
 * cost. Throttle, or the number you get is an artifact of the harness.
 *
 * `--latency 0` opts out, for when you specifically want the no-network case.
 */
const LATENCY = Number(arg('latency', '100'))
// Rough Fast-3G-ish pipe. Bandwidth matters far less than RTT here, but
// leaving it uncapped alongside a latency figure would be an odd mix.
const DOWNLOAD_MBPS = Number(arg('download', '10'))
const UPLOAD_MBPS = Number(arg('upload', '3'))

const median = (xs: number[]) =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? Number.NaN

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage()

  if (LATENCY > 0) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: LATENCY,
      downloadThroughput: (DOWNLOAD_MBPS * 1_000_000) / 8,
      uploadThroughput: (UPLOAD_MBPS * 1_000_000) / 8,
    })
  }

  const samples: Sample[] = []

  for (let i = 0; i < RUNS; i++) {
    // Full reload each iteration so every run starts from the same place: a
    // freshly hydrated hub. Without this, run 2 onward would measure a warm
    // client cache and read far faster than reality.
    await page.goto(HUB, { waitUntil: 'load' })
    await page
      .getByRole('heading', { name: 'Instant Navigations demo' })
      .waitFor()

    // Let prefetching settle. This is the whole point of the flags — the shell
    // should already be in the client cache before the click happens.
    await page.waitForTimeout(1000)

    const started = Date.now()
    await page
      .getByRole('link', { name: /slow route/i })
      .first()
      .click()

    await page.getByRole('heading', { name: 'Slow route' }).waitFor()
    const shell = Date.now() - started

    await page.getByText(/Streamed in after/).waitFor({ timeout: 30_000 })
    const content = Date.now() - started

    samples.push({ shell, content })
    process.stdout.write('.')
  }

  await browser.close()

  const shells = samples.map((s) => s.shell)
  const contents = samples.map((s) => s.content)

  console.log(`\n\nclient-side navigation: hub -> /instant-nav-demo/slow`)
  console.log(
    `${BASE} · ${RUNS} runs · ${
      LATENCY > 0
        ? `${LATENCY}ms RTT, ${DOWNLOAD_MBPS}/${UPLOAD_MBPS} Mbps`
        : 'unthrottled (no RTT — prefetching has nothing to hide, see header)'
    }\n`
  )
  console.log(
    `  shell    median ${median(shells).toFixed(0)}ms   ${JSON.stringify(shells)}`
  )
  console.log(
    `  content  median ${median(contents).toFixed(0)}ms   ${JSON.stringify(contents)}`
  )
  console.log(
    `\n  shell is what prefetching moves. content is server-bound (~1.5s by` +
      `\n  design) and is the control — it should not improve.\n`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

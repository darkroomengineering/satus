/**
 * Client-side navigation benchmark.
 *
 * Lighthouse audits a single cold page load, which is the wrong instrument for
 * Next's instant-navigation work: `partialPrefetching` and `cachedNavigations`
 * change how fast an ALREADY-LOADED app swaps routes, and a load audit never
 * navigates. This measures that instead.
 *
 * For each run it clicks a real <Link> and records:
 *
 *   shell   click -> the target route's heading is on screen. This is the one
 *           prefetching moves.
 *   content click -> the target's streamed content is on screen. Server-bound,
 *           so it should NOT improve — it is the control. Only reported for
 *           scenarios that actually have something streaming; see below.
 *
 * Reports the median plus the full sample, because TBT/TTI-style numbers on a
 * dev machine are noisy enough that a small-sample median can be moved by one
 * outlier — the sample is what tells you whether a delta is real.
 *
 * Usage:
 *   bun run build && PORT=3123 bun run start &
 *   bun run bench:nav                      # 404 -> home, works on any build
 *   bun run bench:nav --runs 10 --url http://localhost:3124
 *
 * The built-in scenario only exercises a static target. A project with routes
 * that stream dynamic content should add a scenario for one of them to
 * SCENARIOS, with a `contentText` matcher — that is where prefetching flags
 * actually move the needle.
 */
import { chromium, type Page } from 'playwright-core'

type Scenario = {
  /** Path to load before clicking. */
  from: string
  /** Heading that confirms the starting page is hydrated. */
  fromHeading: string | RegExp
  /** Accessible name of the <Link> to click. */
  linkName: RegExp
  /** Heading that confirms the target route's shell has painted. */
  shellHeading: string | RegExp
  /**
   * Text that confirms the target's server-bound content arrived. Omit when
   * the target has nothing streaming — reporting a `content` number for a
   * fully static route would just be a second, noisier reading of `shell`.
   */
  contentText?: RegExp
  describe: string
}

/**
 * The starter has no client-side navigation surface on its happy path: the
 * only internal <Link>s are in error.tsx and not-found.tsx, there is no
 * header nav, and nothing links `/` to `/sanity`. Since prefetching is a
 * <Link> behaviour, the 404's "Go Home" link is the one real navigation
 * available.
 *
 * Read it narrowly. `/` is statically prerendered, so this times a prefetched
 * STATIC shell and nothing else. It cannot show a shell-vs-data split,
 * because there is no dynamic data to serialise — which is exactly why it
 * reports no `content` number. Useful as a same-scenario A/B across two
 * builds.
 *
 * A project with routes that stream dynamic content should add another
 * `[name, Scenario]` entry below, with a `contentText` matcher.
 */
const SCENARIOS = new Map<string, Scenario>([
  [
    'notfound',
    {
      from: '/__bench-nonexistent-path',
      fromHeading: '404',
      linkName: /go home/i,
      shellHeading: 'Satūs',
      describe:
        '404 -> / via "Go Home" (static shell only, no streamed content)',
    },
  ],
])

type Sample = { shell: number; content?: number }

const args = process.argv.slice(2)
function arg(name: string, fallback: string) {
  const i = args.indexOf(`--${name}`)
  const value = args[i + 1]
  return i !== -1 && value ? value : fallback
}

const BASE = arg('url', 'http://localhost:3123').replace(/\/+$/, '')
const RUNS = Number(arg('runs', '7'))
const SCENARIO_NAME = arg('scenario', 'notfound')

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

function heading(page: Page, name: string | RegExp) {
  return page.getByRole('heading', { name }).first()
}

async function main() {
  const scenario = SCENARIOS.get(SCENARIO_NAME)
  if (!scenario) {
    console.error(
      `Unknown scenario "${SCENARIO_NAME}". Available: ${[...SCENARIOS.keys()].join(', ')}`
    )
    process.exit(1)
  }

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
    // freshly hydrated starting page. Without this, run 2 onward would measure
    // a warm client cache and read far faster than reality.
    await page.goto(`${BASE}${scenario.from}`, { waitUntil: 'load' })
    await heading(page, scenario.fromHeading).waitFor()

    // Let prefetching settle. This is the whole point of the flags — the shell
    // should already be in the client cache before the click happens.
    await page.waitForTimeout(1000)

    const started = Date.now()
    await page.getByRole('link', { name: scenario.linkName }).first().click()

    await heading(page, scenario.shellHeading).waitFor()
    const shell = Date.now() - started

    if (scenario.contentText) {
      await page.getByText(scenario.contentText).waitFor({ timeout: 30_000 })
      samples.push({ shell, content: Date.now() - started })
    } else {
      samples.push({ shell })
    }

    process.stdout.write('.')
  }

  await browser.close()

  const shells = samples.map((s) => s.shell)

  console.log(`\n\nclient-side navigation: ${scenario.describe}`)
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

  if (scenario.contentText) {
    const contents = samples.map((s) => s.content ?? Number.NaN)
    console.log(
      `  content  median ${median(contents).toFixed(0)}ms   ${JSON.stringify(contents)}`
    )
    console.log(
      `\n  shell is what prefetching moves. content is server-bound and is the` +
        `\n  control — it should not improve.\n`
    )
  } else {
    console.log(
      `\n  no content metric: this target has nothing streaming, so the only` +
        `\n  honest number is the shell. Compare against the same scenario on` +
        `\n  another build.\n`
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

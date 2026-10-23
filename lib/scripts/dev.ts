import { bunExecutable, colorEnv } from './utils'

const isHttps = process.argv.includes('--https')
const isInspect = process.argv.includes('--inspect')

const nextDevArgs = [bunExecutable, 'next', 'dev']
if (isHttps) nextDevArgs.push('--experimental-https')
if (isInspect) nextDevArgs.push('--inspect')

const devEnv = colorEnv()

const processes = [
  Bun.spawn(
    [bunExecutable, '--watch', './lib/styles/scripts/setup-styles.ts'],
    {
      stdout: 'inherit',
      stderr: 'inherit',
      env: devEnv,
    }
  ),

  Bun.spawn(nextDevArgs, {
    stdout: 'inherit',
    stderr: 'inherit',
    env: devEnv,
  }),
]

/**
 * Terminate a spawned child AND all of its descendants. `proc.kill()` only
 * signals the direct child, and Windows has no process groups, so the
 * Turbopack workers and `bun --watch` children would be orphaned on every
 * Ctrl-C and pile up as runaway node processes. `taskkill /T` kills the tree
 * (run synchronously so it finishes before we exit). On Unix, SIGTERM to the
 * child propagates to its workers.
 */
const killTree = (proc: Bun.Subprocess) => {
  const { pid } = proc
  if (pid == null) return

  if (process.platform === 'win32') {
    Bun.spawnSync(['taskkill', '/PID', String(pid), '/T', '/F'])
  } else {
    try {
      proc.kill()
    } catch {
      // Process already exited — nothing to clean up.
    }
  }
}

// Idempotent: a process exiting and an incoming signal can both trigger this,
// and teardown must run once. `exitCode` defaults to 0 for SIGINT/SIGTERM (a
// requested shutdown); the race below passes the child's own code so a crash
// propagates non-zero.
let shuttingDown = false
const cleanup = (exitCode = 0) => {
  if (shuttingDown) return
  shuttingDown = true
  for (const proc of processes) killTree(proc)
  process.exit(exitCode)
}

// Arrow wrappers: passing `cleanup` directly would hand the signal name to
// its `exitCode` parameter.
process.on('SIGINT', () => cleanup())
process.on('SIGTERM', () => cleanup())

// Exit with whichever process ends first, using its own code.
const exitCode = await Promise.race(processes.map((proc) => proc.exited))
cleanup(exitCode)

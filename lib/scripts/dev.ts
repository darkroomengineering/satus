/**
 * Cross-platform parallel dev script
 * Replaces npm-run-all for running multiple processes simultaneously
 * Works on Windows, macOS, and Linux using Bun's native APIs
 */

import { bunExecutable, colorEnv } from './utils'

const isHttps = process.argv.includes('--https')
const isInspect = process.argv.includes('--inspect')

// Build next dev command args
const nextDevArgs = [bunExecutable, 'next', 'dev']
if (isHttps) nextDevArgs.push('--experimental-https')
if (isInspect) nextDevArgs.push('--inspect')

// Build environment with FORCE_COLOR
const devEnv = colorEnv()

const processes = [
  // Style watcher
  Bun.spawn(
    [bunExecutable, '--watch', './lib/styles/scripts/setup-styles.ts'],
    {
      stdout: 'inherit',
      stderr: 'inherit',
      env: devEnv,
    }
  ),

  // Next.js dev server
  Bun.spawn(nextDevArgs, {
    stdout: 'inherit',
    stderr: 'inherit',
    env: devEnv,
  }),
]

/**
 * Terminate a spawned child AND all of its descendants.
 *
 * `proc.kill()` only signals the direct child. `next dev` forks several
 * Turbopack workers, and the `bun --watch` style task spawns its own children.
 * On Windows — which has no Unix-style process groups — killing only the direct
 * child orphans those grandchildren on every Ctrl-C / crash / restart, and they
 * pile up as runaway node processes (the "dozens of node.exe and growing" bug).
 *
 * `taskkill /T` walks and force-kills the whole tree (run synchronously so it
 * finishes before we exit). On Unix, a SIGTERM to the child is propagated to its
 * workers by Next/Bun, so the existing behavior is preserved there.
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

// Handle graceful shutdown. Idempotent: a process exiting and an incoming
// signal can both trigger this, and we must only tear down (and exit) once.
let shuttingDown = false
const cleanup = () => {
  if (shuttingDown) return
  shuttingDown = true
  for (const proc of processes) killTree(proc)
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

// Wait for any process to exit (if one crashes, we want to know)
await Promise.race(processes.map((p) => p.exited))
cleanup()

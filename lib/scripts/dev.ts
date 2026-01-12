/**
 * Cross-platform parallel dev script
 * Replaces npm-run-all for running multiple processes simultaneously
 * Works on Windows, macOS, and Linux using Bun's native APIs
 */

export {} // Module marker for top-level await

const isHttps = process.argv.includes('--https')
const isInspect = process.argv.includes('--inspect')

// Use process.execPath to get the current bun executable (works cross-platform)
const bunExecutable = process.execPath

// Build next dev command args
const nextDevArgs = [bunExecutable, 'next', 'dev']
if (isHttps) nextDevArgs.push('--experimental-https')
if (isInspect) nextDevArgs.push('--inspect')

// Build environment with FORCE_COLOR, removing NO_COLOR to prevent warning
const devEnv = { ...process.env, FORCE_COLOR: '1' } as Record<
  string,
  string | undefined
>
delete devEnv.NO_COLOR

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

// Handle graceful shutdown
const cleanup = () => {
  for (const proc of processes) {
    proc.kill()
  }
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

// Wait for any process to exit (if one crashes, we want to know)
await Promise.race(processes.map((p) => p.exited))
cleanup()

/**
 * Cross-platform parallel dev script
 * Replaces npm-run-all for running multiple processes simultaneously
 * Works on Windows, macOS, and Linux using Bun's native APIs
 */

export {} // Module marker for top-level await

const isHttps = process.argv.includes('--https')
const isInspect = process.argv.includes('--inspect')

// Build next dev command args
const nextDevArgs = ['bun', 'next', 'dev']
if (isHttps) nextDevArgs.push('--experimental-https')
if (isInspect) nextDevArgs.push('--inspect')

const processes = [
  // Style watcher
  Bun.spawn(['bun', '--watch', './lib/styles/scripts/setup-styles.ts'], {
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  }),

  // Next.js dev server
  Bun.spawn(nextDevArgs, {
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
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

import { describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { copyRepo } from './setup-project.test-helpers'
import { pathExists } from './utils'

// Concurrency lock: two setup:project runs in one workspace must not
// interleave into a contradictory hybrid (both exit 0).

describe('P-B3: concurrent setup:project runs', () => {
  it('one run succeeds, the other fails immediately naming the lock', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-lock-'))
    try {
      await copyRepo(tmpRoot)

      const spawnRun = () =>
        Bun.spawn(
          [
            'bun',
            'run',
            'setup:project',
            '--preset',
            'blank',
            '--yes',
            '--skip-install',
          ],
          { cwd: tmpRoot, stdout: 'pipe', stderr: 'pipe' }
        )

      const procA = spawnRun()
      const procB = spawnRun()
      const [exitA, exitB] = await Promise.all([procA.exited, procB.exited])
      const [outA, outB, errA, errB] = await Promise.all([
        new Response(procA.stdout).text(),
        new Response(procB.stdout).text(),
        new Response(procA.stderr).text(),
        new Response(procB.stderr).text(),
      ])

      const exits = [exitA, exitB]
      // clack's p.log.error writes to stdout, not stderr — check both so
      // this doesn't depend on which stream the CLI library picks.
      const combinedOutputs = [outA + errA, outB + errB]

      expect(exits.filter((code) => code === 0)).toHaveLength(1)
      expect(exits.filter((code) => code !== 0)).toHaveLength(1)

      const failingOutput =
        combinedOutputs[exits.findIndex((code) => code !== 0)] ?? ''
      expect(failingOutput).toContain(
        'setup:project run appears to be in progress'
      )
      expect(failingOutput).toContain('.setup-project.lock')
      expect(failingOutput.toLowerCase()).toContain('delete the lock')

      expect(await pathExists(join(tmpRoot, '.setup-project.lock'))).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 60000)
})

// The lock must not leak on SIGINT/SIGTERM: Bun doesn't reliably emit 'exit'
// for them, so explicit handlers release it and a PID-file stale-lock check
// backstops whatever gets past those (e.g. SIGKILL).

describe('P-B3 follow-up: lock survives SIGTERM / stale-lock detection', () => {
  it('kill -TERM on a mid-run process releases the lock instead of leaking it', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-sigterm-'))
    try {
      await copyRepo(tmpRoot)

      // No flags means interactive: it hangs at the first prompt after
      // acquireLock(), a window where the lock exists and the process is alive
      // to signal. stdin stays open (not `</dev/null`) so this is a genuine
      // mid-prompt state, not the EOF path.
      const child = Bun.spawn(['bun', 'lib/scripts/setup-project.ts'], {
        cwd: tmpRoot,
        stdin: 'pipe',
        stdout: 'ignore',
        stderr: 'ignore',
      })

      const lockPath = join(tmpRoot, '.setup-project.lock')
      const deadline = Date.now() + 10000
      while (!(await pathExists(lockPath)) && Date.now() < deadline) {
        await Bun.sleep(50)
      }
      expect(await pathExists(lockPath)).toBe(true)

      child.kill('SIGTERM')
      await child.exited

      expect(await pathExists(lockPath)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 30000)

  it('a lock left by a dead PID is treated as stale — removed, and the run proceeds', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-stale-'))
    try {
      await copyRepo(tmpRoot)

      // A guaranteed-dead PID: spawn a trivial process, wait for it to exit.
      const dead = Bun.spawn(['bun', '-e', 'process.exit(0)'])
      await dead.exited
      const deadPid = dead.pid

      const lockPath = join(tmpRoot, '.setup-project.lock')
      await Bun.$`mkdir -p ${lockPath}`.quiet()
      await Bun.write(join(lockPath, 'pid'), `${deadPid}\n`)

      const proc = Bun.spawnSync(
        [
          'bun',
          'run',
          'setup:project',
          '--preset',
          'blank',
          '--yes',
          '--skip-install',
        ],
        { cwd: tmpRoot, stdout: 'pipe', stderr: 'pipe' }
      )

      const output = proc.stdout.toString() + proc.stderr.toString()
      if (proc.exitCode !== 0) console.error(output)

      expect(proc.exitCode).toBe(0)
      expect(output.toLowerCase()).toContain('stale')
      expect(output).toContain(String(deadPid))
      // The run replaced the stale lock with its own (and released it on
      // completion) rather than treating it as a genuine collision.
      expect(await pathExists(lockPath)).toBe(false)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 30000)

  it('a lock left by a LIVE PID is NOT treated as stale — still a genuine collision', async () => {
    const tmpRoot = await mkdtemp(join(tmpdir(), 'satus-live-'))
    try {
      await copyRepo(tmpRoot)

      const livePid = process.pid

      const lockPath = join(tmpRoot, '.setup-project.lock')
      await Bun.$`mkdir -p ${lockPath}`.quiet()
      await Bun.write(join(lockPath, 'pid'), `${livePid}\n`)

      const proc = Bun.spawnSync(
        [
          'bun',
          'run',
          'setup:project',
          '--preset',
          'blank',
          '--yes',
          '--skip-install',
        ],
        { cwd: tmpRoot, stdout: 'pipe', stderr: 'pipe' }
      )

      const output = proc.stdout.toString() + proc.stderr.toString()
      expect(proc.exitCode).not.toBe(0)
      expect(output).toContain('setup:project run appears to be in progress')
      expect(await pathExists(lockPath)).toBe(true)
      expect(await Bun.file(join(lockPath, 'pid')).text()).toContain(
        String(livePid)
      )
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  }, 30000)
})

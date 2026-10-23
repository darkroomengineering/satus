/**
 * Tests for lib/scripts/check-commit-msg.ts, the lefthook `commit-msg` check.
 *
 * Failure modes, written before the script:
 * 1. A valid `type(scope): subject` or `type: subject` is rejected.
 * 2. A breaking change marker (`type!:`, `type(scope)!:`) is rejected.
 * 3. A subject with no colon, or no space after it, is accepted.
 * 4. An unknown or capitalized type is accepted.
 * 5. An empty subject or an empty scope `()` is accepted.
 * 6. A git-generated subject (`Merge ...`, `Revert "..."`, `Reapply "..."`, `fixup! `,
 *    `squash! `, `amend! `) is rejected.
 * 7. Comment lines (`#`) are validated instead of skipped, so the template
 *    git writes above or below the message decides the result.
 * 8. Leading blank lines make the first line look empty.
 * 9. Body lines after the subject are validated.
 * 10. A message that is empty or only comments is accepted.
 * 11. CRLF line endings leave a `\r` that breaks the subject match.
 * 12. The CLI exits 0 on failure, prints no expected format, or crashes
 *     instead of exiting 1 when the message file argument is missing.
 *
 * Run with: bun test lib/scripts/check-commit-msg.test.ts
 */

import { afterAll, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { checkCommitMessage } from './check-commit-msg'
import { projectRoot } from './utils'

function accepts(message: string): void {
  expect(checkCommitMessage(message)).toBeUndefined()
}

function rejects(message: string): void {
  expect(checkCommitMessage(message)).toBeString()
}

describe('checkCommitMessage', () => {
  it('accepts type: subject and type(scope): subject', () => {
    accepts('feat: add a marquee')
    accepts('fix(sanity): read drafts on the server')
    accepts('chore(deps): bump next to 16.3.8')
    for (const type of [
      'feat',
      'fix',
      'refactor',
      'docs',
      'chore',
      'test',
      'perf',
      'ci',
      'build',
      'style',
      'revert',
    ]) {
      accepts(`${type}: subject`)
    }
  })

  it('accepts the breaking change marker', () => {
    accepts('feat!: drop the wrapper webgl prop')
    accepts('refactor(image)!: rename the sizes prop')
  })

  it('rejects a missing colon or a missing space after it', () => {
    rejects('feat add a marquee')
    rejects('feat(ui) add a marquee')
    rejects('feat:add a marquee')
  })

  it('rejects an unknown or capitalized type', () => {
    rejects('feature: add a marquee')
    rejects('wip: halfway there')
    rejects('Feat: add a marquee')
    rejects('bad message')
  })

  it('rejects an empty subject or an empty scope', () => {
    rejects('feat:')
    rejects('feat: ')
    rejects('feat:    ')
    rejects('feat(): add a marquee')
  })

  it('passes git-generated subjects through', () => {
    accepts("Merge branch 'main' into feat/marquee")
    accepts('Merge pull request #160 from darkroomengineering/fix/x')
    accepts('Revert "feat: add a marquee"')
    accepts('Reapply "feat: add a marquee"')
    accepts('fixup! feat: add a marquee')
    accepts('squash! feat: add a marquee')
    accepts('amend! feat: add a marquee')
  })

  it('skips comment lines', () => {
    accepts('# Please enter the commit message\n#\nfix: handle EOF\n')
    accepts('fix: handle EOF\n\n# Changes to be committed:\n#\tmodified: x\n')
    rejects('# feat: commented out\nbad message\n')
  })

  it('skips leading blank lines', () => {
    accepts('\n\n  \nfix: handle EOF\n')
    rejects('\n\nbad message\n')
  })

  it('validates only the first line', () => {
    accepts('fix: handle EOF\n\nThis body line is free text: anything goes.\n')
    rejects('bad message\n\nfix: a valid line in the body does not count\n')
  })

  it('rejects an empty or comment-only message', () => {
    rejects('')
    rejects('\n\n')
    rejects('# only a comment\n#\n')
  })

  it('handles CRLF line endings', () => {
    accepts('fix: handle EOF\r\n\r\nbody\r\n')
  })
})

describe('check-commit-msg CLI', () => {
  const dir = mkdtempSync(join(tmpdir(), 'check-commit-msg-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  function run(args: string[]) {
    const proc = Bun.spawnSync(
      ['bun', 'lib/scripts/check-commit-msg.ts', ...args],
      { cwd: projectRoot, stdout: 'pipe', stderr: 'pipe' }
    )
    return { exitCode: proc.exitCode, stderr: proc.stderr.toString() }
  }

  function messageFile(name: string, content: string): string {
    const path = join(dir, name)
    writeFileSync(path, content)
    return path
  }

  it('exits 0 for a conventional message', () => {
    expect(run([messageFile('good', 'chore: test hook\n')]).exitCode).toBe(0)
  })

  it('exits 1 and prints the expected format for a bad message', () => {
    const { exitCode, stderr } = run([messageFile('bad', 'bad message\n')])
    expect(exitCode).toBe(1)
    expect(stderr).toContain('bad message')
    expect(stderr).toContain('type(scope)!: subject')
    expect(stderr).toContain('feat')
  })

  it('exits 1 when the message file argument is missing', () => {
    const { exitCode, stderr } = run([])
    expect(exitCode).toBe(1)
    expect(stderr).toContain('usage')
  })
})

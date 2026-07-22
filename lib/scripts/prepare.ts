/**
 * `prepare` entry point — installs the lefthook git hooks.
 *
 * In a linked worktree (`git worktree add`), the repo config is shared with the
 * main checkout and `core.hooksPath` already points at its `.git/hooks`, so the
 * hooks apply here without installing anything — and `lefthook install` refuses
 * to run against that path and fails the whole `bun install`. Skip it instead.
 * Outside a git repo (exported archive, CI cache restore) there is nothing to
 * install into, so that skips too.
 */

import { resolve } from 'node:path'

const git = Bun.spawnSync([
  'git',
  'rev-parse',
  '--absolute-git-dir',
  '--git-common-dir',
])

if (git.exitCode !== 0) {
  console.log('prepare: not a git repository, skipping lefthook install')
  process.exit(0)
}

const [gitDir, commonDir] = git.stdout.toString().trim().split('\n')

if (gitDir && commonDir && gitDir !== resolve(commonDir)) {
  console.log(
    'prepare: linked worktree, hooks are shared with the main checkout — skipping lefthook install'
  )
  process.exit(0)
}

const lefthook = Bun.spawnSync(['bunx', 'lefthook', 'install'], {
  stdout: 'inherit',
  stderr: 'inherit',
})

process.exit(lefthook.exitCode ?? 1)

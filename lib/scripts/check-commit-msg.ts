/**
 * lefthook `commit-msg` check: the first line of the message must be a
 * conventional commit subject. Run as `bun lib/scripts/check-commit-msg.ts
 * <message-file>`.
 */

// The types this repo's history uses, plus `revert`.
const TYPES = [
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
]

const SUBJECT_PATTERN = new RegExp(
  `^(?:${TYPES.join('|')})(?:\\([^()\\s][^()]*\\))?!?: \\S`
)
// Subjects git writes itself for merges, reverts and autosquash.
const GENERATED_PATTERN =
  /^(?:Merge |(?:Revert|Reapply) "|(?:fixup|squash|amend)! )/

const EXPECTED_FORMAT = `Expected: type(scope)!: subject   (scope and ! are optional)
  e.g.  feat: add a marquee
        fix(sanity)!: read drafts on the server
Types: ${TYPES.join(', ')}`

/** Returns an error message, or undefined when the message is valid. */
export function checkCommitMessage(message: string): string | undefined {
  // git runs commit-msg before stripping its `#` template comments.
  const subject = message
    .split(/\r?\n/)
    .find((line) => line.trim() !== '' && !line.startsWith('#'))

  if (subject === undefined) return 'The commit message is empty.'
  if (GENERATED_PATTERN.test(subject) || SUBJECT_PATTERN.test(subject)) {
    return undefined
  }
  return `Not a conventional commit subject: "${subject}"`
}

async function main(): Promise<void> {
  const path = process.argv[2]
  if (!path) {
    console.error('usage: bun lib/scripts/check-commit-msg.ts <message-file>')
    process.exit(1)
  }

  const error = checkCommitMessage(await Bun.file(path).text())
  if (error) {
    console.error(`commit-msg: ${error}\n\n${EXPECTED_FORMAT}`)
    process.exit(1)
  }
}

if (import.meta.main) {
  await main()
}

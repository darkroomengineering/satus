/**
 * Cross-platform Sanity MCP setup helper
 * Copies the Cursor deeplink to clipboard on macOS/Linux, or prints it on Windows
 */

export {} // Module marker for top-level await

const link =
  'cursor://anysphere.cursor-deeplink/mcp/install?name=Sanity&config=eyJ1cmwiOiJodHRwczovL21jcC5zYW5pdHkuaW8iLCJ0eXBlIjoiaHR0cCJ9Cg=='

const platform = process.platform

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (platform === 'darwin') {
      // macOS
      const proc = Bun.spawn(['pbcopy'], { stdin: 'pipe' })
      proc.stdin.write(text)
      proc.stdin.end()
      await proc.exited
      return proc.exitCode === 0
    }

    if (platform === 'linux') {
      // Linux - try xclip first, then xsel
      for (const cmd of [
        ['xclip', '-selection', 'clipboard'],
        ['xsel', '--clipboard', '--input'],
      ]) {
        try {
          const proc = Bun.spawn(cmd, { stdin: 'pipe' })
          proc.stdin.write(text)
          proc.stdin.end()
          await proc.exited
          if (proc.exitCode === 0) return true
        } catch {
          // Silently try next clipboard command
        }
      }
      return false
    }

    if (platform === 'win32') {
      // Windows - use clip.exe
      const proc = Bun.spawn(['clip'], { stdin: 'pipe' })
      proc.stdin.write(text)
      proc.stdin.end()
      await proc.exited
      return proc.exitCode === 0
    }

    return false
  } catch {
    return false
  }
}

const copied = await copyToClipboard(link)

console.log('\n🔗 Sanity MCP Setup for Cursor\n')

if (copied) {
  console.log('✅ Link copied to clipboard!')
  console.log('   Paste it in your browser or Cursor address bar.\n')
} else {
  console.log('📋 Copy this link manually:\n')
  console.log(`   ${link}\n`)
}

console.log('This will install the Sanity MCP server in Cursor.')

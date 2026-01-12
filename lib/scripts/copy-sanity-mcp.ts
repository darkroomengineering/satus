/**
 * Cross-platform Sanity MCP setup helper
 * Copies the Cursor deeplink to clipboard on macOS/Linux/Windows
 */

import { copyToClipboard } from './utils'

const link =
  'cursor://anysphere.cursor-deeplink/mcp/install?name=Sanity&config=eyJ1cmwiOiJodHRwczovL21jcC5zYW5pdHkuaW8iLCJ0eXBlIjoiaHR0cCJ9Cg=='

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

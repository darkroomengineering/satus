/**
 * Unit tests for lib/scripts/generate-shared.ts.
 *
 * Run with: bun test lib/scripts/generate-shared.test.ts
 */

import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { refuseIfExists, toCamelCase, toPascalCase } from './generate-shared'

describe('toPascalCase', () => {
  it('capitalizes a single word', () => {
    expect(toPascalCase('button')).toBe('Button')
  })

  it('joins hyphenated words without the hyphen (identifier-safe)', () => {
    expect(toPascalCase('audit-page')).toBe('AuditPage')
    expect(toPascalCase('hero-section')).toBe('HeroSection')
    expect(toPascalCase('animated-text')).toBe('AnimatedText')
  })

  it('handles multi-hyphen names', () => {
    expect(toPascalCase('my-long-component-name')).toBe('MyLongComponentName')
  })

  // L9: generate-page.ts's name validator allows underscores
  // (`/^[a-zA-Z][a-zA-Z0-9-_]*$/`), but toPascalCase only split on hyphens —
  // `my_page` generated `My_pagePage` instead of `MyPage`.
  it("splits on underscores too, matching generate-page.ts's name validator", () => {
    expect(toPascalCase('my_page')).toBe('MyPage')
    expect(toPascalCase('my_long_page_name')).toBe('MyLongPageName')
  })

  it('handles a mix of hyphens and underscores', () => {
    expect(toPascalCase('my-long_page-name')).toBe('MyLongPageName')
  })
})

describe('toCamelCase', () => {
  it('lowercases the first word only', () => {
    expect(toCamelCase('my-component')).toBe('myComponent')
  })

  it('handles a single word', () => {
    expect(toCamelCase('button')).toBe('button')
  })
})

describe('refuseIfExists', () => {
  let dir: string

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true })
  })

  it('resolves without throwing when no target exists', async () => {
    dir = await mkdtemp(join(tmpdir(), 'generate-shared-test-'))
    await expect(
      refuseIfExists([join(dir, 'index.tsx'), join(dir, 'index.module.css')])
    ).resolves.toBeUndefined()
  })

  it('throws naming the first existing path, before checking the rest', async () => {
    dir = await mkdtemp(join(tmpdir(), 'generate-shared-test-'))
    const existing = join(dir, 'index.tsx')
    await Bun.write(existing, 'existing content')

    await expect(
      refuseIfExists([existing, join(dir, 'index.module.css')])
    ).rejects.toThrow(existing)
  })
})

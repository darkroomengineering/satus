/**
 * Unit tests for string utilities
 *
 * Run with: bun test lib/utils/strings.test.ts
 */

import { describe, expect, it } from 'bun:test'

import { stripHtmlTags } from './strings'

describe('stripHtmlTags', () => {
  it('removes simple and nested tags', () => {
    expect(stripHtmlTags('<p>Hello</p>')).toBe('Hello')
    expect(stripHtmlTags('I agree to the <a href="/x">terms</a>')).toBe(
      'I agree to the terms'
    )
  })

  it('drops an unterminated tag without leaving <script', () => {
    const result = stripHtmlTags('safe <script')
    expect(result).toBe('safe ')
    expect(result).not.toContain('<script')
  })

  it('cannot reassemble a tag from the remainder', () => {
    expect(stripHtmlTags('<scr<script>ipt>')).not.toContain('<')
  })

  it('leaves plain text untouched', () => {
    expect(stripHtmlTags('No tags here')).toBe('No tags here')
    expect(stripHtmlTags('')).toBe('')
  })
})

import { describe, it, expect } from 'vitest'
import { sanitizeFileName } from '../src/exporters/filename'

describe('sanitizeFileName', () => {
  it('keeps a normal name unchanged', () => {
    expect(sanitizeFileName('my-art_01')).toBe('my-art_01')
  })
  it('strips illegal filename characters', () => {
    expect(sanitizeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe('abcdefghij')
  })
  it('trims surrounding whitespace', () => {
    expect(sanitizeFileName('  hello  ')).toBe('hello')
  })
  it('falls back to transmorph for empty input', () => {
    expect(sanitizeFileName('')).toBe('transmorph')
  })
  it('falls back to transmorph when only illegal chars remain', () => {
    expect(sanitizeFileName('///')).toBe('transmorph')
  })
  it('keeps CJK characters', () => {
    expect(sanitizeFileName('灵感指南')).toBe('灵感指南')
  })
})

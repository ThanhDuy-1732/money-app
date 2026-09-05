import { describe, it, expect } from 'vitest'
import { escapeLike } from '@/lib/escape-like'

describe('escapeLike', () => {
  it('escapes %', () => {
    expect(escapeLike('100%')).toBe('100\\%')
  })
  it('escapes _', () => {
    expect(escapeLike('hello_world')).toBe('hello\\_world')
  })
  it('escapes backslash', () => {
    expect(escapeLike('C:\\Users')).toBe('C:\\\\Users')
  })
  it('escapes all metacharacters together', () => {
    expect(escapeLike('%_\\')).toBe('\\%\\_\\\\')
  })
  it('leaves normal text untouched', () => {
    expect(escapeLike('hello world')).toBe('hello world')
  })
  it('leaves empty string untouched', () => {
    expect(escapeLike('')).toBe('')
  })
})

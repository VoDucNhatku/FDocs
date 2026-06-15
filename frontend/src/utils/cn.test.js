import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins multiple class strings', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('skips falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })

  it('resolves conflicting tailwind classes (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('handles conditional object syntax via clsx', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active')
  })

  it('returns empty string for no args', () => {
    expect(cn()).toBe('')
  })
})

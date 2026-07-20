import { describe, it, expect } from 'vitest'
import { createInitMatrix, defaultDomainLabels } from './initMatrix'

describe('createInitMatrix', () => {
  it('zeros fills with 0', () => {
    const m = createInitMatrix('zeros', 2, 3, 'dense')
    expect(m).toEqual([
      [0, 0, 0],
      [0, 0, 0],
    ])
  })

  it('random bool is only 0/1', () => {
    const m = createInitMatrix('random', 4, 4, 'bool')
    for (const row of m) {
      for (const v of row) {
        expect(v === 0 || v === 1).toBe(true)
      }
    }
  })

  it('default domain labels', () => {
    expect(defaultDomainLabels(3)).toEqual(['e1', 'e2', 'e3'])
  })
})

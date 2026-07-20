import { parse } from './parse'
import { describe, it, expect } from 'vitest'

describe('equations', () => {
  it('parses Y[i] = relu(W[i,j] * X[j])', () => {
    const p = parse('Y[i] = relu(W[i,j] * X[j]).')
    const eq = p.stmts.find((s) => s.kind === 'equation')
    expect(eq?.kind).toBe('equation')
    if (eq?.kind === 'equation') {
      expect(eq.lhs.name).toBe('Y')
      expect(eq.lhs.indices).toEqual(['i'])
    }
  })
})

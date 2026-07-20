import { describe, it, expect } from 'vitest'
import { Runtime } from './Runtime'

describe('matrix multiply C = A × B', () => {
  it('evaluates C[i,k] = A[i,j] * B[j,k]', () => {
    const rt = new Runtime()
    rt.seedDense('A', [2, 2], [1, 2, 3, 4])
    rt.seedDense('B', [2, 2], [5, 6, 7, 8])
    rt.loadSource('C[i,k] = A[i,j] * B[j,k].')
    rt.run({ mode: 'forward' })
    const C = rt.getDense('C')!
    expect(C.shape).toEqual([2, 2])
    expect(C.get([0, 0])).toBe(19)
    expect(C.get([0, 1])).toBe(22)
    expect(C.get([1, 0])).toBe(43)
    expect(C.get([1, 1])).toBe(50)
  })
})

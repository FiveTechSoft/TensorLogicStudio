import { describe, it, expect } from 'vitest'
import { Domain } from './Domain'
import { SparseBoolTensor, DenseTensor } from './Tensor'

describe('Domain', () => {
  it('maps symbols to stable indices', () => {
    const d = new Domain()
    expect(d.index('adam')).toBe(0)
    expect(d.index('seth')).toBe(1)
    expect(d.index('adam')).toBe(0)
    expect(d.symbol(1)).toBe('seth')
  })
})

describe('SparseBoolTensor', () => {
  it('stores tuples and checks membership', () => {
    const t = new SparseBoolTensor(2)
    t.add(['adam', 'seth'])
    expect(t.has(['adam', 'seth'])).toBe(true)
    expect(t.has(['seth', 'adam'])).toBe(false)
    expect(t.size).toBe(1)
  })
})

describe('DenseTensor', () => {
  it('get/set by multi-index', () => {
    const t = new DenseTensor([2, 2], 0)
    t.set([0, 1], 0.5)
    expect(t.get([0, 1])).toBe(0.5)
    expect(t.get([0, 0])).toBe(0)
  })
})

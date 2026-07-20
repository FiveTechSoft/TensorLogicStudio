import { DenseTensor } from '../tensor/Tensor'
import { matmul, relu, sigmoid, softmaxDense } from './dense'
import { describe, it, expect } from 'vitest'

describe('dense', () => {
  it('matmul 2x3 * 3x1', () => {
    const W = new DenseTensor([2, 3])
    const X = new DenseTensor([3])
    W.set([0, 0], 1); W.set([0, 1], 0); W.set([0, 2], 0)
    W.set([1, 0], 0); W.set([1, 1], 1); W.set([1, 2], 0)
    X.set([0], 2); X.set([1], 3); X.set([2], 4)
    const Y = matmul(W, X)
    expect(Y.shape).toEqual([2])
    expect(Y.get([0])).toBe(2)
    expect(Y.get([1])).toBe(3)
  })

  it('matmul 2x2 * 2x2', () => {
    // [[1,2],[3,4]] × [[5,6],[7,8]] = [[19,22],[43,50]]
    const A = new DenseTensor([2, 2])
    const B = new DenseTensor([2, 2])
    A.data.set([1, 2, 3, 4])
    B.data.set([5, 6, 7, 8])
    const C = matmul(A, B)
    expect(C.shape).toEqual([2, 2])
    expect(C.get([0, 0])).toBe(19)
    expect(C.get([0, 1])).toBe(22)
    expect(C.get([1, 0])).toBe(43)
    expect(C.get([1, 1])).toBe(50)
  })

  it('relu and sigmoid', () => {
    expect(relu(-1)).toBe(0)
    expect(relu(2)).toBe(2)
    expect(sigmoid(0)).toBeCloseTo(0.5)
  })

  it('softmaxDense row-wise on 2×3', () => {
    const t = new DenseTensor([2, 3])
    t.data.set([1, 2, 3, 1, 1, 1])
    const s = softmaxDense(t)
    const row0 = [s.get([0, 0]), s.get([0, 1]), s.get([0, 2])]
    const sum0 = row0.reduce((a, b) => a + b, 0)
    expect(sum0).toBeCloseTo(1)
    expect(row0[2]!).toBeGreaterThan(row0[0]!)
    const row1 = [s.get([1, 0]), s.get([1, 1]), s.get([1, 2])]
    expect(row1[0]).toBeCloseTo(1 / 3)
  })
})

import { describe, it, expect } from 'vitest'
import { Runtime } from './Runtime'

describe('MLP dense evaluation', () => {
  it('evaluates two-layer MLP equations', () => {
    const rt = new Runtime()
    rt.seedDense('X', [2], [1, 0])
    rt.seedDense('W1', [2, 2], [1, 0, 0, 1]) // row-major
    rt.seedDense('W2', [1, 2], [1, -1])
    rt.loadSource(`
H[i] = relu(W1[i,j] * X[j]).
Y[k] = sigmoid(W2[k,i] * H[i]).
`)
    rt.run({ mode: 'forward' })
    const Y = rt.getDense('Y')!
    expect(Y.shape).toEqual([1])
    expect(Y.get([0])).toBeGreaterThan(0.5)
  })
})
